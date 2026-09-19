"use client";
import { useState } from "react";
import { Icons } from "./Icons";
import { Modal, IS, LS, BTN } from "./ui";

export const TICKET_PRICE = 25;
const ENTREES = ["Beef tenderloin", "Fish"];
const METHODS = [
  { v: "check", l: "Check" },
  { v: "cash", l: "Cash" },
  { v: "stripe", l: "Card (Stripe)" },
  { v: "comp", l: "Comped" },
];

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function toDateInput(iso) {
  if (!iso) return todayISO();
  const d = new Date(iso);
  return isNaN(d) ? todayISO() : d.toISOString().split("T")[0];
}

export function DinnerModal({ reg, onSave, onClose }) {
  const [memberName, setMemberName] = useState(reg?.memberName || "");
  const [email, setEmail] = useState(reg?.email || "");
  const [phone, setPhone] = useState(reg?.phone || "");
  const [memberEntree, setMemberEntree] = useState(reg?.memberEntree || ENTREES[0]);
  const [guests, setGuests] = useState(
    reg?.guests?.length ? reg.guests.map(g => ({ ...g })) : []
  );
  const [carMake, setCarMake] = useState(reg?.carMake || "");
  const [carModel, setCarModel] = useState(reg?.carModel || "");
  const [carYear, setCarYear] = useState(reg?.carYear || "");
  const [paymentMethod, setPaymentMethod] = useState(reg?.paymentMethod || "check");
  const [paidAt, setPaidAt] = useState(toDateInput(reg?.paidAt));
  const [notes, setNotes] = useState(reg?.notes || "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState("");

  const tickets = 1 + guests.length;
  const suggested = tickets * TICKET_PRICE;
  const [amount, setAmount] = useState(
    reg && reg.amount != null ? String(reg.amount) : String(suggested)
  );
  const [amountTouched, setAmountTouched] = useState(!!reg);

  // Until the officer types an amount, keep it in step with the ticket count.
  const setGuestList = (next) => {
    setGuests(next);
    if (!amountTouched) setAmount(String((1 + next.length) * TICKET_PRICE));
  };
  const addGuest = () => setGuestList([...guests, { name: "", entree: ENTREES[0] }]);
  const removeGuest = (i) => setGuestList(guests.filter((_, x) => x !== i));
  const editGuest = (i, k, v) =>
    setGuests(guests.map((g, x) => (x === i ? { ...g, [k]: v } : g)));

  const submit = async () => {
    if (!memberName.trim()) { setErr("Member name is required."); return; }
    if (!email.trim()) { setErr("Email is required."); return; }
    if (guests.some(g => !g.name.trim())) { setErr("Every guest needs a name."); return; }
    setErr(""); setSaving(true);
    try {
      await onSave({
        id: reg?.id,
        memberName: memberName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        memberEntree,
        guests: guests.map(g => ({ name: g.name.trim(), entree: g.entree })),
        carMake: carMake.trim(),
        carModel: carModel.trim(),
        carYear: carYear.trim(),
        amount: amount === "" ? null : Number(amount),
        paymentMethod,
        paidAt,
        notes: notes.trim(),
      });
    } catch (e) {
      setErr("Could not save. Please try again.");
      setSaving(false);
    }
  };

  const row2 = { display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px", marginBottom: "16px" };
  const sectionLabel = {
    ...LS, marginTop: "4px", marginBottom: "10px", fontSize: "13px",
    textTransform: "uppercase", letterSpacing: "0.05em", color: "var(--text-muted)",
  };

  return (
    <Modal
      title={reg ? "Edit Registration" : "Add Registration"}
      onClose={onClose}
      footer={
        <>
          <div onClick={onClose} style={BTN("var(--btn-secondary-bg)", "var(--btn-secondary-text)")}>Cancel</div>
          <div
            onClick={saving ? undefined : submit}
            style={{ ...BTN("var(--accent-gradient)"), opacity: saving ? 0.5 : 1, pointerEvents: saving ? "none" : "auto" }}
          >
            {saving ? "Saving..." : reg ? "Save Changes" : "Add Registration"}
          </div>
        </>
      }
    >
      {err && (
        <div style={{ background: "var(--badge-overdue-bg)", color: "var(--badge-overdue-text)", padding: "10px 14px", borderRadius: "8px", fontSize: "14px", marginBottom: "16px" }}>
          {err}
        </div>
      )}

      <div style={{ marginBottom: "16px" }}>
        <label style={LS}>Member name</label>
        <input value={memberName} onChange={e => setMemberName(e.target.value)} style={IS} placeholder="First and last name" />
      </div>

      <div style={row2}>
        <div>
          <label style={LS}>Email</label>
          <input value={email} onChange={e => setEmail(e.target.value)} style={IS} placeholder="name@example.com" />
        </div>
        <div>
          <label style={LS}>Phone</label>
          <input value={phone} onChange={e => setPhone(e.target.value)} style={IS} placeholder="Optional" />
        </div>
      </div>

      <div style={{ marginBottom: "20px" }}>
        <label style={LS}>Member entree</label>
        <select value={memberEntree} onChange={e => setMemberEntree(e.target.value)} style={IS}>
          {ENTREES.map(o => <option key={o} value={o}>{o}</option>)}
        </select>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px", marginBottom: "20px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={sectionLabel}>Guests ({guests.length})</span>
          <span style={{ color: "var(--text-muted)", fontSize: "13px" }}>{tickets} {tickets === 1 ? "ticket" : "tickets"}</span>
        </div>
        {guests.map((g, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1fr 1fr 36px", gap: "8px", marginBottom: "10px", alignItems: "center" }}>
            <input value={g.name} onChange={e => editGuest(i, "name", e.target.value)} style={IS} placeholder={"Guest " + (i + 1) + " name"} />
            <select value={g.entree} onChange={e => editGuest(i, "entree", e.target.value)} style={IS}>
              {ENTREES.map(o => <option key={o} value={o}>{o}</option>)}
            </select>
            <div
              onClick={() => removeGuest(i)}
              title="Remove guest"
              style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "9px", background: "var(--btn-secondary-bg)", borderRadius: "8px", color: "#f87171", cursor: "pointer" }}
            >
              <Icons.Trash />
            </div>
          </div>
        ))}
        <div
          onClick={addGuest}
          style={{ display: "inline-flex", alignItems: "center", gap: "6px", padding: "8px 14px", background: "var(--btn-secondary-bg)", color: "var(--text-secondary)", borderRadius: "8px", fontSize: "14px", fontWeight: "500", cursor: "pointer", marginTop: guests.length ? "2px" : "6px" }}
        >
          <Icons.Plus />Add guest
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
        <div style={sectionLabel}>First car (optional)</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 90px", gap: "12px", marginBottom: "20px" }}>
          <input value={carMake} onChange={e => setCarMake(e.target.value)} style={IS} placeholder="Make" />
          <input value={carModel} onChange={e => setCarModel(e.target.value)} style={IS} placeholder="Model" />
          <input value={carYear} onChange={e => setCarYear(e.target.value)} style={IS} placeholder="Year" />
        </div>
      </div>

      <div style={{ borderTop: "1px solid var(--border)", paddingTop: "16px" }}>
        <div style={sectionLabel}>Payment</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "12px", marginBottom: "16px" }}>
          <div>
            <label style={LS}>Method</label>
            <select value={paymentMethod} onChange={e => setPaymentMethod(e.target.value)} style={IS}>
              {METHODS.map(m => <option key={m.v} value={m.v}>{m.l}</option>)}
            </select>
          </div>
          <div>
            <label style={LS}>Amount</label>
            <input
              value={amount}
              onChange={e => { setAmount(e.target.value); setAmountTouched(true); }}
              style={IS}
              inputMode="decimal"
              placeholder={String(suggested)}
            />
          </div>
          <div>
            <label style={LS}>Paid on</label>
            <input type="date" value={paidAt} onChange={e => setPaidAt(e.target.value)} style={IS} />
          </div>
        </div>
        {Number(amount) !== suggested && (
          <div style={{ color: "var(--text-muted)", fontSize: "13px", marginTop: "-6px", marginBottom: "16px" }}>
            {tickets} x ${TICKET_PRICE} = ${suggested}
          </div>
        )}
        <div style={{ marginBottom: "4px" }}>
          <label style={LS}>Notes</label>
          <input value={notes} onChange={e => setNotes(e.target.value)} style={IS} placeholder="Optional" />
        </div>
      </div>
    </Modal>
  );
}
