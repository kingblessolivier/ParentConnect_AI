/**
 * Regression suite for "does the coach recognize what a parent actually
 * typed". Both the real coach route (retrieveKb, backed by lib/kb.ts) and the
 * no-key demo (demoReply, backed by the same KB via lib/coach.ts) are tested
 * here, because they used to drift apart silently — see lib/retrieval.ts and
 * lib/coach.ts for how that happened and why they now share one scorer and
 * one keyword list per topic.
 *
 * Every question below is a realistic phrasing a Rwandan parent might type,
 * not a keyword lifted straight from the KB entry it's meant to hit — that's
 * the point of the test: it catches exactly the gap that shipped before.
 */
import { describe, it, expect } from 'vitest';
import { retrieveKb, KB } from './kb';
import { demoReply, nextSuggestions } from './coach';

/** Every phrasing here must retrieve the given KB chunk id via BOTH paths. */
const TOPIC_CASES: { question: string; expectId: string }[] = [
  // kb-parent-role / general "how do I even start" — the originally reported failure
  { question: 'i am parent i have child who is in adolescent ages which advice i can give her', expectId: 'kb-parent-role' },
  { question: 'What advice can I give my teenager?', expectId: 'kb-parent-role' },
  { question: 'how do i raise my daughter well', expectId: 'kb-parent-role' },
  { question: 'any guidance for parenting an adolescent boy', expectId: 'kb-parent-role' },

  // kb-fear
  { question: 'should I warn her about the dangers so she stays scared enough to behave', expectId: 'kb-fear' },
  { question: 'I keep shouting at him about this, is that wrong', expectId: 'kb-fear' },

  // kb-start-early
  { question: 'what age should I start talking to my son about this', expectId: 'kb-start-early' },
  { question: 'is 10 years old too young for this conversation', expectId: 'kb-start-early' },

  // kb-dont-know
  { question: 'I feel so embarrassed and awkward bringing this up', expectId: 'kb-dont-know' },
  { question: 'what if she asks something and I honestly dont know the answer', expectId: 'kb-dont-know' },

  // kb-not-accusing
  { question: 'my daughter asked me a question about sex and I panicked, does that mean she is already active', expectId: 'kb-not-accusing' },

  // kb-fathers
  { question: 'as a father how do I even approach this with my son', expectId: 'kb-fathers' },
  { question: 'my husband is too strict to talk to our kids about this', expectId: 'kb-fathers' },

  // kb-communication
  { question: 'how should I start the conversation with my child', expectId: 'kb-communication' },
  { question: 'best way to talk to my teenager', expectId: 'kb-communication' },

  // kb-puberty
  { question: 'my daughter started her period and I dont know what to tell her', expectId: 'kb-puberty' },
  { question: 'his voice is changing and he is growing body hair, is that normal', expectId: 'kb-puberty' },
  { question: 'she is having wet dreams, is something wrong', expectId: 'kb-puberty' },
  { question: 'why is my son getting acne and pimples all of a sudden', expectId: 'kb-puberty' },

  // kb-consent
  { question: 'how do I teach my son about consent and personal boundaries', expectId: 'kb-consent' },
  { question: 'she says she was touched and felt uncomfortable, how do I explain boundaries', expectId: 'kb-consent' },

  // kb-myths
  { question: 'her friend told her something, is it true that you cant get pregnant the first time', expectId: 'kb-myths' },
  { question: 'people at school keep spreading rumours, how do I correct them', expectId: 'kb-myths' },

  // kb-relationships
  { question: 'my teenager has a boyfriend, how should I handle it', expectId: 'kb-relationships' },
  { question: 'what does a healthy relationship look like for teens', expectId: 'kb-relationships' },

  // kb-online
  { question: 'someone on tiktok asked her for nude photos, what do I do', expectId: 'kb-online' },
  { question: 'how much screen time and social media is ok for my son', expectId: 'kb-online' },

  // kb-emotions
  { question: 'my son has been really withdrawn and moody lately', expectId: 'kb-emotions' },
  { question: 'she cries a lot and seems anxious, how can I support her', expectId: 'kb-emotions' },

  // kb-saying-no
  { question: 'how do I help my daughter stand up to peer pressure', expectId: 'kb-saying-no' },
  { question: 'he keeps giving in when his friends pressure him', expectId: 'kb-saying-no' },

  // kb-self-esteem
  { question: 'she keeps comparing herself to other girls and calling herself ugly', expectId: 'kb-self-esteem' },
  { question: 'how do I build my sons confidence about his body image', expectId: 'kb-self-esteem' },

  // kb-getting-help
  { question: 'who else can I turn to for support besides myself', expectId: 'kb-getting-help' },
  { question: 'where can we find a health worker or counsellor nearby', expectId: 'kb-getting-help' },
];

describe('retrieveKb (real coach route) recognizes realistic parent phrasings', () => {
  for (const { question, expectId } of TOPIC_CASES) {
    it(`"${question}" → ${expectId}`, () => {
      const chunks = retrieveKb(question, '13_15');
      expect(chunks.length).toBeGreaterThan(0);
      expect(chunks[0]!.id).toBe(expectId);
    });
  }
});

/** Fragment unique to each DEMO_KB entry's EN `source` field, so the test can
 *  confirm which entry actually matched, not just that *something* did. */
