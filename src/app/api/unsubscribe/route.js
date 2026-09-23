import { getDb, ensureTables } from '../db';
import { verifyUnsubscribeToken } from '../unsubscribe-token';

// Public endpoint (linked from every club email).
// GET  -> confirmation page with a button (so link scanners can't unsubscribe anyone)
// POST -> unsubscribes. Handles both our button and RFC 8058 one-click posts from Gmail/Yahoo/Apple.
export const dynamic = 'force-dynamic';

const esc = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

function page(title, inner) {
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="robots" content="noindex">
<title>${esc(title)}</title>
<style>
  body { margin:0; background:#f9fafb; font-family:Arial,Helvetica,sans-serif; color:#111827; }
  .card { max-width:520px; margin:48px auto; background:#fff; padding:32px 28px; border-radius:10px; border:1px solid #e5e7eb; }
  h1 { font-size:24px; margin:0 0 16px; }
  p { font-size:18px; line-height:1.6; margin:0 0 16px; }
  button { font-size:18px; padding:14px 24px; border-radius:8px; border:0; background:#1e3a5f; color:#fff; cursor:pointer; }
  a { color:#1a56db; }
</style>
</head>
<body><div class="card">${inner}</div></body>
</html>`;
  return new Response(html, { status: 200, headers: { 'Content-Type': 'text/html; charset=utf-8' } });
}

const invalid = () => page('Link not valid', `<h1>This link isn't valid</h1><p>If you'd like to stop receiving Senior Men's Club emails, just reply to any club email and let us know.</p>`);

export async function GET(req) {
  try {
    const t = new URL(req.url).searchParams.get('t');
    const id = verifyUnsubscribeToken(t);
    if (!id) return invalid();
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`SELECT first_name, email_unsubscribed FROM members WHERE id = ${id}`;
    if (!rows.length) return invalid();
    const m = rows[0];
    if (m.email_unsubscribed) {
      return page('Already unsubscribed', `<h1>You're already unsubscribed</h1><p>You won't receive Senior Men's Club emails. If that was a mistake, reply to any club email and we'll add you back.</p>`);
    }
    return page('Unsubscribe', `
      <h1>Unsubscribe from club emails?</h1>
      <p>Hi ${esc(m.first_name)}, click below and we'll stop sending you Senior Men's Club emails.</p>
      <form method="POST" action="/api/unsubscribe?t=${encodeURIComponent(t)}">
        <button type="submit">Unsubscribe me</button>
      </form>`);
  } catch (e) {
    return page('Something went wrong', `<h1>Something went wrong</h1><p>Please reply to any club email and we'll take care of it.</p>`);
  }
}

export async function POST(req) {
  try {
    const id = verifyUnsubscribeToken(new URL(req.url).searchParams.get('t'));
    if (!id) return invalid();
    const sql = getDb();
    await ensureTables(sql);
    await sql`UPDATE members SET email_unsubscribed = true, unsubscribed_at = NOW(), updated_at = NOW() WHERE id = ${id}`;
    return page('Unsubscribed', `<h1>You're unsubscribed</h1><p>You won't receive Senior Men's Club emails anymore. If that was a mistake, reply to any club email and we'll add you back.</p>`);
  } catch (e) {
    return page('Something went wrong', `<h1>Something went wrong</h1><p>Please reply to any club email and we'll take care of it.</p>`);
  }
}
