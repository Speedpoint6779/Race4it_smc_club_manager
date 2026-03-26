"use client";
import { Icons } from "./Icons";

export const DUES_AMOUNT = 50;
export const SHEET_URL = "https://docs.google.com/spreadsheets/d/1exqw96PYtGnta0BC4bwGkumSIvZAkpMJQ5iI--ucuTY/edit?gid=1762403654#gid=1762403654";

export const IS = { width:"100%", padding:"10px 14px", background:"#0f172a", border:"1px solid #334155", borderRadius:"8px", color:"#f1f5f9", fontSize:"14px", outline:"none", boxSizing:"border-box" };
export const LS = { display:"block", color:"#cbd5e1", fontSize:"13px", fontWeight:"500", marginBottom:"6px" };
export const BTN = (bg, c) => ({ padding:"10px 20px", background:bg, color:c||"white", borderRadius:"8px", fontSize:"14px", fontWeight:"600", cursor:"pointer" });
export const HS = { padding:"12px 14px", color:"#64748b", fontSize:"11px", fontWeight:"600", textTransform:"uppercase", letterSpacing:"0.05em" };

export const fmtDate = d => { if(!d) return ""; const [y,m,day]=d.split("-"); return m+"/"+day+"/"+y.slice(2); };

export function getDuesStatus(m) {
  const now=new Date(), jd=new Date(m.joinDate+"T00:00:00"), lp=m.lastDuesPaid?new Date(m.lastDuesPaid+"T00:00:00"):null;
  let nd=new Date(jd); nd.setFullYear(now.getFullYear());
  if(nd&lt;jd) nd.setFullYear(nd.getFullYear()+1);
  if(nd>now) nd.setFullYear(nd.getFullYear()-1);
  if(nd&lt;jd) return "paid";
  if(!lp) return (now-nd)/(864e5)>30?"overdue":"unpaid";
  if(lp>=nd) return "paid";
  return (now-nd)/(864e5)>30?"overdue":"unpaid";
}

export function getNextDue(m) {
  const now=new Date(), jd=new Date(m.joinDate+"T00:00:00");
  let nd=new Date(jd); nd.setFullYear(now.getFullYear());
  if(nd&lt;=now) nd.setFullYear(nd.getFullYear()+1);
  if(nd&lt;jd) nd=new Date(jd);
  return nd.toISOString().split("T")[0];
}

export function DuesBadge({ status }) {
  const s = { paid:{bg:"#065f4633",c:"#34d399"}, unpaid:{bg:"#78350f33",c:"#fbbf24"}, overdue:{bg:"#7f1d1d33",c:"#fca5a5"} }[status] || {bg:"#78350f33",c:"#fbbf24"};
  return &lt;span style={{fontSize:"11px",padding:"3px 10px",borderRadius:"99px",fontWeight:"600",background:s.bg,color:s.c,textTransform:"capitalize"}}&gt;{status}&lt;/span&gt;;
}

export function Stat({ icon:I, label, value, color, sub }) {
  return &lt;div style={{background:"#1e293b",borderRadius:"12px",border:"1px solid #334155",padding:"20px",flex:"1",minWidth:"130px"}}&gt;&lt;div style={{display:"flex",alignItems:"center",gap:"10px",marginBottom:"12px"}}&gt;&lt;div style={{color}}&gt;&lt;I/&gt;&lt;/div&gt;&lt;span style={{color:"#94a3b8",fontSize:"13px"}}&gt;{label}&lt;/span&gt;&lt;/div&gt;&lt;div style={{color:"#f1f5f9",fontSize:"28px",fontWeight:"700"}}&gt;{value}&lt;/div&gt;{sub&amp;&amp;&lt;div style={{color:"#64748b",fontSize:"12px",marginTop:"4px"}}&gt;{sub}&lt;/div&gt;}&lt;/div&gt;;
}

export function Modal({ title, onClose, children, footer }) {
  return (&lt;div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1000,padding:"20px"}}&gt;&lt;div style={{background:"#1e293b",borderRadius:"16px",border:"1px solid #334155",width:"100%",maxWidth:"560px",maxHeight:"90vh",overflow:"auto"}}&gt;&lt;div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 24px",borderBottom:"1px solid #334155"}}&gt;&lt;h2 style={{color:"#f1f5f9",fontSize:"18px",fontWeight:"600",margin:0}}&gt;{title}&lt;/h2&gt;&lt;div onClick={onClose} style={{color:"#94a3b8",cursor:"pointer",padding:"4px"}}&gt;&lt;Icons.X/&gt;&lt;/div&gt;&lt;/div&gt;&lt;div style={{padding:"24px"}}&gt;{children}&lt;/div&gt;{footer&amp;&amp;&lt;div style={{display:"flex",justifyContent:"flex-end",gap:"12px",padding:"20px 24px",borderTop:"1px solid #334155"}}&gt;{footer}&lt;/div&gt;}&lt;/div&gt;&lt;/div&gt;);
}

export function Confirm({ title, msg, onOk, onNo }) {
  return (&lt;div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.6)",display:"flex",alignItems:"center",justifyContent:"center",zIndex:1100,padding:"20px"}}&gt;&lt;div style={{background:"#1e293b",borderRadius:"16px",border:"1px solid #334155",width:"100%",maxWidth:"400px",padding:"24px"}}&gt;&lt;h3 style={{color:"#f1f5f9",fontSize:"16px",margin:"0 0 8px"}}&gt;{title}&lt;/h3&gt;&lt;p style={{color:"#94a3b8",fontSize:"14px",margin:"0 0 24px",lineHeight:"1.5"}}&gt;{msg}&lt;/p&gt;&lt;div style={{display:"flex",justifyContent:"flex-end",gap:"12px"}}&gt;&lt;div onClick={onNo} style={BTN("#334155","#cbd5e1")}&gt;Cancel&lt;/div&gt;&lt;div onClick={onOk} style={BTN("#dc2626")}&gt;Delete&lt;/div&gt;&lt;/div&gt;&lt;/div&gt;&lt;/div&gt;);
}
