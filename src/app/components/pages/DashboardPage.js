import { Icons } from "../Icons";
import { fmtDate, DuesBadge, Stat } from "../ui";

export function DashboardPage({ members, mwd, speakers, ac, pc, oc }) {
  const today = new Date().toISOString().split("T")[0];
  const nextSpeakers = speakers.filter(s => s.date >= today && !s.noMeeting && s.speaker).slice(0, 3);
  const openSlots = speakers.filter(s => s.date >= today && !s.noMeeting && !s.speaker).length;

  return (
    <div>
      <h1 style={{ color: "var(--text-heading)", fontSize: "26px", fontWeight: "700", margin: "0 0 24px" }}>Dashboard</h1>
      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "32px" }}>
        <Stat icon={Icons.Users} label="Total Members" value={members.length} color="#3b82f6" sub={ac + " active"} />
        <Stat icon={Icons.Check} label="Dues Paid" value={pc} color="#34d399" sub={"of " + ac + " active"} />
        <Stat icon={Icons.Alert} label="Overdue" value={oc} color="#f87171" sub={oc > 0 ? "needs attention" : "all clear"} />
        <Stat icon={Icons.Mic} label="Open Speaker Slots" value={openSlots} color="#a78bfa" sub="upcoming" />
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
        <div style={{ background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border)", padding: "20px" }}>
          <h3 style={{ color: "var(--text-heading)", fontSize: "16px", fontWeight: "600", margin: "0 0 16px" }}>Next Speakers</h3>
          {nextSpeakers.length > 0
            ? <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {nextSpeakers.map((sp, idx) => (
                  <div key={sp.id} style={{ background: "var(--bg-input)", borderRadius: "8px", padding: "14px", border: "1px solid var(--border)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", marginBottom: "6px" }}>
                      <Icons.Cal />
                      <span style={{ color: "var(--accent-text)", fontSize: "14px", fontWeight: "600" }}>{fmtDate(sp.date)}</span>
                      {idx === 0 && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "99px", background: "var(--accent-bg)", color: "var(--accent-text)", fontWeight: "600" }}>NEXT</span>}
                    </div>
                    <div style={{ color: "var(--text-heading)", fontSize: "16px", fontWeight: "600", marginBottom: "2px" }}>{sp.speaker}</div>
                    <div style={{ color: "var(--text-secondary)", fontSize: "13px" }}>{sp.title}{sp.org ? ", " + sp.org : ""}</div>
                    {sp.topic && <div style={{ color: "var(--text-primary)", fontSize: "13px", marginTop: "4px", fontStyle: "italic" }}>{sp.topic}</div>}
                  </div>
                ))}
              </div>
            : <p style={{ color: "var(--text-muted)", fontSize: "15px" }}>No upcoming speakers</p>}
        </div>
        <div style={{ background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border)", padding: "20px" }}>
          <h3 style={{ color: "var(--text-heading)", fontSize: "16px", fontWeight: "600", margin: "0 0 16px" }}>Unpaid Members</h3>
          {mwd.filter(m => m._ds !== "paid" && m.status === "active").length === 0
            ? <p style={{ color: "var(--text-muted)", fontSize: "15px" }}>All paid up!</p>
            : <div style={{ display: "flex", flexDirection: "column", gap: "6px", maxHeight: "340px", overflowY: "auto" }}>
                {mwd.filter(m => m._ds !== "paid" && m.status === "active").map(m => (
                  <div key={m.id} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "8px 12px", background: "var(--bg-input)", borderRadius: "8px", flexShrink: 0 }}>
                    <span style={{ color: "var(--text-primary)", fontSize: "14px" }}>{m.firstName} {m.lastName}</span>
                    <DuesBadge status={m._ds} />
                  </div>
                ))}
              </div>}
        </div>
      </div>
    </div>
  );
}
