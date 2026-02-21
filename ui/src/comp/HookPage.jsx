import { useState, useEffect, useRef, useCallback } from "react";
import { GLOBAL_STYLES, SERVER, WS_SERVER, LEVEL_STYLES } from "./theme.js";
import { GridBackground, GlowButton, useToast, Toast, Badge, Spinner, AgentOrb } from "./Comp";

async function requestAIFix(instanceId, entryId) {
  const res = await fetch(`${SERVER}/ai/fix`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId, entryId }),
  });
  if (!res.ok) throw new Error("AI fix unavailable");
  return (await res.json()).suggestion;
}

async function requestAIChat(instanceId, entryId, message) {
  const res = await fetch(`${SERVER}/ai/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instanceId, entryId, message }),
  });
  if (!res.ok) throw new Error("AI chat unavailable");
  return (await res.json()).reply;
}

async function saveAutoFixConfig(instanceId, enabled, command) {
  const res = await fetch(`${SERVER}/autofix/config/${instanceId}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ enabled, command }),
  });
  if (!res.ok) throw new Error("Failed to save config");
  return (await res.json()).autoFix;
}

async function manualTriggerFix(instanceId) {
  const res = await fetch(`${SERVER}/autofix/trigger/${instanceId}`, { method: "POST" });
  return res.json();
}

