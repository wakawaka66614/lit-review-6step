# Changelog

## 2.5.0 — 2026-11-18

阅读前先按主题生成“精读记录表”。

- 新增 `references/reading-table.md`：梯队按阅读目的分、维度从 RQ 长出来（机制 / 证据 / 边界），6–9 个维度
- 新增 `scripts/make-reading-table.py`：按 JSON 规格生成 Excel（封面 / 使用说明 / 阅读框架 / 进度 / 总览 / 各梯队页），含维度提问行、冻结窗格、筛选
- 新增 `assets/reading-table-spec.example.json` 与 `/reading-table` 命令
- S4 增加“建精读表”步骤与门禁；用 29 篇 LLM 记忆记录表实测生成 9 个 sheet

## 2.4.0 — 2026-11-18

支持“多梯队 + 多阅读维度”的 Excel 精读记录表。

- 新增 `scripts/xlsx-to-csv.py`：自动找表头、跳过维度提问行、合并多个梯队 sheet，输出带 `tier` 与各维度列的提取表
- `stat-questions` 识别 `tier` / memory_object / addressing / retrieval / migration / replacement / persistence / consistency / evaluation / limitation，生成“需先编码”的维度问题
- `fig-plan` 新增梯队计数与“维度证据厚度”热力图（平均字数，不看看空率）
- 用 29 篇 LLM 长期记忆记录表实测：转换 29 行，9 个维度全保留

## 2.3.0 — 2026-11-18

图表之前先问“这个主题该统计什么”。

- 新增 `scripts/stat-questions.mjs`：读提取表，按主题给字段打相关性，生成统计问题候选（方法 / 数据集 / 设计 / 质量 / 年份 / 关系 / 覆盖）
- 输出 `04_综合/统计问题清单.csv` 与 `统计问题建议.md`，含数据画像、优先级与理由
- `/fig-plan` 流程改为“先 stat-questions 选问题 → fig-plan 出候选 → fig-render 渲染”
- 规则写入 `figure-planning.md`：只留能支撑论点的 3–6 条；文本字段先编码再统计

## 2.2.0 — 2026-11-18

图表从“固定模板”改为**主题驱动**。

- 新增 `references/figure-planning.md`：一图一问、数据先于图、按数据形状选图型
- 新增 `fig-plan.mjs`：从候选表 / 提取表 / 关系表 / 覆盖矩阵生成图表候选与聚合数据
- 新增 `fig-render.py`：按 `图表计划.csv` 渲染 bar / hbar / line / stacked_bar / grouped_bar / scatter / heatmap，输出 PDF + SVG + PNG
- 新增 `04_综合/图表计划.csv` 与 `/fig-plan` 命令；提纲模板里的固定“结构图/分类图”清单已删除
- S5 出图流程改为“fig-plan 候选 → 按主题增删 → fig-render / nature-figure”

## 2.1.0 — 2026-11-17

按第二轮审查意见修数据与审计可靠性（见 `docs/REVISION_PLAN_v2.1_2026-11-17.md`）。

- **统一 `paper_id`**：候选表主键改为 `P0001`，新增 `source` / `source_id`；提取表、台账、正文、映射统一引用
- **重写 `audit-refs.mjs`**：从候选表主键识别引用，不再靠前缀正则；支持任意格式主键、`--mapping` 段落映射校验
- **修复 `e2e-score.mjs`**：支持 `P0001` 与 `source_id`，不再漏算 C-XXXX 历史编号
- **新增段落—证据映射**：`03_精读/段落证据映射.csv`，正文 → claim → paper → 页码可追溯
- **论断类型**：`claim_type`（Background / Definition / Empirical / Comparative / Causal / Limitation）与证据门槛
- **质量评价分层**：`appraisal_status` / `appraisal_confidence`；摘要级阅读不得给正式质量等级
- 修正 README / workflow 中“固定七节”的旧表述；核验等级统一为“四级核验 + 用户提供来源标签”
- **覆盖审计**：`coverage-audit.md` + `audit-coverage.mjs` + `04_综合/覆盖矩阵.csv`，主题/方法/时间三维检查
- **分类体检**：`audit-taxonomy.mjs` 检查单篇类别、“其他”占比、来源单一、纳入未分类
- **多源合并**：`merge-results.mjs` 统一去重、分配 `paper_id`、保留来源链、标记出版状态（含撤稿）
- **A/B/C/D 检索对照**：控制预算后，单查询 3.3%、多查询 0%、多查询+引文 13.3%、全量 60%
- **测试报告**：`docs/V2.1_TEST_REPORT.md` 记录通过与失败项

## 2.0.0 — 2026-11-17

按 `docs/REVISION_PLAN_v2_2026-11-17.md` 重构核心设计。

