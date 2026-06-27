import { useState } from 'react';
import { ArrowRight, CheckCircle2, HelpCircle, RotateCcw, Sparkles } from 'lucide-react';
import type { SocialImageStyle } from '../../api/socialStudio';
import { IMAGE_STYLE_OPTIONS } from '../../api/socialStudio';

type AnswerId = 'goal' | 'format' | 'audience';

type Option = { id: string; label: string; hint: string; scores: Partial<Record<SocialImageStyle, number>> };

const QUESTIONS: { id: AnswerId; question: string; options: Option[] }[] = [
  {
    id: 'goal',
    question: 'What is the main goal of this post?',
    options: [
      { id: 'educate', label: 'Educate my audience', hint: 'Teach something useful', scores: { carousel: 3, infographic: 2, checklist: 2 } },
      { id: 'promote', label: 'Promote an offer or service', hint: 'Drive action', scores: { brand_graphics: 3, graphic: 2, text_graphics: 1 } },
      { id: 'compare', label: 'Show transformation or results', hint: 'Before → after', scores: { before_after: 3, infographic: 1 } },
      { id: 'inspire', label: 'Inspire or build trust', hint: 'Emotional hook', scores: { typographic_quote: 3, text_graphics: 2 } },
    ],
  },
  {
    id: 'format',
    question: 'What type of content fits your topic best?',
    options: [
      { id: 'steps', label: 'Step-by-step tips', hint: 'Action list', scores: { checklist: 3, carousel: 2 } },
      { id: 'data', label: 'Stats & facts', hint: 'Numbers matter', scores: { infographic: 3, graphic: 1 } },
      { id: 'story', label: 'Multi-part story', hint: 'Swipe slides', scores: { carousel: 3, graphic: 1 } },
      { id: 'short', label: 'One bold message', hint: 'Quick impact', scores: { text_graphics: 3, typographic_quote: 2, graphic: 1 } },
    ],
  },
  {
    id: 'audience',
    question: 'Who are you posting for?',
    options: [
      { id: 'b2b', label: 'Business / professional', hint: 'LinkedIn-style', scores: { infographic: 2, carousel: 2, brand_graphics: 2 } },
      { id: 'b2c', label: 'Consumers / general public', hint: 'Instagram-style', scores: { graphic: 2, before_after: 2, typographic_quote: 1 } },
      { id: 'local', label: 'Local business clients', hint: 'Trust & clarity', scores: { brand_graphics: 3, checklist: 2 } },
      { id: 'agency', label: 'Agency client brand', hint: 'Their logo front', scores: { brand_graphics: 3, graphic: 1 } },
    ],
  },
];

function pickStyle(answers: Record<AnswerId, string>): SocialImageStyle {
  const scores: Record<SocialImageStyle, number> = {
    graphic: 0,
    infographic: 0,
    checklist: 0,
    brand_graphics: 0,
    before_after: 0,
    typographic_quote: 0,
    text_graphics: 0,
    carousel: 0,
  };

  for (const q of QUESTIONS) {
    const chosen = q.options.find((o) => o.id === answers[q.id]);
    if (!chosen) continue;
    for (const [style, pts] of Object.entries(chosen.scores)) {
      scores[style as SocialImageStyle] += pts ?? 0;
    }
  }

  const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
  return (sorted[0]?.[1] ? sorted[0][0] : 'graphic') as SocialImageStyle;
}

type Props = {
  onSelectStyle: (style: SocialImageStyle) => void;
};

export function SocialStyleQuiz({ onSelectStyle }: Props) {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState(0);
  const [answers, setAnswers] = useState<Partial<Record<AnswerId, string>>>({});
  const [result, setResult] = useState<SocialImageStyle | null>(null);

  const current = QUESTIONS[step];
  const recommended = result ? IMAGE_STYLE_OPTIONS.find((s) => s.id === result) : null;

  const reset = () => {
    setStep(0);
    setAnswers({});
    setResult(null);
  };

  const choose = (optionId: string) => {
    const next = { ...answers, [current.id]: optionId };
    setAnswers(next);
    if (step < QUESTIONS.length - 1) {
      setStep(step + 1);
      return;
    }
    const style = pickStyle(next as Record<AnswerId, string>);
    setResult(style);
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex w-full items-center justify-between gap-3 rounded-xl border border-accent-violet/25 bg-accent-violet/10 px-4 py-3 text-left transition hover:border-accent-violet/40"
      >
        <div className="flex items-center gap-2">
          <HelpCircle className="h-4 w-4 shrink-0 text-accent-violet" />
          <div>
            <p className="text-sm font-semibold text-white">Not sure which image style?</p>
            <p className="text-xs text-slate-400">Take a quick 3-question quiz — we&apos;ll suggest the best option</p>
          </div>
        </div>
        <ArrowRight className="h-4 w-4 shrink-0 text-accent-violet" />
      </button>
    );
  }

  if (result && recommended) {
    return (
      <div className="rounded-xl border border-accent-emerald/30 bg-accent-emerald/5 p-4 space-y-3">
        <div className="flex items-start gap-2">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-accent-emerald" />
          <div>
            <p className="text-sm font-semibold text-white">Best fit for you: {recommended.label}</p>
            <p className="mt-1 text-xs text-slate-400">{recommended.description}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => {
              onSelectStyle(result);
              setOpen(false);
            }}
            className="btn-primary text-xs"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Use {recommended.label}
          </button>
          <button type="button" onClick={reset} className="btn-secondary text-xs">
            <RotateCcw className="h-3.5 w-3.5" />
            Retake quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-white/10 bg-surface-900/50 p-4 space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-xs font-bold uppercase tracking-wider text-accent-cyan">
          Style quiz · {step + 1}/{QUESTIONS.length}
        </p>
        <button type="button" onClick={() => { setOpen(false); reset(); }} className="text-[10px] text-slate-500 hover:text-slate-300">
          Close
        </button>
      </div>
      <p className="text-sm font-semibold text-white">{current.question}</p>
      <div className="grid gap-2 sm:grid-cols-2">
        {current.options.map((opt) => (
          <button
            key={opt.id}
            type="button"
            onClick={() => choose(opt.id)}
            className="rounded-xl border border-white/10 bg-white/5 p-3 text-left transition hover:border-accent-cyan/40 hover:bg-accent-cyan/5"
          >
            <p className="text-xs font-semibold text-white">{opt.label}</p>
            <p className="mt-0.5 text-[10px] text-slate-500">{opt.hint}</p>
          </button>
        ))}
      </div>
    </div>
  );
}