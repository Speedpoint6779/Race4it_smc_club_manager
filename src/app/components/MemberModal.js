"use client";
import { useState } from "react";
import { Modal, IS, LS, BTN } from "./ui";

export function MemberModal({ member, onSave, onClose }) {
  const [f, setF] = useState(member || { firstName:"", lastName:"", email:"", phone:"", address1:"", address2:"", city:"", state:"", zip:"", status:"active", joinDate:new Date().toISOString().split("T")[0], lastDuesPaid:"", notes:"" });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    &lt;Modal title={member ? "Edit Member" : "Add Member"} onClose={onClose} footer={&lt;&gt;&lt;div onClick={onClose} style={BTN("#334155","#cbd5e1")}&gt;Cancel&lt;/div&gt;&lt;div onClick={() => { if(f.firstName &amp;&amp; f.lastName &amp;&amp; f.email) onSave({ ...f, id: member?.id || Date.now().toString() }) }} style={BTN("linear-gradient(135deg,#3b82f6,#6366f1)")}&gt;{member ? "Save Changes" : "Add Member"}&lt;/div&gt;&lt;/&gt;}&gt;
      &lt;div style={{display:"flex",flexDirection:"column",gap:"16px"}}&gt;
        &lt;div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}&gt;&lt;div&gt;&lt;label style={LS}&gt;First Name *&lt;/label&gt;&lt;input style={IS} value={f.firstName} onChange={e => u("firstName", e.target.value)}/&gt;&lt;/div&gt;&lt;div&gt;&lt;label style={LS}&gt;Last Name *&lt;/label&gt;&lt;input style={IS} value={f.lastName} onChange={e => u("lastName", e.target.value)}/&gt;&lt;/div&gt;&lt;/div&gt;
        &lt;div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}&gt;&lt;div&gt;&lt;label style={LS}&gt;Email *&lt;/label&gt;&lt;input style={IS} value={f.email} onChange={e => u("email", e.target.value)}/&gt;&lt;/div&gt;&lt;div&gt;&lt;label style={LS}&gt;Phone&lt;/label&gt;&lt;input style={IS} value={f.phone} onChange={e => u("phone", e.target.value)}/&gt;&lt;/div&gt;&lt;/div&gt;
        &lt;div style={{borderTop:"1px solid #334155",paddingTop:"16px"}}&gt;&lt;p style={{color:"#64748b",fontSize:"12px",fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.05em",margin:"0 0 12px"}}&gt;Address&lt;/p&gt;&lt;div style={{display:"flex",flexDirection:"column",gap:"12px"}}&gt;&lt;input style={IS} value={f.address1} onChange={e => u("address1", e.target.value)} placeholder="Address Line 1"/&gt;&lt;input style={IS} value={f.address2} onChange={e => u("address2", e.target.value)} placeholder="Address Line 2 (optional)"/&gt;&lt;div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"12px"}}&gt;&lt;input style={IS} value={f.city} onChange={e => u("city", e.target.value)} placeholder="City"/&gt;&lt;input style={IS} value={f.state} onChange={e => u("state", e.target.value)} placeholder="NC" maxLength={2}/&gt;&lt;input style={IS} value={f.zip} onChange={e => u("zip", e.target.value)} placeholder="ZIP"/&gt;&lt;/div&gt;&lt;/div&gt;&lt;/div&gt;
        &lt;div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"16px",borderTop:"1px solid #334155",paddingTop:"16px"}}&gt;&lt;div&gt;&lt;label style={LS}&gt;Status&lt;/label&gt;&lt;select style={{...IS,appearance:"auto"}} value={f.status} onChange={e => u("status", e.target.value)}&gt;&lt;option value="active"&gt;Active&lt;/option&gt;&lt;option value="inactive"&gt;Inactive&lt;/option&gt;&lt;/select&gt;&lt;/div&gt;&lt;div&gt;&lt;label style={LS}&gt;Join Date&lt;/label&gt;&lt;input style={IS} type="date" value={f.joinDate} onChange={e => u("joinDate", e.target.value)}/&gt;&lt;/div&gt;&lt;div&gt;&lt;label style={LS}&gt;Last Dues Paid&lt;/label&gt;&lt;input style={IS} type="date" value={f.lastDuesPaid} onChange={e => u("lastDuesPaid", e.target.value)}/&gt;&lt;/div&gt;&lt;/div&gt;
        &lt;div&gt;&lt;label style={LS}&gt;Notes&lt;/label&gt;&lt;textarea style={{...IS,minHeight:"60px",resize:"vertical",fontFamily:"inherit"}} value={f.notes} onChange={e => u("notes", e.target.value)}/&gt;&lt;/div&gt;
      &lt;/div&gt;
    &lt;/Modal&gt;
  );
}

