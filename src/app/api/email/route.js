import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getDb, ensureTables } from '../db';

const resend = new Resend(process.env.RESEND_API_KEY);
const FROM = process.env.EMAIL_FROM || 'SMC Club Manager <noreply@seniormensclub.org>';

// GET /api/email — fetch sent email log
export async function GET() {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`
      SELECT id, subject, recipient_count, recipient_emails, sent_at, status, error
      FROM email_log
      ORDER BY sent_at DESC
      LIMIT 50
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/email — send email to selected member IDs
export async function POST(req) {
  try {
    const { memberIds, subject, body } = await req.json();

    if (!memberIds?.length || !subject || !body) {
      return NextResponse.json({ error: 'memberIds, subject, and body are required' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const sql = getDb();
    await ensureTables(sql);

    // Fetch email addresses for selected member IDs
    const members = await sql`
      SELECT id, first_name, last_name, email
      FROM members
      WHERE id = ANY(${memberIds}::int[])
        AND email IS NOT NULL
        AND email != ''
    `;

    if (!members.length) {
      return NextResponse.json({ error: 'No valid email addresses found for selected members' }, { status: 400 });
    }

    const toAddresses = members.map(m => ({
      email: m.email,
      name: `${m.first_name} ${m.last_name}`,
    }));

    // Send via Resend — one email with BCC to protect privacy
    const { data, error } = await resend.emails.send({
      from: FROM,
      to: [FROM],
      bcc: toAddresses.map(t => `${t.name} <${t.email}>`),
      subject,
      text: body,
      html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
        <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #3b82f6;">
          <strong style="font-size:18px;color:#1e3a5f;">Senior Men's Club</strong>
        </div>
        <div style="white-space:pre-wrap;line-height:1.6;font-size:15px;">${body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>')}</div>
        <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
          Senior Men's Club &bull; Sent via SMC Club Manager
        </div>
      </div>`,
    });

    if (error) {
      // Log failure
      await sql`
        INSERT INTO email_log (subject, recipient_count, recipient_emails, status, error)
        VALUES (${subject}, ${members.length}, ${members.map(m => m.email).join(', ')}, 'failed', ${error.message})
      `;
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log success
    await sql`
      INSERT INTO email_log (subject, recipient_count, recipient_emails, status)
      VALUES (${subject}, ${members.length}, ${members.map(m => m.email).join(', ')}, 'sent')
    `;

    return NextResponse.json({ success: true, sent: members.length, resendId: data?.id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
