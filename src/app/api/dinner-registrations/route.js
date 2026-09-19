import { getDb } from '../db';
import { NextResponse } from 'next/server';
import { randomUUID } from 'crypto';

// Data endpoint: never serve a build-time cached response.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

// Annual Dinner roster: paid registrations from Stripe plus manual officer entries.
export const TICKET_PRICE_CENTS = 2500;

async function ensureDinnerTable(sql) {
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
  // Added for 3+ ticket reservations and manually entered payments.
  await sql`ALTER TABLE dinner_registrations ADD COLUMN IF NOT EXISTS guests JSONB DEFAULT '[]'::jsonb`;
  await sql`ALTER TABLE dinner_registrations ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT ''`;
  await sql`ALTER TABLE dinner_registrations ADD COLUMN IF NOT EXISTS notes TEXT DEFAULT ''`;
  await sql`ALTER TABLE dinner_registrations ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP`;
}

// Guests live in the JSONB column. Rows written before that column existed
// (and every row Stripe writes) still carry a single guest in the legacy
// guest_name / guest_entree pair, so fall back to those.
function readGuests(r) {
  let g = r.guests;
  if (typeof g === 'string') { try { g = JSON.parse(g); } catch (e) { g = null; } }
  if (Array.isArray(g) && g.length) {
    return g.map(x => ({ name: (x && x.name) || '', entree: (x && x.entree) || '' }));
  }
  if ((r.tickets || 1) >= 2 && (r.guest_name || r.guest_entree)) {
    return [{ name: r.guest_name || '', entree: r.guest_entree || '' }];
  }
  return [];
}

function cleanGuests(input) {
  if (!Array.isArray(input)) return [];
  return input
    .map(g => ({ name: String((g && g.name) || '').trim(), entree: String((g && g.entree) || '').trim() }))
    .filter(g => g.name || g.entree);
}

function shape(r) {
  const guests = readGuests(r);
  return {
    id: String(r.id),
    memberName: r.member_name || '',
    email: r.email || '',
    phone: r.phone || '',
    tickets: r.tickets || 1,
    guests,
    // Kept so any older consumer of this endpoint keeps working.
    guestName: guests[0] ? guests[0].name : '',
    guestEntree: guests[0] ? guests[0].entree : '',
    memberEntree: r.member_entree || '',
    carMake: r.car_make || '',
    carModel: r.car_model || '',
    carYear: r.car_year || '',
    car: [r.car_year, r.car_make, r.car_model].filter(Boolean).join(' '),
    amount: (r.amount_cents || 0) / 100,
    paymentMethod: r.payment_method || (r.stripe_session_id ? 'stripe' : ''),
    isStripe: !!r.stripe_session_id,
    notes: r.notes || '',
    paidAt: (r.paid_at || r.created_at) ? new Date(r.paid_at || r.created_at).toISOString() : null,
  };
}

export async function GET() {
  try {
    const sql = getDb();
    await ensureDinnerTable(sql);
    const rows = await sql`
      SELECT id, member_name, email, phone, tickets, guest_name, member_entree, guest_entree,
             guests, car_make, car_model, car_year, amount_cents, stripe_session_id,
             payment_method, notes, created_at, paid_at
      FROM dinner_registrations
      WHERE payment_status = 'paid'
      ORDER BY paid_at DESC NULLS LAST, created_at DESC
    `;
    return NextResponse.json(rows.map(shape));
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function POST(req) {
  try {
    const sql = getDb();
    await ensureDinnerTable(sql);
    const b = await req.json();
    const guests = cleanGuests(b.guests);
    const tickets = 1 + guests.length;
    const cents = b.amount == null || b.amount === ''
      ? tickets * TICKET_PRICE_CENTS
      : Math.round(Number(b.amount) * 100);
    const id = randomUUID();
    await sql`
      INSERT INTO dinner_registrations
        (id, member_name, email, phone, tickets, guest_count, guests, guest_name, guest_entree,
         member_entree, car_make, car_model, car_year, amount_cents, payment_method,
         payment_status, notes, paid_at)
      VALUES (
        ${id}, ${b.memberName || ''}, ${b.email || ''}, ${b.phone || ''}, ${tickets}, ${tickets},
        ${JSON.stringify(guests)}::jsonb,
        ${guests[0] ? guests[0].name : ''}, ${guests[0] ? guests[0].entree : ''},
        ${b.memberEntree || ''}, ${b.carMake || ''}, ${b.carModel || ''}, ${b.carYear || ''},
        ${cents}, ${b.paymentMethod || 'check'}, 'paid', ${b.notes || ''},
        ${b.paidAt || new Date().toISOString()}
      )
    `;
    return NextResponse.json({ id });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

export async function PUT(req) {
  try {
    const sql = getDb();
    await ensureDinnerTable(sql);
    const b = await req.json();
    if (!b.id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const guests = cleanGuests(b.guests);
    const tickets = 1 + guests.length;
    const cents = b.amount == null || b.amount === ''
      ? tickets * TICKET_PRICE_CENTS
      : Math.round(Number(b.amount) * 100);
    await sql`
      UPDATE dinner_registrations SET
        member_name = ${b.memberName || ''},
        email = ${b.email || ''},
        phone = ${b.phone || ''},
        tickets = ${tickets},
        guest_count = ${tickets},
        guests = ${JSON.stringify(guests)}::jsonb,
        guest_name = ${guests[0] ? guests[0].name : ''},
        guest_entree = ${guests[0] ? guests[0].entree : ''},
        member_entree = ${b.memberEntree || ''},
        car_make = ${b.carMake || ''},
        car_model = ${b.carModel || ''},
        car_year = ${b.carYear || ''},
        amount_cents = ${cents},
        payment_method = ${b.paymentMethod || ''},
        notes = ${b.notes || ''},
        paid_at = COALESCE(${b.paidAt || null}, paid_at),
        updated_at = NOW()
      WHERE id = ${String(b.id)}
    `;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Nothing is ever hard-deleted. Rows are marked void, which drops them off the
// roster (GET only returns payment_status = 'paid') while keeping the payment
// record and its Stripe session intact for reconciliation.
export async function DELETE(req) {
  try {
    const sql = getDb();
    await ensureDinnerTable(sql);
    const { id } = await req.json();
    if (!id) return NextResponse.json({ error: 'id required' }, { status: 400 });
    const rows = await sql`
      UPDATE dinner_registrations
      SET payment_status = 'void', updated_at = NOW()
      WHERE id = ${String(id)}
      RETURNING id
    `;
    if (!rows.length) return NextResponse.json({ error: 'not found' }, { status: 404 });
    return NextResponse.json({ ok: true, action: 'voided' });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
