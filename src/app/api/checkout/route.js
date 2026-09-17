import Stripe from 'stripe';
import { getDb } from '../db';
import { NextResponse } from 'next/server';

// Public checkout endpoint for the Annual Dinner registration on seniormensclub.org.
// POST  - create a Stripe Checkout Session for $25 x tickets, after a capacity check
// GET    - ?session_id=... returns payment status for the confirmation page;
//          with no session_id returns remaining ticket count.
export const runtime = 'nodejs';

const PRICE_CENTS = 2500;
const CAPACITY = 100;
const SITE = process.env.SITE_URL || 'https://seniormensclub.org';

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};
const cors = (body, status = 200) => NextResponse.json(body, { status, headers: CORS });
const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) throw new Error('STRIPE_SECRET_KEY is not configured');
  return new Stripe(key);
}

async function ensureTable(sql) {
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
}

async function soldTickets(sql) {
  const r = await sql`SELECT COALESCE(SUM(tickets),0) AS n FROM dinner_registrations WHERE payment_status = 'paid'`;
  return parseInt(r[0].n) || 0;
}

export async function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

export async function POST(req) {
  try {
    const sql = getDb();
    await ensureTable(sql);
    const b = await req.json();

    const memberName = (b.memberName || '').trim();
    const email = (b.email || '').trim();
    const phone = (b.phone || '').trim();
    const tickets = (b.guestCount === 2 || b.guestCount === '2') ? 2 : 1;
    const memberEntree = (b.memberEntree || '').trim();

    if (!memberName) return cors({ error: 'Member name is required.' }, 400);
    if (!EMAIL_RE.test(email)) return cors({ error: 'A valid email address is required.' }, 400);
    if (!memberEntree) return cors({ error: 'Please choose your entrée.' }, 400);

    const guestName = tickets === 2 ? (b.guestName || '').trim() : '';
    const guestEntree = tickets === 2 ? (b.guestEntree || '').trim() : '';
    if (tickets === 2 && !guestName) return cors({ error: 'Please enter your guest name.' }, 400);
    if (tickets === 2 && !guestEntree) return cors({ error: 'Please choose your guest entrée.' }, 400);

    const sold = await soldTickets(sql);
    if (sold >= CAPACITY) return cors({ error: 'Sorry — the dinner is sold out.' }, 409);
    if (sold + tickets > CAPACITY) return cors({ error: `Only ${CAPACITY - sold} ticket(s) remain.` }, 409);

    const carMake = (b.carMake || '').trim();
    const carModel = (b.carModel || '').trim();
    const carYear = (b.carYear || '').trim();

    const id = (globalThis.crypto && globalThis.crypto.randomUUID)
      ? globalThis.crypto.randomUUID()
      : (Date.now() + '-' + Math.random().toString(16).slice(2));

    await sql`INSERT INTO dinner_registrations
      (id, member_name, email, phone, guest_count, guest_name, member_entree, guest_entree, car_make, car_model, car_year, tickets, amount_cents, payment_status)
      VALUES (${id}, ${memberName}, ${email}, ${phone}, ${tickets}, ${guestName}, ${memberEntree}, ${guestEntree}, ${carMake}, ${carModel}, ${carYear}, ${tickets}, ${tickets * PRICE_CENTS}, 'pending')`;

    const stripe = getStripe();
    const session = await stripe.checkout.sessions.create({
      mode: 'payment',
      payment_method_types: ['card'],
      customer_email: email,
      line_items: [{
        quantity: tickets,
        price_data: {
          currency: 'usd',
          unit_amount: PRICE_CENTS,
          product_data: { name: 'WSMC Annual Dinner Ticket', description: 'Saturday, October 17, 2026 · 4–7:30 PM' },
        },
      }],
      metadata: {
        registrationId: id,
        memberName, email, phone,
        tickets: String(tickets),
        guestName, memberEntree, guestEntree,
        carMake, carModel, carYear,
      },
      success_url: `${SITE}/WSMC_Annual_Dinner.html?paid=1&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${SITE}/WSMC_Annual_Dinner.html?canceled=1#rsvp`,
    });

    await sql`UPDATE dinner_registrations SET stripe_session_id = ${session.id} WHERE id = ${id}`;
    return cors({ url: session.url });
  } catch (e) {
    return cors({ error: e.message }, 500);
  }
}

export async function GET(req) {
  try {
    const sql = getDb();
    await ensureTable(sql);
    const { searchParams } = new URL(req.url);
    const sessionId = searchParams.get('session_id');
    if (!sessionId) {
      const sold = await soldTickets(sql);
      return cors({ remaining: Math.max(0, CAPACITY - sold), capacity: CAPACITY });
    }
    const stripe = getStripe();
    const session = await stripe.checkout.sessions.retrieve(sessionId);
    const m = session.metadata || {};
    return cors({
      paid: session.payment_status === 'paid',
      status: session.payment_status,
      email: session.customer_email || m.email || '',
      memberName: m.memberName || '',
      tickets: m.tickets ? parseInt(m.tickets) : null,
      amount_total: session.amount_total,
    });
  } catch (e) {
    return cors({ error: e.message }, 500);
  }
}
