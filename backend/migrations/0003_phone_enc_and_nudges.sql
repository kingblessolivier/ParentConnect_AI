-- 0003 — encrypted phone (for outbound delivery) + nudge campaigns (FR-17).

-- Recoverable, AES-256-encrypted phone number for server-initiated SMS/IVR (P2).
-- Nullable: parents registered before this migration have no stored number.
ALTER TABLE parents ADD COLUMN IF NOT EXISTS phone_enc TEXT;

CREATE TABLE IF NOT EXISTS nudge_campaigns (
    id                UUID PRIMARY KEY,
    name              TEXT NOT NULL,
    segment_age_band  TEXT NOT NULL CHECK (segment_age_band IN ('10_12','13_15','16_19')),
    segment_language  TEXT NOT NULL CHECK (segment_language IN ('rw','en','fr')),
    channel           TEXT NOT NULL CHECK (channel IN ('sms','push')),
    created_at        TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS nudges (
    id            UUID PRIMARY KEY,
    campaign_id   UUID NOT NULL REFERENCES nudge_campaigns(id) ON DELETE CASCADE,
    body          TEXT NOT NULL,
    send_at       TIMESTAMPTZ NOT NULL,
    dispatched_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS nudges_due_idx ON nudges(send_at) WHERE dispatched_at IS NULL;

-- Parents who have opted out of nudges (NFR-17). Presence = opted out.
CREATE TABLE IF NOT EXISTS nudge_opt_outs (
    parent_id  UUID PRIMARY KEY REFERENCES parents(id) ON DELETE CASCADE,
    opted_out_at TIMESTAMPTZ NOT NULL
);
