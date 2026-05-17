"use client";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/lib/toast";
import Navbar from "@/components/Navbar";
import { useEffect, useState, useCallback } from "react";

type Car = {
  _row: number;
  registration_number: string;
  chasis_number: string;
  insurance_expiry: string;
  local_permit_date: string;
  national_permit_date: string;
};

const EMPTY_FORM: Omit<Car, "_row"> = {
  registration_number: "", chasis_number: "",
  insurance_expiry: "", local_permit_date: "", national_permit_date: "",
};

const Spinner = () => (
  <div style={{
    width: 32, height: 32, borderRadius: "50%",
    border: "3px solid rgba(37,99,235,0.12)",
    borderTopColor: "var(--accent-primary)",
    animation: "spin 0.8s linear infinite", margin: "0 auto",
  }} />
);

const Label = ({ text, required }: { text: string; required?: boolean }) => (
  <label style={{
    fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.07em",
    marginBottom: 5, display: "block",
  }}>
    {text} {required && <span style={{ color: "var(--accent-red)" }}>*</span>}
  </label>
);

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 13px", borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.10)",
  background: "rgba(0,0,0,0.03)", fontSize: 14,
  color: "var(--text-primary)", fontFamily: "var(--font-body)",
  outline: "none", boxSizing: "border-box",
};

