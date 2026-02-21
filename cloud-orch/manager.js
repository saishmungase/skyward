import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import Groq from "groq-sdk";
import { GoogleGenerativeAI } from "@google/generative-ai";
import "dotenv/config";
import cors from "cors";

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const geminiModel = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

const activeInstances = {};
const agentSockets    = new Map(); 
const browserSockets  = new Map(); 
const fixHistory      = {};  

function getOrCreateInstance(instanceId) {
  if (!activeInstances[instanceId]) {
    activeInstances[instanceId] = {
      logs: [],
      autoFix: { enabled: false, command: "" },
    };
  }
  return activeInstances[instanceId];
}

function broadcastToBrowsers(instanceId, payload) {
  const subs = browserSockets.get(instanceId);
  if (!subs || subs.size === 0) return;
  const msg = JSON.stringify(payload);
  subs.forEach((ws) => { if (ws.readyState === 1) ws.send(msg); });
}

function sendToAgent(instanceId, payload) {
  const agentWs = agentSockets.get(instanceId);
  if (agentWs && agentWs.readyState === 1) {
    agentWs.send(JSON.stringify(payload));
    return true;
  }
  return false;
}

async function classifyWithGroq(rawLog) {
  const chat = await groq.chat.completions.create({
    model: "llama-3.3-70b-versatile",
    messages: [
      {
        role: "system",
        content: `You are a log analysis expert. Given a raw log line, return ONLY a valid JSON object with:
{
  "level": "INFO|WARN|ERROR|DEBUG",
  "service": "service name or unknown",
  "message": "clean, concise, human-readable summary",
  "anomaly": true|false,
  "anomalyReason": "string or null"
}
No markdown, no extra text. Only raw JSON.`,
      },
      { role: "user", content: rawLog },
    ],
    temperature: 0.2,
    max_tokens: 300,
  });
  const text = chat.choices[0]?.message?.content || "{}";
  const match = text.match(/\{[\s\S]*\}/);
  return match
    ? JSON.parse(match[0])
    : { level: "UNKNOWN", service: "unknown", message: rawLog, anomaly: false, anomalyReason: null };
}

async function getGeminiFix(entry, contextLogs = []) {
  try {
    const contextStr = contextLogs
      .map((l) => `[${l.cleaned?.level || "?"}] ${l.cleaned?.message || l.raw}`)
      .join("\n");
    const prompt = `You are an expert DevOps AI agent analyzing cloud server logs.

Recent log context (last ${contextLogs.length} logs):
${contextStr}

Failing log:
[${entry.cleaned?.level || "ERROR"}] ${entry.cleaned?.message || entry.raw}

Provide:
1. Root cause analysis
2. Step-by-step fix
3. Prevention recommendation

Be concise and actionable.`;
    const result = await geminiModel.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error(`[GEMINI ERROR] ${err.message}`);
    return null;
  }
}

async function processLog(instanceId, rawLog, entryId, timestamp) {
  const instance = getOrCreateInstance(instanceId);

  try {
    const cleanedLog = await classifyWithGroq(rawLog);
    const entry = { id: entryId, timestamp, raw: rawLog, cleaned: cleanedLog };

    instance.logs.push(entry);
    broadcastToBrowsers(instanceId, { type: "new_log", instanceId, entry });

    const lvl = (cleanedLog.level || "").toUpperCase();
    if (lvl === "ERROR" || lvl === "WARN") {
      const recent = instance.logs.slice(-10);
      const suggestion = await getGeminiFix(entry, recent);

      if (suggestion) {
        const enriched = { ...entry, aiSuggestion: suggestion };
        const idx = instance.logs.findIndex((e) => e.id === entryId);
        if (idx !== -1) instance.logs[idx] = enriched;
        broadcastToBrowsers(instanceId, { type: "ai_fix", instanceId, entry: enriched });
      }

      if (lvl === "ERROR" && instance.autoFix.enabled && instance.autoFix.command.trim()) {
        const fixId = randomUUID();
        const agentReachable = sendToAgent(instanceId, {
          type: "run_fix",
          fixId,
          command: instance.autoFix.command,
          triggeredBy: entryId,
        });

        const fixRecord = {
          fixId,
          triggeredBy: entryId,
          command: instance.autoFix.command,
          triggeredAt: new Date().toISOString(),
          status: agentReachable ? "sent" : "agent_offline",
        };

        if (!fixHistory[instanceId]) fixHistory[instanceId] = [];
        fixHistory[instanceId].push(fixRecord);

        broadcastToBrowsers(instanceId, { type: "autofix_triggered", instanceId, fix: fixRecord });

        if (!agentReachable) {
          console.warn(`[AutoFix] Agent offline for instance ${instanceId}`);
        }
      }
    }
  } catch (err) {
    console.error(`[PROCESS LOG ERROR] ${err.message}`);
    const fallback = {
      id: entryId, timestamp, raw: rawLog,
      cleaned: { level: "UNKNOWN", service: "unknown", message: rawLog, anomaly: false, anomalyReason: null },
      aiError: true,
    };
    instance.logs.push(fallback);
    broadcastToBrowsers(instanceId, { type: "new_log", instanceId, entry: fallback, aiError: true });
  }
}

