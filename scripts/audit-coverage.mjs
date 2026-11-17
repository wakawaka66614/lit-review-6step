#!/usr/bin/env node
/**
 * 覆盖矩阵结构检查。
 *
 *   node scripts/audit-coverage.mjs --matrix 04_综合/覆盖矩阵.csv [--out 04_综合/覆盖审计.md]
 *
 * 检查：字段完整、方向不重复、状态合法、状态与数量不矛盾、核心方向不能“不足/待补充”。
 * 这是结构检查；“方向是否真的重要”仍需人来定。
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

const STATUS = new Set(['充分', '基本充分', '不足', '待补充']);
const args = parseArgs(process.argv);
if (!args.matrix) {
  console.error('用法: node audit-coverage.mjs --matrix <csv> [--out <md>]');
  process.exit(2);
}

const rows = parseCsv(fs.readFileSync(path.resolve(args.matrix), 'utf8'));
const errors = [];
const warnings = [];
const seen = new Set();

for (const [i, r] of rows.entries()) {
  const where = `第 ${i + 2} 行`;
  const dir = (r.direction || '').trim();
  if (!dir) { errors.push({ type: '缺方向', where, text: '', note: '' }); continue; }
  if (seen.has(dir)) errors.push({ type: '重复方向', where, text: dir, note: '' });
  seen.add(dir);
  const c = Number(r.classic_count); const rec = Number(r.recent_count); const full = Number(r.fulltext_count);
  if ([c, rec, full].some((n) => !Number.isFinite(n) || n < 0)) {
    errors.push({ type: '数量字段非法', where, text: dir, note: `${r.classic_count}/${r.recent_count}/${r.fulltext_count}` });
    continue;
  }
  if (!STATUS.has(r.status)) { errors.push({ type: '状态非法', where, text: `${dir}: ${r.status}`, note: '应为 充分/基本充分/不足/待补充' }); continue; }
  if (r.importance !== '核心' && r.importance !== '次要') warnings.push({ type: '重要性未标', where, text: dir, note: r.importance || '空' });

  if (r.status === '充分' && !(c >= 1 && rec >= 2 && full >= 3)) {
    warnings.push({ type: '状态与数量不符', where, text: `${dir}: 充分`, note: `经典 ${c} / 近期 ${rec} / 全文 ${full}` });
  }
  if (r.status === '基本充分' && !(c >= 1 && rec >= 1 && full >= 1)) {
    warnings.push({ type: '状态与数量不符', where, text: `${dir}: 基本充分`, note: `经典 ${c} / 近期 ${rec} / 全文 ${full}` });
  }
  if (r.status === '不足' && !(r.note || '').trim()) {
    warnings.push({ type: '不足未写依据', where, text: dir, note: '' });
  }
  if (r.status === '待补充' && c + rec > 2) {
    warnings.push({ type: '状态与数量不符', where, text: `${dir}: 待补充`, note: `已有 ${c + rec} 篇` });
  }
  if (r.importance === '核心' && ['不足', '待补充'].includes(r.status)) {
    warnings.push({ type: '核心方向覆盖不足', where, text: dir, note: '门禁要求核心方向不能不足/待补充' });
  }
}

const core = rows.filter((r) => r.importance === '核心');
const weak = core.filter((r) => ['不足', '待补充'].includes(r.status));

const report = `# 覆盖审计

- 方向数：${rows.length}（核心 ${core.length}）
- 核心方向不足/待补充：${weak.length}
- 错误：${errors.length}｜警告：${warnings.length}

| # | 类型 | 位置 | 内容 | 说明 |
|---|---|---|---|---|
${errors.concat(warnings).map((r, i) => `| ${i + 1} | ${r.type} | ${r.where} | ${r.text} | ${r.note} |`).join('\n') || '| — | — | — | — | — |'}
`;

console.log(`方向 ${rows.length}｜核心 ${core.length}｜核心不足 ${weak.length}｜错误 ${errors.length}｜警告 ${warnings.length}`);
for (const e of errors) console.log(`  ERROR [${e.type}] ${e.where} ${e.text}`);
for (const w of warnings) console.log(`  WARN  [${w.type}] ${w.text} — ${w.note}`);

if (args.out) {
  fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
  fs.writeFileSync(path.resolve(args.out), report, 'utf8');
  console.log(`报告已写入 ${args.out}`);
}
process.exit(errors.length ? 1 : 0);
