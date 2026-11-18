#!/usr/bin/env python3
"""按图表计划渲染统计图（主题驱动，不用固定模板）。

用法：
    python scripts/fig-render.py --spec 04_综合/图表计划.csv \
        --out-dir 04_综合/figures --formats pdf,svg,png

支持 chart_type: bar / hbar / line / stacked_bar / scatter / heatmap
数据文件路径相对于 spec 所在目录。
"""
import argparse
import csv
import os
import sys

import matplotlib
matplotlib.use("Agg")
import matplotlib.pyplot as plt
import numpy as np

# 学术风格：不刺眼、无多余边框、中文可用
plt.rcParams.update({
    "font.sans-serif": ["Microsoft YaHei", "SimHei", "Noto Sans CJK SC", "DejaVu Sans"],
    "axes.unicode_minus": False,
    "figure.dpi": 150,
    "savefig.dpi": 300,
    "axes.spines.top": False,
    "axes.spines.right": False,
    "font.size": 9,
})

# Okabe-Ito 色盲友好配色
COLORS = ["#0072B2", "#E69F00", "#009E73", "#CC79A7", "#56B4E9", "#D55E00", "#F0E442", "#999999"]


def read_csv(path):
    with open(path, "r", encoding="utf-8-sig", newline="") as f:
        return list(csv.DictReader(f))


def num(v):
    try:
        return float(v)
    except (TypeError, ValueError):
        return 0.0


def save(fig, out_dir, fid, formats):
    os.makedirs(out_dir, exist_ok=True)
    paths = []
    for ext in formats:
        p = os.path.join(out_dir, f"{fid}.{ext}")
        fig.savefig(p, bbox_inches="tight", facecolor="white")
        paths.append(p)
    plt.close(fig)
    return paths


def render_bar(rows, x, y, title, horizontal=False):
    rows = sorted(rows, key=lambda r: num(r[y]))
    labels = [r[x] for r in rows]
    vals = [num(r[y]) for r in rows]
    fig, ax = plt.subplots(figsize=(6.4, max(3.0, 0.32 * len(rows) + 1.2)))
    if horizontal:
        ax.barh(labels, vals, color=COLORS[0], height=0.65)
        ax.set_xlabel(title)
        ax.grid(axis="x", alpha=0.25)
        ax.grid(axis="y", visible=False)
    else:
        ax.bar(labels, vals, color=COLORS[0], width=0.65)
        ax.set_ylabel(title)
        plt.setp(ax.get_xticklabels(), rotation=30, ha="right")
    ax.set_title(title, loc="left", fontsize=10)
    return fig


