# site — public site (Next.js + React + TypeScript)

The **public-facing** site: what ParentConnect AI is, how to reach it, and the safety/privacy commitments — for parents, partners, funders, and press. See [ADR-0016](../docs/architecture/adr/0016-web-frontend.md) (same stack decision as `web/`).

**This is not `web/`** (the staff console — admin/clinical review/CPO, behind auth) **and not `mobile/`** (the parent-facing app parents actually use the coach through). Kept as a separate app because its audience, auth model (none), and design treatment are genuinely different — see `docs/decisions-log.md`, 2026-07-30.

## Implemented so far

- `/` — a single informational homepage: hero, how it works (app/SMS coach, micro-lessons, community sessions), safety & privacy commitments, and an always-visible "get help" section.
- **No PII collected, no login.** Deliberately doesn't print specific helpline/referral phone numbers — those are `[VERIFY]` in `docs/decisions-log.md` (V2) and are correctly per-district data that belongs in the app/SMS referral directory, not hardcoded on a public page that could go stale or be wrong for a reader's district.
- **Near-zero client-side JavaScript** — the only client code is a small scroll-reveal (`components/Reveal.tsx`) and `next/image`'s runtime; the page is otherwise static, deliberately, since a marketing/info page has no reason to cost a low-bandwidth visitor much beyond the HTML/CSS.

## Assets

- `public/hero-rwanda.jpg` — hero background photo. Landscape only, **no people** (deliberate — see the photography note in `docs/decisions-log.md`, 2026-07-30: a stock photo implying specific real parents/teenagers would misrepresent who's actually in the programme). Sourced from Unsplash, free **Unsplash License** (no attribution required, but recorded here for provenance): photo by [maxime niyomwungeri](https://unsplash.com/photos/landscape-of-trees-and-mountain-z-lNmXoXt-k). Self-hosted in `public/`, not hotlinked.

## Getting started

```bash
npm install
npm run dev        # http://localhost:3003
npm run lint && npm run typecheck && npm run build
```

## Standards

- Next.js App Router + React + strict TypeScript, same conventions as `web/`.
- No secrets, no analytics/tracking beyond what's explicitly decided (NFR-13/15).
- Never state a fact (statistics, partner claims, phone numbers) that isn't sourced — see `docs/decisions-log.md`'s `[VERIFY]`/`[ASSUMPTION]` convention.
