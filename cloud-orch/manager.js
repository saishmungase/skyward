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
const geminiModel = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

const activeInstances = {};
const instanceSubscribers = new Map();

function broadcastToInstance(instanceId, payload) {
  const subscribers = instanceSubscribers.get(instanceId);
  if (subscribers && subscribers.size > 0) {
    const message = JSON.stringify(payload);
    subscribers.forEach((client) => {
      if (client.readyState === 1) client.send(message);
    });
  }
}

async function processLogWithGroq(instanceId, rawLog, entryId, timestamp) {
  try {
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

    const responseText = chat.choices[0]?.message?.content || "{}";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const cleanedLog = jsonMatch ? JSON.parse(jsonMatch[0]) : { level: "UNKNOWN", service: "unknown", message: rawLog, anomaly: false, anomalyReason: null };

    const entry = { id: entryId, timestamp, raw: rawLog, cleaned: cleanedLog };
    activeInstances[instanceId].push(entry);
    broadcastToInstance(instanceId, { type: "new_log", instanceId, entry });

    const lvl = (cleanedLog.level || "").toUpperCase();
    if (lvl === "ERROR" || lvl === "WARN") {
      const recent = activeInstances[instanceId].slice(-10);
      const suggestion = await getGeminiFix(entry, recent);
      if (suggestion) {
        const enriched = { ...entry, aiSuggestion: suggestion };
        const idx = activeInstances[instanceId].findIndex((e) => e.id === entryId);
        if (idx !== -1) activeInstances[instanceId][idx] = enriched;
        broadcastToInstance(instanceId, { type: "ai_fix", instanceId, entry: enriched });
      }
    }
  } catch (err) {
    console.error(`[GROQ ERROR] ${err.message}`);
    const fallback = {
      id: entryId,
      timestamp,
      raw: rawLog,
      cleaned: { level: "UNKNOWN", service: "unknown", message: rawLog, anomaly: false, anomalyReason: null },
      aiError: true,
    };
    activeInstances[instanceId].push(fallback);
    broadcastToInstance(instanceId, { type: "new_log", instanceId, entry: fallback, aiError: true });
  }
}

async function getGeminiFix(entry, contextLogs = []) {
  try {
    const contextStr = contextLogs.map((l) => `[${l.cleaned?.level || "?"}] ${l.cleaned?.message || l.raw}`).join("\n");
    const prompt = `You are an expert DevOps AI agent analyzing cloud server logs.

Recent log context (last ${contextLogs.length} logs):
${contextStr}

Failing log:
[${entry.cleaned?.level || "ERROR"}] ${entry.cleaned?.message || entry.raw}

Provide:
1. Root cause analysis
2. Step-by-step fix
3. Prevention recommendation

Be concise and actionable. Plain text, no markdown headers.`;

    const result = await geminiModel.generateContent(prompt);
    return result.response.text();
  } catch (err) {
    console.error(`[GEMINI ERROR] ${err.message}`);
    return null;
  }
}

app.get("/generate-url", (req, res) => {
  const instanceId = randomUUID();
  activeInstances[instanceId] = [];
  const webhookUrl = `${req.protocol}://${req.get("host")}/ingest/${instanceId}`;
  res.json({ instanceId, webhookUrl, status: "Ready to receive logs" });
});

app.post("/ingest/:instanceId", (req, res) => {
  const { instanceId } = req.params;
  const logLine = req.body.log_line;
  if (!logLine) return res.status(400).json({ error: "log_line is required" });
  if (!activeInstances[instanceId]) activeInstances[instanceId] = [];
  const entryId = randomUUID();
  const timestamp = new Date().toISOString();
  res.json({ status: "Log received", entryId });
  processLogWithGroq(instanceId, logLine, entryId, timestamp);
});

app.post("/ai/chat", async (req, res) => {
  const { instanceId, message, entryId } = req.body;
  if (!message) return res.status(400).json({ error: "message is required" });

  const logs = activeInstances[instanceId] || [];
  const entry = entryId ? logs.find((l) => l.id === entryId) : logs[logs.length - 1];
  const recent = logs.slice(-10);
  const contextStr = recent.map((l) => `[${l.cleaned?.level || "?"}] ${l.cleaned?.message || l.raw}`).join("\n");

  try {
    const prompt = `You are an expert DevOps AI agent. Here are the recent logs:\n${contextStr}\n\nThe failing log: ${entry?.cleaned?.message || entry?.raw || "N/A"}\n\nUser question: ${message}\n\nProvide a clear, actionable answer. Plain text, no markdown.`;
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
  const logs = activeInstances[instanceId] || [];
  const entry = logs.find((l) => l.id === entryId);
  if (!entry) return res.status(404).json({ error: "Entry not found" });
  const recent = logs.slice(-10);
  const suggestion = await getGeminiFix(entry, recent);
  if (!suggestion) return res.status(500).json({ error: "AI unavailable" });
  entry.aiSuggestion = suggestion;
  res.json({ suggestion });
});

app.get("/logs/:instanceId", (req, res) => {
  const { instanceId } = req.params;
  if (!activeInstances[instanceId]) return res.status(404).json({ error: "Instance not found" });
  res.json({ instanceId, logs: activeInstances[instanceId] });
});

app.get("/status/:instanceId", (req, res) => {
  const { instanceId } = req.params;
  if (!activeInstances[instanceId]) return res.status(404).json({ error: "Instance not found" });
  res.json({ instanceId, status: "good", totalLogs: activeInstances[instanceId].length });
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
  let subscribedInstanceId = null;

  ws.send(JSON.stringify({ type: "connected", message: 'Send { "type": "subscribe", "instanceId": "..." } to start.' }));

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());
      if (data.type === "subscribe" && data.instanceId) {
        if (subscribedInstanceId) instanceSubscribers.get(subscribedInstanceId)?.delete(ws);
        subscribedInstanceId = data.instanceId;
        if (!instanceSubscribers.has(subscribedInstanceId)) instanceSubscribers.set(subscribedInstanceId, new Set());
        instanceSubscribers.get(subscribedInstanceId).add(ws);
        ws.send(JSON.stringify({
          type: "subscribed",
          instanceId: subscribedInstanceId,
          message: `Subscribed to instance ${subscribedInstanceId}`,
          existingLogs: activeInstances[subscribedInstanceId] || [],
        }));
      }
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
    }
  });

  ws.on("close", () => { if (subscribedInstanceId) instanceSubscribers.get(subscribedInstanceId)?.delete(ws); });
  ws.on("error", (err) => console.error("[WS ERROR]", err.message));
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`✅ Server  → http://localhost:${PORT}`);
  console.log(`✅ WebSocket → ws://localhost:${PORT}`);
});