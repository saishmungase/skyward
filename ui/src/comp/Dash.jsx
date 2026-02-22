import { useState, useEffect } from "react";
import { GLOBAL_STYLES, SERVER } from "./theme";
import { GridBackground, GlowButton, useToast, Toast, Card, Badge, Spinner, AgentOrb } from "./Comp";

function InstanceCard({ instance, onOpen, onDelete }) {
  const errorCount = instance.logs?.filter(l => (l.cleaned?.level || "").toUpperCase() === "ERROR").length || 0;
  const warnCount  = instance.logs?.filter(l => (l.cleaned?.level || "").toUpperCase() === "WARN").length || 0;
  const total      = instance.logs?.length || 0;
  const hasAlert   = errorCount > 0;

  return (
    <div
      onClick={() => onOpen(instance)}
      style={{
        background: "rgba(10,22,40,0.8)", border: `1px solid ${hasAlert ? "rgba(255,69,69,0.3)" : "#1e2d3d"}`,
        borderRadius: 14, padding: "24px", cursor: "pointer", transition: "all 0.25s",
        position: "relative", overflow: "hidden",
        boxShadow: hasAlert ? "0 0 30px rgba(255,69,69,0.06)" : "none",
        animation: "fadeUp 0.4s ease both",
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-3px)"; e.currentTarget.style.borderColor = hasAlert ? "rgba(255,69,69,0.5)" : "rgba(0,245,160,0.3)"; }}
      onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.borderColor = hasAlert ? "rgba(255,69,69,0.3)" : "#1e2d3d"; }}
    >
      {/* Alert stripe */}
      {hasAlert && (
        <div style={{ position: "absolute", top: 0, left: 0, right: 0, height: 2, background: "linear-gradient(90deg, #ff4545, transparent)" }} />
      )}

      {/* Header */}
      <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{
            width: 40, height: 40, borderRadius: 10, flexShrink: 0,
            background: hasAlert ? "rgba(255,69,69,0.1)" : "rgba(0,245,160,0.08)",
            border: `1px solid ${hasAlert ? "rgba(255,69,69,0.3)" : "rgba(0,245,160,0.2)"}`,
            display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18,
          }}>
            {hasAlert ? "🔴" : "☁️"}
          </div>
          <div>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 12, fontWeight: 600, color: "#d4dce8", marginBottom: 3 }}>
              {instance.name || "Cloud Instance"}
            </div>
            <div style={{ fontSize: 10, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", maxWidth: 180 }}>
              {instance.instanceId}
            </div>
          </div>
        </div>
        <Badge color={hasAlert ? "#ff4545" : "#00f5a0"}>
          {hasAlert ? "⚠ ALERT" : "● HEALTHY"}
        </Badge>
      </div>

      {/* Stats row */}
      <div style={{ display: "flex", gap: 12, marginBottom: 16 }}>
        {[
          { label: "Total Logs", value: total, color: "#d4dce8" },
          { label: "Errors", value: errorCount, color: "#ff4545" },
          { label: "Warnings", value: warnCount, color: "#ffb800" },
        ].map((s, i) => (
          <div key={i} style={{ flex: 1, background: "rgba(255,255,255,0.02)", borderRadius: 8, padding: "10px", textAlign: "center", border: "1px solid #1e2d3d" }}>
            <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 18, fontWeight: 700, color: s.color }}>{s.value}</div>
            <div style={{ fontSize: 9, color: "#3a5068", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>{s.label}</div>
          </div>
        ))}
      </div>

      {/* Last log preview */}
      {instance.logs?.length > 0 && (
        <div style={{
          fontSize: 11, color: "#3a5068", fontFamily: "'JetBrains Mono', monospace",
          background: "rgba(255,255,255,0.02)", borderRadius: 6, padding: "8px 10px",
          overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          marginBottom: 16,
        }}>
          {instance.logs[instance.logs.length - 1]?.cleaned?.message || "No logs yet"}
        </div>
      )}

      {/* Footer */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <span style={{ fontSize: 11, color: "#3a5068" }}>
          Created {new Date(instance.createdAt).toLocaleDateString()}
        </span>
        <div style={{ display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
          <button
            onClick={() => onDelete(instance.instanceId)}
            style={{
              background: "none", border: "1px solid rgba(255,69,69,0.2)", borderRadius: 6,
              padding: "5px 10px", fontSize: 11, color: "#ff4545", cursor: "pointer",
              transition: "all 0.2s",
            }}
          >Delete</button>
          <button
            onClick={() => onOpen(instance)}
            style={{
              background: "rgba(0,245,160,0.08)", border: "1px solid rgba(0,245,160,0.25)", borderRadius: 6,
              padding: "5px 10px", fontSize: 11, color: "#00f5a0", cursor: "pointer",
              transition: "all 0.2s",
            }}
          >Monitor →</button>
        </div>
      </div>
    </div>
  );
}

export default function Dashboard({ user, onNavigate, onOpenHook }) {
  const [instances, setInstances] = useState([]);
  const [creating, setCreating] = useState(false);
  const [instanceName, setInstanceName] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const [toast, showToast] = useToast();
  const [agentThinking, setAgentThinking] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem("lp_instances");
    if (saved) setInstances(JSON.parse(saved));
    // Simulate agent scanning
    setTimeout(() => setAgentThinking(true), 1000);
    setTimeout(() => setAgentThinking(false), 3000);
  }, []);

  const saveInstances = (list) => {
    setInstances(list);
    localStorage.setItem("lp_instances", JSON.stringify(list));
  };

  const createInstance = async () => {
    setCreating(true);
    try {
      const res = await fetch(`${SERVER}/generate-url`);
      const data = await res.json();
      const newInstance = {
        instanceId: data.instanceId,
        webhookUrl: data.webhookUrl,
        name: instanceName || `Instance ${instances.length + 1}`,
        createdAt: new Date().toISOString(),
        logs: [],
      };
      const updated = [...instances, newInstance];
      saveInstances(updated);
      setShowCreate(false);
      setInstanceName("");
      showToast("Cloud instance created!");
    } catch {
      showToast("Failed to create instance", "error");
    } finally {
      setCreating(false);
    }
  };

  const deleteInstance = (id) => {
    saveInstances(instances.filter(i => i.instanceId !== id));
    showToast("Instance removed");
  };

  const totalErrors = instances.reduce((a, i) => a + (i.logs?.filter(l => (l.cleaned?.level || "").toUpperCase() === "ERROR").length || 0), 0);
  const totalLogs   = instances.reduce((a, i) => a + (i.logs?.length || 0), 0);
  const alertCount  = instances.filter(i => i.logs?.some(l => (l.cleaned?.level || "").toUpperCase() === "ERROR")).length;

  return (
    <>
      <style>{GLOBAL_STYLES + `
        .sidebar-item { display: flex; align-items: center; gap: 10px; padding: 10px 14px;
          border-radius: 8px; cursor: pointer; transition: all 0.2s; font-size: 13px; font-weight: 500; }
        .sidebar-item:hover { background: rgba(0,245,160,0.06); color: #00f5a0; }
        .sidebar-item.active { background: rgba(0,245,160,0.1); color: #00f5a0; border-left: 2px solid #00f5a0; }
        .instance-name-input:focus { border-color: #00f5a0 !important; }
      `}</style>
      <GridBackground />

      <div style={{ position: "relative", zIndex: 1, display: "flex", minHeight: "100vh" }}>

        {/* Sidebar */}
        <div style={{
          width: 240, flexShrink: 0, borderRight: "1px solid #1e2d3d",
          background: "rgba(5,8,13,0.95)", backdropFilter: "blur(16px)",
          display: "flex", flexDirection: "column", padding: "20px 12px",
          position: "sticky", top: 0, height: "100vh",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "0 8px", marginBottom: 32 }}>
            <div style={{ width: 28, height: 28, borderRadius: 7, background: "linear-gradient(135deg, #00f5a0, #00c8d4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 }}>⚡</div>
            <span style={{ fontFamily: "'Orbitron', monospace", fontSize: 14, fontWeight: 700, background: "linear-gradient(90deg, #00f5a0, #00c8ff)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>LOGPULSE</span>
          </div>

          {/* Agent status */}
          <div style={{
            background: "rgba(0,245,160,0.04)", border: "1px solid rgba(0,245,160,0.15)",
            borderRadius: 10, padding: "12px", marginBottom: 24,
          }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
              <AgentOrb size={24} active={agentThinking} />
              <span style={{ fontSize: 11, fontFamily: "'JetBrains Mono', monospace", color: "#00f5a0", fontWeight: 600 }}>
                AI AGENT
              </span>
            </div>
            <div style={{ fontSize: 11, color: "#5a7a94" }}>
              {agentThinking ? "Scanning instances..." : `Monitoring ${instances.length} instance${instances.length !== 1 ? "s" : ""}`}
            </div>
          </div>

          <nav style={{ display: "flex", flexDirection: "column", gap: 4 }}>
            {[
              { icon: "⊞", label: "Dashboard", active: true },
              { icon: "📡", label: "Instances" },
              { icon: "🧠", label: "AI Insights" },
              { icon: "📊", label: "Analytics" },
              { icon: "⚙", label: "Settings" },
            ].map((item, i) => (
              <div key={i} className={`sidebar-item ${item.active ? "active" : ""}`} style={{ color: item.active ? "#00f5a0" : "#5a7a94" }}>
                <span style={{ fontSize: 16 }}>{item.icon}</span>
                {item.label}
                {item.label === "Dashboard" && alertCount > 0 && (
                  <span style={{ marginLeft: "auto", background: "#ff4545", color: "#fff", borderRadius: 10, padding: "1px 7px", fontSize: 10, fontWeight: 700 }}>
                    {alertCount}
                  </span>
                )}
              </div>
            ))}
          </nav>

          {/* User */}
          <div style={{ marginTop: "auto", padding: "12px 8px", borderTop: "1px solid #1e2d3d" }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 32, height: 32, borderRadius: "50%", background: "linear-gradient(135deg, #00f5a0, #0066ff)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 13, color: "#05080d", fontWeight: 700 }}>
                {user?.email?.[0]?.toUpperCase() || "U"}
              </div>
              <div>
                <div style={{ fontSize: 12, color: "#d4dce8", fontWeight: 500, maxWidth: 140, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{user?.email}</div>
                <div style={{ fontSize: 10, color: "#3a5068" }}>Free Plan</div>
              </div>
            </div>
            <button
              onClick={() => { localStorage.clear(); onNavigate("landing"); }}
              style={{ marginTop: 10, width: "100%", background: "none", border: "1px solid #1e2d3d", borderRadius: 7, padding: "7px", fontSize: 12, color: "#3a5068", cursor: "pointer", transition: "all 0.2s" }}
            >Sign Out</button>
          </div>
        </div>

        {/* Main */}
        <div style={{ flex: 1, overflowY: "auto", padding: "32px 36px" }}>

          {/* Header */}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32 }}>
            <div>
              <h1 style={{ fontFamily: "'Orbitron', monospace", fontSize: 22, fontWeight: 700, color: "#d4dce8", marginBottom: 6 }}>
                Mission Control
              </h1>
              <p style={{ fontSize: 13, color: "#5a7a94" }}>
                AI agent monitoring {instances.length} cloud instance{instances.length !== 1 ? "s" : ""} in real-time
              </p>
            </div>
            <GlowButton onClick={() => setShowCreate(true)} style={{ gap: 8 }}>
              + New Instance
            </GlowButton>
          </div>

          {/* Global stats */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 16, marginBottom: 32 }}>
            {[
              { label: "Instances", value: instances.length, icon: "☁️", color: "#00f5a0" },
              { label: "Total Logs", value: totalLogs, icon: "📝", color: "#00c8ff" },
              { label: "Active Alerts", value: alertCount, icon: "🔴", color: "#ff4545" },
              { label: "Total Errors", value: totalErrors, icon: "⚠", color: "#ffb800" },
            ].map((s, i) => (
              <div key={i} style={{
                background: "rgba(10,22,40,0.8)", border: `1px solid ${s.value > 0 && (s.label === "Active Alerts" || s.label === "Total Errors") ? "rgba(255,69,69,0.2)" : "#1e2d3d"}`,
                borderRadius: 12, padding: "20px", animation: `fadeUp ${0.3 + i * 0.1}s ease both`,
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                  <span style={{ fontSize: 10, color: "#3a5068", textTransform: "uppercase", letterSpacing: 1, fontFamily: "'JetBrains Mono', monospace" }}>{s.label}</span>
                  <span style={{ fontSize: 18 }}>{s.icon}</span>
                </div>
                <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 32, fontWeight: 800, color: s.color }}>{s.value}</div>
              </div>
            ))}
          </div>

          {/* Agent insights banner */}
          {alertCount > 0 && (
            <div style={{
              background: "rgba(255,69,69,0.06)", border: "1px solid rgba(255,69,69,0.25)",
              borderRadius: 12, padding: "16px 20px", marginBottom: 24,
              display: "flex", alignItems: "center", gap: 14, animation: "fadeUp 0.4s ease both",
            }}>
              <AgentOrb size={36} active />
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#ff4545", marginBottom: 3 }}>AI Agent Alert — Action Required</div>
                <div style={{ fontSize: 12, color: "#5a7a94" }}>
                  {alertCount} instance{alertCount > 1 ? "s have" : " has"} active errors. AI fix suggestions are ready. Click any instance to review.
                </div>
              </div>
              <Badge color="#ff4545">⚠ {alertCount} CRITICAL</Badge>
            </div>
          )}

          {/* Create modal */}
          {showCreate && (
            <div style={{
              position: "fixed", inset: 0, background: "rgba(0,0,0,0.7)", backdropFilter: "blur(8px)",
              display: "flex", alignItems: "center", justifyContent: "center", zIndex: 500, animation: "fadeIn 0.2s ease",
            }}>
              <div style={{
                background: "rgba(10,22,40,0.98)", border: "1px solid #1e2d3d", borderRadius: 16,
                padding: "32px", width: 420, boxShadow: "0 32px 80px rgba(0,0,0,0.7)",
                animation: "fadeUp 0.3s ease",
              }}>
                <h3 style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, fontWeight: 700, color: "#d4dce8", marginBottom: 8 }}>
                  New Cloud Instance
                </h3>
                <p style={{ fontSize: 13, color: "#5a7a94", marginBottom: 24 }}>
                  Give your instance a name, then integrate the generated webhook URL into your cloud server.
                </p>
                <input
                  className="instance-name-input"
                  type="text"
                  placeholder="e.g. Production EC2, GCP API Server..."
                  value={instanceName}
                  onChange={e => setInstanceName(e.target.value)}
                  onKeyDown={e => e.key === "Enter" && createInstance()}
                  style={{
                    width: "100%", background: "rgba(255,255,255,0.03)", border: "1px solid #1e2d3d",
                    borderRadius: 10, padding: "12px 16px", color: "#d4dce8", fontSize: 14, marginBottom: 16,
                    transition: "border-color 0.2s",
                  }}
                />
                <div style={{ display: "flex", gap: 10 }}>
                  <GlowButton variant="ghost" onClick={() => setShowCreate(false)} style={{ flex: 1, justifyContent: "center" }}>
                    Cancel
                  </GlowButton>
                  <GlowButton onClick={createInstance} disabled={creating} style={{ flex: 1, justifyContent: "center" }}>
                    {creating ? <Spinner /> : "⚡ Create"}
                  </GlowButton>
                </div>
              </div>
            </div>
          )}

          {/* Instance grid */}
          {instances.length === 0 ? (
            <div style={{
              textAlign: "center", padding: "80px 40px", border: "1px dashed #1e2d3d",
              borderRadius: 16, animation: "fadeUp 0.5s ease both",
            }}>
              <div style={{ fontSize: 48, marginBottom: 16, opacity: 0.4 }}>☁️</div>
              <div style={{ fontFamily: "'Orbitron', monospace", fontSize: 16, color: "#3a5068", marginBottom: 10 }}>No instances yet</div>
              <div style={{ fontSize: 13, color: "#3a5068", marginBottom: 24 }}>Create your first cloud instance to start monitoring logs with AI</div>
              <GlowButton onClick={() => setShowCreate(true)}>+ Add First Instance</GlowButton>
            </div>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))", gap: 20 }}>
              {instances.map((inst, i) => (
                <InstanceCard key={inst.instanceId} instance={inst} onOpen={onOpenHook} onDelete={deleteInstance} />
              ))}
            </div>
          )}
        </div>
      </div>

      <Toast {...toast} />
    </>
  );
}