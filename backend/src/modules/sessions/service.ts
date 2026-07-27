/**
 * Community-session service (FR-25–28).
 */

import { AppError } from '../../lib/problem.js';
import { CONTENT_TOPICS } from '../content/types.js';
import { getGuide, type SessionGuide } from './guides.js';
import type { CreateSessionInput, SessionRepository } from './repository.js';
import type { Attendance, Session, SessionTopic } from './types.js';

export class SessionService {
  constructor(
    private readonly repo: SessionRepository,
    private readonly now: () => string = () => new Date().toISOString(),
  ) {}

  async schedule(input: CreateSessionInput): Promise<Session> {
    if (!input.district?.trim()) throw new AppError(400, 'Invalid input', 'district is required');
    if (!input.sector?.trim()) throw new AppError(400, 'Invalid input', 'sector is required');
    if (!CONTENT_TOPICS.includes(input.topic)) {
      throw new AppError(400, 'Invalid input', 'topic is required and must be valid');
    }
    if (Number.isNaN(new Date(input.scheduledAt).getTime())) {
      throw new AppError(400, 'Invalid input', 'scheduledAt is invalid');
    }
    return this.repo.createSession(input);
  }

  listSessions(district?: string): Promise<Session[]> {
    return this.repo.listSessions(district);
  }

  guide(topic: SessionTopic): SessionGuide {
    if (!CONTENT_TOPICS.includes(topic)) throw new AppError(404, 'Not Found', 'unknown topic');
    return getGuide(topic);
  }

  async recordAttendance(sessionId: string, parentId: string, clientId: string): Promise<Attendance> {
    if (!(await this.repo.getSession(sessionId))) {
      throw new AppError(404, 'Not Found', 'session not found');
    }
    if (!parentId?.trim()) throw new AppError(400, 'Invalid input', 'parentId is required');
    if (!clientId?.trim()) throw new AppError(400, 'Invalid input', 'clientId is required');
    return this.repo.recordAttendance(sessionId, parentId, clientId, this.now());
  }

  async recordOutcome(sessionId: string, notes: string): Promise<Session> {
    if (!(await this.repo.getSession(sessionId))) {
      throw new AppError(404, 'Not Found', 'session not found');
    }
    return this.repo.setOutcome(sessionId, notes);
  }

  listAttendance(sessionId: string): Promise<Attendance[]> {
    return this.repo.listAttendance(sessionId);
  }

  listSessionsForParent(parentId: string): Promise<Session[]> {
    return this.repo.listSessionsForParent(parentId);
  }
}
