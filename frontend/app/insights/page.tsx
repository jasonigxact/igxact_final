"use client";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/lib/toast";
import Navbar from "@/components/Navbar";
import { useSmoothRouter } from "@/components/UseSmoothRouter";
import { useEffect, useState } from "react";
import { BarChart, Bar, XAxis, YAxis, Tooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";

const COLORS = ['#4f8ef7', '#22d3a0', '#a78bfa', '#f97316', '#f87171'];
const axisProps = { stroke: "#475569", fontSize: 12, fontFamily: "var(--font-body)" };
const tooltipStyle = { background: "rgba(255,255,255,0.97)", border: "1px solid rgba(0,0,0,0.10)", borderRadius: 14, boxShadow: "0 8px 32px rgba(0,0,0,0.10)", fontFamily: "var(--font-body)", fontSize: 13 };

export default function InsightsPage() {
  const [data, setData]   = useState<any>(null);
  const [year, setYear]   = useState<number | null>(null);
  const [years, setYears] = useState<number[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token) { window.location.href = "/login"; return; }
  }, []);

  useEffect(() => {
    setLoading(true);
    setError(null);
    const path = year ? `/data?status=completed&year=${year}` : "/data?status=completed";
    apiFetch(path)
      .then(async res => {
        if (!res.ok) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err.detail || `Error ${res.status}`);
        }
        return res.json();
      })
      .then(res => { setData(res); setYears(res.years || []); setLoading(false); })
      .catch(err => { setError(err.message); setLoading(false); toast.error(err.message || "Failed to load insights"); });
  }, [year]);

  const insights = data?.insights || {};
  const extra    = data?.extra_insights || {};

  const insightItems = [
    { label: "Best Month",         value: insights.best_month },
    { label: "Top Customer",       value: insights.best_customer },
    { label: "Best Vehicle",       value: insights.best_vehicle },
    { label: "Best Route",         value: insights.best_route },
    { label: "Saturday Trips",     value: insights.sat_trips },
    { label: "Fuel Cost %",        value: insights.fuel_pct  != null ? `${insights.fuel_pct}%`  : null },
    { label: "Digital Payments %", value: insights.digital_pct != null ? `${insights.digital_pct}%` : null },
  ];

  return (
    <div className="page-root">
      <Navbar />
      <div className="page-content">

        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 32 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>Insights</h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Deep-dive analytics on completed trips</p>
          </div>
          <select className="input-field" style={{ width: "auto", padding: "8px 12px", fontSize: 13 }} value={year || ""} onChange={(e) => setYear(e.target.value ? Number(e.target.value) : null)}>
            <option value="">Latest year</option>
            {years.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>

        {loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, flexDirection: "column", gap: 14 }}>
            <div style={{ width: 36, height: 36, borderRadius: "50%", border: "3px solid rgba(37,99,235,0.12)", borderTopColor: "var(--accent-primary)", animation: "spin 0.7s linear infinite" }} />
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>Loading insights…</p>
            <style>{`@keyframes spin { to { transform: rotate(360deg); } }`}</style>
          </div>
        )}

        {error && !loading && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: 300, flexDirection: "column", gap: 16 }}>
            <p style={{ fontSize: 32 }}>⚠️</p>
            <p style={{ color: "var(--text-primary)", fontWeight: 600 }}>Failed to load insights</p>
            <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{error}</p>
            <button className="btn-primary" onClick={() => { setError(null); setLoading(true); setData(null); }}>Retry</button>
          </div>
        )}

        {!loading && !error && data && (
          <>
            <section className="section">
              <div style={{ background: "linear-gradient(135deg, rgba(37,99,235,0.08) 0%, rgba(124,58,237,0.06) 100%)", border: "1px solid rgba(37,99,235,0.12)", borderRadius: 20, padding: 24, marginBottom: 32 }}>
                <h2 className="section-title" style={{ marginBottom: 18 }}>Summary</h2>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 12 }}>
                  {insightItems.map((item, i) => (
                    <div key={i} style={{ background: "rgba(0,0,0,0.04)", border: "1px solid rgba(0,0,0,0.06)", borderRadius: 12, padding: "14px 16px" }}>
                      <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 600 }}>{item.label}</p>
                      <p style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 700, color: "var(--text-primary)" }}>{item.value ?? "—"}</p>
                    </div>
                  ))}
                </div>
              </div>
            </section>

            <section className="section">
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))", gap: 16 }}>
                <div className="chart-card">
                  <h2>Vehicle Revenue</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={extra.vehicle_deal || []}>
                      <XAxis dataKey="vehicle" {...axisProps} />
                      <YAxis {...axisProps} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="#4f8ef7" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h2>Profit Per Day (by Vehicle)</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={extra.vehicle_profit_per_day || []}>
                      <XAxis dataKey="vehicle" {...axisProps} />
                      <YAxis {...axisProps} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="#22d3a0" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
                <div className="chart-card">
                  <h2>Parking Cost Per Day</h2>
                  <ResponsiveContainer width="100%" height={280}>
                    <BarChart data={extra.parking_per_day || []}>
                      <XAxis dataKey="vehicle" {...axisProps} />
                      <YAxis {...axisProps} />
                      <Tooltip contentStyle={tooltipStyle} />
                      <Bar dataKey="value" fill="#f97316" radius={[6,6,0,0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </div>
            </section>

            <section className="section">
              <div className="chart-card">
                <h2>Profit by Trip Duration (days)</h2>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={extra.profit_by_duration || []}>
                    <XAxis dataKey="days" {...axisProps} />
                    <YAxis {...axisProps} />
                    <Tooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="profit" radius={[6,6,0,0]}>
                      {(extra.profit_by_duration || []).map((_: any, i: number) => (
                        <Cell key={i} fill={COLORS[i % COLORS.length]} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </section>
          </>
        )}
      </div>
    </div>
  );
}
