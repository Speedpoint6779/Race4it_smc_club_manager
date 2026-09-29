import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getDb, ensureTables } from '../../db';

// Data endpoint: never serve a build-time cached response.
export const dynamic = 'force-dynamic';

const FROM     = process.env.EMAIL_FROM     || 'SMC Club Manager <club@seniormensclub.org>';
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'club@seniormensclub.org';

const PARA_GAP = '18px';
const EMAIL_RE = /^[^\s@<>,;"]+@[^\s@<>,;"]+\.[^\s@<>,;"]+$/;
const MAX_RECIPIENTS = 20;

const escapeHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Same paragraph handling as club emails so replies look consistent (and Outlook keeps the spacing).
function cleanQuillHtml(html) {
  if (!html) return '';
  return html
    .replace(/<p[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '')
    .replace(/<p(?=[\s>])/gi, `<p style="margin:0 0 ${PARA_GAP} 0;padding:0;"`)
    .replace(/<(ul|ol)(?=[\s>])/gi, `<$1 style="margin:0 0 ${PARA_GAP} 0;padding:0 0 0 28px;"`)
    .trim();
}

function htmlToText(html) {
  return (html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|div|li)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, '\n\n').trim();
}

function fmtWhen(ts) {
  try {
    return new Date(ts).toLocaleString('en-US', {
      timeZone: 'America/New_York', weekday: 'short', month: 'short', day: 'numeric',
      year: 'numeric', hour: 'numeric', minute: '2-digit',
    });
  } catch { return ''; }
}

// GET /api/email/reply?inbox_id=123 — replies already sent for one inbox message
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const inboxId = parseInt(searchParams.get('inbox_id'));
    if (!inboxId) return NextResponse.json({ error: 'inbox_id is required' }, { status: 400 });
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`
      SELECT id, to_addresses, subject, body_html, sent_at
      FROM inbox_replies WHERE inbox_message_id = ${inboxId}
      ORDER BY sent_at ASC
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/email/reply — reply to an inbox message (or any address)
// Body: { inboxId?, to: string | string[], subject, htmlBody?, body }
export async function POST(req) {
  try {
    const { inboxId, to, subject, body, htmlBody } = await req.json();

    const seen = new Set();
    const recipients = (Array.isArray(to) ? to : [to])
      .map(s => String(s || '').trim())
      .filter(s => { const k = s.toLowerCase(); if (!s || seen.has(k)) return false; seen.add(k); return true; });

    if (!recipients.length) return NextResponse.json({ error: 'At least one recipient is required' }, { status: 400 });
    if (recipients.length > MAX_RECIPIENTS) return NextResponse.json({ error: `Too many recipients (max ${MAX_RECIPIENTS})` }, { status: 400 });
    const bad = recipients.find(r => !EMAIL_RE.test(r));
    if (bad) return NextResponse.json({ error: `Not a valid email address: ${bad}` }, { status: 400 });
    if (!subject || !(body || htmlBody)) {
      return NextResponse.json({ error: 'subject and a message are required' }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const sql = getDb();
    await ensureTables(sql);

    let original = null;
    const origId = parseInt(inboxId);
    if (origId) {
      const rows = await sql`
        SELECT id, from_address, received_at, body_text, message_id
        FROM inbox_messages WHERE id = ${origId}
      `;
      original = rows[0] || null;
    }

    const replyInner = cleanQuillHtml(htmlBody) || escapeHtml(body).replace(/\n/g, '<br/>');
    const replyText  = (body || htmlToText(htmlBody)).trim();

    // Quote the original below the reply, the way a normal mail program does.
    let quoteHtml = '';
    let quoteText = '';
    if (original?.body_text) {
      const intro = `On ${fmtWhen(original.received_at)}, ${original.from_address} wrote:`;
      quoteHtml = `
    <div style="margin-top:28px;font-size:15px;line-height:1.5;color:#6b7280;">${escapeHtml(intro)}</div>
    <blockquote style="margin:8px 0 0 0;padding:0 0 0 14px;border-left:3px solid #d1d5db;color:#4b5563;font-size:15px;line-height:1.6;">${escapeHtml(original.body_text).replace(/\n/g, '<br/>')}</blockquote>`;
      quoteText = `\n\n${intro}\n${original.body_text.split('\n').map(l => `> ${l}`).join('\n')}`;
    }

    const html = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"></head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:600px;margin:0 auto;padding:24px 20px;background:#ffffff;">
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:18px;line-height:1.6;color:#111827;">
    ${replyInner}
  </div>
  <div style="font-family:Arial,Helvetica,sans-serif;">${quoteHtml}
  </div>
</div>
</body>
</html>`;

    // Threading headers so the reply lands in the same conversation in the member's mail program.
    const mid = String(original?.message_id || '').replace(/[<>]/g, '').trim();
    const headers = mid.includes('@') ? { 'In-Reply-To': `<${mid}>`, References: `<${mid}>` } : undefined;

    const resend = new Resend(process.env.RESEND_API_KEY);
    const { data, error } = await resend.emails.send({
      from: FROM,
      reply_to: REPLY_TO,
      to: recipients,
      subject,
      html,
      text: replyText + quoteText,
      ...(headers ? { headers } : {}),
    });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });

    // The email is out; record-keeping problems shouldn't turn that into an error for the user.
    let repliedAt = null;
    try {
      await sql`
        INSERT INTO email_log (subject, recipient_count, recipient_emails, body_html, status)
        VALUES (${subject}, ${recipients.length}, ${recipients.join(', ')}, ${replyInner}, 'sent')
      `;
      if (original) {
        await sql`
          INSERT INTO inbox_replies (inbox_message_id, to_addresses, subject, body_html, resend_id)
          VALUES (${original.id}, ${recipients.join(', ')}, ${subject}, ${replyInner}, ${data?.id || null})
        `;
        const upd = await sql`
          UPDATE inbox_messages SET replied_at = NOW(), is_read = true
          WHERE id = ${original.id} RETURNING replied_at
        `;
        repliedAt = upd[0]?.replied_at || null;
      }
    } catch (logErr) {
      console.error('Reply sent but logging failed:', logErr);
    }

    return NextResponse.json({ success: true, resendId: data?.id, repliedAt });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
