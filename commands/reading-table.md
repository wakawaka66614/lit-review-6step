---
name: reading-table
description: 按主题设计并生成精读记录表（多梯队 × 多维度的 Excel）
---

读之前先建表。不要套固定模板，梯队与维度都从 RQ 来。

1. 读 `00_选题/研究缺口与RQ.md` 与 `01_检索/候选表.csv`，回答：
   - 这篇综述要用哪些维度横向比较文献？（机制 / 证据 / 边界）
   - 哪些是必读核心、哪些是方法竞品、哪些是评测与背景？
2. 按 `references/reading-table.md` 设计 3–5 个梯队、6–9 个维度；每个维度写 `question / write / boundary / analysis`。
3. 写规格 JSON（参考 `assets/reading-table-spec.example.json`），把候选表里 `included=1` 的文献按梯队放进去。
4. 生成：

```text
python scripts/make-reading-table.py --spec 阅读表规格.json --out 03_精读/精读记录表.xlsx
```

5. 检查生成结果：sheet 是否齐全（封面/使用说明/阅读框架/进度/总览/各梯队）、维度提问行是否对齐、每篇是否都有编号与年份。

只报告：梯队数、维度数、篇数，以及哪些维度是为了这篇综述专门加的。
