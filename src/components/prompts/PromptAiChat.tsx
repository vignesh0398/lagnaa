import { useEffect, useRef, useState } from 'react';
import { Bot, Loader2, MessageSquare, Sparkles, Wand2 } from 'lucide-react';
import {
  promptAiChat,
  type CallFlowPrompt,
  type PromptAiChatMessage,
  type PromptAiUpdates,
} from '../../api/prompts';

type PromptAiChatProps = {
  promptId: string;
  onApplyUpdates: (updates: PromptAiUpdates) => void;
};

export function PromptAiChat({ promptId, onApplyUpdates }: PromptAiChatProps) {
  const [messages, setMessages] = useState<PromptAiChatMessage[]>([
    {
      role: 'assistant',
      content:
        'Describe your call workflow — e.g. greeting, reason for call, verification steps, consent, and how to close. I\'ll suggest script edits you can apply to this prompt.',
    },
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [pendingUpdates, setPendingUpdates] = useState<PromptAiUpdates | null>(null);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const send = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: PromptAiChatMessage = { role: 'user', content: text };
    const nextHistory = [...messages, userMsg];
    setMessages(nextHistory);
    setInput('');
    setError('');
    setPendingUpdates(null);
    setLoading(true);

    try {
      const result = await promptAiChat(promptId, text, messages);
      setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);
      if (result.updates && Object.keys(result.updates).length > 0) {
        setPendingUpdates(result.updates);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'AI chat failed');
    } finally {
      setLoading(false);
    }
  };

  const apply = () => {
    if (!pendingUpdates) return;
    onApplyUpdates(pendingUpdates);
    setPendingUpdates(null);
    setMessages((prev) => [
      ...prev,
      { role: 'assistant', content: 'Applied to your prompt draft. Review the script fields and click Save Prompt when ready.' },
    ]);
  };

  return (
    <div className="flex h-full min-h-[420px] flex-col rounded-xl border border-white/10 bg-surface-900/60">
      <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3">
        <MessageSquare className="h-4 w-4 text-accent-violet" />
        <h4 className="text-sm font-semibold text-white">AI Prompt Assistant</h4>
        <Sparkles className="ml-auto h-3.5 w-3.5 text-accent-cyan" />
      </div>

      <div className="flex-1 space-y-3 overflow-y-auto px-3 py-3">
        {messages.map((msg, i) => (
          <div
            key={i}
            className={`flex gap-2 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            {msg.role === 'assistant' && (
              <div className="mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-accent-violet/20">
                <Bot className="h-3.5 w-3.5 text-accent-violet" />
              </div>
            )}
            <div
              className={`max-w-[92%] rounded-xl px-3 py-2 text-xs leading-relaxed ${
                msg.role === 'user'
                  ? 'bg-accent-cyan/15 text-slate-100'
                  : 'bg-white/5 text-slate-300'
              }`}
            >
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div className="flex items-center gap-2 text-xs text-slate-500">
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
            Updating scripts from your workflow…
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {pendingUpdates && (
        <div className="border-t border-accent-emerald/20 bg-accent-emerald/5 px-3 py-2">
          <button onClick={apply} className="btn-primary w-full text-xs">
            <Wand2 className="h-3.5 w-3.5" />
            Apply suggested edits to prompt
          </button>
        </div>
      )}

      {error && <p className="px-3 pb-1 text-xs text-red-400">{error}</p>}

      <div className="border-t border-white/10 p-3">
        <textarea
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              void send();
            }
          }}
          rows={3}
          placeholder="Paste your call workflow here… e.g. Greet by name → explain Plevin review → verify DOB & postcode → free consent → email follow-up"
          className="input-field mb-2 text-xs leading-relaxed"
        />
        <button onClick={() => void send()} disabled={loading || !input.trim()} className="btn-secondary w-full text-xs">
          {loading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Sparkles className="h-3.5 w-3.5" />}
          Send to AI
        </button>
        <p className="mt-2 text-[10px] text-slate-600">Requires Groq API key in Connections</p>
      </div>
    </div>
  );
}

export function mergePromptUpdates(prompt: CallFlowPrompt, updates: PromptAiUpdates): CallFlowPrompt {
  return {
    ...prompt,
    ...(updates.name ? { name: updates.name } : {}),
    ...(updates.description ? { description: updates.description } : {}),
    ...(updates.agentName ? { agentName: updates.agentName } : {}),
    ...(updates.behaviorRules ? { behaviorRules: updates.behaviorRules } : {}),
    ...(updates.scripts ? { scripts: { ...prompt.scripts, ...updates.scripts } } : {}),
  };
}