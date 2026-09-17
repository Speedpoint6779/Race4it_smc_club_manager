import { useState, useEffect, useMemo } from "react";
import { Icons } from "../Icons";
import { BTN, HS, Stat } from "../ui";

const CAPACITY = 100;

function fmtDateTime(iso) {
  if (!iso) return "";
  const d = new Date(iso);
  if (isNaN(d)) return "";
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function csvCell(v) {
  const s = String(v == null ? "" : v);
  return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
}

export function DinnerPage({ flash }) {
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [reloading, setReloading] = useState(false);

  const load = async (announce) => {
    if (announce) setReloading(true);
    try {
      const r = await fetch("/api/dinner-registrations");
      const d = await r.json();
      if (Array.isArray(d)) { setRows(d); if (announce) flash("Registrations refreshed"); }
      else if (announce) flash("Could not load registrations");
    } catch (e) {
      if (announce) flash("Could not load registrations");
    } finally {
      setLoading(false); setReloading(false);
    }
  };

  useEffect(() => { load(false); }, []);

  const stats = useMemo(() => {
    let guests = 0, collected = 0, beef = 0, fish = 0, other = 0;
    const tallyEntree = e => {
      if (!e) return;
      if (/beef/i.test(e)) beef++;
      else if (/fish/i.test(e)) fish++;
      else other++;
    };
    for (const row of rows) {
      guests += row.tickets || 0;
      collected += row.amount || 0;
      tallyEntree(row.memberEntree);
      if ((row.tickets || 1) >= 2) tallyEntree(row.guestEntree);
    }
    return { guests, collected, beef, fish, other, remaining: Math.max(0, CAPACITY - guests) };
  }, [rows]);

  const downloadCsv = () => {
    const headers = ["Member", "Guest", "Tickets", "Member entree", "Guest entree", "First car", "Email", "Phone", "Amount", "Paid"];
    const lines = [headers.join(",")];
    for (const r of rows) {
      lines.push([
        r.memberName, r.guestName, r.tickets, r.memberEntree, r.guestEntree,
        r.car, r.email, r.phone, "$" + (r.amount || 0), fmtDateTime(r.paidAt),
      ].map(csvCell).join(","));
    }
    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "annual-dinner-registrations.csv";
    document.body.appendChild(a); a.click(); a.remove();
    URL.revokeObjectURL(url);
  };

  const cols = "1.3fr 1.1fr 70px 1.4fr 1.3fr 1.4fr 110px";
  const cell = { padding: "12px 14px", fontSize: "14px", color: "var(--text-primary)", borderTop: "1px solid var(--border)" };

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "24px", flexWrap: "wrap", gap: "12px" }}>
        <div>
          <h1 style={{ color: "var(--text-heading)", fontSize: "26px", fontWeight: "700", margin: "0 0 4px" }}>Annual Dinner</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "14px", margin: 0 }}>Paid registrations for October 17, 2026</p>
        </div>
        <div style={{ display: "flex", gap: "8px" }}>
          <div onClick={() => load(true)} style={{ ...BTN("var(--btn-secondary-bg)", "var(--btn-secondary-text)"), display: "flex", alignItems: "center", gap: "6px", opacity: reloading ? 0.5 : 1, pointerEvents: reloading ? "none" : "auto" }}>
            <Icons.Refresh />{reloading ? "Refreshing..." : "Refresh"}
          </div>
          <div onClick={rows.length ? downloadCsv : undefined} style={{ ...BTN("var(--accent-gradient)"), display: "flex", alignItems: "center", gap: "6px", opacity: rows.length ? 1 : 0.5, pointerEvents: rows.length ? "auto" : "none" }}>
            <Icons.List />Download CSV
          </div>
        </div>
      </div>

      <div style={{ display: "flex", gap: "16px", flexWrap: "wrap", marginBottom: "24px" }}>
        <Stat icon={Icons.Users} label="Guests attending" value={stats.guests} sub={stats.remaining + " of " + CAPACITY + " tickets left"} />
        <Stat icon={Icons.Check} label="Reservations" value={rows.length} />
        <Stat icon={Icons.Dollar} label="Collected" value={"$" + stats.collected.toLocaleString()} />
        <Stat icon={Icons.List} label="Entrees" value={stats.beef + " beef / " + stats.fish + " fish"} sub={stats.other ? stats.other + " other" : ""} />
      </div>

      <div style={{ background: "var(--bg-card)", borderRadius: "12px", border: "1px solid var(--border)", overflow: "hidden" }}>
        <div style={{ overflowX: "auto" }}>
          <div style={{ minWidth: "860px" }}>
            <div style={{ display: "grid", gridTemplateColumns: cols, background: "var(--bg-input)" }}>
              {["Member", "Guest", "Tickets", "Dinners", "First car", "Contact", "Paid"].map(h => (
                <div key={h} style={HS}>{h}</div>
              ))}
            </div>
            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "15px" }}>Loading registrations...</div>
            ) : rows.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "var(--text-muted)", fontSize: "15px" }}>No paid registrations yet.</div>
            ) : rows.map(r => (
              <div key={r.id} style={{ display: "grid", gridTemplateColumns: cols, alignItems: "center" }}>
                <div style={{ ...cell, fontWeight: "600" }}>{r.memberName}</div>
                <div style={cell}>{r.guestName || <span style={{ color: "var(--text-muted)" }}>&mdash;</span>}</div>
                <div style={cell}>{r.tickets}</div>
                <div style={cell}>
                  {r.memberEntree}{r.tickets >= 2 && r.guestEntree ? <span style={{ color: "var(--text-muted)" }}>{" + " + r.guestEntree}</span> : null}
                </div>
                <div style={cell}>{r.car || <span style={{ color: "var(--text-muted)" }}>&mdash;</span>}</div>
                <div style={cell}>
                  <div><a href={"mailto:" + r.email} style={{ color: "var(--text-primary)", textDecoration: "none" }}>{r.email}</a></div>
                  {r.phone ? <div style={{ color: "var(--text-muted)", fontSize: "13px" }}>{r.phone}</div> : null}
                </div>
                <div style={{ ...cell, color: "var(--text-muted)" }}>{fmtDateTime(r.paidAt)}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
