import { useState } from "react";
import { Icons } from "../Icons";
import { DUES_AMOUNT, IS, BTN, HS, fmtDate, DuesBadge } from "../ui";
import { MemberModal, DetailModal } from "../MemberModal";
import { EmailModal } from "../EmailModal";
import { Confirm } from "../ui";

const DUES_ORDER = { paid: 0, unpaid: 1, overdue: 2 };

function sortMembers(list, col, dir) {
  if (!col) return list;
  return [...list].sort((a, b) => {
    let av, bv;
    switch (col) {
      case "name":    av = (a.lastName + a.firstName).toLowerCase(); bv = (b.lastName + b.firstName).toLowerCase(); break;
      case "email":   av = (a.email || "").toLowerCase(); bv = (b.email || "").toLowerCase(); break;
      case "city":    av = (a.city || "").toLowerCase(); bv = (b.city || "").toLowerCase(); break;
      case "status":  av = a.status || ""; bv = b.status || ""; break;
      case "dues":    av = DUES_ORDER[a._ds] ?? 99; bv = DUES_ORDER[b._ds] ?? 99; break;
      case "lastPaid":av = a.lastDuesPaid || ""; bv = b.lastDuesPaid || ""; break;
      case "nextDue": av = a._nd || ""; bv = b._nd || ""; break;
      default: return 0;
    }
    if (av < bv) return dir === "asc" ? -1 : 1;
    if (av > bv) return dir === "asc" ? 1 : -1;
    return 0;
  });
}

