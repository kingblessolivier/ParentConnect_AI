'use client';

import { useState } from 'react';
import { Download } from 'lucide-react';
import { apiGetBlob } from '../../lib/api';
import { useApiData } from '../../lib/useApiData';
import { SAMPLE_INDICATORS } from '../../lib/sample';
import type { Dimension, IndicatorRow, IndicatorsResponse } from '../../lib/types';
import { DemoBanner, PageHead } from '../../components/ui';

const DIMENSIONS: { value: Dimension; label: string }[] = [
  { value: 'district', label: 'District' },
  { value: 'sector', label: 'Sector' },
  { value: 'urbanRural', label: 'Urban / rural' },
  { value: 'caregiverGender', label: 'Caregiver gender' },
  { value: 'channel', label: 'Channel' },
];

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
  const rows = data.rows.slice().sort((a, b) => b.reach - a.reach);
  const totalReach = rows.reduce((sum, r) => sum + r.reach, 0);

  async function exportCsv() {
    const filename = `indicators-${dimension}.csv`;
    if (demo) {
      downloadBlob(new Blob([toCsv(dimension, rows)], { type: 'text/csv' }), filename);
      return;
    }
    const blob = await apiGetBlob(`/api/v1/export/indicators.csv?by=${dimension}`);
    downloadBlob(blob, filename);
  }

  return (
    <>
      <PageHead title="Indicators">
        Reach and mean baseline→follow-up change, disaggregated by dimension (FR-31). Aggregates only — no individual result ever leaves this view (NFR-10/19).
      </PageHead>
      {demo ? <DemoBanner /> : null}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 18, flexWrap: 'wrap', gap: 10 }}>
        <div style={{ display: 'flex', gap: 6 }}>
          {DIMENSIONS.map((d) => (
            <button
              key={d.value}
              className={`btn ${dimension === d.value ? 'primary' : ''}`}
              onClick={() => setDimension(d.value)}
            >
              {d.label}
            </button>
          ))}
        </div>
        <button className="btn" onClick={exportCsv}>
          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
            <Download size={14} /> Export CSV
          </span>
        </button>
      </div>

      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              <th>{DIMENSIONS.find((d) => d.value === dimension)?.label}</th>
              <th>Reach</th>
              <th>Knowledge Δ</th>
              <th>Confidence Δ</th>
              <th>Communication Δ</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.group}>
                <td>{r.group}</td>
                <td className="muted">
                  {r.reach.toLocaleString()} · {totalReach ? Math.round((r.reach / totalReach) * 100) : 0}%
                </td>
                <td>{change(r.knowledgeChange)}</td>
                <td>{change(r.confidenceChange)}</td>
                <td>{change(r.communicationChange)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </>
  );
}
