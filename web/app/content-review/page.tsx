'use client';

import { useMemo, useState } from 'react';
import { Check } from 'lucide-react';
import { apiPost } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { toast } from '../../lib/toast';
import { SAMPLE_REVIEW } from '../../lib/sample';
import type { ContentStatus, ReviewItem } from '../../lib/types';
import { DemoBanner, PageHead, StatCard, SearchInput, EmptyState } from '../../components/ui';

// The forward step and its human label for each pending state (FR-20 workflow).
const FORWARD: Partial<Record<ContentStatus, { to: ContentStatus; label: string }>> = {
  draft: { to: 'clinical_review', label: 'Submit for clinical review' },
  clinical_review: { to: 'cultural_review', label: 'Clinical approve' },
  cultural_review: { to: 'approved', label: 'Cultural approve' },
  approved: { to: 'published', label: 'Publish' },
};
const REJECTABLE = new Set<ContentStatus>(['clinical_review', 'cultural_review']);

const STAGES: { value: ContentStatus | 'all'; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'draft', label: 'Draft' },
  { value: 'clinical_review', label: 'Clinical' },
  { value: 'cultural_review', label: 'Cultural' },
  { value: 'approved', label: 'Approved' },
];

function statusLabel(s: ContentStatus): string {
  return s.replace('_', ' ');
}

export default function ContentReviewPage() {
  const { data, demo } = useApiData<ReviewItem[]>('/api/v1/cms/items', SAMPLE_REVIEW);
  const [rows, setRows] = useState<ReviewItem[] | null>(null);
  const [stage, setStage] = useState<ContentStatus | 'all'>('all');
  const [query, setQuery] = useState('');
  const source = rows ?? data;

  const list = useMemo(() => {
    const q = query.trim().toLowerCase();
    return source.filter((r) => {
      if (stage !== 'all' && r.status !== stage) return false;
      if (!q) return true;
      return `${r.title} ${r.topic} ${r.ageBand} ${r.language} ${r.versionId}`.toLowerCase().includes(q);
    });
  }, [source, stage, query]);

  async function move(item: ReviewItem, to: ContentStatus) {
    const base = rows ?? data;
    const apply = (next: ReviewItem[]) =>
      setRows(to === 'published' ? next.filter((x) => x.versionId !== item.versionId) : next);
    try {
      if (demo) {
        apply(base.map((x) => (x.versionId === item.versionId ? { ...x, status: to } : x)));
      } else {
        const updated = await apiPost<{ status: ContentStatus }>(
          `/api/v1/cms/versions/${item.versionId}/transition`,
          { to },
        );
        apply(base.map((x) => (x.versionId === item.versionId ? { ...x, status: updated.status } : x)));
      }
      toast(to === 'published' ? `“${item.title}” published.` : `“${item.title}” → ${statusLabel(to)}.`);
    } catch {
      toast(`Could not update “${item.title}”.`, 'error');
    }
  }

  const byStage = (s: ContentStatus) => source.filter((r) => r.status === s).length;

  return (
    <>
      <PageHead title="Content review">
        Editorial approval workflow — nothing reaches a parent until published (FR-20). Clinical and cultural sign-off are tracked separately.
      </PageHead>
      {demo ? <DemoBanner /> : null}

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <StatCard label="In clinical review" value={byStage('clinical_review')} />
        <StatCard label="In cultural review" value={byStage('cultural_review')} />
        <StatCard label="Approved, unpublished" value={byStage('approved')} tone="ok" />
        <StatCard label="Drafts" value={byStage('draft')} />
      </div>

      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="Filter by stage">
          {STAGES.map((s) => (
            <button
              key={s.value}
              className={`btn sm ${stage === s.value ? 'primary' : ''}`}
              aria-pressed={stage === s.value}
              onClick={() => setStage(s.value)}
            >
              {s.label}
            </button>
          ))}
        </div>
        <SearchInput value={query} onChange={setQuery} placeholder="Search title, topic…" />
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr><th>Title</th><th>Topic · band · lang</th><th>Stage</th><th>Sign-off</th><th>Action</th></tr>
          </thead>
          <tbody>
            {list.map((r) => {
              const fwd = FORWARD[r.status];
              return (
                <tr key={r.versionId}>
                  <td>
                    <div style={{ fontWeight: 600 }}>{r.title}</div>
                    <div className="muted mono" style={{ fontSize: 12 }}>v{r.version} · {r.versionId}</div>
                  </td>
                  <td className="muted">{r.topic.replace('_', ' ')} · {r.ageBand} · {r.language}</td>
                  <td><span className={`badge ${r.status === 'approved' ? 'actioned' : r.status === 'draft' ? 'raised' : 'acknowledged'}`}>{statusLabel(r.status)}</span></td>
                  <td className="muted" style={{ fontSize: 12, whiteSpace: 'nowrap' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: r.clinicalApprovedBy ? 'var(--ok)' : undefined }}>
                      {r.clinicalApprovedBy ? <Check size={12} /> : <span style={{ width: 12 }} />} clinical
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 4, color: r.culturalApprovedBy ? 'var(--ok)' : undefined }}>
                      {r.culturalApprovedBy ? <Check size={12} /> : <span style={{ width: 12 }} />} cultural
                    </div>
                  </td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    {fwd ? <button className="btn primary sm" onClick={() => move(r, fwd.to)}>{fwd.label}</button> : null}
                    {REJECTABLE.has(r.status) ? <button className="btn danger sm" onClick={() => move(r, 'draft')}>Reject</button> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
        {list.length === 0 ? <EmptyState title="Nothing in this stage" hint="Adjust the filter or search to see other items." /> : null}
      </div>
    </>
  );
}
