/**
 * Coach client for the public site.
 *
 * SAFETY MODEL (see docs/ai/ai-architecture.md + CLAUDE.md):
 *  - The live coach answers ONLY from an approved, clinically & culturally
 *    reviewed knowledge base (RAG). It never generates health answers from an
 *    open model. This module therefore does NOT call any LLM. When a real
 *    backend is configured (NEXT_PUBLIC_API_BASE), questions are forwarded to
 *    it and it stays the sole source of answers.
 *  - With no backend configured, we render a clearly-labelled DEMO: a small set
 *    of fixed, source-cited sample answers, an honest refusal for anything
 *    unmatched, and a safeguarding referral panel. No generation, ever.
 *  - Nothing is stored: no names, no identifiers, no transcript persistence
 *    (Law No. 058/2021 data minimisation).
 */

import { KB, GENERAL_CHUNK_IDS } from './kb';
import { retrieveTiered } from './retrieval';
import { requiresRefusal } from './refusal';
import { isCrisis } from './crisis';

export type Lang = 'en' | 'rw';
export type AgeBand = '10_12' | '13_15' | '16_19';
export type ReplyKind = 'answer' | 'refusal' | 'referral';

export interface CoachReply {
  kind: ReplyKind;
  answer: string;
  starter?: string;
  source?: string;
  /** A suggested next question, offered as a chip once this answer is shown
   *  (grounded replies only — never on a refusal or referral). */
  followUp?: string;
}

interface Entry {
  /** Must match a lib/kb.ts chunk id — keywords are sourced from there so
   *  this file and the real coach route can never drift apart on what a
   *  question matches (see lib/retrieval.ts for why that happened once). */
  id: string;
  en: CoachReply;
  rw: CoachReply;
}

