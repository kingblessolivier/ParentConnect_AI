"""Post-generation safety checks (docs/ai/ai-architecture.md stage 9,
docs/ai/safety-and-guardrails.md L4).

Citation/grounding checks already live in ``parentconnect_ai.grounding``. This
package adds the other two backstops that run on every response before it
reaches a parent: an output PII scrub, and a lexical prompt-injection scan.
Both are heuristic backstops, not the primary defence — corpus integrity
(only approved content is indexed, FR-20) and prompt delimiting are — so a
miss here does not mean the layer is meaningless, but it should never be the
only thing standing between a parent and unsafe output.
"""
