-- 0006_referrals — child-protection referral case management (FR-22/23).
--
-- The subject/raiser is ALWAYS an adult actor id — never a child (FR-24/NFR-15).
-- There is deliberately NO child-identity column. Actor ids are TEXT (a raiser
-- may be a parent OR a staff member — CHW/champion/officer — and there is no
-- staff-users table yet), mirroring the content-approver audit refs.
--
-- referral_events is an append-only audit log (NFR-11): one row per status
-- change, stamped with the acting actor and time. Notes are minimal P3 text.

CREATE TABLE IF NOT EXISTS referrals (
    id                   UUID PRIMARY KEY,
    raised_by_parent_id  TEXT NOT NULL,
    category             TEXT NOT NULL CHECK (category IN ('abuse','exploitation','self_harm','pregnancy','other')),
    status               TEXT NOT NULL CHECK (status IN ('raised','acknowledged','actioned','closed')),
    assigned_officer_id  TEXT,
    created_at           TIMESTAMPTZ NOT NULL,
    due_by               TIMESTAMPTZ NOT NULL,
    updated_at           TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS referrals_status_idx ON referrals(status);
CREATE INDEX IF NOT EXISTS referrals_raiser_idx ON referrals(raised_by_parent_id);

CREATE TABLE IF NOT EXISTS referral_events (
    id           UUID PRIMARY KEY,
    referral_id  UUID NOT NULL REFERENCES referrals(id) ON DELETE CASCADE,
    to_status    TEXT NOT NULL CHECK (to_status IN ('raised','acknowledged','actioned','closed')),
    actor_id     TEXT NOT NULL,
    note         TEXT,
    at           TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS referral_events_referral_idx ON referral_events(referral_id);
