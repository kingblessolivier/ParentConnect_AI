-- System-wide immutable audit log (NFR-11, security-design.md).
--
-- Append-only by design. Immutability is enforced in the application seam:
-- `AuditRepository` exposes only `append` and reads — there is no update or
-- delete method for any caller to reach for.
--
-- DEPLOYMENT HARDENING (do this when provisioning, see backend/README.md):
-- the application's database role should hold INSERT/SELECT on this table and
-- nothing else —
--     REVOKE UPDATE, DELETE ON audit_events FROM <app_role>;
-- That belongs with provisioning rather than here because it depends on the
-- role layout of whichever provider is chosen (Q1 hosting is still open), and
-- because a GRANT baked into a migration silently drifts from the real one.
--
-- Privacy (NFR-10/15): identifiers + an action name only. `metadata` is a small
-- JSONB map of non-identifying scalars, sanitised in the service layer. No
-- message content, no phone numbers, nothing about a child.

CREATE TABLE IF NOT EXISTS audit_events (
  id          TEXT PRIMARY KEY,
  actor_id    TEXT NOT NULL,
  actor_role  TEXT NOT NULL,
  action      TEXT NOT NULL,
  entity      TEXT NOT NULL,
  entity_id   TEXT NOT NULL,
  at          TIMESTAMPTZ NOT NULL,
  metadata    JSONB
);

-- The console reads newest-first, usually filtered by action or entity.
CREATE INDEX IF NOT EXISTS audit_events_at_idx ON audit_events (at DESC);
CREATE INDEX IF NOT EXISTS audit_events_action_idx ON audit_events (action);
CREATE INDEX IF NOT EXISTS audit_events_entity_idx ON audit_events (entity, entity_id);
