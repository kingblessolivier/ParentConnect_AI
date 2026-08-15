/**
 * Deterministic keyword retrieval, shared by the real coach route (lib/kb.ts)
 * and the client-side no-key demo (lib/coach.ts). Swap for embeddings when the
 * real reviewed KB/vector store lands (CLAUDE.md #1).
 *
 * These two callers used to keep separate copies of this logic. They drifted:
 * the demo's copy stayed on plain substring matching against a narrower
 * keyword list long after the real route was fixed to catch more phrasings,
 * so a parent hitting the demo (e.g. no ANTHROPIC_API_KEY configured) saw the
 * *unfixed* behaviour. One implementation, imported by both, so that can't
 * happen again.
 */

export interface Retrievable {
  keywords: string[];
  ageBands: string[]; // '10_12' | '13_15' | '16_19' | 'all'
}

/**
 * Reduce a word to a rough canonical form so keyword lists don't need to
 * enumerate every inflection ("talk"/"talks"/"talking"/"talked" all reduce
 * towards "talk"). This is a small heuristic, not a real stemmer — it only
 * needs to be applied consistently to both sides of a comparison.
 */
function normalizeWord(word: string): string {
  let s = word;
  if (s.length > 5 && s.endsWith('ies')) return `${s.slice(0, -3)}y`;
  if (s.length > 6 && s.endsWith('ing')) s = s.slice(0, -3);
  else if (s.length > 5 && s.endsWith('ed')) s = s.slice(0, -2);
  else if (s.length > 5 && s.endsWith('es')) s = s.slice(0, -2);
  else if (s.length > 3 && s.endsWith('s') && !s.endsWith('ss')) s = s.slice(0, -1);
  return s;
}

/**
 * True if two words are close enough to count as the same keyword. Exact and
 * normalized-form matches always count; short words additionally require a
 * shared prefix so "worry"/"worried"/"worrying" match each other without
 * unrelated short words ("or", "so") matching by accident — the minimum
 * length guard keeps the prefix check off anything too short to be safe.
 */
function wordsMatch(a: string, b: string): boolean {
  if (a === b) return true;
  const na = normalizeWord(a);
  const nb = normalizeWord(b);
  if (na === nb) return true;
  const minLen = Math.min(na.length, nb.length);
  if (minLen < 5) return false;
  const prefixLen = Math.max(4, minLen - 1);
  return na.slice(0, prefixLen) === nb.slice(0, prefixLen);
}

function tokenize(question: string): string[] {
  return question
    .toLowerCase()
    .split(/[^a-zà-ɏ''']+/)
    .filter(Boolean);
}

/**
 * Score and rank chunks against a question. A multi-word keyword ("say no")
 * must appear as a substring; a single-word keyword matches any question word
 * via `wordsMatch`. Chunks scoped to the parent's age band (or 'all') get a
 * small tie-break boost. Only chunks with at least one match are returned,
 * highest score first — callers decide what "no match" means for them.
 */
export function retrieveChunks<T extends Retrievable>(
  question: string,
  ageBand: string,
  chunks: readonly T[],
): T[] {
  const q = question.toLowerCase();
  const qWords = tokenize(q);
  return chunks
    .map((c) => {
      let score = 0;
      for (const keyword of c.keywords) {
        const kw = keyword.toLowerCase();
        if (kw.includes(' ')) {
          if (q.includes(kw)) score += 1;
          continue;
        }
        if (qWords.some((w) => wordsMatch(w, kw))) score += 1;
      }
      if (score > 0 && (c.ageBands.includes('all') || c.ageBands.includes(ageBand))) score += 0.5;
      return { c, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score)
    .map((x) => x.c);
}

/**
 * Two-tier retrieval: try the specific-topic chunks first, and only fall
 * back to the broad "how do I approach this at all?" chunks if nothing
 * specific matched — never mix the two pools in one ranking. Returns an
 * empty array if neither tier matched (callers decide what "no match at
 * all" means for them — see retrieveWithFallback vs. lib/coach.ts's use of
 * this function directly).
 *
 * Broad chunks necessarily carry generic words ("advice", "talk", "child")
 * that show up in almost every real question. Scored in the same pool as
 * specific topics, those incidental hits stack up and regularly outscore a
 * specific topic's one precise keyword match — e.g. a question about a
 * daughter's first period, which should surface the puberty chunk, instead
 * surfaced generic communication guidance because that chunk happened to
 * also contain "daughter" and "tell". Keeping the pools separate makes the
 * broad chunks a fallback, which is what they were designed to be.
 */
export function retrieveTiered<T extends Retrievable>(
  question: string,
  ageBand: string,
  specificChunks: readonly T[],
  generalChunks: readonly T[],
  limit = 3,
): T[] {
  const specific = retrieveChunks(question, ageBand, specificChunks);
  if (specific.length > 0) return specific.slice(0, limit);
  return retrieveChunks(question, ageBand, generalChunks).slice(0, limit);
}

/**
 * Same as retrieveTiered, but when literally nothing matched in either tier,
 * returns the general chunks anyway rather than an empty array. Only safe
 * for callers with a downstream grounding check that still refuses when the
 * given sources don't actually cover the question (the real coach route,
 * which hands sources to a model instructed to refuse otherwise) — NOT safe
 * for a path with no such check (the no-key demo, which returns a matched
 * chunk's canned text as-is: see lib/coach.ts's use of retrieveTiered
 * directly, which lets a true non-match fall through to its own refusal).
 */
export function retrieveWithFallback<T extends Retrievable>(
  question: string,
  ageBand: string,
  specificChunks: readonly T[],
  generalChunks: readonly T[],
  limit = 3,
): T[] {
  const result = retrieveTiered(question, ageBand, specificChunks, generalChunks, limit);
  return result.length > 0 ? result : generalChunks.slice(0, limit);
}
