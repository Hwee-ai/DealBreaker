# Vercel Next.js + Azure OpenAI (Edge + Streaming)
Last Update : 27th Sep 2025  version 1.2.1
## Local dev
1. `npm i`
2. Copy `.env.example` → `.env.local` and set Azure values.
3. `npm run dev`, open http://localhost:3000/agent_demo.html

## Deploy to Vercel
```bash
npm i -g vercel
vercel login
vercel          # first deploy (link project)
vercel --prod   # production deploy
```

Set environment variables in Vercel → Project → Settings → Environment Variables:
- AZURE_OPENAI_ENDPOINT
- AZURE_OPENAI_API_KEY
- AZURE_OPENAI_DEPLOYMENT
- AZURE_OPENAI_API_VERSION
- AZURE_OPENAI_TIMEOUT_MS (optional)

## Endpoints
- `POST /api/agent` — non-streaming chat completion (Edge)
- `POST /api/agent/stream` — SSE streaming (Edge)

## Demo page
- `/agent_demo.html` calls `/api/agent/stream` and appends tokens as they arrive.
