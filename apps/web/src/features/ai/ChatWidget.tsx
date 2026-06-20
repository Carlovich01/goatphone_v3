import { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send } from 'lucide-react';
import { ChatMessage } from '@goatphone/shared';
import { api } from '@/lib/api';
import { Button } from '@/components/ui';
import { Markdown } from '@/components/Markdown';
import { useAuth } from '@/store/auth';
import { useCompare } from '@/store/compare';
import { Link } from 'react-router-dom';

export function ChatWidget() {
  const { user } = useAuth();
  const { ids: comparedIds } = useCompare();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([
    { role: 'assistant', content: '¡Hola! Preguntame sobre estos celulares o pedime alternativas en stock.' },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, open]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;
    const next = [...messages, { role: 'user' as const, content: text }];
    setMessages(next);
    setInput('');
    setLoading(true);
    try {
      const res = await api.post<{ reply: string }>('/ai/chat', {
        message: text,
        comparedIds,
        history: messages.slice(-4),
      });
      setMessages((m) => [...m, { role: 'assistant', content: res.reply }]);
    } catch (err: any) {
      setMessages((m) => [...m, { role: 'assistant', content: `⚠️ ${err.message || 'Error al consultar la IA'}` }]);
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-50 flex items-center gap-2 rounded-full bg-slate-950 px-5 py-3 font-medium text-white shadow-lg transition hover:bg-slate-800"
      >
        <MessageCircle size={20} className="text-brand-light" /> Chat IA
      </button>
    );
  }

  return (
    <div className="fixed bottom-6 right-6 z-50 flex h-[28rem] w-[22rem] flex-col rounded-xl border border-slate-800 bg-slate-950 text-white shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 px-4 py-3">
        <span className="flex items-center gap-2 font-semibold">
          <MessageCircle size={18} className="text-brand-light" /> Asistente GOATPHONE
        </span>
        <button onClick={() => setOpen(false)} className="text-slate-400 hover:text-white">
          <X size={18} />
        </button>
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto p-3">
        {messages.map((m, i) => (
          <div key={i} className={`flex ${m.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div
              className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                m.role === 'user' ? 'bg-brand text-white' : 'bg-slate-800 text-slate-100'
              }`}
            >
              {m.role === 'user' ? (
                <span className="whitespace-pre-wrap">{m.content}</span>
              ) : (
                <Markdown text={m.content} className="space-y-1.5" />
              )}
            </div>
          </div>
        ))}
        {loading && <div className="text-xs text-slate-400">Escribiendo…</div>}
        <div ref={bottomRef} />
      </div>

      {user ? (
        <div className="flex gap-2 border-t border-slate-800 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && send()}
            placeholder="Escribí tu pregunta…"
            className="flex-1 rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-brand"
          />
          <Button variant="primary" className="px-3" onClick={send} disabled={loading}>
            <Send size={16} />
          </Button>
        </div>
      ) : (
        <div className="border-t border-slate-800 p-3 text-center text-sm text-slate-400">
          <Link to="/login" className="text-brand-light">Iniciá sesión</Link> para chatear con la IA.
        </div>
      )}
    </div>
  );
}