// A deliberately tiny, fixed sample set — illustrative of the grounded,
// source-cited style, NOT the real knowledge base.
const DEMO_KB: Entry[] = [
  {
    id: 'kb-puberty',
    en: {
      kind: 'answer',
      answer:
        'Menstruation is a normal, healthy sign that a girl’s body is growing up. It is nothing to be ashamed of, and talking about it openly helps a young person feel safe rather than scared.',
      starter: 'Opener: “When you first got your period, did you know what was happening? I want you to always feel you can ask me anything.”',
      source: 'Approved source: Puberty & the body — reviewed lesson (illustrative)',
    },
    rw: {
      kind: 'answer',
      answer:
        'Imihango ni ikimenyetso gisanzwe kandi cyiza cyerekana ko umubiri w’umukobwa urakura. Nta soni bikwiye guteza, kandi kubiganiraho mu mucyo bituma umwana yumva afite umutekano aho kugira ubwoba.',
      starter: 'Intangiriro: “Igihe wabona imihango bwa mbere, wari uzi ibiriho? Nshaka ko wumva ushobora kumbaza icyo ari cyo cyose.”',
      source: 'Inkomoko yemejwe: Ubukure n’umubiri — isomo ryasuzumwe (urugero)',
    },
  },
  {
    id: 'kb-consent',
    en: {
      kind: 'answer',
      answer:
        'Consent means everyone freely agrees, every time — and anyone can say no at any point. Teaching a child that their body is theirs, and that “no” must always be respected, is one of the strongest ways to keep them safe.',
      starter: 'Opener: “You’re always allowed to say no to a touch you don’t want — even from someone you know. I’ll always believe you.”',
      source: 'Approved source: Consent & healthy boundaries — reviewed lesson (illustrative)',
    },
    rw: {
      kind: 'answer',
      answer:
        'Kwemerera bivuze ko buri wese yemera ku bushake bwe, buri gihe — kandi umuntu wese ashobora kwanga igihe icyo ari cyo cyose. Kwigisha umwana ko umubiri we ari uwe, kandi ko “oya” igomba kubahirizwa, ni bumwe mu buryo bukomeye bwo kumurinda.',
      starter: 'Intangiriro: “Ufite uburenganzira bwo kwanga gukorwaho utabishaka — n’umuntu uzi. Nzajya nkwizera buri gihe.”',
      source: 'Inkomoko yemejwe: Kwemera n’imbibi zizima — isomo ryasuzumwe (urugero)',
    },
  },
  {
    id: 'kb-communication',
    en: {
      kind: 'answer',
      answer:
        'You don’t need the perfect words — you need to be a safe person to come to. Short, calm, everyday moments (walking, cooking) work far better than one big “talk”. Listening without reacting harshly keeps the door open.',
      starter: 'Opener: “I might not know every answer, but you can always come to me and we’ll find it out together.”',
      source: 'Approved source: Talking with your teen — reviewed lesson (illustrative)',
    },
    rw: {
      kind: 'answer',
      answer:
        'Ntukeneye amagambo atunganye — ukeneye kuba umuntu umwana yakwegera adafite ubwoba. Kaganiro gato mu bihe bisanzwe (kugenda, guteka) kagira akamaro kurusha “ikiganiro” kimwe kinini. Kumva utarakaye bituma umuryango uguma ufunguye.',
      starter: 'Intangiriro: “Nshobora kutamenya buri gisubizo, ariko ushobora kunzaho igihe cyose tukagishakira hamwe.”',
      source: 'Inkomoko yemejwe: Kuganira n’umwana wawe — isomo ryasuzumwe (urugero)',
    },
  },
  {
    id: 'kb-myths',
    en: {
      kind: 'answer',
      answer:
        'Many worries young people carry come from myths shared by friends. Calmly correcting these with accurate, respectful information — rather than punishment — builds trust and keeps them coming back to you for the truth.',
      starter: 'Opener: “Where did you hear that? Let’s look at what’s actually true together — you can always check things with me.”',
      source: 'Approved source: Common myths, answered — reviewed lesson (illustrative)',
    },
    rw: {
      kind: 'answer',
      answer:
        'Impungenge nyinshi urubyiruko rugira ziva ku bihuha bakwirakwiza hagati yabo. Kubikosora mu mutuzo n’amakuru y’ukuri kandi yubaha — aho guhana — byubaka icyizere kandi bigatuma bagaruka kuri wowe bashaka ukuri.',
      starter: 'Intangiriro: “Wabyumvise he? Reka turebe hamwe icyo ari ukuri — ushobora kugenzura ibintu kuri njye igihe cyose.”',
      source: 'Inkomoko yemejwe: Ibihuha bisanzwe, birasubizwa — isomo ryasuzumwe (urugero)',
    },
  },
  {
    id: 'kb-relationships',
    en: {
      kind: 'answer',
      answer:
        'Teens learn about relationships mostly from friends. You help by talking plainly about what respect and safety look like, and by making sure your child knows they can walk away from anything that feels wrong — and always come to you.',
      starter: 'Opener: “A good relationship should make you feel respected and safe. If one ever doesn’t, you can always talk to me — I won’t judge you.”',
      source: 'Approved source: Healthy relationships — reviewed lesson (illustrative)',
    },
    rw: {
      kind: 'answer',
      answer:
        'Urubyiruko rwiga ku mibanire cyane cyane ku nshuti. Umufasha mu kuvuga mu buryo bworoshye icyo icyubahiro n’umutekano bisobanura, no kwemeza umwana ko ashobora kuva mu kintu cyose kimubabaza, akaza kuri wowe.',
      starter: 'Intangiriro: “Imibanire myiza igomba gutuma wumva wubashywe kandi ufite umutekano. Igihe bitameze bityo, ushobora kumbwira — sinzagucira urubanza.”',
      source: 'Inkomoko yemejwe: Imibanire myiza — isomo ryasuzumwe (urugero)',
    },
  },
  {
    id: 'kb-online',
    en: {
      kind: 'answer',
      answer:
        'Banning phones often backfires; staying curious works better. Ask what apps they like and who they chat with, agree simple rules together, and make sure they know they can come to you about any uncomfortable message or photo request without losing the phone.',
      starter: 'Opener: “If anyone online ever asks for a photo or makes you uncomfortable, you can show me — you won’t be in trouble, and I’ll help.”',
      source: 'Approved source: Staying safe online — reviewed lesson (illustrative)',
    },
    rw: {
      kind: 'answer',
      answer:
        'Kubuza telefone akenshi ntibigira akamaro; kwitabira ukibaza biraruta. Baza porogaramu bakunda n’abo baganira na bo, mwumvikane amategeko yoroshye, kandi bamenye ko bashobora kuza kuri wowe ku butumwa cyangwa ifoto ibateye impungenge batabuze telefone.',
      starter: 'Intangiriro: “Niba hari umuntu ku murandasi agusabye ifoto cyangwa akakubabaza, ushobora kunyereka — ntacyo uzaba wakoze, kandi nzagufasha.”',
      source: 'Inkomoko yemejwe: Kwirinda ku murandasi — isomo ryasuzumwe (urugero)',
    },
  },
  {
    id: 'kb-emotions',
    en: {
      kind: 'answer',
      answer:
        'Big, changing moods are a normal part of growing up. Listening without rushing to fix or judge, and staying warm even when your teen is withdrawn, helps most. If low mood or fear is severe or lasts a long time, reach out to a health worker or counsellor — you don’t have to manage it alone.',
      starter: 'Opener: “I’ve noticed you seem down lately. I’m not here to fix it or judge — I just want to listen whenever you’re ready.”',
      source: 'Approved source: Supporting your teen’s wellbeing — reviewed lesson (illustrative)',
    },
    rw: {
      kind: 'answer',
      answer:
        'Amarangamutima ahindagurika ni ibisanzwe mu gukura. Kumva utihutira gukemura cyangwa gucira urubanza, no kuguma wereka urukundo n’igihe umwana yihebaye, ni byo bifasha cyane. Niba agahinda cyangwa ubwoba bukabije cyangwa bumaze igihe kinini, egera umuganga cyangwa umujyanama — ntugomba kubyikorera wenyine.',
      starter: 'Intangiriro: “Mbonye usa n’ufite agahinda vuba aha. Sinaje gukemura cyangwa gucira urubanza — nshaka kukumva igihe cyose witeguye.”',
      source: 'Inkomoko yemejwe: Gushyigikira imibereho y’umwana — isomo ryasuzumwe (urugero)',
    },
  },
  {
    id: 'kb-saying-no',
    en: {
      kind: 'answer',
      answer:
        'Saying no is a skill you can practise together, not just lecture about. Talk through what they could actually say, and agree a code word they can text you to be picked up from any situation — and promise you won’t be angry if they call.',
      starter: 'Opener: “If you’re ever somewhere you want to leave, text me our code word and I’ll come — no questions, no anger.”',
      source: 'Approved source: Helping a teen say no — reviewed lesson (illustrative)',
    },
    rw: {
      kind: 'answer',
      answer:
        'Kwanga ni ubuhanga mwakwimenyereza hamwe, atari ukubihanurira gusa. Muganire ku byo bashobora kuvuga, kandi mwumvikane ijambo ry’ibanga bakohereza kuri wowe kugira ngo ubatware aho bari hose — umusezeranye ko utazarakara batelefonye.',
      starter: 'Intangiriro: “Niba uri ahantu ushaka kuva, nyoherereza ijambo ryacu ry’ibanga nzaze — nta bibazo, nta uburakari.”',
      source: 'Inkomoko yemejwe: Gufasha umwana kwanga — isomo ryasuzumwe (urugero)',
    },
  },
  {
    id: 'kb-self-esteem',
    en: {
      kind: 'answer',
      answer:
        'Teens often compare themselves to others and can be hard on their bodies. You build confidence by noticing effort and character rather than just looks, avoiding comments about weight or appearance, and reminding them that bodies change at different times for everyone.',
      starter: 'Opener: “I’m proud of how hard you tried at that — that matters to me far more than how anything looks.”',
      source: 'Approved source: Confidence & body image — reviewed lesson (illustrative)',
    },
    rw: {
      kind: 'answer',
      answer:
        'Urubyiruko rwigereranya n’abandi kandi rushobora kwikandagira ku mubiri. Wubaka kwiyizera mu gushimira imihati n’imico aho kwita ku isura gusa, wirinda kuvuga ku ibiro cyangwa isura, kandi ubibutsa ko umubiri uhinduka mu bihe bitandukanye kuri buri wese.',
      starter: 'Intangiriro: “Ndishimira uko wagerageje cyane — ibyo bimfitiye agaciro kurusha uko ikintu icyo ari cyo cyose kigaragara.”',
      source: 'Inkomoko yemejwe: Kwiyizera n’isura y’umubiri — isomo ryasuzumwe (urugero)',
    },
  },
  {
    id: 'kb-getting-help',
    en: {
      kind: 'answer',
      answer:
        'No parent has every answer, and reaching out is a strength. Help your child have a few trusted adults besides you — a relative, teacher, or community health worker. For health questions, a local health facility can give accurate, private guidance.',
      starter: 'Opener: “You can always come to me — and it’s also good to have other trusted people, like a nurse or teacher, you can talk to.”',
      source: 'Approved source: Finding trusted help — reviewed lesson (illustrative)',
    },
    rw: {
      kind: 'answer',
      answer:
        'Nta mubyeyi ufite ibisubizo byose, kandi gushaka ubufasha ni imbaraga. Fasha umwana wawe kugira abantu bake yizeye usibye wowe — umuvandimwe, umwarimu, cyangwa umujyanama w’ubuzima. Ku bibazo by’ubuzima, ivuriro rya hafi ritanga inama nyazo kandi mu ibanga.',
      starter: 'Intangiriro: “Ushobora kuza kuri njye igihe cyose — kandi ni byiza kugira abandi bantu wizeye, nk’umuforomo cyangwa umwarimu, wavugana na bo.”',
      source: 'Inkomoko yemejwe: Gushaka ubufasha bwizewe — isomo ryasuzumwe (urugero)',
    },
  },

  // ---------------------------------------------------------------------------
  // Mirrors the 6 research-drafted entries added to lib/kb.ts this session
  // (provenance: WHO CSE fact sheet; Uwambaje et al. 2025 — see kb.ts). These
  // cover the questions parents actually open with, which the original
  // topic-keyed entries above missed entirely in this demo path.
  // ---------------------------------------------------------------------------
  {
    id: 'kb-parent-role',
    en: {
      kind: 'answer',
      answer:
        'You don’t need to have every answer — the most powerful thing you give your child is being someone safe to come to. Talk in short, ordinary moments rather than one big formal “talk”, and answer the question they actually asked.',
      starter: 'Opener: “I want you to always feel you can ask me anything — even if I don’t know the answer right away, we can find out together.”',
      source: 'Approved source: Being the person they can come to — reviewed lesson (illustrative)',
    },
    rw: {
      kind: 'answer',
      answer:
        'Ntugomba kugira ibisubizo byose — ikintu gikomeye kurusha ibindi wafasha umwana wawe ni ukuba umuntu yizera kwegera. Vuganira na we mu bihe bisanzwe bigufi aho kugira “ikiganiro” kimwe kinini, kandi umusubize ikibazo nyacyo yabajije.',
      starter: 'Intangiriro: “Nshaka ko wumva ushobora kumbaza ikintu icyo ari cyo cyose — n’iyo ntamenye igisubizo ubu, tuzagishakira hamwe.”',
      source: 'Inkomoko yemejwe: Kuba umuntu umwana yizera kwegera — isomo ryasuzumwe (urugero)',
    },
  },
  {
    id: 'kb-fear',
    en: {
      kind: 'answer',
      answer:
        'Warnings alone — dangers, diseases, “don’t” — tend to make a teen stop asking questions, not stop taking risks; they just take their questions elsewhere. Stating your values and still answering the question works better than a lecture.',
      starter: 'Opener: “I’m not here to scare you or catch you out — I’d rather you ask me anything than find an answer somewhere less safe.”',
      source: 'Approved source: Why warnings alone tend not to work — reviewed lesson (illustrative)',
    },
    rw: {
      kind: 'answer',
      answer:
        'Kuburira gusa — akaga, indwara, “ntugakore” — akenshi bituma umwana ahagarika kubaza ibibazo, aho guhagarika kwifuza kugerageza; ahubwo asanga ibisubizo ahandi. Kubwira umwana agaciro wemera ukanamusubiza ikibazo cye biruta guhanura gusa.',
      starter: 'Intangiriro: “Sinaje kugutera ubwoba cyangwa kukugenza — nifuza ko umbaza ikintu icyo ari cyo cyose aho gushaka igisubizo ahandi hatari umutekano.”',
      source: 'Inkomoko yemejwe: Impamvu kuburira gusa bidahagije — isomo ryasuzumwe (urugero)',
    },
  },
  {
    id: 'kb-start-early',
    en: {
      kind: 'answer',
      answer:
        'These conversations can start earlier than most parents expect — some girls begin puberty around 8 and some boys around 9. Starting early doesn’t push a child towards anything; it works best as an ongoing series of small talks, not one event.',
      starter: 'Opener: “There’s no such thing as too early with me — you can ask about your body or growing up whenever it’s on your mind.”',
      source: 'Approved source: When to start — reviewed lesson (illustrative)',
    },
    rw: {
      kind: 'answer',
      answer:
        'Ibiganiro nk’ibi bishobora gutangira hakiri kare kurusha uko abenshi babyibwira — abakobwa bamwe batangira ubukure bafite imyaka 8, abahungu bamwe bakaba bafite 9. Gutangira kare ntibisunika umwana ku kintu icyo ari cyo cyose; birushaho gukora neza iyo biba ibiganiro bito bikomeza, atari igikorwa kimwe.',
      starter: 'Intangiriro: “Nta “hakiri kare cyane” hariho kuri njye — ushobora kumbaza ku mubiri wawe cyangwa ku bukure igihe cyose ubyibwira.”',
      source: 'Inkomoko yemejwe: Igihe cyo gutangira — isomo ryasuzumwe (urugero)',
    },
  },
  {
    id: 'kb-dont-know',
    en: {
      kind: 'answer',
      answer:
        'Not knowing is normal, not a failure. Saying “I don’t know — let me find out” keeps your child’s trust; guessing loses it. If the topic feels awkward, naming that out loud — “this wasn’t discussed with me either, but I’d rather you heard it from me” — can turn embarrassment into something honest.',
      starter: 'Opener: “I don’t know everything, and this feels a little new for me too — but I’d rather figure it out with you than leave you without an answer.”',
      source: 'Approved source: When you don’t know the answer — reviewed lesson (illustrative)',
    },
    rw: {
      kind: 'answer',
      answer:
        'Kutamenya ni ibisanzwe, ntabwo ari ikinyoma. Kuvuga ngo “simbizi — reka mbibaze” bigumana icyizere cy’umwana wawe; kwivugira ibitari byo bikibitakaza. Niba ikibazo gitera isoni, kubivuga uko biri — “na njye ntabwo nabimbwiwe, ariko nifuza ko unyumva” — bishobora guhindura isoni kuba ukuri.',
      starter: 'Intangiriro: “Simbizi byose, kandi na njye biransa nk’ibishya — ariko nifuza kubishakira hamwe naho kukureka udafite igisubizo.”',
      source: 'Inkomoko yemejwe: Igihe utazi igisubizo — isomo ryasuzumwe (urugero)',
    },
  },
  {
    id: 'kb-not-accusing',
    en: {
      kind: 'answer',
      answer:
        'A question is not a confession. If something your child asks alarms you, answer it first — briefly and honestly — then ask what made them curious, without accusing them of already doing it. Assuming they’re “already active” is one of the fastest ways to make a teen stop asking altogether.',
      starter: 'Opener: “Thank you for asking me that — you’re not in trouble. What made you think about it?”',
      source: 'Approved source: A question is not a confession — reviewed lesson (illustrative)',
    },
    rw: {
      kind: 'answer',
      answer:
        'Ikibazo si ukwemera ko wakoze ikintu. Niba ikibazo umwana wawe abajije kigutangaje, banza umusubize — mu magambo make kandi y’ukuri — hanyuma umubaze icyamuteye kubyibaza, utamucira urubanza ko ari “yarabikoze”. Kwibwira ko umwana “amaze gukora” ni bumwe mu buryo bwihuse bwo gutuma ahagarika kubaza rwose.',
      starter: 'Intangiriro: “Urakoze kumbaza ibyo — nta kibazo ufite. Ni iki cyagutumye kubyibaza?”',
      source: 'Inkomoko yemejwe: Ikibazo si ukwemera — isomo ryasuzumwe (urugero)',
    },
  },
  {
    id: 'kb-fathers',
    en: {
      kind: 'answer',
      answer:
        'Adolescents often describe fathers as strict or intimidating, which can make them far less likely to raise anything about their bodies or relationships. Small changes matter: asking about their day, staying calm the first time something awkward comes up, and being willing to say you find the topic difficult too.',
      starter: 'Opener: “I know I can come across as strict, but you can always talk to me about anything — I want to hear it, even if it’s awkward.”',
      source: 'Approved source: For fathers — reviewed lesson (illustrative)',
    },
    rw: {
      kind: 'answer',
      answer:
        'Urubyiruko akenshi rubona ba se nk’abakaze cyangwa batinywa, bikaviramo kutabwira se ibirebana n’imibiri yabo cyangwa imibanire yabo. Impinduka nto zirafite akamaro: kubaza uko umunsi wagenze, kuguma mu mutuzo igihe ikintu gitangaje kivutse ku ncuro ya mbere, no kwemera kuvuga ko na wowe ubona ikibazo ari ikigoye.',
      starter: 'Intangiriro: “Nzi ko nshobora kugaragara nk’ukaze, ariko ushobora kumbwira ikintu icyo ari cyo cyose igihe cyose — nshaka kubyumva, n’iyo byaba bigoye.”',
      source: 'Inkomoko yemejwe: Kubw’ababyeyi b’abagabo — isomo ryasuzumwe (urugero)',
    },
  },
];

