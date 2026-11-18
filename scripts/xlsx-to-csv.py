#!/usr/bin/env python3
"""把“精读文献记录表”类 Excel 转成可统计的 CSV。

适配多梯队工作表：表头行含“文献”和“编号”，下一行是维度提问，再往下是数据。

用法：
    python scripts/xlsx-to-csv.py --xlsx 记录表.xlsx --out 03_精读/提取表.csv
"""
import argparse
import csv
import os
import re
import sys

from openpyxl import load_workbook

# 表头别名 → 标准列名
ALIASES = {
    "seq": ["序", "序号"],
    "title": ["文献", "文献标题", "标题"],
    "ref_no": ["编号"],
    "authors_year": ["第一作者 / 年份", "第一作者/年份", "作者 / 年份", "作者"],
    "purpose": ["精读目的", "重点关注", "用途", "为什么要读", "阅读目标 / 重点关注"],
    "memory_object": ["Memory Object", "记忆对象"],
    "addressing": ["Addressing", "寻址"],
    "retrieval_fault": ["Retrieval / Fault", "Retrieval/Fault", "取回 / 缺页"],
    "migration": ["Migration", "迁移"],
    "replacement": ["Replacement", "淘汰", "替换"],
    "persistence": ["Persistence", "持久性"],
    "consistency": ["Consistency", "一致性"],
    "evaluation": ["Evaluation", "评测"],
    "limitation": ["Limitation", "局限"],
    "flag": ["重点标记", "标记"],
    "status": ["阅读状态", "状态"],
    "completion": ["完成度"],
    "updated": ["最后更新", "更新时间"],
    "notes": ["备注 / 证据", "备注/证据", "备注"],
}

OUT_COLUMNS = ["paper_id", "tier", "seq", "ref_no", "title", "authors_year", "year", "purpose",
               "memory_object", "addressing", "retrieval_fault", "migration", "replacement",
               "persistence", "consistency", "evaluation", "limitation", "flag", "status",
               "completion", "updated", "notes"]


def norm(v):
    return re.sub(r"\s+", " ", str(v)).strip() if v is not None else ""


def find_header(ws):
    """找到含“文献”和“编号”的表头行号（1-based）。"""
    for row in ws.iter_rows(min_row=1, max_row=min(ws.max_row, 12)):
        vals = [norm(c.value) for c in row]
        if any("文献" in v for v in vals) and any("编号" in v for v in vals):
            return row[0].row, {v: i for i, v in enumerate(vals) if v}
    return None, None


def map_columns(header_map):
    cols = {}
    for key, aliases in ALIASES.items():
        for alias in aliases:
            for name, idx in header_map.items():
                if norm(alias).lower() == norm(name).lower() or norm(alias) in norm(name):
                    cols[key] = idx
                    break
            if key in cols:
                break
    return cols


def parse_year(text):
    m = re.search(r"(19|20)\d{2}", text or "")
    return m.group(0) if m else ""


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--xlsx", required=True)
    ap.add_argument("--out", required=True)
    ap.add_argument("--sheet-pattern", default="梯队")
    args = ap.parse_args()

    wb = load_workbook(args.xlsx, data_only=True)
    rows = []
    pid = 0
    for ws in wb.worksheets:
        if args.sheet_pattern and not re.search(args.sheet_pattern, ws.title):
            continue
        header_row, header_map = find_header(ws)
        if not header_row:
            continue
        cols = map_columns(header_map)
        if "title" not in cols:
            continue
        for r in range(header_row + 2, ws.max_row + 1):  # 跳过维度提问行
            vals = [norm(c.value) for c in ws[r]]
            title = vals[cols["title"]] if cols["title"] < len(vals) else ""
            if not title:
                continue
            rec = {"tier": ws.title, "seq": vals[cols["seq"]] if "seq" in cols and cols["seq"] < len(vals) else ""}
            for key in OUT_COLUMNS:
                if key in ("paper_id", "tier", "seq", "year"):
                    continue
                idx = cols.get(key)
                rec[key] = vals[idx] if idx is not None and idx < len(vals) else ""
            rec["year"] = parse_year(rec.get("authors_year", ""))
            ref = rec.get("ref_no", "")
            m = re.search(r"\d+", ref)
            pid += 1
            rec["paper_id"] = f"P{int(m.group(0)):04d}" if m else f"P{pid:04d}"
            rows.append(rec)

    seen = set()
    unique = []
    for r in rows:
        if r["paper_id"] in seen:
            continue
        seen.add(r["paper_id"])
        unique.append(r)

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    with open(args.out, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=OUT_COLUMNS)
        w.writeheader()
        w.writerows(unique)

    print(f"转换 {len(unique)} 篇 -> {args.out}")
    filled = {k: sum(1 for r in unique if r.get(k)) for k in OUT_COLUMNS if k not in ("paper_id", "tier", "seq")}
    for k, v in sorted(filled.items(), key=lambda x: -x[1]):
        print(f"  {k}: {v}/{len(unique)}")


if __name__ == "__main__":
    main()
