---
name: audit-refs
description: 跑引用与事实审计，检查文献 ID、作者年份、claim 与核验等级
---

运行 `skills/lit-review-6step/scripts/audit-refs.mjs`（安装后在 `.dsh/skills/lit-review-6step/scripts/`），参数：

```text
--manuscript 05_成稿/初稿.md
--candidates 01_检索/候选表.csv
--claims 03_精读/论断证据.csv
--out 05_成稿/引用审计.md
```

1. 先确认三个文件都在；缺台账就只跑文献 ID 与作者年份检查。
2. 把错误逐条列给用户（类型、位置、内容、说明），不要只说“有几处”。
3. 错误必须修完，S6 才算过；警告里“纳入未引用”要看是不是漏引。
4. 提醒用户：这是启发式检查，引用是否支持论断仍要回原文核对。

不替用户改稿；发现错误只报告与建议。
