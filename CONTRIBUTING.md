# Contributing to ParentConnect AI

Thank you for contributing to a safety-critical, privacy-critical project. Read this before opening a pull request.

## Ground rules

1. **Never commit secrets.** No API keys, tokens, credentials, or `.env` files. CI runs secret scanning; a leak means credential rotation, not just a revert. (NFR-13)
2. **Never introduce identifiable minor data.** Do not add fields, logs, or test fixtures containing adolescent names, national IDs, or health records. (NFR-15)
3. **Health content changes require clinical sign-off.** No change to the knowledge base or AI guardrails merges without the clinical reviewer's approval recorded on the PR. (FR-20, NFR-20)

## Git workflow

```
main      ← deployment only. Promoted from dev by release PR. Protected.
 └ dev    ← integration branch. All feature PRs target this. Protected.
    └ feature/*  ← your work. One logical change per branch.
```

- Branch from `dev`: `git checkout dev && git pull && git checkout -b feature/short-description`
- Open a **pull request into `dev`** (never push to `dev` or `main` directly).
- `main` receives changes only via a release PR from `dev`.
- Branch naming: `feature/…`, `fix/…`, `docs/…`, `chore/…`.

## Commit messages

Conventional Commits: `type(scope): summary` — e.g. `docs(ai): add reranking to RAG pipeline`. Types: `feat`, `fix`, `docs`, `chore`, `test`, `refactor`, `ci`.

## Pull request checklist

- [ ] Targets `dev`.
- [ ] One logical change; description explains *why*, not just *what*.
- [ ] For code: tests added/updated; core-logic coverage stays ≥70% (NFR-33).
- [ ] For health/AI content: clinical reviewer named and approving.
- [ ] For data-model changes: data-sensitivity classification updated in `docs/architecture/data-model.md`.
- [ ] No secrets, no identifiable minor data.
- [ ] Requirement IDs referenced where applicable; traceability matrix updated.
- [ ] Relevant ADR added/updated if an architectural decision changed.

## Documentation conventions

- Markdown + Mermaid. Keep requirement IDs stable.
- Use `[VERIFY]` / `[ASSUMPTION]` markers and log them in `docs/decisions-log.md`.

## Reporting a safeguarding or security concern

Do **not** open a public issue. Follow the escalation path in `docs/compliance/child-safeguarding-policy.md` (safeguarding) or `docs/compliance/security-design.md` (security/vulnerability disclosure).
