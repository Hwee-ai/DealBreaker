import { NextRequest } from 'next/server';

const MODEL = process.env.OPENAI_MODEL || 'gpt-4o';

function frame(data: unknown, event?: string) {
  return (event ? `event: ${event}\n` : '') + `data: ${JSON.stringify(data)}\n\n`;
}

export async function POST(req: NextRequest) {
  let message = 'Hello';
  try {
    const b = await req.json();
    if (typeof b?.message === 'string' && b.message.trim()) message = b.message.trim();
  } catch {}

  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    return new Response(frame({ detail: 'Missing required environment variable: OPENAI_API_KEY' }, 'error') + 'data: [DONE]\n\n', {
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
          },
          body: JSON.stringify({
            model: MODEL,
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
          const detail = await upstream.text().catch(() => String(upstream.status));
          controller.enqueue(encoder.encode(frame({ detail }, 'error')));
          controller.enqueue(encoder.encode('data: [DONE]\n\n'));
          controller.close();
          return;
        }

        const reader = upstream.body.getReader();
        const decoder = new TextDecoder();
        let buffer = '';

        // prime an empty bot line
        controller.enqueue(encoder.encode(frame({ text: '' })));

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const records = buffer.split('\n\n');
          buffer = records.pop() ?? '';

          for (const rec of records) {
            const lines = rec.split('\n');
            for (const raw of lines) {
              const s = raw.trim();
              if (!s.startsWith('data:')) continue;
              const payload = s.slice(5).trim();
              if (payload === '[DONE]') {
                controller.enqueue(encoder.encode('data: [DONE]\n\n'));
                controller.close();
                return;
              }
              try {
                const json = JSON.parse(payload);
                const delta = json?.choices?.[0]?.delta?.content;
                if (delta) controller.enqueue(encoder.encode(frame({ text: delta })));
              } catch {
                // ignore malformed frames
              }
            }
          }
        }

        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      } catch (e) {
        controller.enqueue(encoder.encode(frame({ detail: String(e) }, 'error')));
        controller.enqueue(encoder.encode('data: [DONE]\n\n'));
        controller.close();
      }
    },
  });

  return new Response(stream, {
    headers: {
      'content-type': 'text/event-stream; charset=utf-8',
      'cache-control': 'no-cache',
    },
  });
}
