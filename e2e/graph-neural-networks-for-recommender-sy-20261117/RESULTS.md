# 检索阶段对照结果：关键词检索 vs 多查询 + 引文追踪

- 日期：2026-11-17
- 主题：graph neural networks for recommender systems
- 金标准：**顶刊综述派生集**（survey-derived，非人工逐篇核验）

## 金标准怎么来的

用三篇顶刊综述的参考文献：

| 综述 |  venue | 年份 | OpenAlex |
|---|---|---|---|
| Graph Neural Networks in Recommender Systems: A Survey | ACM Computing Surveys | 2022 | W3097300053 |
| A Survey of Graph Neural Networks for Recommender Systems | ACM Transactions on Recommender Systems | 2023 | W4315977496 |
| A Survey on Recommender Systems Using Graph Neural Network | ACM Transactions on Information Systems | 2024 | W4402306238 |

- 三篇共 633 条去重引用；
- 被 ≥2 篇共同引用 109 条；
- 按共同引用数与总被引排序，取前 30 条为参考集；
- `verified_by=survey-derived`，**不等于人工核验**。

复现：

```powershell
node scripts/gold-from-surveys.mjs --surveys W3097300053,W4315977496,W4402306238 `
  --keyword "*" --min-shared 2 --max 30 --out e2e/<run>/gold-set.csv
```

## 两条条件

| 条件 | 做法 | 检索量 |
|---|---|---|
| **A 基线** | 单条关键词 `graph neural networks for recommender systems`，OpenAlex 相关性前 25 | 25 |
| **C 流程** | 3 条分面查询（GNN 推荐 / 图卷积协同过滤 / 知识图谱推荐）各 25 + PinSage 前向引文 + 后向引文 | 132（去重后） |

两条都用 OpenAlex 同一数据源，差别只在策略。

## 结果

| 条件 | 候选数 | 命中金标准 | 覆盖率 |
|---|---|---|---|
| A 单查询 | 25 | 1 / 30 | **3.3%** |
| C 多查询 + 引文 | 132 | 11 / 30 | **36.7%** |

C 的累计曲线：

| 累计到 | 候选数 | 覆盖率 |
|---|---|---|
| 3 条分面查询 | 75 | 3.3% |
| + PinSage 前向引文 | 98 | 26.7% |
| + PinSage 后向引文 | 132 | 36.7% |

## 说明什么

- 在同样的 OpenAlex 源上，**多打几条关键词几乎不涨覆盖**（75 条仍 3.3%）；
- 覆盖率的主要增量来自**引文追踪**（+10 篇）；
- 这与 V2 把“引文追踪”设为强制环节的判断一致。

## 不能说明什么

- **不是综述质量对照**：没有写正文，没有评证据准确率、分类合理性、综合深度；
- **金标准是综述派生**，不是人工核验；三篇综述本身可能漏掉新工作；
- 30 条里含 GAT、GraphSAGE 等通用 GNN 基础文献，主题边界偏宽；
- DOI 版本差异（arXiv vs 正式版）会造成漏计，实际覆盖率应略高；
- 样本只有一个主题，不能外推。

## 复现

```powershell
node skills/lit-review-6step/scripts/search-openalex.mjs `
  --query "graph neural networks for recommender systems" --pages 1 --per-page 25 `
  --out e2e/<run>/runs/A/01_检索/oa2.csv

# C 的五次检索见 runs/C/01_检索/*.csv
node scripts/e2e-score.mjs --run e2e/<run>/runs/A --gold e2e/<run>/gold-set.csv
node scripts/e2e-score.mjs --run e2e/<run>/runs/C --gold e2e/<run>/gold-set.csv
```

## 写作阶段小试

另见 `RESULTS-writing.md`：同模型单次直写 vs 流程产出（可追溯性演示，非质量对照）。

## 检索策略 A/B/C/D

另见 `RESULTS-abcd.md`：控制预算后，多查询 @25 覆盖 0%，多查询+引文 @25 覆盖 13.3%，@194 覆盖 60%。
