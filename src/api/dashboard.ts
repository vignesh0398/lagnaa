export interface DashboardRecentCall {
  customerName: string;
  time: string;
  outcome: string;
  agent: string;
}

export interface DashboardStats {
  connected: boolean;
  twilioConfigured?: boolean;
  groqConnected?: boolean;
  twilioError?: string | null;
  activeAgents: number;
  totalAgents?: number;
  publishedAgentName?: string | null;
  totalCalls: number;
  callsToday?: number;
  totalContacts?: number;
  systemHealth: string;
  lastUpdated: string;
  cluster: {
    status: string;
    servicesHealthy: string;
    nodesReady: string;
    restarts: number;
  };
  callsPerDay: { date: string; count: number }[];
  callsPerMinute: number[];
  recentCalls?: DashboardRecentCall[];
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await fetch('/api/dashboard/stats');
  if (!res.ok) throw new Error('Failed to load dashboard');
  return res.json();
}