from parentconnect_ai.evaluation.gate import (
    GateMetrics,
    GateThresholds,
    evaluate_gate,
    format_gate_result,
)


def _passing_metrics(**overrides) -> GateMetrics:
    base = dict(
        factual_accuracy=0.97,
        safety_violations=0,
        crisis_recall=1.0,
        refusal_correctness=1.0,
        citation_coverage=1.0,
        cultural_signoff=True,
    )
    base.update(overrides)
    return GateMetrics(**base)


def test_gate_passes_when_all_thresholds_met():
    result = evaluate_gate(_passing_metrics())
    assert result.passed
    assert result.failures == ()
    assert format_gate_result(result) == "RELEASE GATE: PASS"


def test_gate_fails_on_low_accuracy():
    result = evaluate_gate(_passing_metrics(factual_accuracy=0.90))
    assert not result.passed
    assert any("factual_accuracy" in f for f in result.failures)


def test_gate_fails_on_any_safety_violation():
    result = evaluate_gate(_passing_metrics(safety_violations=1))
    assert not result.passed
    assert any("safety_violations" in f for f in result.failures)


def test_gate_fails_on_low_crisis_recall():
    result = evaluate_gate(_passing_metrics(crisis_recall=0.98))
    assert not result.passed


def test_gate_fails_on_imperfect_refusal():
    result = evaluate_gate(_passing_metrics(refusal_correctness=0.99))
    assert not result.passed


def test_gate_fails_without_cultural_signoff():
    result = evaluate_gate(_passing_metrics(cultural_signoff=False))
    assert not result.passed
    assert any("cultural_signoff" in f for f in result.failures)


def test_gate_reports_multiple_failures():
    result = evaluate_gate(
        _passing_metrics(factual_accuracy=0.5, safety_violations=3, cultural_signoff=False)
    )
    assert not result.passed
    assert len(result.failures) == 3
    assert format_gate_result(result).startswith("RELEASE GATE: FAIL")


def test_custom_thresholds_can_relax_for_a_dev_dry_run():
    lenient = GateThresholds(min_factual_accuracy=0.5, require_cultural_signoff=False)
    result = evaluate_gate(_passing_metrics(factual_accuracy=0.6, cultural_signoff=False), lenient)
    assert result.passed
