#!/usr/bin/env python3
"""按主题生成“精读文献记录表”Excel，辅助阅读。

输入是一份 JSON 规格（由模型按主题设计，不是固定模板）：

    {
      "topic": "LLM 长期记忆存储",
      "subtitle": "精读文献记录表",
      "note": "填完后可直接横向比较……",
      "dimensions": [
        {"name": "Memory Object", "question": "系统实际管理什么？",
         "write": "对象类型 + 粒度", "boundary": "不要把缓存块与语义记忆混为一谈",
         "analysis": "横向比较谁管理什么"}
      ],
      "tiers": [
        {"name": "第一梯队", "description": "核心理论",
         "papers": [{"ref": "[1]", "title": "...", "authors_year": "Kwon et al. · 2023",
                     "focus": "理解分页与映射"}]}
      ]
    }

用法：
    python scripts/make-reading-table.py --spec 阅读表规格.json --out 03_精读/精读记录表.xlsx
"""
import argparse
import json
import os
import re

from openpyxl import Workbook
from openpyxl.styles import Alignment, Border, Font, PatternFill, Side
from openpyxl.utils import get_column_letter

HEADER_FILL = PatternFill("solid", fgColor="1F3864")
SUB_FILL = PatternFill("solid", fgColor="D9E2F3")
Q_FILL = PatternFill("solid", fgColor="F2F2F2")
WHITE_BOLD = Font(color="FFFFFF", bold=True, size=10)
THIN = Side(style="thin", color="BFBFBF")
BORDER = Border(left=THIN, right=THIN, top=THIN, bottom=THIN)
WRAP = Alignment(wrap_text=True, vertical="top")
CENTER = Alignment(horizontal="center", vertical="center", wrap_text=True)


def style_header(ws, row, ncols):
    for c in range(1, ncols + 1):
        cell = ws.cell(row=row, column=c)
        cell.fill = HEADER_FILL
        cell.font = WHITE_BOLD
        cell.alignment = CENTER
        cell.border = BORDER
    ws.row_dimensions[row].height = 30


def style_body(ws, r1, r2, ncols):
    for r in range(r1, r2 + 1):
        for c in range(1, ncols + 1):
            cell = ws.cell(row=r, column=c)
            cell.alignment = WRAP
            cell.border = BORDER
            cell.font = Font(size=10)


def make_cover(wb, spec):
    ws = wb.active
    ws.title = "封面"
    ws.merge_cells("B2:E2")
    ws["B2"] = spec.get("topic", "")
    ws["B2"].font = Font(size=22, bold=True)
    ws.merge_cells("B3:E3")
    ws["B3"] = spec.get("subtitle", "精读文献记录表")
    ws["B3"].font = Font(size=14, color="666666")
    n_papers = sum(len(t.get("papers", [])) for t in spec.get("tiers", []))
    ws.merge_cells("B5:E5")
    ws["B5"] = f"{n_papers} 篇 · {len(spec.get('tiers', []))} 个梯队 · {len(spec.get('dimensions', []))} 个阅读维度"
    ws["B5"].font = Font(size=11)
    ws.merge_cells("B7:E10")
    ws["B7"] = spec.get("note", "每格写机制、证据、边界；空着比写套话好。")
    ws["B7"].alignment = WRAP
    for col, w in zip("ABCDE", [4, 22, 22, 22, 22]):
        ws.column_dimensions[col].width = w


def make_guide(wb, spec):
    ws = wb.create_sheet("使用说明")
    ws["A1"] = "使用说明"
    ws["A1"].font = Font(size=14, bold=True)
    lines = [
        "先读「阅读框架」，再按梯队填；每格 2–4 句，写机制、证据、边界。",
        "",
        "01 这张表怎么用",
        spec.get("note", ""),
        "",
        "02 填表顺序",
        "先填最能区分系统的维度，再补背景维度；不要从第一列顺着抄。",
        "",
        "03 每格至少写清",
        "对象 + 机制 + 证据位置（页码/图表/章节）+ 边界判断。",
        "",
        "04 写完怎么用",
        "横向比较：同一维度跨文献对齐；纵向比较：同一文献跨维度看是否自洽。",
        "",
        "05 不要做的事",
        "不要只写“支持长期记忆”这类结论；不要把不同动作混为一谈；不要留空而不标原因。",
    ]
    for i, line in enumerate(lines, start=2):
        ws.cell(row=i, column=1, value=line).alignment = WRAP
    ws.column_dimensions["A"].width = 110


def make_framework(wb, spec):
    ws = wb.create_sheet("阅读框架")
    headers = ["序", "阅读维度", "需要回答的问题", "记录时至少写清", "常见混淆 / 边界", "写完后用来分析什么"]
    ws.append(headers)
    style_header(ws, 1, len(headers))
    for i, d in enumerate(spec.get("dimensions", []), start=1):
        ws.append([i, d.get("name", ""), d.get("question", ""), d.get("write", ""), d.get("boundary", ""), d.get("analysis", "")])
    style_body(ws, 2, ws.max_row, len(headers))
    for col, w in zip("ABCDEF", [4, 18, 32, 30, 34, 30]):
        ws.column_dimensions[col].width = w
    ws.freeze_panes = "A2"


