import fs from 'fs';
import path from 'path';

export interface CallFlowScripts {
  hello: string;
  intro: string;
  explainReason: string;
  askProceed: string;
  recordingNotice: string;
  askPostcode: string;
  consent: string;
  consentRetry: string;
  finalClose: string;
  wrongPersonEnd: string;
  notInterestedEnd: string;
  verificationFailedEnd: string;
  verificationRefusedEnd: string;
  dndEnd: string;
  callbackEnd: string;
  noTimeDuringIntro: string;
  confirmIdentityRetry: string;
  noSpeechRetry: string;
  dobRetry: string;
  postcodeRetry: string;
}

export type PromptStatus = 'draft' | 'published';

export interface CallFlowPrompt {
  id: string;
  name: string;
  description: string;
  type: 'system';
  active: boolean;
  status: PromptStatus;
  agentName: string;
  scripts: CallFlowScripts;
  behaviorRules: string;
  updatedAt: string;
}

export class NoPublishedPromptError extends Error {
  constructor() {
    super('No published AI agent. Publish an agent in AI Agents before placing calls.');
    this.name = 'NoPublishedPromptError';
  }
}

const PROMPTS_PATH = path.join(process.cwd(), 'server', 'data', 'prompts.json');

export const DEFAULT_SCRIPTS: CallFlowScripts = {
  hello: 'Hello.',
  intro: "Hi, I'm Mia calling from Justizia Law. May I please speak with {{clientName}}?",
  explainReason:
    'You previously had a Plevin claim handled by Sandstone Legal, which has since gone into administration. Because of this, your case may qualify for a free professional negligence review conducted by Hugh James Solicitors. Would you be happy to hear more about this and proceed?',
  askProceed: 'Would you be happy to hear more about this and proceed?',
  recordingNotice:
    'This call is being recorded for training, quality assurance, regulatory, and evidential purposes. To verify your identity, could you please confirm your date of birth?',
  askPostcode: 'Thank you. Could you please confirm your postcode?',
  consent:
    'Your case may qualify for a free professional negligence review conducted by Hugh James Solicitors. This review is completely free of charge. This call does not provide legal advice and does not confirm that you have a claim. Any assessment will be carried out by the legal team. Are you happy for us to proceed?',
  consentRetry:
    'I understand. Just to mention, this review is completely free and there is no fee required to proceed. Are you happy for us to proceed?',
  finalClose:
    'Thank you for your time today. Once the consent form is completed, the legal team can review whether you may have grounds for a professional negligence claim. Please keep an eye on your email for further communication from Justizia Law. Have a great day.',
  wrongPersonEnd: 'I apologise for the inconvenience. Thank you for your time. Goodbye.',
  notInterestedEnd: 'Thank you for your time today. I appreciate you taking my call. Goodbye.',
  verificationFailedEnd:
    "I'm afraid we were unable to complete verification at this time. Thank you for your time. Goodbye.",
  verificationRefusedEnd:
    'I understand. Unfortunately we cannot continue without verification. Thank you for your time. Goodbye.',
  dndEnd:
    'I understand completely. I have noted your request and you will not be contacted again. Thank you. Goodbye.',
  callbackEnd:
    'I understand. I can arrange a callback at a more convenient time. We will contact you shortly. Thank you. Goodbye.',
  noTimeDuringIntro:
    'I understand. The process will only take a few minutes. Would you prefer to continue now or arrange a callback?',
  confirmIdentityRetry: "I'm sorry, just to confirm, am I speaking with {{clientName}}?",
  noSpeechRetry: "I'm sorry, I didn't catch that. Could you please repeat?",
  dobRetry: 'Sorry, I did not catch your date of birth clearly. Please say the full date — for example, 15 August 1990.',
  postcodeRetry: 'Sorry, I did not catch your postcode. Could you please repeat it clearly?',
};

const DEFAULT_BEHAVIOR = `Behavior rules for Mia:
- Do not repeat the full script if the client interrupts; answer their question briefly then continue from the current step.
- If the client has no time, say it only takes a few minutes and offer a callback.
- If the client requests DND, acknowledge and end immediately.
- If not interested, thank them and end. Record as Not Interested.
- Never skip steps. Verification must complete before consent.
- Always deliver the legal disclaimer before final consent.
- Keep responses short for phone calls (1-2 sentences when answering questions).`;

function defaultPrompt(): CallFlowPrompt {
  return {
    id: 'justizia-outbound',
    name: 'Justizia Law — Outbound Voice Flow',
    description: '6-step Plevin claim outbound call flow for Mia',
    type: 'system',
    active: true,
    status: 'published',
    agentName: 'Mia',
    scripts: { ...DEFAULT_SCRIPTS },
    behaviorRules: DEFAULT_BEHAVIOR,
    updatedAt: new Date().toISOString(),
  };
}

