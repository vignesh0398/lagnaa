import { ShieldCheck } from 'lucide-react';
import { Header } from '../components/layout/Header';
import { EmptyState } from '../components/ui/EmptyState';

export function SecurityScans() {
  return (
    <div>
      <Header title="Security Scans" subtitle="Compliance" />

      <div className="p-8">
        <EmptyState
          icon={ShieldCheck}
          title="Security scans not configured"
          description="Compliance scanning will be added in a future update. No demo data is shown here."
        />
      </div>
    </div>
  );
}