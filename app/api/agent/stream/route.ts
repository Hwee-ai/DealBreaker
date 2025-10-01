// TEMP: comment out until everything is verified on Node
// export const runtime = 'edge';
// export const preferredRegion = ['sin1', 'hkg1', 'bom1'];

import { NextRequest } from 'next/server';

function sse(data: unknown, event?: string) {
  return (event ? `event: ${event}\n` : '') + `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  // Safe JSON parse
  let message: string | undefined;
  try {
    const body = await req.json();
    if (typeof body?.message === 'string' && body.message.trim()) {
      message = body.message.trim();
    }
  } catch {
    // fall through
  }
  if (!message) message = 'Hello';

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
        const upstream = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            'authorization': `Bearer ${apiKey}`,
            'accept': 'text/event-stream', // important for some proxies
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

        if (!upstream.ok || !upstream.body) {
          const detail = await upstream.text().catch(() => '');
          controller.enqueue(encoder.encode(sse({ detail }, 'error')));
          controller.enqueue(encoder.encode(sse('[DONE]', 'done')));
          controller.close();
          return;
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });

          // Split on *double* newline (SSE record separator)
          const records = buffer.split('\n\n');
          buffer = records.pop() ?? '';

          for (const rec of records) {
            const line = rec.trim();
            if (!line.startsWith('data:')) continue;
            const payload = line.slice(5).trim();

            if (payload === '[DONE]') {
              controller.enqueue(encoder.encode(sse('[DONE]', 'done')));
              controller.close();
              return;
            }

            try {
              const json = JSON.parse(payload);
              const chunk = json?.choices?.[0]?.delta?.content;
              if (chunk) controller.enqueue(encoder.encode(sse({ text: chunk })));
            } catch {
              // ignore JSON parse errors for non-data lines
            }
          }
        }

        controller.enqueue(encoder.encode(sse('[DONE]', 'done')));
        controller.close();
      } catch (err) {
        controller.enqueue(encoder.encode(sse({ detail: String(err) }, 'error')));
        controller.enqueue(encoder.encode(sse('[DONE]', 'done')));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
      // DO NOT set 'Connection' in Edge/Fetch responses
    },
  });
}
