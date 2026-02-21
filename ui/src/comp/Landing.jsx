import { useState, useEffect } from "react";
import { GLOBAL_STYLES } from "./theme";
import { GridBackground, GlowButton } from "./Comp";

const FEATURES = [
  {
    icon: "⚡",
    title: "Instant Webhook Setup",
    desc: "Generate a unique webhook URL in one click. Paste it into any EC2, GCP, or cloud instance to stream logs instantly.",
  },
  {
    icon: "🧠",
    title: "AI Log Intelligence",
    desc: "Every raw log is analyzed by Llama 3 via Groq in real-time. Noisy logs become clean, structured, actionable insights.",
  },
  {
    icon: "🔴",
    title: "Priority Error Alerts",
    desc: "Errors are automatically escalated to the top of your stream. Our AI agent generates an instant fix suggestion before you even ask.",
  },
  {
    icon: "💬",
    title: "Conversational AI Agent",
    desc: "Chat directly with Gemini 1.5 about your live logs. Ask questions, get root cause analysis, and fix issues through conversation.",
  },
  {
    icon: "📡",
    title: "Real-Time WebSocket Stream",
    desc: "Logs are pushed to your dashboard the moment they arrive — zero polling, zero delay, pure event-driven architecture.",
  },
  {
    icon: "☁️",
    title: "Multi-Cloud Ready",
    desc: "Works with AWS EC2, GCP Compute, Azure VMs, Docker containers, or any system that can make an HTTP request.",
  },
];

const PROBLEMS = [
  { stat: "73%", label: "of downtime goes undetected for over 10 minutes" },
  { stat: "4.2hrs", label: "average time to identify a production incident" },
  { stat: "$5,600", label: "cost per minute of critical system downtime" },
];

const STEPS = [
  { n: "01", title: "Generate", desc: "Create a unique webhook URL from your dashboard in one click." },
  { n: "02", title: "Integrate", desc: "Paste the provided shell command into your cloud instance. Logs start streaming immediately." },
  { n: "03", title: "Monitor", desc: "Watch your AI-cleaned logs stream live. Errors are auto-prioritized and fixes are suggested instantly." },
  { n: "04", title: "Resolve", desc: "Chat with the AI agent to diagnose issues, understand root causes, and ship fixes faster." },
];

