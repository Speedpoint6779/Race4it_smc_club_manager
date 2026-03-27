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

// Extract a header value from raw MIME text
function extractMimeHeader(raw, headerName) {
  const regex = new RegExp(`^${headerName}:\\s*(.+)`, 'im');
  const match = raw.match(regex);
  return match ? match[1].trim() : '';
}

// Extract plain-text body from a raw MIME message (very basic parser)
function extractMimeBody(raw) {
  // Find the blank line separating headers from body
  const headerBodySplit = raw.indexOf('\r\n\r\n');
  const split = headerBodySplit !== -1 ? headerBodySplit + 4 : raw.indexOf('\n\n');
  if (split === -1) return raw;
  const body = raw.slice(split !== -1 ? split : headerBodySplit + 4);

  // If multipart, try to pull out the text/plain part
  const boundaryMatch = raw.match(/boundary="?([^"\r\n;]+)"?/i);
  if (boundaryMatch) {
    const boundary = boundaryMatch[1];
    const parts = body.split('--' + boundary);
    for (const part of parts) {
      if (/content-type:\s*text\/plain/i.test(part)) {
        const partSplit = part.indexOf('\r\n\r\n') !== -1 ? part.indexOf('\r\n\r\n') + 4 : part.indexOf('\n\n') + 2;
        return part.slice(partSplit).replace(/--$/, '').trim();
      }
    }
  }
  return body.trim();
}

// POST /api/email/inbound — Resend inbound webhook
// Configure in Resend dashboard: Domains → your domain → Inbound webhook URL
// Set to: https://manager.seniormensclub.org/api/email/inbound
export async function POST(req) {
  try {
    const payload = await req.json();

    let from, to, subject, bodyText, bodyHtml, messageId;

    // Resend wraps inbound mail in an "email" object in some versions
    const data = payload.data || payload;

    // Check if Resend sent the raw RFC 2822 email as a string field
    const rawEmail = data.raw || data.message || '';

    if (rawEmail && typeof rawEmail === 'string' && rawEmail.includes('Content-Type:')) {
      // Parse raw MIME ourselves
      from      = extractMimeHeader(rawEmail, 'From');
      to        = extractMimeHeader(rawEmail, 'To');
      subject   = extractMimeHeader(rawEmail, 'Subject');
      messageId = extractMimeHeader(rawEmail, 'Message-ID').replace(/[<>]/g, '');
      bodyText  = extractMimeBody(rawEmail);
      bodyHtml  = '';
    } else {
      // Resend parsed fields
      from      = data.from       || data.sender || payload.from || payload.sender || '';
      to        = Array.isArray(data.to) ? data.to.join(', ') : (data.to || payload.to || '');
      subject   = data.subject    || payload.subject   || '(no subject)';
      bodyText  = data.text       || data.plain        || payload.text  || payload.plain  || '';
      bodyHtml  = data.html       || payload.html       || '';
      messageId = data.message_id || data.headers?.['message-id'] ||
                  payload.message_id || payload.headers?.['message-id'] || '';
    }

    const sql = getDb();
    await ensureTables(sql);

    // Deduplicate by message_id if present
    if (messageId) {
      const existing = await sql`
        SELECT id FROM inbox_messages WHERE message_id = ${messageId} LIMIT 1
      `;
      if (existing.length > 0) {
        return NextResponse.json({ ok: true, duplicate: true });
      }
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
