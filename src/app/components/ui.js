"use client";
import { Icons } from "./Icons";

export const DUES_AMOUNT = 50;
export const SHEET_URL = "https://docs.google.com/spreadsheets/d/1exqw96PYtGnta0BC4bwGkumSIvZAkpMJQ5iI--ucuTY/edit?gid=1762403654#gid=1762403654";

export const IS = { width: "100%", padding: "10px 14px", background: "var(--bg-input)", border: "1px solid var(--border)", borderRadius: "8px", color: "var(--text-primary)", fontSize: "15px", outline: "none", boxSizing: "border-box" };
export const LS = { display: "block", color: "var(--text-secondary)", fontSize: "14px", fontWeight: "500", marginBottom: "6px" };
export const BTN = (bg, c) => ({ padding: "10px 20px", background: bg, color: c || "white", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer" });
export const HS = { padding: "12px 14px", color: "var(--col-header-inactive)", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em" };

export const fmtDate = d => { if (!d) return ""; const [y, m, day] = d.split("-"); return m + "/" + day + "/" + y.slice(2); };

export function getDuesStatus(m) {
  const now = new Date(), jd = new Date(m.joinDate + "T00:00:00"), lp = m.lastDuesPaid ? new Date(m.lastDuesPaid + "T00:00:00") : null;
  let nd = new Date(jd); nd.setFullYear(now.getFullYear());
  if (nd < jd) nd.setFullYear(nd.getFullYear() + 1);
  if (nd > now) nd.setFullYear(nd.getFullYear() - 1);
  if (nd < jd) return "paid";
  if (!lp) return (now - nd) / (864e5) > 30 ? "overdue" : "unpaid";
  if (lp >= nd) return "paid";
  return (now - nd) / (864e5) > 30 ? "overdue" : "unpaid";
}

export function getNextDue(m) {
  const now = new Date(), jd = new Date(m.joinDate + "T00:00:00");
  let nd = new Date(jd); nd.setFullYear(now.getFullYear());
  if (nd <= now) nd.setFullYear(nd.getFullYear() + 1);
  if (nd < jd) nd = new Date(jd);
  return nd.toISOString().split("T")[0];
}

export function DuesBadge({ status }) {
  const s = { paid: { bg: "var(--badge-paid-bg)", c: "var(--badge-paid-text)" }, unpaid: { bg: "var(--badge-unpaid-bg)", c: "var(--badge-unpaid-text)" }, overdue: { bg: "var(--badge-overdue-bg)", c: "var(--badge-overdue-text)" } }[status] || { bg: "var(--badge-unpaid-bg)", c: "var(--badge-unpaid-text)" };
  return <span style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "99px", fontWeight: "600", background: s.bg, color: s.c, textTransform: "capitalize" }}>{status}</span>;
}

export function Stat({ icon: I, label, value, color, sub }) {
  return (
    <div style={{ background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border)", padding: "20px", flex: "1", minWidth: "130px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "12px" }}>
        <div style={{ color }}><I /></div>
        <span style={{ color: "var(--text-secondary)", fontSize: "14px" }}>{label}</span>
      </div>
      <div style={{ color: "var(--stat-value)", fontSize: "28px", fontWeight: "700" }}>{value}</div>
      {sub && <div style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "4px" }}>{sub}</div>}
    </div>
  );
}

export function Modal({ title, onClose, children, footer }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--modal-overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: "var(--modal-bg)", borderRadius: "16px", border: "1px solid var(--border)", width: "100%", maxWidth: "560px", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid var(--border)" }}>
          <h2 style={{ color: "var(--text-heading)", fontSize: "19px", fontWeight: "600", margin: 0 }}>{title}</h2>
          <div onClick={onClose} style={{ color: "var(--text-secondary)", cursor: "pointer", padding: "4px" }}><Icons.X /></div>
        </div>
        <div style={{ padding: "24px" }}>{children}</div>
        {footer && <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", padding: "20px 24px", borderTop: "1px solid var(--border)" }}>{footer}</div>}
      </div>
    </div>
  );
}

export function Confirm({ title, msg, onOk, onNo }) {
  return (
    <div style={{ position: "fixed", inset: 0, background: "var(--modal-overlay)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "20px" }}>
      <div style={{ background: "var(--modal-bg)", borderRadius: "16px", border: "1px solid var(--border)", width: "100%", maxWidth: "400px", padding: "24px" }}>
        <h3 style={{ color: "var(--text-heading)", fontSize: "17px", margin: "0 0 8px" }}>{title}</h3>
        <p style={{ color: "var(--text-secondary)", fontSize: "15px", margin: "0 0 24px", lineHeight: "1.5" }}>{msg}</p>
        <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px" }}>
          <div onClick={onNo} style={BTN("var(--btn-secondary-bg)", "var(--btn-secondary-text)")}>Cancel</div>
          <div onClick={onOk} style={BTN("var(--btn-danger)")}>Delete</div>
        </div>
      </div>
    </div>
  );
}
