# dealBreaker – Next.js + OpenAI Streaming (Vercel-ready)

This scaffold streams OpenAI chat **token-by-token** to a simple chat UI at **`/INDEX.html`**.

## Quick Start

1. **Create a new Git repo** and put these files at the repo root.
2. **Vercel → New Project → Import this repo** (Framework detected: Next.js).
3. **Add Environment Variables** (Project → Settings → Environment Variables):
   - `OPENAI_API_KEY` = `sk-...`
   - *(optional)* `OPENAI_MODEL` = `gpt-4o-mini`
4. **Deploy**, then open: `https://your-app.vercel.app/INDEX.html`

## Local Dev
```bash
npm i
npm run dev
# open http://localhost:3000/INDEX.html
```

## Files
- `public/INDEX.html` – Minimal chat UI, streams from `/api/agent`.
- `pages/api/agent.js` – Node API route that proxies OpenAI and **re-emits SSE** as `data: {"text": "..."}`.
- `package.json`, `next.config.mjs`, `vercel.json`, `tsconfig.json` – Standard Next.js/Vercel config.
- `.env.example` – Example environment variables.

## Notes
- Keep your API key **server-side** only. Never put it in client JS.
- Swap models via `OPENAI_MODEL`. For Azure OpenAI, ask for the Azure variant of this API route.
