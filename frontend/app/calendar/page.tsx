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

const DAYS   = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = ["January","February","March","April","May","June",
                "July","August","September","October","November","December"];

const STATUS_COLORS: Record<string, { bg: string; text: string; dot: string }> = {
  booked:    { bg: "rgba(37,99,235,0.12)",  text: "var(--accent-primary)", dot: "#2563eb" },
  progress:  { bg: "rgba(249,115,22,0.12)", text: "#f97316",               dot: "#f97316" },
  done:      { bg: "rgba(124,58,237,0.12)", text: "#7c3aed",               dot: "#7c3aed" },
  completed: { bg: "rgba(34,197,94,0.12)",  text: "var(--accent-green)",   dot: "#16a34a" },
};

function getStatusColor(status: string) {
  return STATUS_COLORS[status.toLowerCase()] || { bg: "rgba(0,0,0,0.06)", text: "var(--text-muted)", dot: "#999" };
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
  const [selected, setSelected] = useState<string | null>(null);
  const [lightboxTrip, setLightboxTrip] = useState<Trip | null>(null);

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

  // Map date -> trips on that date
  const tripsByDate: Record<string, Trip[]> = {};
  trips.forEach(t => {
    dateRange(t.start_date, t.end_date).forEach(d => {
      if (!tripsByDate[d]) tripsByDate[d] = [];
      tripsByDate[d].push(t);
    });
  });

  // Build calendar grid
  const firstDay  = new Date(year, month - 1, 1).getDay();
  const daysInMonth = new Date(year, month, 0).getDate();
  const cells: (number | null)[] = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];
  // pad to complete last row
  while (cells.length % 7 !== 0) cells.push(null);

  const todayStr = now.toISOString().split("T")[0];

  const prevMonth = () => {
    if (month === 1) { setYear(y => y - 1); setMonth(12); }
    else setMonth(m => m - 1);
    setSelected(null);
  };
  const nextMonth = () => {
    if (month === 12) { setYear(y => y + 1); setMonth(1); }
    else setMonth(m => m + 1);
    setSelected(null);
  };

  const selectedDateStr = selected;
  const selectedTrips   = selectedDateStr ? (tripsByDate[selectedDateStr] || []) : [];

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", fontFamily: "var(--font-body)" }}>
      <Navbar />
      <style>{`
        @keyframes fadeIn { from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)} }
        .cal-cell:hover { background: rgba(37,99,235,0.07) !important; cursor:pointer; }
        .cal-cell.today { border: 2px solid var(--accent-primary) !important; }
        .cal-cell.selected { background: rgba(37,99,235,0.10) !important; border: 2px solid var(--accent-primary) !important; }
        .lightbox-overlay { position: fixed; inset: 0; background: rgba(15,23,42,0.55); backdrop-filter: blur(10px); -webkit-backdrop-filter: blur(10px); display: flex; align-items: center; justify-content: center; z-index: 1000; padding: 16px; animation: fadeIn 0.18s ease; }
        .lightbox-box { background: rgba(255,255,255,0.96); border-radius: 24px; box-shadow: 0 24px 80px rgba(0,0,0,0.22); width: 100%; max-width: 520px; max-height: 90vh; overflow-y: auto; padding: 28px; }
        .lightbox-row { display: flex; justify-content: space-between; font-size: 13px; padding: 7px 0; border-bottom: 1px solid rgba(148,163,184,0.12); }
      `}</style>

      <div style={{ maxWidth: 1100, margin: "0 auto", padding: "28px 20px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 24 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 26, fontWeight: 800, color: "var(--text-primary)" }}>
              📅 Trip Calendar
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginTop: 2 }}>
              {trips.length} trip{trips.length !== 1 ? "s" : ""} in {MONTHS[month - 1]} {year}
            </p>
          </div>

          {/* Nav */}
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={prevMonth} style={{
              background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 10, width: 36, height: 36, cursor: "pointer",
              fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
            }}>‹</button>
            <span style={{ fontFamily: "var(--font-display)", fontSize: 18, fontWeight: 700, color: "var(--text-primary)", minWidth: 160, textAlign: "center" }}>
              {MONTHS[month - 1]} {year}
            </span>
            <button onClick={nextMonth} style={{
              background: "rgba(255,255,255,0.7)", border: "1px solid rgba(0,0,0,0.1)",
              borderRadius: 10, width: 36, height: 36, cursor: "pointer",
              fontSize: 16, display: "flex", alignItems: "center", justifyContent: "center",
            }}>›</button>
            <button onClick={() => { setYear(now.getFullYear()); setMonth(now.getMonth() + 1); setSelected(null); }}
              style={{
                background: "rgba(37,99,235,0.1)", border: "1px solid rgba(37,99,235,0.2)",
                borderRadius: 10, padding: "7px 14px", cursor: "pointer",
                fontSize: 13, color: "var(--accent-primary)", fontWeight: 600,
              }}>Today</button>
          </div>
        </div>

        {/* Legend */}
        <div style={{ display: "flex", gap: 16, marginBottom: 16, flexWrap: "wrap" }}>
          {Object.entries(STATUS_COLORS).map(([s, c]) => (
            <div key={s} style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", background: c.dot }} />
              <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "capitalize" }}>{s}</span>
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }}>
          {/* Calendar grid */}
          <div style={{ flex: 1 }}>
            {/* Day headers */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4, marginBottom: 4 }}>
              {DAYS.map(d => (
                <div key={d} style={{
                  textAlign: "center", fontSize: 11, fontWeight: 700,
                  color: "var(--text-muted)", textTransform: "uppercase",
                  letterSpacing: "0.07em", padding: "6px 0",
                }}>{d}</div>
              ))}
            </div>

            {/* Cells */}
            {loading ? (
              <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Loading...</div>
            ) : (
              <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 4 }}>
                {cells.map((day, idx) => {
                  if (!day) return <div key={idx} style={{ minHeight: 90 }} />;
                  const dateStr = `${year}-${String(month).padStart(2,"0")}-${String(day).padStart(2,"0")}`;
                  const dayTrips = tripsByDate[dateStr] || [];
                  const isToday    = dateStr === todayStr;
                  const isSelected = dateStr === selectedDateStr;

                  return (
                    <div
                      key={idx}
                      className={`cal-cell${isToday ? " today" : ""}${isSelected ? " selected" : ""}`}
                      onClick={() => setSelected(isSelected ? null : dateStr)}
                      style={{
                        minHeight: 90, borderRadius: 10, padding: "8px 6px",
                        background: "rgba(255,255,255,0.65)",
                        border: "1px solid rgba(255,255,255,0.85)",
                        backdropFilter: "blur(8px)",
                        boxShadow: "0 1px 6px rgba(0,0,0,0.05)",
                        transition: "all 0.15s ease",
                        position: "relative",
                      }}
                    >
                      {/* Date number */}
                      <div style={{
                        fontSize: 13, fontWeight: isToday ? 800 : 600,
                        color: isToday ? "var(--accent-primary)" : "var(--text-primary)",
                        marginBottom: 4, textAlign: "right", paddingRight: 2,
                      }}>{day}</div>

                      {/* Trip dots/pills */}
                      <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
                        {dayTrips.slice(0, 3).map((t, i) => {
                          const sc = getStatusColor(t.status);
                          return (
                            <div key={i} onClick={e => { e.stopPropagation(); setLightboxTrip(t); }} style={{
                              background: sc.bg, borderRadius: 4,
                              padding: "2px 5px", fontSize: 10, fontWeight: 600,
                              color: sc.text, overflow: "hidden",
                              whiteSpace: "nowrap", textOverflow: "ellipsis",
                              cursor: "pointer",
                            }}>
                              {t.from} → {t.to}
                            </div>
                          );
                        })}
                        {dayTrips.length > 3 && (
                          <div style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 600, paddingLeft: 4 }}>
                            +{dayTrips.length - 3} more
                          </div>
                        )}
                      </div>

                      {/* Empty indicator */}
                      {dayTrips.length === 0 && (
                        <div style={{ position: "absolute", bottom: 6, right: 6, width: 6, height: 6, borderRadius: "50%", background: "rgba(0,0,0,0.08)" }} />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Side panel */}
          <div style={{ width: 280, flexShrink: 0 }}>
            {selectedDateStr ? (
              <div style={{
                background: "rgba(255,255,255,0.80)", backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.9)", borderRadius: 14,
                padding: "18px 20px", animation: "fadeIn 0.2s ease",
                boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
              }}>
                <p style={{ fontFamily: "var(--font-display)", fontSize: 16, fontWeight: 800, color: "var(--text-primary)", marginBottom: 14 }}>
                  {new Date(selectedDateStr + "T00:00:00").toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                </p>
                {selectedTrips.length === 0 ? (
                  <div style={{ textAlign: "center", padding: "24px 0", color: "var(--text-muted)" }}>
                    <div style={{ fontSize: 28, marginBottom: 8 }}>🗓️</div>
                    <p style={{ fontSize: 13 }}>No trips on this date</p>
                  </div>
                ) : (
                  <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                    {selectedTrips.map((t, i) => {
                      const sc = getStatusColor(t.status);
                      return (
                        <div key={i} onClick={() => setLightboxTrip(t)} style={{
                          background: sc.bg, borderRadius: 10, padding: "12px 14px",
                          border: `1px solid ${sc.dot}22`, cursor: "pointer",
                        }}>
                          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                            <span style={{ fontSize: 12, fontWeight: 700, color: sc.text, textTransform: "capitalize" }}>{t.status}</span>
                            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>#{t.trip_id}</span>
                          </div>
                          <p style={{ fontWeight: 700, fontSize: 14, color: "var(--text-primary)", marginBottom: 4 }}>{t.customer}</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>📍 {t.from} → {t.to}</p>
                          <p style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 4 }}>🚗 {t.vehicle}</p>
                          <p style={{ fontSize: 12, fontWeight: 600, color: "var(--accent-primary)" }}>
                            ₹{Number(t.deal).toLocaleString("en-IN")}
                          </p>
                          {t.start_date && (
                            <p style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 4 }}>
                              {t.start_date}{t.end_date && t.end_date !== t.start_date ? ` → ${t.end_date}` : ""}
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            ) : (
              <div style={{
                background: "rgba(255,255,255,0.5)", backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.8)", borderRadius: 14,
                padding: "32px 20px", textAlign: "center",
                color: "var(--text-muted)",
              }}>
                <div style={{ fontSize: 36, marginBottom: 10 }}>📅</div>
                <p style={{ fontSize: 13, fontWeight: 600 }}>Click a date to see trips</p>
                <p style={{ fontSize: 12, marginTop: 6 }}>Dates with trips show colored pills</p>
              </div>
            )}

            {/* Monthly summary */}
            {trips.length > 0 && (
              <div style={{
                marginTop: 14, background: "rgba(255,255,255,0.6)", backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.85)", borderRadius: 14, padding: "14px 16px",
              }}>
                <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Month Summary</p>
                {Object.entries(
                  trips.reduce((acc: any, t) => {
                    const s = t.status.toLowerCase();
                    acc[s] = (acc[s] || 0) + 1;
                    return acc;
                  }, {})
                ).map(([s, count]) => {
                  const sc = getStatusColor(s);
                  return (
                    <div key={s} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 7 }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: sc.dot }} />
                        <span style={{ fontSize: 12, color: "var(--text-muted)", textTransform: "capitalize" }}>{s}</span>
                      </div>
                      <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>{count as number}</span>
                    </div>
                  );
                })}
                <div style={{ borderTop: "1px solid rgba(0,0,0,0.07)", paddingTop: 8, marginTop: 6, display: "flex", justifyContent: "space-between" }}>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-muted)" }}>Total Deal</span>
                  <span style={{ fontSize: 13, fontWeight: 800, color: "var(--accent-primary)" }}>
                    ₹{trips.reduce((s, t) => s + t.deal, 0).toLocaleString("en-IN")}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Lightbox */}
      {lightboxTrip && (
        <div className="lightbox-overlay" onClick={() => setLightboxTrip(null)}>
          <div className="lightbox-box" onClick={e => e.stopPropagation()}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <div>
                <span style={{ fontSize: 11, fontWeight: 700, color: getStatusColor(lightboxTrip.status).text, textTransform: "capitalize", background: getStatusColor(lightboxTrip.status).bg, padding: "3px 10px", borderRadius: 20 }}>{lightboxTrip.status}</span>
                <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800, marginTop: 8 }}>Trip #{lightboxTrip.trip_id}</h2>
              </div>
              <button onClick={() => setLightboxTrip(null)} style={{ background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 10, width: 36, height: 36, cursor: "pointer", fontSize: 18, color: "var(--text-muted)" }}>✕</button>
            </div>

            <div style={{ background: "rgba(241,245,249,0.8)", borderRadius: 14, padding: "16px 18px", marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 8 }}>Customer</p>
              <p style={{ fontWeight: 700, fontSize: 16 }}>{lightboxTrip.customer}</p>
            </div>

            <div style={{ background: "rgba(241,245,249,0.8)", borderRadius: 14, padding: "16px 18px", marginBottom: 14 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Trip Details</p>
              <div className="lightbox-row"><span style={{ color: "var(--text-muted)" }}>Route</span><strong>{lightboxTrip.from} → {lightboxTrip.to}</strong></div>
              <div className="lightbox-row"><span style={{ color: "var(--text-muted)" }}>Vehicle</span><strong>{lightboxTrip.vehicle}</strong></div>
              <div className="lightbox-row" style={{ border: "none" }}><span style={{ color: "var(--text-muted)" }}>Dates</span><strong>{lightboxTrip.start_date}{lightboxTrip.end_date && lightboxTrip.end_date !== lightboxTrip.start_date ? ` → ${lightboxTrip.end_date}` : ""}</strong></div>
            </div>

            <div style={{ background: "rgba(241,245,249,0.8)", borderRadius: 14, padding: "16px 18px" }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.07em", marginBottom: 10 }}>Financials</p>
              <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 6 }}>
                <div className="lightbox-row"><span style={{ color: "var(--text-muted)" }}>Deal Price</span><strong style={{ color: "var(--accent-primary)" }}>₹{Number(lightboxTrip.deal).toLocaleString("en-IN")}</strong></div>
              </div>
            </div>

            <p style={{ fontSize: 12, color: "var(--text-muted)", textAlign: "center", marginTop: 16 }}>Click outside to close</p>
          </div>
        </div>
      )}
    </div>
  );
}
