import { NextRequest, NextResponse } from 'next/server';


export async function POST(req: NextRequest) {
 const { message } = (await req.json()) as { message: string };
 const ctrl = new AbortController();
 const timeout = setTimeout(() => ctrl.abort(), Number(process.env.AZURE_OPENAI_TIMEOUT_MS || 7000));
 try {
  const url = `${process.env.AZURE_OPENAI_ENDPOINT}/openai/deployments/${process.env.AZURE_OPENAI_DEPLOYMENT}/chat/completions?api-version=${process.env.AZURE_OPENAI_API_VERSION}`;
  const r = await fetch(url, {
  method: 'POST',
  headers: { 'content-type': 'application/json', 'api-key': process.env.AZURE_OPENAI_API_KEY! },
  body: JSON.stringify({
   messages: [
    { role: 'system', content: 'You are a helpful assistant for a Singapore Government user portal.' },
    { role: 'user', content: message || 'Hello' },
   ],
   temperature: 0.2,
   max_tokens: 300,
  }),
  signal: ctrl.signal,
 });
clearTimeout(timeout);
 if (!r.ok) return NextResponse.json({ error: 'LLM error', detail: await r.text() }, { status: 500 });
  return NextResponse.json(await r.json());
 } catch (e: any) {
  return NextResponse.json({ error: 'Timeout or network error', detail: String(e) }, { status: 504 });
 }
}