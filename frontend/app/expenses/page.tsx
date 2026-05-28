"use client";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/lib/toast";
import Navbar from "@/components/Navbar";
import { useEffect, useState } from "react";

const EMPTY = {
  date: "", driver_salary: "", insurance: "", vehicle_repair: "",
  road_permit: "", other_taxes: "", marketing: "", misc: "", notes: "",
};

const FIELDS = [
  { key: "driver_salary",  label: "Driver Salary",   icon: "👤" },
  { key: "insurance",      label: "Insurance",        icon: "🛡️" },
  { key: "vehicle_repair", label: "Vehicle Repair",   icon: "🔧" },
  { key: "road_permit",    label: "Road Permit",      icon: "📋" },
  { key: "other_taxes",    label: "Other Taxes",      icon: "🏛️" },
  { key: "marketing",      label: "Marketing",        icon: "📣" },
  { key: "misc",           label: "Misc",             icon: "📦" },
];

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "10px 13px", borderRadius: 10,
  border: "1px solid rgba(0,0,0,0.10)", background: "rgba(255,255,255,0.8)",
  fontFamily: "var(--font-body)", fontSize: 14, color: "var(--text-primary)",
  outline: "none", boxSizing: "border-box",
};

export default function ExpensesPage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [form, setForm]         = useState({ ...EMPTY });
  const [editRow, setEditRow]   = useState<number | null>(null);
  const [loading, setLoading]   = useState(false);
  const [role, setRole]         = useState("");
  const [search, setSearch]     = useState("");

  const isAdmin = role === "admin";

  useEffect(() => {
    const r = sessionStorage.getItem("role") || "";
    setRole(r);
    if (!sessionStorage.getItem("token")) { window.location.href = "/login"; return; }
    fetchExpenses();
  }, []);

  const fetchExpenses = () => {
    setLoading(true);
    apiFetch("/expenses").then(r => r.json()).then(d => {
      setExpenses(d.expenses || []);
      setLoading(false);
    }).catch(() => setLoading(false));
  };

  const setField = (k: string, v: string) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async () => {
    if (!form.date) { toast.error("Date is required"); return; }
    const method = editRow ? "PUT" : "POST";
    const url    = editRow ? `/expenses/${editRow}` : "/expenses";
    const res    = await apiFetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      toast.success(editRow ? "Expense updated" : "Expense added");
      setForm({ ...EMPTY }); setEditRow(null); fetchExpenses();
    } else {
      const e = await res.json().catch(() => ({}));
      toast.error(e.detail || "Failed to save");
    }
  };

  const handleEdit = (exp: any) => {
    setEditRow(exp._row);
    setForm({ date: exp.date || "", driver_salary: exp.driver_salary || "", insurance: exp.insurance || "",
      vehicle_repair: exp.vehicle_repair || "", road_permit: exp.road_permit || "",
      other_taxes: exp.other_taxes || "", marketing: exp.marketing || "",
      misc: exp.misc || "", notes: exp.notes || "" });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDelete = async (row: number) => {
    if (!confirm("Delete this expense entry?")) return;
    const res = await apiFetch(`/expenses/${row}`, { method: "DELETE" });
    if (res.ok) { toast.success("Deleted"); fetchExpenses(); }
    else toast.error("Failed to delete");
  };

  const filtered = expenses.filter(e => {
    if (!search) return true;
    return Object.values(e).some(v => String(v).toLowerCase().includes(search.toLowerCase()));
  });

  // Totals
  const totals = FIELDS.reduce((acc, f) => {
    acc[f.key] = filtered.reduce((s, e) => s + (parseFloat(e[f.key]) || 0), 0);
    return acc;
  }, {} as Record<string, number>);
  const grandTotal = Object.values(totals).reduce((s, v) => s + v, 0);

  return (
    <div className="page-root">
      <Navbar />
      <div className="page-content">
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Expenses</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Track operational expenses — salaries, insurance, repairs & more</p>
        </div>

        {/* Summary cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: 12, marginBottom: 28 }}>
          {FIELDS.map(f => (
            <div key={f.key} className="kpi-card" style={{ padding: "14px 16px" }}>
              <p style={{ fontSize: 18, marginBottom: 4 }}>{f.icon}</p>
              <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>{f.label}</p>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "#f43f5e" }}>₹{totals[f.key].toLocaleString("en-IN")}</p>
            </div>
          ))}
          <div className="kpi-card" style={{ padding: "14px 16px", borderColor: "rgba(244,63,94,0.3)" }}>
            <p style={{ fontSize: 18, marginBottom: 4 }}>💸</p>
            <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 4 }}>Grand Total</p>
            <p style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 800, color: "#f43f5e" }}>₹{grandTotal.toLocaleString("en-IN")}</p>
          </div>
        </div>

        {/* Form */}
        {isAdmin && (
          <section className="section" style={{ marginBottom: 28 }}>
            <div className="section-header">
              <h2 className="section-title">{editRow ? "Edit Expense" : "Add Expense"}</h2>
              {editRow && <button className="btn-ghost" onClick={() => { setForm({ ...EMPTY }); setEditRow(null); }}>Cancel</button>}
            </div>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 14 }}>
              <div>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Date *</label>
                <input type="date" value={form.date} onChange={e => setField("date", e.target.value)} style={inputStyle} />
              </div>
              {FIELDS.map(f => (
                <div key={f.key}>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>{f.icon} {f.label} (₹)</label>
                  <input type="number" value={(form as any)[f.key]} onChange={e => setField(f.key, e.target.value)} style={inputStyle} placeholder="0" />
                </div>
              ))}
              <div style={{ gridColumn: "1 / -1" }}>
                <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Notes</label>
                <textarea value={form.notes} onChange={e => setField("notes", e.target.value)} style={{ ...inputStyle, height: 60, resize: "vertical" }} placeholder="Optional notes..." />
              </div>
            </div>
            <div style={{ marginTop: 16 }}>
              <button className="btn-primary" onClick={handleSubmit}>{editRow ? "Update Expense" : "Add Expense"}</button>
            </div>
          </section>
        )}

        {/* Table */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">All Entries ({filtered.length})</h2>
            <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search..." style={{ ...inputStyle, maxWidth: 220 }} />
          </div>
          {loading ? (
            <div style={{ textAlign: "center", padding: 40, color: "var(--text-muted)" }}>Loading...</div>
          ) : filtered.length === 0 ? (
            <div style={{ textAlign: "center", padding: 40 }}>
              <p style={{ fontSize: 28 }}>💸</p>
              <p style={{ color: "var(--text-muted)", marginTop: 8 }}>No expense entries yet</p>
            </div>
          ) : (
            <div style={{ overflowX: "auto" }}>
              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>
                <thead>
                  <tr style={{ background: "rgba(241,245,249,0.8)" }}>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Date</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Month</th>
                    {FIELDS.map(f => (
                      <th key={f.key} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>{f.label}</th>
                    ))}
                    <th style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Total</th>
                    <th style={{ padding: "10px 12px", textAlign: "left", fontWeight: 700, color: "var(--text-muted)", fontSize: 11, textTransform: "uppercase", letterSpacing: "0.06em" }}>Notes</th>
                    {isAdmin && <th style={{ padding: "10px 12px" }}></th>}
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((exp, i) => {
                    const rowTotal = FIELDS.reduce((s, f) => s + (parseFloat(exp[f.key]) || 0), 0);
                    return (
                      <tr key={i} style={{ borderBottom: "1px solid rgba(148,163,184,0.10)", background: i % 2 === 0 ? "transparent" : "rgba(241,245,249,0.4)" }}>
                        <td style={{ padding: "10px 12px", color: "var(--text-primary)", fontWeight: 600 }}>{exp.date}</td>
                        <td style={{ padding: "10px 12px", color: "var(--text-muted)" }}>{exp.month} {exp.year}</td>
                        {FIELDS.map(f => (
                          <td key={f.key} style={{ padding: "10px 12px", textAlign: "right", color: parseFloat(exp[f.key]) > 0 ? "var(--text-primary)" : "var(--text-muted)" }}>
                            {parseFloat(exp[f.key]) > 0 ? `₹${Number(exp[f.key]).toLocaleString("en-IN")}` : "—"}
                          </td>
                        ))}
                        <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#f43f5e" }}>₹{rowTotal.toLocaleString("en-IN")}</td>
                        <td style={{ padding: "10px 12px", color: "var(--text-muted)", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{exp.notes || "—"}</td>
                        {isAdmin && (
                          <td style={{ padding: "10px 12px", whiteSpace: "nowrap" }}>
                            <button onClick={() => handleEdit(exp)} style={{ background: "rgba(37,99,235,0.10)", border: "none", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 12, color: "var(--accent-primary)", fontWeight: 600, marginRight: 6 }}>Edit</button>
                            <button onClick={() => handleDelete(exp._row)} style={{ background: "rgba(244,63,94,0.10)", border: "none", borderRadius: 7, padding: "5px 12px", cursor: "pointer", fontSize: 12, color: "#f43f5e", fontWeight: 600 }}>Delete</button>
                          </td>
                        )}
                      </tr>
                    );
                  })}
                  {/* Totals row */}
                  <tr style={{ background: "rgba(244,63,94,0.05)", borderTop: "2px solid rgba(244,63,94,0.15)" }}>
                    <td style={{ padding: "10px 12px", fontWeight: 800, color: "var(--text-primary)" }} colSpan={2}>TOTAL</td>
                    {FIELDS.map(f => (
                      <td key={f.key} style={{ padding: "10px 12px", textAlign: "right", fontWeight: 700, color: "#f43f5e" }}>₹{totals[f.key].toLocaleString("en-IN")}</td>
                    ))}
                    <td style={{ padding: "10px 12px", textAlign: "right", fontWeight: 800, color: "#f43f5e" }}>₹{grandTotal.toLocaleString("en-IN")}</td>
                    <td colSpan={isAdmin ? 2 : 1} />
                  </tr>
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </div>
  );
}
