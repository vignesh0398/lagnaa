import type { CallSession } from './conversation.js';
import { buildKnowledgeContext, getActiveKnowledgeBase } from './knowledgeStore.js';
import { getActivePrompt } from './promptStore.js';

const sessions = new Map<string, CallSession>();

function sessionKey(phone: string): string {
  return phone.replace(/\D/g, '');
}

export function getWhatsAppSession(phone: string): CallSession | undefined {
  return sessions.get(sessionKey(phone));
}

export function initWhatsAppSession(
  phone: string,
  clientName: string,
  expectedDob?: string,
  expectedPostcode?: string,
  campaignId?: string
): CallSession {
  const prompt = getActivePrompt();
  const kb = getActiveKnowledgeBase();
  const key = sessionKey(phone);

  const session: CallSession = {
    callSid: `wa-${key}-${Date.now()}`,
    agentName: prompt.agentName,
    clientName: clientName || 'the client',
    expectedDob,
    expectedPostcode,
    toNumber: phone,
    promptId: prompt.id,
    knowledgeBaseId: kb?.id,
    knowledgeContext: buildKnowledgeContext(kb),
    scripts: { ...prompt.scripts },
    behaviorRules: prompt.behaviorRules,
    step: 'intro_confirm',
    outcomes: {},
    messages: [],
    turnCount: 0,
    noSpeechRetries: 0,
    dobRetries: 0,
    postcodeRetries: 0,
    startedAt: new Date(),
  };

  if (campaignId) {
    (session as CallSession & { campaignId?: string }).campaignId = campaignId;
  }

  sessions.set(key, session);
  return session;
}

export function getOrCreateWhatsAppSession(
  phone: string,
  clientName: string,
  expectedDob?: string,
  expectedPostcode?: string,
  campaignId?: string
): CallSession {
  return getWhatsAppSession(phone) ?? initWhatsAppSession(phone, clientName, expectedDob, expectedPostcode, campaignId);
}

export function addWhatsAppMessage(phone: string, role: 'user' | 'assistant', content: string): void {
  const session = getWhatsAppSession(phone);
  if (!session) return;
  session.messages.push({ role, content, timestamp: new Date() });
  if (role === 'user') session.turnCount += 1;
}

export function endWhatsAppSession(phone: string): CallSession | undefined {
  const key = sessionKey(phone);
  const session = sessions.get(key);
  if (session) {
    session.endedAt = new Date();
    session.step = 'ended';
    sessions.delete(key);
  }
  return session;
}

export function getCampaignId(session: CallSession): string | undefined {
  return (session as CallSession & { campaignId?: string }).campaignId;
}