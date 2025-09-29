# dealBreaker – React page at `/` + OpenAI Streaming (Vercel-ready)

This scaffold loads a **React chat UI at the root path `/`** (pages router) and streams responses from OpenAI **word-by-word** via Server-Sent Events (SSE).

## Quick Start (Local)
```bash
npm i
npm run dev
# open http://localhost:3000/
```

## Deploy on Vercel
1. Push this repo to GitHub/GitLab.
2. Vercel → New Project → Import repo (Framework: Next.js auto-detected).
3. Add environment variables:
   - `OPENAI_API_KEY` = `sk-...`
   - *(optional)* `OPENAI_MODEL` = `gpt-4o-mini`
4. Build settings (defaults are fine):
   - Install: `npm install`
   - Build: `npm run build`
   - Output: *(leave empty)*

## Files
- `pages/index.tsx` – React chat UI at `/`, streams from `/api/agent`.
- `pages/api/agent.js` – Node API route that proxies OpenAI and re-emits **SSE** as `data: {"text": "..."}`.
- `package.json`, `next.config.mjs`, `tsconfig.json` – Standard Next.js config.
- `.env.example` – Example environment variables.
- `.gitignore` – Common ignores.

## Notes
- Your API key must remain server-side only (in env vars).
- Swap models via `OPENAI_MODEL`. For Azure OpenAI, request the Azure-compatible `agent.js` variant.
