import { Icons } from "../Icons";
import { BTN, HS, fmtDate, DuesBadge, Stat } from "../ui";

export function PaymentsPage({ mwd, members, setMembers, ac, pc, oc, flash, setShowPM }) {
  const pCols = "2fr 2fr 80px 90px 90px 100px";
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "700", margin: 0 }}>Payments and Dues</h1>
        <div onClick={() => setShowPM(true)} style={{ ...BTN("linear-gradient(135deg,#10b981,#059669)"), display: "flex", alignItems: "center", gap: "6px" }}>
          <Icons.Card />Send Payment Links
        </div>
      </div>
      <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}>
        <Stat icon={Icons.Check} label="Paid" value={pc} color="#34d399" sub={Math.round(pc / Math.max(ac, 1) * 100) + "% of active"} />
        <Stat icon={Icons.Alert} label="Unpaid" value={mwd.filter(m => m._ds === "unpaid" && m.status === "active").length} color="#fbbf24" />
        <Stat icon={Icons.Alert} label="Overdue" value={oc} color="#f87171" />
      </div>
      <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
        <div style={{ padding: "16px 20px", borderBottom: "1px solid #334155" }}>
          <h3 style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", margin: 0 }}>Active Member Dues Status</h3>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: pCols, borderBottom: "1px solid #334155" }}>
          {["Member", "Email", "Dues", "Last Paid", "Next Due", ""].map(h => <div key={h} style={HS}>{h}</div>)}
        </div>
        {mwd.filter(m => m.status === "active").sort((a, b) => ({ overdue: 0, unpaid: 1, paid: 2 }[a._ds] || 1) - ({ overdue: 0, unpaid: 1, paid: 2 }[b._ds] || 1)).map((m, i, arr) => (
          <div key={m.id} style={{ display: "grid", gridTemplateColumns: pCols, borderBottom: i < arr.length - 1 ? "1px solid #334155" : "none", alignItems: "center" }}>
            <div style={{ padding: "12px 16px", color: "#f1f5f9", fontSize: "14px" }}>{m.firstName} {m.lastName}</div>
            <div style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{m.email}</div>
            <div style={{ padding: "12px 16px" }}><DuesBadge status={m._ds} /></div>
            <div style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "12px" }}>{m.lastDuesPaid ? fmtDate(m.lastDuesPaid) : "Never"}</div>
            <div style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "12px" }}>{fmtDate(m._nd)}</div>
            <div style={{ padding: "12px 16px" }}>
              {m._ds !== "paid"
                ? <div onClick={() => { const t = new Date().toISOString().split("T")[0]; fetch("/api/members", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...m, lastDuesPaid: t }) }); setMembers(p => p.map(x => x.id === m.id ? { ...x, lastDuesPaid: t } : x)); flash("Marked paid"); }} style={{ padding: "6px 12px", background: "#065f4633", border: "1px solid #065f46", borderRadius: "6px", color: "#34d399", cursor: "pointer", fontSize: "12px", fontWeight: "500", display: "inline-block" }}>Mark Paid</div>
                : <div onClick={() => { fetch("/api/members", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...m, lastDuesPaid: "" }) }); setMembers(p => p.map(x => x.id === m.id ? { ...x, lastDuesPaid: "" } : x)); flash("Marked unpaid"); }} style={{ padding: "6px 12px", background: "#334155", borderRadius: "6px", color: "#94a3b8", cursor: "pointer", fontSize: "12px", display: "inline-block" }}>Mark Unpaid</div>}
            </div>
          </div>
        ))}
      </div>
      <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", padding: "24px", marginTop: "20px" }}>
        <h3 style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", margin: "0 0 12px" }}>Stripe Setup Info</h3>
        <div style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "1.7" }}>
          <p style={{ margin: "0 0 8px" }}>Via <strong style={{ color: "#cbd5e1" }}>Stripe</strong> (2.9% + $0.30/txn)</p>
          <p style={{ margin: "0 0 4px" }}>1. Create account at stripe.com</p>
          <p style={{ margin: "0 0 4px" }}>2. Get API keys</p>
          <p style={{ margin: 0 }}>3. Add secret key to env variables</p>
        </div>
      </div>
    </div>
  );
}
