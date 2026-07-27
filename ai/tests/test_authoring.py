import json
from pathlib import Path

import pytest

from parentconnect_ai.evaluation.authoring import (
    EvalSetFormatError,
    case_from_dict,
    case_to_dict,
    load_and_validate,
    load_cases,
    loads,
)
from parentconnect_ai.evaluation.dataset import EvalCategory
from parentconnect_ai.kb.schema import Language

_VALID_ACCURACY = {
    "case_id": "acc-1",
    "question": "Ni ryari umukobwa atangira imihango?",
    "language": "rw",
    "category": "accuracy",
    "expected_source_ids": ["kb-puberty"],
    "reference_answer": "ref",
    "tags": ["puberty"],
}


def test_case_from_dict_builds_typed_case():
    case = case_from_dict(_VALID_ACCURACY)
    assert case.case_id == "acc-1"
    assert case.language is Language.RW
    assert case.category is EvalCategory.ACCURACY
    assert case.expected_source_ids == ("kb-puberty",)
    assert case.tags == ("puberty",)


def test_case_round_trips():
    case = case_from_dict(_VALID_ACCURACY)
    assert case_from_dict(case_to_dict(case)) == case


def test_missing_required_field_raises_with_location():
    with pytest.raises(EvalSetFormatError, match=r"case\[2\].*missing required field"):
        case_from_dict({"case_id": "x"}, index=2)


def test_invalid_language_raises():
    bad = dict(_VALID_ACCURACY, language="sw")
    with pytest.raises(EvalSetFormatError, match="invalid language"):
        case_from_dict(bad)


def test_invalid_category_raises():
    bad = dict(_VALID_ACCURACY, category="nonsense")
    with pytest.raises(EvalSetFormatError, match="invalid category"):
        case_from_dict(bad)


def test_non_mapping_case_raises():
    with pytest.raises(EvalSetFormatError, match="expected a mapping"):
        case_from_dict(["not", "a", "dict"])


def test_loads_yaml_wrapped_and_bare_list():
    wrapped = """
    version: 0.1
    cases:
      - case_id: crisis-1
        question: help
        language: en
        category: crisis
    """
    bare = """
    - case_id: crisis-1
      question: help
      language: en
      category: crisis
    """
    assert len(loads(wrapped, fmt="yaml")) == 1
    assert len(loads(bare, fmt="yaml")) == 1


def test_loads_json():
    text = json.dumps({"cases": [dict(_VALID_ACCURACY)]})
    cases = loads(text, fmt="json")
    assert cases[0].case_id == "acc-1"


def test_loads_rejects_unknown_format():
    with pytest.raises(EvalSetFormatError, match="unsupported format"):
        loads("x", fmt="toml")


def test_loads_rejects_wrong_shape():
    with pytest.raises(EvalSetFormatError, match="must contain a 'cases' list"):
        loads("version: 1", fmt="yaml")


def test_load_cases_from_yaml_file(tmp_path: Path):
    f = tmp_path / "set.yaml"
    f.write_text("cases:\n  - {case_id: c1, question: help, language: en, category: crisis}\n")
    assert load_cases(f)[0].case_id == "c1"


def test_load_cases_rejects_bad_suffix(tmp_path: Path):
    f = tmp_path / "set.txt"
    f.write_text("nope")
    with pytest.raises(EvalSetFormatError, match="unsupported file type"):
        load_cases(f)


def test_load_and_validate_strict_raises_on_invalid(tmp_path: Path):
    # accuracy case missing expected_source_ids + reference_answer -> content invalid
    f = tmp_path / "bad.yaml"
    f.write_text("cases:\n  - {case_id: a1, question: q, language: rw, category: accuracy}\n")
    with pytest.raises(EvalSetFormatError, match="invalid case"):
        load_and_validate(f)


def test_load_and_validate_non_strict_returns_issues(tmp_path: Path):
    f = tmp_path / "bad.yaml"
    f.write_text("cases:\n  - {case_id: a1, question: q, language: rw, category: accuracy}\n")
    cases, issues = load_and_validate(f, strict=False)
    assert len(cases) == 1
    assert "a1" in issues


def test_bundled_sample_is_valid():
    sample = Path(__file__).resolve().parents[1] / "eval_sets" / "sample.yaml"
    cases, issues = load_and_validate(sample)
    assert issues == {}
    assert len(cases) >= 5
