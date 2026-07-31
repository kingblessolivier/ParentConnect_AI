'use client';

import { useMemo, useState } from 'react';
import { apiPost } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { useMounted } from '../../lib/useMounted';
import { toast } from '../../lib/toast';
import { SAMPLE_REFERRALS } from '../../lib/sample';
import type { ReferralCategory, ReferralStatus, ReferralView } from '../../lib/types';
import {
  DemoBanner,
  PageHead,
  StatCard,
  StatusBadge,
  SearchInput,
  EmptyState,
  SortableTh,
  useSort,
  useSorted,
} from '../../components/ui';

const NEXT: Record<ReferralStatus, ReferralStatus | null> = {
  raised: 'acknowledged',
  acknowledged: 'actioned',
  actioned: 'closed',
  closed: null,
};

const CATEGORIES: (ReferralCategory | 'all')[] = ['all', 'abuse', 'exploitation', 'self_harm', 'pregnancy', 'other'];

type SortKey = 'id' | 'category' | 'status' | 'dueBy';

function timeTo(dueBy: string): string {
  const ms = Date.parse(dueBy) - Date.now();
  const h = Math.round(ms / 3_600_000);
  if (h < 0) return `${-h}h overdue`;
  return `in ${h}h`;
}

export default function ReferralsPage() {
  const { data, demo } = useApiData<ReferralView[]>('/api/v1/referrals', SAMPLE_REFERRALS);
  const mounted = useMounted();
  const [rows, setRows] = useState<ReferralView[] | null>(null);
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState<ReferralCategory | 'all'>('all');
  const { sort, toggle } = useSort<SortKey>({ key: 'dueBy', dir: 'asc' });

  const source = rows ?? data;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source.filter((r) => {
      if (category !== 'all' && r.category !== category) return false;
      if (!q) return true;
      return `${r.id} ${r.category} ${r.status} ${r.assignedOfficerId ?? ''}`.toLowerCase().includes(q);
    });
  }, [source, query, category]);

  const list = useSorted(filtered, sort, (r, key) => {
    if (key === 'dueBy') return Date.parse(r.dueBy);
    return r[key];
  });

  const open = source.filter((r) => r.status !== 'closed').length;
  const overdue = source.filter((r) => r.overdue && r.status !== 'closed').length;

  async function advance(r: ReferralView) {
    const to = NEXT[r.status];
    if (!to) return;
    const base = rows ?? data;
    try {
      if (demo) {
        setRows(base.map((x) => (x.id === r.id ? { ...x, status: to, overdue: to === 'closed' ? false : x.overdue } : x)));
      } else {
        const updated = await apiPost<ReferralView>(`/api/v1/referrals/${r.id}/transition`, { toStatus: to });
        setRows(base.map((x) => (x.id === r.id ? updated : x)));
      }
      toast(`${r.id} marked ${to}.`);
    } catch {
      toast(`Could not update ${r.id}.`, 'error');
    }
  }

  return (
    <>
      <PageHead title="Referral triage">
        Child-protection caseload — forward-only lifecycle with SLA tracking (FR-22/23). No child identity is ever shown (FR-24).
      </PageHead>
      {demo ? <DemoBanner /> : null}

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <StatCard label="Open cases" value={open} sub="not yet closed" />
        <StatCard label="Overdue" value={overdue} sub="past SLA" tone={overdue ? 'danger' : undefined} />
        <StatCard label="Total" value={source.length} sub="all time" />
      </div>

      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="Filter by category">
          {CATEGORIES.map((c) => (
            <button
              key={c}
              className={`btn sm ${category === c ? 'primary' : ''}`}
              aria-pressed={category === c}
              onClick={() => setCategory(c)}
            >
              {c === 'all' ? 'All' : c.replace('_', ' ')}
            </button>
          ))}
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search ref, officer…" />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortableTh label="Ref" sortKey="id" sort={sort} onSort={toggle} />
              <SortableTh label="Category" sortKey="category" sort={sort} onSort={toggle} />
              <SortableTh label="Status" sortKey="status" sort={sort} onSort={toggle} />
              <SortableTh label="SLA" sortKey="dueBy" sort={sort} onSort={toggle} />
              <th>Officer</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const late = r.overdue && r.status !== 'closed';
              return (
                <tr key={r.id}>
                  <td className="muted mono">{r.id}</td>
                  <td className={`cat ${r.category}`}>{r.category.replace('_', ' ')}</td>
                  <td><StatusBadge status={r.status} overdue={r.overdue} /></td>
                  <td className={late ? '' : 'muted'} style={late ? { color: 'var(--danger)', fontWeight: 600 } : undefined}>
                    {r.status === 'closed' ? '—' : mounted ? timeTo(r.dueBy) : '…'}
                  </td>
                  <td className="muted">{r.assignedOfficerId ?? 'unassigned'}</td>
                  <td>
                    {NEXT[r.status] ? (
                      <button className="btn primary sm" onClick={() => advance(r)}>
                        Mark {NEXT[r.status]}
                      </button>
                    ) : (
                      <span className="muted">closed</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 ? <EmptyState title="No referrals match" hint="Try clearing the search or category filter." /> : null}
      </div>
    </>
  );
}