export default function CarsPage() {
  const [cars, setCars] = useState<Car[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editRow, setEditRow] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<string | null>(null);

  useEffect(() => {
    const r = sessionStorage.getItem("role");
    if (!r) { window.location.href = "/login"; return; }
    setRole(r.trim().toLowerCase());
  }, []);

  const fetchCars = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const res = await apiFetch(`/cars?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load");
      setCars(data.cars || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { if (role) fetchCars(); }, [role, fetchCars]);

  const setField = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditRow(null);
    setModalMode("create");
    setShowModal(true);
  };

  const openEdit = (c: Car) => {
    setForm({
      registration_number: c.registration_number,
      chasis_number: c.chasis_number,
      insurance_expiry: c.insurance_expiry,
      local_permit_date: c.local_permit_date,
      national_permit_date: c.national_permit_date,
    });
    setEditRow(c._row);
    setModalMode("edit");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.registration_number.trim()) { toast.error("Registration number is required"); return; }
    setSaving(true);
    try {
      const res = await apiFetch(
        modalMode === "create" ? "/cars" : `/cars/${editRow}`,
        { method: modalMode === "create" ? "POST" : "PUT", body: JSON.stringify(form) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Save failed");
      toast.success(modalMode === "create" ? "Car added!" : "Car updated!");
      setShowModal(false);
      fetchCars();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (row: number) => {
    if (!confirm("Delete this car record?")) return;
    try {
      const res = await apiFetch(`/cars/${row}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail); }
      toast.success("Car deleted");
      fetchCars();
    } catch (e: any) { toast.error(e.message); }
  };

  const isAdmin = role === "admin";

  const getDateStatus = (dateStr: string) => {
    if (!dateStr) return null;
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    if (diff < 0) return "expired";
    if (diff <= 30) return "soon";
    return "ok";
  };

  const DateBadge = ({ label, value }: { label: string; value: string }) => {
    const status = getDateStatus(value);
    if (!value) return <div style={{ color: "var(--text-muted)", fontSize: 12 }}>{label}: —</div>;
    const colors: Record<string, string> = {
      expired: "rgba(239,68,68,0.12)", soon: "rgba(249,115,22,0.12)", ok: "rgba(34,197,94,0.12)"
    };
    const textColors: Record<string, string> = {
      expired: "var(--accent-red)", soon: "#f97316", ok: "var(--accent-green)"
    };
    return (
      <div style={{
        background: status ? colors[status] : "transparent",
        borderRadius: 8, padding: "6px 10px",
      }}>
        <p style={{ fontSize: 10, color: "var(--text-muted)", fontWeight: 700, textTransform: "uppercase", marginBottom: 2 }}>{label}</p>
        <p style={{ fontSize: 13, fontWeight: 600, color: status ? textColors[status] : "var(--text-primary)" }}>
          {value} {status === "expired" ? "⚠️ EXPIRED" : status === "soon" ? "⚠️ SOON" : "✓"}
        </p>
      </div>
    );
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", fontFamily: "var(--font-body)" }}>
      <Navbar />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);}}`}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
              🚙 Car Details
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{cars.length} vehicle{cars.length !== 1 ? "s" : ""} registered</p>
          </div>
          {isAdmin && (
            <button onClick={openCreate} style={{
              background: "var(--accent-primary)", color: "#fff",
              border: "none", borderRadius: 10, padding: "10px 20px",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>
              + Add Car
            </button>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <input
            placeholder="Search by reg. number or chassis..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, maxWidth: 340, background: "rgba(255,255,255,0.7)" }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}><Spinner /></div>
        ) : cars.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚙</div>
            <p style={{ fontWeight: 600 }}>No cars found</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {cars.map(c => (
              <div key={c._row} style={{
                background: "rgba(255,255,255,0.72)", backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.85)", borderRadius: 14,
                padding: "20px 24px", animation: "fadeIn 0.3s ease",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}>
                <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: 12,
                        background: "linear-gradient(135deg, #2563eb22, #2563eb44)",
                        display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22,
                      }}>🚙</div>
                      <div>
                        <p style={{ fontWeight: 800, fontSize: 18, color: "var(--text-primary)", fontFamily: "var(--font-display)", letterSpacing: "-0.01em" }}>
                          {c.registration_number}
                        </p>
                        {c.chasis_number && (
                          <p style={{ fontSize: 12, color: "var(--text-muted)" }}>Chassis: {c.chasis_number}</p>
                        )}
                      </div>
                    </div>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 10 }}>
                      <DateBadge label="Insurance Expiry" value={c.insurance_expiry} />
                      <DateBadge label="Local Permit" value={c.local_permit_date} />
                      <DateBadge label="National Permit" value={c.national_permit_date} />
                    </div>
                  </div>
                  {isAdmin && (
                    <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                      <button onClick={() => openEdit(c)} style={{
                        background: "rgba(37,99,235,0.1)", border: "none", borderRadius: 8,
                        padding: "7px 16px", cursor: "pointer", fontSize: 13,
                        color: "var(--accent-primary)", fontWeight: 600,
                      }}>Edit</button>
                      <button onClick={() => handleDelete(c._row)} style={{
                        background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 8,
                        padding: "7px 16px", cursor: "pointer", fontSize: 13,
                        color: "var(--accent-red)", fontWeight: 600,
                      }}>Delete</button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div onClick={() => setShowModal(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(6px)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "rgba(255,255,255,0.97)", borderRadius: 18,
            padding: "28px 32px", width: "100%", maxWidth: 560,
            boxShadow: "0 20px 60px rgba(0,0,0,0.20)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800 }}>
                {modalMode === "create" ? "Add Car" : "Edit Car"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
                <div>
                  <Label text="Registration Number" required />
                  <input value={form.registration_number} onChange={e => setField("registration_number", e.target.value)}
                    style={inputStyle} placeholder="e.g. PB10AB1234" />
                </div>
                <div>
                  <Label text="Chassis Number" />
                  <input value={form.chasis_number} onChange={e => setField("chasis_number", e.target.value)}
                    style={inputStyle} placeholder="Chassis / VIN number" />
                </div>
                <div>
                  <Label text="Insurance Policy Expiry" />
                  <input value={form.insurance_expiry} onChange={e => setField("insurance_expiry", e.target.value)}
                    style={inputStyle} type="date" />
                </div>
                <div>
                  <Label text="Local Permit Date" />
                  <input value={form.local_permit_date} onChange={e => setField("local_permit_date", e.target.value)}
                    style={inputStyle} type="date" />
                </div>
                <div>
                  <Label text="National Permit Date" />
                  <input value={form.national_permit_date} onChange={e => setField("national_permit_date", e.target.value)}
                    style={inputStyle} type="date" />
                </div>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 28 }}>
              <button onClick={() => setShowModal(false)} style={{
                background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 10,
                padding: "10px 20px", fontSize: 14, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={handleSave} disabled={saving} style={{
                background: "var(--accent-primary)", color: "#fff",
                border: "none", borderRadius: 10, padding: "10px 24px",
                fontSize: 14, fontWeight: 600, cursor: saving ? "not-allowed" : "pointer",
                opacity: saving ? 0.7 : 1,
              }}>
                {saving ? "Saving..." : modalMode === "create" ? "Add Car" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
