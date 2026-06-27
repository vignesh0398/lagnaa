import { listStoredRecords } from './callHistoryStore.js';
import { listChatRecords } from './whatsappChatHistoryStore.js';
import { listEmailRecords } from './emailChatHistoryStore.js';
import { listCampaigns } from './whatsappCampaignStore.js';
import { listEmailCampaigns } from './emailCampaignStore.js';

export interface ChannelStats {
  channel: string;
  total: number;
  completed: number;
  inProgress: number;
  awaiting: number;
  consentGiven: number;
  consentRate: number;
  successful: number;
  failed: number;
}

export interface DayActivity {
  date: string;
  voice: number;
  whatsapp: number;
  email: number;
  total: number;
}

export interface OutcomeCount {
  outcome: string;
  count: number;
  channel: string;
}

export interface AnalyticsHubData {
  summary: {
    totalInteractions: number;
    totalConsent: number;
    overallConsentRate: number;
    activeCampaigns: number;
    channelsLive: number;
  };
  channels: ChannelStats[];
  activityPerDay: DayActivity[];
  topOutcomes: OutcomeCount[];
  campaigns: {
    whatsapp: { total: number; sent: number; consent: number };
    email: { total: number; sent: number; consent: number };
  };
  sentiment: { positive: number; neutral: number; negative: number; unknown: number };
  verification: { verified: number; failed: number; refused: number; notAttempted: number };
}

function dayKey(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function buildDayBuckets(days: number): Map<string, DayActivity> {
  const map = new Map<string, DayActivity>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const key = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    map.set(key, { date: key, voice: 0, whatsapp: 0, email: 0, total: 0 });
  }
  return map;
}

function channelStats(
  channel: string,
  records: {
    sessionStatus: string;
    consentGiven: string;
    sessionOutcome: string;
    chatOutcome?: string;
    emailOutcome?: string;
    callOutcome?: string;
    recipientStatus?: string;
  }[]
): ChannelStats {
  const total = records.length;
  const consentGiven = records.filter((r) => r.consentGiven === 'Yes').length;
  const completed = records.filter((r) => r.sessionStatus === 'Ended').length;
  const inProgress = records.filter((r) => r.sessionStatus === 'In Progress').length;
  const awaiting = records.filter((r) => r.sessionStatus === 'Awaiting Reply').length;
  const successful = records.filter((r) => r.sessionOutcome === 'Successful').length;
  const failed = records.filter((r) => r.sessionStatus === 'Error').length;

  return {
    channel,
    total,
    completed,
    inProgress,
    awaiting,
    consentGiven,
    consentRate: total > 0 ? Math.round((consentGiven / total) * 100) : 0,
    successful,
    failed,
  };
}

export function getAnalyticsHub(): AnalyticsHubData {
  const calls = listStoredRecords();
  const waChats = listChatRecords();
  const emailChats = listEmailRecords();
  const waCampaigns = listCampaigns();
  const emailCampaigns = listEmailCampaigns();

  const voiceChannel = channelStats(
    'Voice',
    calls.map((c) => ({
      sessionStatus: c.sessionStatus,
      consentGiven: c.consentGiven,
      sessionOutcome: c.sessionOutcome,
      callOutcome: c.callOutcome,
    }))
  );

  const waChannel = channelStats('WhatsApp', waChats);
  const emailChannel = channelStats('Email', emailChats);

  const channels = [voiceChannel, waChannel, emailChannel];
  const totalInteractions = channels.reduce((s, c) => s + c.total, 0);
  const totalConsent = channels.reduce((s, c) => s + c.consentGiven, 0);

  const dayMap = buildDayBuckets(14);
  for (const c of calls) {
    const k = dayKey(c.time);
    const bucket = dayMap.get(k);
    if (bucket) {
      bucket.voice += 1;
      bucket.total += 1;
    }
  }
  for (const c of waChats) {
    const k = dayKey(c.time);
    const bucket = dayMap.get(k);
    if (bucket) {
      bucket.whatsapp += 1;
      bucket.total += 1;
    }
  }
  for (const c of emailChats) {
    const k = dayKey(c.time);
    const bucket = dayMap.get(k);
    if (bucket) {
      bucket.email += 1;
      bucket.total += 1;
    }
  }

  const outcomeMap = new Map<string, OutcomeCount>();
  const addOutcome = (outcome: string, channel: string) => {
    if (!outcome || outcome === '—') return;
    const key = `${channel}:${outcome}`;
    const existing = outcomeMap.get(key);
    if (existing) existing.count += 1;
    else outcomeMap.set(key, { outcome, channel, count: 1 });
  };

  for (const c of calls) addOutcome(c.callOutcome, 'Voice');
  for (const c of waChats) addOutcome(c.chatOutcome, 'WhatsApp');
  for (const c of emailChats) addOutcome(c.emailOutcome, 'Email');

  const topOutcomes = [...outcomeMap.values()].sort((a, b) => b.count - a.count).slice(0, 12);

  const allRecords = [...calls, ...waChats, ...emailChats];
  const sentiment = {
    positive: allRecords.filter((r) => r.userSentiment === 'Positive').length,
    neutral: allRecords.filter((r) => r.userSentiment === 'Neutral').length,
    negative: allRecords.filter((r) => r.userSentiment === 'Negative').length,
    voicemail: allRecords.filter((r) => r.userSentiment === 'Voicemail').length,
    unknown: allRecords.filter((r) => r.userSentiment === 'Unknown').length,
  };

  const verification = {
    verified: allRecords.filter((r) => r.verificationOutcome === 'Verified').length,
    failed: allRecords.filter((r) => r.verificationOutcome === 'Failed').length,
    refused: allRecords.filter((r) => r.verificationOutcome === 'Refused').length,
    notAttempted: allRecords.filter((r) => r.verificationOutcome === 'Not Attempted').length,
  };

  const activeCampaigns =
    waCampaigns.filter((c) => ['active', 'sending'].includes(c.status)).length +
    emailCampaigns.filter((c) => ['active', 'sending'].includes(c.status)).length;

  const channelsLive = channels.filter((c) => c.total > 0).length;

  return {
    summary: {
      totalInteractions,
      totalConsent,
      overallConsentRate: totalInteractions > 0 ? Math.round((totalConsent / totalInteractions) * 100) : 0,
      activeCampaigns,
      channelsLive,
    },
    channels,
    activityPerDay: [...dayMap.values()],
    topOutcomes,
    campaigns: {
      whatsapp: {
        total: waCampaigns.length,
        sent: waCampaigns.reduce((s, c) => s + c.sentCount, 0),
        consent: waCampaigns.reduce((s, c) => s + c.consentCount, 0),
      },
      email: {
        total: emailCampaigns.length,
        sent: emailCampaigns.reduce((s, c) => s + c.sentCount, 0),
        consent: emailCampaigns.reduce((s, c) => s + c.consentCount, 0),
      },
    },
    sentiment,
    verification,
  };
}