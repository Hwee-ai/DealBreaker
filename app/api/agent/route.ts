
import { NextRequest, NextResponse } from 'next/server';

const MODEL = 'gpt-4o';

function ensure(name: string, val: string | undefined) {
  if (!val) throw new Error(`Missing required environment variable: ${name}`);
  return val;
}

export async function POST(req: NextRequest) {
  let message = 'Hello';
  try {
    const body = await req.json();
    if (typeof body?.message === 'string' && body.message.trim()) {
      message = body.message.trim();
    }
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  try {
    const apiKey = ensure('OPENAI_API_KEY', process.env.OPENAI_API_KEY);

    const r = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: MODEL,
        messages: [
          { role: 'system', content: 'You are a helpful assistant for a Singapore Government analysis portal.' },
          { role: 'user', content: message },
        ],
        temperature: 0.2,
        max_tokens: 500,
      }),
    });

    if (!r.ok) {
      const detail = await r.text().catch(() => '');
      return NextResponse.json({ error: 'LLM error', detail }, { status: 502 });
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content ?? '';
    return NextResponse.json({ text });
  } catch (e: any) {
    const detail = e?.message ?? String(e);
    const isConfig = detail.startsWith('Missing required environment variable');
    return NextResponse.json(
      { error: isConfig ? 'Configuration error' : 'Network error', detail },
      { status: isConfig ? 500 : 504 },
    );
  }
}
