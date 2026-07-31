'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { TopBar } from './TopBar';
import { Toaster } from './Toaster';

export function ConsoleShell({ children }: { children: ReactNode }) {
  const [navOpen, setNavOpen] = useState(false);
  const path = usePathname();

  // Close the mobile drawer on navigation and on Escape.
  useEffect(() => setNavOpen(false), [path]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && setNavOpen(false);
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div className={`layout${navOpen ? ' nav-open' : ''}`}>
      <div className="nav-scrim" onClick={() => setNavOpen(false)} aria-hidden />
      <Sidebar />
      <main className="main">
        <TopBar onMenu={() => setNavOpen((v) => !v)} />
        <div className="content">{children}</div>
      </main>
      <Toaster />
    </div>
  );
}
