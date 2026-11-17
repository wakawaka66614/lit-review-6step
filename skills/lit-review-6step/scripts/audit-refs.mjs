#!/usr/bin/env node
/**
 * 引用与事实审计（启发式）。
 *
 *   node scripts/audit-refs.mjs \
 *     --manuscript 05_成稿/初稿.md \
 *     --candidates 01_检索/候选表.csv \
 *     --claims 03_精读/论断证据.csv \
 *     [--out 05_成稿/引用审计.md] [--strict]
 *
 * 检查：
 *   1. 文献 ID 引用是否存在、是否 included=1
 *   2. 作者-年份引用能否在候选表找到
 *   3. claim_id 是否存在
 *   4. 摘要核验 / 未核验的 claim 是否被用来支撑数字或强论断
 *   5. 纳入但从未被引用的文献（警告）
 *
 * 退出码：0 通过（可有警告）；1 有错误。
 * 说明：启发式，不替代人工核对；误报请以原文为准。
 */
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = { strict: false };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (a === '--strict') out.strict = true;
    else if (a.startsWith('--')) out[a.slice(2)] = argv[++i];
  }
  return out;
}

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i += 1) {
    const c = text[i];
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') { field += '"'; i += 1; }
      else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') { row.push(field); field = ''; }
    else if (c === '\n') { row.push(field); rows.push(row); row = []; field = ''; }
    else if (c !== '\r') field += c;
  }
  if (field.length || row.length) { row.push(field); rows.push(row); }
  const [header, ...body] = rows.filter((r) => r.some((v) => v.trim() !== ''));
  if (!header) return [];
  return body.map((r) => Object.fromEntries(header.map((h, i) => [h.trim(), (r[i] ?? '').trim()])));
}

