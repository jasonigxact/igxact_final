"use client";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/lib/toast";
import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";

const datePickerStyles = `
  @keyframes spin { to { transform: rotate(360deg); } }
  .react-datepicker-wrapper { display: block; }
  .react-datepicker__input-container input {
    background: rgba(0,0,0,0.03); border: 1px solid rgba(0,0,0,0.10);
    border-radius: 8px; padding: 9px 13px; color: #0f172a;
    font-family: var(--font-body); font-size: 14px; outline: none; min-width: 140px;
  }
  .react-datepicker { background: #ffffff; border: 1px solid rgba(0,0,0,0.10); border-radius: 12px; font-family: var(--font-body); color: #0f172a; }
  .react-datepicker__header { background: #f0f4fb; border-bottom: 1px solid rgba(0,0,0,0.08); border-radius: 12px 12px 0 0; }
  .react-datepicker__current-month, .react-datepicker__day-name { color: #475569; }
  .react-datepicker__day { color: #0f172a; }
  .react-datepicker__day:hover { background: rgba(37,99,235,0.20); border-radius: 6px; }
  .react-datepicker__day--selected { background: #2563eb; border-radius: 6px; }
  .react-datepicker__navigation-icon::before { border-color: #475569; }
`;

const SKIP_COLS = new Set(["trip id","Profit Percentage","Net Profit (without Driver Salary)","Profit without commission"]);
const NUM_COLS  = new Set(["Deal Price","Fuel","Tolls & Taxes","Parking","Driver Allowance","Sales Commission","Number of Days","Other Expenses","Booking Amt/Advance Cash","Booking Amt/Advance Bank","2nd Payment Cash Bank","2nd Payment Bank","Final Payment Mode Cash","Final Payment Mode Bank","Total Cash","Total Bank","Total","Per Day Cost"]);
const PAYMENT_COLS = ["Booking Amt/Advance Cash","Booking Amt/Advance Bank","2nd Payment Cash Bank","2nd Payment Bank","Final Payment Mode Cash","Final Payment Mode Bank"];
const AUTO_CALC_COLS = new Set(["Total Cash","Total Bank","Total","Per Day Cost","Number of Days"]);

// ── Field-level validation ────────────────────────────────────────────────────
function validateForm(form: any): string | null {
  const str = (v: any) => (v == null ? "" : String(v)).trim();
  if (!str(form["Customer Name"]))   return "Customer Name is required";
  if (!str(form["Trip From"]))       return "Trip From is required";
  if (!str(form["Trip TO"]))         return "Trip To is required";
  if (!str(form["Vehicle Details"])) return "Vehicle is required";
  const deal = Number(form["Deal Price"]);
  if (!deal || deal <= 0)              return "Deal Price must be greater than 0";
  return null;
}

