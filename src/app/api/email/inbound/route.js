import { NextResponse } from 'next/server';
import { getDb, ensureTables } from '../../db';

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

// POST /api/email/inbound — Resend inbound webhook
// Configure in Resend dashboard: Domains → your domain → Inbound webhook URL
// Set to: https://manager.seniormensclub.org/api/email/inbound
export async function POST(req) {
  try {
    const payload = await req.json();

    // Resend inbound email payload fields
    const from      = payload.from       || payload.sender || '';
    const to        = Array.isArray(payload.to) ? payload.to.join(', ') : (payload.to || '');
    const subject   = payload.subject    || '(no subject)';
    const bodyText  = payload.text       || payload.plain  || '';
    const bodyHtml  = payload.html       || '';
    const messageId = payload.message_id || payload.headers?.['message-id'] || '';

    const sql = getDb();
    await ensureTables(sql);

    // Deduplicate by message_id if present
    if (messageId) {
      const existing = await sql`
        SELECT id FROM inbox_messages WHERE message_id = ${messageId} LIMIT 1
      `;
      if (existing.length > 0) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
    }

    await sql`
      INSERT INTO inbox_messages (from_address, to_address, subject, body_text, body_html, message_id)
      VALUES (${from}, ${to}, ${subject}, ${bodyText}, ${bodyHtml}, ${messageId})
    `;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Inbound email error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
