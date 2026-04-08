"use client";
import { useState } from "react";
import { Modal, IS, LS, BTN, getDuesStatus, getNextDue, fmtDate, DuesBadge } from "./ui";

export function MemberModal({ member, onSave, onClose }) {
  const [f, setF] = useState(member || { firstName:"", lastName:"", email:"", phone:"", address1:"", address2:"", city:"", state:"", zip:"", status:"active", joinDate:new Date().toISOString().split("T")[0], lastDuesPaid:"", notes:"" });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title={member ? "Edit Member" : "Add Member"} onClose={onClose} footer={<><div onClick={onClose} style={BTN("var(--btn-secondary-bg)","var(--btn-secondary-text)")}>Cancel</div><div onClick={() => { if(f.firstName && f.lastName) onSave({ ...f, id: member?.id || Date.now().toString() }) }} style={BTN("var(--accent-gradient)")}>{member ? "Save Changes" : "Add Member"}</div></>}>
      <div style={{display:"flex",flexDirection:"column",gap:"16px"}}>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}><div><label style={LS}>First Name *</label><input style={IS} value={f.firstName} onChange={e => u("firstName", e.target.value)}/></div><div><label style={LS}>Last Name *</label><input style={IS} value={f.lastName} onChange={e => u("lastName", e.target.value)}/></div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}><div><label style={LS}>Email</label><input style={IS} value={f.email} onChange={e => u("email", e.target.value)}/></div><div><label style={LS}>Phone</label><input style={IS} value={f.phone} onChange={e => u("phone", e.target.value)}/></div></div>
        <div style={{borderTop:"1px solid var(--border)",paddingTop:"16px"}}><p style={{color:"var(--text-muted)",fontSize:"12px",fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.05em",margin:"0 0 12px"}}>Address</p><div style={{display:"flex",flexDirection:"column",gap:"12px"}}><input style={IS} value={f.address1} onChange={e => u("address1", e.target.value)} placeholder="Address Line 1"/><input style={IS} value={f.address2} onChange={e => u("address2", e.target.value)} placeholder="Address Line 2 (optional)"/><div style={{display:"grid",gridTemplateColumns:"2fr 1fr 1fr",gap:"12px"}}><input style={IS} value={f.city} onChange={e => u("city", e.target.value)} placeholder="City"/><input style={IS} value={f.state} onChange={e => u("state", e.target.value)} placeholder="NC" maxLength={2}/><input style={IS} value={f.zip} onChange={e => u("zip", e.target.value)} placeholder="ZIP"/></div></div></div>
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"16px",borderTop:"1px solid var(--border)",paddingTop:"16px"}}><div><label style={LS}>Status</label><select style={{...IS,appearance:"auto"}} value={f.status} onChange={e => u("status", e.target.value)}><option value="active">Active</option><option value="inactive">Inactive</option></select></div><div><label style={LS}>Join Date</label><input style={IS} type="date" value={f.joinDate} onChange={e => u("joinDate", e.target.value)}/></div><div><label style={LS}>Last Dues Paid</label><input style={IS} type="date" value={f.lastDuesPaid} onChange={e => u("lastDuesPaid", e.target.value)}/></div></div>
        <div><label style={LS}>Notes</label><textarea style={{...IS,minHeight:"60px",resize:"vertical",fontFamily:"inherit"}} value={f.notes} onChange={e => u("notes", e.target.value)}/></div>
      </div>
    </Modal>
  );
}

export function DetailModal({ member: m, onClose }) {
  const ds = getDuesStatus(m), nd = getNextDue(m), ha = m.address1 || m.city;
  return (
    <Modal title={m.firstName + " " + m.lastName} onClose={onClose} footer={<div onClick={onClose} style={{...BTN("var(--btn-secondary-bg)","var(--btn-secondary-text)"),width:"100%",textAlign:"center"}}>Close</div>}>
      <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
        <div style={{display:"flex",gap:"8px"}}><span style={{fontSize:"12px",padding:"3px 10px",borderRadius:"99px",fontWeight:"600",textTransform:"capitalize",background:m.status==="active"?"var(--badge-active-bg)":"var(--badge-inactive-bg)",color:m.status==="active"?"var(--badge-active-text)":"var(--badge-inactive-text)"}}>{m.status}</span><DuesBadge status={ds}/></div>
        {m.email && <div><p style={{color:"var(--text-muted)",fontSize:"13px",margin:"0 0 2px"}}>Email</p><p style={{color:"var(--text-heading)",fontSize:"15px",margin:0}}>{m.email}</p></div>}
        {m.phone && <div><p style={{color:"var(--text-muted)",fontSize:"13px",margin:"0 0 2px"}}>Phone</p><p style={{color:"var(--text-heading)",fontSize:"15px",margin:0}}>{m.phone}</p></div>}
        {ha && <div><p style={{color:"var(--text-muted)",fontSize:"13px",margin:"0 0 2px"}}>Address</p><p style={{color:"var(--text-heading)",fontSize:"15px",margin:0,lineHeight:"1.5"}}>{m.address1}{m.address2 ? ", " + m.address2 : ""}<br/>{m.city}{m.state ? ", " + m.state : ""} {m.zip}</p></div>}
        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px"}}><div><p style={{color:"var(--text-muted)",fontSize:"13px",margin:"0 0 2px"}}>Joined</p><p style={{color:"var(--text-heading)",fontSize:"15px",margin:0}}>{fmtDate(m.joinDate)}</p></div><div><p style={{color:"var(--text-muted)",fontSize:"13px",margin:"0 0 2px"}}>Last Dues Paid</p><p style={{color:"var(--text-heading)",fontSize:"15px",margin:0}}>{m.lastDuesPaid ? fmtDate(m.lastDuesPaid) : "Never"}</p></div></div>
        <div><p style={{color:"var(--text-muted)",fontSize:"13px",margin:"0 0 2px"}}>Next Dues Due</p><p style={{color:"var(--text-heading)",fontSize:"15px",margin:0}}>{fmtDate(nd)} <span style={{color:"var(--text-secondary)"}}>($50/yr anniversary)</span></p></div>
        {m.notes && <div><p style={{color:"var(--text-muted)",fontSize:"13px",margin:"0 0 2px"}}>Notes</p><p style={{color:"var(--text-heading)",fontSize:"15px",margin:0}}>{m.notes}</p></div>}
      </div>
    </Modal>
  );
}
