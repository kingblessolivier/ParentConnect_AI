'use client';

import { useState } from 'react';
import { apiPost } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { SAMPLE_REFERRALS } from '../../lib/sample';
import type { ReferralStatus, ReferralView } from '../../lib/types';
import { DemoBanner, PageHead, StatusBadge } from '../../components/ui';

const NEXT: Record<ReferralStatus, ReferralStatus | null> = {
  raised: 'acknowledged',
  acknowledged: 'actioned',
  actioned: 'closed',
  closed: null,
};

function timeTo(dueBy: string): string {
  const ms = Date.parse(dueBy) - Date.now();
  const h = Math.round(ms / 3_600_000);
  if (h < 0) return `${-h}h overdue`;
  return `in ${h}h`;
}

export default function ReferralsPage() {
  const { data, demo } = useApiData<ReferralView[]>('/api/v1/referrals', SAMPLE_REFERRALS);
  const [rows, setRows] = useState<ReferralView[] | null>(null);
  const list = (rows ?? data).slice().sort((a, b) => Number(b.overdue) - Number(a.overdue) || a.createdAt.localeCompare(b.createdAt));

  const open = list.filter((r) => r.status !== 'closed').length;
  const overdue = list.filter((r) => r.overdue && r.status !== 'closed').length;

  async function advance(r: ReferralView) {
    const to = NEXT[r.status];
    if (!to) return;
    const base = rows ?? data;
    if (demo) {
      setRows(base.map((x) => (x.id === r.id ? { ...x, status: to, overdue: to === 'closed' ? false : x.overdue } : x)));
      return;
    }
    const updated = await apiPost<ReferralView>(`/api/v1/referrals/${r.id}/transition`, { toStatus: to });
    setRows(base.map((x) => (x.id === r.id ? updated : x)));
  }

  return (
    <>
      <PageHead title="Referral triage">
        Child-protection caseload — forward-only lifecycle with SLA tracking (FR-22/23). No child identity is ever shown (FR-24).
      </PageHead>
      {demo ? <DemoBanner /> : null}

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <div className="card stat"><div className="label">Open cases</div><div className="value">{open}</div></div>
        <div className="card stat"><div className="label">Overdue</div><div className="value" style={{ color: overdue ? 'var(--danger)' : undefined }}>{overdue}</div></div>
        <div className="card stat"><div className="label">Total</div><div className="value">{list.length}</div></div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>Ref</th><th>Category</th><th>Status</th><th>SLA</th><th>Officer</th><th>Action</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => (
              <tr key={r.id}>
                <td className="muted">{r.id}</td>
                <td className={`cat ${r.category}`}>{r.category.replace('_', ' ')}</td>
                <td><StatusBadge status={r.status} overdue={r.overdue} /></td>
                <td className={r.overdue && r.status !== 'closed' ? '' : 'muted'} style={r.overdue && r.status !== 'closed' ? { color: 'var(--danger)' } : undefined}>
                  {r.status === 'closed' ? '—' : timeTo(r.dueBy)}
                </td>
                <td className="muted">{r.assignedOfficerId ?? 'unassigned'}</td>
                <td>
                  {NEXT[r.status] ? (
                    <button className="btn primary" onClick={() => advance(r)}>
                      Mark {NEXT[r.status]}
                    </button>
                  ) : (
                    <span className="muted">closed</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
