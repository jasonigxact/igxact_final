"use client";

import { useState } from "react";

export default function LoginPage() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading]   = useState(false);
  const [error, setError]       = useState("");

  const handleLogin = async () => {
    if (!username || !password) {
      setError("Please enter your credentials.");
      return;
    }

    const apiUrl = process.env.NEXT_PUBLIC_API_URL;

    // Catch misconfiguration immediately — don't hit the network
    if (!apiUrl || apiUrl === "undefined") {
      setError("App is misconfigured: NEXT_PUBLIC_API_URL is not set. Contact support.");
      return;
    }

    setLoading(true);
    setError("");

    const controller = new AbortController();
    // 30s timeout — Render free tier can take up to 20s on cold start
    const timeout = setTimeout(() => controller.abort(), 30000);

    try {
      const res = await fetch(`${apiUrl}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      const text = await res.text();
      let data: any;
      try { data = JSON.parse(text); } catch { data = null; }

      if (res.ok && data?.access_token) {
        sessionStorage.setItem("token", data.access_token);
        sessionStorage.setItem("role", data.role ?? "user");
        sessionStorage.setItem("username", data.username ?? "");
        if (data.expires_in) {
          sessionStorage.setItem("token_expires_at", String(Date.now() + data.expires_in * 1000));
        }
        window.location.href = "/";
      } else if (res.status === 401) {
        setError("Invalid username or password.");
      } else if (res.status === 422) {
        setError("Invalid input. Please check your credentials.");
      } else if (res.status >= 500) {
        setError(`Server error (${res.status}). Please try again in a moment.`);
      } else {
        setError(data?.detail || "Login failed. Please try again.");
      }
    } catch (err: any) {
      clearTimeout(timeout);
      if (err.name === "AbortError") {
        setError("Request timed out. The server may be starting up — please wait 20 seconds and try again.");
      } else if (err.message?.includes("Failed to fetch") || err.message?.includes("NetworkError")) {
        setError("Cannot reach the server. Check that the backend is running and CORS is configured.");
      } else {
        setError(`Connection error: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: "100vh",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      background: "var(--bg-base)",
      position: "relative",
      overflow: "hidden",
    }}>

      {/* Background glow orbs */}
      <div style={{
        position: "absolute", top: "20%", left: "30%",
        width: 500, height: 500, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(37,99,235,0.10) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />
      <div style={{
        position: "absolute", bottom: "10%", right: "20%",
        width: 400, height: 400, borderRadius: "50%",
        background: "radial-gradient(circle, rgba(124,58,237,0.08) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      <div style={{
        width: "100%", maxWidth: 420,
        padding: "40px 36px",
        background: "rgba(255,255,255,0.95)",
        backdropFilter: "blur(24px)",
        border: "1px solid rgba(0,0,0,0.08)",
        borderRadius: 24,
        boxShadow: "0 32px 80px rgba(0,0,0,0.12)",
        position: "relative",
      }}>

        {/* Logo / title */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <div style={{
            width: 56, height: 56, borderRadius: 16,
            background: "linear-gradient(135deg, #2563eb, #7c3aed)",
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: 24, margin: "0 auto 16px",
          }}>🚀</div>
          <h1 style={{ fontFamily: "var(--font-display)", fontSize: 24, fontWeight: 800, color: "var(--text-primary)", marginBottom: 6, letterSpacing: "-0.02em" }}>
            IGXact
          </h1>
          <p style={{ fontSize: 13, color: "var(--text-muted)" }}>Sign in to your dashboard</p>
        </div>

        {/* Error message */}
        {error && (
          <div style={{
            padding: "10px 14px", borderRadius: 10, marginBottom: 20,
            fontSize: 13, background: "rgba(248,113,113,0.08)",
            border: "1px solid rgba(248,113,113,0.25)", color: "#dc2626",
          }}>
            ❌ {error}
          </div>
        )}

        {/* Fields */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Username</label>
            <input
              className="input-field"
              type="text"
              placeholder="admin"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoComplete="username"
            />
          </div>
          <div>
            <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-muted)", letterSpacing: "0.06em", textTransform: "uppercase", marginBottom: 6 }}>Password</label>
            <input
              className="input-field"
              type="password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleLogin()}
              autoComplete="current-password"
            />
          </div>

          <button
            className="btn-primary"
            onClick={handleLogin}
            disabled={loading}
            style={{ marginTop: 8, padding: "13px", fontSize: 15, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, opacity: loading ? 0.75 : 1, cursor: loading ? "not-allowed" : "pointer" }}
          >
            {loading && (
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ animation: "spin 0.8s linear infinite" }}>
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83" />
              </svg>
            )}
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </div>

        <style>{`
          @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        `}</style>
      </div>
    </div>
  );
}
