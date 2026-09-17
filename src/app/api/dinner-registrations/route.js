import { getDb } from '../db';
import { NextResponse } from 'next/server';

// Data endpoint: never serve a build-time cached response.
export const dynamic = 'force-dynamic';

// Read-only list of PAID Annual Dinner registrations for the manager app roster page.
export const runtime = 'nodejs';

export async function GET() {
  try {
    const sql = getDb();
    await sql`CREATE TABLE IF NOT EXISTS dinner_registrations (
      id TEXT PRIMARY KEY,
      member_name TEXT DEFAULT '',
      email TEXT DEFAULT '',
      phone TEXT DEFAULT '',
      guest_count INTEGER DEFAULT 1,
      guest_name TEXT DEFAULT '',
      member_entree TEXT DEFAULT '',
      guest_entree TEXT DEFAULT '',
      car_make TEXT DEFAULT '',
      car_model TEXT DEFAULT '',
      car_year TEXT DEFAULT '',
      tickets INTEGER DEFAULT 1,
      amount_cents INTEGER DEFAULT 0,
      stripe_session_id TEXT DEFAULT '',
      payment_status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT NOW(),
      paid_at TIMESTAMP
    )`;
    const rows = await sql`
      SELECT id, member_name, email, phone, tickets, guest_name, member_entree, guest_entree,
             car_make, car_model, car_year, amount_cents, created_at, paid_at
      FROM dinner_registrations
      WHERE payment_status = 'paid'
      ORDER BY paid_at DESC NULLS LAST, created_at DESC
    `;
    const list = rows.map(r => ({
      id: String(r.id),
      memberName: r.member_name || '',
      email: r.email || '',
      phone: r.phone || '',
      tickets: r.tickets || 1,
      guestName: r.guest_name || '',
      memberEntree: r.member_entree || '',
      guestEntree: r.guest_entree || '',
      car: [r.car_year, r.car_make, r.car_model].filter(Boolean).join(' '),
      amount: (r.amount_cents || 0) / 100,
      paidAt: (r.paid_at || r.created_at) ? new Date(r.paid_at || r.created_at).toISOString() : null,
    }));
    return NextResponse.json(list);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
