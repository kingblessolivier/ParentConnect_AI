'use client';

import { Users, ClipboardList, GitCompareArrows, TrendingUp } from 'lucide-react';
import { useApiData } from '../lib/useApiData';
import { SAMPLE_OVERVIEW } from '../lib/sample';
import type { Overview } from '../lib/types';
import { DemoBanner, PageHead, StatCard, Donut } from '../components/ui';

const pct = (n: number) => `${Math.round(n * 100)}%`;
const change = (n: number | null) => (n === null ? '—' : `${n > 0 ? '+' : ''}${n}`);

function RankBars({ title, data }: { title: string; data: Record<string, number> }) {
  const total = Object.values(data).reduce((a, b) => a + b, 0) || 1;
  const rows = Object.entries(data).sort((a, b) => b[1] - a[1]);
  const max = rows[0]?.[1] ?? 1;
  return (
    <div className="card">
      <div className="section-title" style={{ margin: '0 0 16px' }}>{title}</div>
      {rows.map(([key, count]) => (
        <div key={key} style={{ marginBottom: 12 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, marginBottom: 5 }}>
            <span style={{ textTransform: 'uppercase', letterSpacing: '0.03em', fontWeight: 600 }}>{key}</span>
            <span className="muted mono">{count.toLocaleString()} · {pct(count / total)}</span>
          </div>
          <div className="bar"><span style={{ width: pct(count / max) }} /></div>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data, demo } = useApiData<Overview>('/api/v1/dashboards/overview', SAMPLE_OVERVIEW);
  const a = data.assessments;
  const channelData = Object.entries(data.activeByChannel).map(([label, value]) => ({ label, value }));

  return (
    <>
      <PageHead title="M&E dashboard">
        Programme reach and self-reported change — anonymised aggregates only (FR-30, NFR-10).
      </PageHead>
      {demo ? <DemoBanner /> : null}

      <div className="grid grid-4">
        <StatCard label="Registered parents" value={data.totalParents.toLocaleString()} sub="reach (FR-30)" tone="brand" icon={<Users size={16} />} />
        <StatCard label="Assessments started" value={a.baseline.toLocaleString()} sub={`${a.followup.toLocaleString()} follow-ups`} icon={<ClipboardList size={16} />} />
        <StatCard label="Completed pairs" value={a.completedPairs.toLocaleString()} sub={`${pct(a.completionRate)} completion`} icon={<GitCompareArrows size={16} />} />
        <StatCard label="Knowledge change" value={change(data.meanChange.knowledge)} sub="mean baseline→follow-up" tone="ok" icon={<TrendingUp size={16} />} />
      </div>

      <div className="section-title">Self-reported change (mean, completed pairs)</div>
      <div className="grid grid-3">
        <StatCard label="Knowledge" value={change(data.meanChange.knowledge)} sub="points gained" />
        <StatCard label="Confidence" value={change(data.meanChange.confidence)} sub="points gained" />
        <StatCard label="Communication" value={change(data.meanChange.communication)} sub="points gained" />
      </div>

      <div className="section-title">Reach breakdown</div>
      <div className="grid grid-2">
        <div className="card">
          <div className="section-title" style={{ margin: '0 0 16px' }}>Active by channel</div>
          <Donut data={channelData} />
        </div>
        <RankBars title="By language" data={data.byLanguage} />
      </div>
    </>
  );
}
