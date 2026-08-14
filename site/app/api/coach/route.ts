import Anthropic from '@anthropic-ai/sdk';
import { KB, type KbChunk } from '../../../lib/kb';
import type { AgeBand, CoachReply, Lang } from '../../../lib/coach';

/**
 * Real RAG coach endpoint. Runs server-side so the API key never reaches the
 * browser. Pipeline (CLAUDE.md #1, #3, #4):
 *   1. Safeguarding check → route disclosures to human help (no model call).
 *   2. Retrieve approved source chunks for the latest question.
 *   3. Call Claude with the recent conversation for a warm, human, multi-turn
 *      reply. Grounding rule: any health/SRH factual claim must come only from
 *      the retrieved sources; conversational warmth (greetings, encouragement,
 *      acknowledging feelings) needs no source; if the parent asks for
 *      information the sources don't cover, it refuses kindly.
 * Nothing is stored. No key → 503 so the client shows the safe demo.
 */

export const runtime = 'nodejs';

// Sonnet 5 is the cost/quality default for this grounded, low-latency task.
// Override with COACH_MODEL (e.g. claude-haiku-4-5 for the cheapest pilot,
// claude-opus-5 for the highest quality).
const MODEL = process.env.COACH_MODEL ?? 'claude-sonnet-5';

const CRISIS = [
  'suicide', 'kill myself', 'hurt myself', 'end my life', 'want to die',
  'raped', 'rape', 'abused', 'abuse', 'beaten', 'beats me', 'hitting me', 'hit me',
  'is pregnant', "i'm pregnant", 'im pregnant', 'she is pregnant', 'got pregnant',
  'kwiyahura', 'gufatwa ku ngufu', 'gukubitwa', 'aratwite', 'ndatwite',
];

const REFERRAL: Record<Lang, CoachReply> = {
  en: {
    kind: 'referral',
    answer:
      'Thank you for telling me. If you or a young person is in danger or has been harmed, you deserve real support right now. The app and SMS service connect you to your district’s child-protection and health contacts (such as Isange One Stop Centres) — no login and no name required.',
    source: 'Your safety comes first.',
  },
  rw: {
    kind: 'referral',
    answer:
      'Urakoze kubimbwira. Niba wowe cyangwa umwana ari mu kaga cyangwa yagizweho nabi, ukwiye ubufasha nyabwo nonaha. Porogaramu na SMS bikwegereza abashinzwe kurinda abana n’ubuzima mu karere kawe (nka Isange One Stop Centres) — nta kwinjira kandi nta zina bisaba.',
    source: 'Umutekano wawe uza mbere.',
  },
};

/**
 * Deterministic refusal gate (NFR-21) — mirrors `ai/safety/refusal.py`.
 *
 * Diagnosis, prescribing and termination advice are refused *before* the model
 * is called, never left to it. This matters more since retrieval gained a
 * general fallback: a dosing question now always retrieves *something*, so
 * without this check the model would be the only thing standing between that
 * question and an answer. A pattern check is not clever, but it fails closed.
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

function requiresRefusal(text: string): boolean {
  return REFUSE_PATTERNS.some((re) => re.test(text));
}

const REFUSAL: Record<Lang, CoachReply> = {
  en: {
    kind: 'refusal',
    answer:
      'That’s a really good question, and I want to get it right — but I don’t have an approved answer for it yet, and I won’t guess, because a wrong answer here could do harm. In the live service I’d connect you with a trained person or a reviewed lesson instead.',
    source: 'A refusal is a success here when the alternative is an unsafe answer.',
  },
  rw: {
    kind: 'refusal',
    answer:
      'Icyo ni ikibazo cyiza cyane, kandi nifuza kugisubiza neza — ariko nta gisubizo cyemejwe mfite kuri cyo, kandi sinakeka, kubera ko igisubizo kitari cyo cyatera ingaruka. Muri serivisi nyayo, nakuhuza n’umuntu wabihuguriwe cyangwa isomo ryasuzumwe.',
    source: 'Kwanga gusubiza ni intsinzi iyo ikindi cyari igisubizo kitizewe.',
  },
};

interface HistoryTurn { role: 'user' | 'coach'; text: string }

function isCrisis(text: string): boolean {
  const t = text.toLowerCase();
  return CRISIS.some((w) => t.includes(w));
}

/** Deterministic keyword retrieval. Swap for embeddings when the real KB lands. */
/**
 * Chunks that answer a broad "how do I approach this at all?" question.
 *
 * Without this, the single most likely opening question a parent asks — "what
 * advice can I give my teenager?" — matched no topic keyword, scored zero, and
 * was refused. That refusal was never a safety win: it's general communication
 * guidance the corpus *does* cover, just not under any one topic word.
 */
const GENERAL_CHUNK_IDS = ['kb-communication', 'kb-parent-role', 'kb-fear', 'kb-getting-help'];

function generalChunks(): KbChunk[] {
  return GENERAL_CHUNK_IDS.map((id) => KB.find((c) => c.id === id)).filter(
    (c): c is KbChunk => c !== undefined,
  );
}

