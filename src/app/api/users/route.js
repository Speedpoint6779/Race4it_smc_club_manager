import { getDb, ensureTables } from '../db';
import { NextResponse } from 'next/server';

// Data endpoint: never serve a build-time cached response.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`SELECT id, name, username, created_at FROM users ORDER BY name`;
    const users = rows.map(r => ({
      id: String(r.id),
      name: r.name,
      username: r.username,
      createdAt: r.created_at ? r.created_at.toISOString().split('T')[0] : '',
    }));
    return NextResponse.json(users);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const u = await req.json();
    if (!u.name || !u.username || !u.password) {
      return NextResponse.json({ error: 'Name, username, and password are required' }, { status: 400 });
    }
    const exists = await sql`SELECT id FROM users WHERE username = ${u.username}`;
    if (exists.length > 0) {
      return NextResponse.json({ error: 'Username already exists' }, { status: 400 });
    }
    const result = await sql`
      INSERT INTO users (name, username, password)
      VALUES (${u.name}, ${u.username}, ${u.password})
      RETURNING id
    `;
    return NextResponse.json({ id: String(result[0].id) });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const sql = getDb();
    const u = await req.json();
    if (u.password) {
      await sql`UPDATE users SET name = ${u.name}, username = ${u.username}, password = ${u.password} WHERE id = ${parseInt(u.id)}`;
    } else {
      await sql`UPDATE users SET name = ${u.name}, username = ${u.username} WHERE id = ${parseInt(u.id)}`;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const sql = getDb();
    const { id } = await req.json();
    // Prevent deleting the last user
    const count = await sql`SELECT COUNT(*) as count FROM users`;
    if (parseInt(count[0].count) <= 1) {
      return NextResponse.json({ error: 'Cannot delete the last user' }, { status: 400 });
    }
    await sql`DELETE FROM users WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
