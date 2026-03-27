import { Icons } from "../Icons";
import { BTN } from "../ui";
import { EmailModal } from "../EmailModal";
import { useState, useEffect, useCallback } from "react";

export function EmailPage({ members, mwd, ac, setPg, setSelMode, setSel, flash }) {
  const [showEM, setShowEM] = useState(false);
  const [emailPre, setEmailPre] = useState([]);
  const [log, setLog] = useState([]);
  const [logLoading, setLogLoading] = useState(true);

  const loadLog = useCallback(() => {
    setLogLoading(true);
    fetch("/api/email")
      .then(r => r.json())
      .then(d => { if (Array.isArray(d)) setLog(d); setLogLoading(false); })
      .catch(() => setLogLoading(false));
  }, []);

  useEffect(() => { loadLog(); }, [loadLog]);

  const fmtDate = ts => {
    if (!ts) return "";
    const d = new Date(ts);
    return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const noEmail = members.filter(m => m.status === "active" && !m.email).length;

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

      {/* Sent Email Log */}
      <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "16px 20px", borderBottom: "1px solid #334155" }}>
          <h3 style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", margin: 0 }}>Sent Email History</h3>
          <div onClick={loadLog} style={{ color: "#64748b", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px", fontSize: "12px" }}><Icons.Refresh />Refresh</div>
        </div>
        {logLoading
          ? <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>Loading...</div>
          : log.length === 0
            ? <div style={{ padding: "32px", textAlign: "center", color: "#64748b", fontSize: "14px" }}>No emails sent yet</div>
            : <div>
                {log.map((entry, i) => (
                  <div key={entry.id} style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: "16px", alignItems: "center", padding: "12px 20px", borderBottom: i < log.length - 1 ? "1px solid #1e293b" : "none", background: i % 2 === 0 ? "#0f172a20" : "transparent" }}>
                    <div>
                      <div style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "500", marginBottom: "2px" }}>{entry.subject}</div>
                      <div style={{ color: "#64748b", fontSize: "12px" }}>{fmtDate(entry.sent_at)}</div>
                    </div>
                    <div style={{ color: "#94a3b8", fontSize: "13px", whiteSpace: "nowrap" }}>{entry.recipient_count} recipient{entry.recipient_count !== 1 ? "s" : ""}</div>
                    <div style={{ padding: "3px 10px", borderRadius: "99px", fontSize: "11px", fontWeight: "600", background: entry.status === "sent" ? "#06402020" : "#7f1d1d20", color: entry.status === "sent" ? "#34d399" : "#f87171", border: `1px solid ${entry.status === "sent" ? "#06402040" : "#7f1d1d40"}` }}>
                      {entry.status === "sent" ? "Sent" : "Failed"}
                    </div>
                  </div>
                ))}
              </div>
        }
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
