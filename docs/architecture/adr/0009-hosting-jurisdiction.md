# ADR-0009 — Hosting jurisdiction

- **Status:** Accepted (pending legal confirmation, Q1)
- **Date:** 2026-07-14
- **Deciders:** Sponsor, DPO, Architect
- **Related:** NFR-18, NFR-08, NFR-05; `data-protection-impact-assessment.md`; Q1/V1

## Context

Law No. 058/2021 requires personal data to be hosted in Rwanda or a jurisdiction approved under the law (NFR-18). Provider choice also affects availability (NFR-05), DR (NFR-08), latency to users, and cost.

## Decision

Host **all personal data in-region**. Preference order, pending legal/procurement confirmation:
1. **A Rwanda-based option** (national data centre / Kigali ICT Park / an in-country managed provider) `[VERIFY]`, or
2. **The nearest African cloud region explicitly approved under Law 058/2021** (e.g. AWS `af-south-1` Cape Town) **only if** the DPO confirms it qualifies as "approved" and any cross-border conditions are met `[VERIFY: V1]`.

Keep the data tier **portable** (managed Postgres + object storage via standard interfaces) so the specific provider can change without re-architecting. Non-personal, aggregate, or fully anonymised data may use broader options.

## Alternatives considered

| Option | Pros | Cons | Verdict |
|---|---|---|---|
| **In-region (Rwanda / approved African region)** | Meets NFR-18; lower latency to users | Fewer managed features than US/EU; possible higher cost | **Chosen** |
| US/EU cloud region | Mature, cheap, feature-rich | Fails residency unless a lawful transfer basis exists; DPIA cross-border burden | Rejected for personal data |
| On-prem MoH infrastructure | Full control | Ops burden; availability/DR risk for a small team | Rejected unless mandated |

## Consequences

- Positive: clean residency story for the DPIA and supervisory-authority registration.
- Negative/risks: in-region managed services may be less mature (affects DR automation for NFR-08); confirm backup/restore capabilities meet RPO 24 h/RTO 4 h.
- Revisit trigger: legal ruling on Q1/V1; provider capability gaps; scale needs.
