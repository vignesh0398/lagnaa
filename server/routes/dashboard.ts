import { Router } from 'express';
import { listStoredRecords } from '../ai/callHistoryStore.js';
import { loadGroqApiKey } from '../ai/groq.js';
import { getPublishedPrompt, listPrompts } from '../ai/promptStore.js';
import { loadTwilioConfig } from '../config.js';
import { listContacts } from '../contacts/contactsStore.js';
import { getTwilioClient } from '../twilioClient.js';

const router = Router();

function isToday(iso: string): boolean {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

function buildDayBuckets(days: number): Map<string, number> {
  const map = new Map<string, number>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    map.set(label, 0);
  }
  return map;
}

function callsPerDayFromRecords(records: { dateCreated: string }[]): { date: string; count: number }[] {
  const dayMap = buildDayBuckets(9);
  for (const record of records) {
    const label = new Date(record.dateCreated).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    if (dayMap.has(label)) {
      dayMap.set(label, (dayMap.get(label) ?? 0) + 1);
    }
  }
  return Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));
}

router.get('/stats', async (_req, res) => {
  const config = loadTwilioConfig();
  const client = getTwilioClient();
  const groqConnected = !!loadGroqApiKey();
  const twilioConfigured = !!(config?.accountSid && config?.authToken);
  const prompts = listPrompts();
  const published = getPublishedPrompt();
  const localCalls = listStoredRecords();
  const contacts = listContacts({ all: true });

  const callsToday = localCalls.filter((c) => isToday(c.dateCreated)).length;
  const callsPerDay = callsPerDayFromRecords(localCalls);

  let twilioLive = false;
  let twilioError: string | null = null;
  let twilioCallCount = localCalls.length;

  if (twilioConfigured && client) {
    try {
      const twilioCalls = await client.calls.list({ limit: 50 });
      twilioLive = true;
      twilioCallCount = Math.max(twilioCallCount, twilioCalls.length);
      if (localCalls.length === 0 && twilioCalls.length > 0) {
        const merged = callsPerDayFromRecords(
          twilioCalls.map((c) => ({
            dateCreated: (c.dateCreated ?? new Date()).toISOString(),
          }))
        );
        for (let i = 0; i < merged.length; i++) {
          callsPerDay[i].count = Math.max(callsPerDay[i].count, merged[i].count);
        }
      }
    } catch (error) {
      twilioError = error instanceof Error ? error.message : 'Twilio API unavailable';
    }
  }

  const services: string[] = [];
  if (twilioLive) services.push('Twilio');
  else if (twilioConfigured) services.push('Twilio (credentials saved)');
  if (groqConnected) services.push('Groq AI');
  if (published) services.push('Agent published');

  let systemHealth = 'Setup needed';
  if (twilioLive && groqConnected && published) systemHealth = 'Healthy';
  else if (twilioConfigured || groqConnected || published) systemHealth = 'Partial';

  const recentCalls = localCalls.slice(0, 6).map((c) => ({
    customerName: c.customerName,
    time: c.time,
    outcome: c.callOutcome || c.sessionOutcome || c.twilioStatus,
    agent: c.agent,
  }));

  const callsPerMinute =
    localCalls.length > 0
      ? localCalls.slice(0, 12).map(() => 1)
      : [0, 0, 0, 0, 0, 0];

  res.json({
    connected: twilioLive,
    twilioConfigured,
    groqConnected,
    twilioError,
    activeAgents: published ? 1 : 0,
    totalAgents: prompts.length,
    publishedAgentName: published?.agentName ?? null,
    totalCalls: twilioCallCount,
    callsToday,
    totalContacts: contacts.length,
    systemHealth,
    lastUpdated: new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }),
    cluster: {
      status: twilioLive ? 'Healthy' : twilioConfigured ? 'Configured' : 'Offline',
      servicesHealthy: services.length ? services.join(' · ') : 'Not connected',
      nodesReady: config?.phoneNumber || '—',
      restarts: 0,
    },
    callsPerDay,
    callsPerMinute,
    recentCalls,
  });
});

export default router;