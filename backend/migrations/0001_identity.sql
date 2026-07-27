-- 0001_identity — parents, consent, OTP (data-model.md).
--
-- Data minimisation (NFR-15, FR-24): there is NO column for a child's name,
-- date of birth, or national ID anywhere. A child is represented only by an
-- age band. Phone numbers are stored hashed (P2). SRH conversation content
-- (P3) lives in a later migration with stronger controls.

CREATE TABLE IF NOT EXISTS parents (
    id                UUID PRIMARY KEY,
    phone_hash        TEXT NOT NULL UNIQUE,
    display_alias     TEXT,
    district          TEXT,
    sector            TEXT,
    urban_rural       TEXT CHECK (urban_rural IS NULL OR urban_rural IN ('urban','rural')),
    caregiver_gender  TEXT CHECK (caregiver_gender IS NULL OR caregiver_gender IN ('female','male','other')),
    preferred_language TEXT NOT NULL CHECK (preferred_language IN ('rw','en','fr')),
    preferred_channel  TEXT NOT NULL CHECK (preferred_channel IN ('app','sms','ussd','ivr')),
    child_bands       TEXT[] NOT NULL DEFAULT '{}',
    role              TEXT NOT NULL CHECK (role IN ('parent','chw','champion','school','cpo','admin','reviewer')),
    created_at        TIMESTAMPTZ NOT NULL
);

CREATE TABLE IF NOT EXISTS consents (
    id           UUID PRIMARY KEY,
    parent_id    UUID NOT NULL REFERENCES parents(id) ON DELETE CASCADE,
    purpose      TEXT NOT NULL,
    language     TEXT NOT NULL CHECK (language IN ('rw','en','fr')),
    method       TEXT NOT NULL CHECK (method IN ('app','sms','ivr','assisted')),
    given_at     TIMESTAMPTZ NOT NULL,
    withdrawn_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS consents_parent_idx ON consents(parent_id);

-- OTPs are short-lived; the code is stored hashed, never in clear.
CREATE TABLE IF NOT EXISTS otps (
    phone_hash    TEXT PRIMARY KEY,
    otp_hash      TEXT NOT NULL,
    expires_at_ms BIGINT NOT NULL,
    attempts      INT NOT NULL DEFAULT 0
);
