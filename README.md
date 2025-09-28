# DealBreaker – Vercel Next.js Scaffold (ESM config fix)
# 

This build uses **next.config.mjs** (ESM) to match `"type": "module"`.
Last Update 28th Sept 2025 1.0.2

## Deploy on Vercel (DealBreaker/main)
1. Place these files at your repo **root** on branch **main**.
2. Import the repo in Vercel (Next.js auto-detected).
3. Build settings:
   - Install: `npm install`
   - Build: `next build`
   - Output: *(empty)*
   - Root Directory: *(empty — root project)*
4. Add env vars:
   - `AZURE_OPENAI_ENDPOINT`, `AZURE_OPENAI_API_KEY`,
   - `AZURE_OPENAI_DEPLOYMENT`, `AZURE_OPENAI_API_VERSION`,
   - `AZURE_OPENAI_TIMEOUT_MS` (optional)
5. Deploy → open `/INDEX.html`.
