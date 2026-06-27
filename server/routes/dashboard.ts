import { Router } from 'express';
import { loadTwilioConfig } from '../config.js';
import { getTwilioClient } from '../twilioClient.js';

const router = Router();

router.get('/stats', async (_req, res) => {
  const config = loadTwilioConfig();
  const client = getTwilioClient();

  if (!config || !client) {
    return res.json({
      connected: false,
      activeAgents: 0,
      totalCalls: 0,
      systemHealth: 'Twilio Not Connected',
      lastUpdated: '—',
      cluster: { status: 'Offline', servicesHealthy: '—', nodesReady: '—', restarts: 0 },
      callsPerDay: [],
      callsPerMinute: [],
    });
  }

  try {
    const calls = await client.calls.list({ limit: 100 });
    const totalCalls = calls.length;

    const dayMap = new Map<string, number>();
    for (let i = 8; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      dayMap.set(label, 0);
    }

    for (const call of calls) {
      if (!call.dateCreated) continue;
      const label = call.dateCreated.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (dayMap.has(label)) {
        dayMap.set(label, (dayMap.get(label) ?? 0) + 1);
      }
    }

    const callsPerDay = Array.from(dayMap.entries()).map(([date, count]) => ({ date, count }));
    const recent = calls.slice(0, 12).map((c) => (c.direction === 'outbound' ? 1 : 0));

    res.json({
      connected: true,
      activeAgents: 1,
      totalCalls,
      systemHealth: 'Healthy',
      lastUpdated: 'just now',
      cluster: {
        status: 'Healthy',
        servicesHealthy: 'Twilio Connected',
        nodesReady: config.phoneNumber || '—',
        restarts: 0,
      },
      callsPerDay,
      callsPerMinute: recent.length > 0 ? recent : [0],
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to load stats';
    res.status(500).json({ connected: false, error: message });
  }
});

export default router;