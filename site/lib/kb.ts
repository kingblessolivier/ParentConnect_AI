/**
 * Starter knowledge base for the coach's RAG retrieval.
 *
 * SAFETY: The live coach must answer ONLY from approved, clinically & culturally
 * reviewed source documents (CLAUDE.md #1). This file is a small STARTER corpus
 * of general parenting/communication guidance — deliberately NOT detailed
 * clinical/SRH facts, which must come from the reviewed knowledge base built in
 * Phase 0. Every entry is marked as illustrative and pending review. Swap this
 * array for the real approved corpus (or a vector store) when it exists; the
 * route handler's retrieval + grounding logic stays the same.
 */

import { retrieveWithFallback } from './retrieval';

export interface KbChunk {
  id: string;
  topic: string;
  ageBands: string[]; // '10_12' | '13_15' | '16_19' | 'all'
  keywords: string[];
  title: string;
  text: string;
  source: string;
}

export const KB: KbChunk[] = [
  {
    id: 'kb-communication',
    topic: 'communication',
    ageBands: ['all'],
    keywords: [
      'talk', 'talking', 'conversation', 'discuss', 'speak',
      // Deliberately NOT 'how'/'what'/'should'/'tell'/'help'/'daughter'/'son'/
      // 'teen'/'child': those appear in nearly every parent question regardless
      // of topic, so scoring on them drowned out specific-topic matches (a
      // question about a first period was outscoring kb-puberty on generic
      // word overlap alone). This chunk and its siblings in GENERAL_CHUNK_IDS
      // only compete once no specific topic matched — see retrieveWithFallback.
      'advice', 'advise', 'guide', 'guidance',
      'nganire', 'kuvugana', 'kuganira', 'ikiganiro', 'inama', 'umwana',
    ],
    title: 'Talking with your teen',
    text: 'A parent does not need perfect words — they need to be a safe person to come to. Short, calm, everyday moments (walking, cooking, doing chores together) work far better than one big formal "talk". Listening without reacting harshly, and admitting when you do not know something, keeps the door open so a young person keeps coming back.',
    source: 'Talking with your teen — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-puberty',
    topic: 'puberty',
    ageBands: ['10_12', '13_15', '16_19'],
    keywords: [
      'period', 'periods', 'menstrua', 'menstruation', 'menstrual', 'puberty', 'body', 'growing',
      'grow', 'grows', 'growth', 'develop', 'developing', 'development', 'changes', 'changing',
      'change', 'breast', 'breasts', 'voice', 'facial hair', 'pubic hair', 'hair', 'acne',
      'pimple', 'pimples', 'smell', 'odor', 'odour', 'wet dream', 'wet dreams', 'erection',
      'discharge', 'bleeding', 'blood', 'cramps', 'mature', 'maturing', 'maturity', 'growing up',
      'imihango', 'ukwezi', 'ubukure', 'umubiri',
    ],
    title: 'Puberty and the body',
    text: 'Puberty and menstruation are normal, healthy signs that a young body is growing up. They are nothing to be ashamed of. Talking about them openly, in plain language and without fear, helps a young person feel safe and prepared rather than scared or secretive. Reassure them that what they are experiencing is expected and that they can always ask you.',
    source: 'Puberty & the body — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-consent',
    topic: 'consent',
    ageBands: ['all'],
    keywords: [
      // Deliberately NOT bare 'body'/'her body'/'his body'/'own body': those
      // collide with any question mentioning a body at all (puberty, body
      // image), even unrelated to consent. 'bodily autonomy' is specific
      // enough to keep.
      'consent', 'boundaries', 'boundary', 'no means', 'safe', 'touch', 'touching',
      'touched', 'permission', 'agree', 'agreement', 'force', 'forced', 'forcing', 'uncomfortable',
      'inappropriate', 'personal space', 'bodily autonomy',
      'kwemera', 'imbibi',
    ],
    title: 'Consent and healthy boundaries',
    text: 'Consent means everyone freely agrees, every time — and anyone can say no at any point, even to someone they know. Teaching a child that their body is their own, that "no" must always be respected, and that they can tell a trusted adult about anything that makes them uncomfortable is one of the strongest ways to keep them safe.',
    source: 'Consent & healthy boundaries — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-myths',
    topic: 'myths',
    ageBands: ['13_15', '16_19'],
    keywords: [
      'myth', 'myths', 'rumour', 'rumor', 'true that', 'friend said', 'is it true', 'heard that',
      'someone said', 'people say', 'they say', 'is that true', 'false', 'misinformation', 'lie', 'lies',
      'imigenzo', 'ibihuha', 'ikinyoma',
    ],
    title: 'Answering myths calmly',
    text: 'Many worries young people carry come from myths shared by friends or online. Correcting these calmly, with accurate and respectful information rather than punishment or shame, builds trust. When a child feels they can check things with a parent without being judged, they rely less on unreliable sources.',
    source: 'Common myths, answered — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-relationships',
    topic: 'relationships',
    ageBands: ['13_15', '16_19'],
    keywords: [
      // Deliberately NOT bare 'friend'/'friends'/'peer'/'pressure': those belong
      // more precisely to kb-saying-no (refusal skills) and, scored together,
      // collided with it on ordinary peer-pressure questions.
      'relationship', 'relationships', 'dating', 'love',
      'boyfriend', 'girlfriend', 'crush', 'partner', 'romantic', 'romance', 'seeing someone',
      'imibanire', 'urukundo', 'inshuti',
    ],
    title: 'Healthy relationships and peer pressure',
    text: 'Adolescents learn a lot about relationships from their peers. Parents help by talking about what respect, honesty, and safety look like in any friendship or relationship, and by making clear the young person can walk away from anything that feels wrong. Naming peer pressure openly makes it easier for a teen to resist it.',
    source: 'Healthy relationships — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-online',
    topic: 'online safety',
    ageBands: ['10_12', '13_15', '16_19'],
    keywords: [
      'online', 'internet', 'social media', 'phone', 'whatsapp', 'tiktok', 'facebook', 'instagram',
      'snapchat', 'app', 'apps', 'messaging', 'messages', 'texting', 'text', 'screen time',
      'cyberbully', 'cyberbullying', 'sexting', 'nude', 'nudes', 'video call', 'photo', 'photos',
      'stranger', 'strangers', 'murandasi', 'telefone',
    ],
    title: 'Phones, social media and staying safe online',
    text: 'Young people meet a lot of ideas — and a lot of pressure — online. Parents help most by staying curious and calm rather than banning devices outright: ask what apps they enjoy and who they talk to, agree simple rules together, and make clear they can always come to you if a message or photo request makes them uncomfortable, without fear of losing the phone. A child who is not afraid of punishment is far more likely to report something worrying.',
    source: 'Staying safe online — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-emotions',
    topic: 'emotions',
    ageBands: ['10_12', '13_15', '16_19'],
    keywords: [
      'emotion', 'emotions', 'feeling', 'feelings', 'sad', 'angry', 'stress', 'stressed', 'worried',
      'worry', 'anxious', 'anxiety', 'mood', 'moody', 'withdrawn', 'quiet', 'upset', 'crying', 'cry',
      'depressed', 'depression', 'irritable', 'isolating', 'isolated', 'distant', 'lonely', 'loneliness',
      'amarangamutima', 'agahinda',
    ],
    title: 'Big feelings and mood changes',
    text: 'Strong and changing moods are a normal part of growing up. What helps most is a parent who listens without rushing to fix or judge, takes feelings seriously, and keeps showing warmth even when a teen is withdrawn. If low mood, fear, or withdrawal is severe or lasts a long time, or you are ever worried about your child’s safety, reach out to a health worker or counsellor — you do not have to manage it alone.',
    source: 'Supporting your teen’s wellbeing — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-saying-no',
    topic: 'refusal skills',
    ageBands: ['13_15', '16_19'],
    keywords: [
      'say no', 'saying no', 'refuse', 'refusing', 'pressure', 'pressured', 'peers', 'friends want',
      'peer pressure', 'give in', 'giving in', 'stand up', 'assertive', 'assertiveness', 'push back',
      'pushed into', 'kwanga', 'guhatirwa',
    ],
    title: 'Helping a teen say no',
    text: 'Being able to say no — to a friend, a dare, or anyone pushing them — is a skill parents can practise with a child, not just lecture about. Talk through what they could actually say and do, agree a code word they can text you to be picked up from any situation, and reassure them you will not be angry if they call. Knowing they have a way out makes it easier to resist pressure in the moment.',
    source: 'Helping a teen say no — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-self-esteem',
    topic: 'self-esteem',
    ageBands: ['10_12', '13_15', '16_19'],
    keywords: [
      'confidence', 'self-esteem', 'self esteem', 'body image', 'ugly', 'comparison', 'compare',
      'comparing', 'worth', 'self worth', 'self-worth', 'insecure', 'insecurity', 'fat', 'skinny',
      'looks', 'appearance', 'bullied', 'kwiyizera', 'agaciro',
    ],
    title: 'Confidence and body image',
    text: 'Adolescents often compare themselves to others, especially online, and can be hard on their own bodies and abilities. Parents build confidence by noticing effort and character rather than only looks or results, avoiding critical comments about weight or appearance, and reminding a young person that bodies change at different times for everyone. Feeling accepted at home is a strong protection against pressure elsewhere.',
    source: 'Confidence & body image — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-getting-help',
    topic: 'getting help',
    ageBands: ['all'],
    keywords: [
      'help', 'who to ask', 'where to go', 'trusted adult', 'clinic', 'health worker', 'counsellor',
      'don’t know what to do', 'dont know what to do', 'do not know what to do', 'support', 'resource',
      'resources', 'services', 'nurse', 'doctor', 'hospital', 'talk to someone', 'professional help',
      'seek help', 'ubufasha', 'inama',
    ],
    title: 'Finding trusted help',
    text: 'No parent has every answer, and reaching out is a strength, not a failure. Encourage your child to have a few trusted adults besides you — a relative, teacher, community health worker, or counsellor — they can turn to. For health questions, a local health facility or community health worker can give accurate, private guidance. If there is any sign of harm, abuse, or danger, seek help immediately through local child-protection services.',
    source: 'Finding trusted help — reviewed lesson (illustrative, pending clinical review)',
  },

  // ---------------------------------------------------------------------------
  // Entries below are drafted from published research rather than invented, so
  // a reviewer can check them against a named source. They cover the questions
  // parents actually open with — which the original topic-keyed entries missed.
  // Full drafts + provenance: ai/corpus/seed/parent-communication.yaml
  // ---------------------------------------------------------------------------
  {
    id: 'kb-parent-role',
    topic: 'communication',
    ageBands: ['all'],
    keywords: [
      'advice', 'advise', 'guidance', 'guide', 'what should i', 'how do i', 'where do i start',
      'my child', 'my daughter', 'my son', 'adolescent', 'adolescence', 'teenager', 'teen',
      'parent', 'parenting', 'raise', 'raising', 'inama', 'umubyeyi', 'umwana',
    ],
    title: 'What actually helps: being the person they can come to',
    text: 'The most useful thing a parent gives an adolescent is not a perfect explanation — it is being someone safe to ask. The World Health Organization notes that sexuality education is a lifelong process that can begin at home with trusted caregivers, and that consistent messages at home and school reinforce each other. Research on parent–adolescent communication associates open conversation at home with lower risk of adolescent pregnancy. Practically: talk in short ordinary moments rather than one big formal talk, answer the question that was actually asked, and let them see that asking is welcome.',
    source: 'WHO, Comprehensive sexuality education fact sheet (11 Mar 2026); Uwambaje et al., Rwanda J. Medicine & Health Sciences, 2025 — pending clinical review',
  },
  {
    id: 'kb-fear',
    topic: 'communication',
    ageBands: ['all'],
    keywords: [
      'warn', 'warning', 'warnings', 'scare', 'scared', 'strict', 'punish', 'forbid',
      'abstinence', 'danger', 'dangers', 'lecture', 'shout', 'angry', 'guhana', 'gutera ubwoba',
    ],
    title: 'Why warnings alone tend not to work',
    text: 'Asked what their parents told them about sex, adolescents in a 2025 Rwandan study most often described warnings — dangers, diseases, and "don\'t". Many said this made them stop asking questions rather than stop taking risks, so they took their questions to friends or the internet instead. The WHO\'s evidence review points the same way: programmes covering both delaying sex and how to stay safe are more effective than abstinence-only messages, and being open does not encourage earlier sexual activity. This does not mean abandoning your values — it means stating them and still answering the question.',
    source: 'Uwambaje et al., Rwanda J. Medicine & Health Sciences, 2025; WHO CSE fact sheet (11 Mar 2026) — pending clinical review',
  },
  {
    id: 'kb-start-early',
    topic: 'communication',
    ageBands: ['10_12', '13_15'],
    keywords: [
      'when', 'what age', 'how old', 'too young', 'too early', 'right time', 'ready',
      'ryari', 'imyaka',
    ],
    title: 'When to start — earlier than most parents expect',
    text: 'Adolescents in the 2025 Rwandan study said conversations often came too late, sometimes only after a girl had already begun menstruating. Guidance for parents is consistent on this: some girls begin puberty at 8 and some boys by 9, so these talks may need to start earlier than expected, and they work best as an ongoing series of small conversations rather than one event. Starting early does not push a child towards sex — the WHO states plainly that good sexuality education does not increase sexual activity or encourage earlier sexual behaviour.',
    source: 'Uwambaje et al., 2025; Nemours KidsHealth, Talking to Your Child About Puberty; WHO CSE fact sheet (11 Mar 2026) — pending clinical review',
  },
  {
    id: 'kb-dont-know',
    topic: 'communication',
    ageBands: ['all'],
    keywords: [
      'don’t know', 'dont know', 'do not know', 'not sure', 'unsure', 'wrong answer',
      'embarrassed', 'embarrassing', 'awkward', 'ashamed', 'shy', 'nervous', 'ipfunwe', 'isoni',
    ],
    title: 'When you don’t know the answer, or it feels awkward',
    text: 'Not knowing is normal and is not a failure. Saying "I don\'t know — let me find out" keeps a child\'s trust; guessing loses it, and for health questions a community health worker or local facility can give an accurate answer. If the topic itself feels uncomfortable, it can help to practise what you want to say beforehand, and to name the awkwardness out loud: many parents find that saying "this was never discussed with me either, but I would rather you heard it from me" turns embarrassment into something honest rather than something that ends the conversation.',
    source: 'Nemours KidsHealth, Talking to Your Child About Puberty; Uwambaje et al., 2025 — pending clinical review',
  },
  {
    id: 'kb-not-accusing',
    topic: 'communication',
    ageBands: ['all'],
    keywords: [
      'asked me', 'she asked', 'he asked', 'why is she asking', 'already doing',
      'is she active', 'suspect', 'worried she', 'worried he', 'accuse',
    ],
    title: 'A question is not a confession',
    text: 'One of the things adolescents in the 2025 study said silenced them fastest was a parent assuming that asking about sex meant they were already having it. If a question alarms you, it usually helps to answer it first — briefly and honestly — then ask what made them curious, without accusation, and make clear they can come back with more. Guidance for parents makes the same point from the other side: do not assume what a child already knows; ask them.',
    source: 'Uwambaje et al., Rwanda J. Medicine & Health Sciences, 2025; Nemours KidsHealth — pending clinical review',
  },
  {
    id: 'kb-fathers',
    topic: 'communication',
    ageBands: ['all'],
    keywords: [
      'father', 'fathers', 'dad', 'papa', 'man', 'as a man', 'stepfather', 'guardian', 'husband',
      'se', 'data', 'umubyeyi w’umugabo',
    ],
    title: 'For fathers — being someone your child can approach',
    text: 'Adolescents in the 2025 Rwandan study described fathers as strict and intimidating, and said this made them much less likely to raise anything about their bodies or relationships; often those conversations happened only with mothers, if at all. That is what young people reported experiencing, not a statement about what fathers are — and it means small changes are noticeable. Being the one who asks about their day, reacting calmly the first time something awkward comes up, and being willing to say you find the topic difficult all matter. Adolescents in the same study said they valued parents sharing their own experience, describing it as making the conversation feel safe.',
    source: 'Uwambaje et al., Rwanda J. Medicine & Health Sciences, 2025 — pending clinical review',
  },
];

/**
 * Chunks that answer a broad "how do I approach this at all?" question.
 *
 * Without this, the single most likely opening question a parent asks — "what
 * advice can I give my teenager?" — matched no topic keyword, scored zero, and
 * was refused. That refusal was never a safety win: it's general communication
 * guidance the corpus *does* cover, just not under any one topic word.
 */
export const GENERAL_CHUNK_IDS = ['kb-communication', 'kb-parent-role', 'kb-fear', 'kb-getting-help'];

const GENERAL_CHUNKS = GENERAL_CHUNK_IDS.map((id) => KB.find((c) => c.id === id)).filter(
  (c): c is KbChunk => c !== undefined,
);
const SPECIFIC_CHUNKS = KB.filter((c) => !GENERAL_CHUNK_IDS.includes(c.id));

/** Retrieve approved source chunks for a parent's question (top 3, scored). */
export function retrieveKb(question: string, ageBand: string): KbChunk[] {
  return retrieveWithFallback(question, ageBand, SPECIFIC_CHUNKS, GENERAL_CHUNKS);
}
