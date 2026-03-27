"use client";
import { useState } from "react";
import { Icons } from "./Icons";
import { Modal, IS, LS, BTN, getDuesStatus, DuesBadge } from "./ui";

export function PaymentModal({ members, onClose }) {
  const [sel, setSel] = useState([]);
  const [amt, setAmt] = useState("50.00");
  const [desc, setDesc] = useState("Annual Club Dues");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const tog = id => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const doSend = () => { if (!sel.length || !amt) return; setSending(true); setTimeout(() => { setSending(false); setSent(true); }, 1200); };
  return (
    <Modal title={sent ? "Payment Links Sent!" : "Send Dues Payment Links"} onClose={onClose} footer={!sent && <><div onClick={onClose} style={BTN("#334155", "#cbd5e1")}>Cancel</div><div onClick={doSend} style={{ ...BTN(sel.length > 0 && amt ? "linear-gradient(135deg,#10b981,#059669)" : "#334155"), display: "flex", alignItems: "center", gap: "8px", opacity: sel.length > 0 && amt ? 1 : 0.5 }}><Icons.Card />{sending ? "Sending..." : "Send " + sel.length + " Link" + (sel.length !== 1 ? "s" : "")}</div></>}>
      {sent
        ? <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ color: "#34d399", fontSize: "18px", fontWeight: "600" }}>Sent to {sel.length} member{sel.length !== 1 ? "s" : ""}</p>
            <p style={{ color: "#94a3b8", fontSize: "14px" }}>${parseFloat(amt).toFixed(2)} payment link emailed</p>
            <div onClick={onClose} style={{ marginTop: "16px", ...BTN("#334155", "#cbd5e1"), display: "inline-block" }}>Close</div>
          </div>
        : <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div><label style={LS}>Amount ($)</label><input style={IS} type="number" step="0.01" value={amt} onChange={e => setAmt(e.target.value)} /></div>
              <div><label style={LS}>Description</label><input style={IS} value={desc} onChange={e => setDesc(e.target.value)} /></div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ color: "#cbd5e1", fontSize: "13px", fontWeight: "500" }}>Send to ({sel.length})</label>
                <span onClick={() => setSel(members.filter(m => getDuesStatus(m) !== "paid" && m.status === "active").map(m => m.id))} style={{ color: "#3b82f6", fontSize: "12px", cursor: "pointer" }}>All Unpaid/Overdue</span>
              </div>
              <div style={{ maxHeight: "200px", overflow: "auto", background: "#0f172a", borderRadius: "8px", border: "1px solid #334155", padding: "8px" }}>
                {members.filter(m => m.status === "active").map(m => (
                  <label key={m.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", cursor: "pointer", borderRadius: "6px", color: sel.includes(m.id) ? "#f1f5f9" : "#94a3b8", fontSize: "13px" }}>
                    <input type="checkbox" checked={sel.includes(m.id)} onChange={() => tog(m.id)} style={{ accentColor: "#3b82f6" }} />{m.firstName} {m.lastName}<span style={{ marginLeft: "auto" }}><DuesBadge status={getDuesStatus(m)} /></span>
                  </label>
                ))}
              </div>
            </div>
          </div>}
    </Modal>
  );
}
