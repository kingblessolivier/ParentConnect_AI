'use client';

import { useEffect, useMemo, useState } from 'react';
import { useApiData } from '../../lib/useApiData';
import { SAMPLE_AUDIT } from '../../lib/sample';
import type { AuditAction, AuditEvent } from '../../lib/types';
import { DemoBanner, PageHead, SearchInput, EmptyState } from '../../components/ui';

const ACTIONS: { value: AuditAction | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'user.role_changed', label: 'Role changes' },
  { value: 'content.transitioned', label: 'Content' },
  { value: 'referral.transitioned', label: 'Referrals' },
  { value: 'referral_directory.updated', label: 'Directory' },
  { value: 'privacy.erased', label: 'Erasures' },
  { value: 'retention.applied', label: 'Retention' },
  { value: 'access.denied', label: 'Access denied' },
];

/** Colour by weight of the event, not by module — denials and erasures matter most. */
const TONE: Partial<Record<AuditAction, string>> = {
  'access.denied': 'var(--danger)',
  'privacy.erased': 'var(--accent)',
  'user.role_changed': 'var(--brand)',
};

function when(at: string): string {
  const diffMin = Math.round((Date.now() - Date.parse(at)) / 60_000);
  if (diffMin < 60) return `${diffMin}m ago`;
  if (diffMin < 60 * 24) return `${Math.round(diffMin / 60)}h ago`;
  return new Date(at).toLocaleDateString();
}

export default function AuditPage() {
  const { data, demo } = useApiData<AuditEvent[]>('/api/v1/admin/audit?limit=200', SAMPLE_AUDIT);
  const [action, setAction] = useState<AuditAction | 'all'>('all');
  const [query, setQuery] = useState('');
  // "2h ago" is derived from the current clock, so it differs between the
  // server render and hydration. Render it only after mount; the timestamp
  // itself is always in the row title for the exact value.
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return data.filter((e) => {
      if (action !== 'all' && e.action !== action) return false;
      if (!q) return true;
      return `${e.actorId} ${e.entityId} ${e.entity} ${e.action}`.toLowerCase().includes(q);
    });
  }, [data, action, query]);

  return (
    <>
      <PageHead title="Audit log">
        Every admin, clinical and safeguarding action — who did what, to which record, when (NFR-11).
        Append-only: entries cannot be edited or deleted, and never contain message content or a
        phone number (NFR-10/15).
      </PageHead>
      {demo ? <DemoBanner /> : null}

      <div className="toolbar">
        <div className="toolbar-group">
          {ACTIONS.map((a) => {
            const count = a.value === 'all' ? data.length : data.filter((e) => e.action === a.value).length;
            if (count === 0 && a.value !== 'all') return null;
            return (
              <button
                key={a.value}
                className={`btn sm ${action === a.value ? 'primary' : ''}`}
                onClick={() => setAction(a.value)}
              >
                {a.label} ({count})
              </button>
            );
          })}
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search actor, record…" />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>When</th>
              <th>Actor</th>
              <th>Action</th>
              <th>Record</th>
              <th>Detail</th>
            </tr>
          </thead>
          <tbody>
            {visible.map((e) => (
              <tr key={e.id}>
                <td className="muted" suppressHydrationWarning {...(mounted ? { title: e.at } : {})}>
                  {mounted ? when(e.at) : e.at.slice(0, 10)}
                </td>
                <td>
                  <span className="mono">{e.actorId}</span>
                  <span className="muted"> · {e.actorRole}</span>
                </td>
                <td style={{ fontWeight: 600, color: TONE[e.action] }}>{e.action}</td>
                <td className="muted">
                  {e.entity} <span className="mono">{e.entityId}</span>
                </td>
                <td className="muted">
                  {e.metadata
                    ? Object.entries(e.metadata).map(([k, v]) => `${k}: ${v}`).join(' · ')
                    : '—'}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {visible.length === 0 ? (
          <EmptyState title="No matching events" hint="Try a different action filter or search." />
        ) : null}
      </div>
    </>
  );
}
