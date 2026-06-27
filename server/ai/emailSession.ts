import type { CallSession } from './conversation.js';
import { buildKnowledgeContext, getActiveKnowledgeBase } from './knowledgeStore.js';
import { getActivePrompt } from './promptStore.js';
import { normalizeEmail } from './emailCampaignStore.js';

const sessions = new Map<string, CallSession>();

function sessionKey(email: string): string {
  return normalizeEmail(email);
}

export function getEmailSession(email: string): CallSession | undefined {
  return sessions.get(sessionKey(email));
}

export function initEmailSession(
  email: string,
  clientName: string,
  expectedDob?: string,
  expectedPostcode?: string,
  campaignId?: string
): CallSession {
  const prompt = getActivePrompt();
  const kb = getActiveKnowledgeBase();
  const key = sessionKey(email);

  const session: CallSession = {
    callSid: `em-${key.replace(/[^a-z0-9]/g, '')}-${Date.now()}`,
    agentName: prompt.agentName,
    clientName: clientName || 'the client',
    expectedDob,
    expectedPostcode,
    toNumber: email,
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

export function getOrCreateEmailSession(
  email: string,
  clientName: string,
  expectedDob?: string,
  expectedPostcode?: string,
  campaignId?: string
): CallSession {
  return getEmailSession(email) ?? initEmailSession(email, clientName, expectedDob, expectedPostcode, campaignId);
}

export function addEmailMessage(email: string, role: 'user' | 'assistant', content: string): void {
  const session = getEmailSession(email);
  if (!session) return;
  session.messages.push({ role, content, timestamp: new Date() });
  if (role === 'user') session.turnCount += 1;
}

export function endEmailSession(email: string): CallSession | undefined {
  const key = sessionKey(email);
  const session = sessions.get(key);
  if (session) {
    session.endedAt = new Date();
    session.step = 'ended';
    sessions.delete(key);
  }
  return session;
}

export function getEmailCampaignId(session: CallSession): string | undefined {
  return (session as CallSession & { campaignId?: string }).campaignId;
}