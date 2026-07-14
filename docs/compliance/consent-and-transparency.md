# Consent & Transparency

How consent is obtained across app, SMS, and IVR — **in Kinyarwanda, for potentially low-literacy users** — and how we disclose that the coach is an AI. Realises NFR-16 and D4; supports the DPIA.

## Consent principles

- **Informed, specific, freely given, withdrawable** — and **recorded in the user's language** before any processing (NFR-16).
- **Layered:** a short, plain-language notice first; full details available on request/audio.
- **Separate explicit consent** for processing **sensitive SRH conversation** content (P3), distinct from basic account processing.
- **No dark patterns:** declining is as easy as accepting; declining still allows access to non-personal content and referral info.

## What we tell the user (plain-language notice — baseline, to be localised & culturally reviewed)

```
ParentConnect helps you talk with your child about growing up, relationships,
and health. To help you:
- We use your phone number and your district to give you the right information.
- You tell us your child's age range only — never their name.
- When you chat with the coach, we keep your messages private and delete them
  after a while. Only you can see your conversations.
- The coach is a computer assistant (AI), not a doctor. For medical care, we
  will point you to a health worker or clinic.
- You can see, download, or delete your information any time, and stop using
  the service whenever you want.
Do you agree to use ParentConnect this way?  [Yes]   [Tell me more]   [No]
```

Kinyarwanda and French versions are authored and **culturally reviewed** (NFR-24) before use; an **audio version** is provided for low literacy (NFR-26).

## Consent by channel

| Channel | How consent is captured | Record |
|---|---|---|
| **App** | Layered screen with audio option; explicit toggles for account vs SRH-content processing; "Tell me more" expands full notice | `CONSENT{purpose, language, method=app, given_at}` |
| **SMS** | First interaction sends the short notice; reply `YES` to consent, `INFO` for more, `STOP` to decline/opt-out; SRH consent confirmed before first coaching turn | `method=sms` + message evidence |
| **IVR** | Voice notice in Kinyarwanda; keypad/voice confirmation; option to hear full notice | `method=ivr` + call record reference |
| **Assisted (CHW)** | CHW reads the notice aloud with the parent present; parent confirms; CHW records | `method=assisted`, plus CHW actor id |

Every record stores the **language** consent was given in and a timestamp; withdrawal (`/consent/withdraw`, or SMS `STOP`) is equally easy and stops processing.

## AI transparency (disclosing the coach is an AI) — D4

- The coach is **labelled as an AI** at first use and available on request thereafter (`is_ai: true` in every coach response; prompt instructs the model to say so when relevant).
- The system states plainly it is **not a clinician** and will refer to professionals for medical care (NFR-21).
- No pretence of being a human, a doctor, or a specific person.
- Transparency wording is part of the consent notice and the coach's onboarding, in the user's language, with audio.

## Special considerations

- **Low literacy:** audio-first consent; short sentences; icons where helpful; the assisted flow for those who prefer a person.
- **Shared phones:** consent is per-account (phone-anchored); re-verification on a recycled number (channel-design.md).
- **Adolescents:** the MVP does **not** create adolescent accounts (`[ASSUMPTION Q10]`), avoiding the heavier question of child consent/capacity; if ever introduced, a separate consent/capacity model and DPIA update are required.

## Records & audit

- Consent and withdrawal are stored (data-model.md), auditable (NFR-11), and retained per `retention-schedule.md`.
- The DPIA references these records as the lawful-basis evidence (NFR-14).
