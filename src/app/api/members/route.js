import { getDb, ensureTables } from '../db';
import { NextResponse } from 'next/server';

// Data endpoint: never serve a build-time cached response.
export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`SELECT * FROM members ORDER BY last_name, first_name`;
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
      status: r.status || 'active',
      joinDate: r.join_date ? r.join_date.toISOString().split('T')[0] : '',
      lastDuesPaid: r.last_dues_paid ? r.last_dues_paid.toISOString().split('T')[0] : '',
      notes: r.notes || '',
    }));
    return NextResponse.json(members);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const m = await req.json();
    const result = await sql`
      INSERT INTO members (first_name, last_name, email, phone, address1, address2, city, state, zip, status, join_date, last_dues_paid, notes)
      VALUES (${m.firstName}, ${m.lastName}, ${m.email || ''}, ${m.phone || ''}, ${m.address1 || ''}, ${m.address2 || ''}, ${m.city || ''}, ${m.state || ''}, ${m.zip || ''}, ${m.status || 'active'}, ${m.joinDate || null}, ${m.lastDuesPaid || null}, ${m.notes || ''})
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
    const m = await req.json();
    await sql`
      UPDATE members SET
        first_name = ${m.firstName},
        last_name = ${m.lastName},
        email = ${m.email || ''},
        phone = ${m.phone || ''},
        address1 = ${m.address1 || ''},
        address2 = ${m.address2 || ''},
        city = ${m.city || ''},
        state = ${m.state || ''},
        zip = ${m.zip || ''},
        status = ${m.status || 'active'},
        join_date = ${m.joinDate || null},
        last_dues_paid = ${m.lastDuesPaid || null},
        notes = ${m.notes || ''},
        updated_at = NOW()
      WHERE id = ${parseInt(m.id)}
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function DELETE(req) {
  try {
    const sql = getDb();
    const { id } = await req.json();
    await sql`DELETE FROM members WHERE id = ${parseInt(id)}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
