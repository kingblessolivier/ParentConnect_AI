-- 0004_sessions — community parenting sessions + attendance (FR-25–28).
--
-- Attendance is idempotent on client_id so records captured offline by a
-- facilitator replay safely on sync (ADR-0008, NFR-07). Attendance links a
-- session to a parent (FR-28) — no child identity is involved.

CREATE TABLE IF NOT EXISTS sessions (
    id             UUID PRIMARY KEY,
    facilitator_id TEXT NOT NULL,
    district       TEXT NOT NULL,
    sector         TEXT NOT NULL,
    topic          TEXT NOT NULL,
    scheduled_at   TIMESTAMPTZ NOT NULL,
    outcome_notes  TEXT,
    created_at     TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS session_attendance (
    id          UUID PRIMARY KEY,
    session_id  UUID NOT NULL REFERENCES sessions(id) ON DELETE CASCADE,
    parent_id   UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    -- Device-generated id: the idempotency key for offline sync.
    client_id   TEXT NOT NULL UNIQUE,
    recorded_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS attendance_session_idx ON session_attendance(session_id);
CREATE INDEX IF NOT EXISTS attendance_parent_idx ON session_attendance(parent_id);
