---
name: fig-plan
description: 按主题生成统计问题与图表候选，并渲染统计图
---

不要套固定四件套，也不要上来就画。先问统计问题，再画图。

0. 如果材料是 Excel 精读记录表（多梯队 / 多维度）：

```text
python scripts/xlsx-to-csv.py --xlsx 记录表.xlsx --out 03_精读/提取表.csv
```

转换后确认有 `tier` 与维度列（如 memory_object / addressing / retrieval_fault）。

1. 从提取表生成**主题相关的统计问题**：

```text
node scripts/stat-questions.mjs `
  --extraction 03_精读/提取表.csv `
  --candidates 01_检索/候选表.csv `
  --topic "你的主题" `
  --out-dir 04_综合
```

看 `04_综合/统计问题建议.md` 的数据画像与 `统计问题清单.csv`：只留 3–6 条能支撑论点的，删掉“数据里正好有但主题不需要”的。

2. 生成图表候选：

```text
node scripts/fig-plan.mjs `
  --candidates 01_检索/候选表.csv `
  --extraction 03_精读/提取表.csv `
  --relations 04_综合/文献关系表.csv `
  --coverage 04_综合/覆盖矩阵.csv `
  --out-dir 04_综合
```

3. 逐条问：这张图回答的问题正文需要吗？能支撑哪条 claim？图型与数据形状匹配吗？删改后补 `claim_id` 与结论式 `title`。

4. 渲染：

```text
python scripts/fig-render.py --spec 04_综合/图表计划.csv --out-dir 04_综合/figures
```

5. 结构图 / 框架图交 `nature-figure`；数据图不要用示意图冒充。

规则见 `references/figure-planning.md`。只报告生成了什么、删了什么、为什么。
