"""Eval-set authoring format — load & validate the Kinyarwanda evaluation set.

The evaluation set is authored by clinical + cultural reviewers as human-friendly
YAML (JSON also accepted) and loaded into the typed ``EvalCase`` model
(dataset.py) for the retrieval spike (spike.py) and the release gate (gate.py).
This module is the file <-> model boundary: parse, build typed cases with clear
errors, and validate against the dataset rules.

File shape (see ai/eval_sets/sample.yaml):

    version: 0.1
    description: "..."
    cases:
      - case_id: acc-001
        question: "..."
        language: rw            # rw | en | fr
        category: accuracy      # accuracy | crisis | refusal | out_of_scope | adversarial
        expected_source_ids: [kb-...]   # required for 'accuracy'
        reference_answer: "..."          # required for 'accuracy'
        held_out: false
        tags: [puberty]

A bare top-level list of cases (no ``version``/``cases`` wrapper) is also accepted.
"""

from __future__ import annotations

import json
from pathlib import Path

from ..kb.schema import Language
from .dataset import EvalCase, EvalCategory, validate_dataset


class EvalSetFormatError(ValueError):
    """Raised when an eval-set file is structurally invalid (not a content issue)."""


_REQUIRED_FIELDS = ("case_id", "question", "language", "category")


def case_from_dict(record: object, *, index: int | None = None) -> EvalCase:
    """Build a typed ``EvalCase`` from a plain mapping, with located errors."""
    where = f"case[{index}]" if index is not None else "case"
    if not isinstance(record, dict):
        raise EvalSetFormatError(f"{where}: expected a mapping, got {type(record).__name__}")

    missing = [field for field in _REQUIRED_FIELDS if field not in record]
    if missing:
        raise EvalSetFormatError(f"{where}: missing required field(s): {', '.join(missing)}")

    try:
        language = Language(record["language"])
    except ValueError:
        valid = [lang.value for lang in Language]
        raise EvalSetFormatError(
            f"{where}: invalid language {record['language']!r}; expected one of {valid}"
        ) from None
    try:
        category = EvalCategory(record["category"])
    except ValueError:
        valid = [cat.value for cat in EvalCategory]
        raise EvalSetFormatError(
            f"{where}: invalid category {record['category']!r}; expected one of {valid}"
        ) from None

    return EvalCase(
        case_id=str(record["case_id"]),
        question=str(record["question"]),
        language=language,
        category=category,
        expected_source_ids=tuple(record.get("expected_source_ids") or ()),
        reference_answer=record.get("reference_answer"),
        held_out=bool(record.get("held_out", False)),
        tags=tuple(record.get("tags") or ()),
    )


def case_to_dict(case: EvalCase) -> dict:
    """Serialise a case back to a plain mapping (round-trips with case_from_dict)."""
    record: dict = {
        "case_id": case.case_id,
        "question": case.question,
        "language": case.language.value,
        "category": case.category.value,
    }
    if case.expected_source_ids:
        record["expected_source_ids"] = list(case.expected_source_ids)
    if case.reference_answer is not None:
        record["reference_answer"] = case.reference_answer
    if case.held_out:
        record["held_out"] = True
    if case.tags:
        record["tags"] = list(case.tags)
    return record


def _cases_from_data(data: object) -> list[EvalCase]:
    if isinstance(data, dict):
        records = data.get("cases")
        if records is None:
            raise EvalSetFormatError("top-level mapping must contain a 'cases' list")
    elif isinstance(data, list):
        records = data
    else:
        raise EvalSetFormatError(
            "eval set must be a list of cases or a mapping with a 'cases' list"
        )
    if not isinstance(records, list):
        raise EvalSetFormatError("'cases' must be a list")
    return [case_from_dict(record, index=i) for i, record in enumerate(records)]


def loads(text: str, *, fmt: str = "yaml") -> list[EvalCase]:
    """Parse eval cases from a YAML or JSON string."""
    if fmt in ("yaml", "yml"):
        import yaml  # dependency declared in pyproject

        data = yaml.safe_load(text)
    elif fmt == "json":
        data = json.loads(text)
    else:
        raise EvalSetFormatError(f"unsupported format {fmt!r}; expected 'yaml' or 'json'")
    if data is None:
        raise EvalSetFormatError("empty eval set")
    return _cases_from_data(data)


def load_cases(path: str | Path) -> list[EvalCase]:
    """Load eval cases from a .yaml/.yml/.json file (format inferred from suffix)."""
    p = Path(path)
    fmt = p.suffix.lower().lstrip(".")
    if fmt == "yml":
        fmt = "yaml"
    if fmt not in ("yaml", "json"):
        raise EvalSetFormatError(f"unsupported file type {p.suffix!r}; use .yaml, .yml, or .json")
    return loads(p.read_text(encoding="utf-8"), fmt=fmt)


def load_and_validate(
    path: str | Path, *, strict: bool = True
) -> tuple[list[EvalCase], dict[str, list[str]]]:
    """Load and run dataset validation.

    Returns ``(cases, issues)`` where ``issues`` maps case_id -> problems. In
    ``strict`` mode (default) any content issue raises, so a malformed eval set
    can't silently feed the spike or the release gate.
    """
    cases = load_cases(path)
    issues = validate_dataset(cases)
    if strict and issues:
        raise EvalSetFormatError(f"eval set has {len(issues)} invalid case(s): {issues}")
    return cases, issues
