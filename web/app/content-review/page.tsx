'use client';

import { useState } from 'react';
import { apiPost } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { SAMPLE_REVIEW } from '../../lib/sample';
import type { ContentStatus, ReviewItem } from '../../lib/types';
import { DemoBanner, PageHead } from '../../components/ui';

// The forward step and its human label for each pending state (FR-20 workflow).
const FORWARD: Partial<Record<ContentStatus, { to: ContentStatus; label: string }>> = {
  draft: { to: 'clinical_review', label: 'Submit for clinical review' },
  clinical_review: { to: 'cultural_review', label: 'Clinical approve' },
  cultural_review: { to: 'approved', label: 'Cultural approve' },
  approved: { to: 'published', label: 'Publish' },
};
const REJECTABLE = new Set<ContentStatus>(['clinical_review', 'cultural_review']);

function statusLabel(s: ContentStatus): string {
  return s.replace('_', ' ');
}

export default function ContentReviewPage() {
  const { data, demo } = useApiData<ReviewItem[]>('/api/v1/cms/items', SAMPLE_REVIEW);
  const [rows, setRows] = useState<ReviewItem[] | null>(null);
  const list = rows ?? data;

  async function move(item: ReviewItem, to: ContentStatus) {
    const base = rows ?? data;
    // Once published, an item leaves the pending queue.
    const apply = (next: ReviewItem[]) =>
      setRows(to === 'published' ? next.filter((x) => x.versionId !== item.versionId) : next);
    if (demo) {
      apply(base.map((x) => (x.versionId === item.versionId ? { ...x, status: to } : x)));
      return;
    }
    const updated = await apiPost<{ status: ContentStatus }>(
      `/api/v1/cms/versions/${item.versionId}/transition`,
      { to },
    );
    apply(base.map((x) => (x.versionId === item.versionId ? { ...x, status: updated.status } : x)));
  }

  const byStage = (s: ContentStatus) => list.filter((r) => r.status === s).length;

  return (
    <>
      <PageHead title="Content review">
        Editorial approval workflow — nothing reaches a parent until published (FR-20). Clinical and cultural sign-off are tracked separately.
      </PageHead>
      {demo ? <DemoBanner /> : null}

      <div className="grid grid-4" style={{ marginBottom: 20 }}>
        <div className="card stat"><div className="label">In clinical review</div><div className="value">{byStage('clinical_review')}</div></div>
        <div className="card stat"><div className="label">In cultural review</div><div className="value">{byStage('cultural_review')}</div></div>
        <div className="card stat"><div className="label">Approved, unpublished</div><div className="value">{byStage('approved')}</div></div>
        <div className="card stat"><div className="label">Drafts</div><div className="value">{byStage('draft')}</div></div>
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
                    <div className="muted" style={{ fontSize: 12 }}>v{r.version} · {r.versionId}</div>
                  </td>
                  <td className="muted">{r.topic.replace('_', ' ')} · {r.ageBand} · {r.language}</td>
                  <td><span className={`badge ${r.status === 'approved' ? 'actioned' : r.status === 'draft' ? 'raised' : 'acknowledged'}`}>{statusLabel(r.status)}</span></td>
                  <td className="muted" style={{ fontSize: 12 }}>
                    {r.clinicalApprovedBy ? '✓ clinical' : '· clinical'}<br />
                    {r.culturalApprovedBy ? '✓ cultural' : '· cultural'}
                  </td>
                  <td style={{ display: 'flex', gap: 8 }}>
                    {fwd ? <button className="btn primary" onClick={() => move(r, fwd.to)}>{fwd.label}</button> : null}
                    {REJECTABLE.has(r.status) ? <button className="btn" onClick={() => move(r, 'draft')}>Reject</button> : null}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
