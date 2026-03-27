import { Icons } from "../Icons";
import { BTN } from "../ui";
import { EmailModal } from "../EmailModal";
import { useState } from "react";

export function EmailPage({ members, mwd, ac, setPg, setSelMode, setSel }) {
  const [showEM, setShowEM] = useState(false);
  const [emailPre, setEmailPre] = useState([]);

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <h1 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "700", margin: 0 }}>Email</h1>
        <div onClick={() => { setEmailPre([]); setShowEM(true); }} style={{ ...BTN("linear-gradient(135deg,#3b82f6,#6366f1)"), display: "flex", alignItems: "center", gap: "6px" }}>
          <Icons.Send />Compose Email
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px", marginBottom: "24px" }}>
        <div onClick={() => { setEmailPre(members.filter(m => m.status === "active").map(m => m.id)); setShowEM(true); }} style={{ padding: "20px", background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", cursor: "pointer" }}>
          <div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>Email All Active</div>
          <div style={{ color: "#64748b", fontSize: "13px" }}>{ac} recipients</div>
        </div>
        <div onClick={() => { setEmailPre(mwd.filter(m => m._ds !== "paid" && m.status === "active").map(m => m.id)); setShowEM(true); }} style={{ padding: "20px", background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", cursor: "pointer" }}>
          <div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>Email Unpaid Members</div>
          <div style={{ color: "#64748b", fontSize: "13px" }}>{mwd.filter(m => m._ds !== "paid" && m.status === "active").length} recipients</div>
        </div>
        <div onClick={() => { setPg("members"); setSelMode(true); setSel([]); }} style={{ padding: "20px", background: "#1e293b", border: "1px solid #334155", borderRadius: "12px", cursor: "pointer" }}>
          <div style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", marginBottom: "4px" }}>Select Custom List</div>
          <div style={{ color: "#64748b", fontSize: "13px" }}>Pick specific members</div>
        </div>
      </div>
      <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", padding: "24px" }}>
        <h3 style={{ color: "#f1f5f9", fontSize: "15px", fontWeight: "600", margin: "0 0 12px" }}>Email Setup Info</h3>
        <div style={{ color: "#94a3b8", fontSize: "14px", lineHeight: "1.7" }}>
          <p style={{ margin: "0 0 8px" }}>Uses <strong style={{ color: "#cbd5e1" }}>Resend</strong> (free: 100/day, 3,000/month)</p>
          <p style={{ margin: "0 0 4px" }}>1. Create account at resend.com</p>
          <p style={{ margin: "0 0 4px" }}>2. Verify sending domain</p>
          <p style={{ margin: 0 }}>3. Add API key to env variables</p>
        </div>
      </div>
      {showEM && <EmailModal members={members} pre={emailPre} onClose={() => setShowEM(false)} onSend={() => {}} />}
    </div>
  );
}
