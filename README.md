# DealBreaker – Next.js (Vercel) with Root Layout + ESM config

This scaffold fixes the "page.tsx doesn't have a root layout" and "module is not defined in ES module scope" errors by adding:
- `app/layout.tsx` (root layout, required by the app router)
- `next.config.mjs` (ESM) to match `"type": "module"`

It also includes Azure OpenAI **Edge** endpoints and streams tokens to your `INDEX.html` if the expected function signatures are present.

## Deploy on Vercel (DealBreaker/main)
1. Put these files at your repo **root** on branch **main**.
2. Vercel → New Project → Import the repo (Framework: Next.js auto).
3. Build settings (defaults work):
   - Install: `npm install`
   - Build: `next build`
   - Output dir: *(empty)*
   - Root Directory: *(empty — root project)*
4. Add env vars (Production):
   - `AZURE_OPENAI_ENDPOINT`
   - `AZURE_OPENAI_API_KEY`
   - `AZURE_OPENAI_DEPLOYMENT`
   - `AZURE_OPENAI_API_VERSION`
   - `AZURE_OPENAI_TIMEOUT_MS` (optional)
5. Deploy → open `/INDEX.html`.
