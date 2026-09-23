import { NextResponse } from 'next/server';
import { Resend } from 'resend';
import { getDb, ensureTables } from '../db';
import { unsubscribeUrl } from '../unsubscribe-token';

// Data endpoint: never serve a build-time cached response.
export const dynamic = 'force-dynamic';

const FROM     = process.env.EMAIL_FROM     || 'SMC Club Manager <club@seniormensclub.org>';
const REPLY_TO = process.env.EMAIL_REPLY_TO || 'club@seniormensclub.org';

const BODY_FONT_SIZE   = '18px';
const BODY_LINE_HEIGHT = '1.6';
const PARA_GAP         = '18px';

// GET /api/email?folder=sent|trash — fetch sent email log
export async function GET(req) {
  try {
    const { searchParams } = new URL(req.url);
    const folder = searchParams.get('folder') || 'sent';
    const sql = getDb();
    await ensureTables(sql);
    const rows = folder === 'trash'
      ? await sql`SELECT id, subject, recipient_count, recipient_emails, body_html, sent_at, status, error, deleted FROM email_log WHERE deleted = true ORDER BY sent_at DESC LIMIT 50`
      : await sql`SELECT id, subject, recipient_count, recipient_emails, body_html, sent_at, status, error, deleted FROM email_log WHERE deleted = false ORDER BY sent_at DESC LIMIT 50`;
    return NextResponse.json(rows);
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// DELETE /api/email?id=123 — soft-delete (move to trash)
// DELETE /api/email?id=123&permanent=true — hard delete
export async function DELETE(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id'));
    const permanent = searchParams.get('permanent') === 'true';
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const sql = getDb();
    await ensureTables(sql);
    if (permanent) {
      await sql`DELETE FROM email_log WHERE id = ${id}`;
    } else {
      await sql`UPDATE email_log SET deleted = true WHERE id = ${id}`;
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

// PATCH /api/email?id=123 — restore from trash
export async function PATCH(req) {
  try {
    const { searchParams } = new URL(req.url);
    const id = parseInt(searchParams.get('id'));
    if (!id) return NextResponse.json({ error: 'id is required' }, { status: 400 });
    const sql = getDb();
    await ensureTables(sql);
    await sql`UPDATE email_log SET deleted = false WHERE id = ${id}`;
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}

/**
 * Clean Quill HTML for email sending.
 *
 * Paragraph spacing is normalized so it looks the same whether the text was typed
 * (Quill inserts <p><br></p> for each blank line) or pasted (no blank lines at all):
 *   1. Blank spacer paragraphs are removed.
 *   2. Every <p>, <ul>, <ol> gets an inline bottom margin. Inline styles are used
 *      because Outlook and some webmail clients ignore <style> blocks.
 * Line breaks inside a paragraph (Shift+Enter) are preserved.
 */
function cleanQuillHtml(html) {
  if (!html) return html;

  let cleaned = html.replace(/<p[^>]*>(\s|&nbsp;|<br\s*\/?>)*<\/p>/gi, '');

  cleaned = cleaned
    .replace(/<p(?=[\s>])/gi, `<p style="margin:0 0 ${PARA_GAP} 0;padding:0;"`)
    .replace(/<(ul|ol)(?=[\s>])/gi, `<$1 style="margin:0 0 ${PARA_GAP} 0;padding:0 0 0 28px;"`);

  return cleaned.trim();
}

const escapeHtml = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

/**
 * Merge tags: {first_name} and {last_name} (case-insensitive, spaces allowed inside braces).
 * Falls back to "there" if a member has no first name on file.
 */
function personalize(text, m, { html }) {
  if (!text) return text;
  const first = (m.first_name || '').trim() || 'there';
  const last  = (m.last_name  || '').trim();
  const f = html ? escapeHtml(first) : first;
  const l = html ? escapeHtml(last)  : last;
  return text
    .replace(/\{\s*first_name\s*\}/gi, f)
    .replace(/\{\s*last_name\s*\}/gi, l);
}

// Plain, personal-note wrapper: no banner, large readable text, small footer with unsubscribe.
function buildEmailHtml(innerHtml, unsubUrl) {
  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  body { margin:0; padding:0; background:#ffffff; }
  p { margin:0 0 ${PARA_GAP} 0; padding:0; }
  ul, ol { margin:0 0 ${PARA_GAP} 0; padding:0 0 0 28px; }
  li { margin:0 0 6px 0; }
  strong { font-weight:700; }
  a { color:#1a56db; text-decoration:underline; }
</style>
</head>
<body style="margin:0;padding:0;background:#ffffff;">
<div style="max-width:600px;margin:0 auto;padding:24px 20px;background:#ffffff;">
  <div style="font-family:Arial,Helvetica,sans-serif;font-size:${BODY_FONT_SIZE};line-height:${BODY_LINE_HEIGHT};color:#111827;">
    ${innerHtml}
  </div>
  <div style="margin-top:40px;padding-top:14px;border-top:1px solid #e5e7eb;font-family:Arial,Helvetica,sans-serif;font-size:13px;line-height:1.5;color:#6b7280;">
    Senior Men's Club of Wilmington &bull; <a href="${unsubUrl}" style="color:#6b7280;text-decoration:underline;">Unsubscribe from club emails</a>
  </div>
</div>
</body>
</html>`;
}

// POST /api/email — send email to selected member IDs
export async function POST(req) {
  try {
    const { memberIds, subject, body, htmlBody } = await req.json();
    if (!memberIds?.length || !subject || !body) {
      return NextResponse.json({ error: 'memberIds, subject, and body are required' }, { status: 400 });
    }
    if (!process.env.RESEND_API_KEY) {
      return NextResponse.json({ error: 'RESEND_API_KEY not configured' }, { status: 500 });
    }
    const resend = new Resend(process.env.RESEND_API_KEY);
    const sql = getDb();
    await ensureTables(sql);

    const members = await sql`
      SELECT id, first_name, last_name, email FROM members
      WHERE id = ANY(${memberIds}::int[])
        AND email IS NOT NULL AND email != ''
        AND COALESCE(email_unsubscribed, false) = false
    `;
    const unsubRows = await sql`
      SELECT COUNT(*)::int AS count FROM members
      WHERE id = ANY(${memberIds}::int[]) AND COALESCE(email_unsubscribed, false) = true
    `;
    const skippedUnsubscribed = unsubRows[0]?.count || 0;

    if (!members.length) {
      return NextResponse.json({ error: 'No valid email addresses found for selected members (missing email or unsubscribed)' }, { status: 400 });
    }

    const cleanedBody = cleanQuillHtml(htmlBody);
    const baseInnerHtml = cleanedBody || escapeHtml(body).replace(/\n/g, '<br/>');

    const batch = members.map(m => {
      const unsubUrl = unsubscribeUrl(m.id);
      const inner = personalize(baseInnerHtml, m, { html: true });
      const text  = `${personalize(body, m, { html: false })}\n\n--\nSenior Men's Club of Wilmington\nUnsubscribe: ${unsubUrl}`;
      return {
        from: FROM,
        reply_to: REPLY_TO,
        to: [`${m.first_name} ${m.last_name} <${m.email}>`],
        subject: personalize(subject, m, { html: false }),
        text,
        html: buildEmailHtml(inner, unsubUrl),
        headers: {
          'List-Unsubscribe': `<${unsubUrl}>`,
          'List-Unsubscribe-Post': 'List-Unsubscribe=One-Click',
        },
      };
    });

    const CHUNK = 100;
    let totalSent = 0;
    let firstError = null;
    for (let i = 0; i < batch.length; i += CHUNK) {
      const chunk = batch.slice(i, i + CHUNK);
      const { error } = await resend.batch.send(chunk);
      if (error) { firstError = error; break; }
      totalSent += chunk.length;
    }

    const storedBody = cleanedBody || '';

    if (firstError) {
      await sql`INSERT INTO email_log (subject, recipient_count, recipient_emails, body_html, status, error) VALUES (${subject}, ${members.length}, ${members.map(m => m.email).join(', ')}, ${storedBody}, 'failed', ${`${firstError.message} (sent ${totalSent} of ${members.length} before failing)`})`;
      return NextResponse.json({ error: firstError.message, sent: totalSent }, { status: 500 });
    }
    await sql`INSERT INTO email_log (subject, recipient_count, recipient_emails, body_html, status) VALUES (${subject}, ${members.length}, ${members.map(m => m.email).join(', ')}, ${storedBody}, 'sent')`;
    return NextResponse.json({ success: true, sent: totalSent, skippedUnsubscribed });
  } catch (e) {
    return NextResponse.json({ error: e.message }, { status: 500 });
  }
}
