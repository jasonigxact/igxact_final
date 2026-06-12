"use client";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/lib/toast";
import Navbar from "@/components/Navbar";
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css";
import { useEffect, useState } from "react";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, LabelList,
  PieChart, Pie, Cell
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

const EXPENSE_KEYS   = ["Fuel","Tolls & Taxes","Parking","Driver Allowance","Sales Commission","Other Expenses"];
const EXPENSE_COLORS = ["#2563eb","#f97316","#22d3a0","#a855f7","#f43f5e","#eab308"];

function SummaryCard({ label, value, color = "var(--accent-primary)", sub = "" }: any) {
  return (
    <div className="kpi-card" style={{ borderColor: `${color}30` }}>
      <p style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>{label}</p>
      <p style={{ fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800, color, marginBottom: sub ? 4 : 0 }}>₹{Number(value || 0).toLocaleString("en-IN")}</p>
      {sub && <p style={{ fontSize: 12, color: "var(--text-muted)" }}>{sub}</p>}
    </div>
  );
}

export default function MonthlyPage() {
  const [data, setData]       = useState<any>(null);
  const now = new Date();
  const [selectedYear, setSelectedYear] = useState<number>(now.getFullYear());
  const [fromDate, setFromDate] = useState<Date | null>(new Date(now.getFullYear(), now.getMonth(), 1));
  const [toDate, setToDate]     = useState<Date | null>(new Date(now.getFullYear(), now.getMonth() + 1, 0));
  const [loading, setLoading]   = useState(false);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    const role  = sessionStorage.getItem("role");
    if (!token) { window.location.href = "/login"; return; }

    setLoading(true);
    const endpoint = role === "admin" ? "/trips" : "/trips-view";
    const toLocalDate = (d: Date) => {
      const y = d.getFullYear(), m = String(d.getMonth()+1).padStart(2,"0"), day = String(d.getDate()).padStart(2,"0");
      return `${y}-${m}-${day}`;
    };
    const params = new URLSearchParams();
    if (fromDate) params.set("start", toLocalDate(fromDate));
    if (toDate)   params.set("end",   toLocalDate(toDate));

    apiFetch(`${endpoint}?${params.toString()}`)
      .then(res => { if (!res.ok) throw new Error(); return res.json(); })
      .then(res => { setData(res); setLoading(false); })
      .catch(() => { setLoading(false); toast.error("Failed to load data"); });
  }, [fromDate, toDate]);

  const allTrips   = data?.trips || [];
  const completed  = data?.completed || {};
  const progress   = data?.progress  || {};
  const booked     = data?.booked    || {};
  const done       = data?.done      || {};
  const vehicleExpenses: any[]      = data?.vehicle_expense_breakdown || [];
  const vehicleProfits: any[]       = data?.vehicle_profit_summary    || [];

  // Summary calculations
  const totalRevenue    = [completed, progress, booked, done].reduce((s, x) => s + (x.revenue || 0), 0);
  const totalExpenses   = vehicleExpenses.reduce((s, v) => s + (v.total || 0), 0);
  const totalCommission = vehicleExpenses.reduce((s, v) => s + (Number(v["Sales Commission"]) || 0), 0);
  const netProfitWith   = totalRevenue - totalExpenses;
  const netProfitWithout = netProfitWith + totalCommission;

  // Deal vs profit chart data (completed trips only, sorted by date)
  const finalData = allTrips
    .filter((t: any) => t.Status?.toLowerCase().includes("completed"))
    .sort((a: any, b: any) => {
      const da = a["Start Date"] ? new Date(a["Start Date"]).getTime() : 0;
      const db = b["Start Date"] ? new Date(b["Start Date"]).getTime() : 0;
      return da - db;
    });

  const formattedData = finalData.map((item: any) => {
    const raw = item["Net Profit (without Driver Salary)"];
    const rawNum = Number(raw);
    const hasNetProfit = raw !== "" && raw !== undefined && raw !== null && !isNaN(rawNum) && rawNum !== 0;
    const netProfit = hasNetProfit ? rawNum : (Number(item["CalcProfit"]) || 0);
    return {
      ...item,
      "Net Profit (without Driver Salary)": netProfit,
      formattedDate: item["Start Date"] ? new Date((item["Start Date"]+"").includes("T") ? item["Start Date"] : item["Start Date"]+"T00:00:00").toLocaleDateString("en-GB") : ""
    };
  });

  // Expense category totals for pie
  const expensePieData = EXPENSE_KEYS.map((k, i) => ({
    name: k,
    value: vehicleExpenses.reduce((s, v) => s + (Number(v[k]) || 0), 0),
    color: EXPENSE_COLORS[i],
  })).filter(e => e.value > 0);

  return (
    <div className="page-root">
      <Navbar />
      <div className="page-content">
        <style>{`@keyframes spin { to { transform: rotate(360deg); } } .date-picker-wrapper { display: block; } .react-datepicker-wrapper { display: block; } .react-datepicker__input-container input { background: #ffffff; border: 1px solid rgba(0,0,0,0.10); border-radius: 8px; padding: 9px 13px; color: #0f172a; font-family: var(--font-body); font-size: 14px; outline: none; min-width: 150px; } .react-datepicker { background: #ffffff; border: 1px solid rgba(0,0,0,0.10); border-radius: 12px; font-family: var(--font-body); color: #0f172a; } .react-datepicker__header { background: #f0f4fb; border-bottom: 1px solid rgba(0,0,0,0.08); border-radius: 12px 12px 0 0; } .react-datepicker__current-month, .react-datepicker__day-name { color: #475569; } .react-datepicker__day { color: #0f172a; } .react-datepicker__day:hover { background: rgba(37,99,235,0.20); border-radius: 6px; } .react-datepicker__day--selected { background: #2563eb; border-radius: 6px; } .react-datepicker__navigation-icon::before { border-color: #475569; }`}</style>

        {/* Header */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Date Range Analysis</h1>
          <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Filter trips by date to analyse performance</p>
        </div>

        {/* Filters */}
        <section className="section">
          <div style={{ display:"flex", flexDirection:"column", gap:10, marginBottom:12 }}>
            <div style={{ display:"flex", gap:6, alignItems:"center" }}>
              <span style={{ fontSize:12, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.07em", marginRight:4 }}>Year:</span>
              {[now.getFullYear()-1, now.getFullYear(), now.getFullYear()+1].map(yr => (
                <button key={yr} onClick={() => {
                  setSelectedYear(yr);
                  const activeMonth = fromDate ? fromDate.getMonth() : now.getMonth();
                  setFromDate(new Date(yr, activeMonth, 1));
                  setToDate(new Date(yr, activeMonth+1, 0));
                }} style={{ padding:"5px 14px", borderRadius:8, fontSize:13, fontWeight:700, cursor:"pointer", background: selectedYear===yr ? "var(--accent-primary)" : "rgba(255,255,255,0.7)", color: selectedYear===yr ? "#fff" : "var(--text-muted)", border: selectedYear===yr ? "none" : "1px solid rgba(0,0,0,0.10)" }}>{yr}</button>
              ))}
            </div>
            <div style={{ display:"flex", gap:6, flexWrap:"wrap" }}>
              {["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"].map((m, i) => {
                const isActive = fromDate && fromDate.getMonth()===i && fromDate.getFullYear()===selectedYear;
                return (
                  <button key={m} onClick={() => { setFromDate(new Date(selectedYear,i,1)); setToDate(new Date(selectedYear,i+1,0)); }} style={{ padding:"5px 12px", borderRadius:8, fontSize:12, fontWeight:600, cursor:"pointer", background: isActive ? "var(--accent-primary)" : "rgba(255,255,255,0.7)", color: isActive ? "#fff" : "var(--text-muted)", border: isActive ? "none" : "1px solid rgba(0,0,0,0.10)" }}>{m}</button>
                );
              })}
            </div>
          </div>
          <div style={{ display:"flex", gap:12, alignItems:"center", flexWrap:"wrap", background:"var(--bg-card)", border:"1px solid var(--border-subtle)", borderRadius:14, padding:"16px 20px" }}>
            <p style={{ fontSize:13, color:"var(--text-muted)", fontWeight:600, marginRight:4 }}>Date range:</p>
            <DatePicker selected={fromDate} onChange={(d: Date|null) => setFromDate(d)} placeholderText="From date" className="input-field" dateFormat="dd/MM/yyyy" />
            <span style={{ color:"var(--text-muted)", fontSize:13 }}>→</span>
            <DatePicker selected={toDate} onChange={(d: Date|null) => setToDate(d)} placeholderText="To date" className="input-field" dateFormat="dd/MM/yyyy" />
            <button className="btn-ghost" onClick={() => { setFromDate(null); setToDate(null); }}>Clear</button>
            {loading && <div style={{ width:18, height:18, borderRadius:"50%", border:"2px solid rgba(37,99,235,0.20)", borderTopColor:"var(--accent-primary)", animation:"spin 0.7s linear infinite" }} />}
          </div>
        </section>

        {/* ── Overall Summary Cards ── */}
        <section className="section">
          <div className="section-header"><h2 className="section-title">Overall Summary</h2></div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(200px,1fr))", gap:14 }}>
            <SummaryCard label="Total Revenue"               value={totalRevenue}     color="#2563eb" />
            <SummaryCard label="Total Expenses"              value={totalExpenses}    color="#f97316" />
            <SummaryCard label="Total Commission"            value={totalCommission}  color="#a855f7" />
            <SummaryCard label="Net Profit (with commission)"    value={netProfitWith}    color={netProfitWith >= 0 ? "#16a34a" : "#ef4444"} />
            <SummaryCard label="Net Profit (without commission)" value={netProfitWithout} color={netProfitWithout >= 0 ? "#22d3a0" : "#ef4444"} />
          </div>
        </section>

        {/* ── Status Breakdown Cards ── */}
        <section className="section">
          <div className="section-header"><h2 className="section-title">Status Breakdown</h2></div>
          <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fit, minmax(220px,1fr))", gap:14 }}>
            {[
              { label:"Completed", data:completed, color:"var(--accent-green)",  pill:"pill-green",  pillLabel:"completed" },
              { label:"In Progress", data:progress, color:"var(--accent-orange)", pill:"pill-orange", pillLabel:"progress" },
              { label:"Booked",    data:booked,    color:"var(--accent-primary)", pill:"pill-blue",   pillLabel:"booked" },
              { label:"Done",      data:done,      color:"#8b5cf6",               pill:"",            pillLabel:"done" },
            ].map(({ label, data: d, color, pill, pillLabel }) => (
              <div key={label} className="kpi-card" style={{ borderColor:`${color}30` }}>
                <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:10 }}>
                  <p style={{ fontSize:11, fontWeight:600, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.07em" }}>{label}</p>
                  <span className={`pill ${pill}`} style={{ fontSize:10, background:`${color}18`, color }}>{d.trips ?? 0} trips</span>
                </div>
                <p style={{ fontFamily:"var(--font-display)", fontSize:22, fontWeight:800, color, marginBottom:6 }}>₹{(d.revenue||0).toLocaleString("en-IN")}</p>
                <div style={{ fontSize:12, color:"var(--text-secondary)", display:"flex", flexDirection:"column", gap:2 }}>
                  <span>Received: <strong style={{ color:"var(--text-primary)" }}>₹{(d.received||0).toLocaleString("en-IN")}</strong></span>
                  <span>Pending: <strong style={{ color:"var(--accent-red)" }}>₹{(d.pending||0).toLocaleString("en-IN")}</strong></span>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* ── Vehicle-wise Profit Table ── */}
        {vehicleProfits.length > 0 && (
          <section className="section">
            <div className="section-header"><h2 className="section-title">Vehicle-wise Profit Report</h2></div>
            <div style={{ overflowX:"auto" }}>
              <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                <thead>
                  <tr style={{ borderBottom:"2px solid var(--border-subtle)" }}>
                    {["Vehicle","Total Deals","Revenue","Expenses","Commission","Net Profit (w/ comm)","Net Profit (w/o comm)","Profit %"].map(h => (
                      <th key={h} style={{ padding:"10px 12px", textAlign: h==="Vehicle" ? "left" : "right", fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase", letterSpacing:"0.06em", whiteSpace:"nowrap" }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {vehicleProfits.map((v: any, i: number) => (
                    <tr key={i} style={{ borderBottom:"1px solid var(--border-subtle)", background: i%2===0 ? "transparent" : "rgba(0,0,0,0.015)" }}>
                      <td style={{ padding:"10px 12px", fontWeight:700 }}>🚗 {v.vehicle}</td>
                      <td style={{ padding:"10px 12px", textAlign:"right" }}>{v.total_deals}</td>
                      <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:600 }}>₹{Number(v.revenue).toLocaleString("en-IN")}</td>
                      <td style={{ padding:"10px 12px", textAlign:"right", color:"#f97316" }}>₹{Number(v.total_expenses).toLocaleString("en-IN")}</td>
                      <td style={{ padding:"10px 12px", textAlign:"right", color:"#a855f7" }}>₹{Number(v.commission).toLocaleString("en-IN")}</td>
                      <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:700, color: v.profit_with_commission >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>
                        ₹{Number(v.profit_with_commission).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding:"10px 12px", textAlign:"right", fontWeight:700, color: v.profit_without_commission >= 0 ? "#22d3a0" : "var(--accent-red)" }}>
                        ₹{Number(v.profit_without_commission).toLocaleString("en-IN")}
                      </td>
                      <td style={{ padding:"10px 12px", textAlign:"right" }}>
                        <span style={{ background: v.profit_pct >= 0 ? "rgba(34,211,160,0.12)" : "rgba(239,68,68,0.1)", color: v.profit_pct >= 0 ? "#16a34a" : "#ef4444", fontWeight:700, fontSize:12, padding:"2px 8px", borderRadius:6 }}>
                          {v.profit_pct}%
                        </span>
                      </td>
                    </tr>
                  ))}
                  {/* Totals row */}
                  <tr style={{ borderTop:"2px solid var(--border-subtle)", background:"rgba(37,99,235,0.03)", fontWeight:800 }}>
                    <td style={{ padding:"10px 12px" }}>Total</td>
                    <td style={{ padding:"10px 12px", textAlign:"right" }}>{vehicleProfits.reduce((s: number, v: any) => s + v.total_deals, 0)}</td>
                    <td style={{ padding:"10px 12px", textAlign:"right" }}>₹{totalRevenue.toLocaleString("en-IN")}</td>
                    <td style={{ padding:"10px 12px", textAlign:"right", color:"#f97316" }}>₹{totalExpenses.toLocaleString("en-IN")}</td>
                    <td style={{ padding:"10px 12px", textAlign:"right", color:"#a855f7" }}>₹{totalCommission.toLocaleString("en-IN")}</td>
                    <td style={{ padding:"10px 12px", textAlign:"right", color: netProfitWith >= 0 ? "var(--accent-green)" : "var(--accent-red)" }}>₹{netProfitWith.toLocaleString("en-IN")}</td>
                    <td style={{ padding:"10px 12px", textAlign:"right", color: netProfitWithout >= 0 ? "#22d3a0" : "var(--accent-red)" }}>₹{netProfitWithout.toLocaleString("en-IN")}</td>
                    <td style={{ padding:"10px 12px", textAlign:"right" }}>
                      <span style={{ background:"rgba(37,99,235,0.10)", color:"var(--accent-primary)", fontWeight:700, fontSize:12, padding:"2px 8px", borderRadius:6 }}>
                        {totalRevenue > 0 ? ((netProfitWith / totalRevenue)*100).toFixed(1) : 0}%
                      </span>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        )}

        {/* ── Deal Price vs Profit Chart ── */}
        {finalData.length > 0 && (
          <section className="section">
            <div className="chart-card">
              <h2>Deal Price vs Profit Per Trip (Completed)</h2>
              <ResponsiveContainer width="100%" height={420}>
                <BarChart data={formattedData} margin={{ top:10, right:20, left:0, bottom:80 }}>
                  <XAxis dataKey="formattedDate" angle={-55} textAnchor="end" interval={0} height={90} {...axisProps} tick={{ fontSize:10, fill:"#475569", fontFamily:"var(--font-body)" }} />
                  <YAxis {...axisProps} />
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `₹${Number(v).toLocaleString("en-IN")}`} />
                  <Legend wrapperStyle={{ fontFamily:"var(--font-body)", fontSize:12, paddingTop:8 }} />
                  <Bar dataKey="Deal Price" fill="#2563eb" radius={[4,4,0,0]} />
                  <Bar dataKey="Net Profit (without Driver Salary)" name="Net Profit" fill="#22d3a0" radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </section>
        )}

        {/* ── Overall Company Expense Breakdown ── */}
        {expensePieData.length > 0 && (
          <section className="section">
            <div className="section-header"><h2 className="section-title">Overall Company Expense Breakdown</h2></div>
            <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:24, alignItems:"center" }}>
              <ResponsiveContainer width="100%" height={300}>
                <PieChart>
                  <Pie data={expensePieData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={110} label={({ name, percent }: any) => `${name} ${(percent*100).toFixed(1)}%`} labelLine={true}>
                    {expensePieData.map((e, i) => <Cell key={i} fill={e.color} />)}
                  </Pie>
                  <Tooltip contentStyle={tooltipStyle} formatter={(v: any) => `₹${Number(v).toLocaleString("en-IN")}`} />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ display:"flex", flexDirection:"column", gap:8 }}>
                {expensePieData.map((e, i) => {
                  const pct = totalExpenses > 0 ? ((e.value / totalExpenses)*100).toFixed(1) : "0";
                  return (
                    <div key={i} style={{ display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:"rgba(0,0,0,0.02)", borderRadius:8, border:`1px solid ${e.color}20` }}>
                      <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                        <div style={{ width:10, height:10, borderRadius:"50%", background:e.color }} />
                        <span style={{ fontSize:13, fontWeight:600 }}>{e.name}</span>
                      </div>
                      <div style={{ display:"flex", gap:12, alignItems:"center" }}>
                        <span style={{ fontSize:13, fontWeight:700 }}>₹{e.value.toLocaleString("en-IN")}</span>
                        <span style={{ fontSize:11, fontWeight:700, background:`${e.color}18`, color:e.color, padding:"2px 8px", borderRadius:6 }}>{pct}%</span>
                      </div>
                    </div>
                  );
                })}
                <div style={{ display:"flex", justifyContent:"space-between", padding:"10px 12px", fontWeight:800, borderTop:"2px solid var(--border-subtle)", marginTop:4 }}>
                  <span>Total</span>
                  <span>₹{totalExpenses.toLocaleString("en-IN")}</span>
                </div>
              </div>
            </div>
          </section>
        )}

        {/* ── Vehicle-wise Expense Chart + Table ── */}
        {vehicleExpenses.length > 0 && (
          <section className="section">
            <div className="section-header"><h2 className="section-title">Vehicle-wise Expense Breakdown</h2></div>
            <div className="chart-card">
              <ResponsiveContainer width="100%" height={360}>
                <BarChart data={vehicleExpenses} margin={{ top:10, right:20, left:0, bottom:60 }}>
                  <XAxis dataKey="vehicle" angle={-30} textAnchor="end" height={70} tick={{ fontSize:11, fill:"#475569", fontFamily:"var(--font-body)" }} />
                  <YAxis tick={{ fontSize:11, fill:"#475569", fontFamily:"var(--font-body)" }} />
                  <Tooltip
                    contentStyle={{ background:"rgba(255,255,255,0.97)", border:"1px solid rgba(0,0,0,0.10)", borderRadius:14, fontFamily:"var(--font-body)", fontSize:12 }}
                    formatter={(v: any, name: any, props: any) => {
                      const rowTotal = EXPENSE_KEYS.reduce((s, k) => s + (Number(props.payload[k])||0), 0);
                      const pct = rowTotal > 0 ? ((Number(v)/rowTotal)*100).toFixed(1) : "0.0";
                      return [`₹${Number(v).toLocaleString("en-IN")} (${pct}%)`, name];
                    }}
                  />
                  <Legend wrapperStyle={{ fontFamily:"var(--font-body)", fontSize:11, paddingTop:8 }} />
                  {EXPENSE_KEYS.map((key, i) => (
                    <Bar key={key} dataKey={key} stackId="a" fill={EXPENSE_COLORS[i % EXPENSE_COLORS.length]} radius={i===EXPENSE_KEYS.length-1 ? [4,4,0,0] : [0,0,0,0]}>
                      {i === EXPENSE_KEYS.length-1 && (
                        <LabelList dataKey={key} position="top" content={(props: any) => {
                          const { x, y, width, index } = props;
                          const row = vehicleExpenses[index];
                          const rowTotal = EXPENSE_KEYS.reduce((s, k) => s + (Number(row?.[k])||0), 0);
                          const grandTotal = vehicleExpenses.reduce((s: number, v: any) => s + EXPENSE_KEYS.reduce((ss, k) => ss + (Number(v[k])||0), 0), 0);
                          const pct = (rowTotal > 0 && grandTotal > 0) ? ((rowTotal/grandTotal)*100).toFixed(1) : "0";
                          if (!rowTotal) return null;
                          return <text x={Number(x)+Number(width)/2} y={Number(y)-4} textAnchor="middle" fill="#475569" fontSize={10} fontWeight={700} fontFamily="var(--font-body)">{pct}%</text>;
                        }} />
                      )}
                    </Bar>
                  ))}
                </BarChart>
              </ResponsiveContainer>
            </div>
            {/* Expense detail table */}
            {(() => {
              const grandTotal = vehicleExpenses.reduce((sum: number, v: any) => sum + EXPENSE_KEYS.reduce((s, k) => s + (Number(v[k])||0), 0), 0);
              return grandTotal > 0 ? (
                <div style={{ marginTop:18, overflowX:"auto" }}>
                  <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
                    <thead>
                      <tr style={{ borderBottom:"2px solid var(--border-subtle)" }}>
                        <th style={{ padding:"8px 12px", textAlign:"left", fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase" }}>Vehicle</th>
                        {EXPENSE_KEYS.map(k => <th key={k} style={{ padding:"8px 10px", textAlign:"right", fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase" }}>{k}</th>)}
                        <th style={{ padding:"8px 12px", textAlign:"right", fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase" }}>Total</th>
                        <th style={{ padding:"8px 12px", textAlign:"right", fontSize:11, fontWeight:700, color:"var(--text-muted)", textTransform:"uppercase" }}>Share %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {vehicleExpenses.map((v: any, i: number) => {
                        const rowTotal = EXPENSE_KEYS.reduce((s, k) => s + (Number(v[k])||0), 0);
                        const pct = grandTotal > 0 ? ((rowTotal/grandTotal)*100).toFixed(1) : "0.0";
                        return (
                          <tr key={i} style={{ borderBottom:"1px solid var(--border-subtle)", background: i%2===0 ? "transparent" : "rgba(0,0,0,0.015)" }}>
                            <td style={{ padding:"9px 12px", fontWeight:600 }}>🚗 {v.vehicle}</td>
                            {EXPENSE_KEYS.map(k => {
                              const amt = Number(v[k])||0;
                              const expPct = rowTotal > 0 ? ((amt/rowTotal)*100).toFixed(1) : "0.0";
                              return (
                                <td key={k} style={{ padding:"9px 10px", textAlign:"right", color:"var(--text-secondary)" }}>
                                  ₹{amt.toLocaleString("en-IN")}
                                  {amt > 0 && <span style={{ display:"block", fontSize:10, color:"var(--text-muted)", fontWeight:600 }}>{expPct}%</span>}
                                </td>
                              );
                            })}
                            <td style={{ padding:"9px 12px", textAlign:"right", fontWeight:700 }}>₹{rowTotal.toLocaleString("en-IN")}</td>
                            <td style={{ padding:"9px 12px", textAlign:"right" }}>
                              <span style={{ background:"rgba(37,99,235,0.10)", color:"var(--accent-primary)", fontWeight:700, fontSize:12, padding:"2px 8px", borderRadius:6 }}>{pct}%</span>
                            </td>
                          </tr>
                        );
                      })}
                      <tr style={{ borderTop:"2px solid var(--border-subtle)", background:"rgba(37,99,235,0.03)" }}>
                        <td style={{ padding:"9px 12px", fontWeight:800 }}>Total</td>
                        {EXPENSE_KEYS.map(k => <td key={k} style={{ padding:"9px 10px", textAlign:"right", fontWeight:700 }}>₹{vehicleExpenses.reduce((s: number, v: any) => s + (Number(v[k])||0), 0).toLocaleString("en-IN")}</td>)}
                        <td style={{ padding:"9px 12px", textAlign:"right", fontWeight:800 }}>₹{grandTotal.toLocaleString("en-IN")}</td>
                        <td style={{ padding:"9px 12px", textAlign:"right", fontWeight:700 }}>100%</td>
                      </tr>
                    </tbody>
                  </table>
                </div>
              ) : null;
            })()}
          </section>
        )}

        {!loading && allTrips.length === 0 && (
          <div style={{ background:"var(--bg-card)", border:"1px solid var(--border-subtle)", borderRadius:14, padding:"48px 32px", textAlign:"center" }}>
            <p style={{ fontSize:32, marginBottom:12 }}>📅</p>
            <p style={{ color:"var(--text-secondary)", fontSize:15, marginBottom:6 }}>No data for selected range</p>
            <p style={{ color:"var(--text-muted)", fontSize:13 }}>Try adjusting the date filters above</p>
          </div>
        )}

      </div>
    </div>
  );
}
