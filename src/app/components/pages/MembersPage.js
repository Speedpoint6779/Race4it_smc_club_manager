import { Icons } from "../Icons";
import { DUES_AMOUNT, IS, BTN, HS, fmtDate, DuesBadge } from "../ui";

export function MembersPage({ mwd, members, setMembers, flash }) {
  const [search, setSearch] = window.React.useState("");
  const [filter, setFilter] = window.React.useState("all");
  const [mViewSize, setMViewSize] = window.React.useState(20);
  const [showMM, setShowMM] = window.React.useState(false);
  const [editM, setEditM] = window.React.useState(null);
  const [viewM, setViewM] = window.React.useState(null);
  const [showEM, setShowEM] = window.React.useState(false);
  const [emailPre, setEmailPre] = window.React.useState([]);
  const [confDel, setConfDel] = window.React.useState(null);
  const [selMode, setSelMode] = window.React.useState(false);
  const [sel, setSel] = window.React.useState([]);

  const tog = id => setSel(p => p.includes(id) ? p.filter(x => x !== id) : [...p, id]);
  const mCols = selMode ? "40px 2fr 2fr 1.2fr 80px 70px 80px 80px 90px" : "2fr 2fr 1.2fr 80px 70px 80px 80px 90px";

  const fm = mwd.filter(m => {
    const ms = (m.firstName + " " + m.lastName + " " + m.email + " " + m.city).toLowerCase().includes(search.toLowerCase());
    const mf = filter === "all" || (filter === "active" && m.status === "active") || (filter === "inactive" && m.status === "inactive") || (filter === "unpaid" && m._ds !== "paid") || (filter === "overdue" && m._ds === "overdue");
    return ms && mf;
  });

  return (<div>MembersPage placeholder</div>);
}
