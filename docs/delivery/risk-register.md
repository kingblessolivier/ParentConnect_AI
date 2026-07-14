# Risk Register

Technical, operational, ethical, and political risks with likelihood, impact, owner, and mitigation. Likelihood/Impact: L/M/H. Reviewed at each phase gate and after incidents.

## Technical

| # | Risk | L | I | Owner | Mitigation | Link |
|---|---|:-:|:-:|---|---|---|
| T1 | **Kinyarwanda retrieval quality** too low → weak grounding → unsafe/irrelevant answers | H | H | AI lead | Kinyarwanda-first strategy; hybrid retrieval; empirical model selection; release gate blocks launch | kinyarwanda-strategy.md, ADR-0005 |
| T2 | LLM hallucination / uncited health claims | M | H | AI lead | Grounding gate + citation requirement + post-gen check; "I don't know" path | safety-and-guardrails.md |
| T3 | AI service outage degrades UX | M | M | Eng lead | Circuit breaker + degradation; content/SMS/referral independent | NFR-06 |
| T4 | Offline sync data loss/conflict corruption | M | H | Mobile lead | Idempotent `client_id`; typed conflict rules; tests | offline-sync.md |
| T5 | Scale beyond pilot breaks architecture | L | M | Eng lead | Documented scaling path; stateless API; read replicas; extractable AI service | system-architecture.md |
| T6 | Prompt injection / data poisoning | M | H | AI lead | Content-only-if-approved; delimited untrusted content; injection scan | safety-and-guardrails.md |

## Operational

| # | Risk | L | I | Owner | Mitigation | Link |
|---|---|:-:|:-:|---|---|---|
| O1 | **Telecom/short-code/IVR deal not secured or costly** (Q5) | M | H | Programme | Gateway abstraction; SMS-first MVP; defer IVR; budget contingency | ADR-0006/0007 |
| O2 | Clinical reviewer / authority not confirmed (Q4) | M | H | Programme | Named authority is a Phase-0 gate; no content without it | roadmap.md |
| O3 | Knowledge base doesn't exist / rights unclear (Q3) | M | H | Programme/Clinical | Phase 0 authors + approves corpus; confirm rights to reuse MoH/RBC materials | knowledge-base-spec.md |
| O4 | Cost per user exceeds sustainability envelope (NFR-35) | M | H | Programme | Cost model tracked; SMS deal & inference levers; trip-wire before scaling | cost-model.md |
| O5 | Low adoption among target (no-smartphone, low-literacy) users | M | H | Programme | IVR/SMS + community sessions; audio; field testing; equity indicators | test-strategy.md, monitoring-and-me.md |
| O6 | Small team / key-person dependency | M | M | Eng lead | Boring tech; docs; monorepo; ≥70% coverage; ADRs | engineering-standards.md |
| O7 | DR event / data loss | L | H | Eng lead | Daily backups; timed restore drill (RPO24/RTO4) | security-design.md |

## Ethical

| # | Risk | L | I | Owner | Mitigation | Link |
|---|---|:-:|:-:|---|---|---|
| E1 | **Unsafe medical advice reaches a user** | L | H | Clinical lead | Refusal policy; grounding+citation; release gate; stop-the-line | ai-ethics-review.md |
| E2 | **Missed crisis disclosure** (false negative) | L | H | Safeguarding lead | High-recall detection; always-on referral; HITL; stop-the-line | child-safeguarding-policy.md |
| E3 | Storage/leak of adolescent identity | L | H | DPO | No identity fields; PII scrub; review checklist; structural refusal | data-model.md |
| E4 | Cultural harm / inappropriate framing | M | H | Advisory panel | Cultural-review gate with veto; field testing | ai-ethics-review.md |
| E5 | Bias disadvantaging core (Kinyarwanda/rural) users | M | H | AI lead | Per-language eval; equity indicators; gate applies to rw | evaluation-framework.md |
| E6 | Consent not truly informed (low literacy) | M | H | DPO | Audio/plain-language consent; assisted flow; cultural review | consent-and-transparency.md |

## Privacy / legal / political

| # | Risk | L | I | Owner | Mitigation | Link |
|---|---|:-:|:-:|---|---|---|
| P1 | **Cross-border query context ruled unlawful (Q2)** | M | H | DPO/Legal | PII-free prompts; Option B in-region fallback; ruling before launch | model-selection.md, DPIA |
| P2 | Non-compliance with Law 058/2021 / registration | L | H | DPO | DPIA; supervisory registration; residency (ADR-0009) | DPIA |
| P3 | Breach of sensitive P3 data | L | H | Eng/DPO | Encryption, least-privilege, audit, pen-test, IR plan | security-design.md |
| P4 | Political/community sensitivity of SRH for minors | M | M | Programme | Community advisory panel; faith/community engagement; parent-mediated model | ai-ethics-review.md, vision.md |
| P5 | MoH/DHIS2 integration expectations unmet | L | M | Programme | CSV in MVP; DHIS2 deferred with mapping plan; confirm with MoH | monitoring-and-me.md |
| P6 | Funder reporting requirements unclear (Q8) | M | M | Programme | Agree indicators/cadence up front; versioned definitions | monitoring-and-me.md |

## Top risks (watch list)

1. **T1 Kinyarwanda retrieval quality** — the technical make-or-break.
2. **E1/E2 safety (unsafe advice / missed crisis)** — the ethical make-or-break; stop-the-line triggers.
3. **O1/O2/O3 external dependencies** (telecom, clinician, corpus) — the delivery make-or-break.
4. **P1 cross-border residency (Q2)** — the compliance make-or-break.

Each top risk has an explicit gate or trip-wire elsewhere in the docs; none is left to chance.