export function DetailModal({ member: m, onClose }) {
  const { getDuesStatus, getNextDue, fmtDate, DuesBadge } = require("./ui");
  const ds = getDuesStatus(m), nd = getNextDue(m), ha = m.address1 || m.city;
  return (
    &lt;Modal title={m.firstName + " " + m.lastName} onClose={onClose} footer={&lt;div onClick={onClose} style={{...BTN("#334155","#cbd5e1"),width:"100%",textAlign:"center"}}&gt;Close&lt;/div&gt;}&gt;
      &lt;div style={{display:"flex",flexDirection:"column",gap:"14px"}}&gt;
        &lt;div style={{display:"flex",gap:"8px"}}&gt;&lt;span style={{fontSize:"11px",padding:"3px 10px",borderRadius:"99px",fontWeight:"600",textTransform:"capitalize",background:m.status==="active"?"#065f4633":"#78350f33",color:m.status==="active"?"#34d399":"#fbbf24"}}&gt;{m.status}&lt;/span&gt;&lt;DuesBadge status={ds}/&gt;&lt;/div&gt;
        &lt;div&gt;&lt;p style={{color:"#64748b",fontSize:"12px",margin:"0 0 2px"}}&gt;Email&lt;/p&gt;&lt;p style={{color:"#f1f5f9",fontSize:"14px",margin:0}}&gt;{m.email}&lt;/p&gt;&lt;/div&gt;
        {m.phone &amp;&amp; &lt;div&gt;&lt;p style={{color:"#64748b",fontSize:"12px",margin:"0 0 2px"}}&gt;Phone&lt;/p&gt;&lt;p style={{color:"#f1f5f9",fontSize:"14px",margin:0}}&gt;{m.phone}&lt;/p&gt;&lt;/div&gt;}
        {ha &amp;&amp; &lt;div&gt;&lt;p style={{color:"#64748b",fontSize:"12px",margin:"0 0 2px"}}&gt;Address&lt;/p&gt;&lt;p style={{color:"#f1f5f9",fontSize:"14px",margin:0,lineHeight:"1.5"}}&gt;{m.address1}{m.address2 ? ", " + m.address2 : ""}&lt;br/&gt;{m.city}{m.state ? ", " + m.state : ""} {m.zip}&lt;/p&gt;&lt;/div&gt;}
        &lt;div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}&gt;&lt;div&gt;&lt;p style={{color:"#64748b",fontSize:"12px",margin:"0 0 2px"}}&gt;Joined&lt;/p&gt;&lt;p style={{color:"#f1f5f9",fontSize:"14px",margin:0}}&gt;{fmtDate(m.joinDate)}&lt;/p&gt;&lt;/div&gt;&lt;div&gt;&lt;p style={{color:"#64748b",fontSize:"12px",margin:"0 0 2px"}}&gt;Last Dues Paid&lt;/p&gt;&lt;p style={{color:"#f1f5f9",fontSize:"14px",margin:0}}&gt;{m.lastDuesPaid ? fmtDate(m.lastDuesPaid) : "Never"}&lt;/p&gt;&lt;/div&gt;&lt;/div&gt;
        &lt;div&gt;&lt;p style={{color:"#64748b",fontSize:"12px",margin:"0 0 2px"}}&gt;Next Dues Due&lt;/p&gt;&lt;p style={{color:"#f1f5f9",fontSize:"14px",margin:0}}&gt;{fmtDate(nd)} &lt;span style={{color:"#94a3b8"}}&gt;($50/yr anniversary)&lt;/span&gt;&lt;/p&gt;&lt;/div&gt;
        {m.notes &amp;&amp; &lt;div&gt;&lt;p style={{color:"#64748b",fontSize:"12px",margin:"0 0 2px"}}&gt;Notes&lt;/p&gt;&lt;p style={{color:"#f1f5f9",fontSize:"14px",margin:0}}&gt;{m.notes}&lt;/p&gt;&lt;/div&gt;}
      &lt;/div&gt;
    &lt;/Modal&gt;
  );
}
