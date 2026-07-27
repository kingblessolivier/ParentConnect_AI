from parentconnect_ai.safety.refusal import (
    RefusalReason,
    detect_refusal_reasons,
    requires_refusal,
)


def test_detects_diagnosis_request():
    assert RefusalReason.DIAGNOSIS in detect_refusal_reasons("do I have an STI?")


def test_detects_prescription_request():
    assert RefusalReason.PRESCRIPTION in detect_refusal_reasons("what dosage should she take?")


def test_detects_termination_advice_request():
    assert RefusalReason.TERMINATION_ADVICE in detect_refusal_reasons(
        "how do I terminate my pregnancy?"
    )


def test_detects_abortion_keyword():
    assert RefusalReason.TERMINATION_ADVICE in detect_refusal_reasons(
        "she is considering abortion, what should she know?"
    )


def test_ordinary_parenting_question_not_flagged():
    assert detect_refusal_reasons("how do I start a conversation about puberty") == []


def test_requires_refusal_true_and_false():
    assert requires_refusal("do I have chlamydia?")
    assert not requires_refusal("what is a healthy way to discuss consent")


def test_multiple_reasons_can_match_same_text():
    text = "do I have an STI and what dosage of medicine should I take?"
    reasons = detect_refusal_reasons(text)
    assert RefusalReason.DIAGNOSIS in reasons
    assert RefusalReason.PRESCRIPTION in reasons


def test_case_insensitive_matching():
    assert requires_refusal("WHAT DOSAGE SHOULD I TAKE")


def test_custom_patterns_override_defaults():
    custom = {RefusalReason.DIAGNOSIS: (r"\bcustom phrase\b",)}
    assert detect_refusal_reasons("this contains custom phrase here", custom) == [
        RefusalReason.DIAGNOSIS
    ]
    assert detect_refusal_reasons("do I have an STI?", custom) == []


def test_empty_text_returns_no_reasons():
    assert detect_refusal_reasons("") == []
