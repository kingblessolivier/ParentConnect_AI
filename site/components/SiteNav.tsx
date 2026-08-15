'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { Menu, X, ArrowRight } from 'lucide-react';

const SECTIONS = [
  { id: 'how-it-works', label: 'How it works' },
  { id: 'safety', label: 'Safety & privacy' },
  { id: 'help', label: 'Get help' },
];

/**
 * Transparent over the hero photo (one continuous scene), then gains a
 * solid frosted background once scrolled past it. Also tracks which section
 * is in view (scroll-spy) so the current place in the page is always legible.
 *
 * "Try the coach" is deliberately not one of the scroll-spy SECTIONS: it's a
 * real navigation to the full /coach workspace, not an anchor to the
 * same-page preview further down — a parent tapping it wants the actual tool,
 * not a scroll animation.
 */
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);
  const [active, setActive] = useState<string>('');
  const [open, setOpen] = useState(false);

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

  // Lock body scroll while the mobile menu is open, and close it if the
  // viewport grows back past the mobile breakpoint (e.g. rotating a tablet).
  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => { document.body.style.overflow = ''; };
  }, [open]);

  useEffect(() => {
    const onResize = () => { if (window.innerWidth > 760) setOpen(false); };
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);

  return (
    <nav className={`site-nav${scrolled ? ' is-scrolled' : ''}${open ? ' is-open' : ''}`}>
      <div className="wrap">
        <a className="brand" href="#top" aria-label="ParentConnect AI home" onClick={() => setOpen(false)}>
          <span className="brand-mark">PC</span>
          ParentConnect AI
        </a>

        <div className="site-links">
          {SECTIONS.map((s) => (
            <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'is-active' : ''}>
              {s.label}
            </a>
          ))}
          <Link href="/coach" className="btn primary nav-cta">
            Try the coach <ArrowRight size={14} aria-hidden />
          </Link>
        </div>

        <button
          className="nav-toggle"
          onClick={() => setOpen((v) => !v)}
          aria-label={open ? 'Close menu' : 'Open menu'}
          aria-expanded={open}
        >
          {open ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      <div className="nav-mobile" role="dialog" aria-modal="true" hidden={!open}>
        {SECTIONS.map((s) => (
          <a key={s.id} href={`#${s.id}`} className={active === s.id ? 'is-active' : ''} onClick={() => setOpen(false)}>
            {s.label}
          </a>
        ))}
        <Link href="/coach" className="btn primary" onClick={() => setOpen(false)}>
          Try the coach <ArrowRight size={15} aria-hidden />
        </Link>
      </div>
    </nav>
  );
}
