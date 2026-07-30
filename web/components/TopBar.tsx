'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { ChevronRight, Sun, Moon, LifeBuoy } from 'lucide-react';
import { useApiData } from '../lib/useApiData';
import { SAMPLE_REFERRALS } from '../lib/sample';
import type { ReferralView } from '../lib/types';
import { navLabelFor } from '../lib/nav';
import { getSession, type SessionClaims } from '../lib/session';

type Theme = 'light' | 'dark';

function effectiveTheme(): Theme {
  const stored = document.documentElement.getAttribute('data-theme');
  if (stored === 'light' || stored === 'dark') return stored;
  return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

const ROLE_COLOR: Record<string, string> = {
  admin: 'var(--brand)',
  cpo: 'var(--danger)',
  reviewer: 'var(--info)',
  chw: 'var(--ok)',
  champion: 'var(--accent)',
  school: 'var(--accent)',
  parent: 'var(--muted)',
};

export function TopBar() {
  const path = usePathname();
  const [theme, setTheme] = useState<Theme>('light');
  const [session, setSession] = useState<SessionClaims | null>(null);
  const { data: referrals } = useApiData<ReferralView[]>('/api/v1/referrals', SAMPLE_REFERRALS);

  useEffect(() => {
    setTheme(effectiveTheme());
    setSession(getSession());
  }, [path]);

  function toggleTheme() {
    const next: Theme = theme === 'dark' ? 'light' : 'dark';
    document.documentElement.setAttribute('data-theme', next);
    window.localStorage.setItem('pc_theme', next);
    setTheme(next);
  }

  const overdue = referrals.filter((r) => r.overdue && r.status !== 'closed').length;

  return (
    <header className="topbar">
      <div className="crumb">
        <span className="muted">Staff Console</span>
        <ChevronRight size={13} className="muted" aria-hidden />
        <span>{navLabelFor(path)}</span>
      </div>

      <div className="topbar-actions">
        <Link
          href="/referrals"
          className="topbar-icon-btn"
          title={overdue > 0 ? `${overdue} overdue referral${overdue === 1 ? '' : 's'}` : 'No overdue referrals'}
          aria-label="Overdue referrals"
        >
          <LifeBuoy size={16} />
          {overdue > 0 ? <span className="topbar-alert-count">{overdue}</span> : null}
        </Link>

        <button
          className="topbar-icon-btn"
          onClick={toggleTheme}
          aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
          title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
        >
          {theme === 'dark' ? <Sun size={16} /> : <Moon size={16} />}
        </button>

        {session ? (
          <div className="topbar-avatar" title={`Signed in as ${session.role}`} style={{ background: ROLE_COLOR[session.role] ?? 'var(--muted)' }}>
            {session.role.slice(0, 1).toUpperCase()}
          </div>
        ) : null}
      </div>
    </header>
  );
}
