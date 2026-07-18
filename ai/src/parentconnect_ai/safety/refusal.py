"""Refusal-policy detection (NFR-21).

The coach must refuse and refer to a health professional for diagnosis
requests, prescribing/dosing requests, and termination-of-pregnancy advice
(docs/ai/safety-and-guardrails.md). This module flags *which* of those a turn
touches — on the user's question (pre-generation, so the coach never even
attempts an answer) or on generated output (post-generation backstop, in case
a refusal slipped through). It does not decide the refusal wording: refusals
must be "warm and useful, never curt" (safety-and-guardrails.md), which is a
prompt/response-template concern, not this detector's job. Termination
specifically requires **non-directive support + referral**, not a bare
refusal — this module only flags the topic; the response behaviour is
composed on top.

IMPORTANT — like safety/crisis.py, DEFAULT_PATTERNS is a minimal, English-only,
illustrative seed. Refusal correctness targets 100% on the dedicated
EV-refusal-set (docs/ai/evaluation-framework.md); real patterns and, above
all, the actual refusal wording must be authored/reviewed by clinical +
policy leads before this is relied on.
"""

from __future__ import annotations

import re
from collections.abc import Mapping, Sequence
from enum import Enum


class RefusalReason(str, Enum):
    """Why a turn must be refused, per the refusal policy."""

    DIAGNOSIS = "diagnosis"
    PRESCRIPTION = "prescription"
    TERMINATION_ADVICE = "termination_advice"


#: Placeholder-only patterns. See the module docstring: not clinically or
#: policy validated, English-only. Real patterns replace this seed.
DEFAULT_PATTERNS: Mapping[RefusalReason, tuple[str, ...]] = {
    RefusalReason.DIAGNOSIS: (
        r"\bdo i have\b",
        r"\bis this an? (?:std|sti|infection)\b",
        r"\bwhat (?:disease|infection) does .* have\b",
    ),
    RefusalReason.PRESCRIPTION: (
        r"\bhow (?:much|many) (?:mg|milligrams|pills?)\b",
        r"\bwhat dosage\b",
        r"\bwhich (?:medicine|drug|pills?) should\b",
    ),
    RefusalReason.TERMINATION_ADVICE: (
        r"\babortion\b",
        r"\bterminate (?:the|my|her) pregnancy\b",
        r"\bend (?:the|my|her) pregnancy\b",
    ),
}


def _compile(
    patterns: Mapping[RefusalReason, Sequence[str]],
) -> dict[RefusalReason, list[re.Pattern[str]]]:
    return {
        reason: [re.compile(phrase, re.IGNORECASE) for phrase in phrases]
        for reason, phrases in patterns.items()
    }


_DEFAULT_COMPILED = _compile(DEFAULT_PATTERNS)


def detect_refusal_reasons(
    text: str,
    patterns: Mapping[RefusalReason, Sequence[str]] | None = None,
) -> list[RefusalReason]:
    """Return every refusal reason whose patterns match ``text``."""
    compiled = _DEFAULT_COMPILED if patterns is None else _compile(patterns)
    return [
        reason
        for reason, regexes in compiled.items()
        if any(regex.search(text) for regex in regexes)
    ]


def requires_refusal(
    text: str,
    patterns: Mapping[RefusalReason, Sequence[str]] | None = None,
) -> bool:
    return bool(detect_refusal_reasons(text, patterns))
