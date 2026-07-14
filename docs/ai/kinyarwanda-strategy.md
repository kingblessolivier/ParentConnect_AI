# Kinyarwanda Language Strategy

Kinyarwanda is a **first-class language, not a translation afterthought** (`CLAUDE.md` constraint #2). It is agglutinative and low-resource; standard sub-word tokenizers fragment it, degrading embedding and retrieval quality — and in a RAG system, **retrieval quality is answer safety**. This document states how we handle it, what we build vs. reuse, and how we decide empirically.

## Why this is hard

- **Agglutination:** a single Kinyarwanda word can encode subject, tense, object, and more (e.g. verb forms built from stacked morphemes). One concept appears in many surface forms.
- **Tokenizer mismatch:** sub-word tokenizers trained mostly on high-resource languages shatter Kinyarwanda words into meaningless fragments → weak embeddings → poor semantic retrieval.
- **Low resource:** fewer curated corpora, embeddings, and evaluation sets than English/French.
- **Code-switching:** real parent input mixes Kinyarwanda with English/French and informal spelling.
- **Sensitive vocabulary:** SRH terms carry euphemism and taboo; surface-form matching alone misses intent.

## Strategy: normalise, retrieve hybrid, evaluate empirically

We do **not** assume any single model works. The design (ADR-0005) is:

1. **Kinyarwanda-aware normalisation** before embedding/indexing and at query time:
   - Morphological normalisation/lemmatisation where tooling exists `[VERIFY availability]`.
   - Orthographic normalisation (consistent spelling, diacritics, spacing).
   - A **curated SRH synonym/stem map** (euphemisms ↔ clinical terms), authored with the clinical + cultural reviewers.
2. **Hybrid retrieval:** dense (multilingual embeddings) **+** lexical (full-text/BM25-style) so exact morphological variants aren't lost when dense embeddings fail on rare forms.
3. **Reranking** to recover precision after broad recall.
4. **Empirical selection:** every choice above is tuned against the **Kinyarwanda evaluation set** (`evaluation-framework.md`) on recall@k / MRR — not by vendor claim.

## Embedding model options (to benchmark, not assume)

| Option | Notes | Verdict path |
|---|---|---|
| Multilingual embedding models covering Bantu/African languages | Baseline; easiest to adopt | **Start here**; measure on eval set |
| Massively-multilingual open models | Broad coverage, variable Kinyarwanda quality | Benchmark as alternative |
| A Kinyarwanda-adapted/fine-tuned embedding model | Best fit; needs data, compute, expertise | Explore **with partners** (below); only if eval shows the baseline is insufficient |

Decision rule: adopt the **simplest** option that clears the retrieval bar on the eval set; escalate complexity only when measurements demand it (boring-technology principle).

## Rwandan assets & partners — build vs. reuse

Prefer reusing local assets over building from scratch. **All capabilities/licences below are `[VERIFY]`** and must be confirmed directly.

| Asset / partner | What it could contribute | Build vs reuse | Action |
|---|---|---|---|
| **Digital Umuganda** | Open Kinyarwanda text/speech datasets & models; local NLP expertise | **Reuse / partner** | Confirm datasets, licences, collaboration terms `[VERIFY V4]` |
| **Mbaza NLP** | Kinyarwanda NLP tooling/assistant experience | **Reuse / partner** | Explore normalisation/embedding collaboration `[VERIFY]` |
| **Common Voice (Kinyarwanda)** | Large open speech corpus — relevant to IVR ASR/TTS | **Reuse** | Assess size/licence for future IVR (ADR-0007) `[VERIFY]` |
| Academic/NLP groups in Rwanda `[VERIFY]` | Morphological analysers, lemmatisers, evaluation help | **Reuse / partner** | Source a morphology tool; co-build the eval set |
| MoH/RBC/Imbuto SRH materials | Source content for the corpus (also feeds C3) | **Reuse** | Confirm rights to adapt into the KB `[VERIFY V3]` |

**What we build ourselves:** the SRH synonym/stem map, the Kinyarwanda evaluation set of real parent questions with expert answers, the normalisation + hybrid-retrieval + rerank pipeline glue, and prompt/guardrail engineering. **What we reuse:** base embeddings, speech corpora, and any morphological analyser rather than training language tools from scratch.

## Code-switching handling

- Language **detection per turn**, tolerant of mixed input; the pipeline does not force a single language.
- Retrieval runs across the relevant language partitions; content exists in Kinyarwanda and English at pilot (French deferred, NFR-30).
- The generator is instructed to answer in the parent's `preferred_language`, mirroring respectful register.

## Evaluation of multilingual vs Kinyarwanda-specific models

This is decided by the numbers, not by preference: run the candidate embedding models through the retrieval eval (recall@k, MRR) on the Kinyarwanda set; run end-to-end generation through the accuracy/safety eval. Choose the least complex option meeting the **release gate** (`evaluation-framework.md`). Re-evaluate when a stronger open Kinyarwanda model or partnership becomes available.

## Risks

- **Morphology tooling may be immature** `[VERIFY]` → mitigate with the lexical arm of hybrid retrieval + the synonym map, which don't depend on a full analyser.
- **Euphemism/taboo gap:** parents may not use clinical terms → the synonym map and real-question eval set are essential; the cultural advisory panel (NFR-24) curates language.
- **Over-reliance on one vendor's multilingual model** → the retrieval interface (ADR-0005) keeps swaps cheap.
