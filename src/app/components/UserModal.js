"use client";
import { useState } from "react";
import { Modal, IS, LS, BTN } from "./ui";

export function UserModal({ user: u, onSave, onClose }) {
  const [f, setF] = useState(u ? { name: u.name, username: u.username, password: "" } : { name: "", username: "", password: "" });
  const up = (k, v) => setF(p => ({ ...p, [k]: v }));
  const [err, setErr] = useState("");
  return (
    <Modal title={u ? "Edit User" : "Add User"} onClose={onClose} footer={<><div onClick={onClose} style={BTN("var(--btn-secondary-bg)", "var(--btn-secondary-text)")}>Cancel</div><div onClick={() => { if (!f.name || !f.username) { setErr("Name and username required"); return; } if (!u && !f.password) { setErr("Password required"); return; } setErr(""); onSave({ ...f, id: u?.id }); }} style={BTN("var(--accent-gradient)")}>{u ? "Save" : "Add User"}</div></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        {err && <div style={{ background: "var(--error-bg)", border: "1px solid var(--error-border)", borderRadius: "8px", padding: "10px 14px", color: "var(--error-text)", fontSize: "14px" }}>{err}</div>}
        <div><label style={LS}>Name *</label><input style={IS} value={f.name} onChange={e => up("name", e.target.value)} /></div>
        <div><label style={LS}>Username *</label><input style={IS} value={f.username} onChange={e => up("username", e.target.value)} /></div>
        <div><label style={LS}>{u ? "New Password (leave blank to keep)" : "Password *"}</label><input style={IS} type="password" value={f.password} onChange={e => up("password", e.target.value)} /></div>
      </div>
    </Modal>
  );
}
