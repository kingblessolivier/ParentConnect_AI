-- 0002_content — content items and versions with the editorial workflow (FR-20).
--
-- Only a version with status 'published' is ever served to a parent. Every
-- version can carry audio (FR-19). No personal data here (P0/content).

CREATE TABLE IF NOT EXISTS content_items (
    id          UUID PRIMARY KEY,
    topic       TEXT NOT NULL,
    age_band    TEXT NOT NULL CHECK (age_band IN ('10_12','13_15','16_19','all')),
    language    TEXT NOT NULL CHECK (language IN ('rw','en','fr')),
    created_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS content_versions (
    id                  UUID PRIMARY KEY,
    item_id             UUID NOT NULL REFERENCES content_items(id) ON DELETE CASCADE,
    version             INT NOT NULL,
    status              TEXT NOT NULL CHECK (status IN
                          ('draft','clinical_review','cultural_review','approved','published','retired')),
    title               TEXT NOT NULL,
    body                TEXT NOT NULL,
    audio_uri           TEXT,
    illustration_uris   TEXT[] NOT NULL DEFAULT '{}',
    -- Audit reference to the approving staff user id (no FK: staff users are a
    -- later slice). TEXT keeps it representation-agnostic.
    clinical_approved_by TEXT,
    cultural_approved_by TEXT,
    published_at        TIMESTAMPTZ,
    created_at          TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS content_versions_item_idx ON content_versions(item_id);
-- Fast lookup of what is currently served.
CREATE INDEX IF NOT EXISTS content_versions_published_idx ON content_versions(status)
    WHERE status = 'published';
