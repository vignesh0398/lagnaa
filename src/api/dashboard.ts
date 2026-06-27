export interface DashboardStats {
  connected: boolean;
  activeAgents: number;
  totalCalls: number;
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
}

export async function getDashboardStats(): Promise<DashboardStats> {
  const res = await fetch('/api/dashboard/stats');
  if (!res.ok) throw new Error('Failed to load dashboard');
  return res.json();
}