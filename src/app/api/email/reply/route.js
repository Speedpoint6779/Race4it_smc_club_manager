import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getDb, ensureTables } from '../../db';

const FROM     = process.env.EMAIL_FROM     || 'SMC Club Manager <club@seniormensclub.org>';
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'club@seniormensclub.org';

// POST /api/email/reply — send a reply to any email address (not just members)
export async function POST(req) {
  try {
    const { to, subject, body } = await req.json();

    if (!to || !subject || !body) {
      return NextResponse.json({ error: 'to, subject, and body are required' }, { status: 400 });
    }

    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }

    const resend = new Resend(process.env.RESEND_API_KEY);

    const { data, error } = await resend.emails.send({
      from: FROM,
      reply_to: REPLY_TO,
      to: [to],
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
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Log the reply in email_log
    const sql = getDb();
    await ensureTables(sql);
    await sql`
      INSERT INTO email_log (subject, recipient_count, recipient_emails, status)
      VALUES (${subject}, 1, ${to}, 'sent')
    `;

    return NextResponse.json({ success: true, resendId: data?.id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
