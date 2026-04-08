import { useState } from "react";
import { Icons } from "../Icons";
import { BTN, HS, fmtDate, Confirm } from "../ui";
import { UserModal } from "../UserModal";

export function UsersPage({ appUsers, setAppUsers, flash }) {
  const [showUM, setShowUM] = useState(false);
  const [editU, setEditU] = useState(null);
  const [confDelU, setConfDelU] = useState(null);

  const saveU = async (u) => {
    const isEdit = appUsers.find(x => x.id === u.id);
    if (isEdit) { const r = await fetch("/api/users", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) }); if (!r.ok) { const d = await r.json(); flash(d.error || "Error"); return; } setAppUsers(p => p.map(x => x.id === u.id ? { ...x, name: u.name, username: u.username } : x)); }
    else { const r = await fetch("/api/users", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(u) }); const d = await r.json(); if (!r.ok) { flash(d.error || "Error"); return; } setAppUsers(p => [...p, { id: d.id, name: u.name, username: u.username, createdAt: new Date().toISOString().split("T")[0] }]); }
    setShowUM(false); setEditU(null); flash(isEdit ? "User updated" : "User added");
  };
  const delU = async (id) => {
    const r = await fetch("/api/users", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    if (!r.ok) { const d = await r.json(); flash(d.error || "Error"); return; }
    setAppUsers(p => p.filter(u => u.id !== id)); setConfDelU(null); flash("User removed");
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ color: "var(--text-heading)", fontSize: "26px", fontWeight: "700", margin: "0 0 4px" }}>User Management</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>Manage login accounts</p>
        </div>
        <div onClick={() => { setEditU(null); setShowUM(true); }} style={{ ...BTN("var(--accent-gradient)"), display: "flex", alignItems: "center", gap: "6px" }}>
          <Icons.Plus />Add User
        </div>
      </div>
      <div style={{ background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 100px", borderBottom: "1px solid var(--border)" }}>
          {["Name", "Username", "Created", ""].map(h => <div key={h} style={HS}>{h}</div>)}
        </div>
        {appUsers.map((u, i) => (
          <div key={u.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 100px", borderBottom: i < appUsers.length - 1 ? "1px solid var(--border)" : "none", alignItems: "center" }}>
            <div style={{ padding: "12px 16px", color: "var(--text-heading)", fontSize: "15px", fontWeight: "500" }}>{u.name}</div>
            <div style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "14px" }}>{u.username}</div>
            <div style={{ padding: "12px 16px", color: "var(--text-secondary)", fontSize: "13px" }}>{u.createdAt ? fmtDate(u.createdAt) : ""}</div>
            <div style={{ padding: "12px 16px" }}><div style={{ display: "flex", gap: "4px" }}>
              <div onClick={() => { setEditU(u); setShowUM(true); }} style={{ padding: "5px 8px", background: "var(--btn-secondary-bg)", borderRadius: "6px", color: "var(--text-secondary)", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Edit /></div>
              <div onClick={() => setConfDelU(u)} style={{ padding: "5px 8px", background: "var(--btn-secondary-bg)", borderRadius: "6px", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Trash /></div>
            </div></div>
          </div>
        ))}
        {appUsers.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No users found</div>}
      </div>
      <div style={{ marginTop: "12px", color: "var(--text-muted)", fontSize: "13px" }}>{appUsers.length + " user" + (appUsers.length !== 1 ? "s" : "")}</div>
      {showUM && <UserModal user={editU} onSave={saveU} onClose={() => { setShowUM(false); setEditU(null); }} />}
      {confDelU && <Confirm title="Delete User" msg={"Remove user " + confDelU.name + "?"} onOk={() => delU(confDelU.id)} onNo={() => setConfDelU(null)} />}
    </div>
  );
}
