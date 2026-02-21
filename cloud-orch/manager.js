import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import Groq from "groq-sdk";

const app = express();
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

// In-memory DB: stores logs per instanceId
const activeInstances = {};

// Track WebSocket clients subscribed to a specific instanceId
// Map<instanceId, Set<WebSocket>>
const instanceSubscribers = new Map();

// ─────────────────────────────────────────────
// REST ROUTES
// ─────────────────────────────────────────────

// Generate a unique webhook URL for a cloud instance
app.get("/generate-url", (req, res) => {
  const instanceId = randomUUID();
  activeInstances[instanceId] = [];

  const webhookUrl = `${req.protocol}://${req.get("host")}/ingest/${instanceId}`;

  res.json({
    instanceId,
    webhookUrl,
    status: "Ready to receive logs",
  });
});

// View all stored logs (debug/admin route)
app.get("/logs", (req, res) => {
  res.json({ activeInstances });
});

// Webhook endpoint — cloud instance posts logs here
app.post("/ingest/:instanceId", async (req, res) => {
  const { instanceId } = req.params;
  const logLine = req.body.log_line;

  if (!logLine) {
    return res.status(400).json({ error: "log_line is required" });
  }

  // Initialize storage if first log for this instance
  if (!activeInstances[instanceId]) {
    activeInstances[instanceId] = [];
  }

  // 1. Store raw log in DB
  const rawEntry = {
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    raw: logLine,
    cleaned: null,
  };
  activeInstances[instanceId].push(rawEntry);

  res.json({ status: "Log received", entryId: rawEntry.id });

  processAndBroadcast(instanceId, rawEntry);
});


async function processAndBroadcast(instanceId, entry) {
  try {
    console.log(`[AI] Processing log for instance: ${instanceId}`);

    const chatCompletion = await groq.chat.completions.create({
      model: "llama3-8b-8192",
      messages: [
        {
          role: "system",
          content: `You are a log analysis assistant. Your job is to:
1. Clean and format raw log lines for readability
2. Identify log level (INFO, WARN, ERROR, DEBUG)
3. Extract key information (timestamp, service, message)
4. Flag any anomalies or errors that need attention

Respond with a JSON object in this exact format:
{
  "level": "INFO|WARN|ERROR|DEBUG",
  "service": "extracted service name or unknown",
  "message": "cleaned, human-readable log message",
  "anomaly": true|false,
  "anomalyReason": "reason if anomaly, else null"
}`,
        },
        {
          role: "user",
          content: `Clean and analyze this raw log line:\n\n${entry.raw}`,
        },
      ],
      temperature: 0.2,
      max_tokens: 300,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || "{}";

    let cleanedLog;
    try {
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      cleanedLog = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: responseText };
    } catch {
      cleanedLog = { message: responseText };
    }

    entry.cleaned = cleanedLog;

    const payload = JSON.stringify({
      type: "new_log",
      instanceId,
      entryId: entry.id,
      timestamp: entry.timestamp,
      raw: entry.raw,
      cleaned: cleanedLog,
    });

    const subscribers = instanceSubscribers.get(instanceId);
    if (subscribers && subscribers.size > 0) {
      subscribers.forEach((client) => {
        if (client.readyState === 1) {
          client.send(payload);
        }
      });
      console.log(`[WS] Broadcasted to ${subscribers.size} subscriber(s) of instance: ${instanceId}`);
    } else {
      console.log(`[WS] No subscribers for instance: ${instanceId}`);
    }
  } catch (err) {
    console.error(`[AI ERROR] Failed to process log for ${instanceId}:`, err.message);

    const fallbackPayload = JSON.stringify({
      type: "new_log",
      instanceId,
      entryId: entry.id,
      timestamp: entry.timestamp,
      raw: entry.raw,
      cleaned: { message: entry.raw, level: "UNKNOWN", anomaly: false, anomalyReason: null },
      aiError: true,
    });

    instanceSubscribers.get(instanceId)?.forEach((client) => {
      if (client.readyState === 1) client.send(fallbackPayload);
    });
  }
}

wss.on("connection", (ws) => {
  console.log("[WS] New client connected");

  let subscribedInstanceId = null;

  ws.send(
    JSON.stringify({
      type: "connected",
      message: 'Send { "type": "subscribe", "instanceId": "<your-instance-id>" } to start receiving logs',
    })
  );

  ws.on("message", (message) => {
    try {
      const data = JSON.parse(message.toString());

      if (data.type === "subscribe" && data.instanceId) {
        if (subscribedInstanceId) {
          instanceSubscribers.get(subscribedInstanceId)?.delete(ws);
        }

        subscribedInstanceId = data.instanceId;

        if (!instanceSubscribers.has(subscribedInstanceId)) {
          instanceSubscribers.set(subscribedInstanceId, new Set());
        }
        instanceSubscribers.get(subscribedInstanceId).add(ws);

        console.log(`[WS] Client subscribed to instance: ${subscribedInstanceId}`);

        ws.send(
          JSON.stringify({
            type: "subscribed",
            instanceId: subscribedInstanceId,
            message: `Subscribed! You will now receive real-time logs for instance ${subscribedInstanceId}`,
            existingLogs: activeInstances[subscribedInstanceId] || [],
          })
        );
      }
    } catch (err) {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON message" }));
    }
  });

  ws.on("close", () => {
    if (subscribedInstanceId) {
      instanceSubscribers.get(subscribedInstanceId)?.delete(ws);
      console.log(`[WS] Client unsubscribed from instance: ${subscribedInstanceId}`);
    }
    console.log("[WS] Client disconnected");
  });

  ws.on("error", (err) => {
    console.error("[WS] Socket error:", err.message);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`🚀 Server running at http://localhost:${PORT}`);
  console.log(`📡 WebSocket available at ws://localhost:${PORT}`);
});