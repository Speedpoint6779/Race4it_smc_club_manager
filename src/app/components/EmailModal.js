"use client";
import { useState, useEffect, useRef } from "react";
import { Icons } from "./Icons";
import { IS, LS, BTN, getDuesStatus } from "./ui";

const TEMPLATES = {
  dues: {
    subject: "Annual Dues Reminder — Senior Men's Club",
    body: `<p style="margin:0 0 20px 0; font-size:16px; color:#1e293b;">Dear Member,</p>

<p style="margin:0 0 16px 0; font-size:15px; line-height:1.7; color:#334155;">We hope this note finds you well. This is a friendly reminder that your annual dues for the <strong>Senior Men's Club</strong> are now due.</p>

<table style="width:100%; border-collapse:collapse; margin:24px 0; border-radius:8px; overflow:hidden;">
  <tr>
    <td style="background:#f1f5f9; padding:16px 20px; border-left:4px solid #3b82f6;">
      <p style="margin:0 0 4px 0; font-size:12px; font-weight:600; text-transform:uppercase; letter-spacing:0.05em; color:#64748b;">Annual Dues Amount</p>
      <p style="margin:0; font-size:24px; font-weight:700; color:#1e293b;">$50.00</p>
    </td>
  </tr>
</table>

<p style="margin:0 0 12px 0; font-size:15px; line-height:1.7; color:#334155;"><strong>Payment may be made in one of two ways:</strong></p>

<ul style="margin:0 0 20px 0; padding-left:24px; color:#334155; font-size:15px; line-height:1.9;">
  <li>By <strong>check</strong> made payable to <em>Senior Men's Club</em>, delivered to the club treasurer</li>
  <li>By <strong>cash</strong> at the next scheduled club meeting</li>
</ul>

<p style="margin:0 0 20px 0; font-size:15px; line-height:1.7; color:#334155;">If you have already submitted your payment, please disregard this notice — and thank you!</p>

<hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />

<p style="margin:0 0 8px 0; font-size:15px; line-height:1.7; color:#334155;">Your continued membership means a great deal to our club and community. We look forward to seeing you at our upcoming events.</p>

<p style="margin:24px 0 4px 0; font-size:15px; color:#334155;">Warm regards,</p>
<p style="margin:0; font-size:15px; font-weight:600; color:#1e293b;">The Senior Men's Club Officers</p>`,
  },
  meeting: {
    subject: "Upcoming Meeting — Senior Men's Club",
    body: `<p style="margin:0 0 20px 0; font-size:16px; color:#1e293b;">Dear Member,</p>

<p style="margin:0 0 16px 0; font-size:15px; line-height:1.7; color:#334155;">This is a friendly reminder about our upcoming <strong>Senior Men's Club</strong> meeting. We look forward to seeing everyone there.</p>

<p style="margin:0 0 16px 0; font-size:15px; line-height:1.7; color:#334155;">Please check the club calendar for the date, time, and location. If you have any agenda items you would like to bring before the group, kindly contact the club secretary in advance so we can include them on the agenda.</p>

<p style="margin:0 0 20px 0; font-size:15px; line-height:1.7; color:#334155;">Your participation and involvement make our meetings worthwhile — we hope to see you there!</p>

<hr style="border:none; border-top:1px solid #e2e8f0; margin:24px 0;" />

<p style="margin:24px 0 4px 0; font-size:15px; color:#334155;">Warm regards,</p>
<p style="margin:0; font-size:15px; font-weight:600; color:#1e293b;">The Senior Men's Club Officers</p>`,
  },
};

