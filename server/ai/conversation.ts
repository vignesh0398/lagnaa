import type { CallFlowScripts } from './promptStore.js';
import { buildKnowledgeContext, getActiveKnowledgeBase } from './knowledgeStore.js';
import { getActivePrompt, getPromptById } from './promptStore.js';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

export type FlowStep =
  | 'hello'
  | 'intro_confirm'
  | 'explain_reason'
  | 'ask_proceed'
  | 'recording_notice'
  | 'collect_dob'
  | 'collect_postcode'
  | 'consent_disclaimer'
  | 'consent_retry'
  | 'final_close'
  | 'ended';

export interface CallOutcomes {
  correctPerson?: boolean;
  interested?: boolean;
  dobVerified?: boolean;
  postcodeVerified?: boolean;
  consentGiven?: boolean;
  dnd?: boolean;
  callbackRequested?: boolean;
  callbackTime?: string;
  voicemail?: boolean;
  finalOutcome?: string;
}

export interface CallSession {
  callSid: string;
  agentName: string;
  clientName: string;
  expectedDob?: string;
  expectedPostcode?: string;
  collectedDob?: string;
  collectedPostcode?: string;
  toNumber?: string;
  fromNumber?: string;
  ghlContactId?: string;
  contactId?: string;
  promptId: string;
  knowledgeBaseId?: string;
  knowledgeContext: string;
  scripts: CallFlowScripts;
  behaviorRules: string;
  step: FlowStep;
  outcomes: CallOutcomes;
  messages: ChatMessage[];
  turnCount: number;
  noSpeechRetries: number;
  dobRetries: number;
  postcodeRetries: number;
  startedAt: Date;
  endedAt?: Date;
  endedBy?: 'agent' | 'customer';
}

const sessions = new Map<string, CallSession>();

export function initSession(
  callSid: string,
  agentName: string,
  clientName: string,
  expectedDob?: string,
  expectedPostcode?: string,
  toNumber?: string,
  ghlContactId?: string,
  contactId?: string,
  promptId?: string
): CallSession {
  const prompt = promptId ? (getPromptById(promptId) ?? getActivePrompt()) : getActivePrompt();
  const kb = getActiveKnowledgeBase();
  const session: CallSession = {
    callSid,
    agentName: agentName || prompt.agentName,
    clientName: clientName || 'the client',
    expectedDob,
    expectedPostcode,
    toNumber,
    ghlContactId,
    contactId,
    promptId: prompt.id,
    knowledgeBaseId: kb?.id,
    knowledgeContext: buildKnowledgeContext(kb),
    scripts: { ...prompt.scripts },
    behaviorRules: prompt.behaviorRules,
    step: 'hello',
    outcomes: {},
    messages: [],
    turnCount: 0,
    noSpeechRetries: 0,
    dobRetries: 0,
    postcodeRetries: 0,
    startedAt: new Date(),
  };
  sessions.set(callSid, session);
  return session;
}

export function markEnded(callSid: string, by: 'agent' | 'customer'): void {
  const session = sessions.get(callSid);
  if (!session) return;
  session.endedBy = by;
  session.endedAt = new Date();
}

export function getSession(callSid: string): CallSession | undefined {
  return sessions.get(callSid);
}

export function addMessage(callSid: string, role: 'user' | 'assistant', content: string): void {
  const session = sessions.get(callSid);
  if (!session) return;
  session.messages.push({ role, content, timestamp: new Date() });
  if (role === 'user') session.turnCount += 1;
}

export function setStep(callSid: string, step: FlowStep): void {
  const session = sessions.get(callSid);
  if (session) session.step = step;
}

export function getTranscript(callSid: string): string {
  const session = sessions.get(callSid);
  if (!session || session.messages.length === 0) {
    return 'No transcript available for this call.';
  }
  const lines = session.messages
    .filter((m) => m.role !== 'system')
    .map((m) => `${m.role === 'user' ? 'Customer' : 'Mia'}: ${m.content}`);
  if (session.outcomes.finalOutcome) {
    lines.push(`\nOutcome: ${session.outcomes.finalOutcome}`);
  }
  return lines.join('\n');
}

export function getCallOutcome(callSid: string): CallOutcomes | null {
  return sessions.get(callSid)?.outcomes ?? null;
}