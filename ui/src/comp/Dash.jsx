// import { useState, useEffect, useRef, useCallback } from "react";

// const SERVER = "https://testing-logs-o20x.onrender.com";
// const WS_SERVER = "wss://testing-logs-o20x.onrender.com";

// const LEVEL_STYLES = {
//   INFO:    { border: "#00c8ff", bg: "rgba(0,200,255,0.08)",  text: "#00c8ff"  },
//   WARN:    { border: "#ffb800", bg: "rgba(255,184,0,0.08)",  text: "#ffb800"  },
//   ERROR:   { border: "#ff4545", bg: "rgba(255,69,69,0.08)",  text: "#ff4545"  },
//   DEBUG:   { border: "#a78bfa", bg: "rgba(167,139,250,0.08)", text: "#a78bfa" },
//   UNKNOWN: { border: "#4a6070", bg: "rgba(74,96,112,0.08)",  text: "#4a6070" },
// };

// function Toast({ msg, type, visible }) {
//   return (
//     <div style={{
//       position: "fixed", bottom: 24, right: 24, zIndex: 9999,
//       background: "#0d1117", border: `1px solid ${type === "error" ? "rgba(255,69,69,0.4)" : "rgba(0,245,160,0.4)"}`,
//       borderRadius: 10, padding: "12px 20px", fontSize: 12,
//       fontFamily: "'JetBrains Mono', monospace", color: "#e2e8f0",
//       boxShadow: "0 8px 32px rgba(0,0,0,0.5)",
//       transform: visible ? "translateY(0)" : "translateY(80px)",
//       opacity: visible ? 1 : 0,
//       transition: "all 0.3s ease",
//     }}>
//       {type === "error" ? "✗  " : "✓  "}{msg}
//     </div>
//   );
// }

// function StatBox({ value, label, color }) {
//   return (
//     <div style={{
//       background: "#0d1117", border: "1px solid #1e2a35", borderRadius: 10,
//       padding: "14px 20px", minWidth: 80,
//     }}>
//       <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 26, fontWeight: 800, color: color || "#00f5a0" }}>
//         {value}
//       </div>
//       <div style={{ fontSize: 10, color: "#4a6070", textTransform: "uppercase", letterSpacing: 1, marginTop: 2 }}>
//         {label}
//       </div>
//     </div>
//   );
// }

// function LogEntry({ entry }) {
//   const cleaned = entry.cleaned || {};
//   const level = (cleaned.level || "UNKNOWN").toUpperCase();
//   const style = LEVEL_STYLES[level] || LEVEL_STYLES.UNKNOWN;
//   const time = new Date(entry.timestamp).toLocaleTimeString();

//   return (
//     <div style={{
//       background: "#0d1117", border: "1px solid #1e2a35",
//       borderLeft: `3px solid ${style.border}`,
//       borderRadius: 8, padding: "12px 14px",
//       animation: "slideIn 0.3s ease",
//     }}>
//       <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 6, flexWrap: "wrap" }}>
//         <span style={{
//           fontSize: 9, fontWeight: 700, letterSpacing: "1.5px",
//           padding: "2px 8px", borderRadius: 4, textTransform: "uppercase",
//           background: style.bg, color: style.text,
//         }}>{level}</span>

//         {cleaned.service && (
//           <span style={{
//             fontSize: 10, color: "#00c8ff", background: "rgba(0,200,255,0.06)",
//             padding: "2px 8px", borderRadius: 4,
//           }}>{cleaned.service}</span>
//         )}

//         <span style={{ fontSize: 10, color: "#4a6070", marginLeft: "auto" }}>{time}</span>
//       </div>

//       <div style={{ fontSize: 12, color: "#e2e8f0", lineHeight: 1.6 }}>
//         {cleaned.message || entry.raw}
//       </div>

//       {cleaned.anomaly && (
//         <div style={{
//           display: "flex", alignItems: "center", gap: 6,
//           fontSize: 10, color: "#ffb800", marginTop: 6, paddingTop: 6,
//           borderTop: "1px solid rgba(255,184,0,0.1)",
//         }}>
//           ⚠ {cleaned.anomalyReason || "Anomaly detected"}
//         </div>
//       )}

//       <div style={{
//         fontSize: 10, color: "#4a6070", marginTop: 6, paddingTop: 6,
//         borderTop: "1px solid #1e2a35", overflow: "hidden",
//         textOverflow: "ellipsis", whiteSpace: "nowrap",
//       }}>
//         raw: {entry.raw}
//       </div>
//     </div>
//   );
// }

