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

const SunIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const MoonIcon = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;

export default function App() {
  const [user, setUser] = useState(() => {
    try { return sessionStorage.getItem("smc_user") || null; } catch { return null; }
  });
  const [pg, setPg] = useState(() => {
    try { return sessionStorage.getItem("smc_pg") || "dashboard"; } catch { return "dashboard"; }
  });
  const [theme, setTheme] = useState(() => {
    try { return localStorage.getItem("smc_theme") || "light"; } catch { return "light"; }
  });

  const [un, setUn] = useState(""); const [pw, setPw] = useState(""); const [le, setLe] = useState("");
  const [members, setMembers] = useState([]); const [speakers, setSpeakers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [appUsers, setAppUsers] = useState([]);
  const [toast, setToast] = useState(null);
  const [selMode, setSelMode] = useState(false); const [sel, setSel] = useState([]);

  // Apply theme to document
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("smc_theme", theme); } catch {}
  }, [theme]);

  const toggleTheme = () => setTheme(t => t === "light" ? "dark" : "light");

  useEffect(() => {
    try {
      if (user) sessionStorage.setItem("smc_user", user);
      else sessionStorage.removeItem("smc_user");
    } catch {}
  }, [user]);

  useEffect(() => {
    try { sessionStorage.setItem("smc_pg", pg); } catch {}
  }, [pg]);

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

  const logout = () => {
    setUser(null); setUn(""); setPw("");
    try { sessionStorage.removeItem("smc_user"); sessionStorage.removeItem("smc_pg"); } catch {}
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
    <div style={{ minHeight: "100vh", background: "var(--bg-body)", display: "flex", alignItems: "center", justifyContent: "center" }}>
      <div style={{ textAlign: "center" }}>
        <div style={{ width: "36px", height: "36px", background: "var(--smc-gradient)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "11px", fontWeight: "800", margin: "0 auto 16px" }}>SMC</div>
        <div style={{ color: "var(--text-secondary)", fontSize: "15px" }}>Loading members...</div>
      </div>
    </div>
  );

  if (!user) return (
    <div style={{ minHeight: "100vh", background: "var(--login-bg)", display: "flex", alignItems: "center", justifyContent: "center", padding: "20px", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      <div style={{ width: "100%", maxWidth: "420px" }}>
        <div style={{ textAlign: "center", marginBottom: "32px" }}>
          <div style={{ width: "56px", height: "56px", background: "var(--smc-gradient)", borderRadius: "16px", display: "flex", alignItems: "center", justifyContent: "center", margin: "0 auto 16px", boxShadow: "0 8px 32px rgba(59,130,246,0.3)", color: "white", fontSize: "14px", fontWeight: "800" }}>SMC</div>
          <h1 style={{ color: "var(--login-title)", fontSize: "26px", fontWeight: "700", margin: "0 0 4px" }}>SMC Club Manager</h1>
          <p style={{ color: "var(--login-sub)", fontSize: "15px", margin: 0 }}>Sign in to manage your club</p>
        </div>
        <div style={{ background: "var(--login-card-bg)", borderRadius: "16px", padding: "32px", border: "1px solid var(--login-card-border)", boxShadow: "0 20px 60px rgba(0,0,0,0.1)" }}>
          {le && <div style={{ background: "var(--error-bg)", border: "1px solid var(--error-border)", borderRadius: "8px", padding: "10px 14px", marginBottom: "16px", color: "var(--error-text)", fontSize: "14px" }}>{le}</div>}
          <div style={{ marginBottom: "16px" }}><label style={LS}>Username</label><input type="text" value={un} onChange={e => { setUn(e.target.value); setLe(""); }} onKeyDown={e => { if (e.key === "Enter") login(); }} placeholder="Enter username" style={IS} /></div>
          <div style={{ marginBottom: "24px" }}><label style={LS}>Password</label><input type="password" value={pw} onChange={e => { setPw(e.target.value); setLe(""); }} onKeyDown={e => { if (e.key === "Enter") login(); }} placeholder="Enter password" style={IS} /></div>
          <div onClick={login} style={{ width: "100%", padding: "12px", background: "var(--accent-gradient)", color: "white", borderRadius: "8px", fontSize: "15px", fontWeight: "600", cursor: "pointer", textAlign: "center", boxSizing: "border-box" }}>Sign In</div>
          <p style={{ textAlign: "center", color: "var(--login-hint)", fontSize: "13px", marginTop: "16px" }}>Default: admin / admin123</p>
        </div>
        {/* Theme toggle on login page */}
        <div style={{ textAlign: "center", marginTop: "16px" }}>
          <div onClick={toggleTheme} style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "6px 14px", borderRadius: "8px", cursor: "pointer", color: "var(--text-muted)", fontSize: "13px", background: "var(--bg-card)", border: "1px solid var(--border)" }}>
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-body)", display: "flex", fontFamily: "-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif" }}>
      {toast && <div style={{ position: "fixed", top: "20px", right: "20px", zIndex: 2000, background: "var(--bg-toast)", color: "white", padding: "12px 20px", borderRadius: "10px", fontSize: "15px", fontWeight: "500", display: "flex", alignItems: "center", gap: "8px", boxShadow: "0 8px 32px rgba(0,0,0,0.3)" }}><Icons.Check />{toast}</div>}

      {/* Sidebar */}
      <div style={{ width: "220px", background: "var(--bg-sidebar)", borderRight: "1px solid var(--border)", padding: "20px 0", display: "flex", flexDirection: "column", flexShrink: 0 }}>
        <div style={{ padding: "0 20px 24px", borderBottom: "1px solid var(--border)", marginBottom: "16px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{ width: "36px", height: "36px", background: "var(--smc-gradient)", borderRadius: "10px", display: "flex", alignItems: "center", justifyContent: "center", color: "white", fontSize: "11px", fontWeight: "800" }}>SMC</div>
            <div>
              <div style={{ color: "var(--text-heading)", fontSize: "14px", fontWeight: "700" }}>SMC Club Manager</div>
              <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>{members.length} members</div>
            </div>
          </div>
        </div>
        <nav style={{ flex: 1, padding: "0 12px" }}>
          {navItems.map(n => (
            <div key={n.id} onClick={() => { setPg(n.id); setSelMode(false); setSel([]); }} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "10px 12px", borderRadius: "8px", cursor: "pointer", marginBottom: "4px", fontSize: "15px", fontWeight: pg === n.id ? "600" : "400", background: pg === n.id ? "var(--nav-active-bg)" : "transparent", color: pg === n.id ? "var(--nav-active-text)" : "var(--nav-inactive-text)" }}>
              <n.icon />{n.label}
            </div>
          ))}
        </nav>
        <div style={{ padding: "12px", borderTop: "1px solid var(--border)", marginTop: "auto" }}>
          {/* Theme toggle */}
          <div onClick={toggleTheme} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", borderRadius: "8px", cursor: "pointer", marginBottom: "8px", color: "var(--text-muted)", fontSize: "14px" }}>
            {theme === "light" ? <MoonIcon /> : <SunIcon />}
            {theme === "light" ? "Dark Mode" : "Light Mode"}
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px" }}>
            <div style={{ width: "32px", height: "32px", background: "var(--btn-secondary-bg)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-secondary)", fontSize: "14px", fontWeight: "600" }}>{user[0]?.toUpperCase()}</div>
            <div style={{ flex: 1 }}>
              <div style={{ color: "var(--text-primary)", fontSize: "14px", fontWeight: "500" }}>{user}</div>
              <div style={{ color: "var(--text-muted)", fontSize: "12px" }}>Officer</div>
            </div>
            <div onClick={logout} style={{ color: "var(--text-muted)", cursor: "pointer", padding: "4px" }}><Icons.LogOut /></div>
          </div>
        </div>
      </div>

      {/* Main */}
      <div style={{ flex: 1, overflow: "auto", padding: "32px" }}>
        {pg === "dashboard" && <DashboardPage members={members} mwd={mwd} speakers={speakers} ac={ac} pc={pc} oc={oc} />}
        {pg === "members"   && <MembersPage mwd={mwd} members={members} setMembers={setMembers} flash={flash} />}
        {pg === "speakers"  && <SpeakersPage speakers={speakers} setSpeakers={setSpeakers} flash={flash} />}
        {pg === "email"     && <EmailPage members={members} mwd={mwd} ac={ac} setPg={setPg} setSelMode={setSelMode} setSel={setSel} flash={flash} />}
        {pg === "payments"  && <PaymentsPage mwd={mwd} members={members} setMembers={setMembers} ac={ac} pc={pc} oc={oc} flash={flash} />}
        {pg === "users"     && <UsersPage appUsers={appUsers} setAppUsers={setAppUsers} flash={flash} />}
      </div>
    </div>
  );
}
