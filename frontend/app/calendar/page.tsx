"use client";
import { apiFetch } from "@/lib/apiFetch";
import Navbar from "@/components/Navbar";
import { useEffect, useState } from "react";

type Trip = {
  trip_id: string;
  customer: string;
  from: string;
  to: string;
  vehicle: string;
  status: string;
  start_date: string;
  end_date: string;
  deal: number;
};

const DAYS   = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  booked:    { bg: "rgba(37,99,235,0.13)",  text: "#1d4ed8", dot: "#2563eb" },
  progress:  { bg: "rgba(249,115,22,0.13)", text: "#c2410c", dot: "#f97316" },
  done:      { bg: "rgba(124,58,237,0.13)", text: "#6d28d9", dot: "#7c3aed" },
  completed: { bg: "rgba(34,197,94,0.13)",  text: "#15803d", dot: "#16a34a" },
};

function getStatusColor(status: string) {
  return STATUS_COLORS[status.toLowerCase()] || { bg: "rgba(0,0,0,0.06)", text: "#64748b", dot: "#94a3b8" };
}

function dateRange(start: string, end: string): string[] {
  if (!start) return [];
  const dates: string[] = [];
  const s = new Date(start);
  const e = end ? new Date(end) : s;
  const cur = new Date(s);
  while (cur <= e) {
    dates.push(cur.toISOString().split("T")[0]);
    cur.setDate(cur.getDate() + 1);
  }
  return dates;
}

