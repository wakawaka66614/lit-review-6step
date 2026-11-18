#!/usr/bin/env node
/**
 * 从项目数据生成“图表候选”，供按主题增删。
 *
 *   node scripts/fig-plan.mjs \
 *     --candidates 01_检索/候选表.csv \
 *     --extraction 03_精读/提取表.csv \
 *     --relations 04_综合/文献关系表.csv \
 *     --coverage 04_综合/覆盖矩阵.csv \
 *     --out-dir 04_综合
 *
 * 输出：
 *   04_综合/图表计划.csv（候选，需人工/模型按主题删改）
 *   04_综合/data/*.csv（聚合数据）
 *   04_综合/图表规划建议.md
 *
 * 它只提供“数据允许画什么”，不判断“这个主题该画什么”。
 */
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[++i];
  return out;
}

function parseCsv(text) {
  const rows = []; let row = []; let f = ''; let q = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (q) {
      if (c === '"' && text[i + 1] === '"') { f += '"'; i += 1; }
      else if (c === '"') q = false;
      else f += c;
    } else if (c === '"') q = true;
    else if (c === ',') { row.push(f); f = ''; }
    else if (c === '\n') { row.push(f); rows.push(row); row = []; f = ''; }
    else if (c !== '\r') f += c;
  }
  if (f.length || row.length) { row.push(f); rows.push(row); }
  const [h, ...b] = rows.filter((r) => r.some((v) => v.trim()));
  if (!h) return [];
  return b.map((r) => Object.fromEntries(h.map((x, i) => [x.trim(), (r[i] || '').trim()])));
}