app.get("/generate-url", (req, res) => {
  const instanceId = randomUUID();
  getOrCreateInstance(instanceId);
  const webhookUrl = `${req.protocol}://${req.get("host")}/ingest/${instanceId}`;
  res.json({ instanceId, webhookUrl, status: "Ready to receive logs" });
});

app.post("/ingest/:instanceId", (req, res) => {
  const { instanceId } = req.params;
  const logLine = req.body.log_line;
  if (!logLine) return res.status(400).json({ error: "log_line is required" });
  getOrCreateInstance(instanceId);
  const entryId = randomUUID();
  const timestamp = new Date().toISOString();
  res.json({ status: "Log received", entryId });
  processLog(instanceId, logLine, entryId, timestamp);
});

app.post("/autofix/config/:instanceId", (req, res) => {
  const { instanceId } = req.params;
  const { enabled, command } = req.body;
  const instance = getOrCreateInstance(instanceId);
  instance.autoFix.enabled = Boolean(enabled);
  instance.autoFix.command = command || "";

  sendToAgent(instanceId, { type: "config_update", autoFix: instance.autoFix });
  broadcastToBrowsers(instanceId, { type: "autofix_config", instanceId, autoFix: instance.autoFix });

  res.json({ ok: true, autoFix: instance.autoFix });
});

app.get("/autofix/config/:instanceId", (req, res) => {
  const { instanceId } = req.params;
  const instance = getOrCreateInstance(instanceId);
  res.json({ autoFix: instance.autoFix });
});

app.get("/autofix/history/:instanceId", (req, res) => {
  const { instanceId } = req.params;
  res.json({ history: fixHistory[instanceId] || [] });
});

app.post("/autofix/trigger/:instanceId", (req, res) => {
  const { instanceId } = req.params;
  const instance = getOrCreateInstance(instanceId);
  if (!instance.autoFix.command.trim()) {
    return res.status(400).json({ error: "No auto-fix command configured" });
  }
  const fixId = randomUUID();
  const agentReachable = sendToAgent(instanceId, {
    type: "run_fix",
    fixId,
    command: instance.autoFix.command,
    triggeredBy: "manual",
  });
  const fixRecord = {
    fixId,
    triggeredBy: "manual",
    command: instance.autoFix.command,
    triggeredAt: new Date().toISOString(),
    status: agentReachable ? "sent" : "agent_offline",
  };
  if (!fixHistory[instanceId]) fixHistory[instanceId] = [];
  fixHistory[instanceId].push(fixRecord);
  broadcastToBrowsers(instanceId, { type: "autofix_triggered", instanceId, fix: fixRecord });
  res.json({ ok: agentReachable, fix: fixRecord });
});

app.post("/ai/chat", async (req, res) => {
  const { instanceId, message, entryId } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });
  const instance = getOrCreateInstance(instanceId);
  const entry = entryId ? instance.logs.find((l) => l.id === entryId) : instance.logs[instance.logs.length - 1];
  const recent = instance.logs.slice(-10);
  const contextStr = recent.map((l) => `[${l.cleaned?.level || "?"}] ${l.cleaned?.message || l.raw}`).join("\n");
  try {
    const prompt = `You are an expert DevOps AI agent. Here are the recent logs:\n${contextStr}\n\nThe failing log: ${entry?.cleaned?.message || entry?.raw || "N/A"}\n\nUser question: ${message}\n\nProvide a clear, actionable answer.`;
    const result = await geminiModel.generateContent(prompt);
    res.json({ reply: result.response.text() });
  } catch (err) {
    console.error(`[GEMINI CHAT ERROR] ${err.message}`);
    res.status(500).json({ error: "AI unavailable. Check GEMINI_API_KEY." });
  }
});