// export default function Dash() {
//   const [instanceId, setInstanceId] = useState("");
//   const [webhookUrl, setWebhookUrl] = useState("");
//   const [inputId, setInputId] = useState("");
//   const [wsStatus, setWsStatus] = useState("disconnected");
//   const [logs, setLogs] = useState([]);
//   const [filter, setFilter] = useState("ALL");
//   const [status, setStatus] = useState(null);
//   const [stats, setStats] = useState({ total: 0, error: 0, warn: 0, anomaly: 0 });
//   const [toast, setToast] = useState({ msg: "", type: "success", visible: false });
//   const [connected, setConnected] = useState(false);

//   const wsRef = useRef(null);
//   const streamRef = useRef(null);

//   const showToast = (msg, type = "success") => {
//     setToast({ msg, type, visible: true });
//     setTimeout(() => setToast(t => ({ ...t, visible: false })), 2500);
//   };

//   const generateUrl = async () => {
//     try {
//       const res = await fetch(`${SERVER}/generate-url`);
//       const data = await res.json();
//       setInstanceId(data.instanceId);
//       setWebhookUrl(data.webhookUrl);
//       setInputId(data.instanceId);
//       showToast("Webhook URL generated!");
//     } catch {
//       showToast("Failed to reach server", "error");
//     }
//   };

//   const checkStatus = async (id) => {
//     try {
//       const res = await fetch(`${SERVER}/status/${id}`);
//       const data = await res.json();
//       setStatus(data.status);
//     } catch {
//       setStatus(null);
//     }
//   };

//   const connectWebSocket = useCallback((id) => {
//     if (wsRef.current) wsRef.current.close();

//     setWsStatus("connecting");
//     const ws = new WebSocket(WS_SERVER);
//     wsRef.current = ws;

//     ws.onopen = () => {
//       ws.send(JSON.stringify({ type: "subscribe", instanceId: id }));
//       setWsStatus("connected");
//       setConnected(true);
//     };

//     ws.onmessage = (event) => {
//       const data = JSON.parse(event.data);

//       if (data.type === "subscribed" && data.existingLogs?.length) {
//         const valid = data.existingLogs.filter(e => e.cleaned);
//         setLogs(valid);
//         const s = { total: 0, error: 0, warn: 0, anomaly: 0 };
//         valid.forEach(e => {
//           const lvl = (e.cleaned?.level || "").toUpperCase();
//           s.total++;
//           if (lvl === "ERROR") s.error++;
//           if (lvl === "WARN") s.warn++;
//           if (e.cleaned?.anomaly) s.anomaly++;
//         });
//         setStats(s);
//       }

//       if (data.type === "new_log" && data.entry?.cleaned) {
//         const entry = data.entry;
//         const lvl = (entry.cleaned?.level || "").toUpperCase();
//         setLogs(prev => [...prev, entry]);
//         setStats(prev => ({
//           total: prev.total + 1,
//           error: prev.error + (lvl === "ERROR" ? 1 : 0),
//           warn: prev.warn + (lvl === "WARN" ? 1 : 0),
//           anomaly: prev.anomaly + (entry.cleaned?.anomaly ? 1 : 0),
//         }));
//       }
//     };

//     ws.onclose = () => {
//       setWsStatus("disconnected");
//       setConnected(false);
//     };

//     ws.onerror = () => {
//       setWsStatus("error");
//       showToast("WebSocket error", "error");
//     };
//   }, []);

//   const connect = () => {
//     const id = inputId.trim();
//     if (!id) return showToast("Enter an instance ID", "error");
//     setLogs([]);
//     setStats({ total: 0, error: 0, warn: 0, anomaly: 0 });
//     connectWebSocket(id);
//     checkStatus(id);
//   };

//   const disconnect = () => {
//     if (wsRef.current) wsRef.current.close();
//     setConnected(false);
//     setWsStatus("disconnected");
//     setLogs([]);
//     setStats({ total: 0, error: 0, warn: 0, anomaly: 0 });
//     setStatus(null);
//     showToast("Disconnected");
//   };

//   useEffect(() => {
//     if (streamRef.current) {
//       streamRef.current.scrollTop = streamRef.current.scrollHeight;
//     }
//   }, [logs]);

//   const filtered = filter === "ALL" ? logs : logs.filter(l => (l.cleaned?.level || "UNKNOWN").toUpperCase() === filter);

//   const wsDotColor = wsStatus === "connected" ? "#00f5a0" : wsStatus === "error" ? "#ff4545" : "#4a6070";

