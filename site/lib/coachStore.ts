'use client';

/**
 * Local-only session storage for the coach workspace.
 *
 * PRIVACY (CLAUDE.md #4, Law No. 058/2021 data minimisation):
 *  - Conversations are stored ONLY in the browser's localStorage, on this
 *    device. They are never sent to or kept on any server.
 *  - No names, phone numbers, or identifiers are ever stored — only the
 *    free text the user chose to type, plus a locally-generated id.
 *  - Because devices are often shared, the UI makes deleting a single chat or
 *    clearing everything one click away.
 */

import type { AgeBand, CoachReply, Lang } from './coach';

export interface StoredMsg {
  id: number;
  role: 'user' | 'coach';
  text?: string;
  reply?: CoachReply;
}

export interface Session {
  id: string;
  title: string;
  lang: Lang;
  ageBand: AgeBand;
  messages: StoredMsg[];
  createdAt: number;
  updatedAt: number;
}

const KEY = 'pc_coach_sessions_v1';

export function newSession(lang: Lang, ageBand: AgeBand): Session {
  const now = Date.now();
  return {
    id: `s-${now}-${Math.random().toString(36).slice(2, 7)}`,
    title: '',
    lang,
    ageBand,
    messages: [],
    createdAt: now,
    updatedAt: now,
  };
}

export function titleFrom(question: string): string {
  const t = question.trim().replace(/\s+/g, ' ');
  return t.length > 42 ? `${t.slice(0, 42)}…` : t;
}

export function loadSessions(): Session[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = window.localStorage.getItem(KEY);
    if (!raw) return [];
    const list = JSON.parse(raw) as Session[];
    return Array.isArray(list) ? list.sort((a, b) => b.updatedAt - a.updatedAt) : [];
  } catch {
    return [];
  }
}

export function saveSessions(list: Session[]): void {
  if (typeof window === 'undefined') return;
  try {
    window.localStorage.setItem(KEY, JSON.stringify(list));
  } catch {
    /* storage full or unavailable — non-fatal; the chat still works in-session */
  }
}

export function upsert(list: Session[], s: Session): Session[] {
  const i = list.findIndex((x) => x.id === s.id);
  const copy = i >= 0 ? list.slice() : [s, ...list];
  if (i >= 0) copy[i] = s;
  return copy.sort((a, b) => b.updatedAt - a.updatedAt);
}
