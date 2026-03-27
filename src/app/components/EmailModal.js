"use client";
import { useState } from "react";
import { Icons } from "./Icons";
import { IS, LS, BTN, getDuesStatus } from "./ui";

const TEMPLATES = {
  dues: {
    subject: "SMC Annual Dues Reminder",
    body: `Dear Member,

This is a friendly reminder that your Senior Men's Club annual dues of $50 are now due.

Please send your payment to the club treasurer at your earliest convenience. You can pay by check made payable to "Senior Men's Club" or bring cash to the next meeting.

If you have already paid, please disregard this notice.

Thank you for your continued membership and support of the club.

Sincerely,
SMC Club Officers`,
  },
  meeting: {
    subject: "SMC Meeting Announcement",
    body: `Dear Members,

This is a reminder about our upcoming Senior Men's Club meeting.

We look forward to seeing everyone there. Please check the club calendar for the date, time, and location.

If you have any agenda items you would like to discuss, please contact the club secretary in advance.

See you there!

Sincerely,
SMC Club Officers`,
  },
};

export function EmailModal({ members, pre, onClose, onSend, flash }) {
  const [sel, setSel] = useState(pre || []);
  const [subj, setSubj] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [rs, setRs] = useState("");
  const [err, setErr] = useState("");

  const tog = id => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const applyTemplate = key => {
    setSubj(TEMPLATES[key].subject);
    setBody(TEMPLATES[key].body);
  };

  const doSend = async () => {
    if (!sel.length || !subj || !body) return;
    setSending(true);
    setErr("");
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: sel, subject: subj, body }),
      });
      const data = await res.json();
      if (!res.ok) {
        setErr(data.error || "Send failed");
        setSending(false);
        return;
      }
      setSentCount(data.sent);
      setSending(false);
      setSent(true);
      setTimeout(() => { onSend(); onClose(); }, 2000);
    } catch (e) {
      setErr("Network error — could not send");
      setSending(false);
    }
  };

  const fil = members.filter(m => !rs || ((m.firstName + " " + m.lastName + " " + m.email).toLowerCase().includes(rs.toLowerCase())));
  const ok = sel.length > 0 && subj && body;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: "#1e293b", borderRadius: "16px", border: "1px solid #334155", width: "100%", maxWidth: "620px", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #334155" }}>
          <h2 style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600", margin: 0 }}>{sent ? "Sent!" : "Compose Email"}</h2>
          <div onClick={onClose} style={{ color: "#94a3b8", cursor: "pointer", padding: "4px" }}><Icons.X /></div>
        </div>
        {sent
          ? <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>✅</div>
              <p style={{ color: "#34d399", fontSize: "18px", fontWeight: "600", margin: 0 }}>Sent to {sentCount} member{sentCount !== 1 ? "s" : ""}!</p>
            </div>
          : <>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>
                {/* Templates */}
                <div>
                  <label style={{ ...LS, display: "block", marginBottom: "6px" }}>Quick Templates</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span onClick={() => applyTemplate("dues")} style={{ cursor: "pointer", padding: "6px 12px", background: "#fbbf2415", border: "1px solid #fbbf2440", borderRadius: "6px", color: "#fbbf24", fontSize: "12px", fontWeight: "500" }}>💰 Dues Reminder</span>
                    <span onClick={() => applyTemplate("meeting")} style={{ cursor: "pointer", padding: "6px 12px", background: "#3b82f615", border: "1px solid #3b82f640", borderRadius: "6px", color: "#60a5fa", fontSize: "12px", fontWeight: "500" }}>📅 Meeting Announcement</span>
                  </div>
                </div>
                {/* Recipients */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ color: "#cbd5e1", fontSize: "13px", fontWeight: "500" }}>Recipients ({sel.length})</label>
                    <div style={{ display: "flex", gap: "6px" }}>
                      <span onClick={() => setSel(members.filter(m => m.status === "active").map(m => m.id))} style={{ color: "#3b82f6", fontSize: "12px", cursor: "pointer", padding: "2px 8px", borderRadius: "4px", background: "#3b82f610" }}>All Active</span>
                      <span onClick={() => setSel(members.filter(m => getDuesStatus(m) !== "paid" && m.status === "active").map(m => m.id))} style={{ color: "#fbbf24", fontSize: "12px", cursor: "pointer", padding: "2px 8px", borderRadius: "4px", background: "#fbbf2410" }}>Unpaid</span>
                      <span onClick={() => setSel([])} style={{ color: "#94a3b8", fontSize: "12px", cursor: "pointer", padding: "2px 8px" }}>Clear</span>
                    </div>
                  </div>
                  <div style={{ position: "relative", marginBottom: "6px" }}>
                    <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }}><Icons.Search /></div>
                    <input value={rs} onChange={e => setRs(e.target.value)} placeholder="Search members..." style={{ ...IS, paddingLeft: "38px" }} />
                  </div>
                  <div style={{ maxHeight: "140px", overflow: "auto", background: "#0f172a", borderRadius: "8px", border: "1px solid #334155", padding: "4px" }}>
                    {fil.map(m => (
                      <label key={m.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", cursor: "pointer", borderRadius: "6px", color: sel.includes(m.id) ? "#f1f5f9" : "#94a3b8", fontSize: "13px", background: sel.includes(m.id) ? "#334155" : "transparent" }}>
                        <input type="checkbox" checked={sel.includes(m.id)} onChange={() => tog(m.id)} style={{ accentColor: "#3b82f6" }} />
                        <span>{m.firstName} {m.lastName}</span>
                        <span style={{ marginLeft: "auto", color: "#64748b", fontSize: "12px" }}>{m.email || <em style={{ color: "#ef4444" }}>no email</em>}</span>
                      </label>
                    ))}
                    {fil.length === 0 && <p style={{ color: "#64748b", fontSize: "13px", padding: "12px", textAlign: "center", margin: 0 }}>No match</p>}
                  </div>
                  {sel.length > 0 && <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "4px" }}>
                    {sel.map(id => { const m = members.find(x => x.id === id); if (!m) return null; return <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px 3px 10px", background: "#334155", borderRadius: "99px", fontSize: "12px", color: "#cbd5e1" }}>{m.firstName} {m.lastName}<span onClick={() => tog(id)} style={{ cursor: "pointer", color: "#64748b", fontWeight: "bold" }}>x</span></span>; })}
                  </div>}
                </div>
                <div><label style={LS}>Subject *</label><input style={IS} value={subj} onChange={e => setSubj(e.target.value)} /></div>
                <div><label style={LS}>Message *</label><textarea style={{ ...IS, minHeight: "140px", resize: "vertical", fontFamily: "inherit", lineHeight: "1.5" }} value={body} onChange={e => setBody(e.target.value)} /></div>
                {err && <div style={{ background: "#7f1d1d33", border: "1px solid #991b1b", borderRadius: "8px", padding: "10px 14px", color: "#fca5a5", fontSize: "13px" }}>{err}</div>}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", padding: "20px 24px", borderTop: "1px solid #334155" }}>
                <div onClick={onClose} style={BTN("#334155", "#cbd5e1")}>Cancel</div>
                <div onClick={doSend} style={{ ...BTN(ok && !sending ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "#334155"), display: "flex", alignItems: "center", gap: "8px", opacity: ok && !sending ? 1 : 0.5, cursor: ok && !sending ? "pointer" : "default" }}>
                  <Icons.Send />{sending ? "Sending..." : "Send Email"}
                </div>
              </div>
            </>}
      </div>
    </div>
  );
}
