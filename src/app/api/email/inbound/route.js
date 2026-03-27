import { NextResponse } from 'next/server';
import { getDb, ensureTables } from '../../db';

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

// Decode quoted-printable: join soft line breaks, then decode =XX hex bytes
function decodeQP(str) {
  return str
    .replace(/=\r?\n/g, '')                                        // soft line break
    .replace(/=([0-9A-Fa-f]{2})/g, (_, h) =>
      String.fromCharCode(parseInt(h, 16))
    );
}

// Decode RFC 2047 encoded-word in headers: =?UTF-8?Q?...?= or =?UTF-8?B?...?=
function decodeHeader(str) {
  if (!str) return str;
  return str.replace(/=\?([^?]+)\?([BQbq])\?([^?]*)\?=/g, (_, _cs, enc, text) => {
    try {
      if (enc.toUpperCase() === 'Q') {
        return decodeQP(text.replace(/_/g, ' '));
      }
      return Buffer.from(text, 'base64').toString('utf-8');
    } catch { return text; }
  });
}

// Get a single header value from raw MIME, unfolding continuation lines
function getHeader(raw, name) {
  const re = new RegExp('^' + name + ':[ \\t]*([\\s\\S]*?)(?=\\r?\\n[^ \\t]|\\r?\\n\\r?\\n|$)', 'im');
  const m = raw.match(re);
  if (!m) return '';
  return decodeHeader(m[1].replace(/\r?\n[ \t]+/g, ' ').trim());
}

// Split raw MIME at first blank line into { headers, body }
function splitPart(text) {
  const i = text.search(/\r?\n\r?\n/);
  if (i === -1) return { headers: text, body: '' };
  return { headers: text.slice(0, i), body: text.slice(i + (text[i + 1] === '\r' ? 4 : 2)) };
}

// Extract clean plain text from a raw MIME message
function extractBody(raw) {
  const { headers, body } = splitPart(raw);

  const cte = (headers.match(/content-transfer-encoding:\s*(\S+)/i) || [])[1] || '7bit';

  // Multipart — find the text/plain part recursively
  const bm = headers.match(/boundary="?([^"\r\n;]+)"?/i);
  if (bm) {
    const boundary = bm[1].trim();
    const escaped = boundary.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const parts = body.split(new RegExp('--' + escaped + '(?:--)?(?:\r?\n|$)'));

    // Prefer text/plain
    for (const part of parts) {
      if (!part.trim()) continue;
      const { headers: ph } = splitPart(part);
      if (/content-type:\s*text\/plain/i.test(ph)) {
        return extractBody(part); // recurse to handle its own CTE
      }
    }
    // Fallback: text/html — strip tags
    for (const part of parts) {
      if (!part.trim()) continue;
      const { headers: ph } = splitPart(part);
      if (/content-type:\s*text\/html/i.test(ph)) {
        const decoded = extractBody(part);
        return decoded
          .replace(/<style[\s\S]*?<\/style>/gi, '')
          .replace(/<[^>]+>/g, '')
          .replace(/&nbsp;/g, ' ')
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#39;/g, "'")
          .replace(/\r?\n{3,}/g, '\n\n')
          .trim();
      }
    }
    return '';
  }

  // Single part — decode based on CTE
  let decoded = body;
  if (cte.toLowerCase() === 'quoted-printable') {
    decoded = decodeQP(body);
  } else if (cte.toLowerCase() === 'base64') {
    decoded = Buffer.from(body.replace(/\s/g, ''), 'base64').toString('utf-8');
  }

  return decoded.replace(/\r\n/g, '\n').replace(/\r/g, '\n').trim();
}

// POST /api/email/inbound — Resend inbound webhook
export async function POST(req) {
  try {
    const payload = await req.json();

    let from, to, subject, bodyText, bodyHtml, messageId;

    const data = payload.data || payload;
    const rawEmail = data.raw || data.message || '';

    if (rawEmail && typeof rawEmail === 'string' && /content-type:/i.test(rawEmail)) {
      // Raw RFC 2822 — parse it ourselves
      from      = getHeader(rawEmail, 'From');
      to        = getHeader(rawEmail, 'To');
      subject   = getHeader(rawEmail, 'Subject');
      messageId = getHeader(rawEmail, 'Message-ID').replace(/[<>]/g, '');
      bodyText  = extractBody(rawEmail);
      bodyHtml  = '';
    } else {
      // Resend pre-parsed fields
      from      = data.from      || data.sender  || payload.from   || payload.sender || '';
      to        = Array.isArray(data.to) ? data.to.join(', ') : (data.to || payload.to || '');
      subject   = data.subject   || payload.subject  || '(no subject)';
      bodyText  = data.text      || data.plain   || payload.text   || payload.plain  || '';
      bodyHtml  = data.html      || payload.html || '';
      messageId = data.message_id || data.headers?.['message-id'] ||
                  payload.message_id || payload.headers?.['message-id'] || '';
    }

    const sql = getDb();
    await ensureTables(sql);

    if (messageId) {
      const existing = await sql`
        SELECT id FROM inbox_messages WHERE message_id = ${messageId} LIMIT 1
      `;
      if (existing.length > 0) return NextResponse.json({ ok: true, duplicate: true });
    }

    await sql`
      INSERT INTO inbox_messages (from_address, to_address, subject, body_text, body_html, message_id)
      VALUES (${from}, ${to}, ${subject}, ${bodyText}, ${bodyHtml}, ${messageId})
    `;

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('Inbound email error:', e);
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
