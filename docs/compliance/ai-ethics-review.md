# AI Ethics Review

Bias and fairness risks, cultural-appropriateness governance, the community advisory panel's role and authority, and **what would cause us to pull the system**. Realises NFR-24 and complements the safety/eval docs.

## Why this matters here

The system gives AI-mediated guidance on intimate, culturally sensitive topics to vulnerable people, in a low-resource language, about minors. The failure modes are not just technical (a wrong fact) but **ethical**: culturally harmful framing, bias against certain groups, or eroding trust. These need governance with teeth, not a values statement.

## Bias & fairness risks

| Risk | Who is harmed | Mitigation |
|---|---|---|
| **Language bias** — worse quality in Kinyarwanda than English | The core users (rural, low-literacy) — i.e. exactly whom we serve | Kinyarwanda-first strategy; eval measures per-language accuracy; gate applies to Kinyarwanda too (`evaluation-framework.md`) |
| **Content bias** — corpus reflects one worldview | Users with different family/faith contexts | Cultural review panel (below); diverse source material; myth-correction done respectfully |
| **Gender bias** — advice skewed by caregiver gender assumptions | Fathers, male caregivers, or mothers stereotyped | Age-band tailoring (not gender-prescriptive); disaggregated eval; panel review |
| **Access bias** — the app-first design privileges smartphone owners | No-smartphone, low-literacy users | SMS/IVR + community sessions as first-class channels; persona P1 as primary design target |
| **Detection bias** — crisis detection weaker on some phrasings/dialects | Those whose disclosures are missed | High-recall tuning; real-question eval set; human review of flagged & unflagged samples |
| **Automation bias** — parents over-trusting the AI | All users | Clear AI disclosure (D4); "I don't know" honesty; referral to humans; not positioned as authority on medical care |

## Cultural-appropriateness governance (NFR-24)

- **Every content batch and material AI-behaviour change** is reviewed for cultural appropriateness before release (a gate in the KB workflow, `knowledge-base-spec.md`).
- Review covers: register and euphemism, respect for family/faith context, non-stigmatising framing, and safety of the *framing*, not just the facts.

## Community advisory panel — role & authority

- **Composition:** parents, faith/community leaders, and **adolescents** (with appropriate safeguarding), plus a clinical voice. `[VERIFY: constituted]`
- **Authority (real, not advisory-in-name):**
  - **Blocking power** over content/behaviour they judge culturally harmful — a veto that content cannot pass the cultural-review gate without.
  - Input into the crisis-response wording and the consent notice.
  - A standing channel to raise concerns from the community.
- **Cadence:** reviews batches on a defined schedule; convened for incidents.
- **Independence:** the panel's block cannot be overridden by product/engineering pressure — only resolved by revising the content.

## Adolescent participation ethics

- Adolescents inform design and review **without** the system processing their identity (MVP has no adolescent accounts, Q10).
- Their participation follows child-safeguarding rules (`child-safeguarding-policy.md`): consent of guardians, safe settings, no exposure to harmful content.

## What would cause us to pull the system ("stop the line")

The system is **paused or withdrawn** (in whole or the affected part) if any of these occur — this is a pre-committed trip-wire, not a case-by-case negotiation:

1. **A safety violation reaches a real user** — unsafe medical advice, a diagnosis/prescription, or termination advice shipped. → Pause coach; incident process; re-gate.
2. **A crisis disclosure is missed** in production (false negative) causing or risking harm. → Pause coach; review detection; re-gate at higher recall.
3. **PII leak** or storage of adolescent identity. → Pause affected flow; DPIA/breach process.
4. **The release gate can no longer be met** after a change and can't be fixed quickly. → Do not ship / roll back.
5. **The advisory panel blocks** and the concern can't be resolved by revision. → Withhold the content/behaviour.
6. **Cross-border/residency ruling (Q2)** makes current processing unlawful. → Switch to Option B or pause processing.
7. **Systematic bias** shown to disadvantage the core users (e.g. Kinyarwanda quality falls below the gate). → Pause, remediate.

Each trip-wire has an owner (safeguarding lead / clinical lead / DPO / product) and is logged in `risk-register.md`. **The default under uncertainty is to pause, not to push on.**

## Accountability

- The clinical lead, safeguarding lead, DPO, and advisory-panel chair jointly own this review.
- Ethics review is revisited at each phase gate (`roadmap.md`) and after any incident.
