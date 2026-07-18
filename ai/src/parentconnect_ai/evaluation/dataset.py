"""Kinyarwanda evaluation-set schema and validation.

The eval set pairs real parent questions with expert-approved answers and the
approved sources that should be retrieved, across categories that deliberately
include crisis, refusal, out-of-scope, and adversarial cases
(docs/ai/evaluation-framework.md). A held-out slice is reserved for gating.
"""

from __future__ import annotations

from collections.abc import Iterable
from dataclasses import dataclass, field
from enum import Enum

from ..kb.schema import Language


class EvalCategory(str, Enum):
    ACCURACY = "accuracy"          # factual SRH/parenting answer expected
    CRISIS = "crisis"              # disclosure → must surface referral (FR-21)
    REFUSAL = "refusal"            # must refuse + refer (NFR-21)
    OUT_OF_SCOPE = "out_of_scope"  # must decline/redirect
    ADVERSARIAL = "adversarial"    # prompt-injection / jailbreak attempts


@dataclass(frozen=True)
class EvalCase:
    case_id: str
    question: str
    language: Language
    category: EvalCategory
    #: Approved source version-ids that SHOULD be retrieved (for accuracy cases).
    expected_source_ids: tuple[str, ...] = ()
    reference_answer: str | None = None
    #: Held-out cases are used ONLY for the release gate, never for tuning.
    held_out: bool = False
    tags: tuple[str, ...] = field(default_factory=tuple)


def validate_case(case: EvalCase) -> list[str]:
    """Return a list of problems with a case (empty == valid)."""
    problems: list[str] = []
    if not case.case_id.strip():
        problems.append("empty case_id")
    if not case.question.strip():
        problems.append("empty question")

    if case.category is EvalCategory.ACCURACY:
        if not case.expected_source_ids:
            problems.append("accuracy case needs expected_source_ids (grounding target)")
        if not case.reference_answer:
            problems.append("accuracy case needs a reference_answer")
    return problems


def validate_dataset(cases: Iterable[EvalCase]) -> dict[str, list[str]]:
    """Validate a dataset. Returns {case_id: [problems]} for invalid cases."""
    issues: dict[str, list[str]] = {}
    seen: set[str] = set()
    for case in cases:
        problems = validate_case(case)
        if case.case_id in seen:
            problems.append("duplicate case_id")
        seen.add(case.case_id)
        if problems:
            issues[case.case_id] = problems
    return issues


def has_holdout(cases: Iterable[EvalCase]) -> bool:
    """True iff at least one case is reserved for gating (held out)."""
    return any(case.held_out for case in cases)


def category_counts(cases: Iterable[EvalCase]) -> dict[EvalCategory, int]:
    counts: dict[EvalCategory, int] = {category: 0 for category in EvalCategory}
    for case in cases:
        counts[case.category] += 1
    return counts
