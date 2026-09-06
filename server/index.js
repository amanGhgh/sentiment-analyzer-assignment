const express = require("express");
const cors = require("cors");
const { analyze } = require("./analyzer");
const app = express();
app.use(cors());
app.use(express.json({ limit: "1mb" }));
function isValidAnalysis(data) {
  return (
    data &&
    ["Positive", "Negative", "Neutral"].includes(data.overallSentiment) &&
    typeof data.sentimentScore === "number" &&
    data.sentimentBreakdown &&
    Array.isArray(data.sentenceAnalysis) &&
    typeof data.conversationSummary === "string"
  );
}
async function requestN8n(text) {
  const response = await fetch(process.env.N8N_WEBHOOK_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ text }),
  });
  const data = await response.json().catch(() => null);
  if (!response.ok || !isValidAnalysis(data))
    throw new Error("n8n returned an invalid analysis response.");
  return data;
}
app.get("/api/health", (_, res) => res.json({ ok: true }));
app.post("/api/analyze", async (req, res) => {
  const text = String(req.body?.text || "").trim();
  if (text.length < 5)
    return res.status(400).json({
      error: "Please upload a conversation with at least a few words.",
    });
  if (text.length > 100000)
    return res.status(400).json({
      error:
        "The conversation is too long. Please upload a file below 100,000 characters.",
    });
  try {
    if (process.env.N8N_WEBHOOK_URL)
      return res.json({ ...(await requestN8n(text)), source: "n8n + LLM" });
    return res.json({ ...analyze(text), source: "Offline demo fallback" });
  } catch (_) {
    return res.status(502).json({
      error:
        "Analysis service is unavailable. Check the n8n webhook configuration.",
    });
  }
});
const PORT = process.env.PORT || 3001;

app.listen(PORT, () =>
  console.log(`Analysis API running on port ${PORT}`)
);