function normalizePrompt(raw: CallFlowPrompt & { status?: PromptStatus }): CallFlowPrompt {
  const status: PromptStatus =
    raw.status ?? (raw.active ? 'published' : 'draft');
  return {
    ...raw,
    status,
    active: status === 'published',
  };
}

function loadAll(): CallFlowPrompt[] {
  if (!fs.existsSync(PROMPTS_PATH)) {
    const initial = [defaultPrompt()];
    saveAll(initial);
    return initial;
  }
  const parsed = JSON.parse(fs.readFileSync(PROMPTS_PATH, 'utf-8')) as CallFlowPrompt[];
  const normalized = parsed.map(normalizePrompt);
  const needsSave = parsed.some((p, i) => p.status !== normalized[i].status || p.active !== normalized[i].active);
  if (needsSave) saveAll(normalized);
  return normalized;
}

function saveAll(prompts: CallFlowPrompt[]): void {
  fs.mkdirSync(path.dirname(PROMPTS_PATH), { recursive: true });
  fs.writeFileSync(PROMPTS_PATH, JSON.stringify(prompts, null, 2));
}

export function getPublishedPrompt(): CallFlowPrompt | null {
  return loadAll().find((p) => p.status === 'published') ?? null;
}

export function getActivePrompt(): CallFlowPrompt {
  const published = getPublishedPrompt();
  if (!published) throw new NoPublishedPromptError();
  return published;
}

export function getPromptById(id: string): CallFlowPrompt | undefined {
  return loadAll().find((p) => p.id === id);
}

export function listPrompts(): CallFlowPrompt[] {
  return loadAll();
}

export function updatePrompt(id: string, updates: Partial<CallFlowPrompt>): CallFlowPrompt {
  const prompts = loadAll();
  const index = prompts.findIndex((p) => p.id === id);
  if (index === -1) throw new Error('Prompt not found');

  prompts[index] = {
    ...prompts[index],
    ...updates,
    id: prompts[index].id,
    updatedAt: new Date().toISOString(),
  };
  saveAll(prompts);
  return prompts[index];
}

export function setActivePrompt(id: string): CallFlowPrompt {
  return publishPrompt(id);
}

export function publishPrompt(id: string): CallFlowPrompt {
  const prompts = loadAll();
  if (!prompts.some((p) => p.id === id)) throw new Error('Prompt not found');

  const updated = prompts.map((p) => {
    const published = p.id === id;
    return {
      ...p,
      status: published ? ('published' as const) : ('draft' as const),
      active: published,
      updatedAt: published ? new Date().toISOString() : p.updatedAt,
    };
  });
  saveAll(updated);
  return updated.find((p) => p.id === id)!;
}

export function draftPrompt(id: string): CallFlowPrompt {
  const prompts = loadAll();
  const index = prompts.findIndex((p) => p.id === id);
  if (index === -1) throw new Error('Prompt not found');

  prompts[index] = {
    ...prompts[index],
    status: 'draft',
    active: false,
    updatedAt: new Date().toISOString(),
  };
  saveAll(prompts);
  return prompts[index];
}

function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 40) || 'custom-prompt';
}

export function createPrompt(input: {
  name: string;
  description?: string;
  agentName?: string;
  scripts?: Partial<CallFlowScripts>;
  behaviorRules?: string;
  activate?: boolean;
  publish?: boolean;
}): CallFlowPrompt {
  const prompts = loadAll();
  const base = defaultPrompt();
  let id = slugify(input.name);
  let suffix = 1;
  while (prompts.some((p) => p.id === id)) {
    id = `${slugify(input.name)}-${suffix++}`;
  }

  const shouldPublish = input.publish ?? input.activate ?? false;
  const prompt: CallFlowPrompt = {
    ...base,
    id,
    name: input.name.trim(),
    description: input.description?.trim() || 'Custom AI call flow prompt',
    status: shouldPublish ? 'published' : 'draft',
    active: shouldPublish,
    agentName: input.agentName?.trim() || base.agentName,
    scripts: { ...base.scripts, ...input.scripts },
    behaviorRules: input.behaviorRules?.trim() || base.behaviorRules,
    updatedAt: new Date().toISOString(),
  };

  if (shouldPublish) {
    prompts.forEach((p) => {
      p.status = 'draft';
      p.active = false;
    });
  }

  prompts.push(prompt);
  saveAll(prompts);
  return prompt;
}

export function duplicatePrompt(id: string, newName?: string): CallFlowPrompt {
  const source = getPromptById(id);
  if (!source) throw new Error('Prompt not found');

  return createPrompt({
    name: newName?.trim() || `${source.name} (Copy)`,
    description: source.description,
    agentName: source.agentName,
    scripts: { ...source.scripts },
    behaviorRules: source.behaviorRules,
    activate: false,
  });
}

export function applyTemplate(text: string, vars: Record<string, string>): string {
  return text.replace(/\{\{(\w+)\}\}/g, (_, key) => vars[key] ?? '');
}