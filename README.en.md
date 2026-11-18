# lit-review-6step

[简体中文](README.md) | **English**

Break a literature review into six checkable stages: **question → search strategy → search & screening → close reading & extraction → synthesis & drafting → final editing**. Each stage has fixed artifacts and a gate, and you can enter at any stage. The manuscript structure is chosen from six patterns; pattern A ("new technology on an old problem") uses a seven-section outline.

A skill pack in [Agent Skills](https://docs.claude.com/en/docs/claude-code/skills) format. Plain Markdown, no runtime dependencies.

Author: 武文政 (Wu Wenzheng) · [@wakawaka66614](https://github.com/wakawaka66614)

> The skill instructions themselves are currently written in Chinese. The workflow is usable by non-Chinese readers, but expect Chinese text inside `SKILL.md` files.

## What it solves

| Common failure | How this pipeline handles it |
|---|---|
| The review reads like a stack of paper summaries | Concept matrix + literature relation table (L1–L5 synthesis levels) + contradiction map |
| Search is incomplete and undocumented | Four source types + strategy table + raw results kept + staged PRISMA counts |
| Structure drifts while writing | Run the structure selector, fill the outline, then write |
| Drifting away from the topic | Topic contract + a mentor review (MR) at every stage gate |
| Claims not traceable to evidence | Claim–Evidence ledger + four verification levels (full text / abstract / metadata / unverified) |
| All evidence treated as equal | Quality appraisal: pick a framework by design, rate high / medium / low with reasons |
| Rigid structure, categories invented to fit it | Structure selector: six patterns, pattern A is only one option |
| Enough papers, thin coverage | Coverage matrix + `audit-coverage`: topic / method / time gaps |
| A tidy taxonomy that is actually fragile | `audit-taxonomy`: single-paper categories, "other" share, single-source categories, included-but-uncategorized |
| Figures copied from a fixed template | `stat-questions` → `fig-plan` → `fig-render` chain; structural diagrams go to `nature-figure` (see Figures) |
| Excel reading logs cannot be ingested | `xlsx-to-csv` converts to the extraction table, keeping tier and dimension columns |
| No shared structure for reading notes | `reading-table` generates a tier × dimension reading workbook from the RQ |
| Skipping stages breaks the ending | Entry contracts + recorded debt, paid back at S5/S6 |

## What's inside

| Path | Content |
|---|---|
| `skills/lit-review-6step/` | Six-stage orchestrator: entry points, gates, structure selector, claim–evidence ledger, quality appraisal, AMiner/OpenAlex channels, mentor review (MR) with topic contract |
| `skills/survey-writing/` | Survey body: choosing the review species, taxonomy, figures, Gates A/B/C, CR-S / HLA-S review models |
| `skills/survey-abstract/` | Five-part abstract (hook → positioning → framework → evidence → outlook), functions only, no fixed phrasing |
| `skills/shared/evidence-norms.md` | Shared evidence and language rules for all three skills (four verification levels) |
| `commands/` | Nine commands: `lit-review` / `lit-review-s2` / `survey-outline` / `reading-table` / `fig-plan` / `survey-abstract` / `mentor-check` / `search-openalex` / `audit-refs` |
| `scripts/` | Audit and figure tools: `check.mjs`, `merge-results.mjs`, `audit-taxonomy.mjs`, `audit-coverage.mjs`, `stat-questions.mjs`, `fig-plan.mjs`, `fig-render.py`, `xlsx-to-csv.py`, `make-reading-table.py`; E2E: `e2e-init` / `e2e-score` / `gold-from-surveys` |
| `skills/lit-review-6step/scripts/` | `audit-refs.mjs` (citation audit), `search-openalex.mjs` (search / citations), `aminer_health.mjs` |
| `templates/文献综述项目模板/` | Six-stage folders + candidates / raw results / extraction / claim ledger / relation table + contract / outline / review log / self-check templates |
| `docs/` | `workflow.md`, `E2E_TEST_PLAN.md`, `REVISION_PLAN_v2_2026-11-17.md` and `REVISION_PLAN_v2.1_2026-11-17.md`, `V2.1_TEST_REPORT.md` |

## Install

Requires DSH or any other agent that reads `SKILL.md` (e.g. Claude Code).

**Windows**

```powershell
git clone https://github.com/wakawaka66614/lit-review-6step.git
cd lit-review-6step
.\install.ps1 -Target C:\path\to\your\project -WithDeps
```

If PowerShell refuses to run the script ("running scripts is disabled on this system"):

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Target C:\path\to\your\project -WithDeps
```

**macOS / Linux**

```bash
git clone https://github.com/wakawaka66614/lit-review-6step.git
cd lit-review-6step
./install.sh /path/to/your/project --with-deps
```

After installation the target project contains:

```text
<project>/
  .dsh/skills/lit-review-6step/
  .dsh/skills/survey-writing/
  .dsh/skills/survey-abstract/
  .dsh/skills/literature-review-skill/     # only with -WithDeps
  .dsh/skills/literature-review-skills/    # only with -WithDeps
  文献综述项目模板/
```

Claude Code users add `-SkillsDir .claude\skills`; skills and commands go to `.claude\skills` and `.claude\commands`:

```powershell
.\install.ps1 -Target C:\path\to\your\project -SkillsDir .claude\skills -WithDeps
```

Install for the current user (all projects, no template copy):

```powershell
.\install.ps1 -Global -WithDeps
```

`-WithDeps` pins both MIT dependencies to verified commits (`literature-review-skill@7328261`, `literature-review-skills@5f6498d`) instead of following `main`.

## Self-check

```powershell
node scripts/check.mjs
```

Seven checks: catalog matches directories, frontmatter complete, referenced paths exist, README covers every skill, no personal paths, no secrets, `install.ps1` encoding. Each skill also ships a `VALIDATION.md` stating what was tested and, explicitly, what was not.

## Figures (S5)

Three steps, **question first, chart type second**:

```powershell
node scripts/stat-questions.mjs --extraction 03_精读/提取表.csv --topic "your topic" --out-dir 04_综合
node scripts/fig-plan.mjs --candidates 01_检索/候选表.csv --extraction 03_精读/提取表.csv `
  --relations 04_综合/文献关系表.csv --coverage 04_综合/覆盖矩阵.csv --out-dir 04_综合
python scripts/fig-render.py --spec 04_综合/图表计划.csv --out-dir 04_综合/figures --formats pdf,svg,png
```

Limits:

- `stat-questions` only proposes questions the data can answer ("how many / how distributed"), never "why better"; relevance is scored by keyword rules, so re-check after changing the topic. Code free-text fields first; without `--topic` every candidate drops to low priority.
- `fig-plan` produces candidates only: it aggregates `图表计划.csv` and `data/*.csv` from candidates / extraction / relations / coverage and does **not** decide what this topic should show. Cut down to 3–6 figures for your argument, then add `claim_id` and conclusion-style titles.
- `fig-render` renders **statistical charts only** (bar / hbar / line / stacked_bar / grouped_bar / scatter / heatmap) from pre-aggregated CSV columns named in the plan; it does no statistics. Structural / framework / taxonomy overview figures go to `nature-figure`; never pass a schematic off as a data figure.
- Chinese labels need a local CJK font (Microsoft YaHei / SimHei / Noto Sans CJK SC); if none is present, switch fonts or use English labels.

## Validation

- Version **2.5.0**; repo self-check passes **50 items** (`node scripts/check.mjs`, 7 groups)
- Script-level records in `skills/lit-review-6step/VALIDATION.md` (audit, OpenAlex, installer, scoring)
- Comparison plan in `docs/E2E_TEST_PLAN.md`. The retrieval stage ran two experiments whose numbers are **not interchangeable**:
  - **Uncontrolled budget (A vs C)**: single query, 25 hits → **3.3%**; multi-query + citation tracking, 132 hits → **36.7%** (3 faceted queries still 3.3%; the gain comes from citation tracking). See `e2e/graph-neural-networks-for-recommender-sy-20261117/RESULTS.md`
  - **Controlled budget (A/B/C/D)**: at a 25-hit budget, A **3.3%** / B **0.0%** / C **13.3%**; only D, with the budget lifted to 194 hits, reaches **60.0%**. See `RESULTS-abcd.md` in the same folder
  - **60.0% vs 36.7% is not a like-for-like comparison**: the gap is mostly budget (194 vs 132 hits), not strategy
  - The gold set is survey-derived (30 items from CSUR / TORS / TOIS), not manually verified; one topic only, no extrapolation
- Writing-stage pilot: unresolvable citations **2 vs 0** (same model, direct write vs pipeline output; see `RESULTS-writing.md`; not a quality comparison)
- **Not done**: an independent blind quality comparison of the writing itself; stated plainly in `VALIDATION.md`

## Requirements

| Dependency | Required | Used for | How to get it |
|---|---|---|---|
| DSH / SKILL.md agent | Yes | Running the skills | — |
| [YAN suite](https://github.com/YANZHANLIN/literature-review-skill) (MIT) | Strongly recommended | S2 search, S4 close reading, S5 writing, S6 chapter | `-WithDeps` clones it |
| [StarTower suite](https://github.com/xingtaxueshu/literature-review-skills) (MIT) | Strongly recommended | S1 question refinement, S5 contradiction mapping | `-WithDeps` clones it |
| `sr-screener` | Optional | S3 blinded screening for systematic reviews | Install separately |
| `academic-paper` | Optional | S6 citation / format checks | Install separately |
| [nature-figure](https://github.com/Yuan1z0825/nature-skills) (Apache-2.0) | Optional | S5 structural / framework figures: rendering, audit, export (statistical charts use `fig-render`) | Install into `.dsh/skills/nature-figure/` |
| AMiner MCP | Optional | S3 machine search channel | See `skills/lit-review-6step/references/aminer.md` |

If YAN or StarTower is missing, the orchestrator stops at preflight and tells you — it will not pretend to have read them.

## Entry points

You do not have to start at S1. Tell the agent what you already have:

| Entry | What you have | Skipped | Debt (paid later) |
|---|---|---|---|
| S1 | Only a broad direction | — | — |
| S2 | A fixed topic (± RQ, ± scope) | S1 gap analysis | "Existing surveys" paragraph (S5) |
| S3 | Search strings / strategy table / chosen databases | S1–S2 | Search protocol subsection (S6) |
| S4 | A screened reading list | S1–S3 | PRISMA counts (S6) |
| S5 | An extraction table / detailed notes | S1–S4 | Citation traceability (checked at S6) |
| S6 | A draft | S1–S5 | Structural diagnosis before polishing |

## Commands

| Command | Purpose |
|---|---|
| `/lit-review` | Start at S1, from a broad direction |
| `/lit-review-s2` | Start at S2 with a fixed topic |
| `/survey-outline` | Run the structure selector, then produce chapter-level outline and figure plan (pattern A uses the seven-section skeleton); no prose |
| `/reading-table` | Design and generate a tier × dimension reading workbook (Excel) from the RQ |
| `/fig-plan` | Statistical questions → figure candidates and aggregated data → rendered charts |
| `/survey-abstract` | Write or revise the abstract only |
| `/mentor-check` | Run a mentor review to check whether the current stage has drifted |

In Claude Code, copy `commands/*.md` into `.claude/commands/` and run `/lit-review-s2 topic: ...`. In DSH, say "execute `commands/lit-review-s2.md`"; the installer also copies them to `.dsh/commands/`.

## The six stages

| Stage | Artifacts | Gate |
|---|---|---|
| S1 Question | Gap statement + RQ + 3–5 modules | A third party can restate the RQ |
| S2 Strategy | Search strategy table + log | Every row has database / query / limits / expected hits |
| S3 Search & screening | Candidate table + PRISMA counts | Counts reconcile; every exclusion has a code |
| S4 Close reading | Extraction table + notes | 100% of included papers have a row; limitations filled |
| S5 Synthesis | Concept matrix + contradiction map + outline + draft | Taxonomy passes the ten-paper blind test; each theme carries ≥1 L3 relation judgment; synthesis claims need ≥2 independent sources (definition / descriptive paragraphs are exempt) |
| S6 Final editing | Manuscript + abstract + checklist | Citations traceable, format consistent, abstract promises fulfilled |

Every stage gate starts with a **mentor review (MR)**: compare against `00_选题/主题契约.md` and ask only "are we still answering the same question?".

## Three reviews

| Model | What it checks | When | Output |
|---|---|---|---|
| **MR Mentor review** | Whether the work still answers the user's question (against the topic contract) | Before every stage gate | PASS / WARN / BLOCK |
| **CR-S Structure & logic** | Chapter skeleton and mapping, argument chain, defensive language | After each chapter, before the abstract is final | P0/P1 issue table, ≤5 per section |
| **HLA-S Human language alignment** | Cross-chapter transitions, rhythm, terminology, AI tone | After CR-S passes | Original → rewrite, 3–5 spots |

Fixed order: **MR → CR-S → HLA-S**. First confirm it is still on topic, then structure, then language.

All three are read-only roles that never rewrite the draft; results go to `00_选题/导师审查.md` and `05_成稿/审校记录.md`. Rules: `skills/lit-review-6step/references/mentor-review.md` and `skills/survey-writing/references/review-and-alignment.md`.

## Outline example (pattern A: new technology × old problem)

> Pattern A is only one of six structures; adjust the chapter skeleton with the selector when using another pattern.

```text
1 Introduction: broad background → narrow background → existing surveys → this survey → structure
2 Background
  2.1 Problem background: what it is → taxonomy A (a1…am)
  2.2 Technology background: what it is → taxonomy B (b1…bk) → mapping statement (b1 → §3 …)
3 Problem a1 under technology b1
4 Problem a2 under technology b2
5 Problem a3 under technology b3
6 Challenges and future directions
7 Conclusion
```

Three hard constraints: the number of B branches equals the number of chapters from §3; the B×A cross matrix is filled before writing; if |A| ≠ |B|, organize chapters by B and state the mapping.

## Repository layout

```text
lit-review-6step/
├─ skills/
│  ├─ lit-review-6step/     # orchestrator
│  ├─ survey-writing/       # body writing
│  ├─ survey-abstract/      # abstract
│  └─ shared/evidence-norms.md
├─ commands/                # nine entry commands
├─ templates/文献综述项目模板/
├─ catalog/skills.json
├─ scripts/                 # check / e2e-init / e2e-score / gold-from-surveys
├─ docs/                    # workflow / E2E plan / revision plan
├─ e2e/                     # pilot runs and results
├─ install.ps1
├─ install.sh
├─ THIRD_PARTY_NOTICES.md
└─ CITATION.cff
```

## Known limitations

- The AMiner channel needs your own API key. Without one, fall back to manual database search; the candidate table schema does not change.
- Citation checking depends on the optional `academic-paper`; without it, verification is manual.
- The repository bundles no third-party skill code; the installer fetches MIT dependencies on the user's machine.
- The six structures are organizational patterns, not executable checks: structure choice, the ten-paper taxonomy blind test and L3 relation judgments are still prose gates; `audit-taxonomy` only inspects the taxonomy table itself (single-paper categories, "other" share, single-source categories, included-but-uncategorized).
- The figure chain covers statistical charts only: `fig-render` does no statistics, and `stat-questions` scores topical relevance by keyword rules rather than semantics, so re-check after changing the topic.
- The three reviews (MR / CR-S / HLA-S) are the same model in different roles. They reduce drift and self-justification but **cannot catch every problem**; check the contract yourself at key points.
- Skill instructions are in Chinese.

## License

MIT — see [LICENSE](LICENSE). Third-party components are listed in [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md).

`survey-writing` and `survey-abstract` are original to this repository.

## Citation

If you use this workflow in research or teaching, see [CITATION.cff](CITATION.cff).
