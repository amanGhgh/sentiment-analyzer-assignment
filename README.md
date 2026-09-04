# CallSense - Sentiment Analyzer

A small interview-assignment project for analyzing phone-call transcripts. It accepts a `.txt` file and shows overall sentiment, sentence-level sentiment, a summary, and practical call insights.

## Run locally

```powershell
npm install
npm run dev
```

Open `http://127.0.0.1:5173`. The login is intentionally a local demo. Upload `sample-data/demo-call.txt` or select **Use demo call**.

## Architecture

`React UI -> Express API -> n8n webhook -> OpenAI -> structured result -> dashboard`

Express validates the text and keeps the n8n URL away from the browser. n8n owns the LLM prompt, the OpenAI request, and response parsing. If no n8n URL is configured, Express uses the clearly labelled offline demo fallback in `server/analyzer.js`; it is not presented as AI analysis.

## n8n setup

1. Import `n8n/sentiment-analyzer-workflow.json` in n8n.
2. Set `OPENAI_API_KEY` in the n8n environment and allow node environment access if your n8n deployment restricts it.
3. Activate the workflow and copy its production webhook URL.
4. Set that URL as `N8N_WEBHOOK_URL` before starting the Express server.

For example in PowerShell:

```powershell
$env:N8N_WEBHOOK_URL = 'http://localhost:5678/webhook/sentiment-analyze'
npm run dev
```

The OpenAI key belongs only in n8n. Never put it in React code or commit it to the repository.

## Files

- `src/main.jsx` - login, upload, loading/error states, and dashboard.
- `server/index.js` - validates requests and calls n8n or the demo fallback.
- `server/analyzer.js` - transparent offline demo fallback for local testing.
- `n8n/sentiment-analyzer-workflow.json` - orchestration, LLM prompt, and JSON parsing.
- `sample-data/demo-call.txt` - sample transcript.

