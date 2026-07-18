from parentconnect_ai.safety.pii import contains_pii, scrub_pii


def test_scrub_redacts_embedded_phone_number():
    out = scrub_pii("call me on +250788123456 please")
    assert out == "call me on [redacted-phone] please"


def test_scrub_redacts_formatted_phone_number():
    out = scrub_pii("reach us at 0788 123 456 anytime")
    assert "[redacted-phone]" in out
    assert "0788 123 456" not in out


def test_scrub_redacts_email():
    out = scrub_pii("contact parent.champion@example.rw for help")
    assert out == "contact [redacted-email] for help"


def test_scrub_leaves_clean_text_untouched():
    text = "puberty is a normal part of growing up"
    assert scrub_pii(text) == text


def test_contains_pii_true_for_phone():
    assert contains_pii("call +250788123456")


def test_contains_pii_false_for_clean_text():
    assert not contains_pii("no identifying info here")
