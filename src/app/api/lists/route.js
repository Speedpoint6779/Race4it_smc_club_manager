import { NextResponse } from 'next/server';
import { getDb, ensureTables } from '../db';

// GET /api/lists — fetch all saved email lists
export async function GET() {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`
      SELECT id, name, member_ids, created_at, updated_at
      FROM email_lists
      ORDER BY name ASC
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// POST /api/lists — create a new list
export async function POST(req) {
  try {
    const { name, memberIds } = await req.json();
    if (!name?.trim() || !memberIds?.length) {
      return NextResponse.json({ error: 'name and memberIds are required' }, { status: 400 });
    }
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`
      INSERT INTO email_lists (name, member_ids)
      VALUES (${name.trim()}, ${memberIds})
      RETURNING id, name, member_ids, created_at, updated_at
    `;
    return NextResponse.json(rows[0]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/lists?id=1 — update an existing list
export async function PATCH(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const { name, memberIds } = await req.json();
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`
      UPDATE email_lists
      SET name = ${name.trim()}, member_ids = ${memberIds}, updated_at = NOW()
      WHERE id = ${id}
      RETURNING id, name, member_ids, updated_at
    `;
    return NextResponse.json(rows[0]);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/lists?id=1 — delete a list
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const sql = getDb();
    await ensureTables(sql);
    await sql`DELETE FROM email_lists WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
