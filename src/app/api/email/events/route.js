import crypto from 'crypto';
import { NextResponse } from 'next/server';
import { getDb, ensureTables } from '../../db';

// Resend webhook: records delivered / opened / clicked / bounced / complained events
// against the per-recipient rows written by POST /api/email.
// Resend signs webhooks with Svix; set RESEND_WEBHOOK_SECRET (whsec_...) in Vercel.
export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const TRACKED = new Set([
  'email.delivered',
  'email.opened',
  'email.clicked',
  'email.bounced',
  'email.complained',
]);

const TOLERANCE_SECONDS = 5 * 60;

function verifySignature(raw, headers) {
  const secret = process.env.RESEND_WEBHOOK_SECRET;
  if (!secret) return 'RESEND_WEBHOOK_SECRET not configured';
  const id = headers.get('svix-id');
  const ts = headers.get('svix-timestamp');
  const sigHeader = headers.get('svix-signature');
  if (!id || !ts || !sigHeader) return 'Missing signature headers';

  const now = Math.floor(Date.now() / 1000);
  if (!/^\d+$/.test(ts) || Math.abs(now - parseInt(ts, 10)) > TOLERANCE_SECONDS) return 'Timestamp outside tolerance';

  const key = Buffer.from(secret.replace(/^whsec_/, ''), 'base64');
  const expected = Buffer.from(crypto.createHmac('sha256', key).update(`${id}.${ts}.${raw}`).digest('base64'));
  const ok = sigHeader.split(' ').some(part => {
    const [version, sig] = part.split(',');
    if (version !== 'v1' || !sig) return false;
    const given = Buffer.from(sig);
    return given.length === expected.length && crypto.timingSafeEqual(given, expected);
  });
  return ok ? null : 'Invalid signature';
}

export async function POST(req) {
  const raw = await req.text();
  const sigError = verifySignature(raw, req.headers);
  if (sigError) return NextResponse.json({ error: sigError }, { status: 401 });

  let payload;
  try { payload = JSON.parse(raw); } catch { return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 }); }

  const type = payload.type || '';
  const d = payload.data || {};
  const resendId = d.email_id || '';
  if (!resendId || !TRACKED.has(type)) return NextResponse.json({ ok: true, ignored: type });

  const occurredDate = new Date(payload.created_at || d.created_at || Date.now());
  const occurred = (isNaN(occurredDate.getTime()) ? new Date() : occurredDate).toISOString();

  const sql = getDb();
  let eventRowId = null;
  try {
    await ensureTables(sql);

    // Dedupe on the Svix message id so retries never double-count opens/clicks.
    const svixId = req.headers.get('svix-id');
    const inserted = await sql`
      INSERT INTO email_events (svix_id, resend_id, type, occurred_at, payload)
      VALUES (${svixId}, ${resendId}, ${type}, ${occurred}::timestamptz, ${raw}::jsonb)
      ON CONFLICT (svix_id) DO NOTHING
      RETURNING id
    `;
    if (!inserted.length) return NextResponse.json({ ok: true, duplicate: true });
    eventRowId = inserted[0].id;

    let updated = [];
    if (type === 'email.delivered') {
      updated = await sql`
        UPDATE email_recipients SET delivered_at = LEAST(delivered_at, ${occurred}::timestamptz)
        WHERE resend_id = ${resendId} RETURNING id, member_id`;
    } else if (type === 'email.opened') {
      updated = await sql`
        UPDATE email_recipients SET
          first_opened_at = LEAST(first_opened_at, ${occurred}::timestamptz),
          last_opened_at  = GREATEST(last_opened_at, ${occurred}::timestamptz),
          open_count      = open_count + 1
        WHERE resend_id = ${resendId} RETURNING id, member_id`;
    } else if (type === 'email.clicked') {
      updated = await sql`
        UPDATE email_recipients SET
          first_clicked_at = LEAST(first_clicked_at, ${occurred}::timestamptz),
          click_count      = click_count + 1
        WHERE resend_id = ${resendId} RETURNING id, member_id`;
    } else if (type === 'email.bounced') {
      const reason = String(d.bounce?.message || d.bounce?.subType || d.bounce?.type || '').slice(0, 500);
      updated = await sql`
        UPDATE email_recipients SET bounced_at = ${occurred}::timestamptz, bounce_reason = ${reason}
        WHERE resend_id = ${resendId} RETURNING id, member_id`;
    } else if (type === 'email.complained') {
      updated = await sql`
        UPDATE email_recipients SET complained_at = ${occurred}::timestamptz
        WHERE resend_id = ${resendId} RETURNING id, member_id`;
    }

    if (!updated.length) {
      // The event can beat the recipient rows by a second or two. For fresh events,
      // forget this attempt and ask Resend to retry (first retry is ~5s later).
      // Older unmatched events are emails we don't track (receipts, forwards, replies).
      if (Date.now() - new Date(occurred).getTime() < 2 * 60 * 1000) {
        await sql`DELETE FROM email_events WHERE id = ${eventRowId}`;
        return NextResponse.json({ retry: true }, { status: 409 });
      }
      return NextResponse.json({ ok: true, unmatched: true });
    }

    // A spam complaint means stop emailing this member — protects the domain's reputation.
    if (type === 'email.complained' && updated[0].member_id) {
      await sql`UPDATE members SET email_unsubscribed = true, unsubscribed_at = NOW() WHERE id = ${updated[0].member_id}`;
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Email event webhook error:', e);
    // Drop the dedupe row so Resend's retry is processed instead of skipped.
    if (eventRowId) { try { await sql`DELETE FROM email_events WHERE id = ${eventRowId}`; } catch {} }
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
