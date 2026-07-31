'use client';

import { useEffect, useState } from 'react';

const SECTIONS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'coach', label: 'Try the coach' },
  { id: 'safety', label: 'Safety & privacy' },
  { id: 'help', label: 'Get help' },
];

/**
 * Transparent over the hero photo (one continuous scene), then gains a
 * solid frosted background once scrolled past it. Also tracks which section
 * is in view (scroll-spy) so the current place in the page is always legible.
 */
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>('');

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 64);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) setActive(entry.target.id);
        }
      },
      { rootMargin: '-45% 0px -50% 0px' },
    );
    for (const s of SECTIONS) {
      const el = document.getElementById(s.id);
      if (el) observer.observe(el);
    }
    return () => observer.disconnect();
  }, []);

  return (
    <nav className={`site-nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="wrap">
        <a className="brand" href="#top" aria-label="ParentConnect AI — home">
          <span className="brand-mark">PC</span>
          ParentConnect AI
        </a>
        <div className="site-links">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'is-active' : ''}>
              {s.label}
            </a>
          ))}
        </div>
      </div>
    </nav>
  );
}
