const express = require('express');
const { randomUUID } = require('crypto');

const app = express();
app.use(express.json());

const activeInstances = {};

app.get('/generate-url', (req, res) => {
    const instanceId = randomUUID();
    activeInstances[instanceId] = [];
    
    const webhookUrl = `${req.protocol}://${req.get('host')}/ingest/${instanceId}`;
    
    res.json({
        instanceId,
        webhookUrl,
        status: "Ready to receive logs"
    });
});

app.get("/logs", (req, res) => {
    res.json({
        activeInstances
    })
})

app.post('/ingest/:instanceId', (req, res) => {
    const { instanceId } = req.params;
    const logLine = req.body.log_line;
    
    if (!activeInstances[instanceId]) {
        activeInstances[instanceId] = [];
    }

    activeInstances[instanceId].push(logLine);
    
    processLogWithAI(instanceId, logLine);

    res.json({ status: "Log received" });
});

function processLogWithAI(instanceId, logLine) {
    console.log(`[AI AGENT] Analyzing log from ${instanceId}: ${logLine}`);
}

app.listen(8000, () => {
    console.log('Cloud Ingestion API running on port 8000');
});