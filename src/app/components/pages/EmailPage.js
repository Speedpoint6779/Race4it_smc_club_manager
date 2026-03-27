import { Icons } from "../Icons";
import { BTN } from "../ui";
import { EmailModal } from "../EmailModal";
import { useState, useEffect, useCallback } from "react";

export function EmailPage({ members, mwd, ac, setPg, setSelMode, setSel, flash }) {
  const [showEM, setShowEM] = useState(false);
  const [emailPre, setEmailPre] = useState([]);
  const [tab, setTab] = useState("sent"); // "sent" | "inbox"
  const [log, setLog] = useState([]);
  const [inbox, setInbox] = useState([]);
  const [logLoading, setLogLoading] = useState(true);
  const [inboxLoading, setInboxLoading] = useState(true);
  const [openMsg, setOpenMsg] = useState(null); // currently open inbox message
  const [showReply, setShowReply] = useState(false);
  const [replyText, setReplyText] = useState("");
  const [replySending, setReplySending] = useState(false);

  const loadLog = useCallback(() => {
    setLogLoading(true);
    fetch("/api/email")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setLog(d); setLogLoading(false); })
      .catch(() => setLogLoading(false));
  }, []);

  const loadInbox = useCallback(() => {
    setInboxLoading(true);
    fetch("/api/email/inbound")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setInbox(d); setInboxLoading(false); })
      .catch(() => setInboxLoading(false));
  }, []);

  useEffect(() => { loadLog(); loadInbox(); }, [loadLog, loadInbox]);

  const fmtDate = ts => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const noEmail = members.filter(m => m.status === "active" && !m.email).length;
  const unread = inbox.filter(m => !m.is_read).length;

  const tabStyle = active => ({
    padding: "8px 20px",
    borderRadius: "8px",
    cursor: "pointer",
    fontSize: "14px",
    fontWeight: active ? "600" : "400",
    background: active ? "linear-gradient(135deg,#3b82f620,#6366f120)" : "transparent",
    color: active ? "#93c5fd" : "#94a3b8",
    border: active ? "1px solid #3b82f640" : "1px solid transparent",
  });

  // Open an inbox message and mark it read
  const openInboxMsg = async (msg) => {
    setOpenMsg(msg);
    setShowReply(false);
    setReplyText("");
    if (!msg.is_read) {
      await fetch(`/api/email/inbound/${msg.id}`, { method: "PATCH" });
      setInbox(prev => prev.map(m => m.id === msg.id ? { ...m, is_read: true } : m));
    }
  };

  const closeMsg = () => { setOpenMsg(null); setShowReply(false); setReplyText(""); };

  const sendReply = async () => {
    if (!replyText.trim() || !openMsg) return;
    setReplySending(true);

    // Extract just the email address from "Name <email>" format
    const fromMatch = openMsg.from_address.match(/<(.+?)>/);
    const replyToEmail = fromMatch ? fromMatch[1] : openMsg.from_address;

    // Find member by email so we can use the same POST /api/email endpoint
    const matchedMember = members.find(m => m.email?.toLowerCase() === replyToEmail.toLowerCase());

    try {
      let res;
      if (matchedMember) {
        res = await fetch("/api/email", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            memberIds: [matchedMember.id],
            subject: openMsg.subject.startsWith("Re:") ? openMsg.subject : `Re: ${openMsg.subject}`,
            body: replyText,
          }),
        });
      } else {
        // Non-member reply — send via a direct send endpoint
        res = await fetch("/api/email/reply", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: replyToEmail,
            subject: openMsg.subject.startsWith("Re:") ? openMsg.subject : `Re: ${openMsg.subject}`,
            body: replyText,
          }),
        });
      }
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      if (flash) flash("Reply sent!");
      setShowReply(false);
      setReplyText("");
      loadLog();
    } catch (e) {
      if (flash) flash(`Failed to send: ${e.message}`);
    } finally {
      setReplySending(false);
    }
  };

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
        <div onClick={() => { setPg("members"); setSelMode(true); setSel([]); }} style={{ padding: "20px", background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", cursor: "pointer" }}>
          <div style={{ fontSize: "20px", marginBottom: "6px" }}>👥</div>
          <div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>Select Custom List</div>
          <div style={{ color: "#64748b", fontSize: "13px" }}>Pick specific members</div>
        </div>
      </div>

      {/* Warning if members missing emails */}
      {noEmail > 0 && (
        <div style={{ background: "#78350f20", border: "1px solid #92400e", borderRadius: "10px", padding: "12px 16px", marginBottom: "20px", display: "flex", alignItems: "center", gap: "10px" }}>
          <Icons.Alert />
          <span style={{ color: "#fcd34d", fontSize: "13px" }}>{noEmail} active member{noEmail !== 1 ? "s have" : " has"} no email address on file — they won't receive emails.</span>
        </div>
      )}

      {/* Open message detail view */}
      {openMsg && (
        <div style={{ background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", marginBottom: "16px", overflow: "hidden" }}>
          {/* Header */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "14px 20px", borderBottom: "1px solid #334155", background: "#0f172a40" }}>
            <div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600" }}>{openMsg.subject}</div>
            <div onClick={closeMsg} style={{ color: "#64748b", cursor: "pointer", fontSize: "18px", lineHeight: 1, padding: "2px 6px" }}>✕</div>
          </div>
          {/* Meta */}
          <div style={{ padding: "12px 20px", borderBottom: "1px solid #1e293b", background: "#0f172a20" }}>
            <div style={{ color: "#94a3b8", fontSize: "13px", marginBottom: "2px" }}><span style={{ color: "#64748b" }}>From: </span>{openMsg.from_address}</div>
            <div style={{ color: "#64748b", fontSize: "12px" }}>{fmtDate(openMsg.received_at)}</div>
          </div>
          {/* Body */}
          <div style={{ padding: "20px", minHeight: "80px" }}>
            {openMsg.body_text ? (
              <pre style={{ color: "#cbd5e1", fontSize: "14px", lineHeight: "1.65", whiteSpace: "pre-wrap", margin: 0, fontFamily: "inherit" }}>
                {openMsg.body_text}
              </pre>
            ) : (
              <div style={{ color: "#475569", fontSize: "13px", fontStyle: "italic" }}>No message body</div>
            )}
          </div>
          {/* Reply area */}
          {showReply ? (
            <div style={{ padding: "16px 20px", borderTop: "1px solid #334155", background: "#0f172a30" }}>
              <textarea
                value={replyText}
                onChange={e => setReplyText(e.target.value)}
                placeholder="Write your reply..."
                style={{ width: "100%", minHeight: "100px", background: "#0f172a", border: "1px solid #334155", borderRadius: "8px", color: "#f1f5f9", fontSize: "14px", padding: "10px 12px", resize: "vertical", boxSizing: "border-box", fontFamily: "inherit", outline: "none" }}
              />
              <div style={{ display: "flex", gap: "8px", marginTop: "10px" }}>
                <div
                  onClick={sendReply}
                  style={{ ...BTN("linear-gradient(135deg,#3b82f6,#6366f1)"), display: "flex", alignItems: "center", gap: "6px", opacity: replySending ? 0.6 : 1, pointerEvents: replySending ? "none" : "auto" }}
                >
                  <Icons.Send />{replySending ? "Sending…" : "Send Reply"}
                </div>
                <div onClick={() => { setShowReply(false); setReplyText(""); }} style={{ ...BTN("#334155"), color: "#94a3b8" }}>Cancel</div>
              </div>
            </div>
          ) : (
            <div style={{ padding: "12px 20px", borderTop: "1px solid #334155" }}>
              <div
                onClick={() => setShowReply(true)}
                style={{ ...BTN("#1e3a5f"), display: "inline-flex", alignItems: "center", gap: "6px", color: "#93c5fd", border: "1px solid #3b82f640" }}
              >
                ↩ Reply
              </div>
            </div>
          )}
        </div>
      )}

      {/* Inbox / Sent Tabs */}
      <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 16px", borderBottom: "1px solid #334155" }}>
          <div style={{ display: "flex", gap: "8px" }}>
            <div onClick={() => setTab("sent")} style={tabStyle(tab === "sent")}>Sent</div>
            <div onClick={() => setTab("inbox")} style={{ ...tabStyle(tab === "inbox"), display: "flex", alignItems: "center", gap: "6px" }}>
              Inbox
              {unread > 0 && (
                <span style={{ background: "#3b82f6", color: "white", borderRadius: "99px", fontSize: "10px", fontWeight: "700", padding: "1px 7px" }}>{unread}</span>
              )}
            </div>
          </div>
          <div
            onClick={() => { tab === "sent" ? loadLog() : loadInbox(); }}
            style={{ color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}
          >
            <Icons.Refresh />Refresh
          </div>
        </div>

        {/* Sent Tab */}
        {tab === "sent" && (
          logLoading
            ? <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>Loading...</div>
            : log.length === 0
              ? <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>No emails sent yet</div>
              : <div>
                  {log.map((entry, i) => (
                    <div key={entry.id} style={{ padding: "14px 20px", borderBottom: i < log.length - 1 ? "1px solid #334155" : "none", background: i % 2 === 0 ? "#0f172a20" : "transparent" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "6px" }}>
                        <div style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "600" }}>{entry.subject}</div>
                        <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0, marginLeft: "16px" }}>
                          <div style={{ color: "#94a3b8", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.recipient_count} recipient{entry.recipient_count !== 1 ? "s" : ""}</div>
                          <div style={{ padding: "3px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "600", background: entry.status === "sent" ? "#06402020" : "#7f1d1d20", color: entry.status === "sent" ? "#34d399" : "#f87171", border: `1px solid ${entry.status === "sent" ? "#06402040" : "#7f1d1d40"}` }}>
                            {entry.status === "sent" ? "Sent" : "Failed"}
                          </div>
                        </div>
                      </div>
                      <div style={{ color: "#64748b", fontSize: "12px", marginBottom: entry.recipient_emails ? "4px" : 0 }}>{fmtDate(entry.sent_at)}</div>
                      {entry.recipient_emails && (
                        <div style={{ color: "#475569", fontSize: "12px", lineHeight: "1.5" }}>
                          <span style={{ color: "#64748b" }}>To: </span>
                          {entry.recipient_emails}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
        )}

        {/* Inbox Tab */}
        {tab === "inbox" && (
          inboxLoading
            ? <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>Loading...</div>
            : inbox.length === 0
              ? <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>No messages received yet</div>
              : <div>
                  {inbox.map((msg, i) => (
                    <div
                      key={msg.id}
                      onClick={() => openInboxMsg(msg)}
                      style={{ padding: "14px 20px", borderBottom: i < inbox.length - 1 ? "1px solid #334155" : "none", background: openMsg?.id === msg.id ? "#3b82f615" : (!msg.is_read ? "#3b82f608" : "transparent"), cursor: "pointer", transition: "background 0.15s" }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "4px" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                          {!msg.is_read && <div style={{ width: "7px", height: "7px", borderRadius: "50%", background: "#3b82f6", flexShrink: 0 }} />}
                          <div style={{ color: !msg.is_read ? "#f1f5f9" : "#94a3b8", fontSize: "14px", fontWeight: !msg.is_read ? "600" : "400" }}>{msg.subject || "(no subject)"}</div>
                        </div>
                        <div style={{ color: "#64748b", fontSize: "11px", whiteSpace: "nowrap", marginLeft: "16px" }}>{fmtDate(msg.received_at)}</div>
                      </div>
                      <div style={{ color: "#64748b", fontSize: "12px", marginBottom: "4px", paddingLeft: !msg.is_read ? "15px" : 0 }}>From: {msg.from_address}</div>
                      {msg.body_text && (
                        <div style={{ color: "#94a3b8", fontSize: "13px", lineHeight: "1.5", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", paddingLeft: !msg.is_read ? "15px" : 0 }}>
                          {msg.body_text.replace(/\s+/g, " ").slice(0, 160)}{msg.body_text.length > 160 ? "…" : ""}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
        )}
      </div>

      {showEM && (
        <EmailModal
          members={members}
          pre={emailPre}
          onClose={() => setShowEM(false)}
          onSend={() => { loadLog(); if (flash) flash("Email sent successfully!"); }}
          flash={flash}
        />
      )}
    </div>
  );
}
