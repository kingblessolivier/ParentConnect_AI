/**
 * Postgres implementation of the session repository (ADR-0002).
 * Attendance stays idempotent on client_id via ON CONFLICT (offline sync).
 */

import { randomUUID } from 'node:crypto';
import type { Queryable } from '../../lib/db.js';
import type { CreateSessionInput, SessionRepository } from './repository.js';
import type { Attendance, Session, SessionTopic } from './types.js';

const iso = (v: Date | string): string => (v instanceof Date ? v.toISOString() : new Date(v).toISOString());

interface SessionRow {
  id: string;
  facilitator_id: string;
  district: string;
  sector: string;
  topic: SessionTopic;
  scheduled_at: Date | string;
  outcome_notes: string | null;
  created_at: Date | string;
}
interface AttendanceRow {
  id: string;
  session_id: string;
  parent_id: string;
  client_id: string;
  recorded_at: Date | string;
}

function mapSession(r: SessionRow): Session {
  const s: Session = {
    id: r.id,
    facilitatorId: r.facilitator_id,
    district: r.district,
    sector: r.sector,
    topic: r.topic,
    scheduledAt: iso(r.scheduled_at),
    createdAt: iso(r.created_at),
  };
  if (r.outcome_notes != null) s.outcomeNotes = r.outcome_notes;
  return s;
}
function mapAttendance(r: AttendanceRow): Attendance {
  return {
    id: r.id,
    sessionId: r.session_id,
    parentId: r.parent_id,
    clientId: r.client_id,
    recordedAt: iso(r.recorded_at),
  };
}

export class PgSessionRepository implements SessionRepository {
  constructor(private readonly db: Queryable) {}

  async createSession(input: CreateSessionInput): Promise<Session> {
    const r = await this.db.query<SessionRow>(
      `INSERT INTO sessions (id, facilitator_id, district, sector, topic, scheduled_at, created_at)
       VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING *`,
      [randomUUID(), input.facilitatorId, input.district, input.sector, input.topic, input.scheduledAt, new Date().toISOString()],
    );
    return mapSession(r.rows[0]!);
  }
  async getSession(id: string): Promise<Session | null> {
    const r = await this.db.query<SessionRow>('SELECT * FROM sessions WHERE id = $1', [id]);
    return r.rows[0] ? mapSession(r.rows[0]) : null;
  }
  async listSessions(district?: string): Promise<Session[]> {
    const r = district
      ? await this.db.query<SessionRow>('SELECT * FROM sessions WHERE district = $1 ORDER BY scheduled_at', [district])
      : await this.db.query<SessionRow>('SELECT * FROM sessions ORDER BY scheduled_at');
    return r.rows.map(mapSession);
  }
  async setOutcome(id: string, notes: string): Promise<Session> {
    const r = await this.db.query<SessionRow>(
      'UPDATE sessions SET outcome_notes = $2 WHERE id = $1 RETURNING *',
      [id, notes],
    );
    if (!r.rows[0]) throw new Error(`session ${id} not found`);
    return mapSession(r.rows[0]);
  }
  async recordAttendance(
    sessionId: string,
    parentId: string,
    clientId: string,
    recordedAt: string,
  ): Promise<Attendance> {
    // Idempotent on client_id: a replay returns the existing row unchanged.
    const r = await this.db.query<AttendanceRow>(
      `INSERT INTO session_attendance (id, session_id, parent_id, client_id, recorded_at)
       VALUES ($1,$2,$3,$4,$5)
       ON CONFLICT (client_id) DO UPDATE SET client_id = EXCLUDED.client_id
       RETURNING *`,
      [randomUUID(), sessionId, parentId, clientId, recordedAt],
    );
    return mapAttendance(r.rows[0]!);
  }
  async listAttendance(sessionId: string): Promise<Attendance[]> {
    const r = await this.db.query<AttendanceRow>(
      'SELECT * FROM session_attendance WHERE session_id = $1',
      [sessionId],
    );
    return r.rows.map(mapAttendance);
  }
  async listSessionsForParent(parentId: string): Promise<Session[]> {
    const r = await this.db.query<SessionRow>(
      `SELECT s.* FROM sessions s
         JOIN session_attendance a ON a.session_id = s.id
        WHERE a.parent_id = $1 ORDER BY s.scheduled_at`,
      [parentId],
    );
    return r.rows.map(mapSession);
  }

  async deleteAttendanceForParent(parentId: string): Promise<void> {
    await this.db.query('DELETE FROM session_attendance WHERE parent_id = $1', [parentId]);
  }
}
