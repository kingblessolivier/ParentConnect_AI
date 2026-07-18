"""Crisis / disclosure detection — pre-generation safety (FR-13, FR-21).

Detects disclosures of abuse, exploitation, suicidal ideation, or an existing
pregnancy so the coach can surface referral information immediately, without
needing retrieval or the LLM (docs/ai/safety-and-guardrails.md L1; NFR-06 —
safeguarding does not depend on the AI being healthy).

Tuned for **high recall**: a missed disclosure is the gravest failure this
system can have, and an occasional false positive is an acceptable cost as
long as the response never accuses or alarms (safety-and-guardrails.md:
"detection classifies risk to offer help; it never diagnoses, accuses").

IMPORTANT — the default patterns below are a minimal, illustrative SEED only.
They are English-only, NOT clinically or culturally validated, and MUST NOT
be relied on in any real deployment. Real crisis-detection patterns —
especially Kinyarwanda phrasing and culturally-appropriate euphemisms —
must be authored with the safeguarding lead and cultural advisory panel
(docs/compliance/child-safeguarding-policy.md, NFR-24) and validated against
the held-out EV-crisis-set (docs/ai/evaluation-framework.md; crisis recall
target ≥99%) before this gate is trusted with a real parent's message.
"""

from __future__ import annotations

import re
from collections.abc import Mapping, Sequence
from enum import Enum


class CrisisCategory(str, Enum):
    """Disclosure categories per child-safeguarding-policy.md."""

    ABUSE = "abuse"
    EXPLOITATION = "exploitation"
    SUICIDAL_IDEATION = "suicidal_ideation"
    PREGNANCY = "pregnancy"


#: Placeholder-only patterns. See the module docstring: not clinically or
#: culturally validated, English-only. Real patterns replace this seed.
DEFAULT_PATTERNS: Mapping[CrisisCategory, tuple[str, ...]] = {
    CrisisCategory.ABUSE: (
        r"\bhurting me\b",
        r"\btouch(?:ed|ing) me\b",
        r"\bhit(?:s|ting)? me\b",
    ),
    CrisisCategory.EXPLOITATION: (
        r"\bmoney for sex\b",
        r"\bmaking me (?:do|have) .* for money\b",
    ),
    CrisisCategory.SUICIDAL_IDEATION: (
        r"\bwants? to die\b",
        r"\bkill(?:ing)? (?:myself|herself|himself)\b",
        r"\bend (?:my|her|his) life\b",
    ),
    CrisisCategory.PREGNANCY: (
        r"\bmy daughter is pregnant\b",
        r"\bshe(?:'s| is) pregnant\b",
    ),
}


def _compile(
    patterns: Mapping[CrisisCategory, Sequence[str]],
) -> dict[CrisisCategory, list[re.Pattern[str]]]:
    return {
        category: [re.compile(phrase, re.IGNORECASE) for phrase in phrases]
        for category, phrases in patterns.items()
    }


_DEFAULT_COMPILED = _compile(DEFAULT_PATTERNS)


def detect_crisis(
    text: str,
    patterns: Mapping[CrisisCategory, Sequence[str]] | None = None,
) -> list[CrisisCategory]:
    """Return every crisis category whose patterns match ``text``.

    Order is not significant. Any match should route straight to the
    referral pathway (safety-and-guardrails.md L1) — the caller does not need
    to pick "the" category, since a single disclosure can span more than one.
    """
    compiled = _DEFAULT_COMPILED if patterns is None else _compile(patterns)
    return [
        category
        for category, regexes in compiled.items()
        if any(regex.search(text) for regex in regexes)
    ]


def is_crisis(
    text: str,
    patterns: Mapping[CrisisCategory, Sequence[str]] | None = None,
) -> bool:
    return bool(detect_crisis(text, patterns))
