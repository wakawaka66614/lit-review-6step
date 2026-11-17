# 机制试跑结果：OpenAlex 通道 + 运行目录

- 日期：2026-11-17
- 主题：graph neural network cold start recommendation
- 条件：仅验证**机制**，不是质量对照

## 执行

```powershell
node scripts/e2e-init.mjs --topic "graph neural network cold start recommendation" --out e2e
node skills/lit-review-6step/scripts/search-openalex.mjs `
  --query "graph neural network cold start recommendation" `
  --pages 2 --per-page 5 --from-year 2019 --to-year 2026 `
  --out e2e/graph-neural-network-cold-start-recommen-20261117/runs/C/01_检索/oa-raw.csv
```

## 结果

| 项 | 数值 |
|---|---|
| OpenAlex 命中（两页） | 10 |
| 去重后 | 10（DOI 全唯一） |
| 年份分布 | 2020:1, 2022:2, 2023:3, 2024:1, 2025:1, 2026:2 |
| 主要来源 | ACM TOIS(2)、AAAI(1)、ICDE(1)、Research Square(1) |
| 输出字段 | 与 `原始检索结果.csv` 同构 |

## 这次证明了什么

- OpenAlex 通道可用，CSV 能直接并入原始检索结果；
- 无 key 时用 `page` 翻页可行；`cursor` 深度翻页需要免费 key；
- 去重键（DOI）工作正常。

## 没有证明什么

- **没有金标准**：`gold-set.csv` 仍为空，覆盖率无法计算；
- **没有跑 A/B/C 三条条件**：`scores.csv` 未填；
- **没有做筛选、提取、写作、审计**：这些需要完整项目与人工；
- 因此这不是“质量对照”，只是“管道通不通”。

## 完成真实对照还缺

1. 由你确定一个真实主题；
2. 人工核验 20–40 篇金标准文献；
3. 三条条件各跑一遍并评分（评价人 1–2 名）；
4. 把结论写进本文件并附失败案例。

## OpenAlex 使用提示

- 无 key：共享日预算（$0.10），可能 401；翻页用 `--pages`（page 模式）；
- 有 key：`--api-key` 或环境变量 `OPENALEX_API_KEY`，可用 cursor 深度翻页；
- 申请地址：https://openalex.org
