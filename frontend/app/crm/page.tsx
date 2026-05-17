"use client";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/lib/toast";
import Navbar from "@/components/Navbar";
import { useEffect, useState, useCallback } from "react";

// ─── Types ────────────────────────────────────────────────────────────────────

type CRMEntry = {
  _row: number;
  timestamp: string;
  customer_name: string;
  contact: string;
  description: string;
  mode: string;
  status: string;
  channel: string;
  follow_up_date: string;
  deal_closed_date: string;
  attendant: string;
  vehicle: string;
  quote_price: string;
  travel_date: string;
  return_date: string;
  driver_name: string;
  trip_from: string;
  trip_to: string;
  // Trip financials (only when Booked)
  advance_cash: string;
  advance_bank: string;
  total_cash: string;
  total_bank: string;
  number_of_days: string;
  _is_today?: boolean;
  _is_overdue?: boolean;
};

type FollowupGroup = Record<string, CRMEntry[]>;

// ─── Constants ────────────────────────────────────────────────────────────────

const MODE_OPTIONS    = ["Call", "WhatsApp"];
const STATUS_OPTIONS  = ["Enquiry", "Booked", "Interested", "Super Interested", "Trip Decline", "Cancelled", "Not Interested"];
const CHANNEL_OPTIONS = ["Meta Ads", "Google Ads"];

const STATUS_PILL: Record<string, string> = {
  "Enquiry":          "pill-blue",
  "Booked":           "pill-green",
  "Interested":       "pill-orange",
  "Super Interested": "pill-orange",
  "Trip Decline":     "pill-red",
  "Cancelled":        "pill-red",
  "Not Interested":   "pill-red",
};

const EMPTY_FORM = {
  customer_name: "", contact: "", description: "",
  mode: "Call", status: "Enquiry", channel: "Meta Ads",
  vehicle: "", follow_up_date: "", deal_closed_date: "",
  attendant: "", quote_price: "", travel_date: "", return_date: "",
  driver_name: "", trip_from: "", trip_to: "",
  advance_cash: "", advance_bank: "",
  total_cash: "", total_bank: "",
  number_of_days: "",
};

const today = () => new Date().toISOString().split("T")[0];

// ─── Spinner ──────────────────────────────────────────────────────────────────

const Spinner = () => (
  <div style={{
    width: 32, height: 32, borderRadius: "50%",
    border: "3px solid rgba(37,99,235,0.12)",
    borderTopColor: "var(--accent-primary)",
    animation: "spin 0.8s linear infinite",
    margin: "0 auto",
  }} />
);

// ─── Field label helper ───────────────────────────────────────────────────────

const Label = ({ text, required }: { text: string; required?: boolean }) => (
  <label style={{
    fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.07em",
    marginBottom: 5, display: "block",
  }}>
    {text} {required && <span style={{ color: "var(--accent-red)" }}>*</span>}
  </label>
);

// ════════════════════════════════════════════════════════════════════════════════

