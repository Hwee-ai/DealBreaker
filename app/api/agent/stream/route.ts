// export const runtime = 'edge'; // You can keep Edge, but comment out temporarily if you want to sanity-test on Node.
// export const preferredRegion = ['sin1', 'hkg1', 'bom1'];
import { NextRequest } from 'next/server';

function sse(data: unknown, event?: string) {
  return (event ? `event: ${event}\n` : '') + `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  let message = 'Hello';
  try {
    const body = await req.json();
    if (typeof body?.message === 'string' && body.message.trim()) {
      message = body.message.trim();
    }
  } catch {
    // If you want, return a 400 here instead of defaulting to 'Hello'
  }

  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL ?? 'gpt-4o-mini';
  if (!apiKey) {
    return new Response(sse({ detail: 'Missing OPENAI_API_KEY' }, 'error'), {
      headers: { 'content-type': 'text/event-stream; charset=utf-8', 'cache-control': 'no-cache' },
      status: 500,
    });
  }

  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const resp = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${apiKey}`,
            'accept': 'text/event-stream',
          },
          body: JSON.stringify({
            model,
            stream: true,
            temperature: 0.2,
            max_tokens: 600,
            messages: [
              { role: 'system', content: 'You are a helpful assistant for a Singapore Government analysis portal.' },
              { role: 'user', content: message },
            ],
          }),
        });

        if (!resp.ok || !resp.body) {
          const detail = await resp.text().catch(() => '');
          controller.enqueue(encoder.encode(sse({ detail }, 'error')));
          controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
          controller.close();
          return;
        }

        const reader = resp.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          const records = buffer.split('\n\n');
          buffer = records.pop() ?? '';

          for (const rec of records) {
            const line = rec.trim();
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();

            if (payload === '[DONE]') {
              controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
              controller.close();
              return;
            }

            try {
              const json = JSON.parse(payload);
              const delta = json?.choices?.[0]?.delta?.content;
              if (delta) controller.enqueue(encoder.encode(`data: ${JSON.stringify({ text: delta })}\n\n`));
            } catch {
              // ignore non-JSON frames
            }
          }
        }

        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      } catch (e) {
        controller.enqueue(encoder.encode(sse({ detail: String(e) }, 'error')));
        controller.enqueue(encoder.encode(`data: [DONE]\n\n`));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      // DO NOT set 'Connection' here
    },
  });
}
