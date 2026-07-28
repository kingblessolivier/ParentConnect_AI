-- 0004_assessments — M&E baseline/follow-up assessments (FR-29).
--
-- Scores are non-identifying self-assessment values (0–100). One row per
-- (parent, type). Individual results are never exposed via dashboards; only
-- anonymised aggregates are (FR-30/31, NFR-10).

CREATE TABLE IF NOT EXISTS assessments (
    id             UUID PRIMARY KEY,
    parent_id      UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    type           TEXT NOT NULL CHECK (type IN ('baseline','followup')),
    knowledge      INT NOT NULL CHECK (knowledge BETWEEN 0 AND 100),
    confidence     INT NOT NULL CHECK (confidence BETWEEN 0 AND 100),
    communication  INT NOT NULL CHECK (communication BETWEEN 0 AND 100),
    completed_at   TIMESTAMPTZ NOT NULL,
    UNIQUE (parent_id, type)
);

CREATE INDEX IF NOT EXISTS assessments_parent_idx ON assessments(parent_id);