function LogEntry({ entry, onGetFix }) {
  const cleaned = entry.cleaned || {};
  const level = (cleaned.level || "UNKNOWN").toUpperCase();
  const style = LEVEL_STYLES[level] || LEVEL_STYLES.UNKNOWN;
  const time = new Date(entry.timestamp).toLocaleTimeString();
  const isError = level === "ERROR" || level === "WARN";

  return (
    <div style={{
      background: "rgba(10,22,40,0.7)", border: `1px solid ${style.border}30`,
      borderLeft: `3px solid ${style.border}`, borderRadius: 8, padding: "12px 14px",
      animation: "slideIn 0.3s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
        <span style={{
          fontSize: 9, fontWeight: 700, letterSpacing: "1.5px", padding: "2px 8px", borderRadius: 4,
          textTransform: "uppercase", background: style.bg, color: style.text,
          fontFamily: "'JetBrains Mono', monospace",
        }}>{level}</span>
        {cleaned.service && (
          <span style={{ fontSize: 10, color: "#00c8ff", background: "rgba(0,200,255,0.06)", padding: "2px 8px", borderRadius: 4, fontFamily: "'JetBrains Mono', monospace" }}>
            {cleaned.service}
          </span>
        )}
        {entry.aiError && <Badge color="#ffb800">AI Fallback</Badge>}
        <span style={{ fontSize: 10, color: "#3a5068", marginLeft: "auto", fontFamily: "'JetBrains Mono', monospace" }}>{time}</span>
        {isError && onGetFix && (
          <button onClick={() => onGetFix(entry)} style={{
            background: "rgba(167,139,250,0.1)", border: "1px solid rgba(167,139,250,0.3)",
            borderRadius: 6, padding: "3px 10px", fontSize: 10, color: "#a78bfa",
            cursor: "pointer", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
          }}>🤖 Get Fix</button>
        )}
      </div>
      <div style={{ fontSize: 12, color: "#d4dce8", lineHeight: 1.6 }}>{cleaned.message || entry.raw}</div>
      {cleaned.anomaly && (
        <div style={{ fontSize: 10, color: "#ffb800", marginTop: 6, paddingTop: 6, borderTop: "1px solid rgba(255,184,0,0.1)" }}>
          ⚠ {cleaned.anomalyReason || "Anomaly detected"}
        </div>
      )}
      <div style={{ fontSize: 10, color: "#3a5068", marginTop: 6, paddingTop: 6, borderTop: "1px solid #1e2d3d", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", fontFamily: "'JetBrains Mono', monospace" }}>
        raw: {entry.raw}
      </div>
    </div>
  );
}

function PriorityAlert({ alert, onGetFix, onDismiss }) {
  return (
    <div style={{
      background: "rgba(255,69,69,0.06)", border: "1px solid rgba(255,69,69,0.35)",
      borderRadius: 10, padding: "14px 16px", animation: "slideIn 0.3s ease",
      borderLeft: "3px solid #ff4545",
    }}>
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 10 }}>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
            <span style={{ fontSize: 10, color: "#ff4545", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: 1 }}>
              ⚠ PRIORITY · {(alert.cleaned?.level || "ERROR").toUpperCase()}
            </span>
            {alert.cleaned?.service && <span style={{ fontSize: 10, color: "#5a7a94" }}>{alert.cleaned.service}</span>}
          </div>
          <div style={{ fontSize: 12, color: "#d4dce8", lineHeight: 1.5, marginBottom: 8 }}>
            {alert.cleaned?.message || alert.raw}
          </div>
          {alert.aiSuggestion && (
            <div style={{ background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 6, padding: "8px 10px" }}>
              <div style={{ fontSize: 10, color: "#a78bfa", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, marginBottom: 4 }}>🤖 AI FIX READY</div>
              <div style={{ fontSize: 11, color: "#b8a8e8", lineHeight: 1.5 }}>{alert.aiSuggestion.slice(0, 150)}...</div>
            </div>
          )}
        </div>
        <div style={{ display: "flex", flexDirection: "column", gap: 6, flexShrink: 0 }}>
          <button onClick={() => onGetFix(alert)} style={{
            background: "rgba(167,139,250,0.12)", border: "1px solid rgba(167,139,250,0.35)",
            borderRadius: 6, padding: "6px 12px", fontSize: 11, color: "#a78bfa", cursor: "pointer", fontWeight: 600, whiteSpace: "nowrap",
          }}>View Fix →</button>
          <button onClick={() => onDismiss(alert.id)} style={{
            background: "none", border: "1px solid #1e2d3d", borderRadius: 6,
            padding: "5px 12px", fontSize: 11, color: "#3a5068", cursor: "pointer",
          }}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}

function FixHistoryItem({ fix }) {
  const statusColors = {
    sent:         { color: "#ffb800", label: "⏳ Sent" },
    agent_offline:{ color: "#ff4545", label: "⚡ Offline" },
    success:      { color: "#00f5a0", label: "✓ Success" },
    failed:       { color: "#ff4545", label: "✕ Failed" },
  };
  const s = statusColors[fix.status] || { color: "#5a7a94", label: fix.status };

  return (
    <div style={{
      background: "rgba(10,22,40,0.6)", border: "1px solid #1e2d3d", borderRadius: 8,
      padding: "10px 12px", fontSize: 11,
    }}>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ color: s.color, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>{s.label}</span>
        <span style={{ color: "#3a5068", fontFamily: "'JetBrains Mono', monospace", fontSize: 10 }}>
          {new Date(fix.triggeredAt).toLocaleTimeString()}
        </span>
      </div>
      <div style={{ color: "#7a9ab4", fontFamily: "'JetBrains Mono', monospace", fontSize: 10, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
        $ {fix.command}
      </div>
      {fix.triggeredBy === "manual" && (
        <div style={{ fontSize: 9, color: "#3a5068", marginTop: 3 }}>Triggered manually</div>
      )}
      {fix.stdout && (
        <div style={{ marginTop: 6, background: "#030608", borderRadius: 4, padding: "4px 8px", fontSize: 10, color: "#00f5a0", fontFamily: "'JetBrains Mono', monospace", maxHeight: 60, overflow: "auto" }}>
          {fix.stdout}
        </div>
      )}
      {fix.stderr && (
        <div style={{ marginTop: 4, background: "#030608", borderRadius: 4, padding: "4px 8px", fontSize: 10, color: "#ff4545", fontFamily: "'JetBrains Mono', monospace", maxHeight: 40, overflow: "auto" }}>
          {fix.stderr}
        </div>
      )}
    </div>
  );
}

function AutoFixPanel({ instanceId, autoFix, agentOnline, fixHistory, onSave, onManualTrigger }) {
  const [enabled, setEnabled]   = useState(autoFix.enabled);
  const [command, setCommand]   = useState(autoFix.command);
  const [saving, setSaving]     = useState(false);
  const [triggering, setTriggering] = useState(false);
  const [dirty, setDirty]       = useState(false);

  useEffect(() => {
    setEnabled(autoFix.enabled);
    setCommand(autoFix.command);
    setDirty(false);
  }, [autoFix.enabled, autoFix.command]);

  const handleToggle = () => {
    setEnabled(e => !e);
    setDirty(true);
  };

  const handleSave = async () => {
    setSaving(true);
    try { await onSave(enabled, command); setDirty(false); }
    finally { setSaving(false); }
  };

  const handleTrigger = async () => {
    setTriggering(true);
    try { await onManualTrigger(); }
    finally { setTimeout(() => setTriggering(false), 1500); }
  };

  const EXAMPLES = [
    "pm2 restart all",
    "systemctl restart myapp",
    "docker restart $(docker ps -q)",
    "nginx -s reload",
    "sudo service app restart && echo restarted",
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>

      {/* Toggle row */}
      <div style={{ background: "rgba(10,22,40,0.7)", border: `1px solid ${enabled ? "rgba(0,245,160,0.3)" : "#1e2d3d"}`, borderRadius: 12, padding: "16px 18px" }}>
        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: enabled ? 16 : 0 }}>
          <div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 700, color: "#d4dce8", marginBottom: 4 }}>
              Auto-Fix Command
            </div>
            <div style={{ fontSize: 11, color: "#5a7a94" }}>
              Run a shell command automatically when your server throws an ERROR
            </div>
          </div>

          {/* Toggle switch */}
          <div
            onClick={handleToggle}
            style={{
              width: 48, height: 26, borderRadius: 13, cursor: "pointer", flexShrink: 0,
              background: enabled ? "linear-gradient(135deg, #00f5a0, #00c8d4)" : "rgba(255,255,255,0.08)",
              border: `1px solid ${enabled ? "transparent" : "#1e2d3d"}`,
              position: "relative", transition: "all 0.3s",
              boxShadow: enabled ? "0 0 16px rgba(0,245,160,0.3)" : "none",
            }}
          >
            <div style={{
              position: "absolute", top: 3, width: 18, height: 18, borderRadius: "50%",
              background: "#fff", transition: "left 0.3s",
              left: enabled ? 27 : 3,
              boxShadow: "0 1px 4px rgba(0,0,0,0.3)",
            }} />
          </div>
        </div>

        {enabled && (
          <>
            <div style={{ marginBottom: 10 }}>
              <label style={{ fontSize: 11, color: "#5a7a94", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: 1, display: "block", marginBottom: 8 }}>
                Command to execute on error
              </label>
              <input
                type="text"
                value={command}
                onChange={e => { setCommand(e.target.value); setDirty(true); }}
                placeholder="e.g. pm2 restart all"
                style={{
                  width: "100%", background: "rgba(0,0,0,0.3)", border: "1px solid #1e2d3d",
                  borderRadius: 8, padding: "10px 14px", color: "#d4dce8", fontSize: 13,
                  fontFamily: "'JetBrains Mono', monospace", outline: "none",
                  transition: "border-color 0.2s",
                  boxSizing: "border-box",
                }}
              />
            </div>

            {/* Example commands */}
            <div style={{ marginBottom: 14 }}>
              <div style={{ fontSize: 10, color: "#3a5068", marginBottom: 6, fontFamily: "'JetBrains Mono', monospace" }}>EXAMPLES:</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                {EXAMPLES.map(ex => (
                  <button key={ex} onClick={() => { setCommand(ex); setDirty(true); }} style={{
                    background: "rgba(0,200,255,0.04)", border: "1px solid rgba(0,200,255,0.15)",
                    borderRadius: 4, padding: "3px 8px", fontSize: 10, color: "#5a7a94",
                    cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                    transition: "all 0.2s",
                  }}>
                    {ex}
                  </button>
                ))}
              </div>
            </div>

            <div style={{ display: "flex", gap: 8 }}>
              <GlowButton
                onClick={handleSave}
                disabled={saving || !dirty}
                style={{ flex: 1, justifyContent: "center", fontSize: 12, padding: "8px" }}
              >
                {saving ? <Spinner /> : dirty ? "💾 Save Changes" : "✓ Saved"}
              </GlowButton>
              <GlowButton
                variant="accent"
                onClick={handleTrigger}
                disabled={triggering || !command.trim() || !agentOnline}
                style={{ flex: 1, justifyContent: "center", fontSize: 12, padding: "8px" }}
                title={!agentOnline ? "Agent is offline" : "Run the fix command now"}
              >
                {triggering ? <Spinner /> : "⚡ Run Now"}
              </GlowButton>
            </div>

            {!agentOnline && (
              <div style={{ marginTop: 10, fontSize: 11, color: "#ffb800", display: "flex", alignItems: "center", gap: 6 }}>
                ⚠ Agent is offline — deploy logpulse-agent.js to enable auto-fix
              </div>
            )}
          </>
        )}
      </div>

      {/* Fix history */}
      {fixHistory.length > 0 && (
        <div>
          <div style={{ fontSize: 10, color: "#5a7a94", fontFamily: "'JetBrains Mono', monospace", textTransform: "uppercase", letterSpacing: 1, marginBottom: 8 }}>
            Fix History ({fixHistory.length})
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 300, overflowY: "auto" }}>
            {[...fixHistory].reverse().map(fix => (
              <FixHistoryItem key={fix.fixId} fix={fix} />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function FixModal({ alert, instanceId, onClose }) {
  const [chatHistory, setChatHistory] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const chatRef = useRef(null);

  useEffect(() => {
    if (chatRef.current) chatRef.current.scrollTop = chatRef.current.scrollHeight;
  }, [chatHistory]);

  const sendMessage = async (msg) => {
    if (!msg.trim()) return;
    setChatHistory(h => [...h, { role: "user", text: msg }]);
    setInput("");
    setLoading(true);
    try {
      const reply = await requestAIChat(instanceId, alert?.id, msg);
      setChatHistory(h => [...h, { role: "agent", text: reply }]);
    } catch {
      setChatHistory(h => [...h, { role: "agent", text: "Failed to reach AI. Check the server's GEMINI_API_KEY." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      position: "fixed", inset: 0, background: "rgba(0,0,0,0.8)", backdropFilter: "blur(10px)",
      display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1000,
      animation: "fadeIn 0.2s ease", padding: 20,
    }}>
      <div style={{
        background: "rgba(10,22,40,0.99)", border: "1px solid #1e2d3d", borderRadius: 16,
        width: "100%", maxWidth: "90vw", maxHeight: "90vh", display: "flex", flexDirection: "column",
        boxShadow: "0 40px 100px rgba(0,0,0,0.8)", animation: "fadeUp 0.3s ease",
      }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid #1e2d3d", display: "flex", alignItems: "center", gap: 12 }}>
          <AgentOrb size={36} active />
          <div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 14, fontWeight: 700, color: "#d4dce8" }}>AI Agent — Error Analysis</div>
            <div style={{ fontSize: 11, color: "#5a7a94" }}>Powered by Gemini (server-side) · Context: last 10 logs</div>
          </div>
          <button onClick={onClose} style={{ marginLeft: "auto", background: "none", border: "1px solid #1e2d3d", borderRadius: 6, padding: "6px 12px", color: "#5a7a94", cursor: "pointer", fontSize: 13 }}>
            ✕ Close
          </button>
        </div>

        <div style={{ padding: "16px 24px", borderBottom: "1px solid #1e2d3d", background: "rgba(255,69,69,0.04)" }}>
          <div style={{ fontSize: 10, color: "#ff4545", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, marginBottom: 6, letterSpacing: 1 }}>FAILING LOG</div>
          <div style={{ fontSize: 12, color: "#d4dce8", lineHeight: 1.5 }}>{alert?.cleaned?.message || alert?.raw}</div>
        </div>

        {alert?.aiSuggestion && (
          <div style={{ padding: "16px 24px", borderBottom: "1px solid #1e2d3d", background: "rgba(167,139,250,0.04)", maxHeight: "25vh", overflowY: "auto" }}>
            <div style={{ fontSize: 10, color: "#a78bfa", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, marginBottom: 8, letterSpacing: 1 }}>🤖 AI FIX SUGGESTION</div>
            <div style={{ fontSize: 12, color: "#c8b8f0", lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{alert.aiSuggestion}</div>
          </div>
        )}

        <div ref={chatRef} style={{ flex: 1, overflowY: "auto", padding: "16px 24px", display: "flex", flexDirection: "column", gap: 12 }}>
          {chatHistory.length === 0 && (
            <div style={{ textAlign: "center", color: "#3a5068", fontSize: 12, padding: "20px 0" }}>
              <div style={{ marginBottom: 12 }}>Ask me anything about this error.</div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8, justifyContent: "center" }}>
                {["What caused this?", "How do I fix it?", "Will it happen again?"].map(q => (
                  <button key={q} onClick={() => sendMessage(q)} style={{
                    background: "rgba(0,245,160,0.06)", border: "1px solid rgba(0,245,160,0.2)",
                    borderRadius: 20, padding: "5px 14px", fontSize: 11, color: "#00f5a0",
                    cursor: "pointer", fontFamily: "'JetBrains Mono', monospace",
                  }}>{q}</button>
                ))}
              </div>
            </div>
          )}
          {chatHistory.map((m, i) => (
            <div key={i} style={{ display: "flex", gap: 10, alignItems: "flex-start", flexDirection: m.role === "user" ? "row-reverse" : "row" }}>
              <div style={{
                width: 28, height: 28, borderRadius: "50%", flexShrink: 0,
                background: m.role === "user" ? "linear-gradient(135deg, #00c8ff, #0066ff)" : "radial-gradient(circle at 35% 35%, #00f5a0, #00c8d4 50%, #0066ff)",
                display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12,
              }}>
                {m.role === "user" ? "U" : "🤖"}
              </div>
              <div style={{
                maxWidth: "85%",
                background: m.role === "user" ? "rgba(0,200,255,0.08)" : "rgba(167,139,250,0.08)",
                border: `1px solid ${m.role === "user" ? "rgba(0,200,255,0.2)" : "rgba(167,139,250,0.2)"}`,
                borderRadius: 10, padding: "10px 14px", fontSize: 12, color: "#d4dce8", lineHeight: 1.6,
                whiteSpace: "pre-wrap",
              }}>
                {m.text}
              </div>
            </div>
          ))}
          {loading && (
            <div style={{ display: "flex", gap: 10, alignItems: "center" }}>
              <AgentOrb size={28} active />
              <div style={{ fontSize: 11, color: "#5a7a94", fontFamily: "'JetBrains Mono', monospace" }}>AI agent thinking...</div>
            </div>
          )}
        </div>

        <div style={{ padding: "16px 24px", borderTop: "1px solid #1e2d3d", display: "flex", gap: 10 }}>
          <input
            type="text" value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === "Enter" && !loading && sendMessage(input)}
            placeholder="Ask about this error..."
            style={{ flex: 1, background: "rgba(255,255,255,0.03)", border: "1px solid #1e2d3d", borderRadius: 8, padding: "10px 14px", color: "#d4dce8", fontSize: 13, outline: "none" }}
          />
          <GlowButton onClick={() => sendMessage(input)} disabled={loading || !input.trim()} style={{ padding: "10px 18px" }}>
            {loading ? <Spinner /> : "Send"}
          </GlowButton>
        </div>
      </div>
    </div>
  );
}

function FixResultToast({ result, onDismiss }) {
  const success = result?.success;
  return (
    <div style={{
      position: "fixed", bottom: 80, right: 24, zIndex: 9998,
      background: "rgba(10,22,40,0.98)",
      border: `1px solid ${success ? "rgba(0,245,160,0.4)" : "rgba(255,69,69,0.4)"}`,
      borderRadius: 12, padding: "16px 20px", maxWidth: 340,
      boxShadow: `0 8px 32px rgba(0,0,0,0.6)`,
      animation: "slideIn 0.3s ease",
    }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
        <span style={{ fontSize: 18 }}>{success ? "✅" : "❌"}</span>
        <div>
          <div style={{ fontSize: 13, fontWeight: 700, color: success ? "#00f5a0" : "#ff4545" }}>
            Auto-Fix {success ? "Succeeded" : "Failed"}
          </div>
          <div style={{ fontSize: 10, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace" }}>
            $ {result.command}
          </div>
        </div>
        <button onClick={onDismiss} style={{ marginLeft: "auto", background: "none", border: "none", color: "#3a5068", cursor: "pointer", fontSize: 16 }}>✕</button>
      </div>
      {result.stdout && (
        <div style={{ background: "#030608", borderRadius: 6, padding: "6px 10px", fontSize: 10, color: "#00f5a0", fontFamily: "'JetBrains Mono', monospace", maxHeight: 60, overflow: "auto" }}>
          {result.stdout}
        </div>
      )}
      {result.stderr && (
        <div style={{ marginTop: 4, background: "#030608", borderRadius: 6, padding: "6px 10px", fontSize: 10, color: "#ff4545", fontFamily: "'JetBrains Mono', monospace", maxHeight: 40, overflow: "auto" }}>
          {result.stderr}
        </div>
      )}
    </div>
  );
}

export default function HookPage({ instance, onBack }) {
  const [logs, setLogs]               = useState([]);
  const [priorities, setPriorities]   = useState([]);
  const [dismissedIds, setDismissedIds] = useState(new Set());
  const [wsStatus, setWsStatus]       = useState("disconnected");
  const [filter, setFilter]           = useState("ALL");
  const [stats, setStats]             = useState({ total: 0, error: 0, warn: 0, anomaly: 0 });
  const [fixModal, setFixModal]       = useState(null);
  const [tab, setTab]                 = useState("logs");
  const [toast, showToast]            = useToast();
  const [copied, setCopied]           = useState(false);

  const [autoFix, setAutoFix]         = useState({ enabled: false, command: "" });
  const [agentOnline, setAgentOnline] = useState(false);
  const [fixHistory, setFixHistory]   = useState([]);
  const [fixResultToast, setFixResultToast] = useState(null);

  const wsRef       = useRef(null);
  const streamRef   = useRef(null);
  const logsRef     = useRef([]);
  const showToastRef = useRef(showToast);
  useEffect(() => { showToastRef.current = showToast; }, [showToast]);

  const webhookUrl = instance?.webhookUrl || `${SERVER}/ingest/${instance?.instanceId}`;

  const shellSnippet = `# ─── LogPulse Agent Setup ───────────────────────────────────────
# 1. Copy this file to your server
# 2. npm install ws
# 3. Run the agent

LOGPULSE_WS="${WS_SERVER}" \\
LOGPULSE_ID="${instance?.instanceId}" \\
LOG_FILE=/var/log/app.log \\
node logpulse-agent.js

# ─── OR stream via pipe ─────────────────────────────────────────
tail -F /var/log/app.log | \\
  LOGPULSE_WS="${WS_SERVER}" \\
  LOGPULSE_ID="${instance?.instanceId}" \\
  node logpulse-agent.js

# ─── OR one-time HTTP test (no agent needed) ─────────────────────
curl -X POST "${webhookUrl}" \\
  -H "Content-Type: application/json" \\
  -d '{"log_line": "INFO Server started on port 3000"}'`;

  const copySnippet = () => {
    navigator.clipboard.writeText(shellSnippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    showToastRef.current("Command copied! Paste it in your cloud instance.");
  };

  const getAiFix = useCallback(async (entry) => {
    try {
      if (entry.aiSuggestion) { setFixModal(entry); return; }
      const suggestion = await requestAIFix(instance?.instanceId, entry.id);
      const enriched = { ...entry, aiSuggestion: suggestion };
      setFixModal(enriched);
      setPriorities(prev => prev.map(p => p.id === entry.id ? enriched : p));
      logsRef.current = logsRef.current.map(l => l.id === entry.id ? enriched : l);
      setLogs(prev => prev.map(l => l.id === entry.id ? enriched : l));
    } catch {
      showToastRef.current("Failed to get AI fix. Check the server's GEMINI_API_KEY.", "error");
    }
  }, [instance]);

  const handleSaveAutoFix = async (enabled, command) => {
    try {
      const updated = await saveAutoFixConfig(instance?.instanceId, enabled, command);
      setAutoFix(updated);
      showToastRef.current(enabled ? "Auto-fix enabled!" : "Auto-fix disabled");
    } catch {
      showToastRef.current("Failed to save config", "error");
    }
  };

  const handleManualTrigger = async () => {
    try {
      const res = await manualTriggerFix(instance?.instanceId);
      if (!res.ok && res.fix?.status === "agent_offline") {
        showToastRef.current("Agent is offline — deploy logpulse-agent.js first", "error");
      } else {
        showToastRef.current("Fix command sent to agent!");
      }
    } catch {
      showToastRef.current("Failed to trigger fix", "error");
    }
  };

  const connectWebSocket = useCallback(() => {
    if (!instance?.instanceId) return;
    if (wsRef.current) wsRef.current.close();
    setWsStatus("connecting");

    const ws = new WebSocket(WS_SERVER);
    wsRef.current = ws;

    ws.onopen = () => {
      ws.send(JSON.stringify({ type: "subscribe", instanceId: instance.instanceId }));
      setWsStatus("connected");
    };

    ws.onmessage = (event) => {
      const data = JSON.parse(event.data);

      if (data.type === "subscribed") {
        const valid = (data.existingLogs || []).filter(e => e.cleaned);
        setLogs(valid);
        logsRef.current = valid;
        const s = { total: 0, error: 0, warn: 0, anomaly: 0 };
        valid.forEach(e => {
          const lvl = (e.cleaned?.level || "").toUpperCase();
          s.total++;
          if (lvl === "ERROR") s.error++;
          if (lvl === "WARN") s.warn++;
          if (e.cleaned?.anomaly) s.anomaly++;
        });
        setStats(s);
        const prio = valid.filter(e => ["ERROR","WARN"].includes((e.cleaned?.level||"").toUpperCase()));
        if (prio.length) setPriorities(prio);
        if (data.autoFix) setAutoFix(data.autoFix);
        if (data.agentOnline !== undefined) setAgentOnline(data.agentOnline);
        if (data.fixHistory) setFixHistory(data.fixHistory);
      }

      if (data.type === "new_log" && data.entry?.cleaned) {
        const entry = data.entry;
        const lvl = (entry.cleaned?.level || "").toUpperCase();
        setLogs(prev => { const u = [...prev, entry]; logsRef.current = u; return u; });
        setStats(prev => ({
          total: prev.total + 1,
          error: prev.error + (lvl === "ERROR" ? 1 : 0),
          warn:  prev.warn  + (lvl === "WARN"  ? 1 : 0),
          anomaly: prev.anomaly + (entry.cleaned?.anomaly ? 1 : 0),
        }));
        if (lvl === "ERROR" || lvl === "WARN") {
          setPriorities(prev => prev.find(p => p.id === entry.id) ? prev : [entry, ...prev]);
        }
      }

      if (data.type === "ai_fix" && data.entry) {
        const enriched = data.entry;
        setLogs(prev => prev.map(l => l.id === enriched.id ? enriched : l));
        logsRef.current = logsRef.current.map(l => l.id === enriched.id ? enriched : l);
        setPriorities(prev => {
          const exists = prev.find(p => p.id === enriched.id);
          return exists ? prev.map(p => p.id === enriched.id ? enriched : p) : [enriched, ...prev];
        });
      }

      if (data.type === "autofix_triggered") {
        setFixHistory(prev => [data.fix, ...prev]);
        showToastRef.current("🔧 Auto-fix command sent to agent!");
      }

      if (data.type === "fix_started") {
        showToastRef.current("⚙ Fix is running on your server...");
      }

      if (data.type === "fix_result") {
        setFixHistory(prev => prev.map(f => f.fixId === data.fixId ? { ...f, ...data, status: data.success ? "success" : "failed" } : f));
        setFixResultToast(data);
        setTimeout(() => setFixResultToast(null), 8000);
      }

      if (data.type === "fix_skipped") {
        showToastRef.current("Fix skipped — another fix already in progress", "error");
      }

      if (data.type === "agent_online") {
        setAgentOnline(true);
        showToastRef.current("🟢 Agent connected to your instance!");
      }

      if (data.type === "agent_offline") {
        setAgentOnline(false);
        showToastRef.current("Agent disconnected", "error");
      }

      if (data.type === "autofix_config") {
        setAutoFix(data.autoFix);
      }
    };

    ws.onclose = () => setWsStatus("disconnected");
    ws.onerror = () => { setWsStatus("error"); showToastRef.current("WebSocket error", "error"); };
  }, [instance]);

  useEffect(() => { connectWebSocket(); return () => wsRef.current?.close(); }, [connectWebSocket]);
  useEffect(() => { if (streamRef.current) streamRef.current.scrollTop = streamRef.current.scrollHeight; }, [logs]);

  const filtered = filter === "ALL" ? logs : logs.filter(l => (l.cleaned?.level || "UNKNOWN").toUpperCase() === filter);
  const visiblePriorities = priorities.filter(p => !dismissedIds.has(p.id));
  const wsDotColor = wsStatus === "connected" ? "#00f5a0" : wsStatus === "error" ? "#ff4545" : "#3a5068";

  return (
    <>
      <style>{GLOBAL_STYLES + `
        .filter-btn { padding: 4px 14px; border-radius: 20px; cursor: pointer;
          font-size: 10px; text-transform: uppercase; letter-spacing: 1px; transition: all 0.2s;
          font-family: 'JetBrains Mono', monospace; border: 1px solid #1e2d3d;
          background: transparent; color: #3a5068; }
        .filter-btn:hover { color: #00f5a0; border-color: rgba(0,245,160,0.3); }
        .filter-btn.active { background: rgba(0,245,160,0.1); color: #00f5a0; border-color: rgba(0,245,160,0.4); }
        .tab-btn { padding: 8px 20px; border-radius: 8px; cursor: pointer; font-size: 13px; font-weight: 600; border: none; transition: all 0.2s; }
        .tab-btn.active { background: rgba(0,245,160,0.1); color: #00f5a0; }
        .tab-btn.inactive { background: transparent; color: #5a7a94; }
        .tab-btn.inactive:hover { color: #d4dce8; }
        pre { white-space: pre-wrap; word-break: break-all; }
      `}</style>
      <GridBackground />

      {fixModal && <FixModal alert={fixModal} instanceId={instance?.instanceId} onClose={() => setFixModal(null)} />}
      {fixResultToast && <FixResultToast result={fixResultToast} onDismiss={() => setFixResultToast(null)} />}

      <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", display: "flex", flexDirection: "column" }}>

        {/* Top bar */}
        <div style={{ padding: "14px 28px", borderBottom: "1px solid #1e2d3d", display: "flex", alignItems: "center", gap: 16, background: "rgba(5,8,13,0.95)", backdropFilter: "blur(16px)", position: "sticky", top: 0, zIndex: 50 }}>
          <button onClick={onBack} style={{ background: "none", border: "1px solid #1e2d3d", borderRadius: 7, padding: "6px 14px", color: "#5a7a94", cursor: "pointer", fontSize: 13 }}>← Back</button>

          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <AgentOrb size={28} active={wsStatus === "connected"} />
            <div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 600, color: "#d4dce8" }}>{instance?.name || "Cloud Instance"}</div>
              <div style={{ fontSize: 10, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace" }}>{instance?.instanceId?.slice(0, 22)}...</div>
            </div>
          </div>

          {/* Agent status pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20,
            background: agentOnline ? "rgba(0,245,160,0.08)" : "rgba(255,255,255,0.03)",
            border: `1px solid ${agentOnline ? "rgba(0,245,160,0.25)" : "#1e2d3d"}`,
            fontSize: 10, fontFamily: "'JetBrains Mono', monospace",
            color: agentOnline ? "#00f5a0" : "#3a5068",
          }}>
            <div style={{ width: 6, height: 6, borderRadius: "50%", background: agentOnline ? "#00f5a0" : "#3a5068", animation: agentOnline ? "pulse 2s infinite" : "none" }} />
            {agentOnline ? "AGENT ONLINE" : "AGENT OFFLINE"}
          </div>

          {/* Auto-fix status pill */}
          {autoFix.enabled && (
            <div style={{
              display: "flex", alignItems: "center", gap: 6, padding: "4px 12px", borderRadius: 20,
              background: "rgba(167,139,250,0.08)", border: "1px solid rgba(167,139,250,0.25)",
              fontSize: 10, fontFamily: "'JetBrains Mono', monospace", color: "#a78bfa",
            }}>
              🔧 AUTO-FIX ON
            </div>
          )}

          <div style={{ display: "flex", alignItems: "center", gap: 6, marginLeft: "auto", fontSize: 11, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace" }}>
            <div style={{ width: 7, height: 7, borderRadius: "50%", background: wsDotColor, animation: wsStatus === "connected" ? "pulse 2s infinite" : "none" }} />
            {wsStatus === "connected" ? "LIVE" : wsStatus === "connecting" ? "CONNECTING" : "OFFLINE"}
          </div>

          {wsStatus !== "connected" && (
            <GlowButton onClick={connectWebSocket} style={{ padding: "7px 16px", fontSize: 12 }}>Reconnect</GlowButton>
          )}
        </div>

        <div style={{ display: "flex", flex: 1 }}>

          {/* Main area */}
          <div style={{ flex: 1, padding: "24px 28px", overflowY: "auto", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Stats */}
            <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
              {[
                { label: "Total", value: stats.total, color: "#d4dce8" },
                { label: "Errors", value: stats.error, color: "#ff4545" },
                { label: "Warnings", value: stats.warn, color: "#ffb800" },
                { label: "Anomalies", value: stats.anomaly, color: "#a78bfa" },
              ].map((s, i) => (
                <div key={i} style={{ background: "rgba(10,22,40,0.7)", border: "1px solid #1e2d3d", borderRadius: 10, padding: "12px 18px", minWidth: 80 }}>
                  <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 800, color: s.color }}>{s.value}</div>
                  <div style={{ fontSize: 9, color: "#3a5068", textTransform: "uppercase", letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</div>
                </div>
              ))}
            </div>

            {/* Priority Alerts */}
            {visiblePriorities.length > 0 && (
              <div>
                <div style={{ fontSize: 11, color: "#ff4545", fontFamily: "'JetBrains Mono', monospace", fontWeight: 700, letterSpacing: 1, marginBottom: 10, textTransform: "uppercase" }}>
                  ⚠ Priority Alerts ({visiblePriorities.length})
                </div>
                <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                  {visiblePriorities.map(alert => (
                    <PriorityAlert key={alert.id} alert={alert} onGetFix={a => getAiFix(a)} onDismiss={id => setDismissedIds(s => new Set([...s, id]))} />
                  ))}
                </div>
              </div>
            )}

            {/* Tabs */}
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.02)", borderRadius: 10, padding: 4, alignSelf: "flex-start" }}>
              {["logs", "autofix", "setup"].map(t => (
                <button key={t} className={`tab-btn ${tab === t ? "active" : "inactive"}`} onClick={() => setTab(t)}>
                  {t === "logs" ? "📡 Live Logs" : t === "autofix" ? `🔧 Auto-Fix${autoFix.enabled ? " ●" : ""}` : "⚙ Setup"}
                </button>
              ))}
            </div>

            {/* Auto-Fix tab */}
            {tab === "autofix" && (
              <AutoFixPanel
                instanceId={instance?.instanceId}
                autoFix={autoFix}
                agentOnline={agentOnline}
                fixHistory={fixHistory}
                onSave={handleSaveAutoFix}
                onManualTrigger={handleManualTrigger}
              />
            )}

            {/* Setup tab */}
            {tab === "setup" && (
              <div style={{ background: "rgba(10,22,40,0.7)", border: "1px solid #1e2d3d", borderRadius: 12, overflow: "hidden" }}>
                <div style={{ padding: "14px 18px", borderBottom: "1px solid #1e2d3d", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <div>
                    <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 13, fontWeight: 600, color: "#d4dce8", marginBottom: 3 }}>Deploy logpulse-agent.js</div>
                    <div style={{ fontSize: 11, color: "#5a7a94" }}>Run this on your EC2 / GCP / any Linux instance to enable auto-fix</div>
                  </div>
                  <GlowButton onClick={copySnippet} variant={copied ? "accent" : "primary"} style={{ padding: "8px 16px", fontSize: 12 }}>
                    {copied ? "✓ Copied!" : "⎘ Copy Command"}
                  </GlowButton>
                </div>
                <div style={{ background: "#030608", padding: "20px 24px", overflowX: "auto" }}>
                  <pre style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 12, color: "#7a9ab4", lineHeight: 1.8 }}>
                    {shellSnippet.split("\n").map((line, i) => (
                      <div key={i}>
                        {line.startsWith("#") ? (
                          <span style={{ color: "#3a5068" }}>{line}</span>
                        ) : line.includes("LOGPULSE_WS") || line.includes("LOGPULSE_ID") ? (
                          <span style={{ color: "#00f5a0" }}>{line}</span>
                        ) : line.includes("node logpulse-agent") ? (
                          <span><span style={{ color: "#00c8ff" }}>node</span><span style={{ color: "#d4dce8" }}> logpulse-agent.js</span></span>
                        ) : (
                          <span style={{ color: "#d4dce8" }}>{line}</span>
                        )}
                      </div>
                    ))}
                  </pre>
                </div>
                <div style={{ padding: "12px 18px", borderTop: "1px solid #1e2d3d", background: "rgba(0,245,160,0.02)" }}>
                  <div style={{ fontSize: 11, color: "#5a7a94", lineHeight: 1.8 }}>
                    <div>📦 <strong style={{ color: "#d4dce8" }}>Step 1:</strong> Copy <code style={{ color: "#00f5a0", background: "rgba(0,245,160,0.08)", padding: "1px 6px", borderRadius: 4 }}>logpulse-agent.js</code> to your server</div>
                    <div>🔧 <strong style={{ color: "#d4dce8" }}>Step 2:</strong> <code style={{ color: "#7a9ab4", background: "rgba(0,0,0,0.3)", padding: "1px 6px", borderRadius: 4 }}>npm install ws</code></div>
                    <div>🚀 <strong style={{ color: "#d4dce8" }}>Step 3:</strong> Run the command above — agent will appear ONLINE in the top bar</div>
                    <div>⚙ <strong style={{ color: "#d4dce8" }}>Step 4:</strong> Go to the <strong style={{ color: "#a78bfa" }}>Auto-Fix</strong> tab and configure your fix command</div>
                  </div>
                </div>
              </div>
            )}

            {/* Logs tab */}
            {tab === "logs" && (
              <>
                <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                  {["ALL", "INFO", "WARN", "ERROR", "DEBUG"].map(f => (
                    <button key={f} className={`filter-btn ${filter === f ? "active" : ""}`} onClick={() => setFilter(f)}>{f}</button>
                  ))}
                  <button
                    onClick={() => { setLogs([]); logsRef.current = []; setStats({ total: 0, error: 0, warn: 0, anomaly: 0 }); }}
                    style={{ marginLeft: "auto", background: "none", border: "1px solid #1e2d3d", borderRadius: 6, padding: "4px 12px", fontSize: 11, color: "#3a5068", cursor: "pointer" }}
                  >Clear</button>
                </div>
                <div ref={streamRef} style={{ background: "rgba(5,8,13,0.6)", border: "1px solid #1e2d3d", borderRadius: 12, height: 480, overflowY: "auto", padding: 14, display: "flex", flexDirection: "column", gap: 7 }}>
                  {filtered.length === 0 ? (
                    <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#3a5068" }}>
                      <div style={{ fontSize: 40, opacity: 0.25 }}>📡</div>
                      <div style={{ fontSize: 12 }}>{wsStatus === "connected" ? "Waiting for logs from your instance..." : "Connect to start receiving logs"}</div>
                    </div>
                  ) : (
                    filtered.map(entry => <LogEntry key={entry.id} entry={entry} onGetFix={getAiFix} />)
                  )}
                </div>
              </>
            )}
          </div>

          {/* Right sidebar */}
          <div style={{ width: 260, flexShrink: 0, borderLeft: "1px solid #1e2d3d", padding: "24px 16px", display: "flex", flexDirection: "column", gap: 20 }}>

            {/* Health */}
            <div style={{ background: "rgba(10,22,40,0.7)", border: "1px solid #1e2d3d", borderRadius: 12, padding: "16px" }}>
              <div style={{ fontSize: 10, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 12 }}>Instance Health</div>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: stats.error > 0 ? "#ff4545" : "#00f5a0", boxShadow: `0 0 8px ${stats.error > 0 ? "#ff4545" : "#00f5a0"}`, animation: "pulse 2s infinite" }} />
                <span style={{ fontSize: 13, fontWeight: 600, color: stats.error > 0 ? "#ff4545" : "#00f5a0" }}>{stats.error > 0 ? "Degraded" : "Healthy"}</span>
              </div>
              <div style={{ fontSize: 11, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace", wordBreak: "break-all" }}>{instance?.instanceId}</div>
            </div>

            {/* Webhook URL */}
            <div style={{ background: "rgba(10,22,40,0.7)", border: "1px solid #1e2d3d", borderRadius: 12, padding: "16px" }}>
              <div style={{ fontSize: 10, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Webhook URL</div>
              <div style={{ fontSize: 10, color: "#00f5a0", fontFamily: "'JetBrains Mono', monospace", wordBreak: "break-all", lineHeight: 1.6, marginBottom: 10 }}>{webhookUrl}</div>
              <button onClick={() => { navigator.clipboard.writeText(webhookUrl); showToast("URL copied!"); }} style={{ width: "100%", background: "rgba(0,245,160,0.06)", border: "1px solid rgba(0,245,160,0.2)", borderRadius: 7, padding: "7px", fontSize: 11, color: "#00f5a0", cursor: "pointer" }}>
                ⎘ Copy URL
              </button>
            </div>

            {/* Quick test */}
            <div style={{ background: "rgba(10,22,40,0.7)", border: "1px solid #1e2d3d", borderRadius: 12, padding: "16px" }}>
              <div style={{ fontSize: 10, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace", letterSpacing: 1, textTransform: "uppercase", marginBottom: 10 }}>Quick Test</div>
              <GlowButton
                variant="ghost"
                onClick={async () => {
                  try {
                    await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ log_line: "INFO [LogPulse Test] Webhook connection verified ✓" }) });
                    showToast("Test log sent!");
                  } catch { showToast("Failed to send test", "error"); }
                }}
                style={{ width: "100%", justifyContent: "center", fontSize: 12 }}
              >⚡ Send Test Log</GlowButton>
              <GlowButton
                variant="danger"
                onClick={async () => {
                  try {
                    await fetch(webhookUrl, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ log_line: "ERROR [LogPulse Test] Simulated critical failure — auto-fix should trigger" }) });
                    showToast("Error log sent — watch for auto-fix!");
                  } catch { showToast("Failed to send test", "error"); }
                }}
                style={{ width: "100%", justifyContent: "center", fontSize: 12, marginTop: 8 }}
              >⚠ Simulate ERROR</GlowButton>
            </div>

            {/* AI Agent */}
            <div style={{ background: "rgba(167,139,250,0.04)", border: "1px solid rgba(167,139,250,0.2)", borderRadius: 12, padding: "16px" }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                <AgentOrb size={24} active={wsStatus === "connected"} />
                <span style={{ fontSize: 11, color: "#a78bfa", fontFamily: "'JetBrains Mono', monospace", fontWeight: 600 }}>AI AGENT</span>
              </div>
              <div style={{ fontSize: 11, color: "#5a7a94", lineHeight: 1.6 }}>
                <strong style={{ color: "#00f5a0" }}>Llama 3.3</strong> parses logs · <strong style={{ color: "#a78bfa" }}>Gemini</strong> suggests fixes — both server-side.
              </div>
              {autoFix.enabled && (
                <div style={{ marginTop: 10, padding: "8px 10px", background: "rgba(167,139,250,0.08)", borderRadius: 6, fontSize: 10, color: "#a78bfa", fontFamily: "'JetBrains Mono', monospace" }}>
                  🔧 Auto-fix: {autoFix.command || "(no command set)"}
                </div>
              )}
              {visiblePriorities.length > 0 && (
                <div style={{ marginTop: 8, padding: "6px 10px", background: "rgba(255,69,69,0.08)", borderRadius: 6, fontSize: 11, color: "#ff4545" }}>
                  {visiblePriorities.length} alert{visiblePriorities.length > 1 ? "s" : ""} need attention
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <Toast {...toast} />
    </>
  );
}