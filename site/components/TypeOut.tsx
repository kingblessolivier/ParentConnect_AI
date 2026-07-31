'use client';

import { useEffect, useRef, useState } from 'react';

/**
 * Reveals text progressively, like a person typing, to make the coach feel
 * human. Only animate the most recently arrived message (pass animate); older
 * messages render instantly. Respects prefers-reduced-motion.
 */
export function TypeOut({ text, animate = false, speed = 16 }: { text: string; animate?: boolean; speed?: number }) {
  const [shown, setShown] = useState(animate ? '' : text);
  const done = useRef(false);

  useEffect(() => {
    if (!animate || done.current) {
      setShown(text);
      return;
    }
    if (typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) {
      setShown(text);
      done.current = true;
      return;
    }
    let i = 0;
    let timer: number;
    const step = () => {
      i += 2; // a couple of characters per tick reads as natural typing
      setShown(text.slice(0, i));
      if (i < text.length) {
        timer = window.setTimeout(step, speed);
      } else {
        done.current = true;
      }
    };
    timer = window.setTimeout(step, speed);
    return () => window.clearTimeout(timer);
  }, [text, animate, speed]);

  return <>{shown}</>;
}
