# 验证记录：lit-review-6step

## 验证环境

- 日期：2026-11-09 初验；2026-11-17 补验
- 宿主：DSH（Windows 11），agent 模型 deepseek-flash
- 验证人：武文政

## 已验证

| 项 | 方法 | 结果 |
|---|---|---|
| skill 可被加载 | DSH 技能目录出现 `lit-review-6step` | 通过 |
| 子 skill 路径 | 逐一 `Test-Path` 依赖的 `SKILL.md` | 存在 |
| 安装脚本（默认） | 空目录执行两次 `install.ps1` | 4 个 `.bak` 备份，7 个命令 |
| 安装脚本（Claude） | `-SkillsDir .claude\skills` | 装到 `.claude\skills` 与 `.claude\commands`，无 `.dsh` |
| AMiner 健康检查 | `node scripts/aminer_health.mjs` | 正确报 `EXPIRED` |
| 引用审计脚本 | 5 篇候选 + 3 条 claim 的样例稿 | 命中 5 个预期错误 + 1 个未引用警告 |
| OpenAlex 检索 | `--query "retrieval augmented generation"` | 返回 5 条，DOI/年份正常 |
| OpenAlex 引文 | `--mode cited-by` / `--mode references` | 分别返回 3 / 5 条，CSV 同构 |
| OpenAlex 无 key 翻页 | `--pages 2 --per-page 5` | 用 page 模式成功；cursor 深翻需要 key（已提示） |
| 端到端脚手架 | `e2e-init.mjs` + 一次检索试跑 | 目录、金标准模板、评分表生成；10 条记录 |
| 端到端机械评分 | `e2e-score.mjs` + 2 条金标准 + 2 条候选的样例 | 覆盖率 50%、未知引用 1、弱证据 claim 1，符合预期 |
| 综述派生金标准 | 三篇顶刊综述（CSUR/TORS/TOIS）参考文献 | 633 条去重引用 → 109 条共同引用 → 取 30 条 |
| 检索阶段对照（不控预算） | 单查询 vs 多查询 + 引文追踪（OpenAlex） | 覆盖率 3.3%（25 条） vs 36.7%（132 条）；75 条时仍 3.3%，增量主要来自引文追踪 |
| 检索阶段对照（控预算 A/B/C/D） | 四组同预算 25 条 vs D 放开到 194 条 | A 3.3% / B 0.0% / C 13.3% / D 60.0%；四组条件不同，60% 不能与 36.7% 直接比较 |
| 写作阶段小试 | 同模型单次直写 vs 流程产出（8 篇摘要级） | 无法回溯引用 2 vs 0；明确标注非质量对照 |
| V2.1 paper_id 审计 | 3 条候选 + 3 条 claim + 3 行映射，含 P9999 与未纳入 P0003 | 6 个预期错误 + 1 个映射等级警告；P9999 被识别 |
| V2.1 e2e-score | 候选表 3 条、稿中引用 P0001 与 P9999 | 未知引用 1（P9999） |
| 图表规划 | 194 条候选 + 9 篇提取 | 生成 3 条候选（年份 / 设计 / 质量），数据聚合正常 |
| 图表渲染 | `fig-render.py` 渲染 3 张 | PDF/SVG/PNG 各 3，中文与坐标轴正常 |
| 覆盖图 | 覆盖矩阵 4 个方向 | 分组条形图正常，缺口可读 |
| 统计问题生成 | 9 篇提取 + 主题 “graph neural network recommendation” | 11 条候选；方法/数据集为高优先级 |
| 统计问题（无主题） | 不传 `--topic` | 全部降为低优先级，不假装相关 |
| Excel 精读表转换 | 29 篇、4 梯队、9 维度的 xlsx | 29 行；`tier` 与 9 个维度列全保留 |
| 统计问题（该表） | 主题 “LLM 长期记忆存储” | 9 条候选；维度编码与证据厚度为高优先级 |
| 证据厚度图 | 4 梯队 × 9 维度 | 热力图显示第一/第四梯队明显偏薄 |
| 精读表生成（LLM 记忆） | 29 篇 / 4 梯队 / 9 维度规格 | 9 个 sheet；表头、提问行、数据行对齐 |
| 精读表生成（示例） | 示例规格 2 梯队 3 篇 / 6 维度 | 可打开，冻结窗格与筛选正常 |
| 语料硬门槛 | 正式项目 55 纳入 / 6 全文 / 55 引用 | `audit-corpus` 通过；18 篇时三项全失败 |

## 未验证

- **没有做写作质量的对照**：检索覆盖率已跑（`gold-set.csv` 30 条，见 `e2e/.../RESULTS.md` 与 `RESULTS-abcd.md`），但那是检索策略实验，不是“流程写出的综述是否更好”；既没有对照实验，也没有独立评价人盲评。
- **没有跨模型验证**：其他 agent（Claude Code / Codex）未测试。
- **门禁仍是文字规则**：十篇盲测、L3 关系判断等没有脚本强制。
- **`-Global` 安装未实测**（避免污染用户级目录）。

## 复现步骤

```powershell
git clone https://github.com/wakawaka66614/lit-review-6step.git
cd lit-review-6step

# 安装与备份
.\install.ps1 -Target C:\tmp\lr-a
.\install.ps1 -Target C:\tmp\lr-a          # 第二次应生成 .bak-*
.\install.ps1 -Target C:\tmp\lr-b -SkillsDir .claude\skills

# 仓库自检
node scripts/check.mjs

# 引用审计（用仓库里的样例数据）
node skills/lit-review-6step/scripts/audit-refs.mjs `
  --manuscript ..\_research\audit-test\manuscript.md `
  --candidates ..\_research\audit-test\candidates.csv `
  --claims ..\_research\audit-test\claims.csv

# OpenAlex 检索
node skills/lit-review-6step/scripts/search-openalex.mjs `
  --query "retrieval augmented generation" --pages 1 --per-page 5

# 端到端脚手架
node scripts/e2e-init.mjs --topic "your topic" --out e2e
```
