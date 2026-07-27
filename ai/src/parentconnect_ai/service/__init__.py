"""HTTP service exposing the coach pipeline to the Node backend (ADR-0014).

The Node coach orchestrator calls ``POST /coach`` here; this service runs the
pre-generation safety checks, retrieval, the grounding gate, and (when a model
is configured) generation, per docs/ai/ai-architecture.md. No PII is received
or stored — only the question, language, and age band.
"""
