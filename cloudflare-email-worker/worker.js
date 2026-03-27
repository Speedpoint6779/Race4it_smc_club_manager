/**
 * Cloudflare Email Worker — SMC Club Manager Inbound Email
 *
 * SETUP INSTRUCTIONS:
 * 1. Go to Cloudflare Dashboard → your seniormensclub.org zone
 * 2. Click "Email" in the left sidebar → "Email Workers"
 * 3. Create a new Worker, paste this entire file
 * 4. Save and deploy
 * 5. Go to Email → Email Routing → Routing Rules
 * 6. Add a rule: "club@seniormensclub.org" → Action: "Send to Worker" → select your worker
 * 7. Make sure Email Routing is enabled for seniormensclub.org
 *
 * That's it! Replies from members will show up in the Manager Inbox tab.
 */

const MANAGER_INBOUND_URL = "https://manager.seniormensclub.org/api/email/inbound";

export default {
  async email(message, env, ctx) {
    // Read the raw email stream into text
    const rawEmail = await streamToText(message.raw);

    // Parse key headers and body from the raw email
    const from    = message.from    || "";
    const to      = message.to      || "";
    const subject = getHeader(rawEmail, "Subject") || "(no subject)";
    const msgId   = getHeader(rawEmail, "Message-ID") || "";

    // Extract plain text body (best effort)
    const bodyText = extractPlainText(rawEmail);
    const bodyHtml = extractHtml(rawEmail);

    const payload = {
      from,
      to,
      subject,
      text:       bodyText,
      html:       bodyHtml,
      message_id: msgId,
    };

    // POST to the SMC Manager inbound webhook
    const resp = await fetch(MANAGER_INBOUND_URL, {
      method:  "POST",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify(payload),
    });

    if (!resp.ok) {
      const err = await resp.text();
      throw new Error(`Manager inbound webhook failed: ${resp.status} ${err}`);
    }
  },
};

// ── Helpers ──────────────────────────────────────────────────────────────────

async function streamToText(stream) {
  const reader = stream.getReader();
  const chunks = [];
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    chunks.push(value);
  }
  const combined = new Uint8Array(chunks.reduce((acc, c) => acc + c.length, 0));
  let offset = 0;
  for (const chunk of chunks) {
    combined.set(chunk, offset);
    offset += chunk.length;
  }
  return new TextDecoder().decode(combined);
}

function getHeader(raw, name) {
  const regex = new RegExp(`^${name}:\\s*(.+)`, "im");
  const match = raw.match(regex);
  return match ? match[1].trim() : "";
}

function extractPlainText(raw) {
  // Handle multipart — find the text/plain part
  const plainMatch = raw.match(
    /Content-Type:\s*text\/plain[^\n]*\n(?:Content-[^\n]+\n)*\n([\s\S]*?)(?=\n--|\n\nContent-Type:|$)/i
  );
  if (plainMatch) return plainMatch[1].trim();

  // Fallback: if no multipart, grab everything after the blank header line
  const bodyStart = raw.indexOf("\r\n\r\n") !== -1
    ? raw.indexOf("\r\n\r\n") + 4
    : raw.indexOf("\n\n") + 2;
  return raw.slice(bodyStart).trim();
}

function extractHtml(raw) {
  const htmlMatch = raw.match(
    /Content-Type:\s*text\/html[^\n]*\n(?:Content-[^\n]+\n)*\n([\s\S]*?)(?=\n--|\n\nContent-Type:|$)/i
  );
  return htmlMatch ? htmlMatch[1].trim() : "";
}
