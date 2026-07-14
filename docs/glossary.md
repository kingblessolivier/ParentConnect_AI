# Glossary

Kinyarwanda, domain, and technical terms, defined once.

## Domain & Rwandan context

| Term | Definition |
|---|---|
| **Adolescent** | A person aged 10–19 (WHO definition). The indirect beneficiary; never a required identity in the system. |
| **CHW (Community Health Worker)** | *Umujyanama w'ubuzima.* Village-level volunteer health worker in Rwanda's community health programme; facilitates sessions, registers parents, escalates cases. |
| **Parent Champion** | A trained peer-volunteer parent who leads community parenting sessions. |
| **Isange One Stop Centre** | Rwandan government one-stop centres providing medical, psychosocial, legal, and police services to survivors of gender-based violence and child abuse. Primary safeguarding referral. `[VERIFY]` current facility directory. |
| **RBC** | Rwanda Biomedical Centre — national health implementation body. Candidate clinical authority. `[VERIFY]` role & agreement. |
| **MoH** | Ministry of Health (Rwanda). |
| **NCDA** | National Child Development Agency — child-protection mandate in Rwanda. `[VERIFY]` role. |
| **DHIS2** | District Health Information Software 2 — the health management information system used for MoH reporting; aggregate indicators export here. |
| **Umuganda** | Monthly community work day; a channel for community mobilisation. (Also the name of *Digital Umuganda*, an NLP org — see below.) |
| **SRH** | Sexual and Reproductive Health. |
| **Sector / District / Cell / Village** | Rwanda's administrative hierarchy (District → Sector → Cell → Village). Profiles capture District/Sector only. |

## Language & NLP

| Term | Definition |
|---|---|
| **Kinyarwanda** | Bantu language, official language of Rwanda; **agglutinative** (words built from many morphemes), low-resource in NLP terms. |
| **Agglutinative** | A language where words are formed by stringing together morphemes, each carrying distinct meaning — inflates vocabulary and defeats naive sub-word tokenizers. |
| **Code-switching** | Mixing languages within one utterance (e.g. Kinyarwanda + English), common in informal parent input. |
| **Digital Umuganda** | Rwandan company building open Kinyarwanda language datasets and models. Potential partner/asset. `[VERIFY]` capabilities & terms. |
| **Mbaza NLP** | Kinyarwanda NLP initiative/assistant. Potential asset. `[VERIFY]`. |
| **Common Voice (Kinyarwanda)** | Mozilla's open speech dataset; one of the largest for Kinyarwanda — relevant to IVR/ASR. `[VERIFY]` size & licence. |

## AI / technical

| Term | Definition |
|---|---|
| **RAG (Retrieval-Augmented Generation)** | Generation grounded on documents retrieved from a curated corpus at query time; the model cites sources rather than answering from memory. |
| **Embedding** | A vector representation of text used for semantic search. |
| **Vector store** | Database indexing embeddings for nearest-neighbour retrieval. |
| **Reranking** | A second-stage model that re-scores retrieved candidates for relevance before prompt assembly. |
| **recall@k / MRR** | Retrieval metrics: did the right chunk appear in the top *k*; mean reciprocal rank of the first relevant chunk. |
| **Guardrail** | A pre- or post-generation check enforcing safety/refusal policy. |
| **Release gate** | A defined quality bar (see `docs/ai/evaluation-framework.md`) that must be met before real users are exposed. |

## Channels

| Term | Definition |
|---|---|
| **USSD** | Session-based menu protocol (`*123#`) working on any GSM phone; no data or app needed; ~180s sessions, short pages. |
| **IVR** | Interactive Voice Response — a toll-free phone line navigated by voice/keypad; serves low-literacy and no-smartphone users. |
| **Short code** | A 3–6 digit number for SMS/USSD, arranged with telecom operators/aggregators. |
| **Aggregator** | An intermediary (e.g. Africa's Talking) abstracting SMS/USSD/voice across operators. `[VERIFY]` chosen provider. |

## Compliance

| Term | Definition |
|---|---|
| **Law No. 058/2021** | Rwanda's law on the protection of personal data and privacy. Governs this system. |
| **DPIA** | Data Protection Impact Assessment. |
| **DPO** | Data Protection Officer. |
| **Data minimisation** | Collect and retain only the personal data strictly necessary for the stated purpose. |
| **Supervisory authority** | The Rwandan National Cyber Security Authority (NCSA) data-protection office with which processors register. `[VERIFY]` current designation. |
