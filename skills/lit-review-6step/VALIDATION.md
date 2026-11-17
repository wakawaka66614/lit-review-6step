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
| 检索阶段对照 | 单查询 vs 多查询 + 引文追踪（OpenAlex） | 覆盖率 3.3% vs 36.7%；增量主要来自引文追踪 |
| 写作阶段小试 | 同模型单次直写 vs 流程产出（8 篇摘要级） | 无法回溯引用 2 vs 0；明确标注非质量对照 |

## 未验证

- **没有做真实 A/B/C 对照**：`e2e/…/gold-set.csv` 仍为空，覆盖率与质量指标无法计算；`RESULTS.md` 只记录机制试跑。
- **没有真实综述的端到端质量评估**：无对照实验证明“用这套流程写出来的综述优于不用”。
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
