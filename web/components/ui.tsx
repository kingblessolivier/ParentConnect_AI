'use client';

import { useMemo, useState, type ReactNode } from 'react';
import { Info, Search, ArrowUp, ArrowDown, Inbox } from 'lucide-react';
import type { ReferralStatus } from '../lib/types';

export function StatCard({
  label,
  value,
  sub,
  tone,
  icon,
}: {
  label: string;
  value: ReactNode;
  sub?: string;
  tone?: 'danger' | 'ok' | 'brand';
  icon?: ReactNode;
}) {
  return (
    <div className={`card stat${tone ? ` stat-${tone}` : ''}`}>
      <div className="stat-top">
        <div className="label">{label}</div>
        {icon ? <div className="stat-icon" aria-hidden>{icon}</div> : null}
      </div>
      <div className="value">{value}</div>
      {sub ? <div className="sub">{sub}</div> : null}
    </div>
  );
}

export function StatusBadge({ status, overdue }: { status: ReferralStatus; overdue?: boolean }) {
  if (overdue && status !== 'closed') return <span className="badge overdue">overdue</span>;
  return <span className={`badge ${status}`}>{status}</span>;
}

export function DemoBanner() {
  return (
    <div className="demo-banner">
      <Info size={15} aria-hidden style={{ flexShrink: 0 }} />
      Showing illustrative demo data — no live backend configured
      (<code>NEXT_PUBLIC_API_BASE</code>). All records are synthetic.
    </div>
  );
}

export function PageHead({
  title,
  children,
  actions,
}: {
  title: string;
  children?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="page-head">
      <div className="page-head-row">
        <h1>{title}</h1>
        {actions ? <div className="page-head-actions">{actions}</div> : null}
      </div>
      {children ? <p>{children}</p> : null}
    </div>
  );
}

export function SearchInput({
  value,
  onChange,
  placeholder = 'Search…',
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
}) {
  return (
    <div className="search">
      <Search size={15} aria-hidden />
      <input
        type="search"
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        aria-label={placeholder}
      />
    </div>
  );
}

export function EmptyState({ title, hint }: { title: string; hint?: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon" aria-hidden><Inbox size={22} /></div>
      <div className="empty-title">{title}</div>
      {hint ? <div className="empty-hint">{hint}</div> : null}
    </div>
  );
}

export function Skeleton({ w = '100%', h = 14 }: { w?: number | string; h?: number | string }) {
  return <span className="skeleton" style={{ width: w, height: h }} aria-hidden />;
}

/* ---------- Sorting ---------- */

export type SortDir = 'asc' | 'desc';
export interface SortState<K extends string> {
  key: K;
  dir: SortDir;
}

export function useSort<K extends string>(initial: SortState<K>) {
  const [sort, setSort] = useState<SortState<K>>(initial);
  const toggle = (key: K) =>
    setSort((s) => (s.key === key ? { key, dir: s.dir === 'asc' ? 'desc' : 'asc' } : { key, dir: 'desc' }));
  return { sort, toggle };
}

export function SortableTh<K extends string>({
  label,
  sortKey,
  sort,
  onSort,
  align = 'left',
}: {
  label: string;
  sortKey: K;
  sort: SortState<K>;
  onSort: (k: K) => void;
  align?: 'left' | 'right';
}) {
  const active = sort.key === sortKey;
  return (
    <th className={`th-sort${active ? ' active' : ''}`} style={{ textAlign: align }} aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : 'none'}>
      <button onClick={() => onSort(sortKey)} className="th-sort-btn" style={{ justifyContent: align === 'right' ? 'flex-end' : 'flex-start' }}>
        {label}
        <span className="th-sort-caret" aria-hidden>
          {active ? (sort.dir === 'asc' ? <ArrowUp size={12} /> : <ArrowDown size={12} />) : null}
        </span>
      </button>
    </th>
  );
}

export function useSorted<T, K extends string>(
  rows: T[],
  sort: SortState<K>,
  accessor: (row: T, key: K) => number | string | null,
): T[] {
  return useMemo(() => {
    const dir = sort.dir === 'asc' ? 1 : -1;
    return rows.slice().sort((a, b) => {
      const av = accessor(a, sort.key);
      const bv = accessor(b, sort.key);
      if (av === null) return 1;
      if (bv === null) return -1;
      if (typeof av === 'number' && typeof bv === 'number') return (av - bv) * dir;
      return String(av).localeCompare(String(bv)) * dir;
    });
  }, [rows, sort, accessor]);
}

/* ---------- Lightweight SVG data-viz ---------- */

const DONUT_COLORS = ['var(--brand)', 'var(--info)', 'var(--accent)', 'var(--ok)', 'var(--muted)'];

export function Donut({
  data,
  size = 132,
}: {
  data: { label: string; value: number }[];
  size?: number;
}) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const r = size / 2 - 10;
  const c = 2 * Math.PI * r;
  let offset = 0;
  const segments = data.map((d, i) => {
    const frac = d.value / total;
    const seg = { ...d, color: DONUT_COLORS[i % DONUT_COLORS.length], dash: frac * c, offset: -offset * c, pct: Math.round(frac * 100) };
    offset += frac;
    return seg;
  });
  return (
    <div className="donut-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label="Distribution chart">
        <g transform={`rotate(-90 ${size / 2} ${size / 2})`}>
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--panel-2)" strokeWidth={12} />
          {segments.map((s) => (
            <circle
              key={s.label}
              cx={size / 2}
              cy={size / 2}
              r={r}
              fill="none"
              stroke={s.color}
              strokeWidth={12}
              strokeDasharray={`${s.dash} ${c - s.dash}`}
              strokeDashoffset={s.offset}
              strokeLinecap="butt"
            />
          ))}
        </g>
        <text x="50%" y="47%" textAnchor="middle" className="donut-total">{total.toLocaleString()}</text>
        <text x="50%" y="60%" textAnchor="middle" className="donut-total-label">total</text>
      </svg>
      <ul className="donut-legend">
        {segments.map((s) => (
          <li key={s.label}>
            <span className="dot" style={{ background: s.color }} aria-hidden />
            <span className="donut-legend-label">{s.label}</span>
            <span className="donut-legend-val">{s.pct}%</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
