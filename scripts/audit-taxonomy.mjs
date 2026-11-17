#!/usr/bin/env node
/**
 * 分类体系结构检查（taxonomy audit）。
 *
 *   node scripts/audit-taxonomy.mjs \
 *     --taxonomy 04_综合/taxonomy.csv \
 *     --candidates 01_检索/候选表.csv \
 *     [--out 04_综合/分类检查.md]
 *
 * 检查：
 *   1. 每个 paper_id 是否在候选表、是否 included=1
 *   2. 每篇纳入文献是否恰好一个分类
 *   3. 单篇类别、类别失衡、"其他"占比过高
 *   4. 类别成员是否集中在单一 venue/year（结构脆弱代理指标）
 *
 * 这是结构检查，不是“分类是否合理”的学术判断。
 */
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = {};
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[++i];
  }
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

const args = parseArgs(process.argv);
if (!args.taxonomy || !args.candidates) {
  console.error('用法: node audit-taxonomy.mjs --taxonomy <csv> --candidates <csv> [--out <md>]');
  process.exit(2);
}

const tax = parseCsv(fs.readFileSync(path.resolve(args.taxonomy), 'utf8'));
const candidates = parseCsv(fs.readFileSync(path.resolve(args.candidates), 'utf8'));
const byId = new Map(candidates.map((c) => [c.paper_id || c.id, c]));
const included = candidates.filter((c) => c.included === '1');
const includedIds = new Set(included.map((c) => c.paper_id || c.id));

const errors = [];
const warnings = [];
const byCat = new Map();
const seen = new Map();

for (const [i, row] of tax.entries()) {
  const pid = row.paper_id;
  const cat = (row.category || '').trim();
  const where = `第 ${i + 2} 行`;
  if (!pid) { errors.push({ type: '缺 paper_id', where, text: '', note: '' }); continue; }
  const c = byId.get(pid);
  if (!c) { errors.push({ type: '未知 paper_id', where, text: pid, note: '候选表没有' }); continue; }
  if (c.included !== '1') warnings.push({ type: '未纳入文献被分类', where, text: pid, note: 'included != 1' });
  if (!cat) { errors.push({ type: '缺分类', where, text: pid, note: '' }); continue; }
  if (seen.has(pid)) {
    errors.push({ type: '重复分类', where, text: `${pid}: ${seen.get(pid)} / ${cat}`, note: '一篇只能一个主类' });
    continue;
  }
  seen.set(pid, cat);
  if (!byCat.has(cat)) byCat.set(cat, []);
  byCat.get(cat).push(c);
}

for (const id of includedIds) {
  if (!seen.has(id)) warnings.push({ type: '纳入未分类', where: 'taxonomy', text: id, note: '' });
}

const total = seen.size || 1;
const otherCats = [...byCat.keys()].filter((k) => /其他|other|uncategor|未分类/i.test(k));
const otherCount = otherCats.reduce((n, k) => n + byCat.get(k).length, 0);
if (otherCount / total > 0.1) warnings.push({ type: '"其他"占比过高', where: 'taxonomy', text: `${otherCount}/${total}`, note: '>10%，分类可能不穷尽' });

for (const [cat, rows] of byCat) {
  if (rows.length === 1) warnings.push({ type: '单篇类别', where: cat, text: rows[0].paper_id, note: '稳定性差，考虑合并' });
  if (rows.length / total > 0.6) warnings.push({ type: '类别失衡', where: cat, text: `${rows.length}/${total}`, note: '>60%，可能过粗' });
  const venues = new Set(rows.map((r) => r.venue).filter(Boolean));
  const years = new Set(rows.map((r) => r.year).filter(Boolean));
  if (rows.length >= 3 && venues.size === 1) warnings.push({ type: '类别来源单一', where: cat, text: [...venues][0], note: '成员全来自同一 venue' });
  if (rows.length >= 3 && years.size === 1) warnings.push({ type: '类别年份单一', where: cat, text: [...years][0], note: '成员全来自同一年' });
}

const summary = {
  categories: byCat.size,
  classified: seen.size,
  included: includedIds.size,
  errors: errors.length,
  warnings: warnings.length,
};

function table(rows) {
  if (!rows.length) return '_无_';
  return ['| # | 类型 | 位置 | 内容 | 说明 |', '|---|---|---|---|---|',
    ...rows.map((r, i) => `| ${i + 1} | ${r.type} | ${r.where} | ${r.text} | ${r.note} |`)].join('\n');
}

const catRows = [...byCat.entries()].sort((a, b) => b[1].length - a[1].length)
  .map(([cat, rows]) => `| ${cat} | ${rows.length} | ${new Set(rows.map((r) => r.venue)).size} | ${new Set(rows.map((r) => r.year)).size} |`)
  .join('\n');

const report = `# 分类体系结构检查

- 分类数：${summary.categories}
- 已分类：${summary.classified}
- 纳入文献：${summary.included}
- 错误：${summary.errors}｜警告：${summary.warnings}

## 类别分布

| 类别 | 篇数 | venue 数 | 年份数 |
|---|---|---|---|
${catRows || '| — | 0 | 0 | 0 |'}

> 结构检查不等于学术合理性判断；分类边界仍需人（或十篇盲测）确认。

## 错误

${table(errors)}

## 警告

${table(warnings)}
`;

console.log(`类别 ${summary.categories}｜已分类 ${summary.classified}/${summary.included}｜错误 ${summary.errors}｜警告 ${summary.warnings}`);
for (const e of errors) console.log(`  ERROR [${e.type}] ${e.text}`);
for (const w of warnings) console.log(`  WARN  [${w.type}] ${w.text}`);

if (args.out) {
  fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
  fs.writeFileSync(path.resolve(args.out), report, 'utf8');
  console.log(`报告已写入 ${args.out}`);
}

process.exit(errors.length ? 1 : 0);
