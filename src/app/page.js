"use client";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Icons } from "./components/Icons";
import { DUES_AMOUNT, SHEET_URL, IS, LS, BTN, HS, fmtDate, getDuesStatus, getNextDue, DuesBadge, Stat, Confirm } from "./components/ui";
import { MemberModal, DetailModal } from "./components/MemberModal";
import { SpeakerModal } from "./components/SpeakerModal";
import { EmailModal } from "./components/EmailModal";
import { PaymentModal } from "./components/PaymentModal";
import { UserModal } from "./components/UserModal";

export default function App() {
  const [user, setUser] = useState(null);
  const [un, setUn] = useState(""); const [pw, setPw] = useState(""); const [le, setLe] = useState("");
  const [pg, setPg] = useState("dashboard");
  const [members, setMembers] = useState([]); const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true); const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    fetch("/api/members").then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length > 0) { setMembers(data); setLoading(false); }
      else { fetch("/api/seed").then(r => r.json()).then(() => fetch("/api/members").then(r => r.json()).then(d => { if (Array.isArray(d)) setMembers(d); setLoading(false); })).catch(() => setLoading(false)); }
    }).catch(() => setLoading(false));
    fetch("/api/users").then(r => r.json()).then(d => { if (Array.isArray(d)) setAppUsers(d); }).catch(() => {});
    fetch("/api/speakers").then(r => r.json()).then(data => {
      if (Array.isArray(data) && data.length > 0) { setSpeakers(data); }
      else { fetch("/api/speakers/sync", { method: "POST" }).then(r => r.json()).then(() => fetch("/api/speakers").then(r => r.json()).then(d => { if (Array.isArray(d)) setSpeakers(d); })).catch(() => {}); }
    }).catch(() => {});
  }, []);

  const [search, setSearch] = useState(""); const [filter, setFilter] = useState("all"); const [mViewSize, setMViewSize] = useState(20);
  const [showMM, setShowMM] = useState(false); const [editM, setEditM] = useState(null); const [viewM, setViewM] = useState(null);
  const [showEM, setShowEM] = useState(false); const [emailPre, setEmailPre] = useState([]);
  const [showPM, setShowPM] = useState(false); const [showSM, setShowSM] = useState(false); const [editS, setEditS] = useState(null);
  const [confDel, setConfDel] = useState(null); const [confDelS, setConfDelS] = useState(null);
  const [appUsers, setAppUsers] = useState([]); const [showUM, setShowUM] = useState(false); const [editU, setEditU] = useState(null); const [confDelU, setConfDelU] = useState(null);
  const [toast, setToast] = useState(null); const [selMode, setSelMode] = useState(false); const [sel, setSel] = useState([]); const [spFil, setSpFil] = useState("upcoming");

  const flash = useCallback(m => { setToast(m); setTimeout(() => setToast(null), 3000); }, []);
  const login = async () => {
    if (!un.trim() || !pw.trim()) { setLe("Please enter username and password"); return; }
    try {
      const r = await fetch("/api/auth", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ username: un.trim(), password: pw.trim() }) });
      const d = await r.json();
      if (r.ok) { setUser(d.name); setLe(""); } else { setLe(d.error || "Invalid credentials"); }
    } catch (e) { setLe("Login failed"); }
  };

  const mwd = useMemo(() => members.map(m => ({ ...m, _ds: getDuesStatus(m), _nd: getNextDue(m) })), [members]);

  if (loading) return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "11px", fontWeight: "800", margin: "0 auto 16px" }}>SMC</div>
        <div style={{ color: "#94a3b8", fontSize: "14px" }}>Loading members...</div>
      </div>
    </div>
  );

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg,#0f172a 0%,#1e293b 50%,#0f172a 100%)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "400px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "56px", height: "56px", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 8px 32px rgba(59,130,246,0.3)", color: "white", fontSize: "14px", fontWeight: "800" }}>SMC</div>
          <h1 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "700", margin: "0 0 4px" }}>SMC Club Manager</h1>
          <p style={{ color: "#94a3b8", fontSize: "14px", margin: 0 }}>Sign in to manage your club</p>
        </div>
        <div style={{ background: "#1e293b", borderRadius: "16px", padding: "32px", border: "1px solid #334155", boxShadow: "0 20px 60px rgba(0,0,0,0.3)" }}>
          {le && <div style={{ background: "#7f1d1d33", border: "1px solid #991b1b", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "#fca5a5", fontSize: "13px" }}>{le}</div>}
          <div style={{ marginBottom: "16px" }}><label style={LS}>Username</label><input type="text" value={un} onChange={e => { setUn(e.target.value); setLe(""); }} onKeyDown={e => { if (e.key === "Enter") login(); }} placeholder="Enter username" style={IS} /></div>
          <div style={{ marginBottom: "24px" }}><label style={LS}>Password</label><input type="password" value={pw} onChange={e => { setPw(e.target.value); setLe(""); }} onKeyDown={e => { if (e.key === "Enter") login(); }} placeholder="Enter password" style={IS} /></div>
          <div onClick={login} style={{ width: "100%", padding: "12px", background: "linear-gradient(135deg,#3b82f6,#6366f1)", color: "white", borderRadius: "8px", fontSize: "14px", fontWeight: "600", cursor: "pointer", textAlign: "center", boxSizing: "border-box" }}>Sign In</div>
          <p style={{ textAlign: "center", color: "#64748b", fontSize: "12px", marginTop: "16px" }}>Default: admin / admin123</p>
        </div>
      </div>
    </div>
  );

  const fm = mwd.filter(m => {
    const ms = (m.firstName + " " + m.lastName + " " + m.email + " " + m.city).toLowerCase().includes(search.toLowerCase());
    const mf = filter === "all" || (filter === "active" && m.status === "active") || (filter === "inactive" && m.status === "inactive") || (filter === "unpaid" && m._ds !== "paid") || (filter === "overdue" && m._ds === "overdue");
    return ms && mf;
  });
  const ac = mwd.filter(m => m.status === "active").length;
  const pc = mwd.filter(m => m._ds === "paid" && m.status === "active").length;
  const oc = mwd.filter(m => m._ds === "overdue").length;

  const saveM = async (m) => {
    const isEdit = members.find(x => x.id === m.id);
    if (isEdit) { await fetch("/api/members", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(m) }); setMembers(p => p.map(x => x.id === m.id ? m : x)); }
    else { const r = await fetch("/api/members", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(m) }); const d = await r.json(); setMembers(p => [...p, { ...m, id: d.id }]); }
    setShowMM(false); setEditM(null); flash(isEdit ? "Member updated" : "Member added");
  };
  const delM = async (id) => { await fetch("/api/members", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); setMembers(p => p.filter(m => m.id !== id)); setConfDel(null); flash("Member removed"); };
  const saveS = async (s) => {
    const isEdit = speakers.find(x => x.id === s.id);
    if (isEdit) { await fetch("/api/speakers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }); setSpeakers(p => p.map(x => x.id === s.id ? s : x)); }
    else { const r = await fetch("/api/speakers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }); const d = await r.json(); setSpeakers(p => [...p, { ...s, id: d.id || s.id }].sort((a, b) => a.date.localeCompare(b.date))); }
    setShowSM(false); setEditS(null); flash(isEdit ? "Speaker updated" : "Speaker added");
  };
  const delS = async (id) => { await fetch("/api/speakers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); setSpeakers(p => p.filter(s => s.id !== id)); setConfDelS(null); flash("Speaker removed"); };
  const syncFromSheet = async () => {
    setSyncing(true);
    try { await fetch("/api/speakers/sync", { method: "POST" }); const r = await fetch("/api/speakers"); const d = await r.json(); if (Array.isArray(d)) setSpeakers(d); flash("Speakers synced from Google Sheet"); }
    catch (e) { flash("Sync failed"); } finally { setSyncing(false); }
  };
  const saveU = async (u) => {
    const isEdit = appUsers.find(x => x.id === u.id);
    if (isEdit) { const r = await fetch("/api/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) }); if (!r.ok) { const d = await r.json(); flash(d.error || "Error"); return; } setAppUsers(p => p.map(x => x.id === u.id ? { ...x, name: u.name, username: u.username } : x)); }
    else { const r = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) }); const d = await r.json(); if (!r.ok) { flash(d.error || "Error"); return; } setAppUsers(p => [...p, { id: d.id, name: u.name, username: u.username, createdAt: new Date().toISOString().split("T")[0] }]); }
    setShowUM(false); setEditU(null); flash(isEdit ? "User updated" : "User added");
  };
  const delU = async (id) => { const r = await fetch("/api/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) }); if (!r.ok) { const d = await r.json(); flash(d.error || "Error"); return; } setAppUsers(p => p.filter(u => u.id !== id)); setConfDelU(null); flash("User removed"); };
  const tog = id => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const today = new Date().toISOString().split("T")[0];
  const fsp = speakers.filter(s => { if (spFil === "upcoming") return s.date >= today; if (spFil === "past") return s.date < today; if (spFil === "open") return s.date >= today && !s.noMeeting && !s.speaker; return true; });
  const nextSpeakers = speakers.filter(s => s.date >= today && !s.noMeeting && s.speaker).slice(0, 3);
  const openSlots = speakers.filter(s => s.date >= today && !s.noMeeting && !s.speaker).length;
  const navItems = [{ id: "dashboard", label: "Dashboard", icon: Icons.Home }, { id: "members", label: "Members", icon: Icons.Users }, { id: "speakers", label: "Speakers", icon: Icons.Mic }, { id: "email", label: "Email", icon: Icons.Mail }, { id: "payments", label: "Payments", icon: Icons.Dollar }, { id: "users", label: "Users", icon: Icons.Gear }];
  const mCols = selMode ? "40px 2fr 2fr 1.2fr 80px 70px 80px 80px 90px" : "2fr 2fr 1.2fr 80px 70px 80px 80px 90px";
  const sCols = "90px 1.5fr 1.5fr 1.2fr 1.5fr 1.5fr 70px";
  const pCols = "2fr 2fr 80px 90px 90px 100px";

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {toast && <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 2000, background: "#065f46", color: "white", padding: "12px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}><Icons.Check />{toast}</div>}

      {/* Sidebar */}
      <div style={{ width: "220px", background: "#1e293b", borderRight: "1px solid #334155", padding: "20px 0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #334155", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "11px", fontWeight: "800" }}>SMC</div>
            <div><div style={{ color: "#f1f5f9", fontSize: "13px", fontWeight: "700" }}>SMC Club Manager</div><div style={{ color: "#64748b", fontSize: "11px" }}>{members.length} members</div></div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "0 12px" }}>
          {navItems.map(n => <div key={n.id} onClick={() => { setPg(n.id); setSelMode(false); setSel([]); }} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", cursor: "pointer", marginBottom: "4px", fontSize: "14px", fontWeight: pg === n.id ? "600" : "400", background: pg === n.id ? "linear-gradient(135deg,#3b82f620,#6366f120)" : "transparent", color: pg === n.id ? "#93c5fd" : "#94a3b8" }}><n.icon />{n.label}</div>)}
        </nav>
        <div style={{ padding: "16px 12px", borderTop: "1px solid #334155", marginTop: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px" }}>
            <div style={{ width: "32px", height: "32px", background: "#334155", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "13px", fontWeight: "600" }}>{user[0]?.toUpperCase()}</div>
            <div style={{ flex: 1 }}><div style={{ color: "#cbd5e1", fontSize: "13px", fontWeight: "500" }}>{user}</div><div style={{ color: "#64748b", fontSize: "11px" }}>Officer</div></div>
            <div onClick={() => { setUser(null); setUn(""); setPw(""); }} style={{ color: "#64748b", cursor: "pointer", padding: "4px" }}><Icons.LogOut /></div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", padding: "32px" }}>

        {/* Dashboard */}
        {pg === "dashboard" && <div>
          <h1 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "700", margin: "0 0 24px" }}>Dashboard</h1>
          <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "32px" }}>
            <Stat icon={Icons.Users} label="Total Members" value={members.length} color="#3b82f6" sub={ac + " active"} />
            <Stat icon={Icons.Check} label="Dues Paid" value={pc} color="#34d399" sub={"of " + ac + " active"} />
            <Stat icon={Icons.Alert} label="Overdue" value={oc} color="#f87171" sub={oc > 0 ? "needs attention" : "all clear"} />
            <Stat icon={Icons.Mic} label="Open Speaker Slots" value={openSlots} color="#a78bfa" sub="upcoming" />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", padding: "20px" }}>
              <h3 style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", margin: "0 0 16px" }}>Next Speakers</h3>
              {nextSpeakers.length > 0
                ? <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                    {nextSpeakers.map((sp, idx) => (
                      <div key={sp.id} style={{ background: "#0f172a", borderRadius: "8px", padding: "14px", border: "1px solid #334155" }}>
                        <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                          <Icons.Cal /><span style={{ color: "#93c5fd", fontSize: "13px", fontWeight: "600" }}>{fmtDate(sp.date)}</span>
                          {idx === 0 && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "99px", background: "#3b82f630", color: "#93c5fd", fontWeight: "600" }}>NEXT</span>}
                        </div>
                        <div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", marginBottom: "2px" }}>{sp.speaker}</div>
                        <div style={{ color: "#94a3b8", fontSize: "12px" }}>{sp.title}{sp.org ? ", " + sp.org : ""}</div>
                        {sp.topic && <div style={{ color: "#cbd5e1", fontSize: "12px", marginTop: "4px", fontStyle: "italic" }}>{sp.topic}</div>}
                      </div>
                    ))}
                  </div>
                : <p style={{ color: "#64748b", fontSize: "14px" }}>No upcoming speakers</p>}
            </div>
            <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", padding: "20px" }}>
              <h3 style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", margin: "0 0 16px" }}>Unpaid Members</h3>
              {mwd.filter(m => m._ds !== "paid" && m.status === "active").length === 0
                ? <p style={{ color: "#64748b", fontSize: "14px" }}>All paid up!</p>
                : <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "340px", overflowY: "auto" }}>
                    {mwd.filter(m => m._ds !== "paid" && m.status === "active").map(m => (
                      <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "#0f172a", borderRadius: "8px", flexShrink: 0 }}>
                        <span style={{ color: "#cbd5e1", fontSize: "13px" }}>{m.firstName} {m.lastName}</span><DuesBadge status={m._ds} />
                      </div>
                    ))}
                  </div>}
            </div>
          </div>
        </div>}

        {/* Members */}
        {pg === "members" && <div>
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
        </div>}

        {/* Speakers */}
        {pg === "speakers" && <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
            <div><h1 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "700", margin: "0 0 4px" }}>Speakers</h1><p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>Weekly meeting speaker schedule</p></div>
            <div style={{ display: "flex", gap: "8px" }}>
              <div onClick={syncFromSheet} style={{ ...BTN("#334155", "#cbd5e1"), display: "flex", alignItems: "center", gap: "6px", opacity: syncing ? 0.5 : 1, pointerEvents: syncing ? "none" : "auto" }}><Icons.Refresh />{syncing ? "Syncing..." : "Sync from Sheet"}</div>
              <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" style={{ ...BTN("#334155", "#cbd5e1"), display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}><Icons.Ext />Google Sheet</a>
              <div onClick={() => { setEditS(null); setShowSM(true); }} style={{ ...BTN("linear-gradient(135deg,#3b82f6,#6366f1)"), display: "flex", alignItems: "center", gap: "6px" }}><Icons.Plus />Add Speaker</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>{[["upcoming", "Upcoming"], ["open", "Open Slots (" + openSlots + ")"], ["all", "All"], ["past", "Past"]].map(([k, l]) => <div key={k} onClick={() => setSpFil(k)} style={{ padding: "10px 16px", border: "1px solid", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: "500", background: spFil === k ? "#3b82f620" : "#1e293b", borderColor: spFil === k ? "#3b82f6" : "#334155", color: spFil === k ? "#93c5fd" : "#94a3b8" }}>{l}</div>)}</div>
          <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: sCols, borderBottom: "1px solid #334155" }}>{["Date", "Speaker", "Organization", "Title", "Topic", "Recruited By", ""].map(h => <div key={h} style={HS}>{h}</div>)}</div>
            {fsp.map((s, i) => { const past = s.date < today, isNext = nextSpeakers.length > 0 && s.id === nextSpeakers[0].id;
              if (s.noMeeting) return (
                <div key={s.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 70px", borderBottom: i < fsp.length - 1 ? "1px solid #334155" : "none", background: "#7f1d1d10", opacity: past ? 0.6 : 1, alignItems: "center" }}>
                  <div style={{ padding: "12px 14px" }}><span style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "500" }}>{fmtDate(s.date)}</span></div>
                  <div style={{ padding: "12px 14px", color: "#f87171", fontSize: "13px", fontWeight: "600", fontStyle: "italic", textAlign: "center" }}>{"NO MEETING -- " + s.reason}</div>
                  <div style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: "4px" }}><div onClick={() => { setEditS(s); setShowSM(true); }} style={{ padding: "5px 8px", background: "#334155", borderRadius: "6px", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Edit /></div><div onClick={() => setConfDelS(s)} style={{ padding: "5px 8px", background: "#334155", borderRadius: "6px", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Trash /></div></div></div>
                </div>
              );
              return (
                <div key={s.id} style={{ display: "grid", gridTemplateColumns: sCols, borderBottom: i < fsp.length - 1 ? "1px solid #334155" : "none", background: isNext ? "#3b82f610" : "transparent", opacity: past ? 0.6 : 1, alignItems: "center" }}>
                  <div style={{ padding: "12px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ color: isNext ? "#93c5fd" : "#f1f5f9", fontSize: "14px", fontWeight: isNext ? "700" : "500" }}>{fmtDate(s.date)}</span>{isNext && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "99px", background: "#3b82f630", color: "#93c5fd", fontWeight: "600" }}>NEXT</span>}</div></div>
                  <div style={{ padding: "12px 14px", color: s.speaker ? (s.speaker === "TBD" ? "#fbbf24" : "#f1f5f9") : "#64748b", fontSize: "14px", fontWeight: "500", fontStyle: !s.speaker ? "italic" : "normal" }}>{s.speaker || "Open"}</div>
                  <div style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "13px" }}>{s.org}</div>
                  <div style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "13px" }}>{s.title}</div>
                  <div style={{ padding: "12px 14px", color: "#cbd5e1", fontSize: "13px" }}>{s.topic}</div>
                  <div style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "12px" }}>{s.recruitedBy}{s.recruiterPhone ? " (" + s.recruiterPhone + ")" : ""}</div>
                  <div style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: "4px" }}><div onClick={() => { setEditS(s); setShowSM(true); }} style={{ padding: "5px 8px", background: "#334155", borderRadius: "6px", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Edit /></div><div onClick={() => setConfDelS(s)} style={{ padding: "5px 8px", background: "#334155", borderRadius: "6px", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Trash /></div></div></div>
                </div>
              );
            })}
            {fsp.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No speakers found</div>}
          </div>
          <div style={{ marginTop: "12px", color: "#64748b", fontSize: "12px" }}>Click &quot;Sync from Sheet&quot; to pull latest data from the Google Sheet</div>
        </div>}

        {/* Email */}
        {pg === "email" && <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}><h1 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "700", margin: 0 }}>Email</h1><div onClick={() => { setEmailPre([]); setShowEM(true); }} style={{ ...BTN("linear-gradient(135deg,#3b82f6,#6366f1)"), display: "flex", alignItems: "center", gap: "6px" }}><Icons.Send />Compose Email</div></div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
            <div onClick={() => { setEmailPre(members.filter(m => m.status === "active").map(m => m.id)); setShowEM(true); }} style={{ padding: "20px", background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", cursor: "pointer" }}><div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>Email All Active</div><div style={{ color: "#64748b", fontSize: "13px" }}>{ac} recipients</div></div>
            <div onClick={() => { setEmailPre(mwd.filter(m => m._ds !== "paid" && m.status === "active").map(m => m.id)); setShowEM(true); }} style={{ padding: "20px", background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", cursor: "pointer" }}><div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>Email Unpaid Members</div><div style={{ color: "#64748b", fontSize: "13px" }}>{mwd.filter(m => m._ds !== "paid" && m.status === "active").length} recipients</div></div>
            <div onClick={() => { setPg("members"); setSelMode(true); setSel([]); }} style={{ padding: "20px", background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", cursor: "pointer" }}><div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>Select Custom List</div><div style={{ color: "#64748b", fontSize: "13px" }}>Pick specific members</div></div>
          </div>
          <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", padding: "24px" }}><h3 style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", margin: "0 0 12px" }}>Email Setup Info</h3><div style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "1.7" }}><p style={{ margin: "0 0 8px" }}>Uses <strong style={{ color: "#cbd5e1" }}>Resend</strong> (free: 100/day, 3,000/month)</p><p style={{ margin: "0 0 4px" }}>1. Create account at resend.com</p><p style={{ margin: "0 0 4px" }}>2. Verify sending domain</p><p style={{ margin: 0 }}>3. Add API key to env variables</p></div></div>
        </div>}

        {/* Payments */}
        {pg === "payments" && <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}><h1 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "700", margin: 0 }}>Payments and Dues</h1><div onClick={() => setShowPM(true)} style={{ ...BTN("linear-gradient(135deg,#10b981,#059669)"), display: "flex", alignItems: "center", gap: "6px" }}><Icons.Card />Send Payment Links</div></div>
          <div style={{ display: "flex", gap: "16px", marginBottom: "24px", flexWrap: "wrap" }}><Stat icon={Icons.Check} label="Paid" value={pc} color="#34d399" sub={Math.round(pc / Math.max(ac, 1) * 100) + "% of active"} /><Stat icon={Icons.Alert} label="Unpaid" value={mwd.filter(m => m._ds === "unpaid" && m.status === "active").length} color="#fbbf24" /><Stat icon={Icons.Alert} label="Overdue" value={oc} color="#f87171" /></div>
          <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
            <div style={{ padding: "16px 20px", borderBottom: "1px solid #334155" }}><h3 style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", margin: 0 }}>Active Member Dues Status</h3></div>
            <div style={{ display: "grid", gridTemplateColumns: pCols, borderBottom: "1px solid #334155" }}>{["Member", "Email", "Dues", "Last Paid", "Next Due", ""].map(h => <div key={h} style={HS}>{h}</div>)}</div>
            {mwd.filter(m => m.status === "active").sort((a, b) => ({ "overdue": 0, "unpaid": 1, "paid": 2 }[a._ds] || 1) - ({ "overdue": 0, "unpaid": 1, "paid": 2 }[b._ds] || 1)).map((m, i, arr) => (
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
          <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", padding: "24px", marginTop: "20px" }}><h3 style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", margin: "0 0 12px" }}>Stripe Setup Info</h3><div style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "1.7" }}><p style={{ margin: "0 0 8px" }}>Via <strong style={{ color: "#cbd5e1" }}>Stripe</strong> (2.9% + $0.30/txn)</p><p style={{ margin: "0 0 4px" }}>1. Create account at stripe.com</p><p style={{ margin: "0 0 4px" }}>2. Get API keys</p><p style={{ margin: 0 }}>3. Add secret key to env variables</p></div></div>
        </div>}

        {/* Users */}
        {pg === "users" && <div>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
            <div><h1 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "700", margin: "0 0 4px" }}>User Management</h1><p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>Manage login accounts</p></div>
            <div onClick={() => { setEditU(null); setShowUM(true); }} style={{ ...BTN("linear-gradient(135deg,#3b82f6,#6366f1)"), display: "flex", alignItems: "center", gap: "6px" }}><Icons.Plus />Add User</div>
          </div>
          <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
            <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 100px", borderBottom: "1px solid #334155" }}>{["Name", "Username", "Created", ""].map(h => <div key={h} style={HS}>{h}</div>)}</div>
            {appUsers.map((u, i) => (
              <div key={u.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 100px", borderBottom: i < appUsers.length - 1 ? "1px solid #334155" : "none", alignItems: "center" }}>
                <div style={{ padding: "12px 16px", color: "#f1f5f9", fontSize: "14px", fontWeight: "500" }}>{u.name}</div>
                <div style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{u.username}</div>
                <div style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "12px" }}>{u.createdAt ? fmtDate(u.createdAt) : ""}</div>
                <div style={{ padding: "12px 16px" }}><div style={{ display: "flex", gap: "4px" }}>
                  <div onClick={() => { setEditU(u); setShowUM(true); }} style={{ padding: "5px 8px", background: "#334155", borderRadius: "6px", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Edit /></div>
                  <div onClick={() => setConfDelU(u)} style={{ padding: "5px 8px", background: "#334155", borderRadius: "6px", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Trash /></div>
                </div></div>
              </div>
            ))}
            {appUsers.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No users found</div>}
          </div>
          <div style={{ marginTop: "12px", color: "#64748b", fontSize: "12px" }}>{appUsers.length + " user" + (appUsers.length !== 1 ? "s" : "")}</div>
        </div>}
      </div>

      {showMM && <MemberModal member={editM} onSave={saveM} onClose={() => { setShowMM(false); setEditM(null); }} />}
      {viewM && <DetailModal member={viewM} onClose={() => setViewM(null)} />}
      {showEM && <EmailModal members={members} pre={emailPre} onClose={() => setShowEM(false)} onSend={() => flash("Emails sent")} />}
      {showPM && <PaymentModal members={members} onClose={() => setShowPM(false)} />}
      {showSM && <SpeakerModal speaker={editS} onSave={saveS} onClose={() => { setShowSM(false); setEditS(null); }} />}
      {showUM && <UserModal user={editU} onSave={saveU} onClose={() => { setShowUM(false); setEditU(null); }} />}
      {confDel && <Confirm title="Delete Member" msg={"Remove " + confDel.firstName + " " + confDel.lastName + "?"} onOk={() => delM(confDel.id)} onNo={() => setConfDel(null)} />}
      {confDelS && <Confirm title="Delete Speaker" msg={"Remove " + (confDelS.speaker || "this entry") + " on " + fmtDate(confDelS.date) + "?"} onOk={() => delS(confDelS.id)} onNo={() => setConfDelS(null)} />}
      {confDelU && <Confirm title="Delete User" msg={"Remove user " + confDelU.name + "?"} onOk={() => delU(confDelU.id)} onNo={() => setConfDelU(null)} />}
    </div>
  );
}
