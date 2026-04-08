"use client";
import { useState } from "react";
import { Modal, IS, LS, BTN } from "./ui";

export function SpeakerModal({ speaker: sp, onSave, onClose }) {
  const [f, setF] = useState(sp || { date: "", speaker: "", org: "", title: "", topic: "", recruitedBy: "", recruiterPhone: "", noMeeting: false, reason: "" });
  const u = (k, v) => setF(p => ({ ...p, [k]: v }));
  return (
    <Modal title={sp ? "Edit Speaker" : "Add Speaker"} onClose={onClose} footer={<><div onClick={onClose} style={BTN("var(--btn-secondary-bg)", "var(--btn-secondary-text)")}>Cancel</div><div onClick={() => { if (f.date) onSave({ ...f, id: sp?.id || "s" + Date.now() }); }} style={BTN("var(--accent-gradient)")}>{sp ? "Save" : "Add"}</div></>}>
      <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div><label style={LS}>Date *</label><input style={IS} type="date" value={f.date} onChange={e => u("date", e.target.value)} /></div>
        <label style={{ display: "flex", alignItems: "center", gap: "8px", color: "var(--text-primary)", fontSize: "15px", cursor: "pointer" }}><input type="checkbox" checked={f.noMeeting} onChange={e => u("noMeeting", e.target.checked)} style={{ accentColor: "#f87171" }} /> No Meeting</label>
        {f.noMeeting && <div><label style={LS}>Reason</label><input style={IS} value={f.reason} onChange={e => u("reason", e.target.value)} placeholder="e.g. HOLIDAY" /></div>}
        {!f.noMeeting && <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div><label style={LS}>Speaker</label><input style={IS} value={f.speaker} onChange={e => u("speaker", e.target.value)} /></div>
            <div><label style={LS}>Organization</label><input style={IS} value={f.org} onChange={e => u("org", e.target.value)} /></div>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div><label style={LS}>Title</label><input style={IS} value={f.title} onChange={e => u("title", e.target.value)} /></div>
            <div><label style={LS}>Topic</label><input style={IS} value={f.topic} onChange={e => u("topic", e.target.value)} /></div>
          </div>
          <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
            <p style={{ color: "var(--text-muted)", fontSize: "12px", fontWeight: "600", textTransform: "uppercase", letterSpacing: "0.05em", margin: "0 0 12px" }}>Recruiter</p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div><label style={LS}>Recruited By</label><input style={IS} value={f.recruitedBy} onChange={e => u("recruitedBy", e.target.value)} /></div>
              <div><label style={LS}>Phone</label><input style={IS} value={f.recruiterPhone} onChange={e => u("recruiterPhone", e.target.value)} /></div>
            </div>
          </div>
        </>}
      </div>
    </Modal>
  );
}
