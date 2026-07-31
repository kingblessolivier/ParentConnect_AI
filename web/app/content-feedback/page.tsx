'use client';

import { useApiData } from '../../lib/useApiData';
import { SAMPLE_FEEDBACK } from '../../lib/sample';
import type { RatingSummary } from '../../lib/types';
import { DemoBanner, PageHead, StatCard } from '../../components/ui';

type Row = RatingSummary & { title?: string };

function Stars({ value }: { value: number | null }) {
  if (value === null) return <span className="muted">no ratings</span>;
  const full = Math.round(value);
  return (
    <span>
      <span className="stars">{'★'.repeat(full)}{'☆'.repeat(5 - full)}</span>{' '}
      <span className="muted mono">{value.toFixed(1)}</span>
    </span>
  );
}

function Distribution({ dist, count }: { dist: Record<number, number>; count: number }) {
  return (
    <div style={{ minWidth: 190 }}>
      {[5, 4, 3, 2, 1].map((star) => {
        const n = dist[star] ?? 0;
        const pct = count ? `${Math.round((n / count) * 100)}%` : '0%';
        return (
          <div key={star} style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span className="muted mono" style={{ width: 12, fontSize: 12 }}>{star}</span>
            <div className="bar" style={{ flex: 1 }}><span style={{ width: pct }} /></div>
            <span className="muted mono" style={{ width: 34, fontSize: 12, textAlign: 'right' }}>{n}</span>
          </div>
        );
      })}
    </div>
  );
}

export default function ContentFeedbackPage() {
  const { data, demo } = useApiData<Row[]>('/api/v1/admin/content-feedback', SAMPLE_FEEDBACK);
  const rows = data.slice().sort((a, b) => (b.average ?? 0) - (a.average ?? 0));

  const totalRatings = rows.reduce((s, r) => s + r.count, 0);
  const weighted = rows.reduce((s, r) => s + (r.average ?? 0) * r.count, 0);
  const overall = totalRatings ? weighted / totalRatings : null;

  return (
    <>
      <PageHead title="Content feedback">
        How parents rate published modules (FR-34). Aggregates only — no rater identity (NFR-10/15).
      </PageHead>
      {demo ? <DemoBanner /> : null}

      <div className="grid grid-3" style={{ marginBottom: 20 }}>
        <StatCard label="Modules rated" value={rows.length} />
        <StatCard label="Total ratings" value={totalRatings.toLocaleString()} />
        <StatCard label="Overall average" value={overall ? `${overall.toFixed(2)} ★` : '—'} tone="ok" />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Module</th><th>Rating</th><th>Ratings</th><th>Distribution</th></tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.itemId}>
                <td>
                  <div style={{ fontWeight: 600 }}>{r.title ?? r.itemId}</div>
                  <div className="muted mono" style={{ fontSize: 12 }}>{r.itemId}</div>
                </td>
                <td><Stars value={r.average} /></td>
                <td className="muted mono">{r.count}</td>
                <td><Distribution dist={r.distribution} count={r.count} /></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