export default function CalendarPage() {
  const now   = new Date();
  const [year,  setYear]  = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [trips, setTrips] = useState<Trip[]>([]);
  const [loading, setLoading] = useState(false);
  const [lightboxDate, setLightboxDate] = useState<string | null>(null);

  useEffect(() => {
    const r = sessionStorage.getItem("role");
    if (!r) { window.location.href = "/login"; }
  }, []);

  useEffect(() => {
    setLoading(true);
    apiFetch(`/calendar?year=${year}&month=${month}`)
      .then(r => r.json())
      .then(d => { setTrips(d.trips || []); setLoading(false); })
      .catch(() => setLoading(false));
  }, [year, month]);

  const tripsByDate: Record<string, Trip[]> = {};
  trips.forEach(t => {
    dateRange(t.start_date, t.end_date).forEach(d => {
      if (!tripsByDate[d]) tripsByDate[d] = [];
      tripsByDate[d].push(t);
    });
  });

  const firstDay    = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = now.toISOString().split("T")[0];

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
  };

  // summary counts
  const statusCounts = trips.reduce((acc: any, t) => {
    const s = t.status.toLowerCase();
    acc[s] = (acc[s] || 0) + 1;
    return acc;
  }, {});
  const totalDeal = trips.filter(t => !t.status.toLowerCase().includes("cancel")).reduce((s, t) => s + t.deal, 0);

  return (
    <div style={{ height: "100vh", display: "flex", flexDirection: "column", background: "var(--bg-main)", fontFamily: "var(--font-body)", overflow: "hidden" }}>
      <Navbar />
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:scale(0.97)}to{opacity:1;transform:scale(1)} }
        .cal-cell { transition: all 0.12s ease; cursor: pointer; }
        .cal-cell:hover { background: rgba(37,99,235,0.08) !important; transform: scale(1.02); }
        .cal-cell.today { border: 2px solid var(--accent-primary) !important; }
        .lightbox-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.55); backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; animation: fadeIn 0.18s ease; }
        .lightbox-box { background: rgba(255,255,255,0.97); border-radius: 22px; box-shadow: 0 24px 80px rgba(0,0,0,0.22); width: 100%; max-width: 500px; max-height: 85vh; overflow-y: auto; padding: 24px; }
        .lb-row { display: flex; justify-content: space-between; font-size: 12px; padding: 5px 0; border-bottom: 1px solid rgba(148,163,184,0.12); }
      `}</style>

      <div style={{ flex: 1, display: "flex", flexDirection: "column", padding: "10px 16px 8px", overflow: "hidden", maxWidth: 1200, width: "100%", margin: "0 auto" }}>

        {/* ── Header row ── */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 8 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <button onClick={prevMonth} style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 17, fontWeight: 800, color: "var(--text-primary)", minWidth: 140, textAlign: "center" }}>
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={nextMonth} style={{ background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.1)", borderRadius: 8, width: 30, height: 30, cursor: "pointer", fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
            <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); }} style={{ background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)", borderRadius: 8, padding: "4px 12px", cursor: "pointer", fontSize: 12, color: "var(--accent-primary)", fontWeight: 600 }}>Today</button>
          </div>

          {/* Legend + summary inline */}
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            {Object.entries(STATUS_COLORS).map(([s, c]) => (
              <div key={s} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                <div style={{ width: 8, height: 8, borderRadius: "50%", background: c.dot }} />
                <span style={{ fontSize: 11, color: "var(--text-muted)", textTransform: "capitalize" }}>{s} {statusCounts[s] ? `(${statusCounts[s]})` : ""}</span>
              </div>
            ))}
            {totalDeal > 0 && (
              <span style={{ fontSize: 12, fontWeight: 700, color: "var(--accent-primary)", background: "rgba(37,99,235,0.08)", padding: "3px 10px", borderRadius: 20 }}>
                ₹{totalDeal.toLocaleString("en-IN")}
              </span>
            )}
          </div>
        </div>

        {/* ── Day headers ── */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 3, marginBottom: 3 }}>
          {DAYS.map(d => (
            <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", padding: "3px 0" }}>{d}</div>
          ))}
        </div>

        {/* ── Calendar grid — fills remaining height ── */}
        {loading ? (
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", color: "var(--text-muted)", fontSize: 14 }}>Loading...</div>
        ) : (
          <div style={{ flex: 1, display: "grid", gridTemplateColumns: "repeat(7,1fr)", gridTemplateRows: `repeat(${cells.length / 7},1fr)`, gap: 3 }}>
            {cells.map((day, idx) => {
              if (!day) return <div key={idx} />;
              const dateStr  = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
              const dayTrips = tripsByDate[dateStr] || [];
              const isToday  = dateStr === todayStr;

              return (
                <div
                  key={idx}
                  className={`cal-cell${isToday ? " today" : ""}`}
                  onClick={() => dayTrips.length > 0 && setLightboxDate(dateStr)}
                  style={{
                    borderRadius: 8, padding: "4px 5px",
                    background: dayTrips.length > 0 ? "rgba(255,255,255,0.80)" : "rgba(255,255,255,0.40)",
                    border: "1px solid rgba(255,255,255,0.85)",
                    backdropFilter: "blur(6px)",
                    boxShadow: dayTrips.length > 0 ? "0 1px 4px rgba(0,0,0,0.07)" : "none",
                    cursor: dayTrips.length > 0 ? "pointer" : "default",
                    overflow: "hidden",
                    display: "flex", flexDirection: "column",
                  }}
                >
                  {/* Date number */}
                  <div style={{
                    fontSize: 11, fontWeight: isToday ? 800 : 500,
                    color: isToday ? "var(--accent-primary)" : dayTrips.length > 0 ? "var(--text-primary)" : "var(--text-muted)",
                    textAlign: "right", lineHeight: 1, marginBottom: 2, flexShrink: 0,
                  }}>{day}</div>

                  {/* Trip dots */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 1, flex: 1, overflow: "hidden" }}>
                    {dayTrips.slice(0, 2).map((t, i) => {
                      const sc = getStatusColor(t.status);
                      return (
                        <div key={i} style={{
                          background: sc.bg, borderRadius: 3,
                          padding: "1px 4px", fontSize: 9, fontWeight: 600,
                          color: sc.text, overflow: "hidden",
                          whiteSpace: "nowrap", textOverflow: "ellipsis", lineHeight: "14px",
                        }}>
                          {t.from}→{t.to}
                        </div>
                      );
                    })}
                    {dayTrips.length > 2 && (
                      <div style={{ fontSize: 9, color: "var(--text-muted)", fontWeight: 600, paddingLeft: 2, lineHeight: "12px" }}>
                        +{dayTrips.length - 2}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Lightbox — all trips for clicked date ── */}
      {lightboxDate && (() => {
        const lbTrips = tripsByDate[lightboxDate] || [];
        const lbLabel = new Date(lightboxDate + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" });
        const lbTotal = lbTrips.filter(t => !t.status.toLowerCase().includes("cancel")).reduce((s, t) => s + t.deal, 0);
        return (
          <div className="lightbox-overlay" onClick={() => setLightboxDate(null)}>
            <div className="lightbox-box" onClick={e => e.stopPropagation()}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 18 }}>
                <div>
                  <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 3 }}>{lbLabel}</p>
                  <h2 style={{ fontFamily: "var(--font-display)", fontSize: 19, fontWeight: 800 }}>
                    {lbTrips.length} Trip{lbTrips.length !== 1 ? "s" : ""}
                  </h2>
                  <p style={{ fontSize: 13, color: "var(--accent-primary)", fontWeight: 700, marginTop: 2 }}>
                    Total: ₹{lbTotal.toLocaleString("en-IN")}
                  </p>
                </div>
                <button onClick={() => setLightboxDate(null)} style={{ background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 8, width: 32, height: 32, cursor: "pointer", fontSize: 16, color: "var(--text-muted)" }}>✕</button>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {lbTrips.map((t, i) => {
                  const sc = getStatusColor(t.status);
                  return (
                    <div key={i} style={{ background: sc.bg, border: `1px solid ${sc.dot}30`, borderRadius: 12, padding: "14px 16px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                        <span style={{ fontSize: 10, fontWeight: 700, color: sc.text, textTransform: "capitalize", background: "rgba(255,255,255,0.65)", padding: "2px 8px", borderRadius: 20 }}>{t.status}</span>
                        <span style={{ fontSize: 11, color: "var(--text-muted)" }}>#{t.trip_id}</span>
                      </div>
                      <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 6 }}>{t.customer}</p>
                      <div style={{ display: "flex", flexDirection: "column", gap: 3 }}>
                        <div className="lb-row"><span style={{ color: "var(--text-muted)" }}>Route</span><strong>{t.from} → {t.to}</strong></div>
                        <div className="lb-row"><span style={{ color: "var(--text-muted)" }}>Vehicle</span><strong>{t.vehicle}</strong></div>
                        <div className="lb-row"><span style={{ color: "var(--text-muted)" }}>Dates</span><strong>{t.start_date}{t.end_date && t.end_date !== t.start_date ? ` → ${t.end_date}` : ""}</strong></div>
                        <div className="lb-row" style={{ border: "none" }}><span style={{ color: "var(--text-muted)" }}>Deal</span><strong style={{ color: "var(--accent-primary)" }}>₹{Number(t.deal).toLocaleString("en-IN")}</strong></div>
                      </div>
                    </div>
                  );
                })}
              </div>
              <p style={{ fontSize: 11, color: "var(--text-muted)", textAlign: "center", marginTop: 14 }}>Click outside to close</p>
            </div>
          </div>
        );
      })()}
    </div>
  );
}
