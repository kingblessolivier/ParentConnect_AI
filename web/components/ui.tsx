import type { ReactNode } from 'react';
import { Info } from 'lucide-react';
import type { ReferralStatus } from '../lib/types';

export function StatCard({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  );
}

export function StatusBadge({ status, overdue }: { status: ReferralStatus; overdue?: boolean }) {
  if (overdue && status !== 'closed') return <span className="badge overdue">overdue</span>;
  return <span className={`badge ${status}`}>{status}</span>;
}

export function DemoBanner() {
  return (
    <div className="demo-banner">
      <Info size={15} aria-hidden style={{ flexShrink: 0 }} />
      Showing illustrative demo data — no live backend configured
      (<code>NEXT_PUBLIC_API_BASE</code>). All records are synthetic.
    </div>
  );
}

export function PageHead({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <div className="page-head">
      <h1>{title}</h1>
      {children ? <p>{children}</p> : null}
    </div>
  );
}
