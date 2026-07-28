-- 0007_content_ratings — in-product content feedback & ratings (FR-34).
--
-- A parent rates a published content item (1–5) with an optional short comment.
-- The rater is the anonymous parent id only — never a child (NFR-15). parent_id
-- is TEXT (no hard FK) to stay consistent with other actor refs and avoid
-- coupling to the parents table for this lightweight signal. One rating per
-- (item, parent), enforced by the unique constraint (ON CONFLICT upsert).

CREATE TABLE IF NOT EXISTS content_ratings (
    id          UUID PRIMARY KEY,
    item_id     UUID NOT NULL,
    parent_id   TEXT NOT NULL,
    stars       INT NOT NULL CHECK (stars BETWEEN 1 AND 5),
    comment     TEXT,
    created_at  TIMESTAMPTZ NOT NULL,
    updated_at  TIMESTAMPTZ NOT NULL,
    UNIQUE (item_id, parent_id)
);

CREATE INDEX IF NOT EXISTS content_ratings_item_idx ON content_ratings(item_id);
