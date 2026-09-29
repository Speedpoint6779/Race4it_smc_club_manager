import { useState, useEffect, useRef, useCallback } from "react";
import { BTN } from "./ui";

const CLUB_EMAIL = "club@seniormensclub.org";

export function extractEmail(str) {
  if (!str) return "";
  const m = String(str).match(/<([^>]+)>/);
  return (m ? m[1] : String(str)).trim();
}

export function displayName(str) {
  if (!str) return "";
  const m = String(str).match(/^\s*"?([^"<]*?)"?\s*</);
  const name = m ? m[1].trim() : "";
  return name || extractEmail(str);
}

export const fmtWhen = ts => ts
  ? new Date(ts).toLocaleString("en-US", { weekday: "short", month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  : "";

const htmlToPlain = html => (html || "")
  .replace(/<br\s*\/?>/gi, "\n").replace(/<\/(p|li|div)>/gi, "\n").replace(/<li[^>]*>/gi, "• ")
  .replace(/<[^>]+>/g, "")
  .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
  .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
  .replace(/\n{3,}/g, "\n\n").trim();

// Everyone on the message except the club address, sender first.
function replyAllList(msg) {
  const seen = new Set();
  const out = [];
  const add = s => {
    const e = extractEmail(s);
    const k = e.toLowerCase();
    if (!e || !e.includes("@") || k === CLUB_EMAIL || seen.has(k)) return;
    seen.add(k);
    out.push(e);
  };
  add(msg.from_address);
  (msg.to_address || "").split(",").forEach(add);
  return out;
}

let quillPromise = null;
function loadQuill() {
  if (typeof window === "undefined" || window.Quill) return Promise.resolve();
  if (quillPromise) return quillPromise;
  quillPromise = new Promise(resolve => {
    if (!document.querySelector('link[href*="quill"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.min.css";
      document.head.appendChild(link);
    }
    if (document.querySelector('script[src*="quill"]')) {
      const t = setInterval(() => { if (window.Quill) { clearInterval(t); resolve(); } }, 50);
      return;
    }
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js";
    script.onload = () => resolve();
    document.head.appendChild(script);
  });
  return quillPromise;
}

function injectReplyStyles() {
  if (typeof document === "undefined" || document.getElementById("smc-reply-styles")) return;
  const style = document.createElement("style");
  style.id = "smc-reply-styles";
  style.textContent = `
    .smc-reply .ql-toolbar { background:var(--bg-input) !important; border:1px solid var(--border) !important; border-bottom:none !important; border-radius:8px 8px 0 0 !important; }
    .smc-reply .ql-container { background:var(--bg-input) !important; border:1px solid var(--border) !important; border-radius:0 0 8px 8px !important; }
    .smc-reply .ql-editor { color:var(--text-primary) !important; font-size:16px !important; line-height:1.6 !important; min-height:220px !important; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif !important; }
    .smc-reply .ql-editor.ql-blank::before { color:var(--text-faint) !important; font-style:normal !important; }
    .smc-reply .ql-stroke { stroke:var(--text-secondary) !important; }
    .smc-reply .ql-fill { fill:var(--text-secondary) !important; }
    .smc-reply .ql-picker { color:var(--text-secondary) !important; }
    .smc-reply .ql-picker-options { background:var(--bg-card) !important; border:1px solid var(--border) !important; }
    .smc-reply .ql-active .ql-stroke, .smc-reply button:hover .ql-stroke { stroke:var(--accent-text) !important; }
    .smc-reply .ql-active .ql-fill, .smc-reply button:hover .ql-fill { fill:var(--accent-text) !important; }
    .smc-reply .ql-snow .ql-tooltip { background:var(--bg-card) !important; border:1px solid var(--border) !important; color:var(--text-primary) !important; z-index:5; }
    .smc-reply .ql-snow .ql-tooltip input { background:var(--bg-input) !important; border:1px solid var(--border) !important; color:var(--text-primary) !important; }
  `;
  document.head.appendChild(style);
}

function ReplyEditor({ onChange }) {
  const ref = useRef(null);
  const qRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    injectReplyStyles();
    loadQuill().then(() => {
      if (cancelled || !ref.current || qRef.current || !window.Quill) return;
      const q = new window.Quill(ref.current, {
        theme: "snow",
        placeholder: "Type your reply here…",
        modules: {
          toolbar: [
            ["bold", "italic", "underline"],
            [{ list: "ordered" }, { list: "bullet" }],
            ["link"],
            ["clean"],
          ],
        },
      });
      qRef.current = q;
      q.on("text-change", () => {
        const text = q.getText().trim();
        onChange(text ? q.root.innerHTML : "", text);
      });
      q.focus();
    });
    return () => { cancelled = true; qRef.current = null; };
  }, []); // eslint-disable-line
  return <div className="smc-reply"><div ref={ref} /></div>;
}

const overlayStyle = {
  position: "fixed", inset: 0, background: "rgba(0,0,0,0.55)", zIndex: 1000,
  display: "flex", alignItems: "flex-start", justifyContent: "center",
  padding: "40px 16px", overflowY: "auto",
};
const cardStyle = {
  width: "100%", maxWidth: "820px", background: "var(--bg-card)", border: "1px solid var(--border)",
  borderRadius: "14px", boxShadow: "0 20px 60px rgba(0,0,0,0.35)", overflow: "hidden",
};
const section = { padding: "16px 24px" };
const metaLabel = { color: "var(--text-muted)", fontSize: "14px", display: "inline-block", minWidth: "76px" };
const fieldLabel = { color: "var(--text-secondary)", fontSize: "14px", fontWeight: "600", marginBottom: "6px" };
const secondaryBtn = { ...BTN("var(--bg-card)"), color: "var(--text-secondary)", border: "1px solid var(--border)", fontSize: "15px", padding: "10px 18px" };
const memberPill = { marginLeft: "8px", padding: "2px 8px", borderRadius: "99px", fontSize: "12px", fontWeight: "600", background: "var(--nav-active-bg)", color: "var(--accent-text)", verticalAlign: "middle" };

// Opens an inbox message in a focused dialog. Reply happens here, not inline in the list.
export function InboxMessageModal({ msg, body, members, onClose, onChanged, onTrash, flash }) {
  const [mode, setMode] = useState("read");
  const [recips, setRecips] = useState([]);
  const [subject, setSubject] = useState("");
  const [html, setHtml] = useState("");
  const [plain, setPlain] = useState("");
  const [sending, setSending] = useState(false);
  const [err, setErr] = useState("");
  const [replies, setReplies] = useState([]);
  const [busy, setBusy] = useState(false);

  const senderEmail = extractEmail(msg.from_address);
  const senderName = displayName(msg.from_address);
  const memberFor = useCallback(email => (members || []).find(m => m.email && m.email.toLowerCase() === String(email).toLowerCase()), [members]);
  const senderMember = memberFor(senderEmail);
  const allAddrs = replyAllList(msg);
  const nameFor = email => {
    const m = memberFor(email);
    if (m) return `${m.first_name} ${m.last_name}`;
    if (email.toLowerCase() === senderEmail.toLowerCase()) return senderName;
    return email;
  };

  const loadReplies = useCallback(() => {
    fetch(`/api/email/reply?inbox_id=${msg.id}`)
      .then(r => r.json())
      .then(d => setReplies(Array.isArray(d) ? d : []))
      .catch(() => {});
  }, [msg.id]);
  useEffect(() => { loadReplies(); }, [loadReplies]);

  const dirty = mode === "reply" && plain.length > 0;
  const requestClose = useCallback(() => {
    if (dirty && !window.confirm("Discard this reply?")) return;
    onClose();
  }, [dirty, onClose]);

  useEffect(() => {
    const onKey = e => { if (e.key === "Escape") requestClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [requestClose]);

  const startReply = all => {
    const list = all ? allAddrs : [senderEmail];
    setRecips(list.map(email => ({ email, on: true })));
    setSubject(/^re:/i.test(msg.subject || "") ? msg.subject : `Re: ${msg.subject || ""}`.trim());
    setHtml(""); setPlain(""); setErr("");
    setMode("reply");
  };

  const backToMessage = () => {
    if (plain && !window.confirm("Discard this reply?")) return;
    setMode("read"); setErr("");
  };

  const chosen = recips.filter(r => r.on).map(r => r.email);
  const canSend = !sending && chosen.length > 0 && plain.length > 0 && subject.trim().length > 0;

  const send = async () => {
    if (!canSend) return;
    setSending(true); setErr("");
    try {
      const res = await fetch("/api/email/reply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inboxId: msg.id, to: chosen, subject: subject.trim(), htmlBody: html, body: plain }),
      });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) throw new Error(d.error || "Send failed");
      const who = chosen.length === 1 ? nameFor(chosen[0]) : `${chosen.length} people`;
      if (flash) flash(`Reply sent to ${who}`);
      onChanged({ id: msg.id, replied_at: d.repliedAt || new Date().toISOString(), is_read: true }, { sent: true });
      onClose();
    } catch (e) {
      setErr(e.message);
      setSending(false);
    }
  };

  const toggleReplied = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const next = !msg.replied_at;
      const res = await fetch(`/api/email/inbound?id=${msg.id}&replied=${next}`, { method: "PATCH" });
      const d = await res.json().catch(() => ({}));
      if (!res.ok || d.error) throw new Error(d.error || "Update failed");
      onChanged({ id: msg.id, replied_at: next ? (d.replied_at || new Date().toISOString()) : null, is_read: true });
    } catch (e) {
      if (flash) flash(e.message);
    } finally {
      setBusy(false);
    }
  };

  const header = (title) => (
    <div style={{ ...section, display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", borderBottom: "1px solid var(--border)", background: "var(--bg-hover)" }}>
      <div style={{ color: "var(--text-heading)", fontSize: "20px", fontWeight: "700", lineHeight: 1.3 }}>{title}</div>
      <div onClick={requestClose} role="button" aria-label="Close" title="Close" style={{ color: "var(--text-muted)", cursor: "pointer", fontSize: "22px", lineHeight: 1, padding: "2px 6px" }}>✕</div>
    </div>
  );

  const originalBody = body
    ? <div style={{ color: "var(--text-primary)", fontSize: "16px", lineHeight: "1.7", whiteSpace: "pre-wrap" }}>{body}</div>
    : <div style={{ color: "var(--text-faint)", fontSize: "15px", fontStyle: "italic" }}>No message body</div>;

  return (
    <div style={overlayStyle} onMouseDown={e => { if (e.target === e.currentTarget) requestClose(); }}>
      <div style={cardStyle} role="dialog" aria-modal="true">
        {mode === "read" ? (
          <>
            {header(msg.subject || "(no subject)")}

            <div style={{ ...section, borderBottom: "1px solid var(--border-light)" }}>
              <div style={{ fontSize: "15px", color: "var(--text-primary)", marginBottom: "4px" }}>
                <span style={metaLabel}>From</span>
                <strong>{senderName}</strong>
                {senderName !== senderEmail && <span style={{ color: "var(--text-muted)" }}> &lt;{senderEmail}&gt;</span>}
                {senderMember && <span style={memberPill}>Member</span>}
              </div>
              {msg.to_address && (
                <div style={{ fontSize: "14px", color: "var(--text-secondary)", marginBottom: "4px" }}>
                  <span style={metaLabel}>To</span>{msg.to_address}
                </div>
              )}
              <div style={{ fontSize: "14px", color: "var(--text-secondary)" }}>
                <span style={metaLabel}>Received</span>{fmtWhen(msg.received_at)}
              </div>
            </div>

            <div style={{
              ...section, paddingTop: "12px", paddingBottom: "12px", fontSize: "15px", fontWeight: "600",
              borderBottom: "1px solid var(--border-light)",
              background: msg.replied_at ? "var(--badge-paid-bg)" : "var(--bg-hover)",
              color: msg.replied_at ? "var(--badge-paid-text)" : "var(--text-secondary)",
            }}>
              {msg.replied_at ? `✓ Replied ${fmtWhen(msg.replied_at)}` : "Not replied yet"}
            </div>

            <div style={{ ...section, paddingTop: "20px", paddingBottom: "24px" }}>{originalBody}</div>

            {replies.length > 0 && (
              <div style={{ ...section, borderTop: "1px solid var(--border)" }}>
                <div style={{ ...fieldLabel, marginBottom: "10px" }}>What you sent</div>
                {replies.map(r => (
                  <div key={r.id} style={{ border: "1px solid var(--border)", borderRadius: "8px", padding: "12px 14px", marginBottom: "10px" }}>
                    <div style={{ color: "var(--text-muted)", fontSize: "13px", marginBottom: "6px" }}>{fmtWhen(r.sent_at)} · to {r.to_addresses}</div>
                    <div style={{ color: "var(--text-primary)", fontSize: "15px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>{htmlToPlain(r.body_html)}</div>
                  </div>
                ))}
              </div>
            )}

            <div style={{ ...section, borderTop: "1px solid var(--border)", display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
              <div onClick={() => startReply(false)} style={{ ...BTN("var(--accent-gradient)"), fontSize: "16px", padding: "10px 24px" }}>↩ Reply</div>
              {allAddrs.length > 1 && <div onClick={() => startReply(true)} style={secondaryBtn}>↩↩ Reply All</div>}
              <div onClick={toggleReplied} style={{ ...secondaryBtn, opacity: busy ? 0.6 : 1 }}
                title={msg.replied_at ? "Put this back on the needs-reply list" : "Use this if you answered some other way, like by phone or from your own email"}>
                {msg.replied_at ? "Mark as not replied" : "Mark as replied"}
              </div>
              <div style={{ flex: 1 }} />
              <div onClick={() => { onTrash(msg.id); onClose(); }} style={{ color: "var(--badge-overdue-text)", cursor: "pointer", fontSize: "15px", padding: "10px 8px" }}>Move to Trash</div>
            </div>
          </>
        ) : (
          <>
            {header(recips.length > 1 ? "Reply to everyone" : `Reply to ${nameFor(senderEmail)}`)}

            <div style={section}>
              <div style={fieldLabel}>To</div>
              {recips.length === 1 ? (
                <div style={{ fontSize: "15px", color: "var(--text-primary)" }}>
                  {nameFor(recips[0].email)}
                  {nameFor(recips[0].email) !== recips[0].email && <span style={{ color: "var(--text-muted)" }}> &lt;{recips[0].email}&gt;</span>}
                </div>
              ) : recips.map((r, i) => (
                <label key={r.email} style={{ display: "flex", alignItems: "center", gap: "10px", fontSize: "15px", padding: "4px 0", cursor: "pointer", color: "var(--text-primary)" }}>
                  <input type="checkbox" checked={r.on} style={{ width: "18px", height: "18px" }}
                    onChange={() => setRecips(prev => prev.map((x, j) => j === i ? { ...x, on: !x.on } : x))} />
                  {nameFor(r.email)}
                  {nameFor(r.email) !== r.email && <span style={{ color: "var(--text-muted)" }}>&lt;{r.email}&gt;</span>}
                </label>
              ))}

              <div style={{ ...fieldLabel, marginTop: "16px" }}>Subject</div>
              <input value={subject} onChange={e => setSubject(e.target.value)}
                style={{ width: "100%", boxSizing: "border-box", padding: "10px 12px", fontSize: "15px", background: "var(--bg-input)", color: "var(--text-primary)", border: "1px solid var(--border)", borderRadius: "8px" }} />

              <div style={{ ...fieldLabel, marginTop: "16px" }}>Your reply</div>
              <ReplyEditor onChange={(h, t) => { setHtml(h); setPlain(t); }} />
              <div style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "8px" }}>
                Sent from club@seniormensclub.org. Their original message is included below your reply.
              </div>
            </div>

            <div style={{ ...section, borderTop: "1px solid var(--border-light)" }}>
              <div style={{ ...fieldLabel, color: "var(--text-muted)" }}>{senderName} wrote, {fmtWhen(msg.received_at)}:</div>
              <div style={{ maxHeight: "200px", overflowY: "auto", padding: "10px 14px", borderLeft: "3px solid var(--border)", background: "var(--bg-hover)", borderRadius: "4px", color: "var(--text-secondary)", fontSize: "15px", lineHeight: "1.6", whiteSpace: "pre-wrap" }}>
                {body || "(no message body)"}
              </div>
            </div>

            {err && (
              <div style={{ margin: "0 24px 8px", padding: "10px 14px", borderRadius: "8px", background: "var(--badge-overdue-bg)", color: "var(--badge-overdue-text)", fontSize: "14px" }}>
                Couldn't send: {err}
              </div>
            )}

            <div style={{ ...section, borderTop: "1px solid var(--border)", display: "flex", gap: "10px", alignItems: "center", flexWrap: "wrap" }}>
              <div onClick={send} style={{ ...BTN("var(--accent-gradient)"), fontSize: "16px", padding: "10px 24px", opacity: canSend ? 1 : 0.5, pointerEvents: canSend ? "auto" : "none" }}>
                {sending ? "Sending…" : "Send Reply"}
              </div>
              <div onClick={backToMessage} style={secondaryBtn}>Back to message</div>
              {chosen.length === 0 && recips.length > 1 && <span style={{ color: "var(--text-muted)", fontSize: "14px" }}>Pick at least one person.</span>}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
