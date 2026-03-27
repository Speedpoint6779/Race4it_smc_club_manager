"use client";
import { useState, useEffect, useRef, useCallback } from "react";
import { Icons } from "./Icons";
import { IS, LS, BTN, getDuesStatus } from "./ui";

// ─── Quill loader ────────────────────────────────────────────────────────────
let quillLoaded = false;
function loadQuill() {
  if (quillLoaded || typeof window === "undefined") return Promise.resolve();
  if (window.Quill) { quillLoaded = true; return Promise.resolve(); }
  return new Promise(resolve => {
    if (!document.querySelector('link[href*="quill"]')) {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.min.css";
      document.head.appendChild(link);
      const style = document.createElement("style");
      style.textContent = `
        .ql-toolbar { background:#0f172a !important; border:1px solid #334155 !important; border-bottom:none !important; border-radius:8px 8px 0 0 !important; }
        .ql-container { background:#0f172a !important; border:1px solid #334155 !important; border-radius:0 0 8px 8px !important; }
        .ql-editor { color:#f1f5f9 !important; font-size:14px !important; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif !important; }
        .ql-editor.ql-blank::before { color:#475569 !important; font-style:normal !important; }
        .ql-stroke { stroke:#94a3b8 !important; }
        .ql-fill { fill:#94a3b8 !important; }
        .ql-picker { color:#94a3b8 !important; }
        .ql-picker-options { background:#1e293b !important; border:1px solid #334155 !important; }
        .ql-picker-item { color:#94a3b8 !important; }
        .ql-picker-item:hover { color:#f1f5f9 !important; background:#334155 !important; }
        .ql-active .ql-stroke, button:hover .ql-stroke { stroke:#93c5fd !important; }
        .ql-active .ql-fill, button:hover .ql-fill { fill:#93c5fd !important; }
        .ql-active { color:#93c5fd !important; }
        .ql-snow .ql-picker.ql-expanded .ql-picker-label { color:#93c5fd !important; border-color:#334155 !important; }
        .ql-snow .ql-tooltip { background:#1e293b !important; border:1px solid #334155 !important; color:#f1f5f9 !important; }
        .ql-snow .ql-tooltip input { background:#0f172a !important; border:1px solid #334155 !important; color:#f1f5f9 !important; }
      `;
      document.head.appendChild(style);
    }
    if (!document.querySelector('script[src*="quill"]')) {
      const script = document.createElement("script");
      script.src = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js";
      script.onload = () => { quillLoaded = true; resolve(); };
      document.head.appendChild(script);
    } else {
      const check = setInterval(() => { if (window.Quill) { clearInterval(check); quillLoaded = true; resolve(); } }, 50);
    }
  });
}

const QUILL_TOOLBAR = [
  [{ font: [] }, { size: ["small", false, "large", "huge"] }],
  ["bold", "italic", "underline", "strike"],
  [{ color: [] }, { background: [] }],
  [{ list: "ordered" }, { list: "bullet" }],
  [{ align: [] }],
  ["link"],
  ["clean"],
];

// Set min-height on the editor area safely
function setQuillMinHeight(q, minHeight) {
  // q.root is the .ql-editor div
  q.root.style.minHeight = minHeight;
  // q.root.parentElement is the .ql-container div
  if (q.root.parentElement) q.root.parentElement.style.minHeight = minHeight;
}

