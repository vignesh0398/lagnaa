import { useEffect, useRef, useState } from 'react';
import { Loader2, Send, X } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import { workerBeeChat, type WorkerBeeChatMessage } from '../../api/workerbee';
import { useAuth } from '../../hooks/useAuth';
import { BeeIcon } from './BeeIcon';

const QUICK_PROMPTS = [
  'How do I set up voice calls?',
  'Connect Twilio and Groq',
  'Import contacts from Excel',
  'GoHighLevel webhook setup',
];

type WorkerBeeChatProps = {
  onClose: () => void;
};

export function WorkerBeeChat({ onClose }: WorkerBeeChatProps) {
  const { user, isAdmin } = useAuth();
  const location = useLocation();
  const [messages, setMessages] = useState<WorkerBeeChatMessage[]>([
    {
      role: 'assistant',
      content: `Hi${user?.name ? ` ${user.name.split(' ')[0]}` : ''}! I'm WorkerBee — your Lagnaa guide. Ask me about setup, voice calls, contacts, GHL, agents, GDPR, or any page you're on.`,
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async (textOverride?: string) => {
    const text = (textOverride ?? input).trim();
    if (!text || loading) return;

    const userMsg: WorkerBeeChatMessage = { role: 'user', content: text };
    const historyForApi = messages;
    setMessages((prev) => [...prev, userMsg]);
    setInput('');
    setError('');
    setLoading(true);

    try {
      const result = await workerBeeChat(text, historyForApi, {
        pathname: location.pathname,
        userName: user?.name,
        isAdmin,
      });
      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Chat failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="pointer-events-auto flex w-[min(22rem,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl border border-white/10 bg-surface-900/95 shadow-2xl backdrop-blur-xl">
      <div className="flex items-center gap-2.5 border-b border-white/10 px-4 py-3">
        <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-amber-400/15 ring-1 ring-amber-400/25">
          <BeeIcon size={22} animated />
        </div>
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold text-white">WorkerBee</p>
          <p className="truncate text-[10px] text-slate-500">Lagnaa CRM assistant</p>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white/5 hover:text-white"
          aria-label="Close WorkerBee chat"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="max-h-[min(24rem,50vh)] flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-amber-400/15">
                <BeeIcon size={16} />
              </div>
            )}
            <div
              className={`max-w-[88%] whitespace-pre-wrap rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent-cyan/15 text-slate-100'
                  : 'bg-white/5 text-slate-200'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            WorkerBee is thinking…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {messages.length <= 1 && (
        <div className="flex flex-wrap gap-1.5 border-t border-white/5 px-3 py-2">
          {QUICK_PROMPTS.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => void send(prompt)}
              className="rounded-full border border-white/10 bg-white/5 px-2.5 py-1 text-[10px] text-slate-300 transition hover:border-accent-cyan/30 hover:text-white"
            >
              {prompt}
            </button>
          ))}
        </div>
      )}

      {error && <p className="px-3 pb-1 text-xs text-red-400">{error}</p>}

      <div className="border-t border-white/10 p-3">
        <div className="flex gap-2">
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
            rows={2}
            placeholder="Ask WorkerBee anything about Lagnaa…"
            className="input-field min-h-0 flex-1 resize-none text-xs leading-relaxed"
          />
          <button
            type="button"
            onClick={() => void send()}
            disabled={loading || !input.trim()}
            className="btn-primary shrink-0 self-end px-3"
            aria-label="Send message"
          >
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          </button>
        </div>
        <p className="mt-2 text-[10px] text-slate-600">
          Powered by Groq when connected at Gateway
        </p>
      </div>
    </div>
  );
}