import { NextResponse } from 'next/server';
import { getDb, ensureTables } from '../db';

// GET /api/templates
export async function GET() {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`
      SELECT id, name, subject, body_html, created_at, updated_at
      FROM email_templates ORDER BY name ASC
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/templates
export async function POST(req) {
  try {
    const { name, subject, bodyHtml } = await req.json();
    if (!name?.trim() || !subject?.trim()) {
      return NextResponse.json({ error: 'name and subject are required' }, { status: 400 });
    }
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`
      INSERT INTO email_templates (name, subject, body_html)
      VALUES (${name.trim()}, ${subject.trim()}, ${bodyHtml || ''})
      RETURNING id, name, subject, body_html, created_at, updated_at
    `;
    return NextResponse.json(rows[0]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/templates?id=1
export async function PATCH(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const { name, subject, bodyHtml } = await req.json();
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`
      UPDATE email_templates
      SET name = ${name.trim()}, subject = ${subject.trim()}, body_html = ${bodyHtml || ''}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, subject, body_html, updated_at
    `;
    return NextResponse.json(rows[0]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/templates?id=1
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const sql = getDb();
    await ensureTables(sql);
    await sql`DELETE FROM email_templates WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
