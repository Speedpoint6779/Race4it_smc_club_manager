import { NextResponse } from 'next/server';
import { getDb, ensureTables } from '../../../db';

// GET /api/email/inbound/[id] — fetch a single inbox message
export async function GET(req, { params }) {
  try {
    const { id } = await params;
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`
      SELECT id, from_address, to_address, subject, body_text, body_html, is_read, received_at
      FROM inbox_messages
      WHERE id = ${parseInt(id)}
      LIMIT 1
    `;
    if (!rows.length) return NextResponse.json({ error: 'Not found' }, { status: 404 });
    return NextResponse.json(rows[0]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/email/inbound/[id] — mark message as read
export async function PATCH(req, { params }) {
  try {
    const { id } = await params;
    const sql = getDb();
    await ensureTables(sql);
    await sql`
      UPDATE inbox_messages SET is_read = true WHERE id = ${parseInt(id)}
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
