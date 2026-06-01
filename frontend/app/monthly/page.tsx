"use client";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/lib/toast";

import Navbar from "@/components/Navbar";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer
} from "recharts";

const axisProps = { stroke: "#475569", fontSize: 12, fontFamily: "var(--font-body)" };
const tooltipStyle = {
  background: "rgba(255,255,255,0.97)",
  border: "1px solid rgba(0,0,0,0.10)",
  borderRadius: 14,
  boxShadow: "0 8px 32px rgba(0,0,0,0.10)",
  fontFamily: "var(--font-body)",
  fontSize: 13,
};

export default function MonthlyPage() {
  const [data, setData]         = useState<any>(null);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [fromDate, setFromDate] = useState<Date | null>(new Date(now.getFullYear(), now.getMonth(), 1));
  const [toDate, setToDate]     = useState<Date | null>(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState<string | null>(null);

useEffect(() => {
  const token = sessionStorage.getItem("token");
  const role = sessionStorage.getItem("role");

  if (!token) { 
    window.location.href = "/login"; 
    return; 
  }

  setLoading(true);

  const endpoint = role === "admin" ? "/trips" : "/trips-view";
  const toLocalDate = (d: Date) => {
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}-${m}-${day}`;
  };
  const params = new URLSearchParams();
  if (fromDate) params.set("start", toLocalDate(fromDate));
  if (toDate)   params.set("end",   toLocalDate(toDate));
  const qs = params.toString();

  apiFetch(`${endpoint}${qs ? "?" + qs : ""}`)
    .then(async res => {
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.detail || `Error ${res.status}`);
      }
      return res.json();
    })
    .then(res => { setData(res); setLoading(false); setError(null); })
    .catch(err => {
      setLoading(false);
      setError(err.message || "Failed to load data");
      toast.error(err.message || "Failed to load date range data");
    });

}, [fromDate, toDate]);

  // const finalData = data?.trips || [];
  const finalData = (data?.trips || []).filter(
  (t:any) => t.Status?.toLowerCase().includes("completed")
);
  const formattedData = finalData.map((item: any) => ({
    ...item,
    formattedDate: item["Start Date"]
      ? new Date(item["Start Date"]).toLocaleDateString("en-GB")
      : ""
  }));

  const completed = data?.completed || {};
  const progress  = data?.progress  || {};
  const booked    = data?.booked    || {};
  const done      = data?.done      || {};
  const vehicleExpenses: any[] = data?.vehicle_expense_breakdown || [];
  const EXPENSE_COLORS = ["#2563eb","#f97316","#22d3a0","#a855f7","#f43f5e","#eab308"];
  const EXPENSE_KEYS   = ["Fuel","Tolls & Taxes","Parking","Driver Allowance","Sales Commission","Other Expenses"];
  const cancelled = data?.cancelled || {};
  const totalExclCancelled = [completed, progress, booked, done].reduce(
    (sum, s) => sum + (s.revenue || 0), 0
  );

  return (
    <div className="page-root">
      <Navbar />
      <div className="page-content">

        {/* Header */}
        <div style={{ marginBottom: 32 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
            Date Range Analysis
          </h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Filter trips by date to analyse performance</p>
        </div>

        {/* Filters */}
        <section className="section">
          {/* Year + Month quick selectors */}
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:12 }}>
            {/* Year selector */}
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ fontSize:12, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginRight:4 }}>Year:</span>
              {[now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map(yr => (
                <button key={yr} onClick={() => {
                  setSelectedYear(yr);
                  // Keep same month, change year
                  const activeMonth = fromDate ? fromDate.getMonth() : now.getMonth();
                  setFromDate(new Date(yr, activeMonth, 1));
                  setToDate(new Date(yr, activeMonth + 1, 0));
                }} style={{
                  padding:"5px 14px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer",
                  background: selectedYear === yr ? "var(--accent-primary)" : "rgba(255,255,255,0.7)",
                  color: selectedYear === yr ? "#fff" : "var(--text-muted)",
                  border: selectedYear === yr ? "none" : "1px solid rgba(0,0,0,0.10)",
                }}>{yr}</button>
              ))}
            </div>
            {/* Month buttons */}
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => {
                const isActive = fromDate && fromDate.getMonth() === i && fromDate.getFullYear() === selectedYear;
                return (
                  <button key={m} onClick={() => {
                    setFromDate(new Date(selectedYear, i, 1));
                    setToDate(new Date(selectedYear, i + 1, 0));
                  }} style={{
                    padding:"5px 12px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer",
                    background: isActive ? "var(--accent-primary)" : "rgba(255,255,255,0.7)",
                    color: isActive ? "#fff" : "var(--text-muted)",
                    border: isActive ? "none" : "1px solid rgba(0,0,0,0.10)",
                  }}>{m}</button>
                );
              })}
            </div>
          </div>
          <div style={{ display: "flex", gap: 12, alignItems: "center", flexWrap: "wrap", background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "16px 20px" }}>
            <p style={{ fontSize: 13, color: "var(--text-muted)", fontWeight: 600, marginRight: 4 }}>Date range:</p>
            <div style={{ position: "relative" }}>
              <DatePicker
                selected={fromDate}
                onChange={(date: Date | null) => setFromDate(date)}
                placeholderText="From date"
                className="input-field"
                dateFormat="dd/MM/yyyy"
                wrapperClassName="date-picker-wrapper"
              />
            </div>
            <span style={{ color: "var(--text-muted)", fontSize: 13 }}>→</span>
            <DatePicker
              selected={toDate}
              onChange={(date: Date | null) => setToDate(date)}
              placeholderText="To date"
              className="input-field"
              dateFormat="dd/MM/yyyy"
            />
            <button
              className="btn-ghost"
              onClick={() => { setFromDate(null); setToDate(null); }}
            >
              Clear
            </button>
            {loading && (
              <div style={{ width: 18, height: 18, borderRadius: "50%", border: "2px solid rgba(37,99,235,0.20)", borderTopColor: "var(--accent-primary)", animation: "spin 0.7s linear infinite" }} />
            )}
          </div>
          <style>{`@keyframes spin { to { transform: rotate(360deg); } } .date-picker-wrapper { display: block; } .react-datepicker-wrapper { display: block; } .react-datepicker__input-container input { background: #ffffff; border: 1px solid rgba(0,0,0,0.10); border-radius: 8px; padding: 9px 13px; color: #0f172a; font-family: var(--font-body); font-size: 14px; outline: none; min-width: 150px; } .react-datepicker { background: #ffffff; border: 1px solid rgba(0,0,0,0.10); border-radius: 12px; font-family: var(--font-body); color: #0f172a; } .react-datepicker__header { background: #f0f4fb; border-bottom: 1px solid rgba(0,0,0,0.08); border-radius: 12px 12px 0 0; } .react-datepicker__current-month, .react-datepicker__day-name { color: #475569; } .react-datepicker__day { color: #0f172a; } .react-datepicker__day:hover { background: rgba(37,99,235,0.20); border-radius: 6px; } .react-datepicker__day--selected { background: #2563eb; border-radius: 6px; } .react-datepicker__navigation-icon::before { border-color: #475569; }`}</style>
        </section>

        {/* Status cards */}
        <section className="section">
          <div className="section-header">
            <h2 className="section-title">Status Breakdown</h2>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: 14 }}>
            {/* Total Deal excl. Cancelled — FIRST */}
            <div className="kpi-card" style={{ borderColor: "rgba(16,185,129,0.25)", background: "rgba(16,185,129,0.04)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Total Deal</p>
                <span className="pill pill-green" style={{ fontSize: 10 }}>excl. cancelled</span>
              </div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--accent-green)", marginBottom: 8 }}>₹{totalExclCancelled.toLocaleString("en-IN")}</p>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                <span>Sum of Completed + In Progress + Booked + Done</span>
              </div>
            </div>

            {/* Completed */}
            <div className="kpi-card" style={{ borderColor: "rgba(34,211,160,0.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Completed</p>
                <span className="pill pill-green" style={{ fontSize: 10 }}>{completed.trips ?? 0} trips</span>
              </div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--accent-green)", marginBottom: 8 }}>₹{(completed.revenue || 0).toLocaleString("en-IN")}</p>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 3 }}>
                <span>Received: <strong style={{ color: "var(--text-primary)" }}>₹{(completed.received || 0).toLocaleString("en-IN")}</strong></span>
                <span>Pending: <strong style={{ color: "var(--accent-red)" }}>₹{(completed.pending || 0).toLocaleString("en-IN")}</strong></span>
              </div>
            </div>

            {/* In Progress */}
            <div className="kpi-card" style={{ borderColor: "rgba(249,115,22,0.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>In Progress</p>
                <span className="pill pill-orange" style={{ fontSize: 10 }}>{progress.trips ?? 0} trips</span>
              </div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--accent-orange)", marginBottom: 8 }}>₹{(progress.revenue || 0).toLocaleString("en-IN")}</p>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 3 }}>
                <span>Received: <strong style={{ color: "var(--text-primary)" }}>₹{(progress.received || 0).toLocaleString("en-IN")}</strong></span>
                <span>Pending: <strong style={{ color: "var(--accent-red)" }}>₹{(progress.pending || 0).toLocaleString("en-IN")}</strong></span>
              </div>
            </div>

            {/* Booked */}
            <div className="kpi-card" style={{ borderColor: "rgba(37,99,235,0.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Booked</p>
                <span className="pill pill-blue" style={{ fontSize: 10 }}>{booked.trips ?? 0} trips</span>
              </div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--accent-primary)", marginBottom: 8 }}>₹{(booked.revenue || 0).toLocaleString("en-IN")}</p>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 3 }}>
                <span>Received: <strong style={{ color: "var(--text-primary)" }}>₹{(booked.received || 0).toLocaleString("en-IN")}</strong></span>
                <span>Pending: <strong style={{ color: "var(--accent-red)" }}>₹{(booked.pending || 0).toLocaleString("en-IN")}</strong></span>
              </div>
            </div>

            {/* Done */}
            <div className="kpi-card" style={{ borderColor: "rgba(139,92,246,0.18)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 12 }}>
                <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em" }}>Done</p>
                <span className="pill" style={{ fontSize: 10, background: "rgba(139,92,246,0.12)", color: "#7c3aed" }}>{done.trips ?? 0} trips</span>
              </div>
              <p style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "#8b5cf6", marginBottom: 8 }}>₹{(done.revenue || 0).toLocaleString("en-IN")}</p>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 3 }}>
                <span>Received: <strong style={{ color: "var(--text-primary)" }}>₹{(done.received || 0).toLocaleString("en-IN")}</strong></span>
                <span>Pending: <strong style={{ color: "var(--accent-red)" }}>₹{(done.pending || 0).toLocaleString("en-IN")}</strong></span>
              </div>
            </div>
          </div>
        </section>

        {/* Chart */}
        {finalData.length > 0 ? (
          <section className="section">
            <div className="chart-card">
              <h2>Deal Price vs Profit Per Trip</h2>
              <ResponsiveContainer width="100%" height={420}>
                <BarChart
                  data={formattedData}
                  margin={{ top: 10, right: 20, left: 0, bottom: 80 }}
                >
                  <XAxis
                    dataKey="formattedDate"
                    angle={-55}
                    textAnchor="end"
                    interval={0}
                    height={90}
                    {...axisProps}
                    tick={{ fontSize: 10, fill: "#475569", fontFamily: "var(--font-body)" }}
                  />
                  <YAxis {...axisProps} />
                  <Tooltip contentStyle={tooltipStyle} />
                  <Legend wrapperStyle={{ fontFamily: "var(--font-body)", fontSize: 12, color: "var(--text-secondary)", paddingTop: 8 }} />
                  <Bar dataKey="Deal Price" fill="#2563eb" radius={[4,4,0,0]} />
                  <Bar dataKey="Net Profit (without Driver Salary)" name="Net Profit" fill="#22d3a0" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        ) : (
          <div style={{ background: "var(--bg-card)", border: "1px solid var(--border-subtle)", borderRadius: 14, padding: "48px 32px", textAlign: "center" }}>
            <p style={{ fontSize: 32, marginBottom: 12 }}>📅</p>
            <p style={{ color: "var(--text-secondary)", fontSize: 15, marginBottom: 6 }}>No data for selected range</p>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Try adjusting the date filters above</p>
          </div>
        )}

        {/* Vehicle-wise Expense Breakdown */}
        {vehicleExpenses.length > 0 && (\n          <section className="section">\n            <div className="section-header">\n              <h2 className="section-title">Vehicle-wise Expense Breakdown</h2>\n            </div>\n            <div className="chart-card">\n              <ResponsiveContainer width="100%" height={360}>\n                <BarChart data={vehicleExpenses} margin={{ top: 10, right: 20, left: 0, bottom: 60 }}>\n                  <XAxis dataKey="vehicle" angle={-30} textAnchor="end" height={70} tick={{ fontSize: 11, fill: "#475569", fontFamily: "var(--font-body)" }} />\n                  <YAxis tick={{ fontSize: 11, fill: "#475569", fontFamily: "var(--font-body)" }} />\n                  <Tooltip contentStyle={{ background: "rgba(255,255,255,0.97)", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 14, fontFamily: "var(--font-body)", fontSize: 12 }} formatter={(v: any) => `₹${Number(v).toLocaleString("en-IN")}`} />\n                  <Legend wrapperStyle={{ fontFamily: "var(--font-body)", fontSize: 11, paddingTop: 8 }} />\n                  {EXPENSE_KEYS.map((key, i) => (\n                    <Bar key={key} dataKey={key} stackId="a" fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} radius={i === EXPENSE_KEYS.length - 1 ? [4,4,0,0] : [0,0,0,0]} />\n                  ))}\n                </BarChart>\n              </ResponsiveContainer>\n            </div>\n            {/* Percentage table */}\n            {(() => {\n              const grandTotal = vehicleExpenses.reduce((sum: number, v: any) => sum + EXPENSE_KEYS.reduce((s, k) => s + (Number(v[k]) || 0), 0), 0);\n              return grandTotal > 0 ? (\n                <div style={{ marginTop: 18, overflowX: "auto" }}>\n                  <table style={{ width: "100%", borderCollapse: "collapse", fontSize: 13 }}>\n                    <thead>\n                      <tr style={{ borderBottom: "2px solid var(--border-subtle)" }}>\n                        <th style={{ padding: "8px 12px", textAlign: "left", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Vehicle</th>\n                        {EXPENSE_KEYS.map(k => <th key={k} style={{ padding: "8px 10px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>{k}</th>)}\n                        <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Total</th>\n                        <th style={{ padding: "8px 12px", textAlign: "right", fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase" }}>Share %</th>\n                      </tr>\n                    </thead>\n                    <tbody>\n                      {vehicleExpenses.map((v: any, i: number) => {\n                        const rowTotal = EXPENSE_KEYS.reduce((s, k) => s + (Number(v[k]) || 0), 0);\n                        const pct = grandTotal > 0 ? ((rowTotal / grandTotal) * 100).toFixed(1) : "0.0";\n                        return (\n                          <tr key={i} style={{ borderBottom: "1px solid var(--border-subtle)", background: i % 2 === 0 ? "transparent" : "rgba(0,0,0,0.015)" }}>\n                            <td style={{ padding: "9px 12px", fontWeight: 600 }}>🚗 {v.vehicle}</td>\n                            {EXPENSE_KEYS.map(k => <td key={k} style={{ padding: "9px 10px", textAlign: "right", color: "var(--text-secondary)" }}>₹{(Number(v[k]) || 0).toLocaleString("en-IN")}</td>)}\n                            <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700 }}>₹{rowTotal.toLocaleString("en-IN")}</td>\n                            <td style={{ padding: "9px 12px", textAlign: "right" }}>\n                              <span style={{ background: "rgba(37,99,235,0.10)", color: "var(--accent-primary)", fontWeight: 700, fontSize: 12, padding: "2px 8px", borderRadius: 6 }}>{pct}%</span>\n                            </td>\n                          </tr>\n                        );\n                      })}\n                      <tr style={{ borderTop: "2px solid var(--border-subtle)", background: "rgba(37,99,235,0.03)" }}>\n                        <td style={{ padding: "9px 12px", fontWeight: 800 }}>Total</td>\n                        {EXPENSE_KEYS.map(k => <td key={k} style={{ padding: "9px 10px", textAlign: "right", fontWeight: 700 }}>₹{vehicleExpenses.reduce((s: number, v: any) => s + (Number(v[k]) || 0), 0).toLocaleString("en-IN")}</td>)}\n                        <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 800 }}>₹{grandTotal.toLocaleString("en-IN")}</td>\n                        <td style={{ padding: "9px 12px", textAlign: "right", fontWeight: 700 }}>100%</td>\n                      </tr>\n                    </tbody>\n                  </table>\n                </div>\n              ) : null;\n            })()}\n          </section>\n        )}

      </div>
    </div>
  );
}
