'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { LogIn, LogOut } from 'lucide-react';
import { clearToken, getSession, type SessionClaims } from '../lib/session';
import { NAV } from '../lib/nav';

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();
  const [session, setSession] = useState<SessionClaims | null>(null);

  useEffect(() => {
    setSession(getSession());
  }, [path]);

  function signOut() {
    clearToken();
    setSession(null);
    router.push('/sign-in');
  }

  return (
    <aside className="sidebar" style={{ display: 'flex', flexDirection: 'column' }}>
      <div className="brand-row">
        <div className="brand-mark">PC</div>
        <div>
          <div className="brand-name">ParentConnect AI</div>
          <div className="brand-sub">Staff console</div>
        </div>
      </div>
      <nav className="nav">
        {NAV.map((item) => {
          const active = item.href === '/' ? path === '/' : path.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link key={item.href} href={item.href} className={active ? 'active' : ''}>
              <Icon size={16} aria-hidden style={{ flexShrink: 0 }} />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div style={{ marginTop: 'auto', paddingTop: 12, borderTop: '1px solid var(--border)' }}>
        {session ? (
          <div>
            <div style={{ padding: '6px 10px', fontSize: 12 }}>
              <div style={{ color: 'var(--muted)' }}>Signed in as</div>
              <div style={{ fontWeight: 650, textTransform: 'capitalize' }}>{session.role}</div>
            </div>
            <button
              onClick={signOut}
              className="btn subtle"
              style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginTop: 4 }}
            >
              <LogOut size={14} /> Sign out
            </button>
          </div>
        ) : (
          <Link href="/sign-in" className={path === '/sign-in' ? 'active' : ''}>
            <LogIn size={16} aria-hidden style={{ flexShrink: 0 }} />
            Sign in
          </Link>
        )}
      </div>
    </aside>
  );
}
