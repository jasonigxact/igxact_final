"use client";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/lib/toast";
import Navbar from "@/components/Navbar";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { useSmoothRouter } from "@/components/UseSmoothRouter";
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, Legend, Line,
  ResponsiveContainer, LabelList, PieChart, Pie, Cell
} from "recharts";

const COST_COLORS    = ["#4f8ef7","#22d3a0","#a78bfa","#f97316","#f87171","#e11d48"];
const PAYMENT_COLORS = ["#f97316","#4f8ef7"];

const tooltipStyle = {
  background: "rgba(255,255,255,0.88)",
  border: "1px solid rgba(255,255,255,0.95)",
  borderRadius: 14,
  boxShadow: "0 8px 32px rgba(100,120,180,0.18), 0 2px 0 rgba(255,255,255,0.95) inset",
  backdropFilter: "blur(20px) saturate(180%)",
  fontFamily: "var(--font-body)",
  fontSize: 13,
  color: "var(--text-primary)",
};

const axisProps = { stroke: "#94a3b8", fontSize: 12, fontFamily: "var(--font-body)" };

/* ── Spinner ──────────────────────────────────────────────────────────────── */
const Spinner = () => (
  <div style={{
    width: 36, height: 36, borderRadius: "50%",
    border: "3px solid rgba(37,99,235,0.12)",
    borderTopColor: "var(--accent-primary)",
    animation: "spin 0.8s linear infinite",
  }} />
);

/* ── TripCard ─────────────────────────────────────────────────────────────── */
const TripCard = ({ trip, onClick }: any) => {
  const pending = trip["Pending"];
  const pct = trip["Deal Price"] ? Math.round((trip["Received"] / trip["Deal Price"]) * 100) : 0;
  return (
    <div className="trip-card" onClick={onClick} style={{ cursor: "pointer" }}>
      <div style={{ marginBottom: 8 }}>
        <p style={{ fontSize: 13, fontWeight: 600 }}>#{trip["trip id"]} • {trip["Customer Name"]}</p>
        <p style={{ fontSize: 11, color: "var(--text-muted)" }}>📞 {trip["Cust. Contact Number"]}</p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 10 }}>
        <div>
          <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>
            {trip["Trip From"]} → {trip["Trip TO"]}
          </p>
          <p style={{ fontSize: 12, color: "var(--text-muted)", marginTop: 2 }}>
            {trip["Start Date"]} – {trip["End date"]}
          </p>
        </div>
        <span className="pill pill-blue" style={{ fontSize: 11 }}>{trip["Vehicle Details"]}</span>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginBottom: 12 }}>
        <div style={{ background: "rgba(241,245,249,0.70)", backdropFilter: "blur(8px)", borderRadius: 8, padding: "8px 10px", border: "1px solid rgba(255,255,255,0.80)" }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Deal</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--text-primary)" }}>₹{(trip["Deal Price"] || 0).toLocaleString("en-IN")}</p>
        </div>
        <div style={{ background: "rgba(209,250,229,0.55)", backdropFilter: "blur(8px)", borderRadius: 8, padding: "8px 10px", border: "1px solid rgba(52,211,153,0.28)" }}>
          <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 2 }}>Received</p>
          <p style={{ fontSize: 15, fontWeight: 700, color: "var(--accent-green)" }}>₹{(trip["Received"] || 0).toLocaleString("en-IN")}</p>
        </div>
      </div>
      {Number(pending) > 0 && (
        <p style={{ fontSize: 12, color: "var(--accent-red)" }}>Pending: ₹{Number(pending).toLocaleString("en-IN")}</p>
      )}
      <div className="progress-bar" style={{ marginTop: 8 }}>
        <div className="progress-fill" style={{ width: `${pct}%`, background: pct === 100 ? "var(--accent-green)" : undefined }} />
      </div>
      <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>{pct}% received</p>
    </div>
  );
};

/* ── KpiCard ──────────────────────────────────────────────────────────────── */
const KpiCard = ({ label, value, accent, icon }: { label: string; value: string | number; accent?: string; icon?: string }) => (
  <div className="kpi-card">
    {icon && <span style={{ fontSize: 20, marginBottom: 10, display: "block" }}>{icon}</span>}
    <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>{label}</p>
    <p style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: accent || "var(--text-primary)", letterSpacing: "-0.03em" }}>{value}</p>
  </div>
);

/* ── Custom Tooltip ───────────────────────────────────────────────────────── */
const GlassTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: "rgba(255,255,255,0.88)",
      border: "1px solid rgba(255,255,255,0.95)",
      borderRadius: 14,
      boxShadow: "0 8px 32px rgba(100,120,180,0.18), 0 2px 0 rgba(255,255,255,0.95) inset",
      backdropFilter: "blur(20px) saturate(180%)",
      padding: "10px 14px",
      fontFamily: "var(--font-body)",
      fontSize: 13,
    }}>
      <p style={{ fontWeight: 700, marginBottom: 6, color: "var(--text-primary)" }}>{label}</p>
      {payload.map((p: any, i: number) => (
        <p key={i} style={{ color: p.color, margin: "2px 0" }}>
          {p.name}: <strong>{typeof p.value === "number" ? `₹${p.value.toLocaleString("en-IN")}` : p.value}</strong>
        </p>
      ))}
    </div>
  );
};

