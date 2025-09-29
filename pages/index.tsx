import { useRef, useState } from 'react';

export default function Home() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<Array<{role:'user'|'assistant', content:string}>>([
    { role: 'assistant', content: 'Hi! Ask me anything.' }
  ]);
  const streamingRef = useRef<HTMLDivElement | null>(null);

  async function send() {
    const msg = input.trim();
    if (!msg) return;
    setMessages(prev => [...prev, { role: 'user', content: msg }, { role: 'assistant', content: '' }]);
    setInput('');

    const res = await fetch('/api/agent', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ message: msg })
    });

    if (!res.ok || !res.body) {
      setMessages(prev => {
        const copy = [...prev];
        copy[copy.length-1] = { role: 'assistant', content: 'Error contacting server.' };
        return copy;
      });
      return;
    }

    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';
    let full = '';

    while (true) {
      const { value, done } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const chunks = buffer.split('\n\n');
      buffer = chunks.pop() || '';

      for (const chunk of chunks) {
        const line = chunk.split('\n').find(l => l.startsWith('data:'));
        if (!line) continue;
        const data = line.slice(5).trim();
        if (data === '[DONE]') continue;
        try {
          const obj = JSON.parse(data);
          if (obj.text) {
            full += obj.text;
            setMessages(prev => {
              const copy = [...prev];
              copy[copy.length-1] = { role: 'assistant', content: full };
              return copy;
            });
          }
        } catch {}
      }
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === 'Enter') send();
  }

  return (
    <div style={{ fontFamily: '-apple-system,BlinkMacSystemFont,Segoe UI,system-ui,sans-serif', background:'#f8fafc', minHeight:'100vh' }}>
      <div style={{ maxWidth: 960, margin: '0 auto', padding: 24 }}>
        <h1 style={{ marginBottom: 8 }}><span role="img" aria-label="robot">🤖</span> dealBreaker – OpenAI Streaming Chat</h1>
        <p style={{ color:'#475569', marginBottom: 16 }}>This page streams the response word-by-word via SSE from <code>/api/agent</code>.</p>

        <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, boxShadow:'0 2px 8px rgba(0,0,0,0.04)', padding: 16 }}>
          <div style={{ border:'1px solid #e2e8f0', borderRadius:10, height: 480, display:'flex', flexDirection:'column', background:'#fff' }}>
            <div style={{ flex:1, padding: 16, overflowY:'auto', background:'#f1f5f9' }} ref={streamingRef}>
              {messages.map((m, idx) => (
                <div key={idx} style={{
                  margin: '10px 0',
                  padding: '10px 12px',
                  borderRadius: 10,
                  maxWidth: '80%',
                  lineHeight: 1.5,
                  color: m.role === 'user' ? '#fff' : '#0f172a',
                  background: m.role === 'user' ? '#1e40af' : '#fff',
                  marginLeft: m.role === 'user' ? 'auto' : undefined,
                  border: m.role === 'user' ? 'none' : '1px solid #e2e8f0'
                }}>
                  <strong>{m.role === 'user' ? 'You' : 'AI Assistant'}:</strong> {m.content}
                </div>
              ))}
            </div>
            <div style={{ padding: 12, borderTop: '1px solid #e2e8f0', display:'flex', gap:8 }}>
              <input
                placeholder="Type a message and press Enter..."
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={onKey}
                style={{ flex:1, padding:12, border:'1px solid #cbd5e1', borderRadius:8, fontSize:15 }}
              />
              <button onClick={send} style={{ background:'#1e40af', color:'#fff', border:'none', padding:'10px 16px', borderRadius:8, fontWeight:600, cursor:'pointer' }}>
                Send
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
