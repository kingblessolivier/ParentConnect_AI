'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { apiGetBlob } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { toast } from '../../lib/toast';
import { SAMPLE_INDICATORS } from '../../lib/sample';
import type { Dimension, IndicatorRow, IndicatorsResponse } from '../../lib/types';
import { DemoBanner, PageHead, SortableTh, useSort, useSorted } from '../../components/ui';

const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: 'district', label: 'District' },
  { value: 'sector', label: 'Sector' },
  { value: 'urbanRural', label: 'Urban / rural' },
  { value: 'caregiverGender', label: 'Caregiver gender' },
  { value: 'channel', label: 'Channel' },
];

type SortKey = 'group' | 'reach' | 'knowledgeChange' | 'confidenceChange' | 'communicationChange';

const change = (n: number | null) => (n === null ? '—' : `${n > 0 ? '+' : ''}${n}`);

function escapeCsv(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

function toCsv(dimension: Dimension, rows: IndicatorRow[]): string {
  const cell = (n: number | null) => (n === null ? '' : String(n));
  const lines = [
    [dimension, 'reach', 'knowledge_change', 'confidence_change', 'communication_change'].join(','),
    ...rows.map((r) =>
      [escapeCsv(r.group), String(r.reach), cell(r.knowledgeChange), cell(r.confidenceChange), cell(r.communicationChange)].join(','),
    ),
  ];
  return lines.join('\n') + '\n';
}

function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export default function IndicatorsPage() {
  const [dimension, setDimension] = useState<Dimension>('district');
  const { data, demo } = useApiData<IndicatorsResponse>(
    `/api/v1/dashboards/indicators?by=${dimension}`,
    { dimension, rows: SAMPLE_INDICATORS[dimension] },
  );
  const { sort, toggle } = useSort<SortKey>({ key: 'reach', dir: 'desc' });
  const rows = useSorted(data.rows, sort, (r, key) => r[key]);
  const totalReach = data.rows.reduce((sum, r) => sum + r.reach, 0);
  const maxReach = Math.max(...data.rows.map((r) => r.reach), 1);

  async function exportCsv() {
    const filename = `indicators-${dimension}.csv`;
    try {
      if (demo) {
        downloadBlob(new Blob([toCsv(dimension, rows)], { type: 'text/csv' }), filename);
      } else {
        const blob = await apiGetBlob(`/api/v1/export/indicators.csv?by=${dimension}`);
        downloadBlob(blob, filename);
      }
      toast(`Exported ${filename}.`);
    } catch {
      toast('Export failed.', 'error');
    }
  }

  const dimLabel = DIMENSIONS.find((d) => d.value === dimension)?.label;

  return (
    <>
      <PageHead
        title="Indicators"
        actions={
          <button className="btn" onClick={exportCsv}>
            <Download size={14} /> Export CSV
          </button>
        }
      >
        Reach and mean baseline→follow-up change, disaggregated by dimension (FR-31). Aggregates only — no individual result ever leaves this view (NFR-10/19).
      </PageHead>
      {demo ? <DemoBanner /> : null}

      <div className="toolbar">
        <div className="segmented" role="tablist" aria-label="Disaggregate by">
          {DIMENSIONS.map((d) => (
            <button
              key={d.value}
              className={`btn sm ${dimension === d.value ? 'primary' : ''}`}
              aria-pressed={dimension === d.value}
              onClick={() => setDimension(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <SortableTh label={dimLabel ?? 'Group'} sortKey="group" sort={sort} onSort={toggle} />
              <SortableTh label="Reach" sortKey="reach" sort={sort} onSort={toggle} />
              <SortableTh label="Knowledge Δ" sortKey="knowledgeChange" sort={sort} onSort={toggle} align="right" />
              <SortableTh label="Confidence Δ" sortKey="confidenceChange" sort={sort} onSort={toggle} align="right" />
              <SortableTh label="Communication Δ" sortKey="communicationChange" sort={sort} onSort={toggle} align="right" />
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.group}>
                <td style={{ fontWeight: 600 }}>{r.group}</td>
                <td style={{ minWidth: 180 }}>
                  <div className="rank-bar">
                    <span className="mono">{r.reach.toLocaleString()}</span>
                    <span className="muted mono" style={{ fontSize: 12 }}>{totalReach ? Math.round((r.reach / totalReach) * 100) : 0}%</span>
                    <div className="bar rank-bar-track" style={{ marginTop: 3 }}><span style={{ width: `${(r.reach / maxReach) * 100}%` }} /></div>
                  </div>
                </td>
                <td className="mono" style={{ textAlign: 'right' }}>{change(r.knowledgeChange)}</td>
                <td className="mono" style={{ textAlign: 'right' }}>{change(r.confidenceChange)}</td>
                <td className="mono" style={{ textAlign: 'right' }}>{change(r.communicationChange)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
