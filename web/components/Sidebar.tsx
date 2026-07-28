'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';

const NAV = [
  { href: '/', label: 'M&E dashboard', icon: '📊' },
  { href: '/referrals', label: 'Referral triage', icon: '🛟' },
  { href: '/content-feedback', label: 'Content feedback', icon: '⭐' },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="sidebar">
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
          return (
            <Link key={item.href} href={item.href} className={active ? 'active' : ''}>
              <span aria-hidden>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