function writeCsv(file, header, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  fs.writeFileSync(file, [header.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\r\n'), 'utf8');
}

function countBy(rows, keyFn) {
  const m = new Map();
  for (const r of rows) {
    const k = keyFn(r);
    if (!k) continue;
    m.set(k, (m.get(k) || 0) + 1);
  }
  return [...m.entries()].sort((a, b) => b[1] - a[1]);
}

const args = parseArgs(process.argv);
const outDir = path.resolve(args['out-dir'] || '04_综合');
const dataDir = path.join(outDir, 'data');
const read = (p) => (p && fs.existsSync(p) ? parseCsv(fs.readFileSync(p, 'utf8')) : []);

const candidates = read(args.candidates).filter((c) => c.included === '1');
const extraction = read(args.extraction);
const relations = read(args.relations);
const coverage = read(args.coverage);
const extractionCols = extraction.length ? Object.keys(extraction[0]) : [];

const spec = [];
const notes = [];
let n = 0;
const add = (question, chart, file, x, y, group, title, note) => {
  n += 1;
  spec.push({ figure_id: `F${String(n).padStart(2, '0')}`, question, claim_id: '', chart_type: chart, data_file: `data/${path.basename(file)}`, x, y, group, title, note });
};

if (candidates.length) {
  const years = countBy(candidates, (c) => c.year).sort((a, b) => a[0] - b[0]);
  writeCsv(path.join(dataDir, 'year_counts.csv'), ['year', 'count'], years);
  const chart = years.length >= 5 ? 'line' : 'bar';
  add('文献数量随年份怎么变', chart, 'year_counts.csv', 'year', 'count', '', '文献数量随年份的变化', '时间覆盖；年份少于 5 个点时用条形');
  notes.push('年份分布：数据允许画趋势，但标题要写成结论，不要写“年份分布图”。');

  const venues = countBy(candidates, (c) => c.venue).slice(0, 10);
  if (venues.length) {
    writeCsv(path.join(dataDir, 'venue_counts.csv'), ['venue', 'count'], venues);
    add('主要发表在哪些 venue', 'hbar', 'venue_counts.csv', 'count', 'venue', '', '主要 venue 分布', '类别多时用横向条形；不要用饼图');
    notes.push('venue 分布：类别 >7 时只取前 10，并在正文说明截断。');
  }
}

if (extraction.length) {
  const designs = countBy(extraction, (e) => e.design);
  if (designs.length) {
    writeCsv(path.join(dataDir, 'design_counts.csv'), ['design', 'count'], designs);
    add('研究设计怎么构成', 'bar', 'design_counts.csv', 'design', 'count', '', '研究设计构成', '方法学构成；没有 design 字段就跳过');
  }
  const qy = new Map();
  for (const e of extraction) {
    if (!e.year || !e.quality || e.quality === '未评价') continue;
    const k = `${e.year}|${e.quality}`;
    qy.set(k, (qy.get(k) || 0) + 1);
  }
  if (qy.size) {
    const rows = [...qy.entries()].map(([k, v]) => { const [year, quality] = k.split('|'); return [year, quality, v]; });
    writeCsv(path.join(dataDir, 'quality_by_year.csv'), ['year', 'quality', 'count'], rows);
    add('证据强度随年份怎么变', 'stacked_bar', 'quality_by_year.csv', 'year', 'count', 'quality', '证据强度的年份构成', '只在质量评级不是“未评价”时使用');
  }
}

const dimCols = ['memory_object', 'addressing', 'retrieval_fault', 'migration', 'replacement', 'persistence', 'consistency', 'evaluation', 'limitation']
  .filter((c) => extractionCols.includes(c));
if (extractionCols.includes('tier') && extraction.length) {
  const tierRows = countBy(extraction, (e) => e.tier);
  writeCsv(path.join(dataDir, 'tier_counts.csv'), ['tier', 'count'], tierRows);
  add('各梯队各有多少篇文献', 'bar', 'tier_counts.csv', 'tier', 'count', '', '各梯队文献数量', '梯队分布，说明证据分层的规模');
}
if (dimCols.length >= 3 && extractionCols.includes('tier')) {
  const tiers = [...new Set(extraction.map((e) => e.tier))];
  const LABELS = {
    memory_object: '记忆对象', addressing: '寻址', retrieval_fault: '取回/缺页',
    migration: '迁移', replacement: '淘汰', persistence: '持久性',
    consistency: '一致性', evaluation: '评测', limitation: '局限',
  };
  const dimRows = [];
  for (const t of tiers) {
    const rs = extraction.filter((e) => e.tier === t);
    for (const c of dimCols) {
      const vals = rs.map((e) => (e[c] || '').trim()).filter(Boolean);
      const avg = vals.length ? vals.reduce((n, v) => n + v.length, 0) / vals.length : 0;
      dimRows.push([t, LABELS[c] || c, Math.round(avg)]);
    }
  }
  writeCsv(path.join(dataDir, 'dimension_depth.csv'), ['tier', 'dimension', 'avg_chars'], dimRows);
  add('各梯队各维度记录得有多厚', 'heatmap', 'dimension_depth.csv', 'tier', 'dimension', 'avg_chars', '证据厚度：平均字数，越薄越可能缺证据', '全填满时看记录长度，不看看空率');
}

if (relations.length) {
  const rel = countBy(relations, (r) => r.relation_type);
  if (rel.length) {
    writeCsv(path.join(dataDir, 'relation_counts.csv'), ['relation_type', 'count'], rel);
    add('文献之间的关系怎么分布', 'bar', 'relation_counts.csv', 'relation_type', 'count', '', '文献关系类型分布', '关系表存在时才画；可换成关系网络图');
  }
}

if (coverage.length) {
  const rows = [];
  for (const c of coverage) {
    rows.push([c.direction, '经典', Number(c.classic_count) || 0]);
    rows.push([c.direction, '近期', Number(c.recent_count) || 0]);
    rows.push([c.direction, '全文', Number(c.fulltext_count) || 0]);
  }
  writeCsv(path.join(dataDir, 'coverage_counts.csv'), ['direction', 'metric', 'count'], rows);
  add('哪些方向覆盖不足', 'grouped_bar', 'coverage_counts.csv', 'direction', 'count', 'metric', '各方向经典/近期/全文覆盖', '分组长条直接看缺口；状态文字另写进正文');
}

if (!spec.length) {
  console.error('没有可用的输入数据，无法生成图表候选');
  process.exit(1);
}

const header = ['figure_id', 'question', 'claim_id', 'chart_type', 'data_file', 'x', 'y', 'group', 'title', 'note'];
writeCsv(path.join(outDir, '图表计划.csv'), header, spec.map((s) => header.map((h) => s[h])));

const md = [
  '# 图表规划建议（数据驱动候选）',
  '',
  `共 ${spec.length} 条候选。**按主题增删**：保留能支撑论点的，删掉为了凑数的。`,
  '',
  '| ID | 问题 | 图型 | 数据 |',
  '|---|---|---|---|',
  ...spec.map((s) => `| ${s.figure_id} | ${s.question} | ${s.chart_type} | ${s.data_file} |`),
  '',
  '## 注意',
  '',
  ...notes.map((x) => `- ${x}`),
  '- 每条都要补 `claim_id` 与结论式 `title`；没有论点的图删掉。',
  '- 示意图（结构图、框架图）不要用这些数据图冒充。',
].join('\n');
fs.writeFileSync(path.join(outDir, '图表规划建议.md'), md, 'utf8');

console.log(`生成 ${spec.length} 条图表候选，数据在 ${path.relative(process.cwd(), dataDir)}`);
for (const s of spec) console.log(`  ${s.figure_id} ${s.chart_type} ${s.question}`);
