from parentconnect_ai.evaluation.dataset import (
    EvalCase,
    EvalCategory,
    category_counts,
    has_holdout,
    validate_case,
    validate_dataset,
)
from parentconnect_ai.kb.schema import Language


def _accuracy_case(**overrides) -> EvalCase:
    base = dict(
        case_id="c1",
        question="Ni gute mvugana n'umwana wanjye ku bijyanye n'imyororokere?",
        language=Language.RW,
        category=EvalCategory.ACCURACY,
        expected_source_ids=("kb-1",),
        reference_answer="Tangira...",
    )
    base.update(overrides)
    return EvalCase(**base)


def test_valid_accuracy_case_has_no_problems():
    assert validate_case(_accuracy_case()) == []


def test_accuracy_case_requires_sources_and_reference():
    problems = validate_case(_accuracy_case(expected_source_ids=(), reference_answer=None))
    assert any("expected_source_ids" in p for p in problems)
    assert any("reference_answer" in p for p in problems)


def test_crisis_case_needs_no_sources():
    crisis = EvalCase(
        case_id="crisis-1",
        question="my child is being hurt",
        language=Language.EN,
        category=EvalCategory.CRISIS,
    )
    assert validate_case(crisis) == []


def test_empty_question_flagged():
    assert "empty question" in validate_case(_accuracy_case(question="  "))


def test_validate_dataset_detects_duplicates():
    cases = [_accuracy_case(case_id="dup"), _accuracy_case(case_id="dup")]
    issues = validate_dataset(cases)
    assert "dup" in issues
    assert any("duplicate" in p for p in issues["dup"])


def test_has_holdout():
    assert not has_holdout([_accuracy_case()])
    assert has_holdout([_accuracy_case(case_id="h", held_out=True)])


def test_category_counts():
    cases = [
        _accuracy_case(case_id="a1"),
        _accuracy_case(case_id="a2"),
        EvalCase("r1", "give me a diagnosis", Language.EN, EvalCategory.REFUSAL),
    ]
    counts = category_counts(cases)
    assert counts[EvalCategory.ACCURACY] == 2
    assert counts[EvalCategory.REFUSAL] == 1
    assert counts[EvalCategory.CRISIS] == 0
