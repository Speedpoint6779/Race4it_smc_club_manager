"use client";
import { useState } from "react";
import { Modal, IS, LS, BTN } from "./ui";

export function UserModal({ user: u, onSave, onClose }) {
  const [f, setF] = useState(u ? { name:u.name, username:u.username, password:"" } : { name:"", username:"", password:"" });
  const up = (k, v) => setF(p => ({ ...p, [k]: v }));
  const [err, setErr] = useState("");
  return (
    &lt;Modal title={u ? "Edit User" : "Add User"} onClose={onClose} footer={&lt;&gt;&lt;div onClick={onClose} style={BTN("#334155","#cbd5e1")}&gt;Cancel&lt;/div&gt;&lt;div onClick={() => { if(!f.name || !f.username){ setErr("Name and username required"); return } if(!u &amp;&amp; !f.password){ setErr("Password required"); return } setErr(""); onSave({ ...f, id: u?.id }) }} style={BTN("linear-gradient(135deg,#3b82f6,#6366f1)")}&gt;{u ? "Save" : "Add User"}&lt;/div&gt;&lt;/&gt;}&gt;
      &lt;div style={{display:"flex",flexDirection:"column",gap:"16px"}}&gt;
        {err &amp;&amp; &lt;div style={{background:"#7f1d1d33",border:"1px solid #991b1b",borderRadius:"8px",padding:"10px 14px",color:"#fca5a5",fontSize:"13px"}}&gt;{err}&lt;/div&gt;}
        &lt;div&gt;&lt;label style={LS}&gt;Name *&lt;/label&gt;&lt;input style={IS} value={f.name} onChange={e => up("name", e.target.value)}/&gt;&lt;/div&gt;
        &lt;div&gt;&lt;label style={LS}&gt;Username *&lt;/label&gt;&lt;input style={IS} value={f.username} onChange={e => up("username", e.target.value)}/&gt;&lt;/div&gt;
        &lt;div&gt;&lt;label style={LS}&gt;{u ? "New Password (leave blank to keep)" : "Password *"}&lt;/label&gt;&lt;input style={IS} type="password" value={f.password} onChange={e => up("password", e.target.value)}/&gt;&lt;/div&gt;
      &lt;/div&gt;
    &lt;/Modal&gt;
  );
}
