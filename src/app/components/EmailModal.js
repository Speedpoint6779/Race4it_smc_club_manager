"use client";
import { useState } from "react";
import { Icons } from "./Icons";
import { IS, LS, BTN, getDuesStatus } from "./ui";

export function EmailModal({ members, pre, onClose, onSend }) {
  const [sel, setSel] = useState(pre || []);
  const [subj, setSubj] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [rs, setRs] = useState("");
  const tog = id => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const doSend = () => { if (!sel.length || !subj || !body) return; setSending(true); setTimeout(() => { setSending(false); setSent(true); setTimeout(() => { onSend(); onClose() }, 1500) }, 1200); };
  const fil = members.filter(m => !rs || ((m.firstName + " " + m.lastName + " " + m.email).toLowerCase().includes(rs.toLowerCase())));
  const ok = sel.length > 0 &amp;&amp; subj &amp;&amp; body;
  return (
    &lt;div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}&gt;
      &lt;div style={{ background: "#1e293b", borderRadius: "16px", border: "1px solid #334155", width: "100%", maxWidth: "620px", maxHeight: "90vh", overflow: "auto" }}&gt;
        &lt;div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #334155" }}&gt;
          &lt;h2 style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600", margin: 0 }}&gt;{sent ? "Sent!" : "Compose Email"}&lt;/h2&gt;
          &lt;div onClick={onClose} style={{ color: "#94a3b8", cursor: "pointer", padding: "4px" }}&gt;&lt;Icons.X /&gt;&lt;/div&gt;
        &lt;/div&gt;
        {sent ? &lt;div style={{ padding: "48px 24px", textAlign: "center" }}&gt;&lt;p style={{ color: "#34d399", fontSize: "18px", fontWeight: "600" }}&gt;Sent to {sel.length} member{sel.length !== 1 ? "s" : ""}&lt;/p&gt;&lt;/div&gt; :
          &lt;&gt;
            &lt;div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}&gt;
              &lt;div&gt;
                &lt;div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}&gt;
                  &lt;label style={{ color: "#cbd5e1", fontSize: "13px", fontWeight: "500" }}&gt;Recipients ({sel.length})&lt;/label&gt;
                  &lt;div style={{ display: "flex", gap: "6px" }}&gt;
                    &lt;span onClick={() => setSel(members.filter(m => m.status === "active").map(m => m.id))} style={{ color: "#3b82f6", fontSize: "12px", cursor: "pointer", padding: "2px 8px", borderRadius: "4px", background: "#3b82f610" }}&gt;All Active&lt;/span&gt;
                    &lt;span onClick={() => setSel(members.filter(m => getDuesStatus(m) !== "paid" &amp;&amp; m.status === "active").map(m => m.id))} style={{ color: "#fbbf24", fontSize: "12px", cursor: "pointer", padding: "2px 8px", borderRadius: "4px", background: "#fbbf2410" }}&gt;Unpaid&lt;/span&gt;
                    &lt;span onClick={() => setSel([])} style={{ color: "#94a3b8", fontSize: "12px", cursor: "pointer", padding: "2px 8px" }}&gt;Clear&lt;/span&gt;
                  &lt;/div&gt;
                &lt;/div&gt;
                &lt;div style={{ position: "relative", marginBottom: "6px" }}&gt;&lt;div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }}&gt;&lt;Icons.Search /&gt;&lt;/div&gt;&lt;input value={rs} onChange={e => setRs(e.target.value)} placeholder="Search members..." style={{ ...IS, paddingLeft: "38px" }} /&gt;&lt;/div&gt;
                &lt;div style={{ maxHeight: "140px", overflow: "auto", background: "#0f172a", borderRadius: "8px", border: "1px solid #334155", padding: "4px" }}&gt;
                  {fil.map(m => &lt;label key={m.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", cursor: "pointer", borderRadius: "6px", color: sel.includes(m.id) ? "#f1f5f9" : "#94a3b8", fontSize: "13px", background: sel.includes(m.id) ? "#334155" : "transparent" }}&gt;&lt;input type="checkbox" checked={sel.includes(m.id)} onChange={() => tog(m.id)} style={{ accentColor: "#3b82f6" }} /&gt;&lt;span&gt;{m.firstName} {m.lastName}&lt;/span&gt;&lt;span style={{ marginLeft: "auto", color: "#64748b", fontSize: "12px" }}&gt;{m.email}&lt;/span&gt;&lt;/label&gt;)}
                  {fil.length === 0 &amp;&amp; &lt;p style={{ color: "#64748b", fontSize: "13px", padding: "12px", textAlign: "center", margin: 0 }}&gt;No match&lt;/p&gt;}
                &lt;/div&gt;
                {sel.length > 0 &amp;&amp; &lt;div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "4px" }}&gt;{sel.map(id => { const m = members.find(x => x.id === id); if (!m) return null; return &lt;span key={id} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px 3px 10px", background: "#334155", borderRadius: "99px", fontSize: "12px", color: "#cbd5e1" }}&gt;{m.firstName} {m.lastName}&lt;span onClick={() => tog(id)} style={{ cursor: "pointer", color: "#64748b", fontWeight: "bold" }}&gt;x&lt;/span&gt;&lt;/span&gt; })}&lt;/div&gt;}
              &lt;/div&gt;
              &lt;div&gt;&lt;label style={LS}&gt;Subject *&lt;/label&gt;&lt;input style={IS} value={subj} onChange={e => setSubj(e.target.value)} /&gt;&lt;/div&gt;
              &lt;div&gt;&lt;label style={LS}&gt;Message *&lt;/label&gt;&lt;textarea style={{ ...IS, minHeight: "120px", resize: "vertical", fontFamily: "inherit", lineHeight: "1.5" }} value={body} onChange={e => setBody(e.target.value)} /&gt;&lt;/div&gt;
            &lt;/div&gt;
            &lt;div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", padding: "20px 24px", borderTop: "1px solid #334155" }}&gt;
              &lt;div onClick={onClose} style={BTN("#334155", "#cbd5e1")}&gt;Cancel&lt;/div&gt;
              &lt;div onClick={doSend} style={{ ...BTN(ok ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "#334155"), display: "flex", alignItems: "center", gap: "8px", opacity: ok ? 1 : 0.5 }}&gt;&lt;Icons.Send /&gt;{sending ? "Sending..." : "Send Email"}&lt;/div&gt;
            &lt;/div&gt;
          &lt;/&gt;}
      &lt;/div&gt;
    &lt;/div&gt;
  );
}
