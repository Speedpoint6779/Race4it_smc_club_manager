import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getDb, ensureTables } from '../db';

const FROM     = process.env.EMAIL_FROM     || 'SMC Club Manager <club@seniormensclub.org>';
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'club@seniormensclub.org';

// GET /api/email?folder=sent|trash — fetch sent email log
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') || 'sent';
    const sql = getDb();
    await ensureTables(sql);
    const rows = folder === 'trash'
      ? await sql`SELECT id, subject, recipient_count, recipient_emails, sent_at, status, error, deleted FROM email_log WHERE deleted = true ORDER BY sent_at DESC LIMIT 50`
      : await sql`SELECT id, subject, recipient_count, recipient_emails, sent_at, status, error, deleted FROM email_log WHERE deleted = false ORDER BY sent_at DESC LIMIT 50`;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/email?id=123 — soft-delete (move to trash)
// DELETE /api/email?id=123&permanent=true — hard delete
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id'));
    const permanent = searchParams.get('permanent') === 'true';
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const sql = getDb();
    await ensureTables(sql);
    if (permanent) {
      await sql`DELETE FROM email_log WHERE id = ${id}`;
    } else {
      await sql`UPDATE email_log SET deleted = true WHERE id = ${id}`;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/email?id=123 — restore from trash
export async function PATCH(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const sql = getDb();
    await ensureTables(sql);
    await sql`UPDATE email_log SET deleted = false WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/email — send email to selected member IDs
export async function POST(req) {
  try {
    const { memberIds, subject, body, htmlBody } = await req.json();
    if (!memberIds?.length || !subject || !body) {
      return NextResponse.json({ error: 'memberIds, subject, and body are required' }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const sql = getDb();
    await ensureTables(sql);
    const members = await sql`
      SELECT id, first_name, last_name, email FROM members
      WHERE id = ANY(${memberIds}::int[]) AND email IS NOT NULL AND email != ''
    `;
    if (!members.length) {
      return NextResponse.json({ error: 'No valid email addresses found for selected members' }, { status: 400 });
    }

    // Wrap the body in a branded shell.
    // The <style> block resets <p> margins so email clients don't add
    // huge default spacing between paragraphs from Quill output.
    const emailHtml = `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<style>
  body { margin:0; padding:0; font-family:Arial,Helvetica,sans-serif; background:#f9fafb; }
  p { margin:0 0 12px 0 !important; padding:0; }
  ul, ol { margin:0 0 12px 0; padding-left:24px; }
  li { margin:0 0 4px 0; }
  strong { font-weight:700; }
  a { color:#3b82f6; }
</style>
</head>
<body>
<div style="max-width:600px;margin:0 auto;padding:32px 24px;background:#ffffff;">
  <div style="margin-bottom:24px;padding-bottom:16px;border-bottom:2px solid #3b82f6;">
    <span style="font-size:18px;font-weight:700;color:#1e3a5f;">Senior Men's Club</span>
  </div>
  <div style="line-height:1.7;font-size:15px;color:#1e293b;">
    ${htmlBody || body.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\n/g,'<br/>')}
  </div>
  <div style="margin-top:32px;padding-top:16px;border-top:1px solid #e5e7eb;color:#9ca3af;font-size:12px;">
    Senior Men's Club &bull; Sent via SMC Club Manager
  </div>
</div>
</body>
</html>`;

    const batch = members.map(m => ({
      from: FROM, reply_to: REPLY_TO,
      to: [`${m.first_name} ${m.last_name} <${m.email}>`],
      subject, text: body, html: emailHtml,
    }));
    const CHUNK = 100;
    let totalSent = 0;
    let firstError = null;
    for (let i = 0; i < batch.length; i += CHUNK) {
      const chunk = batch.slice(i, i + CHUNK);
      const { error } = await resend.batch.send(chunk);
      if (error) { firstError = error; break; }
      totalSent += chunk.length;
    }
    if (firstError) {
      await sql`INSERT INTO email_log (subject, recipient_count, recipient_emails, status, error) VALUES (${subject}, ${members.length}, ${members.map(m => m.email).join(', ')}, 'failed', ${firstError.message})`;
      return NextResponse.json({ error: firstError.message }, { status: 500 });
    }
    await sql`INSERT INTO email_log (subject, recipient_count, recipient_emails, status) VALUES (${subject}, ${members.length}, ${members.map(m => m.email).join(', ')}, 'sent')`;
    return NextResponse.json({ success: true, sent: totalSent });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
