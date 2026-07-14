/**
 * PII redaction for logs and audit metadata.
 *
 * Data-minimisation is enforced end-to-end (NFR-15) and no role may see another
 * user's conversation content (NFR-10); logs and the audit trail must never
 * carry raw PII or P3 content bodies (security-design.md). This is a seed piece
 * of core logic so the coverage gate has something real to measure — expand it
 * with the logging layer in Phase 1.
 */

/** Redact a phone number, keeping only a masked hint for debugging. */
export function redactPhone(input: string): string {
  const digits = input.replace(/\D/g, '');
  if (digits.length < 4) return '[redacted]';
  return `***${digits.slice(-3)}`;
}

/** Redact obvious PII patterns (phone numbers) from a free-text string. */
export function redactText(input: string): string {
  // E.164-ish and local phone patterns → placeholder.
  return input.replace(/\+?\d[\d\s-]{6,}\d/g, '[redacted-phone]');
}

const SENSITIVE_KEYS = new Set(['phone', 'phone_hash', 'body', 'note', 'alias', 'display_alias']);

/**
 * Return a shallow copy of a log/audit object with sensitive keys removed.
 * P3 content bodies and identifiers must never reach logs (NFR-10/11/15).
 */
export function redactObject(obj: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(obj)) {
    out[key] = SENSITIVE_KEYS.has(key) ? '[redacted]' : value;
  }
  return out;
}
