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

Researched 2026-07-18 (web research; not yet run against our eval set — see `[VERIFY: benchmarked]` tags below).

| Option | Notes | Verdict path |
|---|---|---|
| **BGE-M3** | Multilingual, 100+ languages `[VERIFY: benchmarked]`. General-purpose baseline, no Kinyarwanda-specific tuning. | **Start here** — easiest to adopt; measure on our eval set |
| **AfriE5** (mE5-Large-Instruct adapted via cross-lingual contrastive learning + distillation) | Purpose-adapted for 9 African languages incl. Kinyarwanda; per the AfriMTEB-Lite benchmark, scored highest macro-average (63.7) vs. mE5-Large-Instruct (62.0) and Gemini Embedding (63.1) across those languages — but the paper does not isolate Kinyarwanda-only retrieval numbers, and hasn't been run on our eval set `[VERIFY: benchmarked]`. Source: Adelani et al., "AfriMTEB and AfriE5" ([arXiv:2510.23896](https://arxiv.org/html/2510.23896)). | Benchmark alongside BGE-M3 as the second baseline |
| **KinyaColBERT** (built on **KinyaBERT**, a morphology-aware Kinyarwanda language model) | A Kinyarwanda-specific retrieval model — lexically-grounded, ColBERT-style — reported to beat general multilingual embeddings (mBERT variants, BGE-M3, Jina) on Kinyarwanda retrieval specifically. Code/weights: MIT-licensed, [github.com/anzeyimana/DeepKIN](https://github.com/anzeyimana/DeepKIN). Sources: Nzeyimana & Rubungo, "KinyaBERT" ([arXiv:2203.08459](https://arxiv.org/abs/2203.08459), ACL 2022); KinyaColBERT ([arXiv:2507.03241](https://arxiv.org/pdf/2507.03241)). **Cost caveat:** KinyaBERT's morphological analyser needs a separate free academic licence, and the toolkit expects a CUDA GPU with 12GB+ VRAM — real infra/licensing overhead for a small-budget pilot (Q7). | Escalate to only if BGE-M3/AfriE5 miss the retrieval bar — matches the "explore a Kinyarwanda-adapted model only if the baseline is insufficient" rule below, except this one already exists rather than needing to be built |

Decision rule unchanged: adopt the **simplest** option that clears the retrieval bar on the eval set; escalate complexity only when measurements demand it (boring-technology principle). The research above narrows *which* models to run through that decision rule first — it does not replace running them.

## Rwandan assets & partners — build vs. reuse

Prefer reusing local assets over building from scratch. Public asset facts below were confirmed via web research 2026-07-18 (dataset sizes, licences, model existence — primary sources linked); **direct collaboration/partnership terms with these organisations remain unconfirmed** and still need a real conversation, tagged `[VERIFY]` below.

| Asset / partner | What it could contribute | Build vs reuse | Action |
|---|---|---|---|
| **Digital Umuganda** | Confirmed public assets: a **2,260-hour validated Kinyarwanda speech corpus** (via Mozilla Common Voice, CC0/public domain) and a **170,000-sentence English↔Kinyarwanda parallel corpus** sourced from the Rwandan Gazette, open-sourced on GitHub/Hugging Face. Local NLP expertise. Source: [Digital Umuganda on Hugging Face](https://huggingface.co/DigitalUmuganda), [common_voice_dataset_rw](https://github.com/Digital-Umuganda/common_voice_dataset_rw). | **Reuse confirmed (assets)** / partner `[VERIFY: collaboration terms]` | Datasets are public and reusable now; still confirm direct collaboration/support `[VERIFY V4]` |
| **Mbaza NLP** | Confirmed public assets: a **1.07M-download Kinyarwanda monolingual text corpus** (78k documents, ~25M words), NLLB-finetuned translation models, Whisper-based ASR, and TTS models. **No embedding/semantic-search model in their published catalog** — their "Bakame" chatbot is IR-based, not embedding-based, so it is not a drop-in retrieval component. Source: [mbazaNLP on Hugging Face](https://huggingface.co/mbazaNLP), [mbaza.org](https://mbaza.org/). | **Reuse (text corpus)** / partner `[VERIFY: collaboration terms]` | Text corpus is public and reusable now (useful for normalisation/synonym-map work); confirm collaboration for anything embedding-specific `[VERIFY]` |
| **Common Voice (Kinyarwanda)** | Confirmed: **2,260 validated hours**, CC0 public-domain licence — among the top 5 languages by volume in the entire Common Voice dataset. Directly relevant to future IVR ASR/TTS (ADR-0007), not text retrieval. Source: [Common Voice dataset](https://commonvoice.mozilla.org/datasets). | **Reuse confirmed** | No further licence verification needed; revisit sizing when IVR is funded |
| **KinyaBERT / DeepKIN** (academic, Rwanda-affiliated) | A morphology-aware Kinyarwanda language model and toolkit (MIT-licensed code), including the morphological analyser the strategy above assumed might not exist. Source: [github.com/anzeyimana/DeepKIN](https://github.com/anzeyimana/DeepKIN), [KinyaBERT paper](https://arxiv.org/abs/2203.08459). | **Reuse / partner** | The morphological analyser itself needs a **separate free academic licence** `[VERIFY: licence terms for our use case]` — confirm before depending on it |
| MoH/RBC/Imbuto SRH materials | Source content for the corpus (also feeds C3) | **Reuse** | Confirm rights to adapt into the KB `[VERIFY V3]` — **out of scope for this research pass**: requires direct clinical/programme contact, not web research |

**What we build ourselves:** the SRH synonym/stem map, the Kinyarwanda evaluation set of real parent questions with expert answers, the normalisation + hybrid-retrieval + rerank pipeline glue, and prompt/guardrail engineering. **What we reuse:** base embeddings, speech corpora, and any morphological analyser rather than training language tools from scratch.

## Code-switching handling

- Language **detection per turn**, tolerant of mixed input; the pipeline does not force a single language.
- Retrieval runs across the relevant language partitions; content exists in Kinyarwanda and English at pilot (French deferred, NFR-30).
- The generator is instructed to answer in the parent's `preferred_language`, mirroring respectful register.

## Evaluation of multilingual vs Kinyarwanda-specific models

This is decided by the numbers, not by preference: run the candidate embedding models through the retrieval eval (recall@k, MRR) on the Kinyarwanda set; run end-to-end generation through the accuracy/safety eval. Choose the least complex option meeting the **release gate** (`evaluation-framework.md`). Re-evaluate when a stronger open Kinyarwanda model or partnership becomes available.

## Risks

- **Morphology tooling exists but has strings attached:** a Kinyarwanda morphological analyser exists (used by KinyaBERT/DeepKIN, MIT-licensed code) but requires a **separate free academic licence** `[VERIFY: licence terms for our use case]`, and the surrounding toolkit assumes GPU infra we may not budget for (Q7). → mitigate with the lexical arm of hybrid retrieval + the synonym map, which don't depend on a full analyser, if the licensed analyser proves impractical.
- **Euphemism/taboo gap:** parents may not use clinical terms → the synonym map and real-question eval set are essential; the cultural advisory panel (NFR-24) curates language.
- **Over-reliance on one vendor's multilingual model** → the retrieval interface (ADR-0005) keeps swaps cheap.
