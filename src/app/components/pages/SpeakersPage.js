import { useState } from "react";
import { Icons } from "../Icons";
import { SHEET_URL, BTN, HS, fmtDate } from "../ui";

export function SpeakersPage({ speakers, setSpeakers, flash }) {
  const [spFil, setSpFil] = useState("upcoming");
  const [syncing, setSyncing] = useState(false);

  const today = new Date().toISOString().split("T")[0];
  const nextSpeakers = speakers.filter(s => s.date >= today && !s.noMeeting && s.speaker).slice(0, 3);
  const openSlots = speakers.filter(s => s.date >= today && !s.noMeeting && !s.speaker).length;
  const fsp = speakers.filter(s => {
    if (spFil === "upcoming") return s.date >= today;
    if (spFil === "past") return s.date < today;
    if (spFil === "open") return s.date >= today && !s.noMeeting && !s.speaker;
    return true;
  });
  const sCols = "90px 1.5fr 1.5fr 1.2fr 1.5fr 1.5fr";

  const syncFromSheet = async () => {
    setSyncing(true);
    try {
      await fetch("/api/speakers/sync", { method: "POST" });
      const r = await fetch("/api/speakers");
      const d = await r.json();
      if (Array.isArray(d)) setSpeakers(d);
      flash("Speakers synced from Google Sheet");
    } catch (e) { flash("Sync failed"); } finally { setSyncing(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ color: "var(--text-heading)", fontSize: "26px", fontWeight: "700", margin: "0 0 4px" }}>Speakers</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>Weekly meeting speaker schedule — managed via Google Sheet</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <div onClick={syncFromSheet} style={{ ...BTN("var(--btn-secondary-bg)", "var(--btn-secondary-text)"), display: "flex", alignItems: "center", gap: "6px", opacity: syncing ? 0.5 : 1, pointerEvents: syncing ? "none" : "auto" }}>
            <Icons.Refresh />{syncing ? "Syncing..." : "Sync from Sheet"}
          </div>
          <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" style={{ ...BTN("var(--accent-gradient)"), display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}>
            <Icons.Ext />Open Google Sheet
          </a>
        </div>
      </div>
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        {[["upcoming", "Upcoming"], ["open", "Open Slots (" + openSlots + ")"], ["all", "All"], ["past", "Past"]].map(([k, l]) => (
          <div key={k} onClick={() => setSpFil(k)} style={{ padding: "10px 16px", border: "1px solid", borderRadius: "8px", fontSize: "14px", cursor: "pointer", fontWeight: "500", background: spFil === k ? "var(--accent-bg)" : "var(--bg-card)", borderColor: spFil === k ? "var(--accent)" : "var(--border)", color: spFil === k ? "var(--accent-text)" : "var(--text-secondary)" }}>{l}</div>
        ))}
      </div>
      <div style={{ background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: sCols, borderBottom: "1px solid var(--border)" }}>
          {["Date", "Speaker", "Organization", "Title", "Topic", "Recruited By"].map(h => <div key={h} style={HS}>{h}</div>)}
        </div>
        {fsp.map((s, i) => {
          const past = s.date < today;
          const isNext = nextSpeakers.length > 0 && s.id === nextSpeakers[0].id;
          if (s.noMeeting) return (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr", borderBottom: i < fsp.length - 1 ? "1px solid var(--border)" : "none", background: "var(--error-bg)", opacity: past ? 0.6 : 1, alignItems: "center" }}>
              <div style={{ padding: "12px 14px" }}><span style={{ color: "var(--text-heading)", fontSize: "15px", fontWeight: "500" }}>{fmtDate(s.date)}</span></div>
              <div style={{ padding: "12px 14px", color: "#f87171", fontSize: "14px", fontWeight: "600", fontStyle: "italic" }}>NO MEETING — {s.reason}</div>
            </div>
          );
          return (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: sCols, borderBottom: i < fsp.length - 1 ? "1px solid var(--border)" : "none", background: isNext ? "var(--accent-bg)" : "transparent", opacity: past ? 0.6 : 1, alignItems: "center" }}>
              <div style={{ padding: "12px 14px" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
                  <span style={{ color: isNext ? "var(--accent-text)" : "var(--text-heading)", fontSize: "15px", fontWeight: isNext ? "700" : "500" }}>{fmtDate(s.date)}</span>
                  {isNext && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "99px", background: "var(--accent-bg)", color: "var(--accent-text)", fontWeight: "600" }}>NEXT</span>}
                </div>
              </div>
              <div style={{ padding: "12px 14px", color: s.speaker ? (s.speaker === "TBD" ? "var(--badge-unpaid-text)" : "var(--text-heading)") : "var(--text-muted)", fontSize: "15px", fontWeight: "500", fontStyle: !s.speaker ? "italic" : "normal" }}>{s.speaker || "Open"}</div>
              <div style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: "14px" }}>{s.org}</div>
              <div style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: "14px" }}>{s.title}</div>
              <div style={{ padding: "12px 14px", color: "var(--text-primary)", fontSize: "14px" }}>{s.topic}</div>
              <div style={{ padding: "12px 14px", color: "var(--text-secondary)", fontSize: "13px" }}>{s.recruitedBy}{s.recruiterPhone ? " (" + s.recruiterPhone + ")" : ""}</div>
            </div>
          );
        })}
        {fsp.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)" }}>No speakers found</div>}
      </div>
      <div style={{ marginTop: "12px", color: "var(--text-muted)", fontSize: "13px" }}>
        To add or edit speakers, update the <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)" }}>Google Sheet</a> then click Sync from Sheet.
      </div>
    </div>
  );
}
