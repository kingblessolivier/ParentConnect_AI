/**
 * Session repository interfaces + in-memory implementation.
 *
 * Attendance is idempotent by `clientId` so a facilitator's offline records
 * replay safely on sync (ADR-0008, NFR-07) — recording the same client id twice
 * returns the original row, never a duplicate.
 */

import { randomUUID } from 'node:crypto';
import type { Attendance, Session, SessionTopic } from './types.js';

export interface CreateSessionInput {
  facilitatorId: string;
  district: string;
  sector: string;
  topic: SessionTopic;
  scheduledAt: string;
}

export interface SessionRepository {
  createSession(input: CreateSessionInput): Promise<Session>;
  getSession(id: string): Promise<Session | null>;
  listSessions(district?: string): Promise<Session[]>;
  setOutcome(id: string, notes: string): Promise<Session>;
  /** Idempotent by clientId — returns the existing row on replay. */
  recordAttendance(
    sessionId: string,
    parentId: string,
    clientId: string,
    recordedAt: string,
  ): Promise<Attendance>;
  listAttendance(sessionId: string): Promise<Attendance[]>;
  listSessionsForParent(parentId: string): Promise<Session[]>;
}

export class InMemorySessionRepository implements SessionRepository {
  private readonly sessions = new Map<string, Session>();
  private readonly attendance = new Map<string, Attendance>();
  private readonly byClientId = new Map<string, string>(); // clientId -> attendanceId

  async createSession(input: CreateSessionInput): Promise<Session> {
    const session: Session = { id: randomUUID(), createdAt: new Date().toISOString(), ...input };
    this.sessions.set(session.id, session);
    return session;
  }
  async getSession(id: string): Promise<Session | null> {
    return this.sessions.get(id) ?? null;
  }
  async listSessions(district?: string): Promise<Session[]> {
    const all = [...this.sessions.values()];
    return district ? all.filter((s) => s.district === district) : all;
  }
  async setOutcome(id: string, notes: string): Promise<Session> {
    const session = this.sessions.get(id);
    if (!session) throw new Error(`session ${id} not found`);
    session.outcomeNotes = notes;
    return session;
  }
  async recordAttendance(
    sessionId: string,
    parentId: string,
    clientId: string,
    recordedAt: string,
  ): Promise<Attendance> {
    const existingId = this.byClientId.get(clientId);
    if (existingId) return this.attendance.get(existingId)!; // idempotent replay
    const record: Attendance = { id: randomUUID(), sessionId, parentId, clientId, recordedAt };
    this.attendance.set(record.id, record);
    this.byClientId.set(clientId, record.id);
    return record;
  }
  async listAttendance(sessionId: string): Promise<Attendance[]> {
    return [...this.attendance.values()].filter((a) => a.sessionId === sessionId);
  }
  async listSessionsForParent(parentId: string): Promise<Session[]> {
    const sessionIds = new Set(
      [...this.attendance.values()].filter((a) => a.parentId === parentId).map((a) => a.sessionId),
    );
    return [...this.sessions.values()].filter((s) => sessionIds.has(s.id));
  }
}
