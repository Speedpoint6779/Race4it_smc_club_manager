import Stripe from 'stripe';
import { Resend } from 'resend';
import { getDb } from '../db';
import { NextResponse } from 'next/server';

// Data endpoint: never serve a build-time cached response.
export const dynamic = 'force-dynamic';

// Stripe webhook: marks a dinner registration paid, then emails the guest a
// confirmation and notifies the events team. Called server-to-server by Stripe.
export const runtime = 'nodejs';

const FROM = process.env.EMAIL_FROM || 'SMC Club Manager <club@seniormensclub.org>';
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'club@seniormensclub.org';
const EVENTS_EMAIL = process.env.EVENTS_EMAIL || 'events@seniormensclub.org';

function esc(s) {
  return String(s == null ? '' : s).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
}

function summaryRows(m, tickets, total) {
  const rows = [
    ['Event', 'Annual Dinner · Saturday, October 17, 2026 · 4–7:30 PM'],
    ['Member', m.memberName],
    ['Tickets', `${tickets} × $25 = $${total}`],
    ['Your entrée', m.memberEntree],
  ];
  if (parseInt(m.tickets) === 2) {
    rows.push(['Guest', m.guestName], ['Guest entrée', m.guestEntree]);
  }
  if (m.carYear || m.carMake || m.carModel) {
    rows.push(['Your first car', [m.carYear, m.carMake, m.carModel].filter(Boolean).join(' ')]);
  }
  return rows;
}

function tableHtml(rows) {
  return `<table style="border-collapse:collapse;margin:16px 0;font-size:15px">${rows.map(
    ([k, v]) => `<tr><td style="padding:4px 14px 4px 0;color:#52666c;vertical-align:top">${esc(k)}</td><td style="padding:4px 0"><strong>${esc(v)}</strong></td></tr>`
  ).join('')}</table>`;
}

function guestEmailHtml(m, tickets, total) {
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#19323a;line-height:1.6">
  <h2 style="color:#12313b">You're all set — see you at the water.</h2>
  <p>Thank you, ${esc(m.memberName)}. Your payment of <strong>$${total}</strong> for the Wilmington Senior Men's Club Annual Dinner is confirmed.</p>
  ${tableHtml(summaryRows(m, tickets, total))}
  <p>Saturday, October 17, 2026, 4–7:30 PM at a private waterfront home in Wilmington. Rain or shine — we'll move indoors if it rains.</p>
  <p>Questions or changes? Just reply to this email or write <a href="mailto:${esc(EVENTS_EMAIL)}">${esc(EVENTS_EMAIL)}</a>.</p>
  <p style="color:#52666c">Wilmington Senior Men's Club</p>
  </body></html>`;
}

function adminEmailHtml(m, tickets, total, email) {
  return `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#19323a">
  <h3>New dinner registration</h3>
  ${tableHtml([...summaryRows(m, tickets, total), ['Email', email], ['Phone', m.phone || '—']])}
  </body></html>`;
}

export async function POST(req) {
  const key = process.env.STRIPE_SECRET_KEY;
  const whsec = process.env.STRIPE_WEBHOOK_SECRET;
  if (!key || !whsec) return NextResponse.json({ error: 'Stripe is not configured' }, { status: 500 });

  const stripe = new Stripe(key);
  const sig = req.headers.get('stripe-signature');
  const raw = await req.text();

  let event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, whsec);
  } catch (e) {
    return NextResponse.json({ error: `Signature verification failed: ${e.message}` }, { status: 400 });
  }

  if (event.type !== 'checkout.session.completed') {
    return NextResponse.json({ received: true });
  }

  const session = event.data.object;
  try {
    const sql = getDb();
    const m = session.metadata || {};
    const regId = m.registrationId;

    // Mark paid — guarded so retries never double-send the email.
    const updated = regId
      ? await sql`UPDATE dinner_registrations SET payment_status='paid', paid_at=NOW(), stripe_session_id=${session.id}
                  WHERE id=${regId} AND payment_status <> 'paid'
                  RETURNING id, email, member_name, tickets`
      : await sql`UPDATE dinner_registrations SET payment_status='paid', paid_at=NOW()
                  WHERE stripe_session_id=${session.id} AND payment_status <> 'paid'
                  RETURNING id, email, member_name, tickets`;

    if (updated.length && process.env.RESEND_API_KEY) {
      const resend = new Resend(process.env.RESEND_API_KEY);
      const email = session.customer_email || m.email || updated[0].email;
      const tickets = parseInt(m.tickets || updated[0].tickets || 1);
      const total = (session.amount_total || tickets * 2500) / 100;
      if (email) {
        await resend.emails.send({
          from: FROM, to: email, replyTo: REPLY_TO,
          subject: 'Your WSMC Annual Dinner tickets are confirmed',
          html: guestEmailHtml(m, tickets, total),
        });
      }
      await resend.emails.send({
        from: FROM, to: EVENTS_EMAIL, replyTo: REPLY_TO,
        subject: `Dinner registration: ${m.memberName || ''} (${tickets} ticket${tickets === 1 ? '' : 's'})`,
        html: adminEmailHtml(m, tickets, total, email),
      }).catch(() => {});
    }
    return NextResponse.json({ received: true });
  } catch (e) {
    // Return 500 so Stripe retries; the guarded UPDATE keeps it idempotent.
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