def make_progress(wb, spec):
    ws = wb.create_sheet("进度")
    ws["A1"] = "进度 · 读到哪里了"
    ws["A1"].font = Font(size=14, bold=True)
    ws["A2"] = "生成时统计；填表后手工或公式更新。"
    ws["A2"].font = Font(size=9, color="666666")
    n = sum(len(t.get("papers", [])) for t in spec.get("tiers", []))
    rows = [("文献总数", n), ("已精读", 0), ("平均完成度", 0), ("必重读", 0)]
    for i, (k, v) in enumerate(rows, start=4):
        ws.cell(row=i, column=1, value=k).font = Font(bold=True)
        ws.cell(row=i, column=2, value=v)
    ws["A10"] = "梯队进度"
    ws["A10"].font = Font(bold=True)
    ws.append([])
    ws.append(["梯队", "篇数", "已精读", "平均完成度"])
    style_header(ws, 12, 4)
    r = 13
    for t in spec.get("tiers", []):
        ws.cell(row=r, column=1, value=t.get("name", ""))
        ws.cell(row=r, column=2, value=len(t.get("papers", [])))
        ws.cell(row=r, column=3, value=0)
        ws.cell(row=r, column=4, value=0)
        r += 1
    style_body(ws, 13, r - 1, 4)
    for col, w in zip("ABCD", [20, 10, 10, 12]):
        ws.column_dimensions[col].width = w


def make_overview(wb, spec):
    ws = wb.create_sheet("总览")
    headers = ["梯队", "序", "文献", "编号", "第一作者 · 年份", "阅读目标", "重点标记", "状态", "完成度", "最后更新"]
    ws.append(headers)
    style_header(ws, 1, len(headers))
    r = 2
    for t in spec.get("tiers", []):
        for i, p in enumerate(t.get("papers", []), start=1):
            ws.cell(row=r, column=1, value=t.get("name", ""))
            ws.cell(row=r, column=2, value=i)
            ws.cell(row=r, column=3, value=p.get("title", ""))
            ws.cell(row=r, column=4, value=p.get("ref", ""))
            ws.cell(row=r, column=5, value=p.get("authors_year", ""))
            ws.cell(row=r, column=6, value=p.get("focus", ""))
            ws.cell(row=r, column=7, value=p.get("flag", ""))
            r += 1
    style_body(ws, 2, r - 1, len(headers))
    for col, w in zip("ABCDEFGHIJ", [14, 5, 46, 8, 20, 34, 10, 10, 10, 12]):
        ws.column_dimensions[col].width = w
    ws.freeze_panes = "A2"


def make_tier(wb, tier, dimensions):
    ws = wb.create_sheet(tier.get("name", "梯队")[:31])
    ws["A1"] = tier.get("name", "")
    ws["A1"].font = Font(size=13, bold=True)
    ws["A2"] = tier.get("description", "")
    ws["A2"].font = Font(size=9, color="666666")

    base = ["序", "文献", "编号", "第一作者 / 年份", "精读目的"]
    manage = ["重点标记", "阅读状态", "完成度", "最后更新", "备注 / 证据"]
    headers = base + [d.get("name", "") for d in dimensions] + manage
    ws.append([])
    ws.append(headers)
    header_row = ws.max_row
    style_header(ws, header_row, len(headers))

    # 维度提问行
    q = [""] * len(base) + [d.get("question", "") for d in dimensions] + [""] * len(manage)
    ws.append(q)
    q_row = ws.max_row
    for c in range(1, len(headers) + 1):
        cell = ws.cell(row=q_row, column=c)
        cell.fill = Q_FILL
        cell.font = Font(size=9, italic=True, color="555555")
        cell.alignment = WRAP
        cell.border = BORDER

    for i, p in enumerate(tier.get("papers", []), start=1):
        ws.append([i, p.get("title", ""), p.get("ref", ""), p.get("authors_year", ""), p.get("focus", "")] + [""] * (len(headers) - len(base)))
    style_body(ws, q_row + 1, ws.max_row, len(headers))
    for r in range(q_row + 1, ws.max_row + 1):
        ws.row_dimensions[r].height = 90

    widths = [4, 34, 7, 16, 24] + [26] * len(dimensions) + [8, 9, 8, 11, 22]
    for i, w in enumerate(widths, start=1):
        ws.column_dimensions[get_column_letter(i)].width = w
    ws.freeze_panes = ws.cell(row=q_row + 1, column=5)
    ws.auto_filter.ref = f"A{header_row}:{get_column_letter(len(headers))}{ws.max_row}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec", required=True)
    ap.add_argument("--out", required=True)
    args = ap.parse_args()

    with open(args.spec, "r", encoding="utf-8") as f:
        spec = json.load(f)
    if not spec.get("dimensions"):
        raise SystemExit("规格里没有 dimensions")
    if not spec.get("tiers"):
        raise SystemExit("规格里没有 tiers")

    wb = Workbook()
    make_cover(wb, spec)
    make_guide(wb, spec)
    make_framework(wb, spec)
    make_progress(wb, spec)
    make_overview(wb, spec)
    for tier in spec["tiers"]:
        make_tier(wb, tier, spec["dimensions"])

    os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
    wb.save(args.out)
    n = sum(len(t.get("papers", [])) for t in spec["tiers"])
    print(f"已生成 {args.out}：{n} 篇 / {len(spec['tiers'])} 梯队 / {len(spec['dimensions'])} 维度")


if __name__ == "__main__":
    main()
