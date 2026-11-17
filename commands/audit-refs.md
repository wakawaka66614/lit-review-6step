---
name: audit-refs
description: 跑引用与事实审计，按 paper_id 校验引用、claim、段落映射与核验等级
---

运行 `skills/lit-review-6step/scripts/audit-refs.mjs`（安装后在 `.dsh/skills/lit-review-6step/scripts/`）：

```text
--manuscript 05_成稿/终稿.md
--candidates 01_检索/候选表.csv
--claims 03_精读/论断证据.csv
--mapping 03_精读/段落证据映射.csv
--out 05_成稿/引用审计.md
```

检查：

1. 正文里的 `P0001` / 遗留 `AM-0001` 等引用是否存在、是否 `included=1`；
2. `C001` 等 claim 引用是否存在、核验等级是否够（摘要核验不能撑数字，Causal 必须全文核验）；
3. 作者-年份引用能否在候选表找到；候选表缺 `authors` 时会明确报“无法核验”，不会假装通过；
4. 段落映射里的 claim / paper 是否存在、`claim.paper_id` 与映射是否一致、核验等级是否一致；
5. 重复 DOI、非法 DOI、纳入文献缺作者。

执行后：

- 把错误逐条列给用户（类型、位置、内容、说明），不要只说“有几处”；
- 错误必须修完，S6 才算过；警告里“纳入未引用”要看是不是漏引；
- 提醒用户：这是启发式检查，引用是否支持论断仍要回原文核对。

不替用户改稿；发现错误只报告与建议。
