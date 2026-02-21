import express from "express";
import http from "http";
import { WebSocketServer } from "ws";
import { randomUUID } from "crypto";
import Groq from "groq-sdk";
import 'dotenv/config';

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const wss = new WebSocketServer({ server });
const groq = new Groq({ apiKey: process.env.GROQ_API_KEY });

const activeInstances = {};
const instanceSubscribers = new Map();

function broadcastToInstance(instanceId, payload) {
  const subscribers = instanceSubscribers.get(instanceId);
  if (subscribers && subscribers.size > 0) {
    const message = JSON.stringify(payload);
    subscribers.forEach((client) => {
      if (client.readyState === 1) {
        client.send(message);
      }
    });
  }
}

async function processLogWithAI(instanceId, rawLog, entryId, timestamp) {
  try {
    const chatCompletion = await groq.chat.completions.create({
      model: "llama-3.3-70b-versatile",
      messages: [
        {
          role: "system",
          content: `You are a log analysis expert. Given a raw log line, return a JSON object with:
{
  "level": "INFO|WARN|ERROR|DEBUG",
  "service": "service name or unknown",
  "message": "clean, concise, human-readable summary",
  "anomaly": true|false,
  "anomalyReason": "string or null"
}
Only return valid JSON. No markdown, no extra text.`,
        },
        {
          role: "user",
          content: rawLog,
        },
      ],
      temperature: 0.2,
      max_tokens: 300,
    });

    const responseText = chatCompletion.choices[0]?.message?.content || "{}";
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    const cleanedLog = jsonMatch ? JSON.parse(jsonMatch[0]) : { message: responseText };

    const entry = {
      id: entryId,
      timestamp,
      raw: rawLog,
      cleaned: cleanedLog,
    };

    activeInstances[instanceId].push(entry);

    broadcastToInstance(instanceId, {
      type: "new_log",
      instanceId,
      entry,
    });
  } catch (err) {
    console.error(`[AI ERROR] ${err.message}`);

    const fallbackEntry = {
      id: entryId,
      timestamp,
      raw: rawLog,
      cleaned: {
        level: "UNKNOWN",
        service: "unknown",
        message: rawLog,
        anomaly: false,
        anomalyReason: null,
      },
    };

    activeInstances[instanceId].push(fallbackEntry);

    broadcastToInstance(instanceId, {
      type: "new_log",
      instanceId,
      entry: fallbackEntry,
      aiError: true,
    });
  }
}

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

app.post("/ingest/:instanceId", (req, res) => {
  const { instanceId } = req.params;
  const logLine = req.body.log_line;

  if (!logLine) {
    return res.status(400).json({ error: "log_line is required" });
  }

  if (!activeInstances[instanceId]) {
    activeInstances[instanceId] = [];
  }

  const entryId = randomUUID();
  const timestamp = new Date().toISOString();

  res.json({ status: "Log received", entryId });

  processLogWithAI(instanceId, logLine, entryId, timestamp);
});

app.get("/status/:instanceId", (req, res) => {
  const { instanceId } = req.params;

  if (!activeInstances[instanceId]) {
    return res.status(404).json({ error: "Instance not found" });
  }

  res.json({
    instanceId,
    status: "good",
    totalLogs: activeInstances[instanceId].length,
  });
});

app.get("/logs/:instanceId", (req, res) => {
  const { instanceId } = req.params;

  if (!activeInstances[instanceId]) {
    return res.status(404).json({ error: "Instance not found" });
  }

  res.json({
    instanceId,
    logs: activeInstances[instanceId],
  });
});

wss.on("connection", (ws) => {
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

        ws.send(
          JSON.stringify({
            type: "subscribed",
            instanceId: subscribedInstanceId,
            message: `Subscribed to instance ${subscribedInstanceId}`,
            existingLogs: activeInstances[subscribedInstanceId] || [],
          })
        );
      }
    } catch {
      ws.send(JSON.stringify({ type: "error", message: "Invalid JSON" }));
    }
  });

  ws.on("close", () => {
    if (subscribedInstanceId) {
      instanceSubscribers.get(subscribedInstanceId)?.delete(ws);
    }
  });

  ws.on("error", (err) => {
    console.error("[WS ERROR]", err.message);
  });
});

const PORT = process.env.PORT || 8000;
server.listen(PORT, () => {
  console.log(`Server running at http://localhost:${PORT}`);
  console.log(`WebSocket available at ws://localhost:${PORT}`);
});