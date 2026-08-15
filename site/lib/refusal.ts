/**
 * Deterministic refusal gate (NFR-21). Diagnosis, prescribing, and
 * termination-of-pregnancy questions are refused before any model is
 * consulted — never left to a model's judgement, and never left to whatever
 * a keyword-retrieval fallback happened to match. Shared by the real coach
 * route and the client-side demo: the demo has no model call and no
 * grounding check behind it, so this gate is its *only* protection against
 * broader keyword matching accidentally producing a canned answer to a
 * clinical question — it must run there too, not just server-side.
 */
const REFUSE_PATTERNS: RegExp[] = [
  // diagnosis
  /\bdo i have\b/i,
  /\bis (?:this|it) an? (?:std|sti|infection|disease)\b/i,
  /\bwhat (?:disease|infection|illness)\b/i,
  // prescribing / dosing
  /\bhow (?:much|many) (?:mg|milligrams?|pills?|tablets?)\b/i,
  /\bwhat (?:dose|dosage)\b/i,
  /\bwhich (?:medicine|medication|drug|pills?|contracepti\w*) should\b/i,
  /\b(?:dose|dosage) of\b/i,
  /\bshould she take\b/i,
  /\bprescribe\b/i,
  // termination
  /\babortion\b/i,
  /\b(?:terminate|end) (?:the|my|her|a) pregnancy\b/i,
  /\bgukuramo inda\b/i,
];

export function requiresRefusal(text: string): boolean {
  return REFUSE_PATTERNS.some((re) => re.test(text));
}
