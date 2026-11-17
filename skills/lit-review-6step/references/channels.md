# 检索通道

## 四条通道

| 通道 | 类型 | 能做什么 | 限制 | 怎么用 |
|---|---|---|---|---|
| **AMiner** | 元数据发现 | 关键词/期刊/作者检索，中英文题录 | 单页 10 条，无引文网络，无全文 | DSH MCP 工具（`mcp__aminer__search_papers_*`） |
| **OpenAlex** | 元数据 + 引文 | 检索、前向引文、后向引文、年份过滤 | 无全文；部分中文文献覆盖弱 | `scripts/search-openalex.mjs` |
| **综合/专业库** | 全文数据库 | WoS / Scopus / CNKI / 万方 / PubMed | 需订阅，人工操作 | 手工检索，按候选表字段录入 |
| **其他元数据 API** | 元数据 | Crossref、Semantic Scholar | 需按接口文档 | 可选，按需接入 |

## OpenAlex 脚本

```powershell
# 检索
node .dsh/skills/lit-review-6step/scripts/search-openalex.mjs `
  --query "retrieval augmented generation" --pages 2 --per-page 25 `
  --from-year 2020 --to-year 2026 --out 01_检索/oa.csv

# 前向引文（谁引用了 Wxxxx）
node .dsh/skills/lit-review-6step/scripts/search-openalex.mjs `
  --mode cited-by --id W2741809807 --pages 2 --out 01_检索/oa-cites.csv

# 后向引文（Wxxxx 引用了谁）
node .dsh/skills/lit-review-6step/scripts/search-openalex.mjs `
  --mode references --id W2741809807 --out 01_检索/oa-refs.csv
```

输出与 `原始检索结果.csv` 同构（`record_id,source,platform,query,search_date,title,authors,year,doi,url,note`），可直接并入原始结果，再统一去重进候选表。

## 引文追踪是强制环节

系统综述与学位综述都要做：

1. 选 5–10 篇种子（奠基 + 最新代表作）；
2. 每篇做前向 + 后向；
3. 记录：种子、方向、工具、新增记录数、去重后数量（写进检索日志的“引文追踪记录”表）；
4. 追踪结果并入原始结果，统一去重与筛选。

## 记录要求

- 每次机器检索先写 `01_检索/原始检索结果.csv`，不要只留候选表；
- 检索日志写清：来源、平台、检索式原文、限定、日期、命中；
- AMiner 与 OpenAlex 的 `total` 都不可靠，以翻页/游标结束为准。