function stripCode(text) {
  return text.replace(/```[\s\S]*?```/g, '').replace(/`[^`\n]*`/g, '');
}

function sentences(text) {
  return text.split(/(?<=[。！？!?])\s*|\n+/).map((s) => s.trim()).filter(Boolean);
}

const args = parseArgs(process.argv);
if (!args.manuscript || !args.candidates) {
  console.error('用法: node scripts/audit-refs.mjs --manuscript <md> --candidates <csv> [--claims <csv>] [--out <md>] [--strict]');
  process.exit(2);
}

const manuscriptPath = path.resolve(args.manuscript);
const candidates = parseCsv(fs.readFileSync(path.resolve(args.candidates), 'utf8'));
const claims = args.claims ? parseCsv(fs.readFileSync(path.resolve(args.claims), 'utf8')) : [];
const raw = fs.readFileSync(manuscriptPath, 'utf8');
const text = stripCode(raw);
const lines = text.split(/\r?\n/);

const errors = [];
const warnings = [];
const citedIds = new Set();
const citedClaims = new Set();

const byId = new Map(candidates.map((c) => [c.id, c]));
const included = candidates.filter((c) => c.included === '1');

// 1. 文献 ID
for (const m of text.matchAll(/\b(?:AM|WOS|CNKI|GS|PS|R)-\d{3,4}\b/g)) {
  const id = m[0];
  citedIds.add(id);
  const row = byId.get(id);
  if (!row) errors.push({ type: '未知文献 ID', where: loc(m.index), text: id, note: '候选表里没有这条记录' });
  else if (row.included !== '1') errors.push({ type: '引用未纳入文献', where: loc(m.index), text: id, note: '候选表 included != 1' });
}

// 2. 作者-年份
const cnCite = /([\u4e00-\u9fa5]{2,4})(?:等)?(?:[，,]\s*|[（(]\s*)((?:19|20)\d{2})/g;
const enCite = /\b([A-Z][A-Za-z'’\-]{1,})(?:\s+(?:et al\.?|and\s+[A-Z][A-Za-z'’\-]+))?[,\s]*\(?((?:19|20)\d{2})\)?/g;
function authorMatches(row, name) {
  const tokens = (row.authors || '').split(/[;；,，\s]+/).filter(Boolean);
  return tokens.some((t) => name === t || name.endsWith(t) || name.toLowerCase() === t.toLowerCase());
}

for (const re of [cnCite, enCite]) {
  for (const m of text.matchAll(re)) {
    const name = m[1];
    const year = m[2];
    const matches = candidates.filter((c) => c.year === year && authorMatches(c, name));
    if (!matches.length) errors.push({ type: '找不到引用', where: loc(m.index), text: `${name} ${year}`, note: '候选表里没有该作者+年份' });
    else for (const c of matches) citedIds.add(c.id);
  }
}

// 3/4. claim 引用与等级
const claimById = new Map(claims.map((c) => [c.claim_id, c]));
for (const s of sentences(text)) {
  const refs = [...s.matchAll(/\bC\d{3,4}\b/g)].map((m) => m[0]);
  if (!refs.length) continue;
  const hasNumber = /\d+(?:\.\d+)?\s*(?:%|％|倍|个|篇|项)/.test(s) || /\b\d+(?:\.\d+)?\b/.test(s);
  for (const id of refs) {
    citedClaims.add(id);
    const c = claimById.get(id);
    if (!c) { errors.push({ type: '未知 claim', where: loc(text.indexOf(s)), text: id, note: '台账里没有这条论断' }); continue; }
    if (c.verification === '未核验') errors.push({ type: '未核验 claim 进正文', where: loc(text.indexOf(s)), text: id, note: '未核验不能形成正式断言' });
    if (hasNumber && c.verification === '摘要核验') errors.push({ type: '摘要核验支撑数字', where: loc(text.indexOf(s)), text: id, note: '摘要核验不能支撑实验数字' });
    if (hasNumber && c.verification === '元数据核验') errors.push({ type: '元数据核验支撑数字', where: loc(text.indexOf(s)), text: id, note: '元数据核验只能确认身份' });
  }
}

// 5. 纳入未引用
for (const c of included) if (!citedIds.has(c.id)) warnings.push({ type: '纳入未引用', where: '全文', text: c.id, note: c.title });

function loc(index) {
  if (index == null || index < 0) return '未知位置';
  const before = text.slice(0, index).split(/\r?\n/);
  return `第 ${before.length} 行`;
}

const summary = {
  errors: errors.length,
  warnings: warnings.length,
  citedIds: citedIds.size,
  citedClaims: citedClaims.size,
  included: included.length,
};

function table(rows) {
  if (!rows.length) return '_无_';
  return ['| # | 类型 | 位置 | 内容 | 说明 |', '|---|---|---|---|---|',
    ...rows.map((r, i) => `| ${i + 1} | ${r.type} | ${r.where} | ${r.text} | ${r.note} |`)].join('\n');
}

const report = `# 引用与事实审计

- 时间：${new Date().toISOString().slice(0, 10)}
- 稿件：${path.basename(manuscriptPath)}
- 候选表：${args.candidates}
- 台账：${args.claims || '（未提供）'}

## 摘要

| 项 | 数量 |
|---|---|
| 错误 | ${summary.errors} |
| 警告 | ${summary.warnings} |
| 引用文献 ID | ${summary.citedIds} |
| 引用 claim | ${summary.citedClaims} |
| 纳入文献 | ${summary.included} |

> 启发式检查，不替代人工回原文核对。

## 错误

${table(errors)}

## 警告

${table(warnings)}
`;

console.log(`错误 ${summary.errors}，警告 ${summary.warnings}`);
for (const e of errors) console.log(`  ERROR [${e.type}] ${e.where} ${e.text} — ${e.note}`);
for (const w of warnings) console.log(`  WARN  [${w.type}] ${w.text} — ${w.note}`);

if (args.out) {
  const outPath = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report, 'utf8');
  console.log(`报告已写入 ${args.out}`);
}

process.exit(errors.length ? 1 : 0);
