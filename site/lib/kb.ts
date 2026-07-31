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
    keywords: ['talk', 'talking', 'conversation', 'start', 'begin', 'discuss', 'nganire', 'kuvugana', 'kuganira', 'ikiganiro'],
    title: 'Talking with your teen',
    text: 'A parent does not need perfect words — they need to be a safe person to come to. Short, calm, everyday moments (walking, cooking, doing chores together) work far better than one big formal "talk". Listening without reacting harshly, and admitting when you do not know something, keeps the door open so a young person keeps coming back.',
    source: 'Talking with your teen — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-puberty',
    topic: 'puberty',
    ageBands: ['10_12', '13_15', '16_19'],
    keywords: ['period', 'periods', 'menstrua', 'menstruation', 'puberty', 'body', 'growing', 'changes', 'imihango', 'ukwezi', 'ubukure'],
    title: 'Puberty and the body',
    text: 'Puberty and menstruation are normal, healthy signs that a young body is growing up. They are nothing to be ashamed of. Talking about them openly, in plain language and without fear, helps a young person feel safe and prepared rather than scared or secretive. Reassure them that what they are experiencing is expected and that they can always ask you.',
    source: 'Puberty & the body — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-consent',
    topic: 'consent',
    ageBands: ['all'],
    keywords: ['consent', 'boundaries', 'boundary', 'no means', 'body', 'safe', 'touch', 'kwemera', 'imbibi'],
    title: 'Consent and healthy boundaries',
    text: 'Consent means everyone freely agrees, every time — and anyone can say no at any point, even to someone they know. Teaching a child that their body is their own, that "no" must always be respected, and that they can tell a trusted adult about anything that makes them uncomfortable is one of the strongest ways to keep them safe.',
    source: 'Consent & healthy boundaries — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-myths',
    topic: 'myths',
    ageBands: ['13_15', '16_19'],
    keywords: ['myth', 'myths', 'rumour', 'rumor', 'true that', 'friend said', 'imigenzo', 'ibihuha', 'ikinyoma'],
    title: 'Answering myths calmly',
    text: 'Many worries young people carry come from myths shared by friends or online. Correcting these calmly, with accurate and respectful information rather than punishment or shame, builds trust. When a child feels they can check things with a parent without being judged, they rely less on unreliable sources.',
    source: 'Common myths, answered — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-relationships',
    topic: 'relationships',
    ageBands: ['13_15', '16_19'],
    keywords: ['relationship', 'relationships', 'dating', 'friend', 'friends', 'peer', 'pressure', 'love', 'imibanire', 'urukundo'],
    title: 'Healthy relationships and peer pressure',
    text: 'Adolescents learn a lot about relationships from their peers. Parents help by talking about what respect, honesty, and safety look like in any friendship or relationship, and by making clear the young person can walk away from anything that feels wrong. Naming peer pressure openly makes it easier for a teen to resist it.',
    source: 'Healthy relationships — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-online',
    topic: 'online safety',
    ageBands: ['10_12', '13_15', '16_19'],
    keywords: ['online', 'internet', 'social media', 'phone', 'whatsapp', 'tiktok', 'photo', 'photos', 'stranger', 'strangers', 'murandasi', 'telefone'],
    title: 'Phones, social media and staying safe online',
    text: 'Young people meet a lot of ideas — and a lot of pressure — online. Parents help most by staying curious and calm rather than banning devices outright: ask what apps they enjoy and who they talk to, agree simple rules together, and make clear they can always come to you if a message or photo request makes them uncomfortable, without fear of losing the phone. A child who is not afraid of punishment is far more likely to report something worrying.',
    source: 'Staying safe online — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-emotions',
    topic: 'emotions',
    ageBands: ['10_12', '13_15', '16_19'],
    keywords: ['emotion', 'emotions', 'feeling', 'feelings', 'sad', 'angry', 'stress', 'stressed', 'worried', 'anxious', 'mood', 'withdrawn', 'quiet', 'amarangamutima', 'agahinda'],
    title: 'Big feelings and mood changes',
    text: 'Strong and changing moods are a normal part of growing up. What helps most is a parent who listens without rushing to fix or judge, takes feelings seriously, and keeps showing warmth even when a teen is withdrawn. If low mood, fear, or withdrawal is severe or lasts a long time, or you are ever worried about your child’s safety, reach out to a health worker or counsellor — you do not have to manage it alone.',
    source: 'Supporting your teen’s wellbeing — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-saying-no',
    topic: 'refusal skills',
    ageBands: ['13_15', '16_19'],
    keywords: ['say no', 'saying no', 'refuse', 'pressure', 'pressured', 'peers', 'friends want', 'kwanga', 'guhatirwa'],
    title: 'Helping a teen say no',
    text: 'Being able to say no — to a friend, a dare, or anyone pushing them — is a skill parents can practise with a child, not just lecture about. Talk through what they could actually say and do, agree a code word they can text you to be picked up from any situation, and reassure them you will not be angry if they call. Knowing they have a way out makes it easier to resist pressure in the moment.',
    source: 'Helping a teen say no — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-self-esteem',
    topic: 'self-esteem',
    ageBands: ['10_12', '13_15', '16_19'],
    keywords: ['confidence', 'self-esteem', 'self esteem', 'body image', 'ugly', 'comparison', 'compare', 'worth', 'kwiyizera', 'agaciro'],
    title: 'Confidence and body image',
    text: 'Adolescents often compare themselves to others, especially online, and can be hard on their own bodies and abilities. Parents build confidence by noticing effort and character rather than only looks or results, avoiding critical comments about weight or appearance, and reminding a young person that bodies change at different times for everyone. Feeling accepted at home is a strong protection against pressure elsewhere.',
    source: 'Confidence & body image — reviewed lesson (illustrative, pending clinical review)',
  },
  {
    id: 'kb-getting-help',
    topic: 'getting help',
    ageBands: ['all'],
    keywords: ['help', 'who to ask', 'where to go', 'trusted adult', 'clinic', 'health worker', 'counsellor', 'don’t know what to do', 'ubufasha', 'inama'],
    title: 'Finding trusted help',
    text: 'No parent has every answer, and reaching out is a strength, not a failure. Encourage your child to have a few trusted adults besides you — a relative, teacher, community health worker, or counsellor — they can turn to. For health questions, a local health facility or community health worker can give accurate, private guidance. If there is any sign of harm, abuse, or danger, seek help immediately through local child-protection services.',
    source: 'Finding trusted help — reviewed lesson (illustrative, pending clinical review)',
  },
];