function retrieve(question: string, ageBand: AgeBand): KbChunk[] {
  const q = question.toLowerCase();
  // Match on word boundaries as well as substrings, so "adolescent"/"teenager"
  // and multi-word keys both land. Plain `includes` alone missed too much.
  const words = new Set(q.split(/[^a-zÀ-ɏ’']+/).filter(Boolean));
  const scored = KB.map((c) => {
    let score = c.keywords.reduce((s, k) => {
      if (k.includes(' ')) return q.includes(k) ? s + 1 : s;
      return words.has(k) || q.includes(k) ? s + 1 : s;
    }, 0);
    if (score > 0 && (c.ageBands.includes('all') || c.ageBands.includes(ageBand))) score += 0.5;
    return { c, score };
  })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score);

  // Nothing matched: fall back to the general guidance rather than refusing.
  // This does NOT loosen grounding — the model is still told to answer only
  // from what it is given and to refuse if these chunks don't cover the
  // question, so a clinical question still gets a refusal, not a guess.
  if (scored.length === 0) return generalChunks().slice(0, 3);
  return scored.slice(0, 3).map((x) => x.c);
}

const AGE_LABEL: Record<AgeBand, string> = { '10_12': '10–12', '13_15': '13–15', '16_19': '16–19' };

export async function POST(req: Request) {
  let body: { question?: string; language?: Lang; ageBand?: AgeBand; history?: HistoryTurn[] };
  try {
    body = await req.json();
  } catch {
    return Response.json({ error: 'bad request' }, { status: 400 });
  }
  const question = (body.question ?? '').toString().slice(0, 2000).trim();
  const lang: Lang = body.language === 'rw' ? 'rw' : 'en';
  const ageBand: AgeBand = (['10_12', '13_15', '16_19'] as const).includes(body.ageBand as AgeBand)
    ? (body.ageBand as AgeBand)
    : '13_15';
  const history = Array.isArray(body.history) ? body.history.slice(-6) : [];

  if (!question) return Response.json({ error: 'empty question' }, { status: 400 });

  // 1. Safeguarding — never runs through the model.
  if (isCrisis(question)) return Response.json(REFERRAL[lang]);

  // 1b. Refusal policy (NFR-21) — diagnosis/prescribing/termination are refused
  // deterministically, before any model call, not left to the model's judgement.
  if (requiresRefusal(question)) return Response.json(REFUSAL[lang]);

  // No key configured → tell the client to use its safe demo.
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: 'coach not configured' }, { status: 503 });
  }

  // 2. Retrieve approved sources for the latest question.
  const chunks = retrieve(question, ageBand);
  const sourcesBlock = chunks.length
    ? chunks.map((c, i) => `[Source ${i + 1}] ${c.title}\n${c.text}\n(citation: ${c.source})`).join('\n\n')
    : '(No approved source matched this message.)';

  const langName = lang === 'rw' ? 'Kinyarwanda' : 'English';
  const system = [
    'You are ParentConnect AI — a warm, calm, encouraging coach who talks with a Rwandan parent about how to speak with their 10–19-year-old on growing up, puberty, relationships, consent, and staying safe.',
    'HOW TO SOUND: like a caring, plain-spoken human, not a document. Write in the first person ("I"), in short natural sentences and small paragraphs. No bullet lists, no headings, no clinical jargon. Warm and reassuring, never preachy. Acknowledge the parent’s feelings when they share them.',
    'CONVERSATION: this is a back-and-forth. Use the earlier turns for context. Greetings, thanks, worries, and encouragement are normal conversation — respond warmly and naturally to those; they do NOT need a source.',
    'THE ONE HARD RULE: any factual claim about health, bodies, puberty, or SRH must come ONLY from the APPROVED SOURCES below. Never state a health/medical fact, statistic, dosage, or diagnosis that is not supported by those sources. If the parent asks for information the sources do not actually cover, set "refused" to true and, in "reply", gently say you don’t have an approved answer and would point them to a real person — a kind refusal is the correct, safe outcome, never a guess.',
    `WHEN YOU DO HAVE relevant sources: weave the guidance into a warm, natural reply, and where it helps, offer one sentence the parent could actually say to open the conversation with their ${AGE_LABEL[ageBand]}-year-old — put just that sentence in "opener".`,
    `Always reply in ${langName}. Keep replies to a few sentences. Return only the JSON object.`,
  ].join('\n');

  const messages: Anthropic.MessageParam[] = [];
  for (const turn of history) {
    if (!turn?.text) continue;
    messages.push({ role: turn.role === 'coach' ? 'assistant' : 'user', content: turn.text });
  }
  messages.push({
    role: 'user',
    content: `APPROVED SOURCES:\n\n${sourcesBlock}\n\n---\nParent says: ${question}`,
  });

  const client = new Anthropic();
  try {
    const msg = await client.messages.create({
      model: MODEL,
      max_tokens: 1024,
      system,
      output_config: {
        effort: 'low',
        format: {
          type: 'json_schema',
          schema: {
            type: 'object',
            properties: {
              refused: { type: 'boolean' },
              reply: { type: 'string' },
              opener: { type: 'string' },
            },
            required: ['refused', 'reply', 'opener'],
            additionalProperties: false,
          },
        },
      },
      messages,
    });

    if (msg.stop_reason === 'refusal') return Response.json(REFUSAL[lang]);
    const textBlock = msg.content.find((b): b is Anthropic.TextBlock => b.type === 'text');
    if (!textBlock) return Response.json(REFUSAL[lang]);

    let parsed: { refused?: boolean; reply?: string; opener?: string };
    try {
      parsed = JSON.parse(textBlock.text);
    } catch {
      return Response.json(REFUSAL[lang]);
    }

    if (parsed.refused || !parsed.reply) return Response.json(REFUSAL[lang]);

    const reply: CoachReply = {
      kind: 'answer',
      answer: parsed.reply,
      starter: parsed.opener ? `${lang === 'rw' ? 'Intangiriro' : 'Opener'}: ${parsed.opener}` : undefined,
      // Only cite a source when the answer was actually grounded in one.
      source: chunks.length ? chunks[0]!.source : undefined,
    };
    return Response.json(reply);
  } catch (err) {
    console.error('coach error', err);
    return Response.json(REFUSAL[lang], { status: 200 });
  }
}
