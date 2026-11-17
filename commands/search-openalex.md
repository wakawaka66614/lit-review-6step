---
name: search-openalex
description: 用 OpenAlex 做检索或前向/后向引文追踪，输出与原始检索结果同构的 CSV
---

运行 `skills/lit-review-6step/scripts/search-openalex.mjs`（安装后在 `.dsh/skills/lit-review-6step/scripts/`）。

三种模式：

1. **检索**：`--query "关键词" --pages 2 --per-page 25 --from-year 2020 --out 01_检索/oa.csv`
2. **前向引文**：`--mode cited-by --id Wxxxx --pages 2 --out 01_检索/oa-cites.csv`
3. **后向引文**：`--mode references --id Wxxxx --out 01_检索/oa-refs.csv`

执行前：

- 先确认 `--query` 或 `--id` 有值；没有就向用户要；
- 大规模检索前先用 `--per-page 5` 试跑，确认关键词效果；
- 结果写入 `01_检索/原始检索结果.csv` 同一套字段，不要只留候选表。

执行后：报告条数、前几条标题与年份，提醒用户把结果并入原始结果并记录到检索日志的“引文追踪”表。
