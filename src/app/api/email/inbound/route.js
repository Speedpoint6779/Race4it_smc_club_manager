import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getDb, ensureTables } from '../../db';

const FORWARD_TO = 'george@nctaylors.com';
const FROM       = process.env.EMAIL_FROM || 'SMC Club Manager <club@seniormensclub.org>';

// GET /api/email/inbound — fetch received messages for Inbox tab
export async function GET() {
  try {
    const sql = getDb();
    await ensureTables(sql);
    const rows = await sql`
      SELECT id, from_address, to_address, subject, body_text, is_read, received_at
      FROM inbox_messages
      ORDER BY received_at DESC
      LIMIT 100
    `;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/email/inbound?id=123 — delete an inbox message
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const sql = getDb();
    await ensureTables(sql);
    await sql`DELETE FROM inbox_messages WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// Decode quoted-printable: join soft line breaks, then decode =XX hex bytes
function decodeQP(str) {
  return str
    .replace(/=\r?\n/g, '')
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

// Decode RFC 2047 encoded-word in headers
function decodeHeader(str) {
  if (!str) return str;
  return str.replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g, (_, _cs, enc, text) => {
    try {
      if (enc.toUpperCase() === 'Q') return decodeQP(text.replace(/_/g, ' '));
      return Buffer.from(text, 'base64').toString('utf-8');
    } catch { return text; }
  });
}

function getHeader(raw, name) {
  const re = new RegExp('^' + name + ':[ \\t]*([\\s\\S]*?)(?=\\r?\\n[^ \\t]|\\r?\\n\\r?\\n|$)', 'im');
  const m = raw.match(re);
  if (!m) return '';
  return decodeHeader(m[1].replace(/\r?\n[ \t]+/g, ' ').trim());
}

function splitPart(text) {
  const i = text.search(/\r?\n\r?\n/);
  if (i === -1) return { headers: text, body: '' };
  return { headers: text.slice(0, i), body: text.slice(i + (text[i + 1] === '\r' ? 4 : 2)) };
}

function extractBody(raw) {
  const { headers, body } = splitPart(raw);
  const cte = (headers.match(/content-transfer-encoding:\s*(\S+)/i) || [])[1] || '7bit';
  const bm = headers.match(/boundary="?([^"\r\n;]+)"?/i);
  if (bm) {
    const boundary = bm[1].trim();
    const escaped = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = body.split(new RegExp('--' + escaped + '(?:--)?(?:\r?\n|$)'));
    for (const part of parts) {
      if (!part.trim()) continue;
      const { headers: ph } = splitPart(part);
      if (/content-type:\s*text\/plain/i.test(ph)) return extractBody(part);
    }
    for (const part of parts) {
      if (!part.trim()) continue;
      const { headers: ph } = splitPart(part);
      if (/content-type:\s*text\/html/i.test(ph)) {
        const decoded = extractBody(part);
        return decoded
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<').replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
          .replace(/\r?\n{3,}/g, '\n\n').trim();
      }
    }
    return '';
  }
  let decoded = body;
  if (cte.toLowerCase() === 'quoted-printable') decoded = decodeQP(body);
  else if (cte.toLowerCase() === 'base64') decoded = Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf-8');
  return decoded.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

// Strip any remaining MIME header lines from the top of a text block
// and collapse excessive blank lines — mirrors the client-side cleaner
function cleanText(text) {
  if (!text) return '';
  const MIME_LINE = /^(content-type|content-transfer-encoding|mime-version|charset|boundary)\s*[:=]/i;
  const lines = text.split('\n');
  let start = 0;
  while (start < lines.length && (lines[start].trim() === '' || MIME_LINE.test(lines[start].trim()))) {
    start++;
  }
  return lines.slice(start).join('\n').replace(/\n{3,}/g, '\n\n').trim();
}

// POST /api/email/inbound — Resend inbound webhook
export async function POST(req) {
  try {
    const payload = await req.json();
    let from, to, subject, bodyText, bodyHtml, messageId;
    const data = payload.data || payload;
    const rawEmail = data.raw || data.message || '';

    if (rawEmail && typeof rawEmail === 'string' && /content-type:/i.test(rawEmail)) {
      from      = getHeader(rawEmail, 'From');
      to        = getHeader(rawEmail, 'To');
      subject   = getHeader(rawEmail, 'Subject');
      messageId = getHeader(rawEmail, 'Message-ID').replace(/[<>]/g, '');
      bodyText  = extractBody(rawEmail);
      bodyHtml  = '';
    } else {
      from      = data.from      || data.sender  || payload.from   || payload.sender || '';
      to        = Array.isArray(data.to) ? data.to.join(', ') : (data.to || payload.to || '');
      subject   = data.subject   || payload.subject  || '(no subject)';
      bodyText  = data.text      || data.plain   || payload.text   || payload.plain  || '';
      bodyHtml  = data.html      || payload.html || '';
      messageId = data.message_id || data.headers?.['message-id'] ||
                  payload.message_id || payload.headers?.['message-id'] || '';
    }

    // Always store clean plain text in the DB
    const cleanBodyText = cleanText(bodyText);

    const sql = getDb();
    await ensureTables(sql);

    if (messageId) {
      const existing = await sql`SELECT id FROM inbox_messages WHERE message_id = ${messageId} LIMIT 1`;
      if (existing.length > 0) return NextResponse.json({ ok: true, duplicate: true });
    }

    await sql`
      INSERT INTO inbox_messages (from_address, to_address, subject, body_text, body_html, message_id)
      VALUES (${from}, ${to}, ${subject}, ${cleanBodyText}, ${bodyHtml}, ${messageId})
    `;

    // Forward a clean copy to george@nctaylors.com
    if (process.env.RESEND_API_KEY) {
      try {
        const resend = new Resend(process.env.RESEND_API_KEY);
        const fwdBody = cleanBodyText || '(no message body)';
        const safeHtml = fwdBody
          .replace(/&/g, '&amp;').replace(/</g, '&lt;')
          .replace(/>/g, '&gt;').replace(/\n/g, '<br/>');

        await resend.emails.send({
          from: FROM,
          to: [FORWARD_TO],
          subject: `Fwd: ${subject}`,
          text: `-------- Forwarded Message --------\nFrom: ${from}\nTo: ${to}\nSubject: ${subject}\n\n${fwdBody}`,
          html: `<div style="font-family:Arial,sans-serif;max-width:600px;margin:0 auto;padding:24px;color:#333;">
            <p style="color:#64748b;font-size:13px;border-bottom:1px solid #e5e7eb;padding-bottom:12px;margin-bottom:16px;">
              <strong>Forwarded from SMC Club Manager inbox</strong>
            </p>
            <table style="font-size:13px;color:#475569;margin-bottom:16px;border-collapse:collapse;">
              <tr><td style="padding:2px 12px 2px 0;color:#94a3b8;">From:</td><td>${from}</td></tr>
              <tr><td style="padding:2px 12px 2px 0;color:#94a3b8;">To:</td><td>${to}</td></tr>
              <tr><td style="padding:2px 12px 2px 0;color:#94a3b8;">Subject:</td><td>${subject}</td></tr>
            </table>
            <div style="line-height:1.6;font-size:15px;border-top:1px solid #e5e7eb;padding-top:16px;">
              ${safeHtml}
            </div>
          </div>`,
        });
      } catch (fwdErr) {
        console.error('Forward error:', fwdErr);
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Inbound email error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