/* ════════════════════════════════════════════════════════════════════════════ */
export default function Home() {
  const [year, setYear]             = useState<number | null>(null);
  const [years, setYears]           = useState<number[]>([]);
  const [data, setData]             = useState<any>(null);
  const [loading, setLoading]       = useState(true);
  const [error, setError]           = useState<string | null>(null);
  const [selectedTrip, setSelectedTrip] = useState<any>(null);
  const [showTargetModal, setShowTargetModal] = useState(false);
  const [targetYear, setTargetYear]           = useState(new Date().getFullYear());
  const [allTargets, setAllTargets]           = useState<any[]>([]);
  const [savingTarget, setSavingTarget]       = useState(false);
  const [role]                                = useState(() => typeof window !== "undefined" ? (sessionStorage.getItem("role") || "").toLowerCase() : "");
  const { push } = useSmoothRouter();
  const router = useRouter();

  useEffect(() => {
    const token = sessionStorage.getItem("token");
    if (!token || token === "undefined" || token === "null") {
      sessionStorage.removeItem("token");
      window.location.href = "/login";
      return;
    }
    setLoading(true); setError(null);
    const path = year === -1 ? "/data?year=all" : year ? `/data?year=${year}` : "/data";
    apiFetch(path)
      .then(async (res) => {
        if (!res.ok) { const err = await res.json().catch(() => ({})); throw new Error(err.detail || `Server error (${res.status})`); }
        return res.json();
      })
      .then((res) => { setData(res); setYears(res.years || []); setLoading(false); })
      .catch((err) => { setError(err.message || "Failed to load dashboard"); setLoading(false); toast.error(err.message); });
  }, [year]);

  if (loading) return (
    <div className="page-root">
      <Navbar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)", flexDirection: "column", gap: 16 }}>
        <Spinner />
        <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Loading dashboard…</p>
      </div>
    </div>
  );

  if (error) return (
    <div className="page-root">
      <Navbar />
      <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "calc(100vh - 64px)", flexDirection: "column", gap: 16 }}>
        <p style={{ fontSize: 32 }}>⚠️</p>
        <p style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 600 }}>Could not load dashboard</p>
        <p style={{ color: "var(--text-muted)", fontSize: 13 }}>{error}</p>
        <button className="btn-primary" style={{ marginTop: 8 }} onClick={() => { setError(null); setLoading(true); setData(null); }}>Retry</button>
      </div>
    </div>
  );

  const kpi           = data?.kpi || {};
  const otherExpenses = (data?.cost_breakdown || []).find((c: any) => c.name === "Other Expenses")?.value || 0;
  const insights      = data?.insights || {};
  const monthTargets  = data?.month_targets || [];

  const fetchTargets = async (_yr?: number) => {
    try {
      const res = await apiFetch("/vehicles/targets");
      const d = await res.json();
      setAllTargets(d.vehicles || []);
    } catch {}
  };

  const saveTarget = async (vehicleName: string, amount: number) => {
    setSavingTarget(true);
    try {
      const res = await apiFetch(`/vehicles/${encodeURIComponent(vehicleName)}/target`, {
        method: "PUT",
        body: JSON.stringify({ target: amount }),
      });
      if (!res.ok) { const d = await res.json(); toast.error(d.detail); return; }
      toast.success(`Target saved for ${vehicleName}!`);
      fetchTargets();
    } catch (e: any) { toast.error(e.message); }
    finally { setSavingTarget(false); }
  };
  const sortByDate = (trips: any[]) => [...trips].sort((a, b) => {
    const da = a["Start Date"] ? new Date(a["Start Date"]).getTime() : 0;
    const db = b["Start Date"] ? new Date(b["Start Date"]).getTime() : 0;
    return da - db;
  });
  const progressTrips = sortByDate(data?.pipeline?.progress || []);
  const bookedTrips   = sortByDate(data?.pipeline?.booked   || []);
  const doneTrips     = data?.pipeline?.done     || [];
  const progressTotal    = progressTrips.reduce((a: number, b: any) => a + (b["Deal Price"] || 0), 0);
  const progressReceived = progressTrips.reduce((a: number, b: any) => a + (b["Received"]   || 0), 0);
  const bookedTotal      = bookedTrips.reduce((a: number, b: any) => a + (b["Deal Price"] || 0), 0);
  const bookedReceived   = bookedTrips.reduce((a: number, b: any) => a + (b["Received"]   || 0), 0);
  const doneTotal        = doneTrips.reduce((a: number, b: any) => a + (b["Deal Price"] || 0), 0);
  const doneReceived     = doneTrips.reduce((a: number, b: any) => a + (b["Received"]   || 0), 0);
  const formatTrips  = (v: any) => `${v ?? 0} trips`;

  return (
    <div className="page-root">
      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes fadeUp { from { opacity:0; transform:translateY(12px); } to { opacity:1; transform:translateY(0); } }
        .fade-up { animation: fadeUp 0.4s cubic-bezier(0.4,0,0.2,1) both; }
        .chart-glass-wrap {
          background: rgba(255,255,255,0.72);
          backdrop-filter: blur(24px) saturate(200%) brightness(1.04);
          -webkit-backdrop-filter: blur(24px) saturate(200%) brightness(1.04);
          border: 1px solid rgba(255,255,255,0.82);
          border-radius: 22px;
          box-shadow: 0 2px 0 rgba(255,255,255,0.95) inset,
                      0 8px 40px rgba(100,120,180,0.14),
                      0 1px 2px rgba(148,163,184,0.18);
          padding: 28px;
          position: relative;
          overflow: hidden;
          transition: transform 0.28s ease, box-shadow 0.28s ease, border-color 0.28s ease;
        }
        .chart-glass-wrap::before {
          content: '';
          position: absolute; inset: 0;
          background: linear-gradient(135deg, rgba(255,255,255,0.42) 0%, rgba(219,234,254,0.16) 50%, rgba(255,255,255,0.06) 100%);
          pointer-events: none; border-radius: inherit;
        }
        .chart-glass-wrap:hover {
          transform: translateY(-2px);
          border-color: rgba(255,255,255,0.96);
          box-shadow: 0 2px 0 rgba(255,255,255,0.95) inset,
                      0 16px 48px rgba(100,120,180,0.18),
                      0 0 0 1px rgba(37,99,235,0.14);
        }
        .chart-label {
          font-size: 12px; font-weight: 700; color: var(--text-muted);
          letter-spacing: 0.08em; text-transform: uppercase;
          font-family: var(--font-body); margin-bottom: 22px;
          position: relative; display: block;
        }
        .insight-chip {
          background: rgba(255,255,255,0.60);
          backdrop-filter: blur(12px);
          -webkit-backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.85);
          border-radius: 14px; padding: 14px 16px;
          box-shadow: 0 2px 0 rgba(255,255,255,0.90) inset, 0 4px 12px rgba(100,120,180,0.10);
          transition: transform 0.22s ease, box-shadow 0.22s ease;
        }
        .insight-chip:hover { transform: translateY(-2px); box-shadow: 0 2px 0 rgba(255,255,255,0.95) inset, 0 8px 24px rgba(100,120,180,0.16); }
        .modal-glass-overlay {
          position: fixed; inset: 0;
          background: rgba(186,210,240,0.28);
          backdrop-filter: blur(14px) saturate(160%);
          -webkit-backdrop-filter: blur(14px) saturate(160%);
          display: flex; align-items: center; justify-content: center;
          z-index: 999; padding: 16px;
        }
        .modal-glass-box {
          background: rgba(255,255,255,0.84);
          backdrop-filter: blur(32px) saturate(200%) brightness(1.05);
          -webkit-backdrop-filter: blur(32px) saturate(200%) brightness(1.05);
          border: 1px solid rgba(255,255,255,0.96);
          border-radius: 28px;
          box-shadow: 0 24px 80px rgba(100,120,200,0.18), 0 2px 0 rgba(255,255,255,1) inset;
          width: 95%; max-width: 680px; max-height: 90vh; overflow-y: auto;
          padding: 28px;
        }
        .modal-section {
          background: rgba(241,245,249,0.60);
          backdrop-filter: blur(8px);
          border: 1px solid rgba(255,255,255,0.80);
          border-radius: 14px; padding: 16px 18px; margin-bottom: 14px;
        }
        .empty-glass {
          background: rgba(255,255,255,0.55);
          backdrop-filter: blur(12px);
          border: 1px solid rgba(255,255,255,0.80);
          border-radius: 16px; padding: 36px;
          text-align: center; color: var(--text-muted); font-size: 14px;
        }
        .section-summary-badge {
          display: flex; gap: 16px; font-size: 13px;
        }
      `}</style>

      <Navbar />
      <div className="page-content">

        {/* ── Header ─────────────────────────────────────────────────────── */}
        <div className="fade-up" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 36, flexWrap: "wrap", gap: 14 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 30, fontWeight: 800, letterSpacing: "-0.03em", marginBottom: 4 }}>
              Dashboard
            </h1>
            <p style={{ color: "var(--text-muted)", fontSize: 14 }}>Your travel business at a glance</p>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <select
              className="input-field"
              style={{ width: "auto", padding: "8px 14px", fontSize: 13 }}
              value={year || ""}
              onChange={(e) => setYear(e.target.value === "all" ? -1 : e.target.value ? Number(e.target.value) : null)}
            >
              <option value="">Latest Year {data?.active_year && !data?.selected_year ? `(${data.active_year})` : ""}</option>
              <option value="all">All Years</option>
              {years.map((y) => <option key={y} value={y}>{y}</option>)}
            </select>
            <button className="btn-ghost" style={{ fontSize: 13 }} onClick={() => push("/insights")}>View insights →</button>
            <button className="btn-ghost" style={{ fontSize: 13, padding: "7px 12px" }} onClick={() => router.push("/change-password")} title="Settings">⚙️</button>
          </div>
        </div>

        {/* ── KPI Grid ───────────────────────────────────────────────────── */}
        <section className="section fade-up" style={{ animationDelay: "0.05s" }}>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(190px, 1fr))", gap: 14 }}>
            <KpiCard label="All-Time Total Deal" value={`₹${(data?.overall?.total_deal || 0).toLocaleString("en-IN")}`} accent="#7c3aed" icon="🌐" />
            <KpiCard label={`${data?.active_year || new Date().getFullYear()} Total Deal`} value={`₹${(data?.overall?.current_year_deal || 0).toLocaleString("en-IN")}`} accent="#0ea5e9" icon="📆" />
            <KpiCard label="Total Revenue"  value={`₹${(kpi.total_revenue || 0).toLocaleString("en-IN")}`} accent="var(--accent-primary)" icon="💰" />
            <KpiCard label="Total Profit"   value={`₹${(kpi.total_profit  || 0).toLocaleString("en-IN")}`} accent="var(--accent-green)"   icon="📈" />
            <KpiCard label="Other Expenses" value={`₹${otherExpenses.toLocaleString("en-IN")}`}            accent="#f43f5e"               icon="📉" />
            <KpiCard label="Avg Margin"     value={`${kpi.avg_margin ?? 0}%`}                                                              icon="🎯" />
            <KpiCard label="Avg Deal Size"  value={`₹${(kpi.avg_deal  || 0).toLocaleString("en-IN")}`}                                    icon="🤝" />
            <KpiCard label="Avg Duration"   value={`${kpi.avg_days ?? 0} days`}                                                            icon="🗓️" />
            <KpiCard label="Cash Collected" value={`₹${(kpi.cash_total || 0).toLocaleString("en-IN")}`} accent="var(--accent-orange)"     icon="💵" />
            <KpiCard label="Bank Collected" value={`₹${(kpi.bank_total || 0).toLocaleString("en-IN")}`} accent="var(--accent-purple)"     icon="🏦" />
          </div>
        </section>

        {/* ── Monthly Targets ─────────────────────────────────────────────── */}
        {monthTargets.length > 0 && (
          <section className="section fade-up" style={{ animationDelay: "0.10s" }}>
            <div className="section-header" style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
              <div>
                <h2 className="section-title">Monthly Targets</h2>
                <p className="section-subtitle">Track performance against your revenue goals</p>
              </div>
              {role === "admin" && (
                <button onClick={() => { fetchTargets(targetYear); setShowTargetModal(true); }} style={{
                  background:"rgba(37,99,235,0.1)", border:"1px solid rgba(37,99,235,0.2)",
                  borderRadius:10, padding:"7px 16px", cursor:"pointer",
                  fontSize:13, color:"var(--accent-primary)", fontWeight:600,
                }}>⚙️ Set Targets</button>
              )}
            </div>
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {monthTargets.map((m: any, i: number) => {
                const effectiveRevenue = m.revenue_excl_cancelled ?? m.revenue;
                const remaining = Math.max(m.target - effectiveRevenue, 0);
                const pct = m.target ? (effectiveRevenue / m.target) * 100 : 0;
                const isGreen = m.status === "green";
                return (
                  <div key={i} className={`target-card ${isGreen ? "green" : "red"}`}>
                    <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>{m.month}</p>
                    <p style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, color: isGreen ? "var(--accent-green)" : "var(--accent-red)" }}>
                      ₹{effectiveRevenue.toLocaleString("en-IN")}
                    </p>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>{m.trips} trips</p>
                    <p style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 4 }}>Target: ₹{m.target.toLocaleString("en-IN")}</p>
                    {remaining === 0
                      ? <p style={{ fontSize: 11, color: "var(--accent-green)", marginTop: 4, fontWeight: 600 }}>✓ Achieved</p>
                      : <p style={{ fontSize: 11, color: "var(--accent-orange)", marginTop: 4 }}>₹{remaining.toLocaleString("en-IN")} left</p>
                    }
                    <div className="progress-bar">
                      <div className="progress-fill" style={{ width: `${Math.min(pct, 100)}%`, background: isGreen ? "var(--accent-green)" : "linear-gradient(90deg,#f87171,#ef4444)" }} />
                    </div>
                    <p style={{ fontSize: 10, color: "var(--text-muted)", marginTop: 3 }}>{pct.toFixed(0)}%</p>
                  </div>
                );
              })}
            </div>
          </section>
        )}

        {/* ── In Progress ─────────────────────────────────────────────────── */}
        <section className="section fade-up" style={{ animationDelay: "0.15s" }}>
          <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h2 className="section-title">In Progress</h2>
              <p className="section-subtitle">{progressTrips.length} active trip{progressTrips.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="section-summary-badge">
              <span style={{ color: "var(--text-muted)" }}>Deal: <strong style={{ color: "var(--text-primary)" }}>₹{progressTotal.toLocaleString("en-IN")}</strong></span>
              <span style={{ color: "var(--text-muted)" }}>Received: <strong style={{ color: "var(--accent-green)" }}>₹{progressReceived.toLocaleString("en-IN")}</strong></span>
            </div>
          </div>
          {progressTrips.length === 0
            ? <div className="empty-glass">No active trips</div>
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
                {progressTrips.map((trip: any, i: number) => <TripCard key={i} trip={trip} onClick={() => setSelectedTrip(trip)} />)}
              </div>
          }
        </section>

        {/* ── Booked Trips ────────────────────────────────────────────────── */}
        <section className="section fade-up" style={{ animationDelay: "0.18s" }}>
          <div className="section-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end" }}>
            <div>
              <h2 className="section-title">Booked Trips</h2>
              <p className="section-subtitle">{bookedTrips.length} upcoming trip{bookedTrips.length !== 1 ? "s" : ""}</p>
            </div>
            <div className="section-summary-badge">
              <span style={{ color: "var(--text-muted)" }}>Deal: <strong style={{ color: "var(--text-primary)" }}>₹{bookedTotal.toLocaleString("en-IN")}</strong></span>
              <span style={{ color: "var(--text-muted)" }}>Received: <strong style={{ color: "var(--accent-green)" }}>₹{bookedReceived.toLocaleString("en-IN")}</strong></span>
            </div>
          </div>
          {bookedTrips.length === 0
            ? <div className="empty-glass">No booked trips</div>
            : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(280px, 1fr))", gap: 14, maxHeight: 420, overflowY: "auto", paddingRight: 4 }}>
                {bookedTrips.map((trip: any, i: number) => <TripCard key={i} trip={trip} onClick={() => setSelectedTrip(trip)} />)}
              </div>
          }
        </section>

        <div className="pipeline-section crm-fade" style={{ marginTop: 24 }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div>
              <h2 className="section-title" style={{ color:"#8b5cf6" }}>🏁 Done</h2>
              <p className="section-subtitle">{doneTrips.length} trip{doneTrips.length !== 1 ? "s" : ""} awaiting expenses</p>
            </div>
            <div style={{ display:"flex", gap:16, fontSize:13 }}>
              <span style={{ color:"var(--text-muted)" }}>Deal: <strong style={{ color:"var(--text-primary)" }}>₹{doneTotal.toLocaleString("en-IN")}</strong></span>
              <span style={{ color:"var(--text-muted)" }}>Received: <strong style={{ color:"var(--accent-green)" }}>₹{doneReceived.toLocaleString("en-IN")}</strong></span>
            </div>
          </div>
          {doneTrips.length === 0
            ? <div className="empty-glass" style={{ fontSize:13 }}>No done trips</div>
            : <div className="trip-grid">
                {doneTrips.map((trip: any, i: number) => <TripCard key={i} trip={trip} onClick={() => setSelectedTrip(trip)} />)}
              </div>
          }
        </div>

        {/* ── Revenue & Profit chart ──────────────────────────────────────── */}
        <section className="section fade-up" style={{ animationDelay: "0.20s" }}>
          <div className="section-header"><h2 className="section-title">Revenue & Profit</h2></div>
          <div className="chart-glass-wrap">
            <span className="chart-label">Monthly Revenue &amp; Profit</span>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={data.monthly}>
                <defs>
                  <linearGradient id="gradRev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#4f8ef7" stopOpacity={0.92} />
                    <stop offset="100%" stopColor="#4f8ef7" stopOpacity={0.28} />
                  </linearGradient>
                  <linearGradient id="gradProfit" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%"   stopColor="#22d3a0" stopOpacity={0.92} />
                    <stop offset="100%" stopColor="#22d3a0" stopOpacity={0.28} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="Month" {...axisProps} />
                <YAxis {...axisProps} />
                <Tooltip content={<GlassTooltip />} />
                <Legend wrapperStyle={{ fontFamily: "var(--font-body)", fontSize: 12 }} />
                <Bar dataKey="Revenue"   fill="url(#gradRev)"    radius={[7,7,0,0]} />
                <Bar dataKey="NetProfit" fill="url(#gradProfit)" radius={[7,7,0,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Vehicle charts ──────────────────────────────────────────────── */}
        <section className="section fade-up" style={{ animationDelay: "0.22s" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="chart-glass-wrap">
              <span className="chart-label">Revenue by Vehicle</span>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.vehicle}>
                  <defs>
                    <linearGradient id="gradVeh" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#4f8ef7" stopOpacity={0.90} />
                      <stop offset="100%" stopColor="#4f8ef7" stopOpacity={0.25} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="Vehicle Details" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<GlassTooltip />} />
                  <Bar dataKey="TotalRevenue" fill="url(#gradVeh)" radius={[7,7,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-glass-wrap">
              <span className="chart-label">Avg Margin by Vehicle</span>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.vehicle}>
                  <defs>
                    <linearGradient id="gradMargin" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#a78bfa" stopOpacity={0.90} />
                      <stop offset="100%" stopColor="#a78bfa" stopOpacity={0.25} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="Vehicle Details" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<GlassTooltip />} />
                  <Bar dataKey="AvgMargin" fill="url(#gradMargin)" radius={[7,7,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ── Top Customers ───────────────────────────────────────────────── */}
        <section className="section fade-up" style={{ animationDelay: "0.24s" }}>
          <div className="chart-glass-wrap">
            <span className="chart-label">Top 10 Customers</span>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={data.top_customers} layout="vertical">
                <defs>
                  <linearGradient id="gradCust" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="#4f8ef7" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="#4f8ef7" stopOpacity={0.90} />
                  </linearGradient>
                </defs>
                <XAxis type="number" {...axisProps} />
                <YAxis dataKey="Customer" type="category" width={160} {...axisProps} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="Revenue" fill="url(#gradCust)" radius={[0,7,7,0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Top Routes ──────────────────────────────────────────────────── */}
        <section className="section fade-up" style={{ animationDelay: "0.26s" }}>
          <div className="chart-glass-wrap">
            <span className="chart-label">Top 10 Routes</span>
            <ResponsiveContainer width="100%" height={380}>
              <BarChart data={[...data.routes].reverse()} layout="vertical">
                <defs>
                  <linearGradient id="gradRoute" x1="0" y1="0" x2="1" y2="0">
                    <stop offset="0%"   stopColor="#f97316" stopOpacity={0.30} />
                    <stop offset="100%" stopColor="#f97316" stopOpacity={0.90} />
                  </linearGradient>
                </defs>
                <XAxis type="number" {...axisProps} />
                <YAxis dataKey="Route" type="category" width={200} {...axisProps} />
                <Tooltip content={<GlassTooltip />} />
                <Bar dataKey="TotalRevenue" fill="url(#gradRoute)" radius={[0,7,7,0]}>
                  <LabelList dataKey="TripCount" position="right" formatter={formatTrips} style={{ fontSize: 11, fill: "var(--text-muted)" }} />
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </section>

        {/* ── Pie charts ──────────────────────────────────────────────────── */}
        <section className="section fade-up" style={{ animationDelay: "0.28s" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="chart-glass-wrap">
              <span className="chart-label">Cost Mix</span>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.cost_breakdown} dataKey="value" nameKey="name" outerRadius={95} innerRadius={48} paddingAngle={3} label={(e: any) => `${e.percent}%`}>
                    {data.cost_breakdown.map((_: any, i: number) => <Cell key={i} fill={COST_COLORS[i % COST_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<GlassTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: "var(--font-body)", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-glass-wrap">
              <span className="chart-label">Revenue Breakdown</span>
              <ResponsiveContainer width="100%" height={280}>
                <PieChart>
                  <Pie data={data.revenue_breakdown || []} dataKey="value" nameKey="name" outerRadius={95} innerRadius={48} paddingAngle={3} label={(e: any) => `${(e.percent * 100).toFixed(0)}%`}>
                    {(data.revenue_breakdown || []).map((_: any, i: number) => <Cell key={i} fill={COST_COLORS[i % COST_COLORS.length]} />)}
                  </Pie>
                  <Tooltip content={<GlassTooltip />} formatter={(v: any) => `₹${(v ?? 0).toLocaleString("en-IN")}`} />
                  <Legend wrapperStyle={{ fontFamily: "var(--font-body)", fontSize: 12 }} />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ── Duration & Day of Week ──────────────────────────────────────── */}
        <section className="section fade-up" style={{ animationDelay: "0.30s" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="chart-glass-wrap">
              <span className="chart-label">Trip Duration Distribution</span>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.duration_dist}>
                  <defs>
                    <linearGradient id="gradDur" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%"   stopColor="#4f8ef7" stopOpacity={0.90} />
                      <stop offset="100%" stopColor="#4f8ef7" stopOpacity={0.25} />
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="days" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<GlassTooltip />} />
                  <Bar dataKey="trips" fill="url(#gradDur)" radius={[7,7,0,0]}>
                    <LabelList dataKey="trips" position="top" style={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-glass-wrap">
              <span className="chart-label">Departures by Day of Week</span>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.day_of_week}>
                  <XAxis dataKey="day" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<GlassTooltip />} />
                  <Bar dataKey="trips" radius={[7,7,0,0]}>
                    {(data.day_of_week || []).map((e: any, i: number) => (
                      <Cell key={i} fill={e.day === "Saturday" ? "#f97316" : "#4f8ef7"} fillOpacity={0.80} />
                    ))}
                    <LabelList dataKey="trips" position="top" style={{ fontSize: 11, fill: "var(--text-muted)" }} />
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ── Monthly Cost & Payments ─────────────────────────────────────── */}
        <section className="section fade-up" style={{ animationDelay: "0.32s" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
            <div className="chart-glass-wrap">
              <span className="chart-label">Monthly Cost Breakdown</span>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.monthly_cost}>
                  <XAxis dataKey="MonthNum" {...axisProps} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<GlassTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: "var(--font-body)", fontSize: 12 }} />
                  <Bar dataKey="Fuel"             stackId="a" fill="#4f8ef7" fillOpacity={0.85} />
                  <Bar dataKey="Tolls & Taxes"    stackId="a" fill="#22d3a0" fillOpacity={0.85} />
                  <Bar dataKey="Parking"          stackId="a" fill="#a78bfa" fillOpacity={0.85} />
                  <Bar dataKey="Driver Allowance" stackId="a" fill="#f97316" fillOpacity={0.85} />
                  <Bar dataKey="Sales Commission" stackId="a" fill="#f87171" fillOpacity={0.85} />
                  <Bar dataKey="Other Expenses"   stackId="a" fill="#e11d48" fillOpacity={0.85} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
            <div className="chart-glass-wrap">
              <span className="chart-label">Monthly Cash vs Bank</span>
              <ResponsiveContainer width="100%" height={280}>
                <BarChart data={data.monthly_payment || []}>
                  <XAxis dataKey="MonthNum" {...axisProps} tickFormatter={(v: any) => ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"][v-1]} />
                  <YAxis {...axisProps} />
                  <Tooltip content={<GlassTooltip />} />
                  <Legend wrapperStyle={{ fontFamily: "var(--font-body)", fontSize: 12 }} />
                  <Bar dataKey="Cash" stackId="a" fill="#f97316" fillOpacity={0.85} />
                  <Bar dataKey="Bank" stackId="a" fill="#4f8ef7" fillOpacity={0.85} radius={[4,4,0,0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </section>

        {/* ── Key Insights ────────────────────────────────────────────────── */}
        <section className="section fade-up" style={{ animationDelay: "0.34s" }}>
          <div className="section-header">
            <h2 className="section-title">Key Insights</h2>
          </div>
          <div style={{
            background: "rgba(255,255,255,0.55)",
            backdropFilter: "blur(20px) saturate(180%)",
            WebkitBackdropFilter: "blur(20px) saturate(180%)",
            border: "1px solid rgba(255,255,255,0.85)",
            borderRadius: 22,
            padding: 24,
            boxShadow: "0 2px 0 rgba(255,255,255,0.95) inset, 0 8px 40px rgba(100,120,180,0.12)",
          }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))", gap: 12 }}>
              {[
                { label: "Best Month",         value: insights.best_month,    icon: "🏆" },
                { label: "Top Customer",       value: insights.best_customer, icon: "👑" },
                { label: "Best Vehicle",       value: insights.best_vehicle,  icon: "🚗" },
                { label: "Best Route",         value: insights.best_route,    icon: "🗺️" },
                { label: "Saturday Trips",     value: insights.sat_trips,     icon: "📅" },
                { label: "Fuel Cost %",        value: `${insights.fuel_pct}%`,icon: "⛽" },
                { label: "Digital Payments %", value: `${insights.digital_pct}%`, icon: "💳" },
              ].map((item, i) => (
                <div key={i} className="insight-chip">
                  <p style={{ fontSize: 18, marginBottom: 6 }}>{item.icon}</p>
                  <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 5, textTransform: "uppercase", letterSpacing: "0.07em", fontWeight: 700 }}>{item.label}</p>
                  <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 700, color: "var(--text-primary)" }}>{item.value || "—"}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

      </div>

      {/* ── Trip Detail Modal ────────────────────────────────────────────── */}
      {selectedTrip && (
        <div className="modal-glass-overlay" onClick={() => setSelectedTrip(null)}>
          <div className="modal-glass-box" onClick={(e) => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontSize: 20 }}>Trip #{selectedTrip["trip id"]}</h2>
              <button className="btn-ghost" style={{ padding: "4px 12px", fontSize: 14 }} onClick={() => setSelectedTrip(null)}>✕</button>
            </div>

            <div className="modal-section">
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Customer</p>
              <p style={{ fontWeight: 600, fontSize: 15 }}>{selectedTrip["Customer Name"]}</p>
              <p style={{ color: "var(--text-muted)", fontSize: 13 }}>📞 {selectedTrip["Cust. Contact Number"]}</p>
            </div>

            <div className="modal-section">
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Trip Details</p>
              <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 16 }}>{selectedTrip["Trip From"]} → {selectedTrip["Trip TO"]}</p>
              <p style={{ color: "var(--text-muted)", fontSize: 13, marginTop: 4 }}>{selectedTrip["Start Date"]} → {selectedTrip["End date"]}</p>
              <span className="pill pill-blue" style={{ fontSize: 11, marginTop: 8, display: "inline-flex" }}>{selectedTrip["Vehicle Details"]}</span>
            </div>

            <div className="modal-section">
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Financial</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }}>
                {[
                  { label: "Deal", value: selectedTrip["Deal Price"], color: "var(--text-primary)" },
                  { label: "Received", value: selectedTrip["Received"], color: "var(--accent-green)" },
                  { label: "Pending", value: selectedTrip["Pending"], color: "var(--accent-red)" },
                ].map((f, i) => (
                  <div key={i} style={{ background: "rgba(255,255,255,0.65)", border: "1px solid rgba(255,255,255,0.85)", borderRadius: 10, padding: "10px 12px" }}>
                    <p style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 3 }}>{f.label}</p>
                    <p style={{ fontFamily: "var(--font-display)", fontWeight: 700, fontSize: 15, color: f.color }}>₹{(f.value || 0).toLocaleString("en-IN")}</p>
                  </div>
                ))}
              </div>
            </div>

            <div className="modal-section" style={{ marginBottom: 0 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Cost Breakdown</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                {[
                  ["Fuel", selectedTrip["Fuel"]],
                  ["Tolls & Taxes", selectedTrip["Tolls & Taxes"]],
                  ["Parking", selectedTrip["Parking"]],
                  ["Driver Allowance", selectedTrip["Driver Allowance"]],
                  ["Sales Commission", selectedTrip["Sales Commission"]],
                  ["Other Expenses", selectedTrip["Other Expenses"]],
                ].map(([label, val], i) => (
                  <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 13, padding: "6px 0", borderBottom: "1px solid rgba(148,163,184,0.12)" }}>
                    <span style={{ color: "var(--text-muted)" }}>{label}</span>
                    <strong>₹{((val as number) || 0).toLocaleString("en-IN")}</strong>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

      )}

      {/* ── Set Targets Modal ───────────────────────────────────────────── */}
      {showTargetModal && (
        <div onClick={() => setShowTargetModal(false)} style={{
          position:"fixed", inset:0, background:"rgba(0,0,0,0.45)",
          backdropFilter:"blur(6px)", zIndex:1000,
          display:"flex", alignItems:"center", justifyContent:"center", padding:20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background:"rgba(255,255,255,0.97)", borderRadius:18,
            padding:"28px 32px", width:"100%", maxWidth:520,
            maxHeight:"90vh", overflowY:"auto",
            boxShadow:"0 20px 60px rgba(0,0,0,0.20)",
          }}>
            {/* Header */}
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:8 }}>
              <div>
                <h2 style={{ fontFamily:"var(--font-display)", fontSize:20, fontWeight:800 }}>⚙️ Vehicle Targets</h2>
                <p style={{ fontSize:12, color:"var(--text-muted)", marginTop:3 }}>Monthly target = sum of all vehicle targets</p>
              </div>
              <button onClick={() => setShowTargetModal(false)} style={{ background:"none", border:"none", fontSize:22, cursor:"pointer", color:"var(--text-muted)" }}>×</button>
            </div>

            {/* Vehicle rows */}
            <div style={{ display:"flex", flexDirection:"column", gap:10, marginTop:20 }}>
              {allTargets.length === 0 ? (
                <p style={{ color:"var(--text-muted)", fontSize:13, textAlign:"center", padding:24 }}>No vehicles found</p>
              ) : allTargets.map((v: any) => (
                <div key={v.name} style={{
                  display:"grid", gridTemplateColumns:"1fr auto auto",
                  alignItems:"center", gap:12,
                  background:"rgba(0,0,0,0.025)", borderRadius:10, padding:"12px 16px",
                  border:"1px solid rgba(0,0,0,0.06)",
                }}>
                  <div>
                    <p style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>🚗 {v.name}</p>
                    {v.added_date && <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:2 }}>Added: {v.added_date}</p>}
                  </div>
                  <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                    <span style={{ fontSize:14, color:"var(--text-muted)", fontWeight:600 }}>₹</span>
                    <input
                      type="number"
                      defaultValue={v.target || 0}
                      onBlur={e => saveTarget(v.name, Number(e.target.value))}
                      style={{
                        width:110, padding:"7px 10px", borderRadius:8,
                        border:"1px solid rgba(0,0,0,0.12)", background:"white",
                        fontSize:14, fontFamily:"var(--font-body)", outline:"none", textAlign:"right",
                      }}
                    />
                  </div>
                  <span style={{
                    fontSize:12, fontWeight:700, padding:"3px 10px", borderRadius:20,
                    background: v.target > 0 ? "rgba(37,99,235,0.1)" : "rgba(0,0,0,0.05)",
                    color: v.target > 0 ? "var(--accent-primary)" : "var(--text-muted)",
                    whiteSpace:"nowrap",
                  }}>
                    {v.target > 0 ? `₹${Number(v.target).toLocaleString("en-IN")}` : "Not set"}
                  </span>
                </div>
              ))}
            </div>

            {/* Total */}
            {allTargets.length > 0 && (
              <div style={{
                marginTop:16, padding:"14px 16px", borderRadius:10,
                background:"rgba(34,197,94,0.07)", border:"1px solid rgba(34,197,94,0.2)",
                display:"flex", justifyContent:"space-between", alignItems:"center",
              }}>
                <p style={{ fontWeight:700, fontSize:14, color:"var(--text-primary)" }}>Monthly Total Target</p>
                <p style={{ fontWeight:800, fontSize:18, color:"var(--accent-green)", fontFamily:"var(--font-display)" }}>
                  ₹{allTargets.reduce((s: number, v: any) => s + (Number(v.target) || 0), 0).toLocaleString("en-IN")}
                </p>
              </div>
            )}
            <p style={{ fontSize:11, color:"var(--text-muted)", marginTop:12, textAlign:"center" }}>
              💡 Tab or click away to save. New vehicles added later won't affect past months.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