export default function TripsPage() {
  const [trips, setTrips]         = useState<any[]>([]);
  const [columns, setColumns]     = useState<string[]>([]);
  const [form, setForm]           = useState<any>({});
  const [editingId, setEditingId] = useState<number | null>(null);
  const [hasFiltered, setHasFiltered] = useState(false);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate]     = useState<Date | null>(null);
  const [loading, setLoading]     = useState(false);
  const [saving, setSaving]       = useState(false);
  const [vehicles, setVehicles]   = useState<string[]>([]);
  const [tripId, setTripId]       = useState("");
  const [mobile, setMobile]       = useState("");
  const [role, setRole]           = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<string | null>(null);

  // ── Auth guard ────────────────────────────────────────────────────────────
  useEffect(() => {
    const storedRole = sessionStorage.getItem("role");
    if (!storedRole) { window.location.href = "/login"; return; }
    const cleanRole = storedRole.trim().toLowerCase();
    if (cleanRole !== "admin") { window.location.href = "/"; return; }
    setRole(cleanRole);
  }, []);

  // ── Load columns ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!role) return;
    apiFetch("/columns")
      .then(res => res.json())
      .then(data => setColumns(Array.isArray(data) ? data : (data.columns || [])))
      .catch(() => toast.error("Failed to load form columns"));
  }, [role]);

  // ── Load vehicles ─────────────────────────────────────────────────────────
  useEffect(() => {
    if (!role) return;
    apiFetch("/vehicles")
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(data => setVehicles(data.vehicles || []))
      .catch(() => toast.error("Failed to load vehicles"));
  }, [role]);

  // ── Auto-calculate Number of Days ─────────────────────────────────────────
  useEffect(() => {
    if (form["Start Date"] && form["End date"]) {
      const start = new Date(form["Start Date"]);
      const end   = new Date(form["End date"]);
      if (!isNaN(start.getTime()) && !isNaN(end.getTime())) {
        const diff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
        setForm((prev: any) => ({ ...prev, "Number of Days": Math.round(diff + 1) }));
      }
    }
  }, [form["Start Date"], form["End date"]]);

  // ── Auto-calculate payment totals ────────────────────────────────────────
  useEffect(() => {
    const advCash   = num(form["Booking Amt/Advance Cash"]);
    const advBank   = num(form["Booking Amt/Advance Bank"]);
    const pay2Cash  = num(form["2nd Payment Cash Bank"]);
    const pay2Bank  = num(form["2nd Payment Bank"]);
    const finalCash = num(form["Final Payment Mode Cash"]);
    const finalBank = num(form["Final Payment Mode Bank"]);

    const totalCash = advCash + pay2Cash + finalCash;
    const totalBank = advBank + pay2Bank + finalBank;
    const total     = totalCash + totalBank;

    const days    = num(form["Number of Days"]);
    const deal    = num(form["Deal Price"]);
    const perDay  = days > 0 && deal > 0 ? Math.round(deal / days) : 0;

    setForm((prev: any) => ({
      ...prev,
      "Total Cash": totalCash,
      "Total Bank": totalBank,
      "Total":      total,
      "Per Day Cost": perDay,
    }));
  }, [
    form["Booking Amt/Advance Cash"], form["Booking Amt/Advance Bank"],
    form["2nd Payment Cash Bank"],    form["2nd Payment Bank"],
    form["Final Payment Mode Cash"],  form["Final Payment Mode Bank"],
    form["Number of Days"],           form["Deal Price"],
  ]);

  const num = (val: any) => Number(val) || 0;

  const formatToSheetDate = (dateStr: string) => {
    if (!dateStr) return "";
    const date = dateStr.includes("-") ? new Date(dateStr + "T00:00:00") : new Date(dateStr);
    if (isNaN(date.getTime())) return dateStr;
    return `${String(date.getMonth()+1).padStart(2,"0")}/${String(date.getDate()).padStart(2,"0")}/${date.getFullYear()}`;
  };

  const convertToInputDate = (sheetDate: string) => {
    if (!sheetDate) return "";
    const parts = sheetDate.split("/");
    if (parts.length === 3) {
      const [month, day, year] = parts.map(Number);
      if (month && day && year) return `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
    }
    const date = new Date(sheetDate);
    return isNaN(date.getTime()) ? "" : date.toISOString().split("T")[0];
  };

  // ── Live profit preview ───────────────────────────────────────────────────
  const deal       = num(form["Deal Price"]);
  const fuel       = num(form["Fuel"]);
  const tolls      = num(form["Tolls & Taxes"]);
  const parking    = num(form["Parking"]);
  const driver     = num(form["Driver Allowance"]);
  const commission = num(form["Sales Commission"]);
  const expenses   = num(form["Other Expenses"]);
  const netProfit  = Math.round(deal - (fuel + tolls + parking + driver + commission + expenses));
  const profitWithoutCommission = Math.round(netProfit + commission);
  const profitPercent = deal > 0 ? ((netProfit / deal) * 100).toFixed(1) : "0";

  // ── Search trips ──────────────────────────────────────────────────────────
  const fetchTrips = async () => {
    if (!startDate && !endDate && !tripId && !mobile) {
      setTrips([]);
      setHasFiltered(false);
      return;
    }
    setLoading(true);
    const params = new URLSearchParams();
    if (startDate) params.append("start", startDate.toISOString().split("T")[0]);
    if (endDate)   params.append("end",   endDate.toISOString().split("T")[0]);
    if (tripId)    params.append("trip_id", tripId);
    if (mobile)    params.append("mobile",  mobile);

    try {
      const res  = await apiFetch("/trips?" + params.toString());
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Search failed");
      setTrips(data?.trips || []);
      setHasFiltered(true);
      if ((data?.trips || []).length === 0) toast.info("No trips found for the selected filters");
    } catch (err: any) {
      toast.error(err.message || "Search failed");
    } finally {
      setLoading(false);
    }
  };

  // ── Submit (add / update) ─────────────────────────────────────────────────
  const handleSubmit = async () => {
    setFormErrors(null);

    const validationError = validateForm(form);
    if (validationError) {
      setFormErrors(validationError);
      toast.error(validationError);
      return;
    }

    // ── Expense check when marking Completed ────────────────────────────
    if (form["Status"] === "completed") {
      const EXPENSE_FIELDS = ["Fuel", "Tolls & Taxes", "Parking", "Driver Allowance", "Other Expenses", "Sales Commission"];
      const missingExpenses = EXPENSE_FIELDS.filter(f => form[f] === undefined || form[f] === null || String(form[f]).trim() === "");
      if (missingExpenses.length > 0) {
        const msg = `Cannot mark Completed — missing expenses: ${missingExpenses.join(", ")}. Mark as Done if expenses are pending.`;
        setFormErrors(msg); toast.error(msg); return;
      }
    }

    // ── Payment check when marking Completed ─────────────────────────────
    if (form["Status"] === "completed") {
      const deal = num(form["Deal Price"]);
      const total =
        num(form["Booking Amt/Advance Cash"])  + num(form["Booking Amt/Advance Bank"]) +
        num(form["2nd Payment Cash Bank"])     + num(form["2nd Payment Bank"]) +
        num(form["Final Payment Mode Cash"])   + num(form["Final Payment Mode Bank"]);
      if (deal <= 0) {
        const msg = "Deal Price must be set before marking Completed.";
        setFormErrors(msg); toast.error(msg); return;
      }
      if (total !== deal) {
        const diff = deal - total;
        const msg = diff > 0
          ? `Cannot mark Completed — ₹${diff.toLocaleString("en-IN")} still pending (Received: ₹${total.toLocaleString("en-IN")} / Deal: ₹${deal.toLocaleString("en-IN")})`
          : `Cannot mark Completed — Total received ₹${total.toLocaleString("en-IN")} exceeds Deal Size ₹${deal.toLocaleString("en-IN")}`;
        setFormErrors(msg); toast.error(msg); return;
      }
    }

    setSaving(true);
    const deal      = num(form["Deal Price"]);
    const advCash   = num(form["Booking Amt/Advance Cash"]);
    const advBank   = num(form["Booking Amt/Advance Bank"]);
    const pay2Cash  = num(form["2nd Payment Cash Bank"]);
    const pay2Bank  = num(form["2nd Payment Bank"]);
    const finalCash = num(form["Final Payment Mode Cash"]);
    const finalBank = num(form["Final Payment Mode Bank"]);
    const totalCash = advCash + pay2Cash + finalCash;
    const totalBank = advBank + pay2Bank + finalBank;
    const totalAmt  = totalCash + totalBank;
    const days      = num(form["Number of Days"]);
    const perDay    = days > 0 && deal > 0 ? Math.round(deal / days) : 0;

    const payload = {
      ...form,
      "Start Date": formatToSheetDate(form["Start Date"] || ""),
      "End date":   formatToSheetDate(form["End date"]   || ""),
      "trip id": editingId ?? undefined,
      "Net Profit (without Driver Salary)": netProfit,
      "Profit without commission": profitWithoutCommission,
      "Profit Percentage": Number(profitPercent),
      "Total Cash": totalCash,
      "Total Bank": totalBank,
      "Total":      totalAmt,
      "Per Day Cost": perDay,
    };

    try {
      const url    = editingId != null ? `/update-trip/${editingId}` : "/add-trip";
      const method = editingId != null ? "PUT" : "POST";
      const res    = await apiFetch(url, { method, body: JSON.stringify(payload) });
      const data   = await res.json();

      if (!res.ok) throw new Error(data.detail || `Save failed (${res.status})`);

      toast.success(editingId != null ? "Trip updated successfully!" : "Trip added successfully!");
      setForm({});
      setEditingId(null);
      setFormErrors(null);
    } catch (err: any) {
      toast.error(err.message || "Failed to save trip");
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = (trip: any) => {
    // Sanitize all values — sheet can return numbers/nulls, inputs need strings
    const editableForm: any = {};
    Object.keys(trip).forEach(k => {
      const v = trip[k];
      editableForm[k] = v == null ? "" : v;
    });
    editableForm["Start Date"] = convertToInputDate(trip["Start Date"] || "");
    editableForm["End date"]   = convertToInputDate(trip["End date"]   || "");
    setEditingId(Number(trip["trip id"]) || null);
    setForm(editableForm);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleCancelEdit = () => {
    setEditingId(null);
    setForm({});
    setFormErrors(null);
  };

  const visibleColumns = columns.filter(col => !SKIP_COLS.has(col));

  if (!role) return null;

  return (
    <div className="page-root">
      <style>{datePickerStyles}</style>
      <Navbar />
      <div className="page-content">

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
            {editingId != null ? `Editing Trip #${editingId}` : "Add Trip"}
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>
            {editingId != null ? "Modify the trip details below" : "Fill in trip details to add a new record"}
          </p>
        </div>

        {/* Form validation error banner */}
        {formErrors && (
          <div style={{ background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.25)", borderRadius: 10, padding: "12px 16px", marginBottom: 20, fontSize: 13, color: "#f87171", display: "flex", alignItems: "center", gap: 8 }}>
            ❌ {formErrors}
          </div>
        )}

        {/* Live Profit Preview */}
        {deal > 0 && (
          <div style={{ background: "rgba(34,211,160,0.06)", border: "1px solid rgba(34,211,160,0.2)", borderRadius: 12, padding: "12px 18px", marginBottom: 20, display: "flex", gap: 24, flexWrap: "wrap", fontSize: 13 }}>
            <span>Net Profit: <strong style={{ color: netProfit >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>₹{netProfit.toLocaleString("en-IN")}</strong></span>
            <span>Margin: <strong>{profitPercent}%</strong></span>
            <span>Without Commission: <strong>₹{profitWithoutCommission.toLocaleString("en-IN")}</strong></span>
          </div>
        )}

        {/* Trip Form */}
        <section className="section">
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))", gap: 14 }}>
            {visibleColumns.map((col) => {
              if (col === "Vehicle Details") {
                return (
                  <div key={col}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{col}</label>
                    <select className="input-field" value={form[col] || ""} onChange={e => setForm((p: any) => ({ ...p, [col]: e.target.value }))}>
                      <option value="">Select vehicle</option>
                      {vehicles.map((v, i) => <option key={i} value={v}>{v}</option>)}
                    </select>
                  </div>
                );
              }
              if (col === "Status") {
                return (
                  <div key={col}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{col}</label>
                    <select className="input-field" value={form[col] || "booked"} onChange={e => setForm((p: any) => ({ ...p, [col]: e.target.value }))}>
                      <option value="booked">Booked</option>
                      <option value="progress">In Progress</option>
                      <option value="done">Done</option>
                      <option value="completed">Completed</option>
                      <option value="cancelled">Cancelled</option>
                    </select>
                  </div>
                );
              }
              if (col === "Start Date" || col === "End date") {
                return (
                  <div key={col}>
                    <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>{col}</label>
                    <input type="date" className="input-field" value={form[col] || ""} onChange={e => setForm((p: any) => ({ ...p, [col]: e.target.value }))} />
                  </div>
                );
              }
              const isAutoCalc = AUTO_CALC_COLS.has(col);
              return (
                <div key={col}>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: isAutoCalc ? "var(--accent-primary)" : "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 6 }}>
                    {col}{isAutoCalc ? " ✦" : ""}
                  </label>
                  <input
                    type={NUM_COLS.has(col) ? "number" : "text"}
                    className="input-field"
                    value={form[col] || ""}
                    onChange={isAutoCalc ? undefined : (e => setForm((p: any) => ({ ...p, [col]: e.target.value })))}
                    readOnly={isAutoCalc}
                    placeholder={isAutoCalc ? "Auto-calculated" : col}
                    style={isAutoCalc ? { background: "rgba(37,99,235,0.05)", cursor: "not-allowed", color: "var(--accent-primary)", fontWeight: 600 } : {}}
                  />
                </div>
              );
            })}
          </div>

          {/* Payment Summary */}
          {num(form["Deal Price"]) > 0 && (() => {
            const deal     = num(form["Deal Price"]);
            const received = num(form["Total"]) ||
              num(form["Booking Amt/Advance Cash"])  + num(form["Booking Amt/Advance Bank"]) +
              num(form["2nd Payment Cash Bank"])     + num(form["2nd Payment Bank"]) +
              num(form["Final Payment Mode Cash"])   + num(form["Final Payment Mode Bank"]);
            const pending  = Math.max(0, deal - received);
            const isPaid   = received >= deal;
            return (
              <div style={{
                marginTop: 20, padding: "16px 20px", borderRadius: 12,
                background: isPaid ? "rgba(34,197,94,0.07)" : "rgba(249,115,22,0.07)",
                border: `1px solid ${isPaid ? "rgba(34,197,94,0.25)" : "rgba(249,115,22,0.25)"}`,
                display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px,1fr))", gap: 14,
              }}>
                {[
                  { label: "Deal Size",      value: deal,                         color: "var(--text-primary)" },
                  { label: "Total Cash",     value: num(form["Total Cash"]),       color: "#16a34a" },
                  { label: "Total Bank",     value: num(form["Total Bank"]),       color: "var(--accent-primary)" },
                  { label: "Total Received", value: received,                     color: isPaid ? "var(--accent-green)" : "#f97316" },
                  { label: "Pending",        value: pending,                      color: pending > 0 ? "var(--accent-red)" : "var(--accent-green)" },
                  { label: "Per Day Cost",   value: num(form["Per Day Cost"]),     color: "var(--text-muted)" },
                ].map(({ label, value, color }) => (
                  <div key={label}>
                    <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{label}</p>
                    <p style={{ fontSize: 16, fontWeight: 800, color, fontFamily: "var(--font-display)" }}>₹{Number(value).toLocaleString("en-IN")}</p>
                  </div>
                ))}
                {form["Status"] === "completed" && received !== deal && (
                  <div style={{ gridColumn: "1/-1", display: "flex", alignItems: "center", gap: 8, color: "var(--accent-red)", fontSize: 13, fontWeight: 600 }}>
                    ⚠️ Cannot mark Completed — Total received must equal Deal Size (₹{Math.abs(deal - received).toLocaleString("en-IN")} {received < deal ? "still pending" : "overpaid"})
                  </div>
                )}
              </div>
            );
          })()}

          <div style={{ display: "flex", gap: 12, marginTop: 24 }}>
            <button className="btn-primary" onClick={handleSubmit} disabled={saving} style={{ opacity: saving ? 0.7 : 1, display: "flex", alignItems: "center", gap: 8 }}>
              {saving && <div style={{ width: 14, height: 14, borderRadius: "50%", border: "2px solid rgba(255,255,255,0.3)", borderTopColor: "#fff", animation: "spin 0.7s linear infinite" }} />}
              {saving ? "Saving…" : editingId != null ? "Update Trip" : "Add Trip"}
            </button>
            {editingId != null && (
              <button className="btn-ghost" onClick={handleCancelEdit}>Cancel Edit</button>
            )}
          </div>
        </section>

        {/* Search */}
        <section className="section">
          <div className="section-header"><h2 className="section-title">Search Trips</h2></div>
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "flex-end" }}>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>FROM</label>
              <DatePicker selected={startDate} onChange={(d: Date | null) => setStartDate(d)} placeholderText="Start date" dateFormat="dd/MM/yyyy" className="input-field" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>TO</label>
              <DatePicker selected={endDate} onChange={(d: Date | null) => setEndDate(d)} placeholderText="End date" dateFormat="dd/MM/yyyy" className="input-field" />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>TRIP ID</label>
              <input className="input-field" placeholder="e.g. 1024" value={tripId} onChange={e => setTripId(e.target.value)} style={{ width: 110 }} />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6 }}>MOBILE</label>
              <input className="input-field" placeholder="Mobile number" value={mobile} onChange={e => setMobile(e.target.value)} style={{ width: 150 }} />
            </div>
            <button className="btn-primary" onClick={fetchTrips} disabled={loading} style={{ opacity: loading ? 0.7 : 1 }}>
              {loading ? "Searching…" : "Search"}
            </button>
            {hasFiltered && (
              <button className="btn-ghost" onClick={() => { setStartDate(null); setEndDate(null); setTripId(""); setMobile(""); setTrips([]); setHasFiltered(false); }}>
                Clear
              </button>
            )}
          </div>
        </section>

        {/* Results */}
        {hasFiltered && (
          <section className="section">
            <div className="section-header">
              <h2 className="section-title">Results</h2>
              <p className="section-subtitle">{trips.length} trip{trips.length !== 1 ? "s" : ""} found</p>
            </div>
            {loading ? (
              <div style={{ display: "flex", justifyContent: "center", padding: 40 }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", border: "3px solid rgba(79,142,247,0.15)", borderTopColor: "var(--accent-primary)", animation: "spin 0.8s linear infinite" }} />
              </div>
            ) : trips.length === 0 ? (
              <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "32px", textAlign: "center", color: "var(--text-muted)", fontSize: 14 }}>
                No trips found
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                  <thead>
                    <tr style={{ borderBottom: "2px solid var(--border-subtle)" }}>
                      {["#", "Customer", "Route", "Date", "Vehicle", "Deal", "Net Profit", "Status", ""].map((h) => (
                        <th key={h} style={{ padding: "10px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", whiteSpace: "nowrap" }}>{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map((trip: any, i: number) => {
                      const tDeal   = Number(trip["Deal Price"] || 0);
                      const tFuel   = Number(trip["Fuel"] || 0);
                      const tTolls  = Number(trip["Tolls & Taxes"] || 0);
                      const tPark   = Number(trip["Parking"] || 0);
                      const tDriver = Number(trip["Driver Allowance"] || 0);
                      const tComm   = Number(trip["Sales Commission"] || 0);
                      const tOther  = Number(trip["Other Expenses"] || 0);
                      const tProfit = tDeal - (tFuel + tTolls + tPark + tDriver + tComm + tOther);
                      const status  = (trip["Status"] || "").toLowerCase();
                      const statusColor = status.includes("completed") ? "var(--accent-green)" : status.includes("progress") ? "var(--accent-orange)" : status.includes("done") ? "#8b5cf6" : "var(--accent-primary)";
                      return (
                        <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)" }}>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>{trip["trip id"]}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <div>{trip["Customer Name"]}</div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>{trip["Cust. Contact Number"]}</div>
                          </td>
                          <td style={{ padding: "10px 12px" }}>{trip["Trip From"]} → {trip["Trip TO"]}</td>
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap", color: "var(--text-muted)" }}>{trip["Start Date"] ? new Date(trip["Start Date"]).toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" }) : ""}</td>
                          <td style={{ padding: "10px 12px" }}>{trip["Vehicle Details"]}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 600 }}>₹{tDeal.toLocaleString("en-IN")}</td>
                          <td style={{ padding: "10px 12px", fontWeight: 600, color: tProfit >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>₹{tProfit.toLocaleString("en-IN")}</td>
                          <td style={{ padding: "10px 12px" }}>
                            <span style={{ fontSize: 11, fontWeight: 600, color: statusColor, background: `${statusColor}18`, padding: "3px 8px", borderRadius: 6 }}>
                              {trip["Status"]}
                            </span>
                          </td>
                          <td style={{ padding: "10px 12px" }}>
                            <button onClick={() => handleEdit(trip)} style={{ fontSize: 12, color: "var(--accent-primary)", fontWeight: 600, cursor: "pointer", background: "none", border: "none" }}>
                              Edit
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}
      </div>
    </div>
  );
}
