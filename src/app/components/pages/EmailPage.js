import { Icons } from "../Icons";
import { BTN } from "../ui";
import { EmailModal } from "../EmailModal";
import { useState, useEffect, useCallback, useRef } from "react";

const MIME_HEADER_LINE = /^(content-type|content-transfer-encoding|mime-version|charset|boundary|content-disposition)\s*[:=]/i;
const MIME_JUNK_LINE = /^(charset=|boundary=|content-id:|x-ms-|x-mailer:|return-path:|received:|message-id:|date:|dkim-|arc-|authentication-results:)/i;

function stripMimeLeadingHeaders(text) {
  const lines = text.split('\n');
  let start = 0;
  while (start < lines.length) {
    const line = lines[start].trim();
    if (line === '' || MIME_HEADER_LINE.test(line) || MIME_JUNK_LINE.test(line)) { start++; } else { break; }
  }
  return lines.slice(start).join('\n');
}

function cleanBodyText(raw) {
  if (!raw) return '';
  let text = raw;
  const hasBoundary = /^-{4,}/m.test(text);
  const hasMimeHeaders = /^(Content-Type|Content-Transfer-Encoding):/im.test(text);
  if (hasBoundary || hasMimeHeaders) {
    const parts = text.split(/^-{4,}[^\n]*/m);
    const readable = [];
    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;
      if (/<html[\s\S]*?>|<style[\s\S]*?>|@font-face|\.MsoNormal|WordSection/i.test(trimmed)) continue;
      const stripped = stripMimeLeadingHeaders(trimmed).trim();
      if (!stripped) continue;
      if (/<html[\s\S]*?>|<style[\s\S]*?>/i.test(stripped)) continue;
      if (stripped.replace(/\s/g, '').length < 5) continue;
      readable.push(stripped);
    }
    if (readable.length > 0) text = readable.sort((a, b) => b.length - a.length)[0];
  }
  text = stripMimeLeadingHeaders(text);
  if (/=[0-9A-Fa-f]{2}|=\r?\n/.test(text)) {
    text = text.replace(/=\r?\n/g, '').replace(/=([0-9A-Fa-f]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
  }
  if (/<[a-z][\s\S]*?>/i.test(text)) {
    text = text.replace(/<style[\s\S]*?<\/style>/gi, '').replace(/<[^>]+>/g, '')
      .replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  }
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  text = text.split('\n').filter((line, idx, arr) => {
    const prevHasContent = arr.slice(0, idx).some(l => l.trim() && !MIME_HEADER_LINE.test(l) && !MIME_JUNK_LINE.test(l));
    if (prevHasContent) return true;
    return line.trim() && !MIME_HEADER_LINE.test(line.trim()) && !MIME_JUNK_LINE.test(line.trim());
  }).join('\n');
  text = text.replace(/\n{2,}/g, '\n\n');
  return text.trim();
}

let quillLoaded = false;
function loadQuill() {
  if (quillLoaded || typeof window === "undefined") return Promise.resolve();
  if (window.Quill) { quillLoaded = true; return Promise.resolve(); }
  return new Promise(resolve => {
    if (!document.querySelector('link[href*="quill"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.min.css";
      document.head.appendChild(link);
      const style = document.createElement("style");
      style.textContent = `
        .ql-toolbar { background:#0f172a !important; border:1px solid #334155 !important; border-bottom:none !important; border-radius:8px 8px 0 0 !important; }
        .ql-container { background:#0f172a !important; border:1px solid #334155 !important; border-radius:0 0 8px 8px !important; min-height:120px !important; }
        .ql-editor { color:#f1f5f9 !important; font-size:14px !important; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif !important; min-height:120px !important; }
        .ql-editor.ql-blank::before { color:#475569 !important; font-style:normal !important; }
        .ql-stroke { stroke:#94a3b8 !important; }
        .ql-fill { fill:#94a3b8 !important; }
        .ql-picker { color:#94a3b8 !important; }
        .ql-picker-options { background:#1e293b !important; border:1px solid #334155 !important; }
        .ql-picker-item { color:#94a3b8 !important; }
        .ql-picker-item:hover { color:#f1f5f9 !important; background:#334155 !important; }
        .ql-active .ql-stroke, button:hover .ql-stroke { stroke:#93c5fd !important; }
        .ql-active .ql-fill, button:hover .ql-fill { fill:#93c5fd !important; }
        .ql-active { color:#93c5fd !important; }
        .ql-snow .ql-picker.ql-expanded .ql-picker-label { color:#93c5fd !important; border-color:#334155 !important; }
        .ql-snow .ql-tooltip { background:#1e293b !important; border:1px solid #334155 !important; color:#f1f5f9 !important; }
        .ql-snow .ql-tooltip input { background:#0f172a !important; border:1px solid #334155 !important; color:#f1f5f9 !important; }
      `;
      document.head.appendChild(style);
    }
    if (!document.querySelector('script[src*="quill"]')) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js";
      script.onload = () => { quillLoaded = true; resolve(); };
      document.head.appendChild(script);
    } else {
      const check = setInterval(() => { if (window.Quill) { clearInterval(check); quillLoaded = true; resolve(); } }, 50);
    }
  });
}

function ReplyEditor({ onChange }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    loadQuill().then(() => {
      if (cancelled || !containerRef.current || quillRef.current) return;
      const q = new window.Quill(containerRef.current, {
        theme: "snow",
        placeholder: "Write your reply...",
        modules: {
          toolbar: [
            [{ font: [] }, { size: ["small", false, "large", "huge"] }],
            ["bold", "italic", "underline", "strike"],
            [{ color: [] }, { background: [] }],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ align: [] }],
            ["link"],
            ["clean"],
          ],
        },
      });
      quillRef.current = q;
      q.on("text-change", () => {
        const html = q.root.innerHTML;
        onChange(html === "<p><br></p>" ? "" : html);
      });
    });
    return () => { cancelled = true; if (quillRef.current) { quillRef.current = null; } };
  }, []); // eslint-disable-line
  return <div ref={containerRef} />;
}

