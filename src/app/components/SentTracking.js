import { useState, useEffect, useCallback } from "react";

const fmtTime = ts => ts
  ? new Date(ts).toLocaleString("en-US", { month: "short", day: "numeric", hour: "numeric", minute: "2-digit" })
  : "";

const pill = (bg, color) => ({
  padding: "3px 10px", borderRadius: "99px", fontSize: "13px", fontWeight: "600",
  background: bg, color, whiteSpace: "nowrap", display: "inline-block",
});

// Small "12 of 60 opened" pill for a row in the Sent list.
export function TrackingSummary({ entry }) {
  if (!entry?.tracked_count) return null;
  return (
    <div
      style={pill("var(--nav-active-bg)", "var(--accent-text)")}
      title={`${entry.delivered_count} delivered, ${entry.opened_count} opened, ${entry.bounced_count} bounced`}
    >
      {entry.opened_count} of {entry.tracked_count} opened
    </div>
  );
}

function recipientStatus(r) {
  if (r.bounced_at)    return { label: "Bounced",        style: pill("var(--badge-overdue-bg)", "var(--badge-overdue-text)") };
  if (r.complained_at) return { label: "Marked as spam", style: pill("var(--warning-bg)", "var(--warning-text)") };
  if (r.first_opened_at) {
    const times = r.open_count > 1 ? ` (${r.open_count}×)` : "";
    return { label: `Opened${times}`, style: pill("var(--badge-paid-bg)", "var(--badge-paid-text)") };
  }
  if (r.delivered_at)  return { label: "Delivered, not opened", style: pill("var(--bg-hover)", "var(--text-secondary)") };
  return { label: "Sent", style: pill("var(--bg-hover)", "var(--text-muted)") };
}

const FILTERS = [
  { id: "all",      label: "Everyone",   test: () => true },
  { id: "opened",   label: "Opened",     test: r => !!r.first_opened_at },
  { id: "unopened", label: "Not opened", test: r => !r.first_opened_at && !r.bounced_at },
  { id: "bounced",  label: "Bounced",    test: r => !!r.bounced_at },
];

// Per-recipient open tracking panel shown when a sent email is opened.
export function SentTracking({ entry }) {
  const [rows, setRows] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(() => {
    fetch(`/api/email?log_id=${entry.id}`)
      .then(r => r.json())
      .then(d => setRows(Array.isArray(d) ? d : []))
      .catch(() => setRows([]));
  }, [entry.id]);

  useEffect(() => { setRows(null); setFilter("all"); load(); }, [load]);

  const wrap = { padding: "16px 20px", borderBottom: "1px solid var(--border-light)" };

  if (rows === null) {
    return <div style={{ ...wrap, color: "var(--text-muted)", fontSize: "14px" }}>Loading who opened this email…</div>;
  }
  if (rows.length === 0) {
    return (
      <div style={{ ...wrap, color: "var(--text-muted)", fontSize: "14px" }}>
        No open tracking for this email. Tracking covers emails sent after it was turned on.
      </div>
    );
  }

  const counts = Object.fromEntries(FILTERS.map(f => [f.id, rows.filter(f.test).length]));
  const shown = rows.filter(FILTERS.find(f => f.id === filter).test);
  const nameOf = r => [r.first_name, r.last_name].filter(Boolean).join(" ") || r.email;

  return (
    <div style={wrap}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: "12px", marginBottom: "12px", flexWrap: "wrap" }}>
        <div style={{ color: "var(--text-heading)", fontSize: "16px", fontWeight: "600" }}>
          {counts.opened} of {rows.length} opened
          {counts.bounced > 0 && <span style={{ color: "var(--badge-overdue-text)", fontWeight: "500" }}> · {counts.bounced} bounced</span>}
        </div>
        <div onClick={load} style={{ color: "var(--text-muted)", cursor: "pointer", fontSize: "14px" }}>Refresh</div>
      </div>

      <div style={{ display: "flex", gap: "8px", marginBottom: "12px", flexWrap: "wrap" }}>
        {FILTERS.map(f => (
          <div key={f.id} onClick={() => setFilter(f.id)} style={{
            padding: "6px 14px", borderRadius: "8px", cursor: "pointer", fontSize: "14px",
            fontWeight: filter === f.id ? "600" : "400",
            background: filter === f.id ? "var(--nav-active-bg)" : "transparent",
            color: filter === f.id ? "var(--accent-text)" : "var(--text-secondary)",
            border: filter === f.id ? "1px solid var(--accent-border)" : "1px solid var(--border)",
          }}>
            {f.label} ({counts[f.id]})
          </div>
        ))}
      </div>

      <div style={{ maxHeight: "360px", overflowY: "auto", border: "1px solid var(--border)", borderRadius: "8px" }}>
        {shown.length === 0 ? (
          <div style={{ padding: "20px", textAlign: "center", color: "var(--text-muted)", fontSize: "14px" }}>Nobody in this group.</div>
        ) : shown.map((r, i) => {
          const s = recipientStatus(r);
          return (
            <div key={r.id} style={{ display: "flex", alignItems: "center", gap: "12px", padding: "10px 14px", borderBottom: i < shown.length - 1 ? "1px solid var(--border)" : "none" }}>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ color: "var(--text-primary)", fontSize: "15px", fontWeight: "500", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{nameOf(r)}</div>
                <div style={{ color: "var(--text-muted)", fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {r.email}{r.bounced_at && r.bounce_reason ? ` — ${r.bounce_reason}` : ""}
                </div>
              </div>
              <div style={{ textAlign: "right", flexShrink: 0 }}>
                <div style={s.style}>{s.label}</div>
                {r.first_opened_at && <div style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "3px" }}>{fmtTime(r.first_opened_at)}</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "10px", lineHeight: "1.5" }}>
        Opens are approximate. Apple Mail can mark an email opened on its own, and some email programs block the tracking image, so a missing open doesn't always mean unread.
      </div>
    </div>
  );
}