//   return (
//     <>
//       <style>{`
//         @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@300;400;500;700&family=Syne:wght@400;600;800&display=swap');
//         * { box-sizing: border-box; margin: 0; padding: 0; }
//         body { background: #080b0f; color: #e2e8f0; font-family: 'JetBrains Mono', monospace; }
//         body::before {
//           content: '';
//           position: fixed; inset: 0;
//           background-image: linear-gradient(rgba(0,245,160,0.025) 1px, transparent 1px),
//                             linear-gradient(90deg, rgba(0,245,160,0.025) 1px, transparent 1px);
//           background-size: 40px 40px;
//           pointer-events: none; z-index: 0;
//         }
//         @keyframes slideIn {
//           from { opacity: 0; transform: translateY(-8px); }
//           to   { opacity: 1; transform: translateY(0); }
//         }
//         @keyframes pulse {
//           0%, 100% { opacity: 1; }
//           50%       { opacity: 0.35; }
//         }
//         ::-webkit-scrollbar { width: 4px; }
//         ::-webkit-scrollbar-track { background: transparent; }
//         ::-webkit-scrollbar-thumb { background: #1e2a35; border-radius: 2px; }
//         input::placeholder { color: #4a6070; }
//         input:focus { outline: none; border-color: #00c8ff !important; }
//       `}</style>

//       <div style={{ position: "relative", zIndex: 1, maxWidth: 1100, margin: "0 auto", padding: "24px 20px" }}>

//         {/* Header */}
//         <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 32, paddingBottom: 20, borderBottom: "1px solid #1e2a35" }}>
//           <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
//             <div style={{
//               width: 38, height: 38, borderRadius: 10,
//               background: "linear-gradient(135deg, #00f5a0, #00c8ff)",
//               display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20,
//             }}>⚡</div>
//             <span style={{
//               fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 800,
//               background: "linear-gradient(90deg, #00f5a0, #00c8ff)",
//               WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent",
//             }}>LogPulse</span>
//           </div>

//           <div style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#4a6070", textTransform: "uppercase", letterSpacing: 1 }}>
//             <div style={{
//               width: 8, height: 8, borderRadius: "50%", background: wsDotColor,
//               boxShadow: wsStatus === "connected" ? `0 0 8px #00f5a0` : "none",
//               animation: wsStatus === "connected" ? "pulse 2s infinite" : "none",
//             }} />
//             {wsStatus === "connected" ? "Live" : wsStatus === "connecting" ? "Connecting..." : wsStatus === "error" ? "Error" : "Disconnected"}
//           </div>
//         </div>

//         {/* Step Cards */}
//         <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>

//           {/* Step 1 */}
//           <div style={{ background: "#0d1117", border: "1px solid #1e2a35", borderRadius: 12, padding: 20 }}>
//             <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#4a6070", marginBottom: 10 }}>Step 1</div>
//             <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Generate Webhook URL</div>

//             <button onClick={generateUrl} style={{
//               display: "inline-flex", alignItems: "center", gap: 8,
//               padding: "10px 18px", borderRadius: 8, border: "none", cursor: "pointer",
//               background: "linear-gradient(135deg, #00f5a0, #00c8b0)",
//               color: "#080b0f", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
//               transition: "all 0.2s",
//             }}>⚡ Generate URL</button>

//             {webhookUrl && (
//               <div style={{ marginTop: 14 }}>
//                 <div style={{
//                   display: "flex", alignItems: "center", gap: 8,
//                   background: "#131920", border: "1px solid #1e2a35",
//                   borderRadius: 8, padding: "10px 14px",
//                 }}>
//                   <span style={{ flex: 1, fontSize: 11, color: "#00f5a0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
//                     {webhookUrl}
//                   </span>
//                   <button onClick={() => { navigator.clipboard.writeText(webhookUrl); showToast("Copied!"); }}
//                     style={{ background: "none", border: "none", color: "#4a6070", cursor: "pointer", fontSize: 16 }}>⎘</button>
//                 </div>
//                 <div style={{ marginTop: 8, fontSize: 10, color: "#4a6070" }}>
//                   Instance ID: <span style={{ color: "#00c8ff" }}>{instanceId}</span>
//                 </div>
//               </div>
//             )}
//           </div>

//           {/* Step 2 */}
//           <div style={{ background: "#0d1117", border: "1px solid #1e2a35", borderRadius: 12, padding: 20 }}>
//             <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: 2, color: "#4a6070", marginBottom: 10 }}>Step 2</div>
//             <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 600, marginBottom: 16 }}>Connect & Monitor</div>

