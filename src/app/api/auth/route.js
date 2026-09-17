import { getDb, ensureTables } from '../db';
import { NextResponse } from 'next/server';

// Data endpoint: never serve a build-time cached response.
export const dynamic = 'force-dynamic';

export async function POST(req) {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const { username, password } = await req.json();
    const rows = await sql`SELECT id, name, username FROM users WHERE username = ${username} AND password = ${password}`;
    if (rows.length === 0) {
      return NextResponse.json({ error: 'Invalid username or password' }, { status: 401 });
    }
    return NextResponse.json({ id: String(rows[0].id), name: rows[0].name, username: rows[0].username });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
