// /pages/api/agent.js
export const config = { api: { bodyParser: true } };

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST');
    return res.status(405).end('Method Not Allowed');
  }

  let body;
  try {
    body = typeof req.body === 'string' ? JSON.parse(req.body) : req.body;
    if (!body || !body.message) throw new Error('Missing "message"');
  } catch (e) {
    return res.status(400).json({ error: 'Invalid JSON body: ' + e.message });
  }

  const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
  const MODEL = process.env.OPENAI_MODEL || 'gpt-4o-mini';
  if (!OPENAI_API_KEY) return res.status(500).json({ error: 'OPENAI_API_KEY not set' });

  const messages = [];
  if (body.system) messages.push({ role: 'system', content: body.system });
  if (Array.isArray(body.history)) messages.push(...body.history);
  messages.push({ role: 'user', content: body.message });

  res.setHeader('Content-Type', 'text/event-stream; charset=utf-8');
  res.setHeader('Cache-Control', 'no-cache, no-transform');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders?.();

  try {
    const openaiRes = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${OPENAI_API_KEY}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ model: MODEL, stream: true, temperature: 0.2, messages })
    });

    if (!openaiRes.ok || !openaiRes.body) {
      const errText = await openaiRes.text().catch(() => '');
      res.write(`data: ${JSON.stringify({ text: 'Error contacting OpenAI: ' + (errText || openaiRes.status) })}\n\n`);
      res.write('data: [DONE]\n\n'); return res.end();
    }

    const decoder = new TextDecoder();
    let buffer = '';
    for await (const chunk of openaiRes.body) {
      buffer += decoder.decode(chunk, { stream: true });
      const lines = buffer.split('\n'); buffer = lines.pop() || '';
      for (const line of lines) {
        const t = line.trim(); if (!t.startsWith('data:')) continue;
        const data = t.slice(5).trim();
        if (data === '[DONE]') { res.write('data: [DONE]\n\n'); return res.end(); }
        try {
          const json = JSON.parse(data);
          const delta = json?.choices?.[0]?.delta?.content;
          if (delta) res.write(`data: ${JSON.stringify({ text: delta })}\n\n`);
        } catch {}
      }
    }
    res.write('data: [DONE]\n\n'); res.end();
  } catch (err) {
    res.write(`data: ${JSON.stringify({ text: 'Network error: ' + String(err) })}\n\n`);
    res.write('data: [DONE]\n\n'); res.end();
  }
}
