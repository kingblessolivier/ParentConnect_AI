'use client';

import { useEffect, useState } from 'react';

/**
 * True only after the component has mounted on the client. Use to gate any
 * output that depends on `Date.now()`, `localStorage`, or `window` so the
 * server-rendered HTML and the first client render agree — otherwise React
 * throws a hydration mismatch (as the relative SLA times on /referrals did).
 */
export function useMounted(): boolean {
  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);
  return mounted;
}
