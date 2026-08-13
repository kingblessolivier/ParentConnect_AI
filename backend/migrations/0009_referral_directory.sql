-- Editable referral directory (FR-33), an OVERRIDE layer over the deployment
-- config bundle (`referral-directory.json`, ADR-0010).
--
-- The file bundle remains the baseline that guarantees a referral pathway
-- exists at boot. This table lets an admin correct a district's contacts
-- without a redeploy. When it is empty — or unreachable — the file is served
-- instead, so a disclosure can always surface help (FR-21, NFR-06).
--
-- Contains service contacts (Isange centres, helplines, facilities). No
-- personal data: these are published organisational numbers, not people.

CREATE TABLE IF NOT EXISTS referral_directory (
  id         TEXT PRIMARY KEY,
  name       TEXT NOT NULL,
  phone      TEXT NOT NULL,
  type       TEXT NOT NULL,
  district   TEXT,
  updated_at TIMESTAMPTZ NOT NULL
);

CREATE INDEX IF NOT EXISTS referral_directory_district_idx ON referral_directory (district);