export function MembersPage({ mwd, members, setMembers, flash }) {
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState("all");
  const [mViewSize, setMViewSize] = useState(20);
  const [showMM, setShowMM] = useState(false);
  const [editM, setEditM] = useState(null);
  const [viewM, setViewM] = useState(null);
  const [showEM, setShowEM] = useState(false);
  const [emailPre, setEmailPre] = useState([]);
  const [confDel, setConfDel] = useState(null);
  const [selMode, setSelMode] = useState(false);
  const [sel, setSel] = useState([]);
  const [sortCol, setSortCol] = useState("name");
  const [sortDir, setSortDir] = useState("asc");

  const tog = id => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const mCols = selMode ? "40px 2fr 2fr 1.2fr 80px 70px 80px 80px 90px" : "2fr 2fr 1.2fr 80px 70px 80px 80px 90px";

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

  const filtered = mwd.filter(m => {
    const ms = (m.firstName + " " + m.lastName + " " + m.email + " " + m.city).toLowerCase().includes(search.toLowerCase());
    const mf = filter === "all" || (filter === "active" && m.status === "active") || (filter === "inactive" && m.status === "inactive") || (filter === "unpaid" && m._ds !== "paid") || (filter === "overdue" && m._ds === "overdue");
    return ms && mf;
  });

  const fm = sortMembers(filtered, sortCol, sortDir);

  const saveM = async (m) => {
    const isEdit = members.find(x => x.id === m.id);
    if (isEdit) { await fetch("/api/members", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(m) }); setMembers(p => p.map(x => x.id === m.id ? m : x)); }
    else { const r = await fetch("/api/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(m) }); const d = await r.json(); setMembers(p => [...p, { ...m, id: d.id }]); }
    setShowMM(false); setEditM(null); flash(isEdit ? "Member updated" : "Member added");
  };
  const delM = async (id) => {
    await fetch("/api/members", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setMembers(p => p.filter(m => m.id !== id)); setConfDel(null); flash("Member removed");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <h1 style={{ color: "var(--text-heading)", fontSize: "26px", fontWeight: "700", margin: 0 }}>Members</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          {selMode
            ? <><div onClick={() => { if (sel.length > 0) { setEmailPre(sel); setShowEM(true); setSelMode(false); setSel([]); } }} style={{ ...BTN(sel.length > 0 ? "var(--accent-gradient)" : "var(--btn-secondary-bg)"), display: "flex", alignItems: "center", gap: "6px", opacity: sel.length > 0 ? 1 : 0.5 }}><Icons.Mail />{"Email " + sel.length + " Selected"}</div><div onClick={() => { setSelMode(false); setSel([]); }} style={BTN("var(--btn-secondary-bg)", "var(--btn-secondary-text)")}>Cancel</div></>
            : <><div onClick={() => { setSelMode(true); setSel([]); }} style={{ ...BTN("var(--btn-secondary-bg)", "var(--btn-secondary-text)"), display: "flex", alignItems: "center", gap: "6px" }}><Icons.List />Select and Email</div><div onClick={() => { setEditM(null); setShowMM(true); }} style={{ ...BTN("var(--accent-gradient)"), display: "flex", alignItems: "center", gap: "6px" }}><Icons.Plus />Add Member</div></>}
        </div>
      </div>
      {selMode && <div style={{ background: "var(--accent-bg)", border: "1px solid var(--accent-border)", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ color: "var(--accent-text)", fontSize: "14px" }}>Click rows to select. {sel.length} selected.</span><div style={{ display: "flex", gap: "8px" }}><span onClick={() => setSel(fm.map(m => m.id))} style={{ color: "var(--accent)", fontSize: "13px", cursor: "pointer" }}>Select All</span><span onClick={() => setSel([])} style={{ color: "var(--text-secondary)", fontSize: "13px", cursor: "pointer" }}>Clear</span></div></div>}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}><div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }}><Icons.Search /></div><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ ...IS, paddingLeft: "38px", background: "var(--bg-card)" }} /></div>
        {["all", "active", "inactive", "unpaid", "overdue"].map(f => <div key={f} onClick={() => setFilter(f)} style={{ padding: "10px 16px", border: "1px solid", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "500", textTransform: "capitalize", background: filter === f ? "var(--accent-bg)" : "var(--bg-card)", borderColor: filter === f ? "var(--accent)" : "var(--border)", color: filter === f ? "var(--accent-text)" : "var(--text-secondary)" }}>{f}</div>)}
      </div>
      <div style={{ background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border)", overflow: "hidden" }}>
        {/* Header row */}
        <div style={{ display: "grid", gridTemplateColumns: mCols, borderBottom: "1px solid var(--border)" }}>
          {selMode && <div style={HS} />}
          {colHeader("Name", "name")}
          {colHeader("Email", "email")}
          {colHeader("City", "city")}
          {colHeader("Status", "status")}
          {colHeader("Dues", "dues")}
          {colHeader("Last Paid", "lastPaid")}
          {colHeader("Next Due", "nextDue")}
          <div style={HS} />
        </div>
        <div style={{ maxHeight: (mViewSize * 48) + "px", overflowY: "auto" }}>
          {fm.map((m, i) => { const s = sel.includes(m.id); return (
            <div key={m.id} onClick={() => { if (selMode) tog(m.id); }} style={{ display: "grid", gridTemplateColumns: mCols, borderBottom: i < fm.length - 1 ? "1px solid var(--border)" : "none", cursor: selMode ? "pointer" : "default", background: s ? "var(--bg-selected)" : "transparent", alignItems: "center" }}>
              {selMode && <div style={{ padding: "12px", textAlign: "center" }}><input type="checkbox" checked={s} onChange={() => tog(m.id)} style={{ accentColor: "var(--accent)" }} /></div>}
              <div style={{ padding: "12px 14px" }}><div onClick={e => { if (!selMode) { e.stopPropagation(); setViewM(m); } }} style={{ cursor: selMode ? "default" : "pointer" }}><div style={{ color: "var(--text-heading)", fontSize: "15px", fontWeight: "500" }}>{m.firstName} {m.lastName}</div>{m.notes && <div style={{ color: "var(--text-muted)", fontSize: "12px", marginTop: "2px" }}>{m.notes}</div>}</div></div>
              <div style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: "14px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
              <div style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: "14px" }}>{m.city}{m.state ? ", " + m.state : ""}</div>
              <div style={{ padding: "12px 14px" }}><span style={{ fontSize: "12px", padding: "3px 10px", borderRadius: "99px", fontWeight: "600", textTransform: "capitalize", background: m.status === "active" ? "var(--badge-active-bg)" : "var(--badge-inactive-bg)", color: m.status === "active" ? "var(--badge-active-text)" : "var(--badge-inactive-text)" }}>{m.status}</span></div>
              <div style={{ padding: "12px 14px" }}><DuesBadge status={m._ds} /></div>
              <div style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: "13px" }}>{m.lastDuesPaid ? fmtDate(m.lastDuesPaid) : "--"}</div>
              <div style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: "13px" }}>{fmtDate(m._nd)}</div>
              <div style={{ padding: "12px 14px" }}>{!selMode && <div style={{ display: "flex", gap: "4px" }}>
                {m._ds !== "paid" && <div onClick={e => { e.stopPropagation(); const t = new Date().toISOString().split("T")[0]; fetch("/api/members", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...m, lastDuesPaid: t }) }); setMembers(p => p.map(x => x.id === m.id ? { ...x, lastDuesPaid: t } : x)); flash("Marked paid"); }} style={{ padding: "5px 8px", background: "var(--btn-paid-bg)", border: "1px solid var(--btn-paid-border)", borderRadius: "6px", color: "var(--btn-paid-text)", cursor: "pointer", fontSize: "12px", fontWeight: "500" }}>Paid</div>}
                <div onClick={e => { e.stopPropagation(); setEditM(m); setShowMM(true); }} style={{ padding: "5px 8px", background: "var(--btn-secondary-bg)", borderRadius: "6px", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Edit /></div>
                <div onClick={e => { e.stopPropagation(); setConfDel(m); }} style={{ padding: "5px 8px", background: "var(--btn-secondary-bg)", borderRadius: "6px", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Trash /></div>
              </div>}</div>
            </div>
          ); })}
          {fm.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No members found</div>}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
        <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>{fm.length + " members"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ color: "var(--text-muted)", fontSize: "13px" }}>Rows visible:</span>{[10, 20, 50].map(n => <div key={n} onClick={() => setMViewSize(n)} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "13px", cursor: "pointer", background: mViewSize === n ? "var(--accent-bg)" : "var(--bg-card)", border: "1px solid", borderColor: mViewSize === n ? "var(--accent)" : "var(--border)", color: mViewSize === n ? "var(--accent-text)" : "var(--text-secondary)" }}>{n}</div>)}</div>
      </div>
      <div style={{ marginTop: "4px", color: "var(--text-muted)", fontSize: "13px" }}>{"Dues: $" + DUES_AMOUNT + "/year, due on join anniversary date"}</div>

      {showMM && <MemberModal member={editM} onSave={saveM} onClose={() => { setShowMM(false); setEditM(null); }} />}
      {viewM && <DetailModal member={viewM} onClose={() => setViewM(null)} />}
      {showEM && <EmailModal members={members} pre={emailPre} onClose={() => setShowEM(false)} onSend={() => flash("Emails sent")} />}
      {confDel && <Confirm title="Delete Member" msg={"Remove " + confDel.firstName + " " + confDel.lastName + "?"} onOk={() => delM(confDel.id)} onNo={() => setConfDel(null)} />}
    </div>
  );
}