//             <div style={{ display: "flex", gap: 8 }}>
//               <input
//                 type="text"
//                 value={inputId}
//                 onChange={e => setInputId(e.target.value)}
//                 placeholder="Paste instance ID..."
//                 style={{
//                   flex: 1, background: "#131920", border: "1px solid #1e2a35",
//                   borderRadius: 8, padding: "10px 14px", color: "#e2e8f0",
//                   fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
//                 }}
//               />
//               {!connected
//                 ? <button onClick={connect} style={{
//                     padding: "10px 16px", borderRadius: 8, border: "none", cursor: "pointer",
//                     background: "linear-gradient(135deg, #00f5a0, #00c8b0)",
//                     color: "#080b0f", fontFamily: "'JetBrains Mono', monospace", fontSize: 12, fontWeight: 600,
//                   }}>Connect</button>
//                 : <button onClick={disconnect} style={{
//                     padding: "10px 16px", borderRadius: 8, cursor: "pointer",
//                     background: "rgba(255,69,69,0.1)", color: "#ff4545",
//                     border: "1px solid rgba(255,69,69,0.3)",
//                     fontFamily: "'JetBrains Mono', monospace", fontSize: 12,
//                   }}>Disconnect</button>
//               }
//             </div>

//             {status && (
//               <div style={{
//                 display: "inline-flex", alignItems: "center", gap: 6,
//                 marginTop: 12, padding: "5px 12px", borderRadius: 20, fontSize: 11,
//                 background: "rgba(0,245,160,0.08)", color: "#00f5a0",
//                 border: "1px solid rgba(0,245,160,0.2)",
//               }}>
//                 ● Status: {status}
//               </div>
//             )}
//           </div>
//         </div>

//         {/* Stats */}
//         <div style={{ display: "flex", gap: 12, marginBottom: 20, flexWrap: "wrap" }}>
//           <StatBox value={stats.total} label="Total" color="#00f5a0" />
//           <StatBox value={stats.error} label="Errors" color="#ff4545" />
//           <StatBox value={stats.warn} label="Warnings" color="#ffb800" />
//           <StatBox value={stats.anomaly} label="Anomalies" color="#a78bfa" />
//         </div>

//         {/* Filters */}
//         <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
//           {["ALL", "INFO", "WARN", "ERROR", "DEBUG"].map(f => {
//             const colors = { INFO: "#00c8ff", WARN: "#ffb800", ERROR: "#ff4545", DEBUG: "#a78bfa", ALL: "#00f5a0" };
//             const active = filter === f;
//             return (
//               <button key={f} onClick={() => setFilter(f)} style={{
//                 padding: "4px 14px", borderRadius: 20, cursor: "pointer",
//                 fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
//                 textTransform: "uppercase", letterSpacing: 1,
//                 background: active ? `rgba(${f === "ALL" ? "0,245,160" : f === "INFO" ? "0,200,255" : f === "WARN" ? "255,184,0" : f === "ERROR" ? "255,69,69" : "167,139,250"},0.1)` : "transparent",
//                 color: active ? colors[f] : "#4a6070",
//                 border: `1px solid ${active ? colors[f] : "#1e2a35"}`,
//                 transition: "all 0.2s",
//               }}>{f}</button>
//             );
//           })}
//         </div>

//         {/* Log Stream */}
//         <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
//           <div style={{ fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 600, display: "flex", alignItems: "center", gap: 8 }}>
//             Log Stream
//             {wsStatus === "connected" && (
//               <span style={{
//                 fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
//                 background: "rgba(0,245,160,0.1)", color: "#00f5a0",
//                 border: "1px solid rgba(0,245,160,0.3)",
//                 padding: "2px 8px", borderRadius: 20, textTransform: "uppercase", letterSpacing: 1,
//               }}>● Live</span>
//             )}
//           </div>
//           <button onClick={() => { setLogs([]); setStats({ total: 0, error: 0, warn: 0, anomaly: 0 }); }}
//             style={{
//               padding: "6px 14px", borderRadius: 8, cursor: "pointer",
//               background: "#131920", color: "#e2e8f0",
//               border: "1px solid #1e2a35", fontFamily: "'JetBrains Mono', monospace", fontSize: 11,
//             }}>Clear</button>
//         </div>

//         <div ref={streamRef} style={{
//           background: "#0d1117", border: "1px solid #1e2a35", borderRadius: 12,
//           height: 440, overflowY: "auto", padding: 16,
//           display: "flex", flexDirection: "column", gap: 8,
//         }}>
//           {filtered.length === 0 ? (
//             <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 12, color: "#4a6070" }}>
//               <div style={{ fontSize: 40, opacity: 0.3 }}>📡</div>
//               <div style={{ fontSize: 13 }}>
//                 {connected ? "Waiting for logs..." : "Generate a URL and connect to start streaming"}
//               </div>
//             </div>
//           ) : (
//             filtered.map(entry => <LogEntry key={entry.id} entry={entry} />)
//           )}
//         </div>

//       </div>

//       <Toast msg={toast.msg} type={toast.type} visible={toast.visible} />
//     </>
//   );
// }



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