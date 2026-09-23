import crypto from 'crypto';

// Signed, non-guessable unsubscribe tokens: "<memberId>.<hmac>".
// Set UNSUBSCRIBE_SECRET in Vercel so links survive an API key rotation.
function secret() {
  const s = process.env.UNSUBSCRIBE_SECRET || process.env.RESEND_API_KEY || process.env.DATABASE_URL;
  if (!s) throw new Error('No secret available for unsubscribe tokens');
  return s;
}

function sign(id) {
  return crypto.createHmac('sha256', secret()).update(`unsub:${id}`).digest('base64url').slice(0, 32);
}

export function makeUnsubscribeToken(memberId) {
  const id = String(memberId);
  return `${id}.${sign(id)}`;
}

export function verifyUnsubscribeToken(token) {
  if (!token || typeof token !== 'string') return null;
  const [id, sig] = token.split('.');
  if (!/^\d+$/.test(id || '') || !sig) return null;
  const a = Buffer.from(sig);
  const b = Buffer.from(sign(id));
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return parseInt(id, 10);
}

export function unsubscribeUrl(memberId) {
  const base = (process.env.APP_URL || 'https://manager.seniormensclub.org').replace(/\/$/, '');
  return `${base}/api/unsubscribe?t=${encodeURIComponent(makeUnsubscribeToken(memberId))}`;
}
