"""Evaluation harness — the release-gate machinery.

Implements the measurable parts of docs/ai/evaluation-framework.md:
  - the Kinyarwanda evaluation-set schema (dataset.py),
  - retrieval metrics recall@k / MRR (retrieval_metrics.py),
  - the release gate that decides pass/fail before real users are exposed
    (gate.py).

Model-dependent scoring (running a retriever/generator, clinician accuracy
scoring) is wired in Phase 1; this package is the pure, testable scaffolding
those steps feed into.
"""
