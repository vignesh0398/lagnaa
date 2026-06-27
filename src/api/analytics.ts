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

export interface AnalyticsHubData {
  summary: {
    totalInteractions: number;
    totalConsent: number;
    overallConsentRate: number;
    activeCampaigns: number;
    channelsLive: number;
  };
  channels: ChannelStats[];
  activityPerDay: { date: string; voice: number; whatsapp: number; email: number; total: number }[];
  topOutcomes: { outcome: string; count: number; channel: string }[];
  campaigns: {
    whatsapp: { total: number; sent: number; consent: number };
    email: { total: number; sent: number; consent: number };
  };
  sentiment: { positive: number; neutral: number; negative: number; voicemail: number; unknown: number };
  verification: { verified: number; failed: number; refused: number; notAttempted: number };
}

export async function getAnalyticsHub(): Promise<AnalyticsHubData> {
  const res = await fetch('/api/analytics/hub');
  if (!res.ok) throw new Error('Failed to load analytics');
  return res.json();
}