# Cost Model

Unit economics per active parent per year — SMS, IVR minutes, AI inference, hosting — at **pilot** and at **100k users**. This determines whether the project survives past the grant (NFR-35). 

> **All figures are illustrative placeholders `[VERIFY]`** — a *model* to be filled with real quotes (telecom short-code/SMS/IVR rates from MTN/Airtel or the aggregator; LLM pricing; in-region hosting quotes). The value here is the **structure and the levers**, not the numbers.

## Cost drivers

| Driver | Scales with | Lever to control it |
|---|---|---|
| **SMS** | Messages/user (nudges + Q&A turns) | Batch nudges; concise answers; reverse-billing deal (Q5) |
| **IVR minutes** (post-MVP) | Call minutes/user | Pre-recorded audio; menu efficiency; deferred in MVP |
| **AI inference** | Coach turns × tokens/turn | Tight chunks + rerank (fewer context tokens); cache common answers; self-host at scale (ADR-0004) |
| **Hosting** | Baseline + load | Managed, right-sized in-region; scale with users |
| **SMS OTP** | Registrations + logins | OTP only when needed; longer sessions |
| **Human review (HITL)** | Conversation volume | Sampling rate, not 100% (NFR-23) |
| **Content & audio production** | One-time + updates | Reuse MoH/RBC materials (Q3) |

## Per-active-parent-per-year model (structure)

```
annual_cost_per_parent ≈
    sms_msgs_per_year        × price_per_sms
  + ivr_minutes_per_year     × price_per_ivr_min          (post-MVP; 0 in pilot)
  + coach_turns_per_year     × avg_tokens_per_turn × price_per_token   (Option A)
      (or amortised_gpu_cost / active_parents             for Option B)
  + hosting_cost_per_year    / active_parents
  + otp_msgs_per_year        × price_per_sms
  + hitl_cost_per_year       / active_parents
```

## Illustrative scenarios `[VERIFY all numbers]`

Assumptions (placeholders, to replace): 24 nudges/yr; 12 coach turns/yr; ~1.5k tokens/turn; SMS ≈ X RWF; token price ≈ Y; hosting baseline ≈ Z.

| Line | Pilot (~2,000 users) | Scale (100,000 users) |
|---|---|---|
| SMS (nudges + Q&A + OTP) | `[VERIFY]` | `[VERIFY]` — likely the largest variable cost |
| AI inference | `[VERIFY]` — Option A pay-per-use | `[VERIFY]` — Option B (self-host) may undercut A here |
| Hosting | `[VERIFY]` — baseline dominates at low volume | `[VERIFY]` — amortised across users |
| IVR | 0 (deferred) | `[VERIFY]` if enabled |
| HITL review | Higher per-user (heavy pilot review) | Lower per-user (sampling) |
| **≈ cost / active parent / year** | **higher** (fixed costs spread thin) | **lower** (economies of scale) |

**Shape of the curve:** per-user cost is **high at pilot** (fixed hosting + heavy human review spread over few users) and **falls at scale**. The two biggest scale levers are **SMS economics** (a reverse-billing/short-code deal, Q5) and the **AI inference model** (the Option A→B crossover, `model-selection.md`).

## Sustainability envelope (NFR-35)

- The funder/programme agrees a **maximum sustainable cost per active parent per year** `[VERIFY: envelope]`. The model is tracked against it monthly; actuals vs projection reviewed at each phase gate.
- **Trip-wire:** if projected per-user cost breaches the envelope at target scale, act on the biggest lever (SMS deal, self-host inference, reduce token/context size) before scaling further.

## Cost-control commitments already in the design

- **RAG context minimisation** (tight chunks + rerank) reduces tokens *and* improves quality (`ai-architecture.md`).
- **Cache common answers**; pre-generate frequent SMS replies.
- **Degradation** avoids paying for the LLM when it adds no value (referral/content paths).
- **Deferred IVR** removes the most expensive channel from pilot economics.
- **Gateway abstraction** lets us chase the cheapest compliant SMS/IVR route without a rewrite (ADR-0006).

## What to get real numbers for (before scaling)

1. Aggregator/operator SMS, USSD, IVR, and short-code rates (Q5, V7).
2. LLM price-per-token (Option A) and in-region GPU cost (Option B).
3. In-region hosting quotes (ADR-0009).
4. Realistic usage: nudges, coach turns, OTPs per active parent (from the pilot).
5. HITL reviewer time per 1,000 conversations.
