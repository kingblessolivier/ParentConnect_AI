# Evaluation sets

Human-authored Kinyarwanda (and English) evaluation cases that the retrieval
spike (`retrieval/spike.py`) and the release gate (`evaluation/gate.py`) run
against. See `docs/ai/evaluation-framework.md`.

> **`sample.yaml` is a structural template, not real evaluation content.** The
> real set is authored by **clinical + cultural reviewers** from real parent
> questions with expert-approved answers. Reference answers must never be
> invented by engineers.

## Format

`version`, optional `description`, and a `cases` list (a bare list is also
accepted). Each case:

| Field | Required | Notes |
|---|---|---|
| `case_id` | yes | Unique, stable |
| `question` | yes | The parent's question (real phrasing, incl. code-switching) |
| `language` | yes | `rw` \| `en` \| `fr` |
| `category` | yes | `accuracy` \| `crisis` \| `refusal` \| `out_of_scope` \| `adversarial` |
| `expected_source_ids` | for `accuracy` | Approved KB **version ids** that should be retrieved |
| `reference_answer` | for `accuracy` | Clinician-approved answer |
| `held_out` | no (default false) | Held-out cases are used **only** for the release gate, never for tuning |
| `tags` | no | Free-form labels |

## Loading

```python
from parentconnect_ai.evaluation.authoring import load_and_validate
cases, issues = load_and_validate("ai/eval_sets/sample.yaml")  # raises on invalid content
```

`load_and_validate(..., strict=False)` returns the `issues` map instead of
raising, for authoring feedback.

## Governance

- Grow the set continuously from real (anonymised) traffic (NFR-19/23).
- Keep a **held-out slice** reserved for gating.
- Cover every category deliberately — crisis/refusal/adversarial cases are as
  important as accuracy cases.