export default function Landing({ onNavigate }) {
  const [visible, setVisible] = useState(false);
  const [typedText, setTypedText] = useState("");
  const fullText = "Your cloud logs, understood.";

  useEffect(() => {
    setVisible(true);
    let i = 0;
    const timer = setInterval(() => {
      setTypedText(fullText.slice(0, i + 1));
      i++;
      if (i >= fullText.length) clearInterval(timer);
    }, 60);
    return () => clearInterval(timer);
  }, []);

  return (
    <>
      <style>{GLOBAL_STYLES + `
        .nav-link { color: #5a7a94; font-size: 14px; font-weight: 500; transition: color 0.2s; cursor: pointer; }
        .nav-link:hover { color: #00f5a0; }
        .feature-card {
          background: rgba(10,22,40,0.6); border: 1px solid #1e2d3d;
          border-radius: 14px; padding: 28px; transition: all 0.3s; cursor: default;
        }
        .feature-card:hover { border-color: rgba(0,245,160,0.3); transform: translateY(-4px); box-shadow: 0 12px 40px rgba(0,0,0,0.4); }
        .problem-card { text-align: center; }
        .step-item { display: flex; gap: 20px; align-items: flex-start; }
        .step-line { width: 1px; background: linear-gradient(to bottom, #1e2d3d, transparent); margin-left: 19px; height: 40px; }
      `}</style>
      <GridBackground />

      <div style={{ position: "relative", zIndex: 1 }}>

        {/* Nav */}
        <nav style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "20px 48px", borderBottom: "1px solid rgba(30,45,61,0.6)",
          backdropFilter: "blur(12px)", position: "sticky", top: 0, zIndex: 100,
          background: "rgba(5,8,13,0.8)",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{
              width: 32, height: 32, borderRadius: 8,
              background: "linear-gradient(135deg, #00f5a0, #00c8d4)",
              display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16,
            }}>⚡</div>
            <span style={{
              fontFamily: "'Orbitron', monospace", fontSize: 16, fontWeight: 700,
              background: "linear-gradient(90deg, #00f5a0, #00c8ff)",
              WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
              letterSpacing: 1,
            }}>LOGPULSE</span>
          </div>
          <div style={{ display: "flex", gap: 32 }}>
            <span className="nav-link">Features</span>
            <span className="nav-link">How it works</span>
            <span className="nav-link">Pricing</span>
          </div>
          <div style={{ display: "flex", gap: 12 }}>
            <GlowButton variant="ghost" onClick={() => onNavigate("auth")} style={{ padding: "8px 20px", fontSize: 13 }}>
              Sign In
            </GlowButton>
            <GlowButton onClick={() => onNavigate("auth")} style={{ padding: "8px 20px", fontSize: 13 }}>
              Get Started
            </GlowButton>
          </div>
        </nav>

        {/* Hero */}
        <section style={{ padding: "100px 48px 80px", textAlign: "center", maxWidth: 900, margin: "0 auto" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(0,245,160,0.06)", border: "1px solid rgba(0,245,160,0.2)",
            borderRadius: 20, padding: "6px 16px", marginBottom: 32,
            animation: "fadeUp 0.6s ease both",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00f5a0", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 12, color: "#00f5a0", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
              AGENTIC AI · REAL-TIME LOG INTELLIGENCE
            </span>
          </div>

          <h1 style={{
            fontFamily: "'Orbitron', monospace", fontSize: "clamp(36px, 6vw, 72px)",
            fontWeight: 900, lineHeight: 1.1, letterSpacing: -1,
            color: "#d4dce8", marginBottom: 8,
            animation: "fadeUp 0.7s 0.1s ease both",
          }}>
            Stop guessing.
          </h1>
          <h1 style={{
            fontFamily: "'Orbitron', monospace", fontSize: "clamp(36px, 6vw, 72px)",
            fontWeight: 900, lineHeight: 1.1, letterSpacing: -1,
            background: "linear-gradient(90deg, #00f5a0, #00c8ff, #00f5a0)",
            backgroundSize: "200% auto",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
            animation: "shimmer 3s linear infinite, fadeUp 0.7s 0.1s ease both",
            marginBottom: 32,
          }}>
            {typedText}<span style={{ animation: "blink 1s infinite" }}>|</span>
          </h1>

          <p style={{
            fontSize: 18, color: "#5a7a94", lineHeight: 1.7, maxWidth: 580, margin: "0 auto 40px",
            animation: "fadeUp 0.8s 0.2s ease both",
          }}>
            LogPulse connects to any cloud instance, streams raw logs through an AI agent that cleans, classifies, and fixes issues — before your users notice.
          </p>

          <div style={{ display: "flex", gap: 14, justifyContent: "center", animation: "fadeUp 0.9s 0.3s ease both" }}>
            <GlowButton onClick={() => onNavigate("auth")} style={{ padding: "14px 32px", fontSize: 15 }}>
              ⚡ Start Monitoring Free
            </GlowButton>
            <GlowButton variant="ghost" style={{ padding: "14px 32px", fontSize: 15 }}>
              Watch Demo →
            </GlowButton>
          </div>

          {/* Fake terminal */}
          <div style={{
            marginTop: 64, background: "rgba(10,22,40,0.9)",
            border: "1px solid #1e2d3d", borderRadius: 14,
            overflow: "hidden", textAlign: "left",
            boxShadow: "0 32px 80px rgba(0,0,0,0.5), 0 0 0 1px rgba(0,245,160,0.04)",
            animation: "fadeUp 1s 0.4s ease both",
          }}>
            <div style={{ display: "flex", gap: 8, padding: "12px 16px", borderBottom: "1px solid #1e2d3d", background: "rgba(255,255,255,0.02)" }}>
              {["#ff4545","#ffb800","#00f5a0"].map((c, i) => (
                <div key={i} style={{ width: 12, height: 12, borderRadius: "50%", background: c, opacity: 0.8 }} />
              ))}
              <span style={{ marginLeft: 8, fontSize: 11, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace" }}>
                logpulse-agent · live stream
              </span>
            </div>
            <div style={{ padding: "20px 24px", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, lineHeight: 2 }}>
              {[
                { t: "12:04:01", lvl: "INFO",  c: "#00c8ff", msg: "Auth service initialized · users: 2,847 active sessions" },
                { t: "12:04:03", lvl: "WARN",  c: "#ffb800", msg: "DB response time degraded · p99: 847ms (threshold: 500ms)" },
                { t: "12:04:05", lvl: "ERROR", c: "#ff4545", msg: "Payment gateway timeout · txn_id: TXN-9921 · retry #3" },
                { t: "12:04:05", lvl: "AI FIX",c: "#a78bfa", msg: "→ Detected Stripe API rate limit. Recommend exponential backoff." },
                { t: "12:04:07", lvl: "INFO",  c: "#00c8ff", msg: "Cache hit ratio: 94.2% · Redis cluster healthy" },
              ].map((row, i) => (
                <div key={i} style={{ display: "flex", gap: 16, alignItems: "baseline" }}>
                  <span style={{ color: "#3a5068", flexShrink: 0 }}>{row.t}</span>
                  <span style={{ color: row.c, minWidth: 56, flexShrink: 0, fontWeight: 700, fontSize: 10, letterSpacing: 1 }}>{row.lvl}</span>
                  <span style={{ color: row.lvl === "AI FIX" ? "#a78bfa" : "#7a9ab4" }}>{row.msg}</span>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Problem */}
        <section style={{ padding: "80px 48px", borderTop: "1px solid #1e2d3d", borderBottom: "1px solid #1e2d3d", background: "rgba(255,69,69,0.02)" }}>
          <div style={{ maxWidth: 960, margin: "0 auto", textAlign: "center" }}>
            <p style={{ fontSize: 12, color: "#ff4545", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, marginBottom: 16 }}>THE PROBLEM</p>
            <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(24px, 4vw, 40px)", fontWeight: 700, color: "#d4dce8", marginBottom: 48 }}>
              Raw logs are noise. Downtime is expensive.
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 24 }}>
              {PROBLEMS.map((p, i) => (
                <div key={i} className="problem-card" style={{ padding: "32px 24px", background: "rgba(255,69,69,0.04)", border: "1px solid rgba(255,69,69,0.12)", borderRadius: 14 }}>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 40, fontWeight: 900, color: "#ff4545", marginBottom: 10 }}>{p.stat}</div>
                  <div style={{ fontSize: 14, color: "#5a7a94", lineHeight: 1.5 }}>{p.label}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Features */}
        <section style={{ padding: "80px 48px" }}>
          <div style={{ maxWidth: 1000, margin: "0 auto" }}>
            <p style={{ fontSize: 12, color: "#00f5a0", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, marginBottom: 16, textAlign: "center" }}>CAPABILITIES</p>
            <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(24px, 4vw, 36px)", fontWeight: 700, color: "#d4dce8", marginBottom: 48, textAlign: "center" }}>
              Your AI-powered ops co-pilot
            </h2>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 20 }}>
              {FEATURES.map((f, i) => (
                <div key={i} className="feature-card">
                  <div style={{ fontSize: 28, marginBottom: 14 }}>{f.icon}</div>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 600, color: "#d4dce8", marginBottom: 10 }}>{f.title}</div>
                  <div style={{ fontSize: 13, color: "#5a7a94", lineHeight: 1.6 }}>{f.desc}</div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* How it works */}
        <section style={{ padding: "80px 48px", borderTop: "1px solid #1e2d3d" }}>
          <div style={{ maxWidth: 680, margin: "0 auto" }}>
            <p style={{ fontSize: 12, color: "#00c8ff", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 2, marginBottom: 16, textAlign: "center" }}>HOW IT WORKS</p>
            <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(22px, 3vw, 32px)", fontWeight: 700, color: "#d4dce8", marginBottom: 48, textAlign: "center" }}>
              From chaos to clarity in 4 steps
            </h2>
            <div style={{ display: "flex", flexDirection: "column" }}>
              {STEPS.map((s, i) => (
                <div key={i}>
                  <div className="step-item">
                    <div style={{
                      width: 40, height: 40, borderRadius: 10, flexShrink: 0,
                      background: "rgba(0,245,160,0.08)", border: "1px solid rgba(0,245,160,0.25)",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#00f5a0", fontWeight: 700,
                    }}>{s.n}</div>
                    <div style={{ paddingTop: 8 }}>
                      <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 14, fontWeight: 600, color: "#d4dce8", marginBottom: 6 }}>{s.title}</div>
                      <div style={{ fontSize: 13, color: "#5a7a94", lineHeight: 1.6 }}>{s.desc}</div>
                    </div>
                  </div>
                  {i < STEPS.length - 1 && <div className="step-line" />}
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section style={{ padding: "80px 48px", textAlign: "center", borderTop: "1px solid #1e2d3d" }}>
          <div style={{
            display: "inline-flex", alignItems: "center", gap: 8,
            background: "rgba(0,245,160,0.06)", border: "1px solid rgba(0,245,160,0.2)",
            borderRadius: 20, padding: "6px 16px", marginBottom: 32,
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: "#00f5a0", animation: "pulse 2s infinite" }} />
            <span style={{ fontSize: 11, color: "#00f5a0", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1 }}>
              FREE TO START · NO CREDIT CARD
            </span>
          </div>
          <h2 style={{ fontFamily: "'Orbitron', monospace", fontSize: "clamp(24px, 4vw, 44px)", fontWeight: 800, color: "#d4dce8", marginBottom: 20 }}>
            Ready to deploy your AI agent?
          </h2>
          <p style={{ fontSize: 16, color: "#5a7a94", marginBottom: 36 }}>
            Get your first webhook running in under 2 minutes.
          </p>
          <GlowButton onClick={() => onNavigate("auth")} style={{ padding: "16px 40px", fontSize: 16 }}>
            ⚡ Launch LogPulse Free
          </GlowButton>
        </section>

        {/* Footer */}
        <footer style={{ padding: "24px 48px", borderTop: "1px solid #1e2d3d", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, color: "#3a5068", letterSpacing: 1 }}>LOGPULSE</span>
          <span style={{ fontSize: 12, color: "#3a5068" }}>© 2025 · Built on Groq + Gemini</span>
        </footer>

      </div>
    </>
  );
}