- **取消固定七章节**：改为结构选择器（技术演进 / 方法分类 / 问题导向 / 跨学科 / 系统综述 / 新技术×旧问题），模式 A 只是可选之一；分类必须从文献归纳
- **新增论断—证据台账**：`03_精读/论断证据.csv`，字段含 Claim ID、证据位置、支持程度、适用条件、核验状态；强论断必须绑定 `claim_id`
- **核验等级拆四级**：全文核验 / 摘要核验 / 元数据核验 / 未核验；摘要核验不能再支撑方法细节与数字
- S5 门禁从“每段 2 篇对撞”改为“综合性判断需 ≥2 条独立证据；定义与描述性段落不强制”
- S6 增加台账核验；新增 `自检清单.md` 模板
- **重构检索与筛选**：四类来源（综合库/专业库/元数据 API/引文追踪）；原始检索结果留存；数据库不设数量门槛；PRISMA 2020 分阶段计数；E6“未获取”与 E7“资格不符”分离，异质性不作为排除理由
- **新增研究质量评价**：按设计选框架，输出高/中/低 + 依据；提取表增加 `design`、`quality`、`quality_notes` 三列
- **新增跨文献综合机制**：六种关系类型（一致 / 部分一致 / 冲突 / 方法差异 / 互补 / 无关）、L1–L5 综合层级、`04_综合/文献关系表.csv`；冲突地图只放“结论冲突”子集
- **新增引用与事实审计脚本**：`skills/lit-review-6step/scripts/audit-refs.mjs`，查未知 ID、未纳入引用、作者年份、claim 核验等级，输出 `05_成稿/引用审计.md`
- **新增 OpenAlex 检索通道**：`scripts/search-openalex.mjs`，支持检索、前向引文、后向引文，输出与原始检索结果同构的 CSV；新增 `references/channels.md` 与 `/search-openalex` 命令
- **摘要去模板化**：保留五个功能，取消固定比例（50–65%）、强制 `However` 与“数字即可信度”的要求；CS 六句改为“示例，非必选”
- **新增端到端测试基础设施**：`docs/E2E_TEST_PLAN.md`、`scripts/e2e-init.mjs`、试跑记录 `e2e/…/RESULTS.md`；OpenAlex 无 key 时改用 page 翻页并提示 key
- **安装器升级**：`-SkillsDir` 支持 `.claude/skills`、`-Global` 用户级安装、依赖锁定到 commit、旧版本自动备份；`VALIDATION.md` 补记审计/检索/安装测试
- **端到端机械评分**：`scripts/e2e-score.mjs` 计算覆盖率、未知引用、弱证据 claim；人工指标仍留空待评
- **综述派生金标准 + 检索阶段对照**：`scripts/gold-from-surveys.mjs` 从三篇顶刊综述（CSUR / TORS / TOIS）构建 30 条参考集；单查询覆盖 3.3%，多查询 + 引文追踪 36.7%
- **写作阶段小试**：同模型单次直写 vs 流程产出（8 篇摘要级）；无法回溯引用 2 vs 0，明确标注“可追溯性演示，非质量对照”
- 安装脚本改为**备份旧版本**而非删除；主 SKILL 版本统一为 2.0.0
- 修正 HLA-S 示例中无来源的“12%”数字；修正 Gate B 的摘要时序（先蓝图、后正式摘要）；修正 README 与 workflow 中把模式 A 当默认的旧表述

## 1.4.0 — 2026-11-11

- 新增**导师审查（MR）**：全程对照 `00_选题/主题契约.md` 判断是否跑题，每阶段门禁前必跑
- 判定三级 PASS / WARN / BLOCK；WARN 留痕、连续两次升 BLOCK；BLOCK 退回上一阶段
- 新增 `skills/lit-review-6step/references/mentor-review.md`（规则、每阶段检查表、输出模板）
- 新增模板 `00_选题/主题契约.md`、`00_选题/导师审查.md`，以及命令 `commands/mentor-check.md`
- 预检新增第 4 条：没有主题契约不开工；六阶段门禁全部叠加 MR

## 1.3.0 — 2026-11-11

- 新增两个只读辅助模型：**CR-S**（结构-逻辑审查：七节骨架、B 类数与章数、章节映射、论证链、防御性语言，只报 P0/P1）与 **HLA-S**（人类语言对齐：章际承接、段落节奏、术语一致、去 AI 腔）
- 每章写完先 CR-S 再 HLA-S，摘要定稿前单独过 CR-S，结果写入 `05_成稿/审校记录.md`
- 新增 `skills/survey-writing/references/review-and-alignment.md`（规则、词表、输出模板）与模板 `05_成稿/审校记录.md`
- S5/S6 门禁同步：每章需有 CR-S / HLA-S 记录，摘要需 CR-S

## 1.2.0 — 2026-11-10

- 接入 `nature-figure`（可选依赖，Apache-2.0）到 S5：图表计划逐张落地，数据图走 Python/R 后端，结构图走矢量示意图，交付前跑自带 audit
- 出图统一存 `04_综合/figures/`，命名 `Fig1_xxx.pdf/.svg/.png`
- S5 门禁增加"图表计划里的每张图要么出图、要么注明不画"
- README、THIRD_PARTY_NOTICES、catalog 同步更新

## 1.1.0 — 2026-11-09

- 新增 `commands/` 四个入口命令：`lit-review`、`lit-review-s2`、`survey-outline`、`survey-abstract`
- 新增 `skills/shared/evidence-norms.md`：证据与语言规范，三个 skill 共用
- 新增 `scripts/check.mjs`：七项仓库自检（catalog、frontmatter、引用路径、README 覆盖、个人路径、密钥、编码）
- 新增 `catalog/skills.json`：skill 目录的单一事实源
- 每个 skill 增加 `VALIDATION.md`：写明验证过什么、没验证什么
- 安装脚本增加命令复制（`.dsh/commands/`）

## 1.0.0 — 2026-11-09

首个公开版本。

- 六阶段编排器 `lit-review-6step`：选题、检索策略、检索与初筛、精读提取、综合写作、统稿
- 入口选择：S1–S6 任一阶段进入，含最小输入契约与欠账登记
- 结构模式一「新技术 × 旧问题」：七节骨架、B×A 交叉矩阵、四条结构门禁
- `survey-writing`：物种选择、taxonomy、图表规划、Gate A/B/C
- `survey-abstract`：摘要五段式
- 项目模板：六步目录、检索策略表、候选表、提取表、提纲、摘要、自检清单
- 可选 AMiner 检索通道与健康检查脚本
