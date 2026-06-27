import { getTranscript } from '../ai/conversation.js';
import { listStoredRecords } from '../ai/callHistoryStore.js';
import { queryChatHistory } from '../ai/whatsappChatHistoryStore.js';
import { queryEmailHistory } from '../ai/emailChatHistoryStore.js';
import { phonesMatch } from './contactHelpers.js';
import { getContactById } from './contactsStore.js';

export interface ConversationMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
}

export interface ContactConversation {
  id: string;
  channel: 'Voice' | 'WhatsApp' | 'Email';
  time: string;
  summary: string;
  outcome: string;
  status: string;
  duration: string;
  campaignName?: string;
  messageCount: number;
  messages: ConversationMessage[];
}

function parseVoiceTranscript(sessionId: string, summary: string): ConversationMessage[] {
  const raw = getTranscript(sessionId);
  if (raw && !raw.startsWith('No transcript')) {
    return raw.split('\n').filter(Boolean).map((line) => {
      const match = line.match(/^\[(.+?)\]\s*(.+?):\s*(.+)$/);
      if (match) {
        return {
          role: (match[2].toLowerCase().includes('customer') || match[2].toLowerCase().includes('user')
            ? 'user'
            : 'assistant') as ConversationMessage['role'],
          content: match[3],
          timestamp: match[1],
        };
      }
      return { role: 'system' as const, content: line, timestamp: new Date().toISOString() };
    });
  }
  return [{ role: 'system', content: summary || 'No transcript available.', timestamp: new Date().toISOString() }];
}

export function getContactConversations(contactId: string): ContactConversation[] {
  const contact = getContactById(contactId);
  if (!contact) return [];

  const items: ContactConversation[] = [];

  for (const call of listStoredRecords()) {
    const outboundToCustomer =
      phonesMatch(call.to, contact.phone) ||
      (contact.phoneAlt ? phonesMatch(call.to, contact.phoneAlt) : false);
    const inboundFromCustomer =
      phonesMatch(call.from, contact.phone) ||
      (contact.phoneAlt ? phonesMatch(call.from, contact.phoneAlt) : false);
    if (!outboundToCustomer && !inboundFromCustomer) continue;

    items.push({
      id: call.sessionId,
      channel: 'Voice',
      time: call.time,
      summary: call.summary,
      outcome: call.callOutcome,
      status: call.sessionStatus,
      duration: call.duration,
      messageCount: parseVoiceTranscript(call.sessionId, call.summary).length,
      messages: parseVoiceTranscript(call.sessionId, call.summary),
    });
  }

  const { chats } = queryChatHistory({ dateRange: 'all' });
  for (const chat of chats) {
    if (
      !phonesMatch(chat.to, contact.phone) &&
      !(contact.phoneAlt && phonesMatch(chat.to, contact.phoneAlt))
    ) {
      continue;
    }
    items.push({
      id: chat.id,
      channel: 'WhatsApp',
      time: chat.time,
      summary: chat.summary,
      outcome: chat.chatOutcome,
      status: chat.sessionStatus,
      duration: chat.duration,
      campaignName: chat.campaignName,
      messageCount: chat.messageCount,
      messages: chat.transcript.map((m) => ({
        role: m.role,
        content: m.content,
        timestamp: m.timestamp,
      })),
    });
  }

  if (contact.email?.trim()) {
    const emailNorm = contact.email.trim().toLowerCase();
    const { emails } = queryEmailHistory({ dateRange: 'all' });
    for (const em of emails) {
      if (em.to.trim().toLowerCase() !== emailNorm) continue;
      items.push({
        id: em.id,
        channel: 'Email',
        time: em.time,
        summary: em.summary,
        outcome: em.emailOutcome,
        status: em.sessionStatus,
        duration: em.duration,
        campaignName: em.campaignName,
        messageCount: em.messageCount,
        messages: em.transcript.map((m) => ({
          role: m.role,
          content: m.content,
          timestamp: m.timestamp,
        })),
      });
    }
  }

  return items.sort((a, b) => new Date(b.time).getTime() - new Date(a.time).getTime());
}