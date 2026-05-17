"use client";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/lib/toast";
import Navbar from "@/components/Navbar";
import { useEffect, useState, useCallback } from "react";

type Attendant = {
  _row: number;
  name: string;
  age: string;
  dob: string;
  mobile_num: string;
  mobile_num2: string;
  present_address: string;
  permanent_address: string;
  aadhaar_number: string;
};

const EMPTY_FORM: Omit<Attendant, "_row"> = {
  name: "", age: "", dob: "",
  mobile_num: "", mobile_num2: "",
  present_address: "", permanent_address: "",
  aadhaar_number: "",
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

export default function AttendantsPage() {
  const [attendants, setAttendants] = useState<Attendant[]>([]);
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

  const fetchAttendants = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      const res = await apiFetch(`/attendants?${params}`);
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load");
      setAttendants(data.attendants || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  }, [search]);

  useEffect(() => { if (role) fetchAttendants(); }, [role, fetchAttendants]);

  const setField = (key: string, val: string) => setForm(f => ({ ...f, [key]: val }));

  const openCreate = () => {
    setForm({ ...EMPTY_FORM });
    setEditRow(null);
    setModalMode("create");
    setShowModal(true);
  };

  const openEdit = (a: Attendant) => {
    setForm({
      name: a.name, age: a.age, dob: a.dob,
      mobile_num: a.mobile_num, mobile_num2: a.mobile_num2,
      present_address: a.present_address, permanent_address: a.permanent_address,
      aadhaar_number: a.aadhaar_number,
    });
    setEditRow(a._row);
    setModalMode("edit");
    setShowModal(true);
  };

  const handleSave = async () => {
    if (!form.name.trim()) { toast.error("Name is required"); return; }
    if (!form.mobile_num.trim()) { toast.error("Mobile number is required"); return; }
    setSaving(true);
    try {
      const res = await apiFetch(
        modalMode === "create" ? "/attendants" : `/attendants/${editRow}`,
        { method: modalMode === "create" ? "POST" : "PUT", body: JSON.stringify(form) }
      );
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Save failed");
      toast.success(modalMode === "create" ? "Attendant added!" : "Attendant updated!");
      setShowModal(false);
      fetchAttendants();
    } catch (e: any) { toast.error(e.message); }
    finally { setSaving(false); }
  };

  const handleDelete = async (row: number) => {
    if (!confirm("Delete this attendant record?")) return;
    try {
      const res = await apiFetch(`/attendants/${row}`, { method: "DELETE" });
      if (!res.ok) { const d = await res.json(); throw new Error(d.detail); }
      toast.success("Attendant deleted");
      fetchAttendants();
    } catch (e: any) { toast.error(e.message); }
  };

  const isAdmin = role === "admin";

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", fontFamily: "var(--font-body)" }}>
      <Navbar />
      <style>{`@keyframes spin { to { transform: rotate(360deg); } } @keyframes fadeIn { from { opacity:0;transform:translateY(8px);} to{opacity:1;transform:translateY(0);}}`}</style>

      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "32px 24px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
              👤 Attendant Details
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{attendants.length} attendant{attendants.length !== 1 ? "s" : ""} registered</p>
          </div>
          {isAdmin && (
            <button onClick={openCreate} style={{
              background: "var(--accent-primary)", color: "#fff",
              border: "none", borderRadius: 10, padding: "10px 20px",
              fontSize: 14, fontWeight: 600, cursor: "pointer",
            }}>
              + Add Attendant
            </button>
          )}
        </div>

        <div style={{ marginBottom: 20 }}>
          <input
            placeholder="Search by name or mobile..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ ...inputStyle, maxWidth: 340, background: "rgba(255,255,255,0.7)" }}
          />
        </div>

        {loading ? (
          <div style={{ textAlign: "center", padding: 60 }}><Spinner /></div>
        ) : attendants.length === 0 ? (
          <div style={{ textAlign: "center", padding: 80, color: "var(--text-muted)" }}>
            <div style={{ fontSize: 40, marginBottom: 12 }}>👤</div>
            <p style={{ fontWeight: 600 }}>No attendants found</p>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {attendants.map(a => {
              const expanded = expandedRow === a._row;
              return (
                <div key={a._row} style={{
                  background: "rgba(255,255,255,0.72)", backdropFilter: "blur(12px)",
                  border: "1px solid rgba(255,255,255,0.85)", borderRadius: 14,
                  padding: "18px 22px", animation: "fadeIn 0.3s ease",
                  boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
                }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
                      <div style={{
                        width: 44, height: 44, borderRadius: "50%",
                        background: "linear-gradient(135deg, #22d3a022, #22d3a044)",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: 20, flexShrink: 0,
                      }}>👤</div>
                      <div>
                        <p style={{ fontWeight: 700, fontSize: 16, color: "var(--text-primary)" }}>{a.name}</p>
                        <p style={{ fontSize: 12, color: "var(--text-muted)" }}>
                          Age: {a.age || "—"} • 📞 {a.mobile_num}
                          {a.mobile_num2 && ` / ${a.mobile_num2}`}
                        </p>
                      </div>
                    </div>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <button onClick={() => setExpandedRow(expanded ? null : a._row)} style={{
                        background: "rgba(0,0,0,0.05)", border: "none", borderRadius: 8,
                        padding: "6px 12px", cursor: "pointer", fontSize: 12, color: "var(--text-muted)",
                      }}>
                        {expanded ? "▲ Less" : "▼ More"}
                      </button>
                      {isAdmin && (
                        <>
                          <button onClick={() => openEdit(a)} style={{
                            background: "rgba(37,99,235,0.1)", border: "none", borderRadius: 8,
                            padding: "6px 14px", cursor: "pointer", fontSize: 12,
                            color: "var(--accent-primary)", fontWeight: 600,
                          }}>Edit</button>
                          <button onClick={() => handleDelete(a._row)} style={{
                            background: "rgba(239,68,68,0.1)", border: "none", borderRadius: 8,
                            padding: "6px 14px", cursor: "pointer", fontSize: 12,
                            color: "var(--accent-red)", fontWeight: 600,
                          }}>Delete</button>
                        </>
                      )}
                    </div>
                  </div>

                  {expanded && (
                    <div style={{
                      marginTop: 18, paddingTop: 18,
                      borderTop: "1px solid rgba(0,0,0,0.07)",
                      display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px,1fr))", gap: 14,
                    }}>
                      {[
                        { label: "Date of Birth", value: a.dob },
                        { label: "Aadhaar Number", value: a.aadhaar_number },
                        { label: "Present Address", value: a.present_address },
                        { label: "Permanent Address", value: a.permanent_address },
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
            padding: "28px 32px", width: "100%", maxWidth: 620,
            maxHeight: "90vh", overflowY: "auto",
            boxShadow: "0 20px 60px rgba(0,0,0,0.20)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800 }}>
                {modalMode === "create" ? "Add Attendant" : "Edit Attendant"}
              </h2>
              <button onClick={() => setShowModal(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 18 }}>
              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px 20px" }}>
                <div>
                  <Label text="Full Name" required />
                  <input value={form.name} onChange={e => setField("name", e.target.value)} style={inputStyle} placeholder="Attendant's name" />
                </div>
                <div>
                  <Label text="Age" />
                  <input value={form.age} onChange={e => setField("age", e.target.value)} style={inputStyle} placeholder="e.g. 28" type="number" />
                </div>
                <div>
                  <Label text="Date of Birth" />
                  <input value={form.dob} onChange={e => setField("dob", e.target.value)} style={inputStyle} type="date" />
                </div>
                <div>
                  <Label text="Aadhaar Number" />
                  <input value={form.aadhaar_number} onChange={e => setField("aadhaar_number", e.target.value)} style={inputStyle} placeholder="XXXX XXXX XXXX" />
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
                {saving ? "Saving..." : modalMode === "create" ? "Add Attendant" : "Save Changes"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
