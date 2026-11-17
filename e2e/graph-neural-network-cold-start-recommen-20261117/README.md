# 端到端对照：graph neural network cold start recommendation

生成日期：20261117

## 步骤

1. 填 `gold-set.csv`：人工检索并核验 20–40 篇核心文献，写清 `why_core` 与 `verified_by`。
2. 条件 A：普通 LLM 一次性写综述，产物放 `runs/A/`。
3. 条件 B：当前 skill 全流程，产物放 `runs/B/`。
4. 条件 C：V2 流程，产物放 `runs/C/`（已有目录骨架）。
5. 按 `scores.csv` 评分；结论写 `RESULTS.md`。

## 规则

- 三条条件用同一主题、同一截止日期、同一模型（若可比）。
- 记录耗时、token、人工修改分钟。
- 必须报告失败案例与人工大改比例。
- 评价人姓名与分工写进 RESULTS.md。

参考：`docs/E2E_TEST_PLAN.md`。