def render_line(rows, x, y, title):
    rows = sorted(rows, key=lambda r: num(r[x]) if num(r[x]) else r[x])
    fig, ax = plt.subplots(figsize=(6.4, 3.6))
    xs = [r[x] for r in rows]
    ax.plot(xs, [num(r[y]) for r in rows], marker="o", color=COLORS[0], linewidth=1.8)
    if xs and all(str(v).isdigit() for v in xs):
        step = max(1, len(xs) // 8)
        ax.set_xticks(xs[::step])
        plt.setp(ax.get_xticklabels(), rotation=45, ha="right")
    ax.set_title(title, loc="left", fontsize=10)
    ax.set_ylabel("数量")
    ax.grid(axis="y", alpha=0.25)
    return fig


def render_stacked(rows, x, y, group, title):
    xs = sorted({r[x] for r in rows})
    groups = sorted({r[group] for r in rows})
    fig, ax = plt.subplots(figsize=(6.4, 3.8))
    bottom = np.zeros(len(xs))
    for i, g in enumerate(groups):
        vals = np.array([sum(num(r[y]) for r in rows if r[x] == xv and r[group] == g) for xv in xs])
        ax.bar(xs, vals, bottom=bottom, label=g, color=COLORS[i % len(COLORS)], width=0.65)
        bottom += vals
    ax.set_title(title, loc="left", fontsize=10)
    ax.legend(frameon=False, fontsize=8, ncol=min(3, len(groups)))
    ax.grid(axis="y", alpha=0.25)
    plt.setp(ax.get_xticklabels(), rotation=30, ha="right")
    return fig


def render_scatter(rows, x, y, group, title):
    fig, ax = plt.subplots(figsize=(5.6, 4.0))
    groups = sorted({r[group] for r in rows}) if group else [None]
    for i, g in enumerate(groups):
        sub = [r for r in rows if (not group or r[group] == g)]
        ax.scatter([num(r[x]) for r in sub], [num(r[y]) for r in sub], s=28,
                   color=COLORS[i % len(COLORS)], label=g if g else None, alpha=0.85)
    ax.set_xlabel(x)
    ax.set_ylabel(y)
    if group:
        ax.legend(frameon=False, fontsize=8)
    ax.set_title(title, loc="left", fontsize=10)
    return fig


def render_grouped(rows, x, y, group, title):
    xs = sorted({r[x] for r in rows})
    groups = sorted({r[group] for r in rows})
    fig, ax = plt.subplots(figsize=(6.8, 3.8))
    width = 0.8 / max(1, len(groups))
    for i, g in enumerate(groups):
        vals = [sum(num(r[y]) for r in rows if r[x] == xv and r[group] == g) for xv in xs]
        ax.bar([j + i * width for j in range(len(xs))], vals, width=width, label=g, color=COLORS[i % len(COLORS)])
    ax.set_xticks([j + width * (len(groups) - 1) / 2 for j in range(len(xs))])
    ax.set_xticklabels(xs, rotation=30, ha="right")
    ax.set_ylabel("数量")
    ax.legend(frameon=False, fontsize=8)
    ax.grid(axis="y", alpha=0.25)
    ax.grid(axis="x", visible=False)
    ax.set_title(title, loc="left", fontsize=10)
    return fig


def render_heatmap(rows, x, y, value, title):
    xs = sorted({r[x] for r in rows})
    ys = sorted({r[y] for r in rows})
    mat = np.zeros((len(ys), len(xs)))
    for r in rows:
        mat[ys.index(r[y]), xs.index(r[x])] = num(r[value])
    fig, ax = plt.subplots(figsize=(max(5.0, 0.9 * len(xs) + 2), max(3.0, 0.6 * len(ys) + 1)))
    im = ax.imshow(mat, cmap="Blues", aspect="auto")
    ax.set_xticks(range(len(xs)), xs, rotation=30, ha="right")
    ax.set_yticks(range(len(ys)), ys)
    for i in range(len(ys)):
        for j in range(len(xs)):
            ax.text(j, i, int(mat[i, j]) if mat[i, j] else "", ha="center", va="center", fontsize=8,
                    color="white" if mat[i, j] > mat.max() * 0.6 else "#333333")
    ax.grid(False)
    ax.set_title(title, loc="left", fontsize=10)
    fig.colorbar(im, ax=ax, shrink=0.8)
    return fig


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--spec", required=True)
    ap.add_argument("--out-dir", default="04_综合/figures")
    ap.add_argument("--formats", default="pdf,svg,png")
    ap.add_argument("--only", default="")
    args = ap.parse_args()

    spec_path = os.path.abspath(args.spec)
    spec_dir = os.path.dirname(spec_path)
    formats = [f.strip() for f in args.formats.split(",") if f.strip()]
    rows = read_csv(spec_path)
    if args.only:
        keep = {s.strip() for s in args.only.split(",")}
        rows = [r for r in rows if r["figure_id"] in keep]

    made = 0
    for r in rows:
        fid = r["figure_id"]
        data_path = os.path.join(spec_dir, r["data_file"])
        if not os.path.exists(data_path):
            print(f"[skip] {fid}: 数据文件不存在 {data_path}", file=sys.stderr)
            continue
        data = read_csv(data_path)
        if not data:
            print(f"[skip] {fid}: 数据为空", file=sys.stderr)
            continue
        ctype = r["chart_type"].strip()
        title = r.get("title") or r.get("question") or fid
        try:
            if ctype == "bar":
                fig = render_bar(data, r["x"], r["y"], title, horizontal=False)
            elif ctype == "hbar":
                fig = render_bar(data, r["x"], r["y"], title, horizontal=True)
            elif ctype == "line":
                fig = render_line(data, r["x"], r["y"], title)
            elif ctype == "stacked_bar":
                fig = render_stacked(data, r["x"], r["y"], r["group"], title)
            elif ctype == "scatter":
                fig = render_scatter(data, r["x"], r["y"], r.get("group", ""), title)
            elif ctype == "grouped_bar":
                fig = render_grouped(data, r["x"], r["y"], r["group"], title)
            elif ctype == "heatmap":
                fig = render_heatmap(data, r["x"], r["y"], r.get("group") or "value", title)
            else:
                print(f"[skip] {fid}: 未知图型 {ctype}", file=sys.stderr)
                continue
            paths = save(fig, os.path.join(spec_dir, args.out_dir) if not os.path.isabs(args.out_dir) else args.out_dir, fid, formats)
            made += 1
            print(f"[ok] {fid} {ctype} -> {', '.join(os.path.basename(p) for p in paths)}")
        except Exception as e:  # noqa: BLE001
            print(f"[fail] {fid}: {e}", file=sys.stderr)

    print(f"完成 {made} 张")


if __name__ == "__main__":
    main()
