"use client";
import { apiFetch } from "@/lib/apiFetch";
import { toast } from "@/lib/toast";
import Navbar from "@/components/Navbar";
import { useEffect, useState } from "react";

type User = { id: number; username: string; role: string };

const inputStyle: React.CSSProperties = {
  width: "100%", padding: "9px 13px", borderRadius: 8,
  border: "1px solid rgba(0,0,0,0.10)", background: "rgba(0,0,0,0.03)",
  fontSize: 14, fontFamily: "var(--font-body)", outline: "none",
  boxSizing: "border-box", color: "var(--text-primary)",
};

const Label = ({ text, required }: { text: string; required?: boolean }) => (
  <label style={{
    fontSize: 11, fontWeight: 700, color: "var(--text-muted)",
    textTransform: "uppercase", letterSpacing: "0.07em",
    marginBottom: 5, display: "block",
  }}>
    {text}{required && <span style={{ color: "var(--accent-red)" }}> *</span>}
  </label>
);

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [role, setRole] = useState<string | null>(null);
  const [currentUsername, setCurrentUsername] = useState("");

  // Create modal
  const [showCreate, setShowCreate] = useState(false);
  const [createForm, setCreateForm] = useState({ username: "", password: "", role: "user" });
  const [creating, setCreating] = useState(false);

  // Reset password modal
  const [showReset, setShowReset] = useState(false);
  const [resetUser, setResetUser] = useState<User | null>(null);
  const [newPassword, setNewPassword] = useState("");
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    const r = sessionStorage.getItem("role");
    if (!r) { window.location.href = "/login"; return; }
    const roleLower = r.trim().toLowerCase();
    setRole(roleLower);
    setCurrentUsername(sessionStorage.getItem("username") ?? "");
    if (roleLower !== "admin") { window.location.href = "/"; return; }
  }, []);

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await apiFetch("/users");
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to load users");
      setUsers(data.users || []);
    } catch (e: any) { toast.error(e.message); }
    finally { setLoading(false); }
  };

  useEffect(() => { if (role === "admin") fetchUsers(); }, [role]);

  const handleCreate = async () => {
    if (!createForm.username.trim()) { toast.error("Username is required"); return; }
    if (!createForm.password.trim()) { toast.error("Password is required"); return; }
    setCreating(true);
    try {
      const res = await apiFetch("/users", { method: "POST", body: JSON.stringify(createForm) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to create user");
      toast.success(`User '${createForm.username}' created!`);
      setShowCreate(false);
      setCreateForm({ username: "", password: "", role: "user" });
      fetchUsers();
    } catch (e: any) { toast.error(e.message); }
    finally { setCreating(false); }
  };

  const handleRoleToggle = async (user: User) => {
    const newRole = user.role === "admin" ? "user" : "admin";
    if (!confirm(`Change '${user.username}' role to ${newRole}?`)) return;
    try {
      const res = await apiFetch(`/users/${user.id}/role`, { method: "PUT", body: JSON.stringify({ role: newRole }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to update role");
      toast.success(`Role updated to ${newRole}`);
      fetchUsers();
    } catch (e: any) { toast.error(e.message); }
  };

  const handleResetPassword = async () => {
    if (!newPassword.trim()) { toast.error("Password is required"); return; }
    if (newPassword.length < 4) { toast.error("Password must be at least 4 characters"); return; }
    setResetting(true);
    try {
      const res = await apiFetch(`/users/${resetUser!.id}/password`, { method: "PUT", body: JSON.stringify({ password: newPassword }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to reset password");
      toast.success(`Password reset for '${resetUser!.username}'`);
      setShowReset(false);
      setNewPassword("");
      setResetUser(null);
    } catch (e: any) { toast.error(e.message); }
    finally { setResetting(false); }
  };

  const handleDelete = async (user: User) => {
    if (!confirm(`Delete user '${user.username}'? This cannot be undone.`)) return;
    try {
      const res = await apiFetch(`/users/${user.id}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok) throw new Error(data.detail || "Failed to delete user");
      toast.success(`User '${user.username}' deleted`);
      fetchUsers();
    } catch (e: any) { toast.error(e.message); }
  };

  return (
    <div style={{ minHeight: "100vh", background: "var(--bg-main)", fontFamily: "var(--font-body)" }}>
      <Navbar />
      <style>{`@keyframes fadeIn { from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)} }`}</style>

      <div style={{ maxWidth: 860, margin: "0 auto", padding: "32px 24px" }}>
        {/* Header */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 28 }}>
          <div>
            <h1 style={{ fontFamily: "var(--font-display)", fontSize: 28, fontWeight: 800, color: "var(--text-primary)", marginBottom: 4 }}>
              👥 User Management
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-muted)" }}>{users.length} user{users.length !== 1 ? "s" : ""} in system</p>
          </div>
          <button onClick={() => setShowCreate(true)} style={{
            background: "var(--accent-primary)", color: "#fff",
            border: "none", borderRadius: 10, padding: "10px 20px",
            fontSize: 14, fontWeight: 600, cursor: "pointer",
          }}>
            + New User
          </button>
        </div>

        {/* Users list */}
        {loading ? (
          <div style={{ textAlign: "center", padding: 60, color: "var(--text-muted)" }}>Loading...</div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {users.map(u => (
              <div key={u.id} style={{
                background: "rgba(255,255,255,0.72)", backdropFilter: "blur(12px)",
                border: "1px solid rgba(255,255,255,0.85)", borderRadius: 14,
                padding: "16px 22px", display: "flex", alignItems: "center",
                justifyContent: "space-between", animation: "fadeIn 0.3s ease",
                boxShadow: "0 2px 12px rgba(0,0,0,0.06)",
              }}>
                {/* Left: avatar + info */}
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{
                    width: 42, height: 42, borderRadius: "50%",
                    background: u.role === "admin"
                      ? "linear-gradient(135deg, #2563eb33, #2563eb66)"
                      : "linear-gradient(135deg, #22d3ee22, #22d3ee44)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 18, flexShrink: 0,
                  }}>
                    {u.role === "admin" ? "👑" : "👤"}
                  </div>
                  <div>
                    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                      <p style={{ fontWeight: 700, fontSize: 15, color: "var(--text-primary)" }}>{u.username}</p>
                      {u.username === currentUsername && (
                        <span style={{ fontSize: 10, fontWeight: 700, padding: "2px 8px", borderRadius: 20, background: "rgba(34,197,94,0.12)", color: "var(--accent-green)" }}>YOU</span>
                      )}
                    </div>
                    <span style={{
                      fontSize: 11, fontWeight: 700, padding: "2px 10px", borderRadius: 20,
                      background: u.role === "admin" ? "rgba(37,99,235,0.1)" : "rgba(0,0,0,0.06)",
                      color: u.role === "admin" ? "var(--accent-primary)" : "var(--text-muted)",
                    }}>{u.role}</span>
                  </div>
                </div>

                {/* Right: actions */}
                <div style={{ display: "flex", gap: 8 }}>
                  <button
                    onClick={() => handleRoleToggle(u)}
                    disabled={u.username === currentUsername}
                    style={{
                      background: "rgba(37,99,235,0.08)", border: "1px solid rgba(37,99,235,0.2)",
                      borderRadius: 8, padding: "6px 14px", cursor: u.username === currentUsername ? "not-allowed" : "pointer",
                      fontSize: 12, color: "var(--accent-primary)", fontWeight: 600,
                      opacity: u.username === currentUsername ? 0.4 : 1,
                    }}
                  >
                    Make {u.role === "admin" ? "User" : "Admin"}
                  </button>
                  <button
                    onClick={() => { setResetUser(u); setNewPassword(""); setShowReset(true); }}
                    style={{
                      background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.2)",
                      borderRadius: 8, padding: "6px 14px", cursor: "pointer",
                      fontSize: 12, color: "#f97316", fontWeight: 600,
                    }}
                  >
                    Reset Password
                  </button>
                  <button
                    onClick={() => handleDelete(u)}
                    disabled={u.username === currentUsername}
                    style={{
                      background: "rgba(239,68,68,0.08)", border: "1px solid rgba(239,68,68,0.2)",
                      borderRadius: 8, padding: "6px 14px", cursor: u.username === currentUsername ? "not-allowed" : "pointer",
                      fontSize: 12, color: "var(--accent-red)", fontWeight: 600,
                      opacity: u.username === currentUsername ? 0.4 : 1,
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Create User Modal */}
      {showCreate && (
        <div onClick={() => setShowCreate(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(6px)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "rgba(255,255,255,0.97)", borderRadius: 18,
            padding: "28px 32px", width: "100%", maxWidth: 440,
            boxShadow: "0 20px 60px rgba(0,0,0,0.20)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800 }}>Create New User</h2>
              <button onClick={() => setShowCreate(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text-muted)" }}>×</button>
            </div>

            <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
              <div>
                <Label text="Username" required />
                <input
                  value={createForm.username}
                  onChange={e => setCreateForm(f => ({ ...f, username: e.target.value }))}
                  style={inputStyle} placeholder="e.g. john_doe"
                  autoComplete="off"
                />
              </div>
              <div>
                <Label text="Password" required />
                <input
                  type="password"
                  value={createForm.password}
                  onChange={e => setCreateForm(f => ({ ...f, password: e.target.value }))}
                  style={inputStyle} placeholder="Min. 4 characters"
                  autoComplete="new-password"
                />
              </div>
              <div>
                <Label text="Role" required />
                <select
                  value={createForm.role}
                  onChange={e => setCreateForm(f => ({ ...f, role: e.target.value }))}
                  style={inputStyle}
                >
                  <option value="user">User — can view and add entries</option>
                  <option value="admin">Admin — full access</option>
                </select>
              </div>

              {/* Role info */}
              <div style={{
                background: createForm.role === "admin" ? "rgba(37,99,235,0.06)" : "rgba(0,0,0,0.04)",
                border: `1px solid ${createForm.role === "admin" ? "rgba(37,99,235,0.15)" : "rgba(0,0,0,0.08)"}`,
                borderRadius: 10, padding: "10px 14px",
              }}>
                <p style={{ fontSize: 12, color: "var(--text-muted)", lineHeight: 1.6 }}>
                  {createForm.role === "admin"
                    ? "👑 Admin can create/edit/delete all records, manage users, and access all pages."
                    : "👤 User can view data and add CRM entries. Cannot delete records or manage users."}
                </p>
              </div>
            </div>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowCreate(false)} style={{
                background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 10,
                padding: "10px 20px", fontSize: 14, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={handleCreate} disabled={creating} style={{
                background: "var(--accent-primary)", color: "#fff",
                border: "none", borderRadius: 10, padding: "10px 24px",
                fontSize: 14, fontWeight: 600, cursor: creating ? "not-allowed" : "pointer",
                opacity: creating ? 0.7 : 1,
              }}>
                {creating ? "Creating..." : "Create User"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reset Password Modal */}
      {showReset && resetUser && (
        <div onClick={() => setShowReset(false)} style={{
          position: "fixed", inset: 0, background: "rgba(0,0,0,0.45)",
          backdropFilter: "blur(6px)", zIndex: 1000,
          display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        }}>
          <div onClick={e => e.stopPropagation()} style={{
            background: "rgba(255,255,255,0.97)", borderRadius: 18,
            padding: "28px 32px", width: "100%", maxWidth: 400,
            boxShadow: "0 20px 60px rgba(0,0,0,0.20)",
          }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
              <h2 style={{ fontFamily: "var(--font-display)", fontSize: 20, fontWeight: 800 }}>Reset Password</h2>
              <button onClick={() => setShowReset(false)} style={{ background: "none", border: "none", fontSize: 22, cursor: "pointer", color: "var(--text-muted)" }}>×</button>
            </div>
            <p style={{ fontSize: 13, color: "var(--text-muted)", marginBottom: 18 }}>
              Setting new password for <strong style={{ color: "var(--text-primary)" }}>{resetUser.username}</strong>
            </p>
            <div>
              <Label text="New Password" required />
              <input
                type="password"
                value={newPassword}
                onChange={e => setNewPassword(e.target.value)}
                style={inputStyle} placeholder="Min. 4 characters"
                autoComplete="new-password"
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 24 }}>
              <button onClick={() => setShowReset(false)} style={{
                background: "rgba(0,0,0,0.06)", border: "none", borderRadius: 10,
                padding: "10px 20px", fontSize: 14, cursor: "pointer",
              }}>Cancel</button>
              <button onClick={handleResetPassword} disabled={resetting} style={{
                background: "#f97316", color: "#fff",
                border: "none", borderRadius: 10, padding: "10px 24px",
                fontSize: 14, fontWeight: 600, cursor: resetting ? "not-allowed" : "pointer",
                opacity: resetting ? 0.7 : 1,
              }}>
                {resetting ? "Resetting..." : "Reset Password"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
