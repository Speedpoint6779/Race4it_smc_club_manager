import { Icons } from "../Icons";
import { BTN, HS, fmtDate } from "../ui";

export function UsersPage({ appUsers, setEditU, setShowUM, setConfDelU }) {
  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px" }}>
        <div>
          <h1 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "700", margin: "0 0 4px" }}>User Management</h1>
          <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>Manage login accounts</p>
        </div>
        <div onClick={() => { setEditU(null); setShowUM(true); }} style={{ ...BTN("linear-gradient(135deg,#3b82f6,#6366f1)"), display: "flex", alignItems: "center", gap: "6px" }}>
          <Icons.Plus />Add User
        </div>
      </div>
      <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 100px", borderBottom: "1px solid #334155" }}>
          {["Name", "Username", "Created", ""].map(h => <div key={h} style={HS}>{h}</div>)}
        </div>
        {appUsers.map((u, i) => (
          <div key={u.id} style={{ display: "grid", gridTemplateColumns: "2fr 2fr 1fr 100px", borderBottom: i < appUsers.length - 1 ? "1px solid #334155" : "none", alignItems: "center" }}>
            <div style={{ padding: "12px 16px", color: "#f1f5f9", fontSize: "14px", fontWeight: "500" }}>{u.name}</div>
            <div style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "13px" }}>{u.username}</div>
            <div style={{ padding: "12px 16px", color: "#94a3b8", fontSize: "12px" }}>{u.createdAt ? fmtDate(u.createdAt) : ""}</div>
            <div style={{ padding: "12px 16px" }}>
              <div style={{ display: "flex", gap: "4px" }}>
                <div onClick={() => { setEditU(u); setShowUM(true); }} style={{ padding: "5px 8px", background: "#334155", borderRadius: "6px", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Edit /></div>
                <div onClick={() => setConfDelU(u)} style={{ padding: "5px 8px", background: "#334155", borderRadius: "6px", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Trash /></div>
              </div>
            </div>
          </div>
        ))}
        {appUsers.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No users found</div>}
      </div>
      <div style={{ marginTop: "12px", color: "#64748b", fontSize: "12px" }}>{appUsers.length + " user" + (appUsers.length !== 1 ? "s" : "")}</div>
    </div>
  );
}
