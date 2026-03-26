"use client";
import { useState } from "react";
import { Modal, IS, LS, BTN } from "./ui";

export function SpeakerModal({ speaker: sp, onSave, onClose }) {
  const [f, setF] = useState(sp || { date:"", speaker:"", org:"", title:"", topic:"", recruitedBy:"", recruiterPhone:"", noMeeting:false, reason:"" });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    &lt;Modal title={sp ? "Edit Speaker" : "Add Speaker"} onClose={onClose} footer={&lt;&gt;&lt;div onClick={onClose} style={BTN("#334155","#cbd5e1")}&gt;Cancel&lt;/div&gt;&lt;div onClick={() => { if(f.date) onSave({ ...f, id: sp?.id || "s" + Date.now() }) }} style={BTN("linear-gradient(135deg,#3b82f6,#6366f1)")}&gt;{sp ? "Save" : "Add"}&lt;/div&gt;&lt;/&gt;}&gt;
      &lt;div style={{display:"flex",flexDirection:"column",gap:"16px"}}&gt;
        &lt;div&gt;&lt;label style={LS}&gt;Date *&lt;/label&gt;&lt;input style={IS} type="date" value={f.date} onChange={e => u("date", e.target.value)}/&gt;&lt;/div&gt;
        &lt;label style={{display:"flex",alignItems:"center",gap:"8px",color:"#cbd5e1",fontSize:"14px",cursor:"pointer"}}&gt;&lt;input type="checkbox" checked={f.noMeeting} onChange={e => u("noMeeting", e.target.checked)} style={{accentColor:"#f87171"}}/&gt; No Meeting&lt;/label&gt;
        {f.noMeeting &amp;&amp; &lt;div&gt;&lt;label style={LS}&gt;Reason&lt;/label&gt;&lt;input style={IS} value={f.reason} onChange={e => u("reason", e.target.value)} placeholder="e.g. HOLIDAY"/&gt;&lt;/div&gt;}
        {!f.noMeeting &amp;&amp; &lt;&gt;
          &lt;div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}&gt;&lt;div&gt;&lt;label style={LS}&gt;Speaker&lt;/label&gt;&lt;input style={IS} value={f.speaker} onChange={e => u("speaker", e.target.value)}/&gt;&lt;/div&gt;&lt;div&gt;&lt;label style={LS}&gt;Organization&lt;/label&gt;&lt;input style={IS} value={f.org} onChange={e => u("org", e.target.value)}/&gt;&lt;/div&gt;&lt;/div&gt;
          &lt;div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}&gt;&lt;div&gt;&lt;label style={LS}&gt;Title&lt;/label&gt;&lt;input style={IS} value={f.title} onChange={e => u("title", e.target.value)}/&gt;&lt;/div&gt;&lt;div&gt;&lt;label style={LS}&gt;Topic&lt;/label&gt;&lt;input style={IS} value={f.topic} onChange={e => u("topic", e.target.value)}/&gt;&lt;/div&gt;&lt;/div&gt;
          &lt;div style={{borderTop:"1px solid #334155",paddingTop:"16px"}}&gt;&lt;p style={{color:"#64748b",fontSize:"12px",fontWeight:"600",textTransform:"uppercase",letterSpacing:"0.05em",margin:"0 0 12px"}}&gt;Recruiter&lt;/p&gt;&lt;div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"16px"}}&gt;&lt;div&gt;&lt;label style={LS}&gt;Recruited By&lt;/label&gt;&lt;input style={IS} value={f.recruitedBy} onChange={e => u("recruitedBy", e.target.value)}/&gt;&lt;/div&gt;&lt;div&gt;&lt;label style={LS}&gt;Phone&lt;/label&gt;&lt;input style={IS} value={f.recruiterPhone} onChange={e => u("recruiterPhone", e.target.value)}/&gt;&lt;/div&gt;&lt;/div&gt;&lt;/div&gt;
        &lt;/&gt;}
      &lt;/div&gt;
    &lt;/Modal&gt;
  );
}
