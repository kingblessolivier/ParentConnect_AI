'use client';

import { useEffect, useState } from 'react';
import { CheckCircle2, AlertTriangle, Info, X } from 'lucide-react';
import { subscribe, dismissToast, type ToastMessage } from '../lib/toast';

const ICON = {
  success: CheckCircle2,
  error: AlertTriangle,
  info: Info,
} as const;

export function Toaster() {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  useEffect(() => subscribe(setToasts), []);

  if (toasts.length === 0) return null;

  return (
    <div className="toaster" role="status" aria-live="polite">
      {toasts.map((t) => {
        const Icon = ICON[t.kind];
        return (
          <div key={t.id} className={`toast toast-${t.kind}`}>
            <Icon size={16} aria-hidden className="toast-icon" />
            <span className="toast-text">{t.text}</span>
            <button
              className="toast-close"
              onClick={() => dismissToast(t.id)}
              aria-label="Dismiss notification"
            >
              <X size={14} />
            </button>
          </div>
        );
      })}
    </div>
  );
}
