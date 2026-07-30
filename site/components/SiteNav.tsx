'use client';

import { useEffect, useState } from 'react';

/**
 * Transparent over the hero photo (one continuous scene), then gains a
 * solid frosted background once scrolled past it — the nav shouldn't be a
 * visually separate bar sitting on top of the image.
 */
export function SiteNav() {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 64);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <nav className={`site-nav${scrolled ? ' is-scrolled' : ''}`}>
      <div className="wrap">
        <div className="brand">
          <span className="brand-mark">PC</span>
          ParentConnect AI
        </div>
        <div className="site-links">
          <a href="#how-it-works">How it works</a>
          <a href="#safety">Safety &amp; privacy</a>
          <a href="#help">Get help</a>
        </div>
      </div>
    </nav>
  );
}
