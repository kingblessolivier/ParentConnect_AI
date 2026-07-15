from parentconnect_ai.grounding import is_grounded, unsupported_citations


def test_is_grounded_true_when_cited_source_approved():
    assert is_grounded(["kb-v1", "kb-v9"], ["kb-v1", "kb-v2"]) is True


def test_is_grounded_false_when_no_overlap():
    assert is_grounded(["kb-v9"], ["kb-v1", "kb-v2"]) is False


def test_is_grounded_false_when_no_citations():
    assert is_grounded([], ["kb-v1"]) is False


def test_unsupported_citations_lists_unapproved():
    assert unsupported_citations(["kb-v1", "kb-v9"], ["kb-v1"]) == ["kb-v9"]


def test_unsupported_citations_empty_when_all_approved():
    assert unsupported_citations(["kb-v1"], ["kb-v1", "kb-v2"]) == []
