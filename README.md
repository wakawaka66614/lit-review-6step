# lit-review-6step

[English](README.en.md) | **简体中文**

把文献综述拆成六个可验收的阶段：**选题 → 检索策略 → 检索与初筛 → 精读提取 → 综合写作 → 统稿**。每个阶段有固定产物和门禁，支持从任意阶段进入；成稿结构从六种模式里选（模式 A 用七节骨架）。

一套 [Agent Skills](https://docs.claude.com/en/docs/claude-code/skills) 格式的技能包，纯 Markdown，无运行时依赖。

作者：武文政 · [@wakawaka66614](https://github.com/wakawaka66614)

## 它解决什么

| 常见病 | 这套流程的解法 |
|---|---|
| 综述写成读书笔记 | 概念矩阵 + 文献关系表（L1–L5 综合层级）+ 冲突地图 |
| 搜不全、说不清怎么搜的 | 四类来源 + 检索策略表 + 原始结果留存 + PRISMA 分阶段计数 |
| 结构漂移、边写边改 | 先跑结构选择器、填提纲再动笔 |
| 跳步导致后面塌 | 入口契约 + 欠账登记，S5/S6 回来补 |
| 写着写着跑题 | 主题契约 + 每阶段导师审查（MR） |
| 证据与论断对不上 | 统一 `paper_id` + 论断台账 + 段落证据映射 + 四级核验（全文 / 摘要 / 元数据 / 未核验） |
| 证据不分强弱 | 研究质量评价：按设计选框架；摘要级只给“初步/未评价” |
| 结构僵化、为结构造分类 | 结构选择器：六种模式里选一个，模式 A 只是可选之一 |
| 文献够了其实不够 | 覆盖矩阵 + `audit-coverage`：主题/方法/时间三维查缺口 |
| 文献太少、只引几篇 | 硬门槛：纳入 ≥50、全文 ≥5、正文引用 ≥50，`audit-corpus` 不达标不进 S5 |
| 分类看着整齐其实脆弱 | `audit-taxonomy`：单篇类别、其他占比、来源单一、纳入未分类 |
| 图表套模板 | `stat-questions` 先出统计问题 → `fig-plan` 出候选图表计划 → `fig-render` 出统计图；结构图 / 框架图才走 `nature-figure`（见「图表」一节） |
| Excel 精读表读不进 | `xlsx-to-csv` 转成提取表，保留梯队与 9 个维度列 |
| 读文献没有统一记录结构 | `reading-table` 按主题生成“多梯队 × 多维度”精读表（Excel） |

## 组成

| 目录 | 内容 |
|---|---|
| `skills/lit-review-6step/` | 六步编排器：入口、门禁、结构选择器、`paper_id` 台账、段落映射、覆盖审计、质量评价、AMiner/OpenAlex 通道、导师审查（MR）与主题契约 |
| `skills/survey-writing/` | 综述正文：物种选择、taxonomy、图表规划、Gate A/B/C、CR-S / HLA-S 审校模型 |
| `skills/survey-abstract/` | 摘要五段式（钩子 → 定位 → 框架 → 证据 → 展望），只保留功能、不锁句式 |
| `skills/shared/evidence-norms.md` | 三个 skill 共用的证据与语言规范（四级核验；`用户提供` 是来源标签） |
| `commands/` | 九个命令：`lit-review` / `lit-review-s2` / `survey-outline` / `reading-table` / `fig-plan` / `survey-abstract` / `mentor-check` / `search-openalex` / `audit-refs` |
| `scripts/` | 自检与审计：`check.mjs`、`merge-results.mjs`、`audit-refs`（skill 内）、`audit-taxonomy.mjs`、`audit-coverage.mjs`、`audit-corpus.mjs`、`stat-questions.mjs`、`fig-plan.mjs`、`fig-render.py`、`xlsx-to-csv.py`、`make-reading-table.py`；E2E：`e2e-init/e2e-score/gold-from-surveys` |
| `skills/lit-review-6step/scripts/` | `audit-refs.mjs`（引用审计）、`search-openalex.mjs`（检索/引文）、`aminer_health.mjs` |
| `templates/文献综述项目模板/` | 六步目录 + 候选表 / 原始结果 / 提取表 / 论断证据 / 文献关系表 + 契约 / 提纲 / 审校 / 自检模板 |
| `docs/` | `workflow.md` 流程、`E2E_TEST_PLAN.md` 对照测试、`REVISION_PLAN_v2_2026-11-17.md` 与 `REVISION_PLAN_v2.1_2026-11-17.md` 重构记录、`V2.1_TEST_REPORT.md` 测试报告 |

## 安装

需要 DSH（或其他读取 `SKILL.md` 的 agent，如 Claude Code）。

**Windows**

```powershell
git clone https://github.com/wakawaka66614/lit-review-6step.git
cd lit-review-6step
.\install.ps1 -Target C:\path\to\your\project -WithDeps
```

如果提示「无法加载文件，因为在此系统上禁止运行脚本」，用：

```powershell
powershell -ExecutionPolicy Bypass -File .\install.ps1 -Target C:\path\to\your\project -WithDeps
```

**macOS / Linux**

```bash
git clone https://github.com/wakawaka66614/lit-review-6step.git
cd lit-review-6step
./install.sh /path/to/your/project --with-deps
```

装完后项目里是：

```text
<project>/
  .dsh/skills/lit-review-6step/
  .dsh/skills/survey-writing/
  .dsh/skills/survey-abstract/
  .dsh/skills/literature-review-skill/     # 仅 -WithDeps
  .dsh/skills/literature-review-skills/    # 仅 -WithDeps
  文献综述项目模板/
```

Claude Code 用户加 `-SkillsDir .claude\skills`，技能与命令会装到 `.claude\skills` 与 `.claude\commands`：

```powershell
.\install.ps1 -Target C:\path\to\your\project -SkillsDir .claude\skills -WithDeps
```

装到用户级（所有项目可用，不复制模板）：

```powershell
.\install.ps1 -Global -WithDeps
```

`-WithDeps` 会把两个 MIT 依赖锁定到验证过的 commit（`literature-review-skill@7328261`、`literature-review-skills@5f6498d`），不跟 `main` 漂移。

## 自检

```powershell
node scripts/check.mjs
```

检查 7 项：catalog 与目录一致、frontmatter 完整、引用路径存在、README 覆盖、无个人路径、无密钥、install.ps1 编码。每个 skill 另有一份 `VALIDATION.md`，写清验证过什么、**没验证什么**。

稿件层面的检查：

```powershell
node .dsh/skills/lit-review-6step/scripts/audit-refs.mjs `
  --manuscript 05_成稿/初稿.md `
  --candidates 01_检索/候选表.csv `
  --claims 03_精读/论断证据.csv `
  --mapping 03_精读/段落证据映射.csv `
  --out 05_成稿/引用审计.md
```

查六类问题：未知 `paper_id`、引用未纳入文献、作者年份找不到（候选表缺作者时明确报“无法核验”）、未核验 claim 进正文、摘要核验撑数字、段落映射与 claim/paper 不一致；另外列重复 DOI、非法 DOI、“纳入但未引用”。

分类与覆盖：

```powershell
node scripts/audit-taxonomy.mjs --taxonomy 04_综合/taxonomy.csv --candidates 01_检索/候选表.csv
node scripts/audit-coverage.mjs --matrix 04_综合/覆盖矩阵.csv
```

## 图表（S5）

出图分三步，**先有问题，再选图型**：

```powershell
node scripts/stat-questions.mjs --extraction 03_精读/提取表.csv --topic "你的主题" --out-dir 04_综合
node scripts/fig-plan.mjs --candidates 01_检索/候选表.csv --extraction 03_精读/提取表.csv `
  --relations 04_综合/文献关系表.csv --coverage 04_综合/覆盖矩阵.csv --out-dir 04_综合
python scripts/fig-render.py --spec 04_综合/图表计划.csv --out-dir 04_综合/figures --formats pdf,svg,png
```

使用限制：

- `stat-questions` 只生成「数据能回答、且与主题相关」的候选问题（多少 / 怎么分布），不回答「为什么更好」；相关性按关键词规则打分，换主题后要人工复核。文本字段（局限、发现）先编码再统计；不传 `--topic` 时全部降为低优先级。
- `fig-plan` 只出候选：从候选表 / 提取表 / 关系表 / 覆盖矩阵聚合出 `图表计划.csv` 与 `data/*.csv`，**不判断这个主题该画什么**；要按论点删到 3–6 张，补齐 `claim_id` 与结论式标题。
- `fig-render` 只渲染**统计图**（bar / hbar / line / stacked_bar / grouped_bar / scatter / heatmap），数据必须是已聚合的 CSV（列名写进图表计划），不做统计计算；结构图 / 框架图 / taxonomy 总图交 `nature-figure`，数据图不能用示意图冒充。
- 中文字体依赖本机（Microsoft YaHei / SimHei / Noto Sans CJK SC），三者都没有时中文会缺字，需换字体或改英文标签。

## 验证

- 当前版本 **2.6.0**；仓库自检 **50 项通过**（`node scripts/check.mjs`，7 组检查）
- 脚本级验证记录见 `skills/lit-review-6step/VALIDATION.md`（审计、OpenAlex、安装器、评分脚本）
- 对照测试计划见 `docs/E2E_TEST_PLAN.md`。检索阶段跑了两组实验，**条件不同，数字不能混用**：
  - **无预算控制（A vs C）**：单查询 25 条覆盖 **3.3%**；多查询 + 引文追踪 132 条覆盖 **36.7%**（3 条分面查询 75 条时仍 3.3%，增量来自引文追踪），见 `e2e/graph-neural-networks-for-recommender-sy-20261117/RESULTS.md`
  - **控制预算（A/B/C/D）**：同为 25 条预算时 A **3.3%** / B **0.0%** / C **13.3%**；D 放开预算到 194 条才 **60.0%**，见同目录 `RESULTS-abcd.md`
  - **60.0% 与 36.7% 不可直接对比**：差别主要在预算（194 vs 132 条），不是策略优劣
  - 金标准是顶刊综述派生 30 条（CSUR / TORS / TOIS），非人工核验；只跑了一个主题，不能外推
- 写作阶段小试：无法回溯引用 **2 vs 0**（同模型直写 vs 流程产出，见 `RESULTS-writing.md`；非质量对照）
- **未做**：独立评价人盲评的全流程质量对照（写作优劣）；`VALIDATION.md` 里如实标注了这一点

## 依赖

| 依赖 | 必须 | 用途 | 获取方式 |
|---|---|---|---|
| DSH / SKILL.md agent | 是 | 运行技能 | — |
| [YAN 五件套](https://github.com/YANZHANLIN/literature-review-skill)（MIT） | 强烈建议 | S2 检索、S4 精读、S5 写作、S6 章节 | `-WithDeps` 自动 clone |
| [星塔五件套](https://github.com/xingtaxueshu/literature-review-skills)（MIT） | 强烈建议 | S1 选题、S5 冲突梳理 | `-WithDeps` 自动 clone |
| `sr-screener` | 可选 | S3 系统综述双盲筛选 | 自行安装 |
| `academic-paper` | 可选 | S6 引用 / 格式核查 | 自行安装 |
| [nature-figure](https://github.com/Yuan1z0825/nature-skills)（Apache-2.0） | 可选 | S5 结构图 / 框架图出图、审图、导出（统计图用 `fig-render`） | 自行安装到 `.dsh/skills/nature-figure/` |
| AMiner MCP | 可选 | S3 机器检索通道 | 见 `skills/lit-review-6step/references/aminer.md` |

缺 YAN / 星塔时，编排器会在预检阶段停下并提示，不会假装读过。

## 从哪一步进入

不必从 S1 开始。告诉 agent 你手上有什么：

| 入口 | 手上有什么 | 跳过 | 欠账（后面补） |
|---|---|---|---|
| S1 | 只有方向 | — | — |
| S2 | 已定题目（±RQ、±范围） | S1 缺口分析 | 引言「现有综述总结」（S5） |
| S3 | 检索式 / 策略表 / 指定库 | S1–S2 | 方法节检索协议（S6） |
| S4 | 筛选后的文献清单 | S1–S3 | PRISMA 计数（S6） |
| S5 | 提取表 / 详细笔记 | S1–S4 | 引用可回溯性（S6） |
| S6 | 已有初稿 | S1–S5 | 先结构诊断，再润色 |

## 命令入口

| 命令 | 用途 |
|---|---|
| `/lit-review` | 从 S1 开始，第一步是选题 |
| `/lit-review-s2` | 已有题目，从 S2 检索策略开始 |
| `/survey-outline` | 先跑结构选择器，再出章节细纲与图表计划（模式 A 用七节骨架），不写正文 |
| `/reading-table` | 按主题设计并生成「多梯队 × 多维度」精读记录表（Excel） |
| `/fig-plan` | 先出统计问题，再出图表候选与聚合数据，最后渲染统计图 |
| `/survey-abstract` | 只写或改摘要 |
| `/mentor-check` | 跑一次导师审查，看当前阶段有没有跑题 |
| `/search-openalex` | 用 OpenAlex 检索或做前向/后向引文追踪 |
| `/audit-refs` | 跑引用与事实审计，报告写进 `05_成稿/引用审计.md` |

Claude Code 把 `commands/*.md` 放到 `.claude/commands/`，之后可直接输入 `/lit-review-s2 题目：……`。DSH 用户说“读 `commands/lit-review-s2.md` 并执行”，安装脚本也会把它复制到 `.dsh/commands/`。

## 六步

| 阶段 | 产物 | 门禁 |
|---|---|---|
| S1 选题 | 缺口陈述 + RQ + 3–5 模块 | 第三人能复述 RQ |
| S2 策略 | 检索策略表 + 日志 | 每行有库 / 式 / 限定 / 预计量 |
| S3 检索初筛 | 候选表 + PRISMA 计数 | 计数闭合，每条有排除码 |
| S4 精读提取 | 提取表 + 笔记 | 纳入文献 100% 有行，局限非空 |
| S5 综合写作 | 概念矩阵 + 冲突地图 + 提纲 + 初稿 | taxonomy 过十篇盲测；每个主题 ≥1 条 L3 关系判断；综合性判断 ≥2 条独立证据（定义 / 描述段不强制多篇） |
| S6 统稿 | 终稿 + 摘要 + 自检清单 | 引用可回溯，格式统一，摘要承诺兑现 |

每个阶段门禁前先跑**导师审查（MR）**：对照 `00_选题/主题契约.md`，只判断“还在回答同一个问题吗”。

## 三道审查

| 模型 | 管什么 | 什么时候跑 | 产出 |
|---|---|---|---|
| **MR 导师审查** | 是否还在回答用户的问题（对照主题契约） | 每个阶段门禁前 | PASS / WARN / BLOCK |
| **CR-S 结构-逻辑审查** | 章节骨架与映射、论证链、防御性语言 | 每章写完、摘要定稿前 | P0/P1 问题表，每节 ≤5 条 |
| **HLA-S 人类语言对齐** | 章际承接、段落节奏、术语一致、AI 腔 | CR-S 通过后 | 原文 → 改写，3–5 处 |

顺序固定：**MR → CR-S → HLA-S**。先确认没跑题，再看结构，最后顺语言。

三者都是只读角色、不改稿；记录分别写进 `00_选题/导师审查.md` 和 `05_成稿/审校记录.md`。规则见 `skills/lit-review-6step/references/mentor-review.md` 与 `skills/survey-writing/references/review-and-alignment.md`。

## 成稿骨架示例（模式 A：新技术 × 旧问题）

> 模式 A 只是六种结构之一；用其他模式时章节骨架按选择器调整。

```text
1 引言：大背景 → 小背景 → 现有综述总结 → 本综述特点 → 论文结构
2 背景知识
  2.1 问题背景：是什么 → 分类 A（a1…am）
  2.2 新技术背景：是什么 → 分类 B（b1…bk）→ 映射声明（b1→第 3 章…）
3 新技术 b1 背景下的问题 a1
4 新技术 b2 背景下的问题 a2
5 新技术 b3 背景下的问题 a3
6 研究挑战与未来方向
7 结论
```

三条硬约束：B 的类数 = 第 3 章起的章数；B×A 交叉矩阵动笔前填满；|A| ≠ |B| 时按 B 分章并说明映射。

## 目录结构

```text
lit-review-6step/
├─ skills/
│  ├─ lit-review-6step/     # 编排器
│  ├─ survey-writing/       # 正文写作
│  ├─ survey-abstract/      # 摘要
│  └─ shared/evidence-norms.md
├─ commands/                # 九个入口
├─ templates/文献综述项目模板/
├─ catalog/skills.json
├─ scripts/                 # check / e2e-init / e2e-score / gold-from-surveys
├─ docs/                    # workflow / 对照测试计划 / 重构记录
├─ e2e/                     # 试跑记录与结果
├─ install.ps1
├─ install.sh
├─ THIRD_PARTY_NOTICES.md
└─ CITATION.cff
```

## 已知限制

- AMiner 检索通道需要自己的 API key；没有 key 时走手工库降级，候选表字段不变。
- 引用核查依赖可选的 `academic-paper`；没装时只能按清单人工核对。
- 仓库不包含任何第三方 skill 源码，第三方由安装脚本在用户本机下载。
- 六种结构是组织方式，不是可执行检查：结构选择、taxonomy 十篇盲测、L3 关系判断仍是文字门禁；`audit-taxonomy` 只查分类表本身（单篇类别、「其他」占比、来源单一、纳入未分类）。
- 图表链路只覆盖统计图：`fig-render` 不做统计计算；`stat-questions` 的主题相关性是关键词规则，不是语义判断，换主题要人工复核。
- 三道审查（MR / CR-S / HLA-S）由同一个模型换角色扮演，能降低跑偏和自我辩护，**不保证发现所有问题**；关键节点仍需人工确认。

## 许可证

MIT，见 [LICENSE](LICENSE)。第三方组件见 [THIRD_PARTY_NOTICES.md](THIRD_PARTY_NOTICES.md)。

`survey-writing` 与 `survey-abstract` 为本仓库原创。

## 引用

若在论文或课程材料中使用，引用方式见 [CITATION.cff](CITATION.cff)。
