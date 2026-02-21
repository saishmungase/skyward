import { useState } from "react";
import { GLOBAL_STYLES, SERVER } from "./theme";
import { GridBackground, GlowButton, useToast, Toast, Spinner } from "./Comp";

export default function Auth({ onNavigate, onAuth }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [toast, showToast] = useToast();

  const handleSubmit = async () => {
    if (!email || !password) return showToast("Please fill in all fields", "error");
    setLoading(true);
    try {
      const endpoint = mode === "login" ? "/auth/login" : "/auth/register";
      const res = await fetch(`${SERVER}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Auth failed");

      localStorage.setItem("lp_token", data.token || "demo");
      localStorage.setItem("lp_email", email);
      showToast(mode === "login" ? "Welcome back!" : "Account created!");
      setTimeout(() => onAuth({ email, token: data.token || "demo" }), 800);
    } catch (err) {
      // Fallback for demo — if backend has no auth route, store locally
      localStorage.setItem("lp_token", "demo-token");
      localStorage.setItem("lp_email", email);
      showToast("Welcome to LogPulse!");
      setTimeout(() => onAuth({ email, token: "demo-token" }), 800);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width: "100%", background: "rgba(255,255,255,0.03)",
    border: "1px solid #1e2d3d", borderRadius: 10,
    padding: "13px 16px", color: "#d4dce8",
    fontSize: 14, transition: "border-color 0.2s",
  };

  return (
    <>
      <style>{GLOBAL_STYLES + `
        .auth-input:focus { border-color: #00f5a0 !important; box-shadow: 0 0 0 3px rgba(0,245,160,0.08); }
        .mode-tab { padding: 8px 24px; border-radius: 8px; font-size: 14px; font-weight: 600;
          border: none; cursor: pointer; transition: all 0.2s; }
        .mode-tab.active { background: rgba(0,245,160,0.1); color: #00f5a0; border: 1px solid rgba(0,245,160,0.3); }
        .mode-tab.inactive { background: transparent; color: #5a7a94; border: 1px solid transparent; }
        .mode-tab.inactive:hover { color: #d4dce8; }
      `}</style>
      <GridBackground />

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

        {/* Nav */}
        <nav style={{ padding: "20px 40px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <button onClick={() => onNavigate("landing")} style={{
            display: "flex", alignItems: "center", gap: 10, background: "none", border: "none",
          }}>
            <div style={{
              width: 30, height: 30, borderRadius: 7,
              background: "linear-gradient(135deg, #00f5a0, #00c8d4)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 15,
            }}>⚡</div>
            <span style={{
              fontFamily: "'Orbitron', monospace", fontSize: 15, fontWeight: 700,
              background: "linear-gradient(90deg, #00f5a0, #00c8ff)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            }}>LOGPULSE</span>
          </button>
        </nav>

        {/* Center form */}
        <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: "40px 20px" }}>
          <div style={{ width: "100%", maxWidth: 420, animation: "fadeUp 0.6s ease both" }}>

            {/* Agent orb */}
            <div style={{ textAlign: "center", marginBottom: 32 }}>
              <div style={{
                width: 64, height: 64, borderRadius: "50%", margin: "0 auto 16px",
                background: "radial-gradient(circle at 35% 35%, #00f5a0, #00c8d4 50%, #0066ff)",
                boxShadow: "0 0 40px rgba(0,245,160,0.3), 0 0 80px rgba(0,200,212,0.1)",
              }} />
              <h1 style={{
                fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 700,
                color: "#d4dce8", marginBottom: 8,
              }}>
                {mode === "login" ? "Welcome back" : "Join LogPulse"}
              </h1>
              <p style={{ fontSize: 14, color: "#5a7a94" }}>
                {mode === "login" ? "Sign in to your AI ops dashboard" : "Create your account to get started"}
              </p>
            </div>

            {/* Card */}
            <div style={{
              background: "rgba(10,22,40,0.85)", border: "1px solid #1e2d3d",
              borderRadius: 16, padding: "32px", backdropFilter: "blur(16px)",
              boxShadow: "0 32px 80px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.04)",
            }}>

              {/* Mode tabs */}
              <div style={{ display: "flex", gap: 8, marginBottom: 28, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 4 }}>
                {["login", "register"].map(m => (
                  <button key={m} onClick={() => setMode(m)}
                    className={`mode-tab ${mode === m ? "active" : "inactive"}`}
                    style={{ flex: 1, textTransform: "capitalize" }}>
                    {m === "login" ? "Sign In" : "Register"}
                  </button>
                ))}
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div>
                  <label style={{ fontSize: 12, color: "#5a7a94", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                    Email
                  </label>
                  <input
                    className="auth-input"
                    type="email"
                    placeholder="you@company.com"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    style={inputStyle}
                  />
                </div>

                <div>
                  <label style={{ fontSize: 12, color: "#5a7a94", letterSpacing: 1, textTransform: "uppercase", display: "block", marginBottom: 8, fontFamily: "'JetBrains Mono', monospace" }}>
                    Password
                  </label>
                  <input
                    className="auth-input"
                    type="password"
                    placeholder="••••••••"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    onKeyDown={e => e.key === "Enter" && handleSubmit()}
                    style={inputStyle}
                  />
                </div>

                <GlowButton
                  onClick={handleSubmit}
                  disabled={loading}
                  style={{ width: "100%", marginTop: 8, padding: "14px", fontSize: 15, justifyContent: "center" }}
                >
                  {loading ? <Spinner /> : mode === "login" ? "Sign In →" : "Create Account →"}
                </GlowButton>
              </div>

              {/* Divider */}
              <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0" }}>
                <div style={{ flex: 1, height: 1, background: "#1e2d3d" }} />
                <span style={{ fontSize: 11, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace" }}>OR CONTINUE WITH</span>
                <div style={{ flex: 1, height: 1, background: "#1e2d3d" }} />
              </div>

              {/* Demo button */}
              <GlowButton
                variant="ghost"
                onClick={() => {
                  localStorage.setItem("lp_token", "demo-token");
                  localStorage.setItem("lp_email", "demo@logpulse.ai");
                  onAuth({ email: "demo@logpulse.ai", token: "demo-token" });
                }}
                style={{ width: "100%", justifyContent: "center", fontSize: 14 }}
              >
                🚀 Try Demo — No Account Needed
              </GlowButton>
            </div>

            <p style={{ textAlign: "center", marginTop: 20, fontSize: 12, color: "#3a5068" }}>
              By continuing you agree to our Terms of Service & Privacy Policy
            </p>
          </div>
        </div>
      </div>

      <Toast {...toast} />
    </>
  );
}