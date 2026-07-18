"""Output PII scrub — the backstop on generated text.

Prompts never contain PII in the first place (ADR-0004); this scans what the
LLM actually produced, since generation can echo user input back. Patterns
mirror backend/src/lib/redact.ts's phone-number handling so both services
apply the same masking behaviour (NFR-10/11/15).
"""

from __future__ import annotations

import re

_PHONE = re.compile(r"\+?\d[\d\s-]{6,}\d")
_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")


def scrub_pii(text: str) -> str:
    """Replace obvious phone numbers and email addresses with placeholders."""
    text = _PHONE.sub("[redacted-phone]", text)
    text = _EMAIL.sub("[redacted-email]", text)
    return text


def contains_pii(text: str) -> bool:
    """True if the text still has an unredacted phone number or email."""
    return bool(_PHONE.search(text) or _EMAIL.search(text))