app.post("/ai/fix", async (req, res) => {
  const { instanceId, entryId } = req.body;
  if (!instanceId || !entryId) return res.status(400).json({ error: "instanceId and entryId required" });
  const instance = getOrCreateInstance(instanceId);
  const entry = instance.logs.find((l) => l.id === entryId);
  if (!entry) return res.status(404).json({ error: "Entry not found" });
  const suggestion = await getGeminiFix(entry, instance.logs.slice(-10));
  if (!suggestion) return res.status(500).json({ error: "AI unavailable" });
  entry.aiSuggestion = suggestion;
  res.json({ suggestion });
});

app.get("/logs/:instanceId", (req, res) => {
  const { instanceId } = req.params;
  if (!activeInstances[instanceId]) return res.status(404).json({ error: "Instance not found" });
  res.json({ instanceId, logs: activeInstances[instanceId].logs });
});

app.get("/status/:instanceId", (req, res) => {
  const { instanceId } = req.params;
  if (!activeInstances[instanceId]) return res.status(404).json({ error: "Instance not found" });
  const agentOnline = agentSockets.has(instanceId) && agentSockets.get(instanceId).readyState === 1;
  res.json({ instanceId, status: "good", totalLogs: activeInstances[instanceId].logs.length, agentOnline });
});

app.post("/auth/login", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  res.json({ token: `demo-${randomUUID()}`, email });
});

app.post("/auth/register", (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) return res.status(400).json({ error: "Email and password required" });
  res.json({ token: `demo-${randomUUID()}`, email });
});

wss.on("connection", (ws) => {
  let role = null;     
  let instanceId = null;

  ws.send(JSON.stringify({ type: "connected" }));

  ws.on("message", (raw) => {
    let data;
    try { data = JSON.parse(raw.toString()); }
    catch { return ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" })); }

    if (data.type === "agent_register" && data.instanceId) {
      role = "agent";
      instanceId = data.instanceId;
      getOrCreateInstance(instanceId);

      const prev = agentSockets.get(instanceId);
      if (prev && prev !== ws) prev.close();
      agentSockets.set(instanceId, ws);

      console.log(`[Agent] Registered → ${instanceId}`);
      ws.send(JSON.stringify({ type: "registered", instanceId }));
      broadcastToBrowsers(instanceId, { type: "agent_online", instanceId });

      const cfg = activeInstances[instanceId]?.autoFix;
      if (cfg) ws.send(JSON.stringify({ type: "config_update", autoFix: cfg }));
      return;
    }

    if (data.type === "log_line" && data.instanceId && data.log_line) {
      const entryId = randomUUID();
      const timestamp = new Date().toISOString();
      processLog(data.instanceId, data.log_line, entryId, timestamp);
      return;
    }

    if (data.type === "fix_result" && data.instanceId) {
      const hist = fixHistory[data.instanceId];
      if (hist) {
        const record = hist.find((r) => r.fixId === data.fixId);
        if (record) {
          record.status = data.success ? "success" : "failed";
          record.stdout = data.stdout;
          record.stderr = data.stderr;
          record.finishedAt = data.finishedAt;
        }
      }
      broadcastToBrowsers(data.instanceId, { type: "fix_result", ...data });
      return;
    }

    if (data.type === "fix_started" && data.instanceId) {
      broadcastToBrowsers(data.instanceId, { type: "fix_started", ...data });
      return;
    }

    if (data.type === "fix_skipped" && data.instanceId) {
      broadcastToBrowsers(data.instanceId, { type: "fix_skipped", ...data });
      return;
    }

    if (data.type === "subscribe" && data.instanceId) {
      role = "browser";
      instanceId = data.instanceId;
      getOrCreateInstance(instanceId);

      if (!browserSockets.has(instanceId)) browserSockets.set(instanceId, new Set());
      browserSockets.get(instanceId).add(ws);

      const inst = activeInstances[instanceId];
      const agentOnline = agentSockets.has(instanceId) && agentSockets.get(instanceId).readyState === 1;

      ws.send(JSON.stringify({
        type: "subscribed",
        instanceId,
        existingLogs: inst.logs,
        autoFix: inst.autoFix,
        agentOnline,
        fixHistory: fixHistory[instanceId] || [],
      }));
      return;
    }
  });

  ws.on("close", () => {
    if (role === "agent" && instanceId) {
      agentSockets.delete(instanceId);
      console.log(`[Agent] Disconnected → ${instanceId}`);
      broadcastToBrowsers(instanceId, { type: "agent_offline", instanceId });
    }
    if (role === "browser" && instanceId) {
      browserSockets.get(instanceId)?.delete(ws);
    }
  });

  ws.on("error", (err) => console.error("[WS ERROR]", err.message));
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`✅ Server    → http://localhost:${PORT}`);
  console.log(`✅ WebSocket → ws://localhost:${PORT}`);
});