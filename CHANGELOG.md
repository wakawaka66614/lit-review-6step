# Changelog

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