/**
 * Retrievable view of DEMO_KB, sourced from lib/kb.ts by id. Fails fast at
 * module load if an id above doesn't exist in kb.ts, rather than silently
 * dropping that entry from matching (exactly the kind of drift that let this
 * demo fall behind the real coach route once already).
 */
const DEMO_RETRIEVABLE = DEMO_KB.map((entry) => {
  const chunk = KB.find((c) => c.id === entry.id);
  if (!chunk) {
    throw new Error(`lib/coach.ts: DEMO_KB entry "${entry.id}" has no matching lib/kb.ts chunk`);
  }
  return { id: entry.id, keywords: chunk.keywords, ageBands: ['all'] };
});

// Same two-tier split as lib/kb.ts's retrieveKb: broad "how do I approach
// this at all?" entries only compete once no specific topic matched, so they
// can't drown out a specific match on incidental generic-word overlap.
const DEMO_GENERAL = DEMO_RETRIEVABLE.filter((c) => GENERAL_CHUNK_IDS.includes(c.id));
const DEMO_SPECIFIC = DEMO_RETRIEVABLE.filter((c) => !GENERAL_CHUNK_IDS.includes(c.id));

const REFUSAL: Record<Lang, CoachReply> = {
  en: {
    kind: 'refusal',
    answer:
      'I don’t have an approved answer for that yet — and I won’t guess, because a wrong answer here could cause harm. In the live service I’d point you to a trained person or a reviewed lesson instead.',
    source: 'A refusal is a success here when the alternative is an unsafe answer.',
  },
  rw: {
    kind: 'refusal',
    answer:
      'Nta gisubizo cyemejwe mfite kuri ibyo — kandi sinakeka, kubera ko igisubizo kitari cyo cyatera ingaruka. Muri serivisi nyayo, nakwereka umuntu wabihuguriwe cyangwa isomo ryasuzumwe.',
    source: 'Kwanga gusubiza ni intsinzi iyo ikindi cyari igisubizo kitizewe.',
  },
};

