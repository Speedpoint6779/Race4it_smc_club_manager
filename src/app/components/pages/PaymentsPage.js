import { Icons } from "../Icons";
import { BTN, HS, fmtDate, DuesBadge, Stat } from "../ui";
import { PaymentModal } from "../PaymentModal";
import { useState } from "react";

const DUES_ORDER = { overdue: 0, unpaid: 1, paid: 2 };

function sortPayments(list, col, dir) {
  return [...list].sort((a, b) => {
    let av, bv;
    switch (col) {
      case "name":    av = (a.lastName + a.firstName).toLowerCase(); bv = (b.lastName + b.firstName).toLowerCase(); break;
      case "email":   av = (a.email || "").toLowerCase(); bv = (b.email || "").toLowerCase(); break;
      case "dues":    av = DUES_ORDER[a._ds] ?? 99; bv = DUES_ORDER[b._ds] ?? 99; break;
      case "lastPaid":av = a.lastDuesPaid || ""; bv = b.lastDuesPaid || ""; break;
      case "nextDue": av = a._nd || ""; bv = b._nd || ""; break;
      default:        av = DUES_ORDER[a._ds] ?? 99; bv = DUES_ORDER[b._ds] ?? 99;
    }
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

export function PaymentsPage({ mwd, members, setMembers, ac, pc, oc, flash }) {
  const [showPM, setShowPM] = useState(false);
  const [sortCol, setSortCol] = useState("dues");
  const [sortDir, setSortDir] = useState("asc");
  const pCols = "2fr 2fr 80px 90px 90px 100px";

  const handleSort = (col) => {
    if (sortCol === col) {
      setSortDir(d => d === "asc" ? "desc" : "asc");
    } else {
      setSortCol(col);
      setSortDir("asc");
    }
  };

  const colHeader = (label, col) => {
    const isActive = sortCol === col;
    return (
      <div
        key={col}
        onClick={() => handleSort(col)}
        style={{
          ...HS,
          cursor: "pointer",
          userSelect: "none",
          display: "flex",
          alignItems: "center",
          gap: "3px",
          color: isActive ? "var(--col-header-active)" : "var(--col-header-inactive)",
        }}
      >
        {label}
        <span style={{ fontSize: "9px", color: isActive ? "var(--col-header-active)" : "var(--col-header-arrow-inactive)" }}>
          {isActive ? (sortDir === "asc" ? "▲" : "▼") : "⇅"}
        </span>
      </div>
    );
  };

  const active = mwd.filter(m => m.status === "active");
  const sorted = sortPayments(active, sortCol, sortDir);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ color: "var(--text-heading)", fontSize: "26px", fontWeight: "700", margin: 0 }}>Payments and Dues</h1>
        <div onClick={() => setShowPM(true)} style={{ ...BTN("var(--green-gradient)"), display: "flex", alignItems: "center", gap: "6px" }}>
          <Icons.Card />Send Payment Links
        </div>
      </div>
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <Stat icon={Icons.Check} label="Paid" value={pc} color="#34d399" sub={Math.round(pc / Math.max(ac, 1) * 100) + "% of active"} />
        <Stat icon={Icons.Alert} label="Unpaid" value={mwd.filter(m => m._ds === "unpaid" && m.status === "active").length} color="#fbbf24" />
        <Stat icon={Icons.Alert} label="Overdue" value={oc} color="#f87171" />
      </div>
      <div style={{ background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid var(--border)" }}>
          <h3 style={{ color: "var(--text-heading)", fontSize: "16px", fontWeight: "600", margin: 0 }}>Active Member Dues Status</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: pCols, borderBottom: "1px solid var(--border)" }}>
          {colHeader("Member", "name")}
          {colHeader("Email", "email")}
          {colHeader("Dues", "dues")}
          {colHeader("Last Paid", "lastPaid")}
          {colHeader("Next Due", "nextDue")}
          <div style={HS} />
        </div>
        {sorted.map((m, i, arr) => (
          <div key={m.id} style={{ display: "grid", gridTemplateColumns: pCols, borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center" }}>
            <div style={{ padding: "12px 16px", color: "var(--text-heading)", fontSize: "15px" }}>{m.firstName} {m.lastName}</div>
            <div style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "14px" }}>{m.email}</div>
            <div style={{ padding: "12px 16px" }}><DuesBadge status={m._ds} /></div>
            <div style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "13px" }}>{m.lastDuesPaid ? fmtDate(m.lastDuesPaid) : "Never"}</div>
            <div style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "13px" }}>{fmtDate(m._nd)}</div>
            <div style={{ padding: "12px 16px" }}>
              {m._ds !== "paid"
                ? <div onClick={() => { const t = new Date().toISOString().split("T")[0]; fetch("/api/members", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...m, lastDuesPaid: t }) }); setMembers(p => p.map(x => x.id === m.id ? { ...x, lastDuesPaid: t } : x)); flash("Marked paid"); }} style={{ padding: "6px 12px", background: "var(--btn-paid-bg)", border: "1px solid var(--btn-paid-border)", borderRadius: "6px", color: "var(--btn-paid-text)", cursor: "pointer", fontSize: "13px", fontWeight: "500", display: "inline-block" }}>Mark Paid</div>
                : <div onClick={() => { fetch("/api/members", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...m, lastDuesPaid: "" }) }); setMembers(p => p.map(x => x.id === m.id ? { ...x, lastDuesPaid: "" } : x)); flash("Marked unpaid"); }} style={{ padding: "6px 12px", background: "var(--btn-secondary-bg)", borderRadius: "6px", color: "var(--text-secondary)", cursor: "pointer", fontSize: "13px", display: "inline-block" }}>Mark Unpaid</div>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border)", padding: "24px", marginTop: "20px" }}>
        <h3 style={{ color: "var(--text-heading)", fontSize: "16px", fontWeight: "600", margin: "0 0 12px" }}>Stripe Setup Info</h3>
        <div style={{ color: "var(--text-secondary)", fontSize: "15px", lineHeight: "1.7" }}>
          <p style={{ margin: "0 0 8px" }}>Via <strong style={{ color: "var(--text-primary)" }}>Stripe</strong> (2.9% + $0.30/txn)</p>
          <p style={{ margin: "0 0 4px" }}>1. Create account at stripe.com</p>
          <p style={{ margin: "0 0 4px" }}>2. Get API keys</p>
          <p style={{ margin: 0 }}>3. Add secret key to env variables</p>
        </div>
      </div>
      {showPM && <PaymentModal members={members} onClose={() => setShowPM(false)} />}
    </div>
  );
}
