'use client';

/**
 * A tiny dependency-free toast bus. Any client component can call `toast(...)`;
 * a single <Toaster /> mounted in the layout subscribes and renders them. Kept
 * out of React context so pages can fire toasts from plain event handlers
 * without threading a provider through every tree.
 */

export type ToastKind = 'success' | 'error' | 'info';

export interface ToastMessage {
  id: number;
  kind: ToastKind;
  text: string;
}

type Listener = (toasts: ToastMessage[]) => void;

let toasts: ToastMessage[] = [];
let nextId = 1;
const listeners = new Set<Listener>();

function emit() {
  for (const l of listeners) l(toasts);
}

export function subscribe(listener: Listener): () => void {
  listeners.add(listener);
  listener(toasts);
  return () => listeners.delete(listener);
}

export function dismissToast(id: number) {
  toasts = toasts.filter((t) => t.id !== id);
  emit();
}

export function toast(text: string, kind: ToastKind = 'success', ttl = 3600) {
  const id = nextId++;
  toasts = [...toasts, { id, kind, text }];
  emit();
  if (ttl > 0 && typeof window !== 'undefined') {
    window.setTimeout(() => dismissToast(id), ttl);
  }
  return id;
}
