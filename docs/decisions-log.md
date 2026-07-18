# Decisions Log

A running log of open questions, assumptions taken, and how they were resolved. Newest first. Every `[ASSUMPTION]` and material `[VERIFY]` in the docs should have a row here.

## Legend

- **Status:** `OPEN` (needs a stakeholder answer) · `ASSUMED` (proceeding on a stated assumption) · `RESOLVED` (answered) · `VERIFY` (fact needs a primary source).

## Blocking questions (asked at kickoff, proceeding on assumptions per instruction)

| # | Question | Status | Working assumption / resolution | Owner |
|---|---|---|---|---|
| Q1 | Hosting jurisdiction & provider (NFR-18) | ASSUMED | Personal data hosted in-region: primary on a Rwanda-based provider or an African cloud region approved under Law 058/2021; design keeps the data tier portable. See ADR-0009. | Sponsor / DPO |
| Q2 | May (anonymised) query text go to an offshore commercial LLM API? | ASSUMED | **No PII to offshore APIs.** MVP recommends a commercial API for generation with strict input minimisation and a documented migration path to an in-region self-hosted model; final call pending legal. See ADR-0004, `docs/ai/model-selection.md`. | DPO / Legal |
| Q3 | Does the clinician-approved knowledge base exist yet? | ASSUMED | Assume it does **not** exist in RAG-ready form. Phase 0 = author + clinically review the corpus (likely adapting MoH/RBC/Imbuto materials `[VERIFY]`). | Programme / Clinical |
| Q4 | Named clinical reviewer / sign-off authority | OPEN | Required before any content or AI release gate is real. Candidate: RBC or partner NGO clinical lead `[VERIFY]`. | Programme |
| Q5 | Telecom partner & short-code / IVR arrangement | OPEN | Assume unsecured at pilot; abstract behind a gateway; USSD/IVR may slip if not arranged. Aggregator candidate: Africa's Talking `[VERIFY]`. | Programme / Partnerships |
| Q6 | Scale & timeline | ASSUMED | Pilot = low thousands of users, 2–4 districts, ~6–12 months. 500k is design-for, not build-for. | Sponsor |
| Q7 | Budget envelope & team | ASSUMED | Grant-funded; small team (single-digit engineers); no dedicated SRE → managed services over self-hosted infra. | Sponsor |
| Q8 | Funder & reporting requirements | OPEN | Drives M&E indicators & DHIS2 cadence. | Sponsor |
| Q9 | Pilot districts | ASSUMED | 1 urban (Kigali sector) + 1 rural district, TBD. | Programme |
| Q10 | Adolescent direct access in MVP | ASSUMED | **No** direct minor accounts in MVP (parents/caregivers only) — materially lighter DPIA. | Sponsor / DPO |
| Q11 | French scope | ASSUMED | French **deferred** post-pilot; localisation layer built to accept it (NFR-30). Pilot = Kinyarwanda + English. | Programme |

## Technology stack decisions (sponsor)

| # | Decision | Status | Resolution | ADR |
|---|---|---|---|---|
| Q-tech-1 | Backend framework | RESOLVED | **Node.js + TypeScript** (supersedes Python/FastAPI). AI/RAG service **stays Python** as a separate service. | ADR-0014 (supersedes 0001) |
| Q-tech-2 | Mobile framework | RESOLVED | **Flutter**. ⚠️ NFR-28 (<25 MB APK) is tight for Flutter — validate release-build size early; revise NFR-28 or revisit if unreachable. | ADR-0015 (supersedes 0013) |
| Q-tech-3 | Web frontend (staff consoles) | RESOLVED | **Next.js + React + TypeScript**. | ADR-0016 |
| Q-tech-4 | AI/RAG service language | RESOLVED | **Python**, kept as a separate service behind an internal API (best RAG/embedding/eval tooling; the Kinyarwanda-retrieval risk makes this the safer call). | ADR-0014 |

## Facts to verify (primary source needed)

| # | Claim | Status | Where used |
|---|---|---|---|
| V1 | Nearest "approved" cloud region under Law 058/2021 (e.g. AWS `af-south-1` Cape Town) | VERIFY | ADR-0009, DPIA |
| V2 | Isange One Stop Centre directory & child-helpline number(s) | VERIFY | `child-safeguarding-policy.md` |
| V3 | RBC / NCDA / MoH roles and any partnership agreements | VERIFY | glossary, DPIA, KB spec |
| V4 | Digital Umuganda / Mbaza NLP / Common Voice Kinyarwanda assets, sizes, licences | **PARTIALLY VERIFIED** (2026-07-18, web research) — public dataset/model facts confirmed with sources; direct collaboration/partnership terms still open. See findings below. | `kinyarwanda-strategy.md` |
| V5 | Supervisory authority registration process & fees | VERIFY | DPIA |
| V6 | Teenage-pregnancy prevalence statistics for Rwanda | VERIFY | `vision.md` |
| V7 | Telecom short-code costs & USSD/IVR technical limits (MTN, Airtel) | VERIFY | `cost-model.md`, `channel-design.md` |
| V8 | KinyaBERT / KinyaColBERT / DeepKIN toolkit — existence, licence, infra requirements | **VERIFIED** (2026-07-18, web research) — MIT-licensed code at [github.com/anzeyimana/DeepKIN](https://github.com/anzeyimana/DeepKIN); morphological analyser requires a separate free academic licence `[VERIFY: licence terms for our use case]`; toolkit expects a CUDA GPU (12GB+ VRAM). Not previously tracked here — newly discovered while researching V4. | `kinyarwanda-strategy.md` |

### V4/V8 findings detail (2026-07-18 web research)

- **Digital Umuganda**: publicly confirmed 2,260-hour validated Kinyarwanda speech corpus (CC0, via Common Voice) and a 170k-sentence English↔Kinyarwanda parallel corpus (Rwandan Gazette), both open-sourced. Collaboration/support terms beyond the public data still need a direct conversation.
- **Mbaza NLP**: publicly confirmed 1.07M-download Kinyarwanda monolingual text corpus plus translation/ASR/TTS models. **No embedding or semantic-search model published** — not a drop-in for the retrieval spike.
- **Common Voice (Kinyarwanda)**: independently confirmed at 2,260 validated hours, CC0 licence.
- **KinyaBERT/KinyaColBERT (DeepKIN)**: a Kinyarwanda-specific, morphology-aware retrieval model exists and reportedly beats general multilingual embeddings on Kinyarwanda retrieval — a stronger candidate than assumed when this doc was first written, though it carries a separate academic-licence dependency and GPU infra cost.
- None of the above confirms an actual working relationship with these organisations — that remains open and is a Programme/Partnerships action, not something web research resolves.

## Change history

| Date | Change |
|---|---|
| 2026-07-18 | Web research on Kinyarwanda embedding/NLP options (V4 partially verified, V8 added): confirmed public assets from Digital Umuganda, Mbaza NLP, and Common Voice, and discovered KinyaBERT/KinyaColBERT (DeepKIN) as an existing Kinyarwanda-specific retrieval model. Updated `kinyarwanda-strategy.md`'s embedding-model and partner tables with sourced citations. Partnership/licensing conversations remain open. |
| 2026-07-14 | Initial documentation baseline created; kickoff blocking questions logged; proceeding on stated assumptions per sponsor instruction. |
| 2026-07-14 | Tech stack changed by sponsor: Node.js backend, Flutter mobile, Next.js/React web; AI/RAG service stays Python. ADR-0001 & 0013 superseded by ADR-0014/0015/0016. Flutter APK-size risk (NFR-28) flagged. |