const REFERRAL: Record<Lang, CoachReply> = {
  en: {
    kind: 'referral',
    answer:
      'Thank you for telling me. If you or a young person is in danger or has been harmed, you deserve real support right now. The app and SMS service connect you to your district’s child-protection and health contacts (such as Isange One Stop Centres) — no login and no name required.',
    source: 'Your safety comes first. This site doesn’t list numbers so you always get the current, correct one for where you are.',
  },
  rw: {
    kind: 'referral',
    answer:
      'Urakoze kubimbwira. Niba wowe cyangwa umwana ari mu kaga cyangwa yagizweho nabi, ukwiye ubufasha nyabwo nonaha. Porogaramu na SMS bikwegereza abashinzwe kurinda abana n’ubuzima mu karere kawe (nka Isange One Stop Centres) — nta kwinjira kandi nta zina bisaba.',
    source: 'Umutekano wawe uza mbere. Uru rubuga ntirutanga nimero kugira ngo uhabwe iyo nyayo iriho aho uri.',
  },
};

const GREETING = ['hello', 'hi ', 'hey', 'hi!', 'hi.', 'good morning', 'good afternoon', 'good evening', 'muraho', 'mwaramutse', 'mwiriwe'];
const THANKS = ['thank', 'thanks', 'murakoze', 'ok thanks', 'great thanks'];

