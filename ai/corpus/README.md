# corpus — seed knowledge base (DRAFT, NOT APPROVED)

**Nothing in this directory may be served to a parent.** Every entry is
`status: draft`. The retrieval index only accepts `published` content
(`kb/ingest.py`, FR-20/FR-09), and moving a draft to `published` requires
clinical **and** cultural sign-off through the workflow in
`docs/ai/knowledge-base-spec.md`.

That gate is the product's core safety property, so it is worth being blunt
about what this directory is and isn't:

| | |
|---|---|
| **What this is** | Research-drafted candidate content, every claim traceable to a named public source, written to give a clinical reviewer something concrete to react to rather than a blank page. |
| **What this is not** | Approved clinical content. It has had **no** clinical review, **no** cultural review, and is **not** authored by a clinician. |
| **Blocked on** | Q4 — no clinical reviewer has been named (`docs/decisions-log.md`). Until one is, nothing here can be approved by anyone. |

## Deliberate scope limit

These drafts cover **parent–adolescent communication** — how to start a
conversation, what tone works, what adolescents themselves say they want.
They deliberately do **not** cover clinical SRH guidance (contraceptive
choice, dosing, diagnosis, termination). Two reasons:

1. Those are exactly what the coach must refuse anyway (NFR-21).
2. Communication guidance can be responsibly drafted from published behavioural
   research; clinical guidance needs a clinician, full stop.

So a clinician reviewing this directory is checking *communication advice*, and
the clinical SRH corpus remains theirs to author.

## Sources

Claims are attributed per-entry in the `sources` field. The sources used:

- **WHO**, *Comprehensive sexuality education* fact sheet, 11 March 2026 —
  <https://www.who.int/news-room/fact-sheets/detail/comprehensive-sexuality-education>
- **Uwambaje et al.**, *Adolescent–Parent Communication on Sexual and Reproductive
  Health Issues in Nyarugenge and Kamonyi Districts, Rwanda*, Rwanda Journal of
  Medicine and Health Sciences, 2025 (132 adolescents aged 10–19, 11 focus
  groups) — <https://pmc.ncbi.nlm.nih.gov/articles/PMC12188257/>
- **Rwanda Demographic and Health Survey 2025** (RBC), prevalence figures —
  `[VERIFY]` accessed via secondary reporting; confirm against the primary RDHS
  publication before any external use.

## Review checklist (for the named clinical reviewer)

- [ ] Is each claim accurate and current?
- [ ] Is the tone right for a parent who may be anxious or ashamed?
- [ ] Does anything stray into diagnosis/prescribing/termination advice (NFR-21)?
- [ ] Is the Kinyarwanda translation faithful *and* culturally acceptable (NFR-24)?
- [ ] Is the age-band assignment right?
