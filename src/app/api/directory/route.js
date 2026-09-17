import { getDb, ensureTables } from '../db';
import { NextResponse } from 'next/server';

// Data endpoint: never serve a build-time cached response.
export const dynamic = 'force-dynamic';

// Public endpoint for the member directory on seniormensclub.org.
// GET  - list active members (all contact info) for the password-protected directory
// POST - add a new member (first/last/email required, phone optional)
// PUT  - update an existing member's contact info (first/last/email/phone only)
// Note: this public endpoint intentionally does NOT expose delete or dues/status/notes.

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function cors(body, status = 200) {
  return NextResponse.json(body, { status, headers: CORS_HEADERS });
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS_HEADERS });
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`
      SELECT id, first_name, last_name, email, phone, address1, address2, city, state, zip
      FROM members
      WHERE status = 'active'
      ORDER BY last_name, first_name
    `;
    const members = rows.map(r => ({
      id: String(r.id),
      firstName: r.first_name,
      lastName: r.last_name,
      email: r.email || '',
      phone: r.phone || '',
      address1: r.address1 || '',
      address2: r.address2 || '',
      city: r.city || '',
      state: r.state || '',
      zip: r.zip || '',
    }));
    return cors(members);
  } catch (e) {
    return cors({ error: e.message }, 500);
  }
}

export async function POST(req) {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const m = await req.json();
    const firstName = (m.firstName || '').trim();
    const lastName = (m.lastName || '').trim();
    const email = (m.email || '').trim();
    const phone = (m.phone || '').trim();
    if (!firstName) return cors({ error: 'First name is required.' }, 400);
    if (!lastName) return cors({ error: 'Last name is required.' }, 400);
    if (!email) return cors({ error: 'Email address is required.' }, 400);
    if (!EMAIL_RE.test(email)) return cors({ error: 'Please enter a valid email address.' }, 400);
    const result = await sql`
      INSERT INTO members (first_name, last_name, email, phone, status)
      VALUES (${firstName}, ${lastName}, ${email}, ${phone}, 'active')
      RETURNING id
    `;
    return cors({ id: String(result[0].id) }, 201);
  } catch (e) {
    return cors({ error: e.message }, 500);
  }
}

export async function PUT(req) {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const m = await req.json();
    const id = parseInt(m.id, 10);
    const firstName = (m.firstName || '').trim();
    const lastName = (m.lastName || '').trim();
    const email = (m.email || '').trim();
    const phone = (m.phone || '').trim();
    if (!id) return cors({ error: 'A valid member id is required.' }, 400);
    if (!firstName) return cors({ error: 'First name is required.' }, 400);
    if (!lastName) return cors({ error: 'Last name is required.' }, 400);
    if (!email) return cors({ error: 'Email address is required.' }, 400);
    if (!EMAIL_RE.test(email)) return cors({ error: 'Please enter a valid email address.' }, 400);
    await sql`
      UPDATE members SET
        first_name = ${firstName},
        last_name = ${lastName},
        email = ${email},
        phone = ${phone},
        updated_at = NOW()
      WHERE id = ${id}
    `;
    return cors({ ok: true });
  } catch (e) {
    return cors({ error: e.message }, 500);
  }
}
