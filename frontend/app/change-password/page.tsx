"use client";

import { useState } from "react";
import { apiFetch } from "@/lib/apiFetch";

export default function ChangePassword() {
  const [oldPass,     setOldPass]     = useState("");
  const [newPass,     setNewPass]     = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [loading,     setLoading]     = useState(false);
  const [msg,         setMsg]         = useState<{ text: string; ok: boolean } | null>(null);

  const handleChange = async () => {
    setMsg(null);

    if (!oldPass || !newPass || !confirmPass) {
      setMsg({ text: "All fields are required.", ok: false });
      return;
    }
    if (newPass.length < 6) {
      setMsg({ text: "New password must be at least 6 characters.", ok: false });
      return;
    }
    if (newPass !== confirmPass) {
      setMsg({ text: "Passwords do not match.", ok: false });
      return;
    }

    setLoading(true);
    try {
      const res = await apiFetch("/change-password", {
        method: "POST",
        body: JSON.stringify({ old_password: oldPass, new_password: newPass }),
      });

      const data = await res.json();

      if (res.ok) {
        setMsg({ text: data.msg || "Password updated successfully.", ok: true });
        // Backend revoked all sessions — clear client and redirect
        sessionStorage.removeItem("token");
        sessionStorage.removeItem("role");
        sessionStorage.removeItem("token_expires_at");
        setTimeout(() => { window.location.href = "/login"; }, 1800);
      } else {
        setMsg({ text: data.detail || "Something went wrong.", ok: false });
      }
    } catch (err: any) {
      setMsg({ text: err.message || "Server error.", ok: false });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-base)",
    }}>
      <div style={{
        width: "100%", maxWidth: 420,
        padding: "40px 36px",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 24,
        boxShadow: "0 32px 80px rgba(0,0,0,0.12)",
      }}>
        <h2 style={{
          fontFamily: "var(--font-display)", fontSize: 22, fontWeight: 800,
          color: "var(--text-primary)", marginBottom: 8, textAlign: "center",
        }}>
          Change Password 🔐
        </h2>
        <p style={{ fontSize: 13, color: "var(--text-muted)", textAlign: "center", marginBottom: 28 }}>
          You will be logged out from all devices after changing your password.
        </p>

        {msg && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 20,
            fontSize: 13, textAlign: "center",
            background: msg.ok ? "rgba(34,211,160,0.08)" : "rgba(248,113,113,0.08)",
            border: `1px solid ${msg.ok ? "rgba(34,211,160,0.25)" : "rgba(248,113,113,0.25)"}`,
            color: msg.ok ? "var(--accent-green)" : "var(--accent-red)",
          }}>
            {msg.ok ? "✅" : "❌"} {msg.text}
          </div>
        )}

        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {[
            { label: "Current Password", value: oldPass, set: setOldPass },
            { label: "New Password",     value: newPass, set: setNewPass },
            { label: "Confirm New Password", value: confirmPass, set: setConfirmPass },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label style={{
                display: "block", fontSize: 12, fontWeight: 600,
                color: "var(--text-muted)", letterSpacing: "0.06em",
                textTransform: "uppercase", marginBottom: 6,
              }}>
                {label}
              </label>
              <input
                className="input-field"
                type="password"
                placeholder={label}
                value={value}
                onChange={(e) => set(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleChange()}
              />
            </div>
          ))}

          <button
            className="btn-primary"
            onClick={handleChange}
            disabled={loading}
            style={{ marginTop: 8, padding: "12px", fontSize: 15, opacity: loading ? 0.7 : 1, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading ? "Updating…" : "Update Password"}
          </button>
        </div>
      </div>
    </div>
  );
}
