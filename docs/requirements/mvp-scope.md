# MVP Scope & Cut Line

**Purpose:** state exactly what the pilot builds, what it defers, and *why* — so a sceptical reviewer can see the reasoning, not just the list.

## The cut-line principle

> Ship the smallest system that can **prove the theory of change safely**. Every included item earns its place by being either (a) essential to the parent-capability outcome, or (b) non-negotiable for safety/privacy. Everything else waits.

Two things are **never** cut regardless of budget: **safeguarding** (FR-21, FR-22) and **privacy/AI-safety NFRs** (NFR-14–24). A system handling minors' SRH data is judged on these first.

## In the pilot

| Area | Included | Why |
|---|---|---|
| Access | FR-01, FR-02 (**app + SMS only**), FR-03, FR-04, FR-05, FR-06 | The two channels that reach the most parents cheapest; assisted onboarding + anonymity reach the low-literacy/private user |
| AI coach | FR-07, FR-08 (**Kinyarwanda + English**), FR-09, FR-10, FR-11, FR-13, FR-14 (SMS), FR-15 | The core engine, retrieval-grounded, age-tailored, with escalation and full logging |
| Content | FR-16, FR-17, FR-19, FR-20 | Micro-learning, nudges, audio (low-literacy), and the approval workflow that makes content safe |
| Safeguarding | FR-21, FR-22, FR-23, FR-24 | Non-negotiable. Detection, referral, tracking, identity-free |
| Community | FR-25, FR-26, FR-27, FR-28 | The in-person channel that reinforces the digital one; offline-first |
| M&E | FR-29, FR-30, FR-31, FR-32 (**CSV/Excel only**), FR-33, FR-34 | Enough measurement to prove the pilot and run it without redeploys |
| **All safety/privacy NFRs** | NFR-09–24 in full; performance/availability/usability targets scaled to pilot | Legally and ethically mandatory |

## Explicitly deferred (with reasoning)

| Deferred | ID | Why it can wait | Trigger to build |
|---|---|---|---|
| IVR voice channel | FR-14 (IVR), NFR-29 | Highest cost & integration lift (telecom voice, Kinyarwanda ASR/TTS quality). SMS covers basic phones for launch | Telecom/IVR agreement (Q5) + validated Kinyarwanda voice quality |
| USSD | FR-02 (USSD) | Needs the same telecom arrangement; SMS covers the basic-phone need first | Aggregator/short-code deal |
| Role-play / practice mode | FR-12 | Valuable but not required to prove the outcome; adds AI-safety surface | Post-pilot, after eval maturity |
| Full offline content pack | FR-18 | Engineering-heavy; audio + cached FAQ cover the core low-connectivity need | Evidence that offline app usage is a bottleneck |
| DHIS2 export | FR-32 (DHIS2) | MoH integration has long lead time; CSV/Excel satisfies pilot reporting | MoH integration agreement + funder requirement |
| French | FR-08 (fr) | Pilot districts are Kinyarwanda-first; localisation layer still built to accept it | Expansion to Francophone context |
| Direct adolescent accounts | (FR-04 adolescent view) | Materially heavier DPIA for direct minor processing; product bet is on *parents* | Separate safeguarding + legal review |

## The cut line, drawn

```
INCLUDE  ─────────────────────────────────────────────  DEFER
app + SMS · RAG coach (rw+en) · content+nudges+audio ┃ IVR · USSD · role-play
· approval workflow · safeguarding+referral · community ┃ offline pack · DHIS2
sessions · baseline/followup + dashboards + CSV export  ┃ French · adolescent
· ALL privacy & AI-safety NFRs                          ┃ accounts
```

## If the budget halved — what I'd drop next

In order (see also `roadmap.md` and the closing "what I'd cut" note):
1. **Community-session tooling polish** → keep attendance capture, drop printable-material generation (provide static PDFs).
2. **In-app dashboards** → export CSV and use a spreadsheet; keep the data pipeline.
3. **Push nudges** → SMS-only nudges (one channel to operate).
4. **App** before **SMS.** If forced to one channel, **SMS + a RAG coach + safeguarding** is the defensible core: it reaches the most constrained users and proves the model. The app is an accelerator, not the mission.

What I would **not** drop even at half budget: the RAG grounding, the content-approval workflow, safeguarding/referral, consent, and the evaluation release gate. Cutting any of those changes the system from "constrained and safe" to "a liability."

## Success criteria for the pilot (exit test)

The pilot has succeeded if, over its run: the release gate (≥95% accuracy, zero unsafe answers) was met before launch and held; every crisis disclosure in evaluation surfaced referral info; no adolescent identity was ever stored; and a measurable, disaggregated knowledge/confidence gain is demonstrable to the funder. See `docs/delivery/monitoring-and-me.md`.
