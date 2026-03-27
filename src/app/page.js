"use client";
import { useState, useCallback, useMemo, useEffect } from "react";
import { Icons } from "./components/Icons";
import { IS, LS, fmtDate, getDuesStatus, getNextDue, Confirm } from "./components/ui";
import { MemberModal, DetailModal } from "./components/MemberModal";
import { SpeakerModal } from "./components/SpeakerModal";
import { EmailModal } from "./components/EmailModal";
import { PaymentModal } from "./components/PaymentModal";
import { UserModal } from "./components/UserModal";
import { DashboardPage } from "./components/pages/DashboardPage";
import { MembersPage } from "./components/pages/MembersPage";
import { SpeakersPage } from "./components/pages/SpeakersPage";
import { EmailPage } from "./components/pages/EmailPage";
import { PaymentsPage } from "./components/pages/PaymentsPage";
import { UsersPage } from "./components/pages/UsersPage";

export default function App() {
  const [user, setUser] = useState(null);
  const [un, setUn] = useState(""); const [pw, setPw] = useState(""); const [le, setLe] = useState("");
  const [pg, setPg] = useState("dashboard");
  const [members, setMembers] = useState([]); const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appUsers, setAppUsers] = useState([]);
  const [toast, setToast] = useState(null);
  const [selMode, setSelMode] = useState(false); const [sel, setSel] = useState([]);

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
  const ac = mwd.filter(m => m.status === "active").length;
  const pc = mwd.filter(m => m._ds === "paid" && m.status === "active").length;
  const oc = mwd.filter(m => m._ds === "overdue").length;

  const navItems = [
    { id: "dashboard", label: "Dashboard", icon: Icons.Home },
    { id: "members",   label: "Members",   icon: Icons.Users },
    { id: "speakers",  label: "Speakers",  icon: Icons.Mic },
    { id: "email",     label: "Email",     icon: Icons.Mail },
    { id: "payments",  label: "Payments",  icon: Icons.Dollar },
    { id: "users",     label: "Users",     icon: Icons.Gear },
  ];

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

  return (
    <div style={{ minHeight: "100vh", background: "#0f172a", display: "flex", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {toast && <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 2000, background: "#065f46", color: "white", padding: "12px 20px", borderRadius: "10px", fontSize: "14px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}><Icons.Check />{toast}</div>}

      {/* Sidebar */}
      <div style={{ width: "220px", background: "#1e293b", borderRight: "1px solid #334155", padding: "20px 0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid #334155", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", background: "linear-gradient(135deg,#3b82f6,#8b5cf6)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "11px", fontWeight: "800" }}>SMC</div>
            <div>
              <div style={{ color: "#f1f5f9", fontSize: "13px", fontWeight: "700" }}>SMC Club Manager</div>
              <div style={{ color: "#64748b", fontSize: "11px" }}>{members.length} members</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "0 12px" }}>
          {navItems.map(n => (
            <div key={n.id} onClick={() => { setPg(n.id); setSelMode(false); setSel([]); }} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", cursor: "pointer", marginBottom: "4px", fontSize: "14px", fontWeight: pg === n.id ? "600" : "400", background: pg === n.id ? "linear-gradient(135deg,#3b82f620,#6366f120)" : "transparent", color: pg === n.id ? "#93c5fd" : "#94a3b8" }}>
              <n.icon />{n.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: "16px 12px", borderTop: "1px solid #334155", marginTop: "auto" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px" }}>
            <div style={{ width: "32px", height: "32px", background: "#334155", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "#94a3b8", fontSize: "13px", fontWeight: "600" }}>{user[0]?.toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "#cbd5e1", fontSize: "13px", fontWeight: "500" }}>{user}</div>
              <div style={{ color: "#64748b", fontSize: "11px" }}>Officer</div>
            </div>
            <div onClick={() => { setUser(null); setUn(""); setPw(""); }} style={{ color: "#64748b", cursor: "pointer", padding: "4px" }}><Icons.LogOut /></div>
          </div>
        </div>
      </div>

      {/* Main — each page lives in its own file under components/pages/ */}
      <div style={{ flex: 1, overflow: "auto", padding: "32px" }}>
        {pg === "dashboard" && <DashboardPage members={members} mwd={mwd} speakers={speakers} ac={ac} pc={pc} oc={oc} />}
        {pg === "members"   && <MembersPage mwd={mwd} members={members} setMembers={setMembers} flash={flash} />}
        {pg === "speakers"  && <SpeakersPage speakers={speakers} setSpeakers={setSpeakers} flash={flash} />}
        {pg === "email"     && <EmailPage members={members} mwd={mwd} ac={ac} setPg={setPg} setSelMode={setSelMode} setSel={setSel} />}
        {pg === "payments"  && <PaymentsPage mwd={mwd} members={members} setMembers={setMembers} ac={ac} pc={pc} oc={oc} flash={flash} />}
        {pg === "users"     && <UsersPage appUsers={appUsers} setAppUsers={setAppUsers} flash={flash} />}
      </div>
    </div>
  );
}