let quillLoaded = false;
function loadQuill() {
  if (quillLoaded || typeof window === "undefined") return Promise.resolve();
  if (window.Quill) { quillLoaded = true; return Promise.resolve(); }
  return new Promise(resolve => {
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.snow.min.css";
    document.head.appendChild(link);
    const style = document.createElement("style");
    style.textContent = `
      .ql-toolbar { background:#0f172a !important; border:1px solid #334155 !important; border-bottom:none !important; border-radius:8px 8px 0 0 !important; }
      .ql-container { background:#0f172a !important; border:1px solid #334155 !important; border-radius:0 0 8px 8px !important; min-height:160px !important; }
      .ql-editor { color:#f1f5f9 !important; font-size:14px !important; font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif !important; min-height:160px !important; }
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
    const script = document.createElement("script");
    script.src = "https://cdnjs.cloudflare.com/ajax/libs/quill/1.3.7/quill.min.js";
    script.onload = () => { quillLoaded = true; resolve(); };
    document.head.appendChild(script);
  });
}

function RichEditor({ value, onChange }) {
  const containerRef = useRef(null);
  const quillRef = useRef(null);
  useEffect(() => {
    let cancelled = false;
    loadQuill().then(() => {
      if (cancelled || !containerRef.current || quillRef.current) return;
      const q = new window.Quill(containerRef.current, {
        theme: "snow",
        placeholder: "Write your message here...",
        modules: {
          toolbar: [
            [{ font: [] }, { size: ["small", false, "large", "huge"] }],
            ["bold", "italic", "underline", "strike"],
            [{ color: [] }, { background: [] }],
            [{ list: "ordered" }, { list: "bullet" }],
            [{ align: [] }],
            ["link"],
            ["clean"],
          ],
        },
      });
      quillRef.current = q;
      if (value) q.root.innerHTML = value;
      q.on("text-change", () => {
        const html = q.root.innerHTML;
        onChange(html === "<p><br></p>" ? "" : html);
      });
    });
    return () => { cancelled = true; };
  }, []); // eslint-disable-line
  useEffect(() => {
    if (quillRef.current && value !== undefined) {
      const currentHtml = quillRef.current.root.innerHTML;
      const normalised = currentHtml === "<p><br></p>" ? "" : currentHtml;
      if (normalised !== value) quillRef.current.root.innerHTML = value || "";
    }
  }, [value]);
  return <div ref={containerRef} />;
}

export function EmailModal({ members, pre, lists = [], onClose, onSend, onListSaved, flash }) {
  const [sel, setSel] = useState(pre || []);
  const [subj, setSubj] = useState("");
  const [body, setBody] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [rs, setRs] = useState("");
  const [err, setErr] = useState("");

  // Save list state
  const [showSaveList, setShowSaveList] = useState(false);
  const [listName, setListName] = useState("");
  const [savingList, setSavingList] = useState(false);
  const [saveListErr, setSaveListErr] = useState("");

  const tog = id => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);

  const applyTemplate = key => {
    setSubj(TEMPLATES[key].subject);
    setBody(TEMPLATES[key].body);
  };

  const saveList = async () => {
    if (!listName.trim() || !sel.length) return;
    setSavingList(true);
    setSaveListErr("");
    try {
      const res = await fetch("/api/lists", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: listName.trim(), memberIds: sel }),
      });
      const data = await res.json();
      if (!res.ok) { setSaveListErr(data.error || "Save failed"); setSavingList(false); return; }
      setShowSaveList(false);
      setListName("");
      setSavingList(false);
      if (onListSaved) onListSaved();
      if (flash) flash(`List "${data.name}" saved!`);
    } catch (e) {
      setSaveListErr("Network error"); setSavingList(false);
    }
  };

  const doSend = async () => {
    if (!sel.length || !subj || !body) return;
    setSending(true);
    setErr("");
    const plainText = body
      .replace(/<br\s*\/?>/gi, "\n").replace(/<\/p>/gi, "\n").replace(/<[^>]+>/g, "")
      .replace(/&nbsp;/g, " ").replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">")
      .replace(/&quot;/g, '"').replace(/\n{3,}/g, "\n\n").trim();
    try {
      const res = await fetch("/api/email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ memberIds: sel, subject: subj, body: plainText, htmlBody: body }),
      });
      const data = await res.json();
      if (!res.ok) { setErr(data.error || "Send failed"); setSending(false); return; }
      setSentCount(data.sent);
      setSending(false);
      setSent(true);
      setTimeout(() => { onSend(); onClose(); }, 2000);
    } catch (e) {
      setErr("Network error — could not send");
      setSending(false);
    }
  };

  const fil = members.filter(m => !rs || ((m.firstName + " " + m.lastName + " " + m.email).toLowerCase().includes(rs.toLowerCase())));
  const ok = sel.length > 0 && subj && body;

  return (
    <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000, padding: "20px" }}>
      <div style={{ background: "#1e293b", borderRadius: "16px", border: "1px solid #334155", width: "100%", maxWidth: "680px", maxHeight: "90vh", overflow: "auto" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "20px 24px", borderBottom: "1px solid #334155" }}>
          <h2 style={{ color: "#f1f5f9", fontSize: "18px", fontWeight: "600", margin: 0 }}>{sent ? "Sent!" : "Compose Email"}</h2>
          <div onClick={onClose} style={{ color: "#94a3b8", cursor: "pointer", padding: "4px" }}><Icons.X /></div>
        </div>
        {sent
          ? <div style={{ padding: "48px 24px", textAlign: "center" }}>
              <div style={{ fontSize: "32px", marginBottom: "12px" }}>✅</div>
              <p style={{ color: "#34d399", fontSize: "18px", fontWeight: "600", margin: 0 }}>Sent to {sentCount} member{sentCount !== 1 ? "s" : ""}!</p>
            </div>
          : <>
              <div style={{ padding: "24px", display: "flex", flexDirection: "column", gap: "16px" }}>

                {/* Templates */}
                <div>
                  <label style={{ ...LS, display: "block", marginBottom: "6px" }}>Quick Templates</label>
                  <div style={{ display: "flex", gap: "8px" }}>
                    <span onClick={() => applyTemplate("dues")} style={{ cursor: "pointer", padding: "6px 12px", background: "#fbbf2415", border: "1px solid #fbbf2440", borderRadius: "6px", color: "#fbbf24", fontSize: "12px", fontWeight: "500" }}>💰 Dues Reminder</span>
                    <span onClick={() => applyTemplate("meeting")} style={{ cursor: "pointer", padding: "6px 12px", background: "#3b82f615", border: "1px solid #3b82f640", borderRadius: "6px", color: "#60a5fa", fontSize: "12px", fontWeight: "500" }}>📅 Meeting Announcement</span>
                  </div>
                </div>

                {/* Recipients */}
                <div>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px" }}>
                    <label style={{ color: "#cbd5e1", fontSize: "13px", fontWeight: "500" }}>Recipients ({sel.length})</label>
                    <div style={{ display: "flex", gap: "6px", flexWrap: "wrap", justifyContent: "flex-end" }}>
                      <span onClick={() => setSel(members.filter(m => m.status === "active").map(m => m.id))} style={{ color: "#3b82f6", fontSize: "12px", cursor: "pointer", padding: "2px 8px", borderRadius: "4px", background: "#3b82f610" }}>All Active</span>
                      <span onClick={() => setSel(members.filter(m => getDuesStatus(m) !== "paid" && m.status === "active").map(m => m.id))} style={{ color: "#fbbf24", fontSize: "12px", cursor: "pointer", padding: "2px 8px", borderRadius: "4px", background: "#fbbf2410" }}>Unpaid</span>
                      {lists.length > 0 && lists.map(l => (
                        <span key={l.id} onClick={() => setSel(l.member_ids)} style={{ color: "#a78bfa", fontSize: "12px", cursor: "pointer", padding: "2px 8px", borderRadius: "4px", background: "#a78bfa10", border: "1px solid #a78bfa30" }}>
                          📋 {l.name}
                        </span>
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
                      <span onClick={() => setShowSaveList(s => !s)} style={{ cursor: "pointer", padding: "3px 10px", background: "#1e3a5f", border: "1px solid #3b82f640", borderRadius: "99px", fontSize: "12px", color: "#93c5fd" }}>
                        💾 Save as list
                      </span>
                    </div>
                  )}
                  {showSaveList && sel.length > 0 && (
                    <div style={{ marginTop: "10px", display: "flex", gap: "8px", alignItems: "center", background: "#0f172a", padding: "10px 12px", borderRadius: "8px", border: "1px solid #334155" }}>
                      <input
                        value={listName}
                        onChange={e => setListName(e.target.value)}
                        onKeyDown={e => { if (e.key === "Enter") saveList(); }}
                        placeholder="List name (e.g. Board Members)"
                        style={{ ...IS, flex: 1, padding: "7px 10px", fontSize: "13px" }}
                        autoFocus
                      />
                      <div onClick={saveList} style={{ ...BTN("linear-gradient(135deg,#3b82f6,#6366f1)"), fontSize: "12px", padding: "7px 14px", opacity: savingList ? 0.6 : 1, pointerEvents: savingList ? "none" : "auto", whiteSpace: "nowrap" }}>
                        {savingList ? "Saving…" : "Save"}
                      </div>
                      <div onClick={() => { setShowSaveList(false); setListName(""); setSaveListErr(""); }} style={{ color: "#64748b", cursor: "pointer", fontSize: "16px", padding: "0 4px" }}>✕</div>
                    </div>
                  )}
                  {saveListErr && <div style={{ color: "#f87171", fontSize: "12px", marginTop: "4px" }}>{saveListErr}</div>}
                </div>

                <div><label style={LS}>Subject *</label><input style={IS} value={subj} onChange={e => setSubj(e.target.value)} /></div>
                <div>
                  <label style={{ ...LS, display: "block", marginBottom: "6px" }}>Message *</label>
                  <RichEditor value={body} onChange={setBody} />
                </div>
                {err && <div style={{ background: "#7f1d1d33", border: "1px solid #991b1b", borderRadius: "8px", padding: "10px 14px", color: "#fca5a5", fontSize: "13px" }}>{err}</div>}
              </div>
              <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", padding: "20px 24px", borderTop: "1px solid #334155" }}>
                <div onClick={onClose} style={BTN("#334155", "#cbd5e1")}>Cancel</div>
                <div onClick={doSend} style={{ ...BTN(ok && !sending ? "linear-gradient(135deg,#3b82f6,#6366f1)" : "#334155"), display: "flex", alignItems: "center", gap: "8px", opacity: ok && !sending ? 1 : 0.5, cursor: ok && !sending ? "pointer" : "default" }}>
                  <Icons.Send />{sending ? "Sending..." : "Send Email"}
                </div>
              </div>
            </>}
      </div>
    </div>
  );
}
