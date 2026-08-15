/**
 * Safeguarding detection (CLAUDE.md #3): disclosures of abuse, exploitation,
 * or crisis must route to human help, never to the model. Shared by the real
 * coach route and the client-side demo so both apply the exact same check.
 * In the live system this is done far more carefully server-side; here it
 * also powers the demo's referral panel when no backend is configured.
 */

export const CRISIS = [
  'suicide', 'kill myself', 'hurt myself', 'end my life', 'want to die',
  'raped', 'rape', 'abused', 'abuse', 'beaten', 'beats me', 'hitting me', 'hit me',
  'is pregnant', "i'm pregnant", 'im pregnant', 'she is pregnant', 'got pregnant',
  'kwiyahura', 'gufatwa ku ngufu', 'gukubitwa', 'aratwite', 'ndatwite',
];

export function isCrisis(text: string): boolean {
  const t = text.toLowerCase();
  return CRISIS.some((w) => t.includes(w));
}
