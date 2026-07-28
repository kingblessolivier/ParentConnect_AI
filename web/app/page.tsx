'use client';

import { useApiData } from '../lib/useApiData';
import { SAMPLE_OVERVIEW } from '../lib/sample';
import type { Overview } from '../lib/types';
import { DemoBanner, PageHead, StatCard } from '../components/ui';

const pct = (n: number) => `${Math.round(n * 100)}%`;
const change = (n: number | null) => (n === null ? '—' : `${n > 0 ? '+' : ''}${n}`);

function Bars({ title, data }: { title: string; data: Record<string, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  return (
    <div className="card">
      <div className="section-title" style={{ margin: '0 0 12px' }}>{title}</div>
      {rows.map(([key, count]) => (
        <div key={key} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 4 }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.03em' }}>{key}</span>
            <span className="muted">{count.toLocaleString()} · {pct(count / total)}</span>
          </div>
          <div className="bar"><span style={{ width: pct(count / total) }} /></div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data, demo } = useApiData<Overview>('/api/v1/dashboards/overview', SAMPLE_OVERVIEW);
  const a = data.assessments;

  return (
    <>
      <PageHead title="M&E dashboard">
        Programme reach and self-reported change — anonymised aggregates only (FR-30, NFR-10).
      </PageHead>
      {demo ? <DemoBanner /> : null}

      <div className="grid grid-4">
        <StatCard label="Registered parents" value={data.totalParents.toLocaleString()} sub="reach (FR-30)" />
        <StatCard label="Assessments started" value={a.baseline.toLocaleString()} sub={`${a.followup.toLocaleString()} follow-ups`} />
        <StatCard label="Completed pairs" value={a.completedPairs.toLocaleString()} sub={`${pct(a.completionRate)} completion`} />
        <StatCard label="Knowledge change" value={change(data.meanChange.knowledge)} sub="mean baseline→follow-up" />
      </div>

      <div className="section-title">Self-reported change (mean, completed pairs)</div>
      <div className="grid grid-3">
        <StatCard label="Knowledge" value={change(data.meanChange.knowledge)} />
        <StatCard label="Confidence" value={change(data.meanChange.confidence)} />
        <StatCard label="Communication" value={change(data.meanChange.communication)} />
      </div>

      <div className="section-title">Reach breakdown</div>
      <div className="grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
        <Bars title="Active by channel" data={data.activeByChannel} />
        <Bars title="By language" data={data.byLanguage} />
      </div>
    </>
  );
}
