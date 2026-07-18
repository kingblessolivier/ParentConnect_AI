from parentconnect_ai.safety.crisis import CrisisCategory, detect_crisis, is_crisis


def test_detects_suicidal_ideation():
    assert CrisisCategory.SUICIDAL_IDEATION in detect_crisis("I just want to die")


def test_detects_abuse_disclosure():
    assert CrisisCategory.ABUSE in detect_crisis("my uncle keeps touching me")


def test_detects_pregnancy_disclosure():
    assert CrisisCategory.PREGNANCY in detect_crisis("she is pregnant and scared")


def test_detects_exploitation_disclosure():
    assert CrisisCategory.EXPLOITATION in detect_crisis("he offered money for sex")


def test_ordinary_parenting_question_not_flagged():
    assert detect_crisis("how do I talk to my son about puberty") == []


def test_is_crisis_true_and_false():
    assert is_crisis("I want to kill myself")
    assert not is_crisis("what is a healthy diet for a teenager")


def test_multiple_categories_can_match_same_text():
    text = "he hits me and I want to die"
    categories = detect_crisis(text)
    assert CrisisCategory.ABUSE in categories
    assert CrisisCategory.SUICIDAL_IDEATION in categories


def test_case_insensitive_matching():
    assert is_crisis("I WANT TO DIE")


def test_custom_patterns_override_defaults():
    custom = {CrisisCategory.ABUSE: (r"\bcustom phrase\b",)}
    assert detect_crisis("this contains custom phrase here", custom) == [CrisisCategory.ABUSE]
    # the default abuse pattern is not consulted once custom patterns are supplied
    assert detect_crisis("my uncle keeps touching me", custom) == []


def test_empty_text_returns_no_categories():
    assert detect_crisis("") == []
