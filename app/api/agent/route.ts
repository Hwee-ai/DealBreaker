export const runtime = 'edge';
export const preferredRegion = ['sin1','hkg1','bom1'];

import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { message } = await req.json();
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), Number(process.env.AZURE_OPENAI_TIMEOUT_MS || 7000));

  try {
    const url = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`;
    const r = await fetch(url, {
      method: "POST",
      headers: {
        "content-type": "application/json",
        "api-key": process.env.AZURE_OPENAI_API_KEY!,
      },
      body: JSON.stringify({
        messages: [
          { role: "system", content: "You are a helpful assistant for a Singapore Government user portal." },
          { role: "user", content: message || "Hello" }
        ],
        temperature: 0.2,
        max_tokens: 300
      }),
      signal: ctrl.signal
    });

    clearTimeout(t);
    if (!r.ok) {
      return NextResponse.json({ error: "LLM error", detail: await r.text() }, { status: 500 });
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    return new NextResponse(JSON.stringify({ text }), {
      headers: { "content-type": "application/json" }
    });
  } catch (e: any) {
    return NextResponse.json({ error: "Timeout or network error", detail: String(e) }, { status: 504 });
  }
}