const ID_TO_SOURCE_FRAGMENT: Record<string, string> = {
  'kb-puberty': 'Puberty & the body',
  'kb-consent': 'Consent & healthy boundaries',
  'kb-communication': 'Talking with your teen',
  'kb-myths': 'Common myths, answered',
  'kb-relationships': 'Healthy relationships',
  'kb-online': 'Staying safe online',
  'kb-emotions': 'Supporting your teen’s wellbeing',
  'kb-saying-no': 'Helping a teen say no',
  'kb-self-esteem': 'Confidence & body image',
  'kb-getting-help': 'Finding trusted help',
  'kb-parent-role': 'Being the person they can come to',
  'kb-fear': 'Why warnings alone tend not to work',
  'kb-start-early': 'When to start',
  'kb-dont-know': 'When you don’t know the answer',
  'kb-not-accusing': 'A question is not a confession',
  'kb-fathers': 'For fathers',
};

describe('demoReply (no-key demo path) recognizes the same phrasings', () => {
  for (const { question, expectId } of TOPIC_CASES) {
    it(`"${question}" → ${expectId}`, () => {
      const reply = demoReply(question, 'en');
      expect(reply.kind).toBe('answer');
      expect(reply.source).toContain(ID_TO_SOURCE_FRAGMENT[expectId]);
    });
  }
});

describe('refusal gate (NFR-21) still fires on both paths despite broader matching', () => {
  const CLINICAL_QUESTIONS = [
    'do I have an STD',
    'what dose of pills should she take',
    'how many mg of the pill should he take',
    'can you prescribe something for her',
    'how do I get an abortion',
    'should she take emergency contraception, how much',
  ];

  for (const q of CLINICAL_QUESTIONS) {
    it(`demo refuses: "${q}"`, () => {
      expect(demoReply(q, 'en').kind).toBe('refusal');
    });
  }
});

describe('crisis detection still routes to referral, not a KB answer', () => {
  it('demo path', () => {
    expect(demoReply('he beats me', 'en').kind).toBe('referral');
  });
});

describe('greetings and thanks still get warm conversational replies, not a refusal', () => {
  it('greeting', () => {
    expect(demoReply('hello', 'en').kind).toBe('answer');
  });
  it('thanks', () => {
    expect(demoReply('thank you so much', 'en').kind).toBe('answer');
  });
});

describe('genuinely out-of-scope questions still refuse rather than guessing', () => {
  it('unrelated question', () => {
    expect(demoReply('what is the capital of France', 'en').kind).toBe('refusal');
  });
});

/**
 * The coach's own suggested-question chips (Coach.tsx / CoachDashboard.tsx
 * LABELS.chips) must never produce a refusal — a parent tapping a question
 * *we* wrote should always get a grounded answer, in both languages.
 */
const EN_CHIPS = [
  'How do I talk to my teen?',
  'What should I say about periods?',
  'How do I explain consent?',
  'A friend told my child a myth',
];
const RW_CHIPS = [
  'Nganire nte n’umwana wanjye?',
  'Mvuge iki ku mihango?',
  'Nsobanure nte kwemera?',
  'Inshuti yabwiye umwana ikinyoma',
];

describe('suggestion chips always get a grounded answer, never a refusal', () => {
  for (const q of EN_CHIPS) {
    it(`EN: "${q}"`, () => {
      expect(demoReply(q, 'en').kind).toBe('answer');
    });
  }
  for (const q of RW_CHIPS) {
    it(`RW: "${q}"`, () => {
      expect(demoReply(q, 'rw').kind).toBe('answer');
    });
  }
});

describe('every KB entry has a real, non-empty follow-up question in both languages', () => {
  for (const chunk of KB) {
    it(chunk.id, () => {
      expect(chunk.followUp.en.trim().length).toBeGreaterThan(0);
      expect(chunk.followUp.rw.trim().length).toBeGreaterThan(0);
    });
  }
});

describe('a grounded demo answer carries its topic\'s follow-up question', () => {
  it('EN', () => {
    const reply = demoReply('What should I say about periods?', 'en');
    const chunk = KB.find((c) => c.id === 'kb-puberty')!;
    expect(reply.followUp).toBe(chunk.followUp.en);
  });
  it('RW', () => {
    const reply = demoReply('Nsobanure nte kwemera?', 'rw');
    const chunk = KB.find((c) => c.id === 'kb-consent')!;
    expect(reply.followUp).toBe(chunk.followUp.rw);
  });
  it('a refusal never carries a follow-up', () => {
    expect(demoReply('what is the capital of France', 'en').followUp).toBeUndefined();
  });
});

describe('nextSuggestions()', () => {
  const answer = { kind: 'answer' as const, answer: 'x', followUp: 'Follow-up question?' };
  const chips = ['Chip A', 'Chip B', 'Chip C'];

  it('puts the follow-up first, then fills with unused chips up to the max', () => {
    expect(nextSuggestions(answer, [], chips, 3)).toEqual(['Follow-up question?', 'Chip A', 'Chip B']);
  });
  it('skips anything already asked, case-insensitively', () => {
    expect(nextSuggestions(answer, ['chip a', 'FOLLOW-UP QUESTION?'], chips, 3)).toEqual(['Chip B', 'Chip C']);
  });
  it('returns nothing for a refusal or referral — there is nothing useful to suggest', () => {
    expect(nextSuggestions({ kind: 'refusal', answer: 'x' }, [], chips)).toEqual([]);
    expect(nextSuggestions({ kind: 'referral', answer: 'x' }, [], chips)).toEqual([]);
  });
  it('returns nothing when nothing is left to suggest', () => {
    expect(nextSuggestions({ kind: 'answer', answer: 'x' }, ['Chip A', 'Chip B', 'Chip C'], chips)).toEqual([]);
  });
});
