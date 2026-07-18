"""Prompt-injection lexical scan (docs/ai/safety-and-guardrails.md).

A heuristic backstop on user input and retrieved chunks for common
instruction-override phrasing. This does not decide anything by itself — a
hit means "handle conservatively" (route through the grounding gate /
refusal path rather than trusting the turn as pure content), same posture as
the crisis detector: high recall over precision, because the cost of a missed
injection is higher than an occasional false positive.
"""

from __future__ import annotations

import re

_PATTERNS: tuple[re.Pattern[str], ...] = (
    re.compile(r"ignore (all |any )?(the )?(previous|prior|above) instructions", re.IGNORECASE),
    re.compile(r"disregard (the |your )?(system|previous) prompt", re.IGNORECASE),
    re.compile(r"you are now", re.IGNORECASE),
    re.compile(r"reveal (your|the) (system prompt|instructions)", re.IGNORECASE),
    re.compile(r"forget (all |your )?(previous )?instructions", re.IGNORECASE),
)


def scan_for_injection(text: str) -> list[str]:
    """Return the pattern strings that matched (empty == nothing flagged)."""
    return [pattern.pattern for pattern in _PATTERNS if pattern.search(text)]


def looks_like_injection(text: str) -> bool:
    return bool(scan_for_injection(text))
