import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getDb, ensureTables } from '../../db';

const FORWARD_TO = 'george@nctaylors.com';
const FROM       = process.env.EMAIL_FROM || 'SMC Club Manager <club@seniormensclub.org>';

// GET /api/email/inbound — fetch received messages for Inbox tab
export async function GET() {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`
      SELECT id, from_address, to_address, subject, body_text, is_read, received_at
      FROM inbox_messages
      ORDER BY received_at DESC
      LIMIT 100
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/email/inbound?id=123
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const sql = getDb();
    await ensureTables(sql);
    await sql`DELETE FROM inbox_messages WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/email/inbound — Postmark inbound webhook
// Postmark fully parses the email before sending — no MIME parsing needed.
// Docs: https://postmarkapp.com/developer/webhooks/inbound-webhook
export async function POST(req) {
  try {
    const payload = await req.json();

    // Postmark delivers clean pre-parsed fields directly
    const from      = payload.FromFull?.Email
                      ? `${payload.FromFull.Name || ''} <${payload.FromFull.Email}>`.trim()
                      : (payload.From || '');
    const to        = payload.To || '';
    const subject   = payload.Subject || '(no subject)';
    const messageId = (payload.MessageID || '').replace(/[<>]/g, '');

    // Use StrippedTextReply if available (just the new reply, not the whole thread)
    // Fall back to TextBody, then HtmlBody stripped of tags
    let bodyText = payload.StrippedTextReply || payload.TextBody || '';
    if (!bodyText && payload.HtmlBody) {
      bodyText = payload.HtmlBody
        .replace(/<style[\s\S]*?<\/style>/gi, '')
        .replace(/<[^>]+>/g, '')
        .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
        .replace(/\n{3,}/g, '\n\n')
        .trim();
    }

    // Clean up any trailing whitespace / excessive blank lines
    bodyText = bodyText.replace(/\n{3,}/g, '\n\n').trim();

    const sql = getDb();
    await ensureTables(sql);

    // Deduplicate by Postmark MessageID
    if (messageId) {
      const existing = await sql`
        SELECT id FROM inbox_messages WHERE message_id = ${messageId} LIMIT 1
      `;
      if (existing.length > 0) return NextResponse.json({ ok: true, duplicate: true });
    }

    await sql`
      INSERT INTO inbox_messages (from_address, to_address, subject, body_text, body_html, message_id)
      VALUES (${from}, ${to}, ${subject}, ${bodyText}, ${payload.HtmlBody || ''}, ${messageId})
    `;

    // Forward a clean copy to george@nctaylors.com via Resend
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fwdBody = bodyText || '(no message body)';
        const safeHtml = fwdBody
          .replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/\n/g, '<br/>');

        await resend.emails.send({
          from: FROM,
          to: [FORWARD_TO],
          subject: `Fwd: ${subject}`,
          text: `-------- Forwarded Message --------\nFrom: ${from}\nTo: ${to}\nSubject: ${subject}\n\n${fwdBody}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
            <p style="color:#64748b;font-size:13px;border-bottom:1px solid #e5e7eb;padding-bottom:12px;margin-bottom:16px;">
              <strong>Forwarded from SMC Club Manager inbox</strong>
            </p>
            <table style="font-size:13px;color:#475569;margin-bottom:16px;border-collapse:collapse;">
              <tr><td style="padding:2px 12px 2px 0;color:#94a3b8;">From:</td><td>${from}</td></tr>
              <tr><td style="padding:2px 12px 2px 0;color:#94a3b8;">To:</td><td>${to}</td></tr>
              <tr><td style="padding:2px 12px 2px 0;color:#94a3b8;">Subject:</td><td>${subject}</td></tr>
            </table>
            <div style="line-height:1.6;font-size:15px;border-top:1px solid #e5e7eb;padding-top:16px;">
              ${safeHtml}
            </div>
          </div>`,
        });
      } catch (fwdErr) {
        console.error('Forward error:', fwdErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Inbound email error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