// ─── StaticRichEditor ─────────────────────────────────────────────────────────
// Used in template editing. Reads initialHtml once on mount, never re-syncs.
function StaticRichEditor({ initialHtml, onChange, minHeight = "260px" }) {
  const containerRef = useRef(null);
  const initialRef = useRef(initialHtml);

  useEffect(() => {
    let cancelled = false;
    loadQuill().then(() => {
      if (cancelled || !containerRef.current) return;
      const existing = containerRef.current.__quill;
      if (existing) { existing.off("text-change"); }
      const q = new window.Quill(containerRef.current, {
        theme: "snow",
        placeholder: "Write your message here...",
        modules: { toolbar: QUILL_TOOLBAR },
      });
      containerRef.current.__quill = q;
      setQuillMinHeight(q, minHeight);
      if (initialRef.current) q.root.innerHTML = initialRef.current;
      q.on("text-change", () => {
        const html = q.root.innerHTML;
        onChange(html === "<p><br></p>" ? "" : html);
      });
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  return <div ref={containerRef} />;
}

// ─── ControlledRichEditor ─────────────────────────────────────────────────────
// Used in compose modal. Syncs from value when templates are applied.
// Exposes editorRef so parent can read innerHTML directly at send time.
function ControlledRichEditor({ value, onChange, editorRef, minHeight = "180px" }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    loadQuill().then(() => {
      if (cancelled || !containerRef.current || quillRef.current) return;
      const q = new window.Quill(containerRef.current, {
        theme: "snow",
        placeholder: "Write your message here...",
        modules: { toolbar: QUILL_TOOLBAR },
      });
      quillRef.current = q;
      setQuillMinHeight(q, minHeight);
      if (value) q.root.innerHTML = value;
      if (editorRef) editorRef.current = q;
      q.on("text-change", () => {
        const html = q.root.innerHTML;
        onChange(html === "<p><br></p>" ? "" : html);
      });
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Sync when value changes externally (template applied)
  useEffect(() => {
    if (!quillRef.current || value === undefined) return;
    const cur = quillRef.current.root.innerHTML;
    if ((cur === "<p><br></p>" ? "" : cur) !== value) {
      quillRef.current.root.innerHTML = value || "";
    }
  }, [value]);

  return <div ref={containerRef} />;
}

// ─── Template Editor Form ─────────────────────────────────────────────────────
function TemplateEditorForm({ template, onSave, onBack }) {
  const [name, setName] = useState(template?.name || "");
  const [subject, setSubject] = useState(template?.subject || "");
  const [body, setBody] = useState(template?.body_html || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const save = async () => {
    if (!name.trim() || !subject.trim()) { setErr("Name and subject are required."); return; }
    setSaving(true); setErr("");
    try {
      const url = template ? `/api/templates?id=${template.id}` : "/api/templates";
      const method = template ? "PATCH" : "POST";
      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, subject, bodyHtml: body }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Save failed"); setSaving(false); return; }
      onSave();
    } catch { setErr("Network error"); }
    setSaving(false);
  };

  return (
    <div style={{ padding: "20px 24px", display: "flex", flexDirection: "column", gap: "16px" }}>
      <div>
        <label style={LS}>Template Name *</label>
        <input style={IS} value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Dues Reminder" />
      </div>
      <div>
        <label style={LS}>Email Subject *</label>
        <input style={IS} value={subject} onChange={e => setSubject(e.target.value)} placeholder="e.g. Annual Dues Reminder — Senior Men's Club" />
      </div>
      <div>
        <label style={{ ...LS, display: "block", marginBottom: "6px" }}>Message Body</label>
        <p style={{ color: "#64748b", fontSize: "12px", margin: "0 0 8px 0" }}>
          Use the toolbar to format your message. What you see here is exactly how recipients will see it.
        </p>
        <StaticRichEditor initialHtml={template?.body_html || ""} onChange={setBody} minHeight="260px" />
      </div>
      {err && <div style={{ color: "#f87171", fontSize: "13px" }}>{err}</div>}
      <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", paddingTop: "4px" }}>
        <div onClick={onBack} style={BTN("#334155", "#cbd5e1")}>Cancel</div>
        <div onClick={save} style={{ ...BTN("linear-gradient(135deg,#3b82f6,#6366f1)"), opacity: saving ? 0.6 : 1, pointerEvents: saving ? "none" : "auto" }}>
          {saving ? "Saving…" : "Save Template"}
        </div>
      </div>
    </div>
  );
}

// ─── Template Manager ─────────────────────────────────────────────────────────
function TemplateManager({ onClose, onChanged }) {
  const [templates, setTemplates] = useState([]);
  const [editTarget, setEditTarget] = useState(null);

  const load = useCallback(() => {
    fetch("/api/templates").then(r => r.json()).then(d => { if (Array.isArray(d)) setTemplates(d); });
  }, []);

  useEffect(() => { load(); }, [load]);

  const del = async (id) => {
    await fetch(`/api/templates?id=${id}`, { method: "DELETE" });
    load(); onChanged();
  };

  const handleSaved = () => { load(); onChanged(); setEditTarget(null); };
  const isEditing = editTarget !== null;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.75)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "20px" }}>
      <div style={{ background: "#1e293b", borderRadius: "16px", border: "1px solid #334155", width: "100%", maxWidth: "700px", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "18px 24px", borderBottom: "1px solid #334155" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            {isEditing && <div onClick={() => setEditTarget(null)} style={{ color: "#64748b", cursor: "pointer", fontSize: "13px" }}>← Back</div>}
            <h2 style={{ color: "#f1f5f9", fontSize: "17px", fontWeight: "600", margin: 0 }}>
              {isEditing ? (editTarget ? editTarget.name : "New Template") : "Email Templates"}
            </h2>
          </div>
          <div onClick={onClose} style={{ color: "#94a3b8", cursor: "pointer", padding: "4px" }}><Icons.X /></div>
        </div>
        {!isEditing && (
          <div style={{ padding: "20px 24px" }}>
            <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "16px" }}>
              <div onClick={() => setEditTarget(false)} style={{ ...BTN("linear-gradient(135deg,#3b82f6,#6366f1)"), display: "flex", alignItems: "center", gap: "6px" }}>
                <Icons.Plus />New Template
              </div>
            </div>
            {templates.length === 0 ? (
              <div style={{ textAlign: "center", color: "#64748b", padding: "40px", fontSize: "14px" }}>No templates yet. Create your first one above.</div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
                {templates.map(t => (
                  <div key={t.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "14px 16px", background: "#0f172a", borderRadius: "10px", border: "1px solid #334155" }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ color: "#f1f5f9", fontSize: "14px", fontWeight: "600", marginBottom: "3px" }}>{t.name}</div>
                      <div style={{ color: "#64748b", fontSize: "12px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{t.subject}</div>
                    </div>
                    <div onClick={() => setEditTarget(t)} style={{ ...BTN("#1e3a5f"), fontSize: "12px", padding: "6px 14px", color: "#93c5fd", border: "1px solid #3b82f640", whiteSpace: "nowrap" }}>Edit</div>
                    <div onClick={() => del(t.id)} style={{ padding: "7px 9px", borderRadius: "6px", cursor: "pointer", color: "#ef4444", background: "#ef444415", flexShrink: 0 }}>
                      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14H6L5 6"/><path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4h6v2"/></svg>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        {isEditing && (
          <TemplateEditorForm
            key={editTarget ? editTarget.id : "new"}
            template={editTarget || null}
            onSave={handleSaved}
            onBack={() => setEditTarget(null)}
          />
        )}
      </div>
    </div>
  );
}

// ─── Compose Modal ────────────────────────────────────────────────────────────
export function EmailModal({ members, pre, lists = [], onClose, onSend, onListSaved, flash }) {
  const [sel, setSel] = useState(pre || []);
  const [subj, setSubj] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [rs, setRs] = useState("");
  const [err, setErr] = useState("");
  const [templates, setTemplates] = useState([]);
  const [showTplMgr, setShowTplMgr] = useState(false);
  const [showSaveList, setShowSaveList] = useState(false);
  const [listName, setListName] = useState("");
  const [savingList, setSavingList] = useState(false);
  const [saveListErr, setSaveListErr] = useState("");

  // Direct ref to Quill — read innerHTML at send time, bypassing stale state
  const quillEditorRef = useRef(null);

  const loadTemplates = useCallback(() => {
    fetch("/api/templates").then(r => r.json()).then(d => { if (Array.isArray(d)) setTemplates(d); });
  }, []);

  useEffect(() => { loadTemplates(); }, [loadTemplates]);

  const tog = id => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const applyTemplate = (t) => { setSubj(t.subject); setBody(t.body_html || ""); };

  const saveList = async () => {
    if (!listName.trim() || !sel.length) return;
    setSavingList(true); setSaveListErr("");
    try {
      const res = await fetch("/api/lists", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ name: listName.trim(), memberIds: sel }) });
      const data = await res.json();
      if (!res.ok) { setSaveListErr(data.error || "Save failed"); setSavingList(false); return; }
      setShowSaveList(false); setListName(""); setSavingList(false);
      if (onListSaved) onListSaved();
      if (flash) flash(`List "${data.name}" saved!`);
    } catch { setSaveListErr("Network error"); setSavingList(false); }
  };

  const doSend = async () => {
    if (!sel.length || !subj) return;
    const quill = quillEditorRef.current;
    const liveHtml = quill ? (quill.root.innerHTML === "<p><br></p>" ? "" : quill.root.innerHTML) : body;
    if (!liveHtml) return;
    setSending(true); setErr("");
    const plainText = liveHtml
      .replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<li>/gi, "- ")
      .replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/\n{3,}/g, "\n\n").trim();
    try {
      const res = await fetch("/api/email", {
        method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: sel, subject: subj, body: plainText, htmlBody: liveHtml }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Send failed"); setSending(false); return; }
      setSentCount(data.sent); setSending(false); setSent(true);
      setTimeout(() => { onSend(); onClose(); }, 2000);
    } catch { setErr("Network error — could not send"); setSending(false); }
  };

  const fil = members.filter(m => !rs || ((m.firstName + " " + m.lastName + " " + m.email).toLowerCase().includes(rs.toLowerCase())));
  const ok = sel.length > 0 && subj.trim().length > 0;

  return (
    <>
      <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
        <div style={{ background: "#1e293b", borderRadius: "16px", border: "1px solid #334155", width: "100%", maxWidth: "680px", maxHeight: "90vh", overflow: "auto" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #334155" }}>
            <h2 style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600", margin: 0 }}>{sent ? "Sent!" : "Compose Email"}</h2>
            <div onClick={onClose} style={{ color: "#94a3b8", cursor: "pointer", padding: "4px" }}><Icons.X /></div>
          </div>

          {sent ? (
            <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>✅</div>
              <p style={{ color: "#34d399", fontSize: "18px", fontWeight: "600", margin: 0 }}>Sent to {sentCount} member{sentCount !== 1 ? "s" : ""}!</p>
            </div>
          ) : (
            <>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* Templates */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ ...LS, display: "block" }}>Quick Templates</label>
                    <div onClick={() => setShowTplMgr(true)} style={{ color: "#64748b", fontSize: "12px", cursor: "pointer", display: "flex", alignItems: "center", gap: "4px" }}>
                      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/></svg>
                      Manage
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                    {templates.length === 0 && (
                      <span style={{ color: "#64748b", fontSize: "12px" }}>No templates — <span onClick={() => setShowTplMgr(true)} style={{ color: "#93c5fd", cursor: "pointer" }}>create one</span>.</span>
                    )}
                    {templates.map(t => (
                      <span key={t.id} onClick={() => applyTemplate(t)}
                        style={{ cursor: "pointer", padding: "6px 14px", background: "#3b82f615", border: "1px solid #3b82f640", borderRadius: "6px", color: "#93c5fd", fontSize: "12px", fontWeight: "500" }}>
                        {t.name}
                      </span>
                    ))}
                  </div>
                </div>

                {/* Recipients */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ color: "#cbd5e1", fontSize: "13px", fontWeight: "500" }}>Recipients ({sel.length})</label>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span onClick={() => setSel(members.filter(m => m.status === "active").map(m => m.id))} style={{ color: "#3b82f6", fontSize: "12px", cursor: "pointer", padding: "2px 8px", borderRadius: "4px", background: "#3b82f610" }}>All Active</span>
                      <span onClick={() => setSel(members.filter(m => getDuesStatus(m) !== "paid" && m.status === "active").map(m => m.id))} style={{ color: "#fbbf24", fontSize: "12px", cursor: "pointer", padding: "2px 8px", borderRadius: "4px", background: "#fbbf2410" }}>Unpaid</span>
                      {lists.map(l => (
                        <span key={l.id} onClick={() => setSel(l.member_ids)} style={{ color: "#a78bfa", fontSize: "12px", cursor: "pointer", padding: "2px 8px", borderRadius: "4px", background: "#a78bfa10", border: "1px solid #a78bfa30" }}>📋 {l.name}</span>
                      ))}
                      <span onClick={() => setSel([])} style={{ color: "#94a3b8", fontSize: "12px", cursor: "pointer", padding: "2px 8px" }}>Clear</span>
                    </div>
                  </div>
                  <div style={{ position: "relative", marginBottom: "6px" }}>
                    <div style={{ position: "absolute", left: "12px", top: "50%", transform: "translateY(-50%)", color: "#64748b" }}><Icons.Search /></div>
                    <input value={rs} onChange={e => setRs(e.target.value)} placeholder="Search members..." style={{ ...IS, paddingLeft: "38px" }} />
                  </div>
                  <div style={{ maxHeight: "140px", overflow: "auto", background: "#0f172a", borderRadius: "8px", border: "1px solid #334155", padding: "4px" }}>
                    {fil.map(m => (
                      <label key={m.id} style={{ display: "flex", alignItems: "center", gap: "8px", padding: "6px 10px", cursor: "pointer", borderRadius: "6px", color: sel.includes(m.id) ? "#f1f5f9" : "#94a3b8", fontSize: "13px", background: sel.includes(m.id) ? "#334155" : "transparent" }}>
                        <input type="checkbox" checked={sel.includes(m.id)} onChange={() => tog(m.id)} style={{ accentColor: "#3b82f6" }} />
                        <span>{m.firstName} {m.lastName}</span>
                        <span style={{ marginLeft: "auto", color: "#64748b", fontSize: "12px" }}>{m.email || <em style={{ color: "#ef4444" }}>no email</em>}</span>
                      </label>
                    ))}
                    {fil.length === 0 && <p style={{ color: "#64748b", fontSize: "13px", padding: "12px", textAlign: "center", margin: 0 }}>No match</p>}
                  </div>
                  {sel.length > 0 && (
                    <div style={{ marginTop: "8px", display: "flex", flexWrap: "wrap", gap: "4px", alignItems: "center" }}>
                      {sel.map(id => { const m = members.find(x => x.id === id); if (!m) return null; return <span key={id} style={{ display: "inline-flex", alignItems: "center", gap: "4px", padding: "3px 8px 3px 10px", background: "#334155", borderRadius: "99px", fontSize: "12px", color: "#cbd5e1" }}>{m.firstName} {m.lastName}<span onClick={() => tog(id)} style={{ cursor: "pointer", color: "#64748b", fontWeight: "bold" }}>x</span></span>; })}
                      <span onClick={() => setShowSaveList(s => !s)} style={{ cursor: "pointer", padding: "3px 10px", background: "#1e3a5f", border: "1px solid #3b82f640", borderRadius: "99px", fontSize: "12px", color: "#93c5fd" }}>💾 Save as list</span>
                    </div>
                  )}
                  {showSaveList && sel.length > 0 && (
                    <div style={{ marginTop: "10px", display: "flex", gap: "8px", alignItems: "center", background: "#0f172a", padding: "10px 12px", borderRadius: "8px", border: "1px solid #334155" }}>
                      <input value={listName} onChange={e => setListName(e.target.value)} onKeyDown={e => { if (e.key === "Enter") saveList(); }} placeholder="List name (e.g. Board Members)" style={{ ...IS, flex: 1, padding: "7px 10px", fontSize: "13px" }} autoFocus />
                      <div onClick={saveList} style={{ ...BTN("linear-gradient(135deg,#3b82f6,#6366f1)"), fontSize: "12px", padding: "7px 14px", opacity: savingList ? 0.6 : 1, pointerEvents: savingList ? "none" : "auto", whiteSpace: "nowrap" }}>{savingList ? "Saving…" : "Save"}</div>
                      <div onClick={() => { setShowSaveList(false); setListName(""); setSaveListErr(""); }} style={{ color: "#64748b", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}>✕</div>
                    </div>
                  )}
                  {saveListErr && <div style={{ color: "#f87171", fontSize: "12px", marginTop: "4px" }}>{saveListErr}</div>}
                </div>

                <div><label style={LS}>Subject *</label><input style={IS} value={subj} onChange={e => setSubj(e.target.value)} /></div>
                <div>
                  <label style={{ ...LS, display: "block", marginBottom: "6px" }}>Message</label>
                  <ControlledRichEditor value={body} onChange={setBody} editorRef={quillEditorRef} minHeight="180px" />
                </div>
                {err && <div style={{ background: "#7f1d1d33", border: "1px solid #991b1b", borderRadius: "8px", padding: "10px 14px", color: "#fca5a5", fontSize: "13px" }}>{err}</div>}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", padding: "20px 24px", borderTop: "1px solid #334155" }}>
                <div onClick={onClose} style={BTN("#334155", "#cbd5e1")}>Cancel</div>
                <div onClick={doSend} style={{ ...BTN(ok && !sending ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "#334155"), display: "flex", alignItems: "center", gap: "8px", opacity: ok && !sending ? 1 : 0.5, cursor: ok && !sending ? "pointer" : "default" }}>
                  <Icons.Send />{sending ? "Sending..." : "Send Email"}
                </div>
              </div>
            </>
          )}
        </div>
      </div>
      {showTplMgr && <TemplateManager onClose={() => setShowTplMgr(false)} onChanged={loadTemplates} />}
    </>
  );
}
