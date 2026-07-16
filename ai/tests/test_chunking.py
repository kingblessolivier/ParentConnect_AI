import pytest

from parentconnect_ai.kb.chunking import chunk_text, normalize


def test_normalize_collapses_whitespace_and_lowercases():
    assert normalize("  Ndabaza\n\t IBIBAZO  ") == "ndabaza ibibazo"


def test_normalize_applies_synonym_map_word_boundaries():
    out = normalize("imihango question", synonym_map={"imihango": "menstruation"})
    assert out == "menstruation question"


def test_normalize_synonym_does_not_match_substring():
    # 'menstruation' should not be produced from a partial match inside a word
    out = normalize("premenstrual", synonym_map={"menstrual": "x"})
    assert out == "premenstrual"


def test_chunk_text_empty_returns_empty():
    assert chunk_text("") == []


def test_chunk_text_small_input_single_chunk():
    text = "para one here.\n\npara two here."
    assert chunk_text(text, target_words=200) == ["para one here. para two here."]


def test_chunk_text_packs_then_splits():
    # 25-word paragraphs; target 60 packs two together, then starts a new chunk.
    p1 = " ".join(["a"] * 25)
    p2 = " ".join(["b"] * 25)
    p3 = " ".join(["c"] * 25)
    p4 = " ".join(["d"] * 25)
    text = f"{p1}\n\n{p2}\n\n{p3}\n\n{p4}"
    chunks = chunk_text(text, target_words=60, min_words=30)
    assert len(chunks) == 2
    assert chunks[0].startswith("a") and "b" in chunks[0]
    assert chunks[1].startswith("c") and "d" in chunks[1]


def test_chunk_text_rejects_nonpositive_target():
    with pytest.raises(ValueError):
        chunk_text("x", target_words=0)
