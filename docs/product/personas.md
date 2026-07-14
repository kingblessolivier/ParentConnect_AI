# Personas

Personas emphasise **constraints**, not just goals — constraints are what this system lives or dies by. Names are illustrative; no real individuals.

---

## P1 — Mukamana, the no-smartphone rural caregiver *(primary design target)*

- **Who:** 44, mother/guardian of a 14-year-old, rural sector. Subsistence farming.
- **Device/connectivity:** A basic phone she shares with her husband; sometimes borrows a neighbour's. Patchy 2G. Airtime is rationed.
- **Literacy/language:** Reads Kinyarwanda slowly; more comfortable listening than reading. No English/French.
- **Goal:** Know what to say when her daughter asks about her body — without shame, and without "putting ideas in her head."
- **Constraints that drive design:**
  - Cannot install or afford an app; **IVR and SMS are her only channels.** Cost to *her* must be zero (toll-free IVR, NFR-29).
  - Shared phone → **no assumption of a private device**; conversation history must be protectable/erasable; sensitive content must not be casually visible.
  - Interrupted sessions (airtime runs out, someone needs the phone) → flows must be **resumable and short**.
  - Low literacy → **audio is mandatory** (NFR-26), not a nice-to-have.
- **Failure for her = failure of the mission.** If the product only works well on a smartphone, it has missed its point.

---

## P2 — Jean-Bosco, the smartphone-owning peri-urban father

- **Who:** 38, father of a 16-year-old, small trader in a district town.
- **Device/connectivity:** Entry-level Android (2 GB RAM, Android 9), prepaid data he watches carefully. Wi-Fi occasionally.
- **Literacy/language:** Comfortable in Kinyarwanda and some English; reads fine.
- **Goal:** Practise a conversation about relationships and consent before he has it; wants to not sound preachy.
- **Constraints:**
  - Data cost-sensitive → app must be **<25 MB, <2 MB/session** (NFR-28), and offline content pack matters.
  - Wants **role-play/practice mode** (FR-12) — but this is deferred in MVP; he gets conversation starters (FR-11) instead.
  - Privacy from his own family on a shared-ish device; expects the AI to be clearly labelled as AI (D4).

---

## P3 — Claudine, the Community Health Worker (CHW)

- **Who:** 35, *umujyanama w'ubuzima*, covers several villages.
- **Device/connectivity:** Mid-range Android, mobile data reimbursed sometimes; frequently offline in the field.
- **Goal:** Register parents who can't self-register, run community sessions, and escalate the hard cases she encounters.
- **Constraints:**
  - **Assisted onboarding** (FR-03): she registers parents on their behalf, which raises a consent-capture challenge in Kinyarwanda for possibly low-literacy parents (D4).
  - **Offline-first** (FR-27, NFR-07): records attendance and outcomes with no signal; syncs later; must survive conflicts.
  - She is **not a clinician** — when a parent discloses abuse, she needs an unambiguous referral path and an SLA, not a judgement call (D2).
  - Time-poor and unpaid/underpaid → tools must be fast (core tasks ≤3 taps, NFR-25) or she won't use them.

---

## P4 — Emmanuel, the Parent Champion

- **Who:** 50, respected parent volunteer, trained to lead peer sessions.
- **Device/connectivity:** Basic-to-mid phone; variable.
- **Goal:** Facilitate parenting sessions with good materials; feel credible answering tough questions.
- **Constraints:**
  - Needs **session guides, discussion prompts, printable materials** (FR-26), some usable offline/printed.
  - May himself hold cultural discomfort with SRH topics → materials must model the language, and the AI coach is his backstop.
  - Trust and reputation are his currency → an unsafe or culturally clumsy answer damages *him* locally (NFR-24 cultural review).

---

## P5 — Dr. Uwase, the Content Reviewer / Clinician

- **Who:** Clinician responsible for approving all SRH content.
- **Goal:** Ensure nothing inaccurate or unsafe reaches a parent; be able to audit any AI answer.
- **Constraints:**
  - Needs a **workflow** (draft → clinical review → cultural review → approval → publish → version → retire, FR-20/C3) and the authority to block.
  - Needs **traceability**: every AI response linked to the approved source it used (FR-15, NFR-22).
  - Time-limited → review tooling must batch and prioritise; the weekly human-in-the-loop sample (NFR-23) must be efficient.

---

## P6 — Habimana, the Child Protection Officer

- **Who:** District-level officer receiving safeguarding referrals.
- **Goal:** Receive confidential referrals with enough context to act, and record outcomes.
- **Constraints:**
  - Needs **status tracking** (raised → acknowledged → actioned → closed, FR-23) and an **escalation SLA** (D2).
  - Must see **only** what least-privilege allows — never individual SRH conversation content (NFR-10).
  - Works within existing national child-protection structures (Isange, NCDA `[VERIFY]`), which the system must route to, not replace.

---

## P7 — Grace, the Programme Administrator

- **Who:** Runs content, users, campaigns, and reporting for the programme.
- **Goal:** Configure the system for a district and report to the funder/MoH **without a code deployment** (FR-33, NFR-36).
- **Constraints:**
  - Non-technical → needs a usable CMS (NFR-34) and admin console.
  - Accountable for indicators disaggregated by district/sector/urban-rural/gender/channel (FR-31) and DHIS2/CSV export (FR-32) — deferred export in MVP but schema must anticipate it.

---

## Persona → channel matrix

| Persona | App | SMS | USSD | IVR | Community session |
|---|:--:|:--:|:--:|:--:|:--:|
| P1 Mukamana | – | ○ | ○ | ● | ● |
| P2 Jean-Bosco | ● | ○ | – | – | ○ |
| P3 CHW | ● (assisted) | ○ | ○ | – | ● (facilitator) |
| P4 Champion | ○ | ● | ○ | ○ | ● (facilitator) |
| P5 Clinician | ● (review console) | – | – | – | – |
| P6 CPO | ● (referral console) | ○ | – | – | – |
| P7 Admin | ● (admin console) | – | – | – | – |

● primary · ○ secondary · – n/a. (USSD/IVR availability subject to telecom arrangement, Q5.)
