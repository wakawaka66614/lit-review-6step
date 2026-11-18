---
name: fig-plan
description: 从项目数据生成主题驱动的图表候选，并渲染统计图
---

不要套固定四件套。先看这个主题要回答什么，再从数据生成候选。

1. 跑规划器（在项目根目录）：

```text
node scripts/fig-plan.mjs `
  --candidates 01_检索/候选表.csv `
  --extraction 03_精读/提取表.csv `
  --relations 04_综合/文献关系表.csv `
  --coverage 04_综合/覆盖矩阵.csv `
  --out-dir 04_综合
```

2. 打开 `04_综合/图表规划建议.md` 与 `图表计划.csv`，逐条问：
   - 这张图回答的问题，正文需要吗？
   - 能不能支撑某条 claim？不能就删。
   - 图型与数据形状匹配吗（类别数、时间点数、是否有数值）？
3. 删改后补 `claim_id` 与结论式 `title`，再渲染：

```text
python scripts/fig-render.py --spec 04_综合/图表计划.csv --out-dir 04_综合/figures
```

4. 结构图 / 框架图不要用统计图凑，交 `nature-figure`；数据图不要用示意图冒充。

规则见 `references/figure-planning.md`。只报告生成了什么、删了什么、为什么。