export default function CRMPage() {
  const [view, setView] = useState<"table" | "followups" | "deposits">("table");
  const [entries, setEntries] = useState<CRMEntry[]>([]);
  const [followupData, setFollowupData] = useState<{ grouped: FollowupGroup; today: string }>({ grouped: {}, today: "" });
  const [vehicles, setVehicles] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);

  // Filters
  const [filterStatus, setFilterStatus]   = useState("");
  const [filterChannel, setFilterChannel] = useState("");
  const [filterStart, setFilterStart]     = useState("");
  const [filterEnd, setFilterEnd]         = useState("");
  const [search, setSearch]               = useState("");

  // Modal
  const [showModal, setShowModal]   = useState(false);
  const [modalMode, setModalMode]   = useState<"create" | "edit" | "followup">("create");
  const [form, setForm]             = useState({ ...EMPTY_FORM });
  const [editRow, setEditRow]       = useState<number | null>(null);
  const [saving, setSaving]         = useState(false);

  // History
  const [historyModal, setHistoryModal]     = useState(false);
  const [historyEntries, setHistoryEntries] = useState<CRMEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Analytics
  const [analytics, setAnalytics] = useState<any>(null);

  // Fund Deposit
  const [showDepositModal, setShowDepositModal] = useState(false);
  const [depositForm, setDepositForm] = useState({ deposit_date: new Date().toISOString().split("T")[0], deposited_by: "", amount: "", mode: "Cash", reference: "", notes: "" });
  const [depositSaving, setDepositSaving] = useState(false);
  const [deposits, setDeposits] = useState<any[]>([]);
  const [depositsLoading, setDepositsLoading] = useState(false);

  const [username, setUsername] = useState<string>("");

  // Is current form status "Booked"?
  const isBooked = form.status === "Booked";

  // ── Fetchers ───────────────────────────────────────────────────────────────

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus)  params.append("status", filterStatus);
      if (filterChannel) params.append("channel", filterChannel);
      if (filterStart)   params.append("start", filterStart);
      if (filterEnd)     params.append("end", filterEnd);
      if (search)        params.append("search", search);
      const res = await apiFetch(`/crm/entries?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load");
      setEntries(data.entries || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [filterStatus, filterChannel, filterStart, filterEnd, search]);

  const fetchFollowups = useCallback(async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/crm/followups");
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setFollowupData(data);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, []);

  const fetchVehicles = useCallback(async () => {
    try {
      const res = await apiFetch("/vehicles");
      const data = await res.json();
      setVehicles(data.vehicles || []);
    } catch { /* non-critical */ }
  }, []);

  const fetchAnalytics = useCallback(async () => {
    try {
      const res = await apiFetch("/crm/analytics");
      const data = await res.json();
      if (res.ok) setAnalytics(data);
    } catch { /* non-critical */ }
  }, []);

  const fetchDeposits = async () => {
    setDepositsLoading(true);
    try {
      const res = await apiFetch("/fund-deposits");
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load deposits");
      setDeposits(data.deposits || []);
    } catch (e: any) {
      toast.error("Deposits: " + e.message);
    } finally {
      setDepositsLoading(false);
    }
  };

  const handleDepositSave = async () => {
    if (!depositForm.deposited_by.trim()) { toast.error("Deposited by is required"); return; }
    if (!depositForm.amount.trim()) { toast.error("Amount is required"); return; }
    setDepositSaving(true);
    try {
      const res = await apiFetch("/fund-deposits", { method: "POST", body: JSON.stringify(depositForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to save deposit");
      toast.success("Fund deposit recorded!");
      setShowDepositModal(false);
      setDepositForm({ deposit_date: new Date().toISOString().split("T")[0], deposited_by: "", amount: "", mode: "Cash", reference: "", notes: "" });
      fetchDeposits();
    } catch (e: any) { toast.error(e.message); }
    finally { setDepositSaving(false); }
  };

  useEffect(() => {
    fetchVehicles();
    fetchAnalytics();
    setUsername(sessionStorage.getItem("username") ?? "");
  }, []);
  useEffect(() => {
    if (view === "table") fetchEntries();
    else if (view === "followups") fetchFollowups();
    else if (view === "deposits") fetchDeposits();
  }, [view]);

  // ── Modal helpers ──────────────────────────────────────────────────────────

  const setField = (key: string, val: string) =>
    setForm(f => ({ ...f, [key]: val }));

  const openCreate = () => {
    setForm({ ...EMPTY_FORM, attendant: username });
    setEditRow(null);
    setModalMode("create");
    setShowModal(true);
  };

  const openEdit = (e: CRMEntry) => {
    setForm({
      customer_name: e.customer_name, contact: e.contact,
      description: e.description, mode: e.mode || "Call",
      status: e.status || "Enquiry", channel: e.channel || "Meta Ads",
      vehicle: e.vehicle || "", follow_up_date: e.follow_up_date || "",
      deal_closed_date: e.deal_closed_date || "", attendant: e.attendant || "",
      quote_price: e.quote_price || "", travel_date: e.travel_date || "",
      return_date: e.return_date || "", driver_name: e.driver_name || "",
      trip_from: e.trip_from || "", trip_to: e.trip_to || "",
      advance_cash: e.advance_cash || "",
      advance_bank: e.advance_bank || "", total_cash: e.total_cash || "",
      total_bank: e.total_bank || "", number_of_days: e.number_of_days || "",
    });
    setEditRow(e._row);
    setModalMode("edit");
    setShowModal(true);
  };

  const openFollowup = (e: CRMEntry) => {
    setForm({
      ...EMPTY_FORM,
      customer_name: e.customer_name,
      contact: e.contact,
      mode: e.mode || "Call",
      channel: e.channel || "Meta Ads",
      status: "Enquiry",
    });
    setEditRow(null);
    setModalMode("followup");
    setShowModal(true);
  };

  const openHistory = async (e: CRMEntry) => {
    setHistoryModal(true);
    setHistoryLoading(true);
    try {
      const res = await apiFetch(`/crm/history?contact=${e.contact}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed");
      setHistoryEntries(data.history || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setHistoryLoading(false); }
  };

  // ── Save ───────────────────────────────────────────────────────────────────

  const handleSave = async () => {
    // Client-side Booked validation
    if (form.status === "Booked") {
      if (!form.driver_name.trim()) return toast.error("Driver name is required when status is Booked");
      if (!form.trip_from.trim())   return toast.error("Trip From is required when status is Booked");
      if (!form.trip_to.trim())     return toast.error("Trip To is required when status is Booked");
    }
    setSaving(true);
    try {
      let res: Response;
      if (modalMode === "edit" && editRow) {
        res = await apiFetch(`/crm/entries/${editRow}`, { method: "PUT", body: JSON.stringify(form) });
      } else if (modalMode === "followup") {
        res = await apiFetch("/crm/followups", { method: "POST", body: JSON.stringify(form) });
      } else {
        res = await apiFetch("/crm/entries", { method: "POST", body: JSON.stringify(form) });
      }
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to save");
      toast.success(modalMode === "edit" ? "Entry updated!" : "Entry saved!");
      setShowModal(false);
      fetchAnalytics();
      view === "table" ? fetchEntries() : fetchFollowups();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <>
      <style>{`
        @keyframes spin    { to { transform: rotate(360deg); } }
        @keyframes fadeIn  { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
        .crm-fade { animation: fadeIn 0.3s ease; }

        /* ── Modal ─────────────────────────────────────────────────────── */
        .modal-overlay {
          position:fixed; inset:0;
          background: rgba(186,210,240,0.30);
          backdrop-filter: blur(14px) saturate(160%);
          -webkit-backdrop-filter: blur(14px) saturate(160%);
          z-index:1000; display:flex; align-items:center; justify-content:center; padding:16px;
        }
        .modal-box {
          background: rgba(255,255,255,0.88);
          backdrop-filter: blur(32px) saturate(200%) brightness(1.05);
          -webkit-backdrop-filter: blur(32px) saturate(200%) brightness(1.05);
          border: 1px solid rgba(255,255,255,0.96);
          border-radius: 28px;
          box-shadow: 0 24px 80px rgba(100,120,200,0.18), 0 2px 0 rgba(255,255,255,1) inset;
          width:100%; max-width:620px; max-height:90vh; overflow-y:auto; padding:28px;
        }

        /* ── Tabs ──────────────────────────────────────────────────────── */
        .crm-tab-bar { display:flex; gap:4px; background:rgba(255,255,255,0.55); backdrop-filter:blur(10px); border:1px solid rgba(255,255,255,0.80); border-radius:var(--radius-sm); padding:4px; width:fit-content; }
        .crm-tab { padding:7px 18px; border-radius:8px; font-size:13px; font-weight:500; border:none; cursor:pointer; background:transparent; color:var(--text-secondary); transition:all 0.2s ease; }
        .crm-tab.active { background:rgba(255,255,255,0.90); color:var(--text-primary); box-shadow:0 2px 8px rgba(100,120,180,0.12); }

        /* ── Analytics strip ───────────────────────────────────────────── */
        .analytics-bar { display:grid; grid-template-columns:repeat(auto-fit,minmax(140px,1fr)); gap:12px; margin-bottom:24px; }
        .analytics-chip {
          background: rgba(255,255,255,0.68); backdrop-filter:blur(16px) saturate(180%);
          -webkit-backdrop-filter:blur(16px) saturate(180%);
          border:1px solid rgba(255,255,255,0.82); border-radius:var(--radius-md);
          padding:14px 16px;
          box-shadow: 0 2px 0 rgba(255,255,255,0.90) inset, 0 4px 12px rgba(100,120,180,0.10);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .analytics-chip:hover { transform:translateY(-2px); box-shadow:0 2px 0 rgba(255,255,255,0.95) inset, 0 8px 24px rgba(100,120,180,0.16); }

        /* ── Follow-up cards ───────────────────────────────────────────── */
        .followup-card {
          background:rgba(255,255,255,0.65); backdrop-filter:blur(16px) saturate(180%);
          -webkit-backdrop-filter:blur(16px) saturate(180%);
          border:1px solid rgba(255,255,255,0.82); border-radius:var(--radius-md);
          padding:16px 18px; margin-bottom:10px; cursor:pointer;
          box-shadow:0 2px 0 rgba(255,255,255,0.90) inset, 0 4px 12px rgba(100,120,180,0.10);
          transition:all 0.22s ease; position:relative; overflow:hidden;
        }
        .followup-card::before { content:''; position:absolute; left:0; top:0; bottom:0; width:3px; background:var(--accent-primary); opacity:0; transition:opacity 0.2s; }
        .followup-card:hover { transform:translateY(-2px); box-shadow:0 2px 0 rgba(255,255,255,0.95) inset, 0 8px 24px rgba(100,120,180,0.16); }
        .followup-card:hover::before { opacity:1; }
        .followup-card.today   { border-color:rgba(37,99,235,0.28); }
        .followup-card.today::before { opacity:1; }
        .followup-card.overdue { border-color:rgba(220,38,38,0.22); }
        .followup-card.overdue::before { opacity:1; background:var(--accent-red); }

        /* ── Form grid ─────────────────────────────────────────────────── */
        .form-grid { display:grid; grid-template-columns:1fr 1fr; gap:14px; }
        @media(max-width:560px) { .form-grid { grid-template-columns:1fr; } }

        /* ── Booked section ────────────────────────────────────────────── */
        .booked-section {
          background: rgba(209,250,229,0.40);
          backdrop-filter: blur(10px);
          border: 1px solid rgba(52,211,153,0.30);
          border-radius: var(--radius-md);
          padding: 16px 18px;
          margin-top: 6px;
        }
        .booked-section-title {
          font-size: 12px; font-weight: 700; color: var(--accent-green);
          text-transform: uppercase; letter-spacing: 0.07em;
          margin-bottom: 14px; display: flex; align-items: center; gap: 6px;
        }

        /* ── History ───────────────────────────────────────────────────── */
        .history-row { border-left:2px solid var(--border-dim); padding:10px 0 10px 14px; margin-bottom:8px; position:relative; }
        .history-row::before { content:''; position:absolute; left:-5px; top:16px; width:8px; height:8px; border-radius:50%; background:var(--accent-primary); border:2px solid rgba(255,255,255,0.90); }

        /* ── Table wrap ────────────────────────────────────────────────── */
        .table-glass {
          background:rgba(255,255,255,0.68); backdrop-filter:blur(20px) saturate(180%);
          -webkit-backdrop-filter:blur(20px) saturate(180%);
          border:1px solid rgba(255,255,255,0.82); border-radius:var(--radius-lg);
          box-shadow:0 2px 0 rgba(255,255,255,0.90) inset, 0 8px 32px rgba(100,120,180,0.12);
          overflow:hidden;
        }
        .empty-glass {
          background:rgba(255,255,255,0.55); backdrop-filter:blur(12px);
          border:1px solid rgba(255,255,255,0.80); border-radius:var(--radius-lg);
          padding:48px; text-align:center; color:var(--text-muted); font-size:14px;
        }
      `}</style>

      <div className="page-root">
        <Navbar />
        <div className="page-content">

          {/* ── Header ───────────────────────────────────────────────────── */}
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:24, flexWrap:"wrap", gap:12 }}>
            <div>
              <h1 style={{ fontSize:24, marginBottom:4 }}>📋 CRM</h1>
              <p style={{ fontSize:13, color:"var(--text-muted)" }}>All data synced live with Google Sheets</p>
            </div>
            <div style={{ display:"flex", gap:10, alignItems:"center", flexWrap:"wrap" }}>
              <div className="crm-tab-bar">
                <button className={`crm-tab ${view==="table"?"active":""}`} onClick={() => setView("table")}>All Entries</button>
                <button className={`crm-tab ${view==="followups"?"active":""}`} onClick={() => setView("followups")}>Follow-Ups</button>
                <button className={`crm-tab ${view==="deposits"?"active":""}`} onClick={() => setView("deposits")}>💰 Deposits</button>
              </div>
              <button className="btn-primary" onClick={openCreate} style={{ fontSize:13 }}>+ New Entry</button>
              <button onClick={() => setShowDepositModal(true)} style={{
                background: "rgba(34,197,94,0.15)", border: "1px solid rgba(34,197,94,0.3)",
                color: "var(--accent-green)", borderRadius: 10, padding: "8px 16px",
                fontSize: 13, fontWeight: 600, cursor: "pointer",
              }}>💰 Log Deposit</button>
            </div>
          </div>

          {/* ── Analytics ─────────────────────────────────────────────────── */}
          {analytics && (
            <div className="analytics-bar crm-fade">
              <div className="analytics-chip">
                <p style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Total</p>
                <p style={{ fontSize:22, fontWeight:800, fontFamily:"var(--font-display)" }}>{analytics.total}</p>
              </div>
              <div className="analytics-chip">
                <p style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Conversion</p>
                <p style={{ fontSize:22, fontWeight:800, fontFamily:"var(--font-display)", color:"var(--accent-green)" }}>{analytics.conversion_rate_pct}%</p>
              </div>
              <div className="analytics-chip">
                <p style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Follow-Ups</p>
                <p style={{ fontSize:22, fontWeight:800, fontFamily:"var(--font-display)", color:"var(--accent-orange)" }}>{analytics.followup_scheduled}</p>
              </div>
              {analytics.channel_counts && Object.entries(analytics.channel_counts as Record<string,number>).map(([ch, cnt]) => (
                <div className="analytics-chip" key={ch}>
                  <p style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>{ch}</p>
                  <p style={{ fontSize:22, fontWeight:800, fontFamily:"var(--font-display)", color:"var(--accent-purple)" }}>{cnt as number}</p>
                </div>
              ))}
              {analytics.status_counts?.["Booked"] !== undefined && (
                <div className="analytics-chip">
                  <p style={{ fontSize:11, color:"var(--text-muted)", marginBottom:4, fontWeight:700, textTransform:"uppercase", letterSpacing:"0.06em" }}>Booked</p>
                  <p style={{ fontSize:22, fontWeight:800, fontFamily:"var(--font-display)", color:"var(--accent-green)" }}>{analytics.status_counts["Booked"]}</p>
                </div>
              )}
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              TABLE VIEW
          ════════════════════════════════════════════════════════════════ */}
          {view === "table" && (
            <div className="crm-fade">
              {/* Filters */}
              <div style={{ display:"flex", gap:10, flexWrap:"wrap", marginBottom:16 }}>
                <input className="input-field" placeholder="🔍 Name / contact" value={search} onChange={e => setSearch(e.target.value)} style={{ width:210, fontSize:13 }} />
                <select className="input-field" value={filterStatus} onChange={e => setFilterStatus(e.target.value)} style={{ fontSize:13 }}>
                  <option value="">All Statuses</option>
                  {STATUS_OPTIONS.map(s => <option key={s}>{s}</option>)}
                </select>
                <select className="input-field" value={filterChannel} onChange={e => setFilterChannel(e.target.value)} style={{ fontSize:13 }}>
                  <option value="">All Channels</option>
                  {CHANNEL_OPTIONS.map(c => <option key={c}>{c}</option>)}
                </select>
                <input type="date" className="input-field" value={filterStart} onChange={e => setFilterStart(e.target.value)} style={{ fontSize:13 }} />
                <input type="date" className="input-field" value={filterEnd}   onChange={e => setFilterEnd(e.target.value)}   style={{ fontSize:13 }} />
                <button className="btn-ghost" onClick={fetchEntries} style={{ fontSize:13 }}>Apply</button>
                <button className="btn-ghost" style={{ fontSize:13 }} onClick={() => { setFilterStatus(""); setFilterChannel(""); setFilterStart(""); setFilterEnd(""); setSearch(""); }}>Clear</button>
              </div>

              {/* Table */}
              {loading ? (
                <div style={{ padding:48, textAlign:"center" }}><Spinner /></div>
              ) : entries.length === 0 ? (
                <div className="empty-glass">No entries found. Create your first CRM entry.</div>
              ) : (
                <div className="table-glass">
                  <div style={{ overflowX:"auto" }}>
                    <table className="data-table">
                      <thead>
                        <tr>
                          <th>Customer</th>
                          <th>Contact</th>
                          <th>Mode</th>
                          <th>Status</th>
                          <th>Channel</th>
                          <th>Vehicle</th>
                          <th>Quote</th>
                          <th>Trip</th>
                          <th>Driver</th>
                          <th>Travel Date</th>
                          <th>Follow-Up</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {entries.map((e) => (
                          <tr key={`${e._row}-${e.timestamp}`}>
                            <td>
                              <div style={{ fontWeight:600, color:"var(--text-primary)", fontSize:13 }}>{e.customer_name || "—"}</div>
                              <div style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>{e.timestamp?.slice(0,10)}</div>
                            </td>
                            <td style={{ fontFamily:"monospace", fontSize:13 }}>{e.contact || "—"}</td>
                            <td>
                              <span className={`pill ${e.mode==="WhatsApp"?"pill-green":"pill-blue"}`} style={{ fontSize:11 }}>
                                {e.mode==="WhatsApp"?"💬":"📞"} {e.mode||"—"}
                              </span>
                            </td>
                            <td>
                              <span className={`pill ${STATUS_PILL[e.status]||"pill-blue"}`} style={{ fontSize:11 }}>
                                {e.status==="Booked" ? "✅ " : ""}{e.status||"—"}
                              </span>
                            </td>
                            <td style={{ fontSize:13 }}>{e.channel||"—"}</td>
                            <td style={{ fontSize:12, color:"var(--text-muted)", maxWidth:120, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>{e.vehicle||"—"}</td>
                            <td style={{ fontSize:13, fontWeight:600, color:"var(--accent-primary)" }}>
                              {e.quote_price ? `₹${Number(e.quote_price).toLocaleString("en-IN")}` : "—"}
                            </td>
                            <td style={{ fontSize:12 }}>
                              {e.trip_from && e.trip_to ? (
                                <span style={{ color:"var(--text-primary)" }}>{e.trip_from} → {e.trip_to}</span>
                              ) : "—"}
                            </td>
                            <td style={{ fontSize:13 }}>
                              {e.driver_name ? (
                                <span style={{ fontWeight:600, color:"var(--accent-purple)" }}>🧑‍✈️ {e.driver_name}</span>
                              ) : "—"}
                            </td>
                            <td style={{ fontSize:12 }}>
                              {e.travel_date ? (
                                <div>
                                  <div>{e.travel_date}</div>
                                  {e.return_date && <div style={{ color:"var(--text-muted)" }}>→ {e.return_date}</div>}
                                </div>
                              ) : "—"}
                            </td>
                            <td style={{ fontSize:12 }}>
                              {e.follow_up_date ? (
                                <span style={{ color: e.follow_up_date===today() ? "var(--accent-primary)" : e.follow_up_date<today() ? "var(--accent-red)" : "var(--text-secondary)" }}>
                                  {e.follow_up_date===today() ? "🔔 " : e.follow_up_date<today() ? "⚠️ " : ""}{e.follow_up_date}
                                </span>
                              ) : "—"}
                            </td>
                            <td>
                              <div style={{ display:"flex", gap:6 }}>
                                <button className="btn-ghost" style={{ padding:"4px 10px", fontSize:12 }} onClick={() => openEdit(e)}>Edit</button>
                                <button className="btn-ghost" style={{ padding:"4px 10px", fontSize:12 }} onClick={() => openFollowup(e)}>Follow Up</button>
                                <button className="btn-ghost" style={{ padding:"4px 10px", fontSize:12 }} onClick={() => openHistory(e)}>History</button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
              <p style={{ fontSize:12, color:"var(--text-muted)", marginTop:10, textAlign:"right" }}>
                {entries.length} entries · Google Sheets
              </p>
            </div>
          )}

          {/* ════════════════════════════════════════════════════════════════
              FOLLOW-UPS VIEW
          ════════════════════════════════════════════════════════════════ */}
          {view === "followups" && (
            <div className="crm-fade">
              {loading ? (
                <div style={{ padding:48, textAlign:"center" }}><Spinner /></div>
              ) : Object.keys(followupData.grouped).length === 0 ? (
                <div className="empty-glass">No follow-ups scheduled.</div>
              ) : (
                Object.entries(followupData.grouped).map(([dateKey, cards]) => {
                  const isToday   = dateKey === followupData.today;
                  const isOverdue = dateKey < followupData.today;
                  return (
                    <div key={dateKey} style={{ marginBottom:28 }}>
                      <div style={{ display:"flex", alignItems:"center", gap:10, marginBottom:12 }}>
                        <div style={{ padding:"4px 14px", borderRadius:99, background: isToday ? "rgba(37,99,235,0.10)" : isOverdue ? "rgba(220,38,38,0.08)" : "rgba(255,255,255,0.55)", backdropFilter:"blur(8px)", border:"1px solid rgba(255,255,255,0.80)", color: isToday ? "var(--accent-primary)" : isOverdue ? "var(--accent-red)" : "var(--text-secondary)", fontSize:13, fontWeight:600 }}>
                          {isToday ? "🔔 Today" : isOverdue ? "⚠️ Overdue" : "📅"} {dateKey}
                        </div>
                        <span style={{ fontSize:12, color:"var(--text-muted)" }}>{cards.length} follow-up{cards.length!==1?"s":""}</span>
                      </div>
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:12 }}>
                        {(cards as CRMEntry[]).map((c) => (
                          <div key={`${c._row}-${c.timestamp}`} className={`followup-card ${c._is_today?"today":""} ${c._is_overdue?"overdue":""}`} onClick={() => openFollowup(c)}>
                            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                              <div>
                                <p style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>{c.customer_name}</p>
                                <p style={{ fontSize:12, color:"var(--text-muted)", fontFamily:"monospace" }}>{c.contact}</p>
                              </div>
                              <span className={`pill ${STATUS_PILL[c.status]||"pill-blue"}`} style={{ fontSize:10 }}>{c.status}</span>
                            </div>
                            {(c.trip_from || c.trip_to) && (
                              <p style={{ fontSize:12, fontWeight:600, color:"var(--accent-primary)", marginBottom:6 }}>
                                📍 {c.trip_from} {c.trip_to ? `→ ${c.trip_to}` : ""}
                              </p>
                            )}
                            {c.description && (
                              <p style={{ fontSize:12, color:"var(--text-secondary)", marginBottom:8, lineHeight:1.5 }}>
                                {c.description.length>80 ? c.description.slice(0,80)+"…" : c.description}
                              </p>
                            )}
                            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                              <span className={`pill ${c.mode==="WhatsApp"?"pill-green":"pill-blue"}`} style={{ fontSize:10 }}>{c.mode}</span>
                              <span className="pill pill-orange" style={{ fontSize:10 }}>{c.channel}</span>
                              {c.vehicle && <span className="pill pill-blue" style={{ fontSize:10 }}>{c.vehicle}</span>}
                              {c.driver_name && <span className="pill pill-green" style={{ fontSize:10 }}>🧑‍✈️ {c.driver_name}</span>}
                            </div>
                            <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:8 }}>Tap to log follow-up →</p>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          )}
          {/* ════════════════════════════════════════════════════════════════
              DEPOSITS VIEW
          ════════════════════════════════════════════════════════════════ */}
          {view === "deposits" && (
            <div className="crm-fade">
              {depositsLoading ? (
                <div style={{ padding:48, textAlign:"center" }}><Spinner /></div>
              ) : deposits.length === 0 ? (
                <div className="empty-glass">No deposits recorded yet. Click "💰 Log Deposit" to add one.</div>
              ) : (
                <div>
                  {/* Summary bar */}
                  {(() => {
                    const totalCash = deposits.filter((d:any) => d.mode === "Cash").reduce((s:number,d:any) => s + (Number(d.amount)||0), 0);
                    const totalBank = deposits.filter((d:any) => d.mode === "Bank").reduce((s:number,d:any) => s + (Number(d.amount)||0), 0);
                    const grandTotal = totalCash + totalBank;
                    return (
                      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12, marginBottom:20 }}>
                        {[
                          { label:"Total Deposited", value:`₹${grandTotal.toLocaleString("en-IN")}`, color:"var(--accent-primary)" },
                          { label:"Cash", value:`₹${totalCash.toLocaleString("en-IN")}`, color:"var(--accent-green)" },
                          { label:"Bank", value:`₹${totalBank.toLocaleString("en-IN")}`, color:"var(--accent-purple)" },
                        ].map(({ label, value, color }) => (
                          <div key={label} style={{ background:"rgba(255,255,255,0.72)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,0.85)", borderRadius:14, padding:"16px 20px", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
                            <p style={{ fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:6 }}>{label}</p>
                            <p style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:800, color }}>{value}</p>
                          </div>
                        ))}
                      </div>
                    );
                  })()}

                  {/* Table */}
                  <div style={{ background:"rgba(255,255,255,0.72)", backdropFilter:"blur(12px)", border:"1px solid rgba(255,255,255,0.85)", borderRadius:14, overflow:"hidden", boxShadow:"0 2px 12px rgba(0,0,0,0.06)" }}>
                    <table style={{ width:"100%", borderCollapse:"collapse" }}>
                      <thead>
                        <tr style={{ borderBottom:"1px solid rgba(0,0,0,0.08)" }}>
                          {["Date","Deposited By","Amount","Mode","Reference","Notes"].map(h => (
                            <th key={h} style={{ padding:"12px 16px", textAlign:"left", fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.07em" }}>{h}</th>
                          ))}
                        </tr>
                      </thead>
                      <tbody>
                        {[...deposits].reverse().map((d:any, i:number) => (
                          <tr key={i} style={{ borderBottom:"1px solid rgba(0,0,0,0.05)", background: i%2===0 ? "transparent" : "rgba(0,0,0,0.015)" }}>
                            <td style={{ padding:"12px 16px", fontSize:13, color:"var(--text-primary)", fontWeight:500 }}>{d.deposit_date}</td>
                            <td style={{ padding:"12px 16px", fontSize:13, color:"var(--text-primary)" }}>{d.deposited_by}</td>
                            <td style={{ padding:"12px 16px", fontSize:14, fontWeight:700, color:"var(--accent-green)" }}>₹{Number(d.amount||0).toLocaleString("en-IN")}</td>
                            <td style={{ padding:"12px 16px" }}>
                              <span style={{ fontSize:11, fontWeight:700, padding:"3px 10px", borderRadius:20, background: d.mode==="Cash" ? "rgba(249,115,22,0.12)" : "rgba(37,99,235,0.12)", color: d.mode==="Cash" ? "#f97316" : "var(--accent-primary)" }}>{d.mode}</span>
                            </td>
                            <td style={{ padding:"12px 16px", fontSize:13, color:"var(--text-muted)" }}>{d.reference || "—"}</td>
                            <td style={{ padding:"12px 16px", fontSize:13, color:"var(--text-muted)", maxWidth:200 }}>{d.notes || "—"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          )}


        </div>
      </div>


      {/* ════════════════════════════════════════════════════════════════════
          ENTRY MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {showModal && (
        <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget) setShowModal(false); }}>
          <div className="modal-box crm-fade">
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:18 }}>
                {modalMode==="edit" ? "✏️ Edit Entry" : modalMode==="followup" ? "🔁 Log Follow-Up" : "➕ New CRM Entry"}
              </h2>
              <button className="btn-ghost" style={{ padding:"4px 10px", fontSize:13 }} onClick={() => setShowModal(false)}>✕</button>
            </div>

            {modalMode==="followup" && (
              <div style={{ background:"rgba(191,219,254,0.35)", border:"1px solid rgba(96,165,250,0.28)", borderRadius:12, padding:"10px 14px", marginBottom:16, fontSize:13, color:"var(--text-secondary)" }}>
                Creating a <strong>new row</strong> — full history preserved.
              </div>
            )}

            <div className="form-grid">
              {/* Customer Name */}
              <div style={{ gridColumn: modalMode==="followup" ? "1/-1" : undefined }}>
                <Label text="Customer Name" required />
                <input className="input-field" style={{ fontSize:13 }} value={form.customer_name} onChange={e => setField("customer_name", e.target.value)} readOnly={modalMode==="followup"} />
              </div>

              {/* Contact */}
              <div>
                <Label text="Contact" required />
                <input className="input-field" style={{ fontSize:13 }} value={form.contact} onChange={e => setField("contact", e.target.value)} readOnly={modalMode==="followup"} />
              </div>

              {/* Mode */}
              <div>
                <Label text="Mode" required />
                <select className="input-field" style={{ fontSize:13 }} value={form.mode} onChange={e => setField("mode", e.target.value)}>
                  {MODE_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              {/* Status */}
              <div>
                <Label text="Status" required />
                <select className="input-field" style={{ fontSize:13 }} value={form.status} onChange={e => setField("status", e.target.value)}>
                  {STATUS_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              {/* Channel */}
              <div>
                <Label text="Channel" required />
                <select className="input-field" style={{ fontSize:13 }} value={form.channel} onChange={e => setField("channel", e.target.value)}>
                  {CHANNEL_OPTIONS.map(o => <option key={o}>{o}</option>)}
                </select>
              </div>

              {/* Vehicle */}
              <div>
                <Label text="Vehicle" />
                <select className="input-field" style={{ fontSize:13 }} value={form.vehicle} onChange={e => setField("vehicle", e.target.value)}>
                  <option value="">— None —</option>
                  {vehicles.map(v => <option key={v}>{v}</option>)}
                </select>
              </div>

              {/* Quote Price */}
              <div>
                <Label text="Quote Price (₹)" />
                <input type="number" className="input-field" style={{ fontSize:13 }} value={form.quote_price} onChange={e => setField("quote_price", e.target.value)} placeholder="e.g. 45000" />
              </div>

              {/* Attendant */}
              <div>
                <Label text="Attendant" />
                <input className="input-field" style={{ fontSize:13, background:"rgba(0,0,0,0.04)", cursor:"not-allowed" }} value={form.attendant} readOnly placeholder="Staff name" />
              </div>

              {/* Follow-up Date */}
              <div>
                <Label text="Follow-Up Date" />
                <input type="date" className="input-field" style={{ fontSize:13 }} value={form.follow_up_date} onChange={e => setField("follow_up_date", e.target.value)} />
              </div>

              {/* Deal Closed Date */}
              <div>
                <Label text="Deal Closed Date" />
                <input type="date" className="input-field" style={{ fontSize:13 }} value={form.deal_closed_date} onChange={e => setField("deal_closed_date", e.target.value)} />
              </div>

              {/* Description */}
              <div style={{ gridColumn:"1/-1" }}>
                <Label text="Notes / Description" />
                <textarea className="input-field" style={{ fontSize:13, minHeight:70, resize:"vertical" }} value={form.description} onChange={e => setField("description", e.target.value)} placeholder="Customer notes, requirements…" />
              </div>
            </div>

            {/* ── BOOKED-ONLY SECTION ──────────────────────────────────── */}
            {isBooked && (
              <div className="booked-section crm-fade">
                <div className="booked-section-title">
                  ✅ Booking Details
                  <span style={{ fontSize:10, fontWeight:400, color:"var(--text-muted)", textTransform:"none", letterSpacing:0 }}>— required when status is Booked</span>
                </div>

                {/* Row 1 — Trip route + driver */}
                <div className="form-grid" style={{ marginBottom:14 }}>
                  <div>
                    <Label text="Trip From" required />
                    <input className="input-field" style={{ fontSize:13 }} value={form.trip_from} onChange={e => setField("trip_from", e.target.value)} placeholder="e.g. Chandigarh" />
                  </div>
                  <div>
                    <Label text="Trip To" required />
                    <input className="input-field" style={{ fontSize:13 }} value={form.trip_to} onChange={e => setField("trip_to", e.target.value)} placeholder="e.g. Manali" />
                  </div>
                  <div>
                    <Label text="Driver Name" required />
                    <input className="input-field" style={{ fontSize:13 }} value={form.driver_name} onChange={e => setField("driver_name", e.target.value)} placeholder="Assigned driver" />
                  </div>
                  <div>
                    <Label text="Number of Days" />
                    <input type="number" className="input-field" style={{ fontSize:13 }} value={form.number_of_days} onChange={e => setField("number_of_days", e.target.value)} placeholder="Auto-calculated" />
                  </div>
                  <div>
                    <Label text="Travel Date" />
                    <input type="date" className="input-field" style={{ fontSize:13 }} value={form.travel_date}
                      onChange={e => {
                        setField("travel_date", e.target.value);
                        // Auto-calc days
                        if (form.return_date) {
                          const d = Math.round((new Date(form.return_date).getTime() - new Date(e.target.value).getTime()) / 86400000) + 1;
                          if (d > 0) setField("number_of_days", String(d));
                        }
                      }}
                    />
                  </div>
                  <div>
                    <Label text="Return Date" />
                    <input type="date" className="input-field" style={{ fontSize:13 }} value={form.return_date}
                      onChange={e => {
                        setField("return_date", e.target.value);
                        if (form.travel_date) {
                          const d = Math.round((new Date(e.target.value).getTime() - new Date(form.travel_date).getTime()) / 86400000) + 1;
                          if (d > 0) setField("number_of_days", String(d));
                        }
                      }}
                    />
                  </div>
                </div>

                {/* Divider */}
                <div style={{ borderTop:"1px solid rgba(52,211,153,0.20)", margin:"4px 0 14px" }} />
                <p style={{ fontSize:11, fontWeight:700, color:"var(--accent-green)", textTransform:"uppercase", letterSpacing:"0.07em", marginBottom:12 }}>💰 Deal &amp; Payment</p>

                {/* Deal Price + Payments */}
                <div className="form-grid" style={{ marginBottom:14 }}>
                  <div>
                    <Label text="Deal Price (₹)" required />
                    <input type="number" className="input-field" style={{ fontSize:13 }} value={form.quote_price} onChange={e => setField("quote_price", e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label text="Advance Cash (₹)" />
                    <input type="number" className="input-field" style={{ fontSize:13 }} value={form.advance_cash} onChange={e => setField("advance_cash", e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label text="Advance Bank (₹)" />
                    <input type="number" className="input-field" style={{ fontSize:13 }} value={form.advance_bank} onChange={e => setField("advance_bank", e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label text="Total Cash (₹)" />
                    <input type="number" className="input-field" style={{ fontSize:13 }} value={form.total_cash} onChange={e => setField("total_cash", e.target.value)} placeholder="0" />
                  </div>
                  <div>
                    <Label text="Total Bank (₹)" />
                    <input type="number" className="input-field" style={{ fontSize:13 }} value={form.total_bank} onChange={e => setField("total_bank", e.target.value)} placeholder="0" />
                  </div>
                </div>

                {/* Live payment summary */}
                {(() => {
                  const deal = Number(form.quote_price) || 0;
                  const received = (Number(form.advance_cash)||0) + (Number(form.advance_bank)||0);
                  const pending = deal - received;
                  if (!deal) return null;
                  return (
                    <div style={{ background:"rgba(255,255,255,0.60)", border:"1px solid rgba(52,211,153,0.25)", borderRadius:10, padding:"12px 16px", display:"flex", gap:20, flexWrap:"wrap", fontSize:13, marginTop:4 }}>
                      <span>Deal: <strong style={{ color:"var(--accent-primary)" }}>₹{deal.toLocaleString("en-IN")}</strong></span>
                      <span>Received: <strong style={{ color:"var(--accent-green)" }}>₹{received.toLocaleString("en-IN")}</strong></span>
                      <span>Pending: <strong style={{ color: pending>0 ? "var(--accent-orange)" : "var(--accent-green)" }}>₹{pending.toLocaleString("en-IN")}</strong></span>
                    </div>
                  );
                })()}
              </div>
            )}

            <div style={{ display:"flex", gap:10, marginTop:22, justifyContent:"flex-end" }}>
              <button className="btn-ghost" onClick={() => setShowModal(false)} disabled={saving} style={{ fontSize:13 }}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving} style={{ fontSize:13 }}>
                {saving ? "Saving…" : modalMode==="edit" ? "Update Entry" : "Save Entry"}
              </button>
            </div>
          </div>
        </div>
      )}
      {/* ════════════════════════════════════════════════════════════════════
          HISTORY MODAL
      ════════════════════════════════════════════════════════════════════ */}
      {historyModal && (
        <div className="modal-overlay" onClick={e => { if (e.target===e.currentTarget) setHistoryModal(false); }}>
          <div className="modal-box crm-fade" style={{ maxWidth:640 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:20 }}>
              <h2 style={{ fontSize:18 }}>🕐 Customer Timeline</h2>
              <button className="btn-ghost" style={{ padding:"4px 10px", fontSize:13 }} onClick={() => setHistoryModal(false)}>✕</button>
            </div>
            {historyLoading ? (
              <div style={{ textAlign:"center", padding:32 }}><Spinner /></div>
            ) : historyEntries.length === 0 ? (
              <p style={{ color:"var(--text-muted)", textAlign:"center", padding:32 }}>No history found.</p>
            ) : (
              <div>
                {historyEntries.map((h, i) => (
                  <div key={i} className="history-row">
                    <div style={{ display:"flex", justifyContent:"space-between", flexWrap:"wrap", gap:6, marginBottom:4 }}>
                      <span style={{ fontSize:12, color:"var(--text-muted)" }}>{h.timestamp}</span>
                      <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
                        <span className={`pill ${STATUS_PILL[h.status]||"pill-blue"}`} style={{ fontSize:10 }}>{h.status}</span>
                        <span className={`pill ${h.mode==="WhatsApp"?"pill-green":"pill-blue"}`} style={{ fontSize:10 }}>{h.mode}</span>
                        <span className="pill pill-orange" style={{ fontSize:10 }}>{h.channel}</span>
                      </div>
                    </div>
                    {(h.trip_from || h.trip_to) && (
                      <p style={{ fontSize:13, fontWeight:600, color:"var(--accent-primary)", marginBottom:4 }}>
                        📍 {h.trip_from} {h.trip_to ? `→ ${h.trip_to}` : ""}
                      </p>
                    )}
                    {h.driver_name && (
                      <p style={{ fontSize:12, color:"var(--accent-purple)", marginBottom:4 }}>🧑‍✈️ Driver: {h.driver_name}</p>
                    )}
                    {h.quote_price && (
                      <p style={{ fontSize:12, color:"var(--accent-primary)", marginBottom:4 }}>💰 Quote: ₹{Number(h.quote_price).toLocaleString("en-IN")}</p>
                    )}
                    {h.description && (
                      <p style={{ fontSize:13, color:"var(--text-secondary)", lineHeight:1.5 }}>{h.description}</p>
                    )}
                    {h.follow_up_date && (
                      <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:4 }}>📅 Follow-up: {h.follow_up_date}</p>
                    )}
                    {h.travel_date && (
                      <p style={{ fontSize:11, color:"var(--text-muted)" }}>🗓️ Travel: {h.travel_date}{h.return_date ? ` → ${h.return_date}` : ""}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Fund Deposit Modal ──────────────────────────────────────────── */}
      {showDepositModal && (
        <div onClick={() => setShowDepositModal(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(6px)", zIndex: 1100,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "rgba(255,255,255,0.97)", borderRadius: 18,
            padding: "28px 32px", width: "100%", maxWidth: 520,
            boxShadow: "0 20px 60px rgba(0,0,0,0.20)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <div>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: "var(--text-primary)" }}>
                  💰 Log Fund Deposit
                </h2>
                <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>Record cash deposited to office</p>
              </div>
              <button onClick={() => setShowDepositModal(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text-muted)" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "14px 18px" }}>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" }}>
                    Deposit Date <span style={{ color: "var(--accent-red)" }}>*</span>
                  </label>
                  <input type="date" value={depositForm.deposit_date}
                    onChange={e => setDepositForm(f => ({ ...f, deposit_date: e.target.value }))}
                    style={{ width: "100%", padding: "9px 13px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.10)", background: "rgba(0,0,0,0.03)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none", boxSizing: "border-box" as any, color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" }}>
                    Mode <span style={{ color: "var(--accent-red)" }}>*</span>
                  </label>
                  <select value={depositForm.mode}
                    onChange={e => setDepositForm(f => ({ ...f, mode: e.target.value }))}
                    style={{ width: "100%", padding: "9px 13px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.10)", background: "rgba(0,0,0,0.03)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none", boxSizing: "border-box" as any, color: "var(--text-primary)" }}>
                    <option>Cash</option>
                    <option>Bank</option>
                  </select>
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" }}>
                    Deposited By <span style={{ color: "var(--accent-red)" }}>*</span>
                  </label>
                  <input placeholder="Driver / Attendant name" value={depositForm.deposited_by}
                    onChange={e => setDepositForm(f => ({ ...f, deposited_by: e.target.value }))}
                    style={{ width: "100%", padding: "9px 13px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.10)", background: "rgba(0,0,0,0.03)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none", boxSizing: "border-box" as any, color: "var(--text-primary)" }} />
                </div>
                <div>
                  <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" }}>
                    Amount (₹) <span style={{ color: "var(--accent-red)" }}>*</span>
                  </label>
                  <input placeholder="e.g. 5000" type="number" value={depositForm.amount}
                    onChange={e => setDepositForm(f => ({ ...f, amount: e.target.value }))}
                    style={{ width: "100%", padding: "9px 13px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.10)", background: "rgba(0,0,0,0.03)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none", boxSizing: "border-box" as any, color: "var(--text-primary)" }} />
                </div>
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" }}>
                  Reference / Trip ID
                </label>
                <input placeholder="e.g. Trip #42 or receipt number" value={depositForm.reference}
                  onChange={e => setDepositForm(f => ({ ...f, reference: e.target.value }))}
                  style={{ width: "100%", padding: "9px 13px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.10)", background: "rgba(0,0,0,0.03)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none", boxSizing: "border-box" as any, color: "var(--text-primary)" }} />
              </div>
              <div>
                <label style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 5, display: "block" }}>
                  Notes
                </label>
                <textarea placeholder="Additional notes..." value={depositForm.notes}
                  onChange={e => setDepositForm(f => ({ ...f, notes: e.target.value }))}
                  style={{ width: "100%", padding: "9px 13px", borderRadius: 8, border: "1px solid rgba(0,0,0,0.10)", background: "rgba(0,0,0,0.03)", fontSize: 14, fontFamily: "var(--font-body)", outline: "none", boxSizing: "border-box" as any, color: "var(--text-primary)", height: 72, resize: "vertical" as any }} />
              </div>

              {/* Recent deposits */}
              {deposits.length > 0 && (
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.08)", paddingTop: 14 }}>
                  <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Recent Deposits</p>
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                    {deposits.slice(-5).reverse().map((dep: any, i: number) => (
                      <div key={i} style={{
                        display: "flex", justifyContent: "space-between", alignItems: "center",
                        background: "rgba(34,197,94,0.06)", borderRadius: 8, padding: "7px 12px",
                        border: "1px solid rgba(34,197,94,0.15)",
                      }}>
                        <div>
                          <p style={{ fontSize: 13, fontWeight: 600, color: "var(--text-primary)" }}>{dep.deposited_by}</p>
                          <p style={{ fontSize: 11, color: "var(--text-muted)" }}>{dep.deposit_date} • {dep.mode}{dep.reference ? ` • ${dep.reference}` : ""}</p>
                        </div>
                        <p style={{ fontSize: 15, fontWeight: 700, color: "var(--accent-green)" }}>₹{Number(dep.amount || 0).toLocaleString("en-IN")}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowDepositModal(false)} style={{
                background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 10,
                padding: "10px 20px", fontSize: 14, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={handleDepositSave} disabled={depositSaving} style={{
                background: "var(--accent-green)", color: "#fff",
                border: "none", borderRadius: 10, padding: "10px 24px",
                fontSize: 14, fontWeight: 600, cursor: depositSaving ? "not-allowed" : "pointer",
                opacity: depositSaving ? 0.7 : 1,
              }}>
                {depositSaving ? "Saving..." : "Record Deposit"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
