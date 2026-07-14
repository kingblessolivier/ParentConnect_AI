# Traceability Matrix

**Requirement → design element → test case.** Kept machine-updatable: the table is a stable, pipe-delimited format (one requirement per row) so it can be linted/generated. Columns:

- **Req** — FR/NFR ID (stable).
- **Design** — the doc/section or component that realises it.
- **Test** — the test case ID that verifies it (see `docs/delivery/test-strategy.md` for the `TC-*` scheme).
- **MVP** — ●/◐/○.

> Convention for `TC-*` IDs: `TC-<module>-<nnn>`. AI-eval cases use `EV-*` (see `evaluation-framework.md`). These are placeholders until the test suite exists; keep IDs stable once assigned.

## Functional

| Req | Design element | Test | MVP |
|---|---|---|:--:|
| FR-01 | identity svc · `api-spec.md#auth` · OTP flow | TC-identity-001 | ● |
| FR-02 | channel-design.md (account linking) | TC-identity-010 | ◐ |
| FR-03 | identity svc · assisted onboarding · user-journeys J8 | TC-identity-020 | ● |
| FR-04 | data-model.md (nullable name) · consent flow | TC-identity-030 | ● |
| FR-05 | security-design.md (authz matrix) | TC-identity-040 | ● |
| FR-06 | data-model.md (profile; age-band enum) | TC-identity-050 | ● |
| FR-07 | ai-architecture.md (RAG) | EV-accuracy-set | ● |
| FR-08 | kinyarwanda-strategy.md · language detection | EV-language-set | ◐ |
| FR-09 | ai-architecture.md (grounding) · safety-and-guardrails.md | EV-grounding-set | ● |
| FR-10 | ai-architecture.md (age-band prompt) | EV-ageband-set | ● |
| FR-11 | coach svc (conversation starters) | TC-coach-011 | ● |
| FR-12 | coach svc (role-play) | TC-coach-012 | ○ |
| FR-13 | safety-and-guardrails.md (crisis/OOS detection) | EV-crisis-set | ● |
| FR-14 | channel-design.md (SMS/IVR turn-based) | TC-coach-014 | ◐ |
| FR-15 | data-model.md (response↔source log) | TC-coach-015 | ● |
| FR-16 | knowledge-base-spec.md · content svc | TC-content-016 | ● |
| FR-17 | content svc (nudge scheduler) | TC-content-017 | ● |
| FR-18 | offline-sync.md (content pack) | TC-content-018 | ○ |
| FR-19 | content svc (audio assets) | TC-content-019 | ● |
| FR-20 | knowledge-base-spec.md (workflow) | TC-content-020 | ● |
| FR-21 | safety-and-guardrails.md · safeguarding svc | EV-crisis-set / TC-safeguard-021 | ● |
| FR-22 | safeguarding svc · api-spec.md#referrals | TC-safeguard-022 | ● |
| FR-23 | data-model.md (referral status machine) | TC-safeguard-023 | ● |
| FR-24 | data-model.md (no child-identity fields) | TC-safeguard-024 | ● |
| FR-25 | sessions svc | TC-sessions-025 | ● |
| FR-26 | content svc (facilitator materials) | TC-sessions-026 | ● |
| FR-27 | offline-sync.md (session sync) | TC-sessions-027 | ● |
| FR-28 | data-model.md (attendance↔profile) | TC-sessions-028 | ◐ |
| FR-29 | me svc (assessments) | TC-me-029 | ● |
| FR-30 | me svc (dashboards) | TC-me-030 | ● |
| FR-31 | data-model.md (disaggregation dims) | TC-me-031 | ● |
| FR-32 | monitoring-and-me.md (export) | TC-me-032 | ◐ |
| FR-33 | admin svc | TC-admin-033 | ● |
| FR-34 | content svc (feedback/ratings) | TC-admin-034 | ● |

## Non-functional

| Req | Design element | Test | MVP |
|---|---|---|:--:|
| NFR-01 | system-architecture.md (latency budget) | TC-perf-001 | ● |
| NFR-02 | app perf budget | TC-perf-002 | ● |
| NFR-03 | channel-design.md (IVR) | TC-perf-003 | ○ |
| NFR-04 | system-architecture.md (scaling) | TC-perf-004 | ● |
| NFR-05 | monitoring-and-me.md (uptime) | TC-ops-005 | ● |
| NFR-06 | system-architecture.md (degradation) | TC-ops-006 | ● |
| NFR-07 | offline-sync.md | TC-ops-007 | ● |
| NFR-08 | security-design.md (backup/DR) | TC-ops-008 | ● |
| NFR-09 | security-design.md (crypto) | TC-sec-009 | ● |
| NFR-10 | security-design.md (authz) | TC-sec-010 | ● |
| NFR-11 | security-design.md (audit log) | TC-sec-011 | ● |
| NFR-12 | security-design.md (pen-test plan) | TC-sec-012 | ● |
| NFR-13 | engineering-standards.md (secrets/CI) | TC-sec-013 | ● |
| NFR-14 | data-protection-impact-assessment.md | TC-comp-014 | ● |
| NFR-15 | data-model.md (minimisation) | TC-comp-015 | ● |
| NFR-16 | consent-and-transparency.md | TC-comp-016 | ● |
| NFR-17 | api-spec.md (data subject rights) | TC-comp-017 | ● |
| NFR-18 | adr/0009-hosting-jurisdiction.md | TC-comp-018 | ● |
| NFR-19 | retention-schedule.md | TC-comp-019 | ● |
| NFR-20 | evaluation-framework.md (release gate) | EV-gate | ● |
| NFR-21 | safety-and-guardrails.md (refusals) | EV-refusal-set | ● |
| NFR-22 | ai-architecture.md (citations) | EV-grounding-set | ● |
| NFR-23 | evaluation-framework.md (HITL) | TC-ai-023 | ● |
| NFR-24 | ai-ethics-review.md (advisory panel) | TC-ai-024 | ● |
| NFR-25 | personas.md · usability test plan | TC-ux-025 | ● |
| NFR-26 | content svc (audio) | TC-ux-026 | ● |
| NFR-27 | app build target | TC-ux-027 | ● |
| NFR-28 | app perf budget | TC-ux-028 | ● |
| NFR-29 | channel-design.md (IVR toll-free) | TC-ux-029 | ○ |
| NFR-30 | i18n layer | TC-loc-030 | ● |
| NFR-31 | adr/0006-sms-ussd-aggregator.md | TC-loc-031 | ● |
| NFR-32 | monitoring-and-me.md (DHIS2) | TC-loc-032 | ○ |
| NFR-33 | engineering-standards.md (coverage) | TC-maint-033 | ● |
| NFR-34 | knowledge-base-spec.md (CMS) | TC-maint-034 | ● |
| NFR-35 | cost-model.md | TC-maint-035 | ● |
| NFR-36 | adr/0010-config-driven-deployment.md | TC-maint-036 | ● |

## Coverage check

- Every FR-01…FR-34 and NFR-01…NFR-36 appears exactly once above. When a requirement is added, append a row and assign a stable `TC-*`/`EV-*` ID; never renumber existing rows.
