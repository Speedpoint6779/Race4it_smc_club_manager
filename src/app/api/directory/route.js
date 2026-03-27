import { getDb, ensureTables } from '../db';
import { NextResponse } from 'next/server';

// Public read-only endpoint for the member directory on seniormensclub.org
// Returns active members only — name, email, phone, city, state

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`
      SELECT first_name, last_name, email, phone, city, state
      FROM members
      WHERE status = 'active'
      ORDER BY last_name, first_name
    `;
    const members = rows.map(r => ({
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email || '',
      phone: r.phone || '',
      city: r.city || '',
      state: r.state || '',
    }));
    return NextResponse.json(members, { headers: CORS_HEADERS });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500, headers: CORS_HEADERS });
  }
}
