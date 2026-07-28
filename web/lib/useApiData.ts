'use client';

import { useEffect, useState } from 'react';
import { apiGet } from './api';

export interface ApiState<T> {
  data: T;
  demo: boolean;
  loading: boolean;
}

/**
 * Fetch `path` from the backend; if it's unreachable/unauthorized (no live API
 * configured), fall back to `fallback` and flag the view as demo data. Keeps
 * the consoles reviewable standalone while wiring cleanly to the real API.
 */
export function useApiData<T>(path: string, fallback: T): ApiState<T> {
  const [state, setState] = useState<ApiState<T>>({ data: fallback, demo: true, loading: true });

  useEffect(() => {
    let live = true;
    apiGet<T>(path)
      .then((data) => live && setState({ data, demo: false, loading: false }))
      .catch(() => live && setState({ data: fallback, demo: true, loading: false }));
    return () => {
      live = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [path]);

  return state;
}
