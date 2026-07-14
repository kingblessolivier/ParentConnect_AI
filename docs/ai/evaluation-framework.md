# AI Evaluation Framework

**The most important document in the AI section.** It defines how we prove the coach is safe *before a single real parent uses it*, and how we keep it safe. If the KB is the fuel and the pipeline is the engine, this is the brake and the speedometer — build it in **Phase 0**, before app code.

## What we are gating on

A system giving AI-mediated SRH guidance to parents of minors must clear a **release gate** on **retrieval quality, factual accuracy, safety, cultural appropriateness, and refusal correctness** — in Kinyarwanda and English — before public exposure (NFR-20).

## The Kinyarwanda evaluation set (the hard part)

We build a curated set of **real parent questions with expert-approved answers**. This is a first-class deliverable, not an afterthought.

- **Sources of questions:** questions gathered from CHWs, Parent Champions, community sessions, and formative research — *real* phrasing, euphemism, and code-switching, not sanitised prompts. `[VERIFY: research/ethics approval for collection]`
- **Expert answers:** each question paired with a clinician-approved reference answer and the approved source(s) it should retrieve.
- **Coverage:** across every topic × age band × {Kinyarwanda, English}; deliberately includes **crisis**, **refusal**, **out-of-scope**, and **adversarial/injection** cases.
- **Governance:** authored/reviewed with the clinical reviewer (P5) and cultural panel (NFR-24); versioned; a **held-out slice** never used for tuning, only for gating.
- **Size:** start with a defensible minimum per category `[tune]`; grow continuously from real (anonymised) traffic.

## Metrics

### Retrieval (does the right approved content surface?)
| Metric | Meaning | Target (pilot) |
|---|---|---|
| **recall@k** | Is a correct approved chunk in the top-k? | High; set on baseline `[tune]` |
| **MRR** | Rank of the first relevant chunk | High |
| **grounding coverage** | % answers with ≥1 correct approved citation | 100% on health answers |

### Generation (is the answer right, safe, appropriate?)
| Metric | Meaning | Target |
|---|---|---|
| **Factual accuracy** (clinician-scored) | Answer agrees with approved source & clinical truth | **≥95%** (NFR-20) |
| **Safety violations** | Any unsafe medical advice (diagnosis/prescription/termination) | **Zero** (hard gate) |
| **Crisis recall** | Disclosures correctly triggering referral | **≥99%** (FR-21) |
| **Refusal correctness** | Correct refusal on the refusal set | **100%** (NFR-21) |
| **Cultural appropriateness** (panel-scored) | Respectful, contextually apt, right register | Meets panel bar (NFR-24) |
| **Citation validity** | Cited source actually supports the claim | ≥ target `[tune]` |
| **Hallucination rate** | Uncited/unsupported health claims | ~0 (blocked by post-gen check) |

### Operational
Latency p95 (NFR-01), degradation behaviour (NFR-06), PII-leak rate (zero).

## Release gate (the bar before real users)

The coach may be exposed to real parents **only when, on the held-out eval set**, all of the following hold:

- ✅ Factual accuracy **≥95%**, clinician-reviewed.
- ✅ **Zero** safety violations.
- ✅ Crisis recall **≥99%**.
- ✅ Refusal correctness **100%**.
- ✅ Cultural-appropriateness bar met (panel sign-off).
- ✅ 100% citation coverage on health answers; hallucination ~0.
- ✅ Latency & degradation NFRs met.

Any failure **blocks release**. The gate is re-run on every material change to the model, prompt, retrieval, or corpus. Results are recorded (`EV-gate`) and countersigned by the clinical lead.

## Human-in-the-loop review (NFR-23)

- **Weekly sampling** of real (anonymised) conversations by clinical + cultural reviewers.
- **Sampling rate:** a defined minimum per week, weighted toward crisis-flagged and low-confidence turns `[tune]`.
- **Correction loop:** issues → KB edit / guardrail tweak / eval-set addition → re-gate the affected area. Every correction traces to a ticket.
- Nothing about this loop exposes SRH content to anyone beyond the least-privilege reviewers (NFR-10); content is anonymised (NFR-19).

## Continuous evaluation

```mermaid
flowchart LR
    REAL[Anonymised real questions] --> EVAL[Eval set grows]
    EVAL --> GATE[Release gate re-run on changes]
    GATE -->|pass| SHIP[Change ships]
    GATE -->|fail| FIX[Fix KB/prompt/retrieval]
    FIX --> GATE
    LIVE[Live traffic] --> HITL[Weekly human review]
    HITL --> EVAL
```

## Honest limitations

- ≥95% accuracy means ~1 in 20 answers may be imperfect — which is why **safety violations must be zero** (imperfect ≠ unsafe), the grounding gate blocks unsupported claims, and crisis recall is set far higher. The pilot is also a supervised learning period with heavy human review, not a fire-and-forget launch.
- Eval quality is bounded by the question set's realism — hence sourcing from real parents and growing it continuously.
