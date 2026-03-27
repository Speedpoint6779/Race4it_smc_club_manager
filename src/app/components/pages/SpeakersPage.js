import { useState } from "react";
import { Icons } from "../Icons";
import { SHEET_URL, BTN, HS, fmtDate } from "../ui";
import { SpeakerModal } from "../SpeakerModal";
import { Confirm } from "../ui";

export function SpeakersPage({ speakers, setSpeakers, flash }) {
  const [spFil, setSpFil] = useState("upcoming");
  const [showSM, setShowSM] = useState(false);
  const [editS, setEditS] = useState(null);
  const [confDelS, setConfDelS] = useState(null);
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
  const sCols = "90px 1.5fr 1.5fr 1.2fr 1.5fr 1.5fr 70px";

  const saveS = async (s) => {
    const isEdit = speakers.find(x => x.id === s.id);
    if (isEdit) { await fetch("/api/speakers", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }); setSpeakers(p => p.map(x => x.id === s.id ? s : x)); }
    else { const r = await fetch("/api/speakers", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(s) }); const d = await r.json(); setSpeakers(p => [...p, { ...s, id: d.id || s.id }].sort((a, b) => a.date.localeCompare(b.date))); }
    setShowSM(false); setEditS(null); flash(isEdit ? "Speaker updated" : "Speaker added");
  };
  const delS = async (id) => {
    await fetch("/api/speakers", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setSpeakers(p => p.filter(s => s.id !== id)); setConfDelS(null); flash("Speaker removed");
  };
  const syncFromSheet = async () => {
    setSyncing(true);
    try { await fetch("/api/speakers/sync", { method: "POST" }); const r = await fetch("/api/speakers"); const d = await r.json(); if (Array.isArray(d)) setSpeakers(d); flash("Speakers synced from Google Sheet"); }
    catch (e) { flash("Sync failed"); } finally { setSyncing(false); }
  };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ color: "#f1f5f9", fontSize: "24px", fontWeight: "700", margin: "0 0 4px" }}>Speakers</h1>
          <p style={{ color: "#64748b", fontSize: "13px", margin: 0 }}>Weekly meeting speaker schedule</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <div onClick={syncFromSheet} style={{ ...BTN("#334155", "#cbd5e1"), display: "flex", alignItems: "center", gap: "6px", opacity: syncing ? 0.5 : 1, pointerEvents: syncing ? "none" : "auto" }}><Icons.Refresh />{syncing ? "Syncing..." : "Sync from Sheet"}</div>
          <a href={SHEET_URL} target="_blank" rel="noopener noreferrer" style={{ ...BTN("#334155", "#cbd5e1"), display: "flex", alignItems: "center", gap: "6px", textDecoration: "none" }}><Icons.Ext />Google Sheet</a>
          <div onClick={() => { setEditS(null); setShowSM(true); }} style={{ ...BTN("linear-gradient(135deg,#3b82f6,#6366f1)"), display: "flex", alignItems: "center", gap: "6px" }}><Icons.Plus />Add Speaker</div>
        </div>
      </div>
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px" }}>
        {[["upcoming", "Upcoming"], ["open", "Open Slots (" + openSlots + ")"], ["all", "All"], ["past", "Past"]].map(([k, l]) => (
          <div key={k} onClick={() => setSpFil(k)} style={{ padding: "10px 16px", border: "1px solid", borderRadius: "8px", fontSize: "13px", cursor: "pointer", fontWeight: "500", background: spFil === k ? "#3b82f620" : "#1e293b", borderColor: spFil === k ? "#3b82f6" : "#334155", color: spFil === k ? "#93c5fd" : "#94a3b8" }}>{l}</div>
        ))}
      </div>
      <div style={{ background: "#1e293b", borderRadius: "12px", border: "1px solid #334155", overflow: "hidden" }}>
        <div style={{ display: "grid", gridTemplateColumns: sCols, borderBottom: "1px solid #334155" }}>
          {["Date", "Speaker", "Organization", "Title", "Topic", "Recruited By", ""].map(h => <div key={h} style={HS}>{h}</div>)}
        </div>
        {fsp.map((s, i) => {
          const past = s.date < today;
          const isNext = nextSpeakers.length > 0 && s.id === nextSpeakers[0].id;
          if (s.noMeeting) return (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: "90px 1fr 70px", borderBottom: i < fsp.length - 1 ? "1px solid #334155" : "none", background: "#7f1d1d10", opacity: past ? 0.6 : 1, alignItems: "center" }}>
              <div style={{ padding: "12px 14px" }}><span style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "500" }}>{fmtDate(s.date)}</span></div>
              <div style={{ padding: "12px 14px", color: "#f87171", fontSize: "13px", fontWeight: "600", fontStyle: "italic", textAlign: "center" }}>NO MEETING -- {s.reason}</div>
              <div style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: "4px" }}><div onClick={() => { setEditS(s); setShowSM(true); }} style={{ padding: "5px 8px", background: "#334155", borderRadius: "6px", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Edit /></div><div onClick={() => setConfDelS(s)} style={{ padding: "5px 8px", background: "#334155", borderRadius: "6px", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Trash /></div></div></div>
            </div>
          );
          return (
            <div key={s.id} style={{ display: "grid", gridTemplateColumns: sCols, borderBottom: i < fsp.length - 1 ? "1px solid #334155" : "none", background: isNext ? "#3b82f610" : "transparent", opacity: past ? 0.6 : 1, alignItems: "center" }}>
              <div style={{ padding: "12px 14px" }}><div style={{ display: "flex", alignItems: "center", gap: "6px" }}><span style={{ color: isNext ? "#93c5fd" : "#f1f5f9", fontSize: "14px", fontWeight: isNext ? "700" : "500" }}>{fmtDate(s.date)}</span>{isNext && <span style={{ fontSize: "10px", padding: "2px 6px", borderRadius: "99px", background: "#3b82f630", color: "#93c5fd", fontWeight: "600" }}>NEXT</span>}</div></div>
              <div style={{ padding: "12px 14px", color: s.speaker ? (s.speaker === "TBD" ? "#fbbf24" : "#f1f5f9") : "#64748b", fontSize: "14px", fontWeight: "500", fontStyle: !s.speaker ? "italic" : "normal" }}>{s.speaker || "Open"}</div>
              <div style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "13px" }}>{s.org}</div>
              <div style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "13px" }}>{s.title}</div>
              <div style={{ padding: "12px 14px", color: "#cbd5e1", fontSize: "13px" }}>{s.topic}</div>
              <div style={{ padding: "12px 14px", color: "#94a3b8", fontSize: "12px" }}>{s.recruitedBy}{s.recruiterPhone ? " (" + s.recruiterPhone + ")" : ""}</div>
              <div style={{ padding: "12px 14px" }}><div style={{ display: "flex", gap: "4px" }}><div onClick={() => { setEditS(s); setShowSM(true); }} style={{ padding: "5px 8px", background: "#334155", borderRadius: "6px", color: "#94a3b8", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Edit /></div><div onClick={() => setConfDelS(s)} style={{ padding: "5px 8px", background: "#334155", borderRadius: "6px", color: "#f87171", cursor: "pointer", display: "flex", alignItems: "center" }}><Icons.Trash /></div></div></div>
            </div>
          );
        })}
        {fsp.length === 0 && <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>No speakers found</div>}
      </div>
      <div style={{ marginTop: "12px", color: "#64748b", fontSize: "12px" }}>Click "Sync from Sheet" to pull latest data from the Google Sheet</div>

      {showSM && <SpeakerModal speaker={editS} onSave={saveS} onClose={() => { setShowSM(false); setEditS(null); }} />}
      {confDelS && <Confirm title="Delete Speaker" msg={"Remove " + (confDelS.speaker || "this entry") + " on " + fmtDate(confDelS.date) + "?"} onOk={() => delS(confDelS.id)} onNo={() => setConfDelS(null)} />}
    </div>
  );
}
