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
    <Modal title={sent ? "Payment Links Sent!" : "Send Dues Payment Links"} onClose={onClose} footer={!sent && <><div onClick={onClose} style={BTN("var(--btn-secondary-bg)", "var(--btn-secondary-text)")}>Cancel</div><div onClick={doSend} style={{ ...BTN(sel.length > 0 && amt ? "var(--green-gradient)" : "var(--btn-secondary-bg)"), display: "flex", alignItems: "center", gap: "8px", opacity: sel.length > 0 && amt ? 1 : 0.5 }}><Icons.Card />{sending ? "Sending..." : "Send " + sel.length + " Link" + (sel.length !== 1 ? "s" : "")}</div></>}>
      {sent
        ? <div style={{ textAlign: "center", padding: "24px 0" }}>
            <p style={{ color: "var(--badge-paid-text)", fontSize: "18px", fontWeight: "600" }}>Sent to {sel.length} member{sel.length !== 1 ? "s" : ""}</p>
            <p style={{ color: "var(--text-secondary)", fontSize: "15px" }}>${parseFloat(amt).toFixed(2)} payment link emailed</p>
            <div onClick={onClose} style={{ marginTop: "16px", ...BTN("var(--btn-secondary-bg)", "var(--btn-secondary-text)"), display: "inline-block" }}>Close</div>
          </div>
        : <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div><label style={LS}>Amount ($)</label><input style={IS} type="number" step="0.01" value={amt} onChange={e => setAmt(e.target.value)} /></div>
              <div><label style={LS}>Description</label><input style={IS} value={desc} onChange={e => setDesc(e.target.value)} /></div>
            </div>
            <div>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                <label style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: "500" }}>Send to ({sel.length})</label>
                <span onClick={() => setSel(members.filter(m => getDuesStatus(m) !== "paid" && m.status === "active").map(m => m.id))} style={{ color: "var(--accent)", fontSize: "13px", cursor: "pointer" }}>All Unpaid/Overdue</span>
              </div>
              <div style={{ maxHeight: "200px", overflow: "auto", background: "var(--bg-input)", borderRadius: "8px", border: "1px solid var(--border)", padding: "8px" }}>
                {members.filter(m => m.status === "active").map(m => (
                  <label key={m.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 8px", cursor: "pointer", borderRadius: "6px", color: sel.includes(m.id) ? "var(--text-heading)" : "var(--text-secondary)", fontSize: "14px" }}>
                    <input type="checkbox" checked={sel.includes(m.id)} onChange={() => tog(m.id)} style={{ accentColor: "var(--accent)" }} />{m.firstName} {m.lastName}<span style={{ marginLeft: "auto" }}><DuesBadge status={getDuesStatus(m)} /></span>
                  </label>
                ))}
              </div>
            </div>
          </div>}
    </Modal>
  );
}
