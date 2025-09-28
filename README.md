# DealBreaker – Vercel Next.js Scaffold (Azure OpenAI, Edge, Streaming)

This repo is ready to deploy on **Vercel**. It uses your uploaded `INDEX.html` (now wired to stream from `/api/agent/stream`).

## What you get
- `public/INDEX.html` — your UI, patched to call `/api/agent/stream` with token streaming
- `app/api/agent/route.ts` — non-streaming chat (Edge)
- `app/api/agent/stream/route.ts` — streaming SSE proxy to Azure (Edge)
- `app/page.tsx` — landing page linking to `INDEX.html`

## Local dev
```bash
npm i
cp .env.example .env.local   # set your Azure values
npm run dev
# open http://localhost:3000/INDEX.html
```

## Vercel deploy (DealBreaker/main)
1. Put these files at your GitHub repo **root** on branch **main** (DealBreaker/main).
2. In Vercel → **New Project → Import** the repo.
3. Build settings (auto-detected Next.js):
   - Install: `npm install`
   - Build: `next build`
   - Output dir: *(leave empty)*
   - Root Directory: *(leave empty — files at repo root)*
4. **Environment Variables** (Production):
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_DEPLOYMENT`
   - `AZURE_OPENAI_API_VERSION`
   - `AZURE_OPENAI_TIMEOUT_MS` (optional)
5. Deploy → open `/INDEX.html`.

If your repo is a monorepo or you keep this app inside a subfolder, set **Root Directory** in Vercel to that folder.
