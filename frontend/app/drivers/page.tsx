"use client";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/lib/toast";
import Navbar from "@/components/Navbar";
import { useEffect, useState, useCallback } from "react";

type Driver = {
  _row: number;
  name: string;
  father_name: string;
  age: string;
  dob: string;
  mobile_num: string;
  mobile_num2: string;
  present_address: string;
  permanent_address: string;
  aadhaar_number: string;
  driving_licence_number: string;
  dl_expiry: string;
};

const EMPTY_FORM: Omit<Driver, "_row"> = {
  name: "", father_name: "", age: "", dob: "",
  mobile_num: "", mobile_num2: "",
  present_address: "", permanent_address: "",
  aadhaar_number: "", driving_licence_number: "", dl_expiry: "", salary: "",
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

const fieldGroup = (children: React.ReactNode, cols = 2) => (
  <div style={{ display: "grid", gridTemplateColumns: `repeat(${cols},1fr)`, gap: "16px 20px" }}>
    {children}
  </div>
);

export default function DriversPage() {
  const [drivers, setDrivers] = useState<Driver[]>([]);
  const [loading, setLoading] = useState(false);
  const [search, setSearch] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [modalMode, setModalMode] = useState<"create" | "edit">("create");
  const [form, setForm] = useState({ ...EMPTY_FORM });
  const [editRow, setEditRow] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  useEffect(() => {
    const r = sessionStorage.getItem("role");
    if (!r) { window.location.href = "/login"; return; }
    setRole(r.trim().toLowerCase());
  }, []);

  const fetchDrivers = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const res = await apiFetch(`/drivers?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load");
      setDrivers(data.drivers || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { if (role) fetchDrivers(); }, [role, fetchDrivers]);

  const setField = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditRow(null);
    setModalMode("create");
    setShowModal(true);
  };

  const openEdit = (d: Driver) => {
    setForm({
      name: d.name, father_name: d.father_name, age: d.age, dob: d.dob, salary: d.salary || "",
      mobile_num: d.mobile_num, mobile_num2: d.mobile_num2,
      present_address: d.present_address, permanent_address: d.permanent_address,
      aadhaar_number: d.aadhaar_number,
      driving_licence_number: d.driving_licence_number, dl_expiry: d.dl_expiry,
    });
    setEditRow(d._row);
    setModalMode("edit");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.mobile_num.trim()) { toast.error("Mobile number is required"); return; }
    setSaving(true);
    try {
      const res = await apiFetch(
        modalMode === "create" ? "/drivers" : `/drivers/${editRow}`,
        { method: modalMode === "create" ? "POST" : "PUT", body: JSON.stringify(form) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Save failed");
      toast.success(modalMode === "create" ? "Driver added!" : "Driver updated!");
      setShowModal(false);
      fetchDrivers();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (row: number) => {
    if (!confirm("Delete this driver record?")) return;
    try {
      const res = await apiFetch(`/drivers/${row}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail); }
      toast.success("Driver deleted");
      fetchDrivers();
    } catch (e: any) { toast.error(e.message); }
  };

  const isAdmin = role === "admin";

  // Check expiry
  const isExpired = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    return !isNaN(d.getTime()) && d < new Date();
  };
  const isSoonExpiry = (dateStr: string) => {
    if (!dateStr) return false;
    const d = new Date(dateStr);
    const diff = (d.getTime() - Date.now()) / (1000 * 60 * 60 * 24);
    return !isNaN(d.getTime()) && diff >= 0 && diff <= 30;
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", fontFamily: "var(--font-body)" }}>
      <Navbar />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);}}`}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
              🚗 Driver Details
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{drivers.length} driver{drivers.length !== 1 ? "s" : ""} registered</p>
          </div>
          {isAdmin && (
            <button onClick={openCreate} style={{
              background: "var(--accent-primary)", color: "#fff",
              border: "none", borderRadius: 10, padding: "10px 20px",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
              display: "flex", alignItems: "center", gap: 8,
            }}>
              + Add Driver
            </button>
          )}
        </div>

        {/* Search */}
        <div style={{ marginBottom: 20 }}>
          <input
            placeholder="Search by name or mobile..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, maxWidth: 340, background: "rgba(255,255,255,0.7)" }}
          />
        </div>

        {/* Table */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}><Spinner /></div>
        ) : drivers.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>🚗</div>
            <p style={{ fontWeight: 600 }}>No drivers found</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {drivers.map(d => {
              const dlExpired = isExpired(d.dl_expiry);
              const dlSoon = isSoonExpiry(d.dl_expiry);
              const expanded = expandedRow === d._row;
              return (
                <div key={d._row} style={{
                  background: "rgba(255,255,255,0.72)", backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.85)", borderRadius: 14,
                  padding: "18px 22px", animation: "fadeIn 0.3s ease",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}>
                  {/* Top row */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: "linear-gradient(135deg, #2563eb22, #2563eb44)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 20, flexShrink: 0,
                      }}>🧑‍✈️</div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>{d.name}</p>
                        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          {d.father_name && `S/O ${d.father_name} • `}Age: {d.age || "—"} • 📞 {d.mobile_num}{d.salary ? ` • ₹${Number(d.salary).toLocaleString("en-IN")}/mo` : ""}
                          {d.mobile_num2 && ` / ${d.mobile_num2}`}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      {/* DL expiry badge */}
                      {d.dl_expiry && (
                        <span style={{
                          fontSize: 11, fontWeight: 700, padding: "3px 10px", borderRadius: 20,
                          background: dlExpired ? "rgba(239,68,68,0.12)" : dlSoon ? "rgba(249,115,22,0.12)" : "rgba(34,197,94,0.12)",
                          color: dlExpired ? "var(--accent-red)" : dlSoon ? "#f97316" : "var(--accent-green)",
                        }}>
                          DL {dlExpired ? "EXPIRED" : dlSoon ? "EXPIRING SOON" : "Valid"}: {d.dl_expiry}
                        </span>
                      )}
                      <button onClick={() => setExpandedRow(expanded ? null : d._row)} style={{
                        background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 8,
                        padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "var(--text-muted)",
                      }}>
                        {expanded ? "▲ Less" : "▼ More"}
                      </button>
                      {isAdmin && (
                        <>
                          <button onClick={() => openEdit(d)} style={{
                            background: "rgba(37,99,235,0.1)", border: "none", borderRadius: 8,
                            padding: "6px 14px", cursor: "pointer", fontSize: 12,
                            color: "var(--accent-primary)", fontWeight: 600,
                          }}>Edit</button>
                          <button onClick={() => handleDelete(d._row)} style={{
                            background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 8,
                            padding: "6px 14px", cursor: "pointer", fontSize: 12,
                            color: "var(--accent-red)", fontWeight: 600,
                          }}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Expanded details */}
                  {expanded && (
                    <div style={{
                      marginTop: 18, paddingTop: 18,
                      borderTop: "1px solid rgba(0,0,0,0.07)",
                      display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px,1fr))", gap: 14,
                    }}>
                      {[
                        { label: "Date of Birth", value: d.dob },
                        { label: "Aadhaar Number", value: d.aadhaar_number },
                        { label: "DL Number", value: d.driving_licence_number },
                        { label: "DL Expiry", value: d.dl_expiry },
                        { label: "Present Address", value: d.present_address },
                        { label: "Permanent Address", value: d.permanent_address },
                      ].map(({ label, value }) => value ? (
                        <div key={label}>
                          <p style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: 3 }}>{label}</p>
                          <p style={{ fontSize: 13, color: "var(--text-primary)" }}>{value}</p>
                        </div>
                      ) : null)}
                    </div>
                  )}
                </div>
              );
            })}
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
            padding: "28px 32px", width: "100%", maxWidth: 680,
            maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.20)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800 }}>
                {modalMode === "create" ? "Add Driver" : "Edit Driver"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text-muted)" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
                <div>
                  <Label text="Full Name" required />
                  <input value={form.name} onChange={e => setField("name", e.target.value)} style={inputStyle} placeholder="Driver's full name" />
                </div>
                <div>
                  <Label text="Father's Name" />
                  <input value={form.father_name} onChange={e => setField("father_name", e.target.value)} style={inputStyle} placeholder="Father's name" />
                </div>
                <div>
                  <Label text="Age" />
                  <input value={form.age} onChange={e => setField("age", e.target.value)} style={inputStyle} placeholder="e.g. 35" type="number" />
                </div>
                <div>
                  <Label text="Date of Birth" />
                  <input value={form.dob} onChange={e => setField("dob", e.target.value)} style={inputStyle} type="date" />
                </div>
                <div>
                  <Label text="Mobile Number 1" required />
                  <input value={form.mobile_num} onChange={e => setField("mobile_num", e.target.value)} style={inputStyle} placeholder="+91 XXXXX XXXXX" />
                </div>
                <div>
                  <Label text="Mobile Number 2" />
                  <input value={form.mobile_num2} onChange={e => setField("mobile_num2", e.target.value)} style={inputStyle} placeholder="Alternate number" />
                </div>
              </div>

              <div>
                <Label text="Present Address" />
                <textarea value={form.present_address} onChange={e => setField("present_address", e.target.value)}
                  style={{ ...inputStyle, height: 72, resize: "vertical" }} placeholder="Current residential address" />
              </div>
              <div>
                <Label text="Permanent Address" />
                <textarea value={form.permanent_address} onChange={e => setField("permanent_address", e.target.value)}
                  style={{ ...inputStyle, height: 72, resize: "vertical" }} placeholder="Permanent address" />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: "16px 20px" }}>
                <div>
                  <Label text="Aadhaar Number" />
                  <input value={form.aadhaar_number} onChange={e => setField("aadhaar_number", e.target.value)} style={inputStyle} placeholder="XXXX XXXX XXXX" />
                </div>
                <div>
                  <Label text="DL Number" />
                  <input value={form.driving_licence_number} onChange={e => setField("driving_licence_number", e.target.value)} style={inputStyle} placeholder="e.g. PB0120100012345" />
                </div>
                <div>
                  <Label text="DL Expiry Date" />
                  <input value={form.dl_expiry} onChange={e => setField("dl_expiry", e.target.value)} style={inputStyle} type="date" />
                </div>
                <div>
                  <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-muted)", display: "block", marginBottom: 6 }}>Monthly Salary (₹)</label>
                  <input value={form.salary} onChange={e => setField("salary", e.target.value)} style={inputStyle} placeholder="e.g. 25000" type="number" />
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
                {saving ? "Saving..." : modalMode === "create" ? "Add Driver" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
