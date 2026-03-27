import { useState } from "react";
import { Icons } from "../Icons";
import { DUES_AMOUNT, IS, BTN, HS, fmtDate, DuesBadge } from "../ui";
import { MemberModal, DetailModal } from "../MemberModal";
import { EmailModal } from "../EmailModal";
import { Confirm } from "../ui";

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

  const tog = id => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const mCols = selMode ? "40px 2fr 2fr 1.2fr 80px 70px 80px 80px 90px" : "2fr 2fr 1.2fr 80px 70px 80px 80px 90px";

  const fm = mwd.filter(m => {
    const ms = (m.firstName + " " + m.lastName + " " + m.email + " " + m.city).toLowerCase().includes(search.toLowerCase());
    const mf = filter === "all" || (filter === "active" && m.status === "active") || (filter === "inactive" && m.status === "inactive") || (filter === "unpaid" && m._ds !== "paid") || (filter === "overdue" && m._ds === "overdue");
    return ms && mf;
  });

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
        <h1 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "700", margin: 0 }}>Members</h1>
        <div style={{ display: "flex", gap: "8px" }}>
          {selMode
            ? <><div onClick={() => { if (sel.length > 0) { setEmailPre(sel); setShowEM(true); setSelMode(false); setSel([]); } }} style={{ ...BTN(sel.length > 0 ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "#334155"), display: "flex", alignItems: "center", gap: "6px", opacity: sel.length > 0 ? 1 : 0.5 }}><Icons.Mail />{"Email " + sel.length + " Selected"}</div><div onClick={() => { setSelMode(false); setSel([]); }} style={BTN("#334155", "#cbd5e1")}>Cancel</div></>
            : <><div onClick={() => { setSelMode(true); setSel([]); }} style={{ ...BTN("#334155", "#cbd5e1"), display: "flex", alignItems: "center", gap: "6px" }}><Icons.List />Select and Email</div><div onClick={() => { setEditM(null); setShowMM(true); }} style={{ ...BTN("linear-gradient(135deg,#3b82f6,#6366f1)"), display: "flex", alignItems: "center", gap: "6px" }}><Icons.Plus />Add Member</div></>}
        </div>
      </div>
      {selMode && <div style={{ background: "#1e40af20", border: "1px solid #3b82f640", borderRadius: "10px", padding: "12px 16px", marginBottom: "16px", display: "flex", alignItems: "center", justifyContent: "space-between" }}><span style={{ color: "#93c5fd", fontSize: "13px" }}>Click rows to select. {sel.length} selected.</span><div style={{ display: "flex", gap: "8px" }}><span onClick={() => setSel(fm.map(m => m.id))} style={{ color: "#3b82f6", fontSize: "12px", cursor: "pointer" }}>Select All</span><span onClick={() => setSel([])} style={{ color: "#94a3b8", fontSize: "12px", cursor: "pointer" }}>Clear</span></div></div>}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <div style={{ position: "relative", flex: 1, minWidth: "200px" }}><div style={{ position: "absolute", left: "14px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }}><Icons.Search /></div><input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ ...IS, paddingLeft: "38px", background: "#1e293b" }} /></div>
        {["all", "active", "inactive", "unpaid", "overdue"].map(f => <div key={f} onClick={() => setFilter(f)} style={{ padding: "10px 16px", border: "1px solid", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: "500", textTransform: "capitalize", background: filter === f ? "#3b82f620" : "#1e293b", borderColor: filter === f ? "#3b82f6" : "#334155", color: filter === f ? "#93c5fd" : "#94a3b8" }}>{f}</div>)}
      </div>
      <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: mCols, borderBottom: "1px solid #334155" }}>{selMode && <div style={HS} />}{["Name", "Email", "City", "Status", "Dues", "Last Paid", "Next Due", ""].map(h => <div key={h} style={HS}>{h}</div>)}</div>
        <div style={{ maxHeight: (mViewSize * 44) + "px", overflowY: "auto" }}>
          {fm.map((m, i) => { const s = sel.includes(m.id); return (
            <div key={m.id} onClick={() => { if (selMode) tog(m.id); }} style={{ display: "grid", gridTemplateColumns: mCols, borderBottom: i < fm.length - 1 ? "1px solid #334155" : "none", cursor: selMode ? "pointer" : "default", background: s ? "#3b82f615" : "transparent", alignItems: "center" }}>
              {selMode && <div style={{ padding: "12px", textAlign: "center" }}><input type="checkbox" checked={s} onChange={() => tog(m.id)} style={{ accentColor: "#3b82f6" }} /></div>}
              <div style={{ padding: "12px 14px" }}><div onClick={e => { if (!selMode) { e.stopPropagation(); setViewM(m); } }} style={{ cursor: selMode ? "default" : "pointer" }}><div style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "500" }}>{m.firstName} {m.lastName}</div>{m.notes && <div style={{ color: "#64748b", fontSize: "11px", marginTop: "2px" }}>{m.notes}</div>}</div></div>
              <div style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{m.email}</div>
              <div style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "13px" }}>{m.city}{m.state ? ", " + m.state : ""}</div>
              <div style={{ padding: "12px 14px" }}><span style={{ fontSize: "11px", padding: "3px 10px", borderRadius: "99px", fontWeight: "600", textTransform: "capitalize", background: m.status === "active" ? "#065f4633" : "#78350f33", color: m.status === "active" ? "#34d399" : "#fbbf24" }}>{m.status}</span></div>
              <div style={{ padding: "12px 14px" }}><DuesBadge status={m._ds} /></div>
              <div style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "12px" }}>{m.lastDuesPaid ? fmtDate(m.lastDuesPaid) : "--"}</div>
              <div style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "12px" }}>{fmtDate(m._nd)}</div>
              <div style={{ padding: "12px 14px" }}>{!selMode && <div style={{ display: "flex", gap: "4px" }}>
                {m._ds !== "paid" && <div onClick={e => { e.stopPropagation(); const t = new Date().toISOString().split("T")[0]; fetch("/api/members", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...m, lastDuesPaid: t }) }); setMembers(p => p.map(x => x.id === m.id ? { ...x, lastDuesPaid: t } : x)); flash("Marked paid"); }} style={{ padding: "5px 8px", background: "#065f4633", border: "1px solid #065f46", borderRadius: "6px", color: "#34d399", cursor: "pointer", fontSize: "11px", fontWeight: "500" }}>Paid</div>}
                <div onClick={e => { e.stopPropagation(); setEditM(m); setShowMM(true); }} style={{ padding: "5px 8px", background: "#334155", borderRadius: "6px", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Edit /></div>
                <div onClick={e => { e.stopPropagation(); setConfDel(m); }} style={{ padding: "5px 8px", background: "#334155", borderRadius: "6px", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Trash /></div>
              </div>}</div>
            </div>
          ); })}
          {fm.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No members found</div>}
        </div>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
        <div style={{ color: "#64748b", fontSize: "12px" }}>{fm.length + " members"}</div>
        <div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ color: "#64748b", fontSize: "12px" }}>Rows visible:</span>{[10, 20, 50].map(n => <div key={n} onClick={() => setMViewSize(n)} style={{ padding: "4px 10px", borderRadius: "6px", fontSize: "12px", cursor: "pointer", background: mViewSize === n ? "#3b82f620" : "#1e293b", border: "1px solid", borderColor: mViewSize === n ? "#3b82f6" : "#334155", color: mViewSize === n ? "#93c5fd" : "#94a3b8" }}>{n}</div>)}</div>
      </div>
      <div style={{ marginTop: "4px", color: "#64748b", fontSize: "12px" }}>{"Dues: $" + DUES_AMOUNT + "/year, due on join anniversary date"}</div>

      {showMM && <MemberModal member={editM} onSave={saveM} onClose={() => { setShowMM(false); setEditM(null); }} />}
      {viewM && <DetailModal member={viewM} onClose={() => setViewM(null)} />}
      {showEM && <EmailModal members={members} pre={emailPre} onClose={() => setShowEM(false)} onSend={() => flash("Emails sent")} />}
      {confDel && <Confirm title="Delete Member" msg={"Remove " + confDel.firstName + " " + confDel.lastName + "?"} onOk={() => delM(confDel.id)} onNo={() => setConfDel(null)} />}
    </div>
  );
}