const CONVO_GREETING: Record<Lang, CoachReply> = {
  en: {
    kind: 'answer',
    answer: 'Hello, I’m really glad you’re here. I’m your parenting coach — you can ask me anything about talking with your child, and we’ll take it one step at a time. What’s on your mind?',
  },
  rw: {
    kind: 'answer',
    answer: 'Muraho, nishimiye ko uri hano. Ndi umujyanama wawe mu burera — ushobora kumbaza ikintu icyo ari cyo cyose ku kuvugana n’umwana wawe, tuzagenda gahoro gahoro. Ni iki kikuri ku mutima?',
  },
};

const CONVO_THANKS: Record<Lang, CoachReply> = {
  en: {
    kind: 'answer',
    answer: 'You’re very welcome. Just by asking, you’re already doing a caring thing for your child — I’m here whenever you need me.',
  },
  rw: {
    kind: 'answer',
    answer: 'Nta kibazo, nishimiye kugufasha. Mu kubaza gusa, urimo gukorera umwana wawe ikintu cyiza — ndi hano igihe cyose ukeneye.',
  },
};

/** Exported for testing — this is the logic the no-key demo path runs. */
export function demoReply(question: string, lang: Lang): CoachReply {
  if (isCrisis(question)) return REFERRAL[lang];
  // NFR-21: this path has no model and no grounding check behind it — this
  // gate is its only defence against a dosing/diagnosis/termination question
  // matching some topic keyword below and getting a canned "answer".
  if (requiresRefusal(question)) return REFUSAL[lang];
  const q = question.toLowerCase().trim();
  // Health topics take priority (grounded demo answers).
  const matches = retrieveTiered(q, 'all', DEMO_SPECIFIC, DEMO_GENERAL);
  if (matches.length > 0) {
    const entry = DEMO_KB.find((e) => e.id === matches[0]!.id);
    const chunk = KB.find((c) => c.id === matches[0]!.id);
    if (entry) return { ...entry[lang], followUp: chunk?.followUp[lang] };
  }
  // Warm conversational handling so the demo doesn't feel robotic.
  if (THANKS.some((w) => q.includes(w))) return CONVO_THANKS[lang];
  if (q.length <= 30 && GREETING.some((w) => q.includes(w))) return CONVO_GREETING[lang];
  return REFUSAL[lang];
}