// Renders stored Quill HTML safely in the dark UI
function SentBodyPreview({ html }) {
  if (!html) return <div style={{ color: "#475569", fontSize: "13px", fontStyle: "italic" }}>No message body stored.</div>;

  // Convert the Quill HTML to plain text for display in the dark UI
  // (avoids iframe/dangerouslySetInnerHTML security concerns)
  const plainText = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li>/gi, "• ")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<").replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/\n{3,}/g, "\n\n")
    .trim();

  return (
    <div style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: "1.7", whiteSpace: "pre-wrap", fontFamily: "inherit" }}>
      {plainText}
    </div>
  );
}

export function EmailPage({ members, mwd, ac, setPg, setSelMode, setSel, flash }) {
  const [showEM, setShowEM] = useState(false);
  const [emailPre, setEmailPre] = useState([]);
  const [tab, setTab] = useState("inbox");
  const [log, setLog] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [trash, setTrash] = useState([]);
  const [logLoading, setLogLoading] = useState(true);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [trashLoading, setTrashLoading] = useState(false);
  const [openMsg, setOpenMsg] = useState(null);
  const [openSent, setOpenSent] = useState(null);
  const [replyMode, setReplyMode] = useState(null);
  const [replyHtml, setReplyHtml] = useState("");
  const [replySending, setReplySending] = useState(false);
  const [lists, setLists] = useState([]);
  const [showListManager, setShowListManager] = useState(false);

  const loadLog = useCallback(() => {
    setLogLoading(true);
    fetch("/api/email?folder=sent").then(r => r.json()).then(d => { if (Array.isArray(d)) setLog(d); setLogLoading(false); }).catch(() => setLogLoading(false));
  }, []);

  const loadInbox = useCallback(() => {
    setInboxLoading(true);
    fetch("/api/email/inbound?folder=inbox").then(r => r.json()).then(d => { if (Array.isArray(d)) setInbox(d); setInboxLoading(false); }).catch(() => setInboxLoading(false));
  }, []);

  const loadTrash = useCallback(() => {
    setTrashLoading(true);
    Promise.all([
      fetch("/api/email?folder=trash").then(r => r.json()),
      fetch("/api/email/inbound?folder=trash").then(r => r.json()),
    ]).then(([sentTrash, inboxTrash]) => {
      const sent = Array.isArray(sentTrash) ? sentTrash.map(x => ({ ...x, _type: "sent" })) : [];
      const inb = Array.isArray(inboxTrash) ? inboxTrash.map(x => ({ ...x, _type: "inbox" })) : [];
      const merged = [...sent, ...inb].sort((a, b) => new Date(b.sent_at || b.received_at) - new Date(a.sent_at || a.received_at));
      setTrash(merged);
      setTrashLoading(false);
    }).catch(() => setTrashLoading(false));
  }, []);

  const loadLists = useCallback(() => {
    fetch("/api/lists").then(r => r.json()).then(d => { if (Array.isArray(d)) setLists(d); }).catch(() => {});
  }, []);

  useEffect(() => { loadLog(); loadInbox(); loadLists(); }, [loadLog, loadInbox, loadLists]);
  useEffect(() => { if (tab === "trash") loadTrash(); }, [tab, loadTrash]);

  const fmtDate = ts => {
    if (!ts) return "";
    return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const softDeleteSent = async (e, id) => {
    e.stopPropagation();
    await fetch(`/api/email?id=${id}`, { method: "DELETE" });
    setLog(prev => prev.filter(x => x.id !== id));
    if (openSent?.id === id) setOpenSent(null);
  };

  const softDeleteInbox = async (e, id) => {
    e.stopPropagation();
    await fetch(`/api/email/inbound?id=${id}`, { method: "DELETE" });
    setInbox(prev => prev.filter(x => x.id !== id));
    if (openMsg?.id === id) closeMsg();
  };

  const restoreItem = async (item) => {
    if (item._type === "sent") {
      await fetch(`/api/email?id=${item.id}`, { method: "PATCH" });
    } else {
      await fetch(`/api/email/inbound?id=${item.id}&restore=true`, { method: "PATCH" });
    }
    setTrash(prev => prev.filter(x => !(x.id === item.id && x._type === item._type)));
    if (flash) flash("Restored to " + (item._type === "sent" ? "Sent" : "Inbox"));
    if (item._type === "sent") loadLog(); else loadInbox();
  };

  const permanentDelete = async (item) => {
    if (item._type === "sent") {
      await fetch(`/api/email?id=${item.id}&permanent=true`, { method: "DELETE" });
    } else {
      await fetch(`/api/email/inbound?id=${item.id}&permanent=true`, { method: "DELETE" });
    }
    setTrash(prev => prev.filter(x => !(x.id === item.id && x._type === item._type)));
  };

  const deleteList = async (id) => {
    await fetch(`/api/lists?id=${id}`, { method: "DELETE" });
    setLists(prev => prev.filter(x => x.id !== id));
    if (flash) flash("List deleted");
  };

  const noEmail = members.filter(m => m.status === "active" && !m.email).length;
  const unread = inbox.filter(m => !m.is_read).length;

  const tabStyle = active => ({
    padding: "8px 20px", borderRadius: "8px", cursor: "pointer", fontSize: "14px",
    fontWeight: active ? "600" : "400",
    background: active ? "linear-gradient(135deg,#3b82f620,#6366f120)" : "transparent",
    color: active ? "#93c5fd" : "#94a3b8",
    border: active ? "1px solid #3b82f640" : "1px solid transparent",
  });

  const openInboxMsg = async (msg) => {
    setOpenSent(null);
    setOpenMsg(msg); setReplyMode(null); setReplyHtml("");
    if (!msg.is_read) {
      await fetch(`/api/email/inbound/${msg.id}`, { method: "PATCH" });
      setInbox(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
  };

  const closeMsg = () => { setOpenMsg(null); setReplyMode(null); setReplyHtml(""); };

  const extractEmail = (str) => {
    if (!str) return "";
    const m = str.match(/<(.+?)>/);
    return m ? m[1].trim() : str.trim();
  };

  const getReplyAllAddresses = (msg) => {
    const clubEmail = "club@seniormensclub.org";
    const fromEmail = extractEmail(msg.from_address);
    const toEmails = (msg.to_address || "").split(",").map(e => extractEmail(e.trim())).filter(e => e && e !== clubEmail);
    const all = [fromEmail, ...toEmails].filter(e => e && e !== clubEmail);
    return [...new Set(all)];
  };

  const sendReply = async () => {
    if (!replyHtml || !openMsg) return;
    setReplySending(true);
    const plainText = replyHtml
      .replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/\n{3,}/g, "\n\n").trim();
    const replySubject = openMsg.subject.startsWith("Re:") ? openMsg.subject : `Re: ${openMsg.subject}`;
    try {
      if (replyMode === "replyAll") {
        const allAddresses = getReplyAllAddresses(openMsg);
        const memberRecipients = [];
        const directRecipients = [];
        allAddresses.forEach(email => {
          const m = members.find(m => m.email?.toLowerCase() === email.toLowerCase());
          if (m) memberRecipients.push(m.id); else directRecipients.push(email);
        });
        if (memberRecipients.length) {
          await fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberIds: memberRecipients, subject: replySubject, body: plainText, htmlBody: replyHtml }) });
        }
        for (const email of directRecipients) {
          await fetch("/api/email/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: email, subject: replySubject, body: plainText, htmlBody: replyHtml }) });
        }
      } else {
        const replyToEmail = extractEmail(openMsg.from_address);
        const matchedMember = members.find(m => m.email?.toLowerCase() === replyToEmail.toLowerCase());
        if (matchedMember) {
          await fetch("/api/email", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ memberIds: [matchedMember.id], subject: replySubject, body: plainText, htmlBody: replyHtml }) });
        } else {
          await fetch("/api/email/reply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ to: replyToEmail, subject: replySubject, body: plainText, htmlBody: replyHtml }) });
        }
      }
      if (flash) flash(replyMode === "replyAll" ? "Reply All sent!" : "Reply sent!");
      setReplyMode(null); setReplyHtml(""); loadLog();
    } catch (e) {
      if (flash) flash(`Failed to send: ${e.message}`);
    } finally { setReplySending(false); }
  };

  const previewText = (body) => cleanBodyText(body).replace(/\s+/g, ' ').trim();
  const refreshCurrent = () => { if (tab === "inbox") loadInbox(); else if (tab === "sent") loadLog(); else loadTrash(); };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "700", margin: 0 }}>Email</h1>
        <div onClick={() => { setEmailPre([]); setShowEM(true); }} style={{ ...BTN("linear-gradient(135deg,#3b82f6,#6366f1)"), display: "flex", alignItems: "center", gap: "6px" }}>
          <Icons.Send />Compose Email
        </div>
      </div>

      {/* Quick Send Cards */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div onClick={() => { setEmailPre(members.filter(m => m.status === "active").map(m => m.id)); setShowEM(true); }} style={{ padding: "20px", background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", cursor: "pointer" }}>
          <div style={{ fontSize: "20px", marginBottom: "6px" }}>📣</div>
          <div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>Email All Active</div>
          <div style={{ color: "#64748b", fontSize: "13px" }}>{ac} recipients</div>
        </div>
        <div onClick={() => { setEmailPre(mwd.filter(m => m._ds !== "paid" && m.status === "active").map(m => m.id)); setShowEM(true); }} style={{ padding: "20px", background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", cursor: "pointer" }}>
          <div style={{ fontSize: "20px", marginBottom: "6px" }}>💰</div>
          <div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>Email Unpaid Members</div>
          <div style={{ color: "#64748b", fontSize: "13px" }}>{mwd.filter(m => m._ds !== "paid" && m.status === "active").length} recipients</div>
        </div>
        <div onClick={() => setShowListManager(true)} style={{ padding: "20px", background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", cursor: "pointer" }}>
          <div style={{ fontSize: "20px", marginBottom: "6px" }}>👥</div>
          <div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>Saved Lists</div>
          <div style={{ color: "#64748b", fontSize: "13px" }}>{lists.length} list{lists.length !== 1 ? "s" : ""} saved</div>
        </div>
      </div>

      {/* Saved Lists Manager */}
      {showListManager && (
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", marginBottom: "20px", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #334155", background: "#0f172a40" }}>
            <div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600" }}>Saved Lists</div>
            <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
              <div onClick={() => { setEmailPre([]); setShowEM(true); setShowListManager(false); }} style={{ ...BTN("linear-gradient(135deg,#3b82f6,#6366f1)"), fontSize: "12px", padding: "6px 12px" }}>+ Create New List</div>
              <div onClick={() => setShowListManager(false)} style={{ color: "#64748b", cursor: "pointer", fontSize: "18px", padding: "4px 6px" }}>✕</div>
            </div>
          </div>
          {lists.length === 0 ? (
            <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>No saved lists yet. Compose an email and save your recipient selection as a list.</div>
          ) : (
            <div>
              {lists.map((list, i) => (
                <div key={list.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 20px", borderBottom: i < lists.length - 1 ? "1px solid #334155" : "none" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "600", marginBottom: "2px" }}>{list.name}</div>
                    <div style={{ color: "#64748b", fontSize: "12px" }}>{list.member_ids.length} member{list.member_ids.length !== 1 ? "s" : ""}</div>
                  </div>
                  <div onClick={() => { setEmailPre(list.member_ids); setShowEM(true); setShowListManager(false); }} style={{ ...BTN("#1e3a5f"), fontSize: "12px", padding: "6px 14px", color: "#93c5fd", border: "1px solid #3b82f640", whiteSpace: "nowrap" }}>Email This List</div>
                  <DelButton onClick={() => deleteList(list.id)} title="Delete list" />
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Warning */}
      {noEmail > 0 && (
        <div style={{ background: "#78350f20", border: "1px solid #92400e", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Icons.Alert />
          <span style={{ color: "#fcd34d", fontSize: "13px" }}>{noEmail} active member{noEmail !== 1 ? "s have" : " has"} no email address on file — they won't receive emails.</span>
        </div>
      )}

      {/* Sent email detail */}
      {openSent && (
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", marginBottom: "16px", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #334155", background: "#0f172a40" }}>
            <div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{openSent.subject}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "8px", marginLeft: "12px", flexShrink: 0 }}>
              <div style={{ padding: "3px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "600", background: openSent.status === "sent" ? "#06402020" : "#7f1d1d20", color: openSent.status === "sent" ? "#34d399" : "#f87171", border: `1px solid ${openSent.status === "sent" ? "#06402040" : "#7f1d1d40"}` }}>
                {openSent.status === "sent" ? "Sent" : "Failed"}
              </div>
              <div onClick={() => setOpenSent(null)} style={{ color: "#64748b", cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "4px 6px" }}>✕</div>
            </div>
          </div>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #1e293b", background: "#0f172a20" }}>
            <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "2px" }}>
              <span style={{ color: "#64748b" }}>To: </span>
              {openSent.recipient_count} recipient{openSent.recipient_count !== 1 ? "s" : ""}
            </div>
            {openSent.recipient_emails && (
              <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "2px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{openSent.recipient_emails}</div>
            )}
            <div style={{ color: "#64748b", fontSize: "12px" }}>{fmtDate(openSent.sent_at)}</div>
          </div>
          <div style={{ padding: "20px", minHeight: "60px" }}>
            <SentBodyPreview html={openSent.body_html} />
          </div>
        </div>
      )}

      {/* Inbox message detail */}
      {openMsg && (
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", marginBottom: "16px", overflow: "hidden" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #334155", background: "#0f172a40" }}>
            <div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>{openMsg.subject}</div>
            <div style={{ display: "flex", alignItems: "center", gap: "6px", marginLeft: "12px", flexShrink: 0 }}>
              <DelButton onClick={(e) => softDeleteInbox(e, openMsg.id)} title="Move to Trash" />
              <div onClick={closeMsg} style={{ color: "#64748b", cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "4px 6px" }}>✕</div>
            </div>
          </div>
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #1e293b", background: "#0f172a20" }}>
            <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "2px" }}><span style={{ color: "#64748b" }}>From: </span>{openMsg.from_address}</div>
            {openMsg.to_address && <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "2px" }}><span style={{ color: "#64748b" }}>To: </span>{openMsg.to_address}</div>}
            <div style={{ color: "#64748b", fontSize: "12px" }}>{fmtDate(openMsg.received_at)}</div>
          </div>
          <div style={{ padding: "20px", minHeight: "80px" }}>
            {openMsg.body_text
              ? <div style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: "1.7", whiteSpace: "pre-wrap", fontFamily: "inherit" }}>{cleanBodyText(openMsg.body_text)}</div>
              : <div style={{ color: "#475569", fontSize: "13px", fontStyle: "italic" }}>No message body</div>}
          </div>
          {replyMode ? (
            <div style={{ padding: "16px 20px", borderTop: "1px solid #334155", background: "#0f172a30" }}>
              <div style={{ marginBottom: "8px", fontSize: "13px", color: "#64748b" }}>
                {replyMode === "replyAll" ? `Replying to all: ${getReplyAllAddresses(openMsg).join(", ")}` : `Replying to: ${extractEmail(openMsg.from_address)}`}
              </div>
              <ReplyEditor onChange={setReplyHtml} />
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <div onClick={sendReply} style={{ ...BTN("linear-gradient(135deg,#3b82f6,#6366f1)"), display: "flex", alignItems: "center", gap: "6px", opacity: (replyHtml && !replySending) ? 1 : 0.5, pointerEvents: (replyHtml && !replySending) ? "auto" : "none" }}>
                  <Icons.Send />{replySending ? "Sending…" : replyMode === "replyAll" ? "Send Reply All" : "Send Reply"}
                </div>
                <div onClick={() => { setReplyMode(null); setReplyHtml(""); }} style={{ ...BTN("#334155"), color: "#94a3b8" }}>Cancel</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "12px 20px", borderTop: "1px solid #334155", display: "flex", gap: "8px" }}>
              <div onClick={() => setReplyMode("reply")} style={{ ...BTN("#1e3a5f"), display: "inline-flex", alignItems: "center", gap: "6px", color: "#93c5fd", border: "1px solid #3b82f640" }}>↩ Reply</div>
              {getReplyAllAddresses(openMsg).length > 1 && (
                <div onClick={() => setReplyMode("replyAll")} style={{ ...BTN("#1e293b"), display: "inline-flex", alignItems: "center", gap: "6px", color: "#94a3b8", border: "1px solid #334155" }}>↩↩ Reply All</div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Tabs */}
      <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #334155" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <div onClick={() => setTab("inbox")} style={{ ...tabStyle(tab === "inbox"), display: "flex", alignItems: "center", gap: "6px" }}>
              Inbox{unread > 0 && <span style={{ background: "#3b82f6", color: "white", borderRadius: "99px", fontSize: "10px", fontWeight: "700", padding: "1px 7px" }}>{unread}</span>}
            </div>
            <div onClick={() => setTab("sent")} style={tabStyle(tab === "sent")}>Sent</div>
            <div onClick={() => setTab("trash")} style={{ ...tabStyle(tab === "trash"), display: "flex", alignItems: "center", gap: "6px" }}>
              🗑 Trash{trash.length > 0 && tab !== "trash" && <span style={{ background: "#64748b", color: "white", borderRadius: "99px", fontSize: "10px", fontWeight: "700", padding: "1px 7px" }}>{trash.length}</span>}
            </div>
          </div>
          <div onClick={refreshCurrent} style={{ color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}>
            <Icons.Refresh />Refresh
          </div>
        </div>

        {/* Inbox Tab */}
        {tab === "inbox" && (
          inboxLoading ? <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>Loading...</div>
          : inbox.length === 0 ? <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>No messages received yet</div>
          : <div>{inbox.map((msg, i) => {
              const preview = previewText(msg.body_text);
              return (
                <div key={msg.id} onClick={() => openInboxMsg(msg)} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 20px", borderBottom: i < inbox.length - 1 ? "1px solid #334155" : "none", background: openMsg?.id === msg.id ? "#3b82f615" : (!msg.is_read ? "#3b82f608" : "transparent"), cursor: "pointer", transition: "background 0.15s" }}>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: "8px", minWidth: 0 }}>
                        {!msg.is_read && <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} />}
                        <div style={{ color: !msg.is_read ? "#f1f5f9" : "#94a3b8", fontSize: "14px", fontWeight: !msg.is_read ? "600" : "400", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{msg.subject || "(no subject)"}</div>
                      </div>
                      <div style={{ color: "#64748b", fontSize: "11px", whiteSpace: "nowrap", marginLeft: "16px", flexShrink: 0 }}>{fmtDate(msg.received_at)}</div>
                    </div>
                    <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "4px", paddingLeft: !msg.is_read ? "15px" : 0 }}>From: {msg.from_address}</div>
                    {preview && <div style={{ color: "#94a3b8", fontSize: "13px", lineHeight: "1.5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: !msg.is_read ? "15px" : 0 }}>{preview.slice(0, 160)}{preview.length > 160 ? "…" : ""}</div>}
                  </div>
                  <DelButton onClick={(e) => softDeleteInbox(e, msg.id)} title="Move to Trash" />
                </div>
              );
            })}</div>
        )}

        {/* Sent Tab */}
        {tab === "sent" && (
          logLoading ? <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>Loading...</div>
          : log.length === 0 ? <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>No emails sent yet</div>
          : <div>{log.map((entry, i) => (
              <div key={entry.id} onClick={() => { setOpenMsg(null); setOpenSent(openSent?.id === entry.id ? null : entry); }}
                style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 20px", borderBottom: i < log.length - 1 ? "1px solid #334155" : "none", background: openSent?.id === entry.id ? "#6366f115" : (i % 2 === 0 ? "#0f172a20" : "transparent"), cursor: "pointer", transition: "background 0.15s" }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px", gap: "12px" }}>
                    <div style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "600", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{entry.subject}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
                      <div style={{ color: "#94a3b8", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.recipient_count} recipient{entry.recipient_count !== 1 ? "s" : ""}</div>
                      <div style={{ padding: "3px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "600", background: entry.status === "sent" ? "#06402020" : "#7f1d1d20", color: entry.status === "sent" ? "#34d399" : "#f87171", border: `1px solid ${entry.status === "sent" ? "#06402040" : "#7f1d1d40"}` }}>
                        {entry.status === "sent" ? "Sent" : "Failed"}
                      </div>
                    </div>
                  </div>
                  <div style={{ color: "#64748b", fontSize: "12px", marginBottom: entry.recipient_emails ? "4px" : 0 }}>{fmtDate(entry.sent_at)}</div>
                  {entry.recipient_emails && <div style={{ color: "#475569", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}><span style={{ color: "#64748b" }}>To: </span>{entry.recipient_emails}</div>}
                </div>
                <DelButton onClick={(e) => softDeleteSent(e, entry.id)} title="Move to Trash" />
              </div>
            ))}</div>
        )}

        {/* Trash Tab */}
        {tab === "trash" && (
          trashLoading ? <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>Loading...</div>
          : trash.length === 0
            ? <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>Trash is empty</div>
            : <>
                <div style={{ padding: "10px 20px", borderBottom: "1px solid #334155", background: "#0f172a30", fontSize: "12px", color: "#64748b" }}>
                  Items in trash can be restored or permanently deleted.
                </div>
                <div>{trash.map((item, i) => {
                  const isInbox = item._type === "inbox";
                  const subject = item.subject || "(no subject)";
                  const date = item.sent_at || item.received_at;
                  const meta = isInbox ? item.from_address : `${item.recipient_count} recipient${item.recipient_count !== 1 ? "s" : ""}`;
                  return (
                    <div key={`${item._type}-${item.id}`} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "14px 20px", borderBottom: i < trash.length - 1 ? "1px solid #334155" : "none", background: i % 2 === 0 ? "#0f172a20" : "transparent" }}>
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "4px" }}>
                          <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "4px", background: isInbox ? "#3b82f620" : "#6366f120", color: isInbox ? "#60a5fa" : "#a78bfa", fontWeight: "600", flexShrink: 0 }}>
                            {isInbox ? "INBOX" : "SENT"}
                          </span>
                          <div style={{ color: "#94a3b8", fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{subject}</div>
                        </div>
                        <div style={{ color: "#64748b", fontSize: "12px" }}>{meta} · {fmtDate(date)}</div>
                      </div>
                      <div onClick={() => restoreItem(item)} title="Restore"
                        style={{ display: "flex", alignItems: "center", gap: "4px", padding: "5px 10px", borderRadius: "6px", cursor: "pointer", background: "#1e3a5f", color: "#93c5fd", fontSize: "12px", fontWeight: "500", border: "1px solid #3b82f640", flexShrink: 0 }}>
                        ↩ Restore
                      </div>
                      <DelButton onClick={() => permanentDelete(item)} title="Delete permanently" />
                    </div>
                  );
                })}</div>
              </>
        )}
      </div>

      {showEM && (
        <EmailModal
          members={members}
          pre={emailPre}
          lists={lists}
          onClose={() => setShowEM(false)}
          onSend={() => { loadLog(); loadLists(); if (flash) flash("Email sent successfully!"); }}
          onListSaved={() => loadLists()}
          flash={flash}
        />
      )}
    </div>
  );
}

function DelButton({ onClick, title }) {
  const [hover, setHover] = useState(false);
  return (
    <div onClick={onClick} title={title} onMouseEnter={() => setHover(true)} onMouseLeave={() => setHover(false)}
      style={{ display: "flex", alignItems: "center", justifyContent: "center", width: "30px", height: "30px", borderRadius: "6px", cursor: "pointer", color: hover ? "#ef4444" : "#475569", flexShrink: 0, background: hover ? "#ef444415" : "transparent", transition: "all 0.15s" }}>
      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/>
      </svg>
    </div>
  );
}