export interface AskResult {
  reply: CoachReply;
  demo: boolean;
}

/**
 * Suggestion chips to offer after a coach answer: the topic's own follow-up
 * question first, then enough of the general starter chips to fill up to
 * `max`, skipping anything already asked in this conversation (case-
 * insensitive) so the same suggestion never repeats. Only ever called for a
 * grounded 'answer' — a refusal or referral has nothing useful to suggest.
 */
export function nextSuggestions(
  reply: CoachReply | undefined,
  askedTexts: string[],
  chips: string[],
  max = 3,
): string[] {
  if (!reply || reply.kind !== 'answer') return [];
  const asked = new Set(askedTexts.map((t) => t.trim().toLowerCase()));
  const seen = new Set<string>();
  const out: string[] = [];
  const add = (text: string | undefined) => {
    if (!text) return;
    const key = text.trim().toLowerCase();
    if (asked.has(key) || seen.has(key)) return;
    seen.add(key);
    out.push(text);
  };
  add(reply.followUp);
  for (const c of chips) {
    if (out.length >= max) break;
    add(c);
  }
  return out.slice(0, max);
}

export interface HistoryTurn {
  role: 'user' | 'coach';
  text: string;
}

/**
 * Ask the coach via the same-origin RAG endpoint (/api/coach), which retrieves
 * from approved sources and grounds Claude's answer server-side. If the server
 * has no API key configured (503), fall back to the clearly-labelled,
 * non-generative demo so the site still works without a key.
 */
export async function askCoach(
  question: string,
  lang: Lang,
  ageBand: AgeBand,
  history: HistoryTurn[] = [],
): Promise<AskResult> {
  try {
    const res = await fetch('/api/coach', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ question, language: lang, ageBand, history }),
    });
    // Coach not configured on the server → show the safe demo.
    if (res.status === 503) return { reply: demoReply(question, lang), demo: true };
    if (!res.ok) throw new Error(`coach ${res.status}`);
    const reply = (await res.json()) as CoachReply;
    return { reply, demo: false };
  } catch {
    // Network/other failure — never fabricate; use the safe demo replies.
    return { reply: demoReply(question, lang), demo: true };
  }
}
