#!/usr/bin/env node
/**
 * 引用与事实审计（V2.1：以候选表 paper_id 为主键，不靠前缀猜）。
 *
 *   node audit-refs.mjs \
 *     --manuscript 05_成稿/终稿.md \
 *     --candidates 01_检索/候选表.csv \
 *     --claims 03_精读/论断证据.csv \
 *     --mapping 03_精读/段落证据映射.csv \
 *     --out 05_成稿/引用审计.md
 *
 * 检查：
 *   1. 正文显式引用（P0001 / 遗留 AM-0001 等）是否存在、是否 included=1
 *   2. 正文 claim 引用（C001）是否存在、核验等级是否够
 *   3. 作者-年份引用是否能在候选表找到；候选表缺 authors 时明确报“无法核验”
 *   4. 段落映射：claim / paper 是否存在、claim.paper_id 与映射是否一致、核验等级是否一致
 *   5. 论断类型与证据匹配：Empirical/Comparative 带数字必须全文核验；Causal 必须全文核验
 *   6. 数据质量：重复 DOI、非法 DOI、纳入文献缺作者
 *
 * 退出码：0 通过（可有警告）；1 有错误。
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

const normDoi = (v) => (v || '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim().toLowerCase();
const VERIFY = new Set(['全文核验', '摘要核验', '元数据核验', '未核验', '用户提供']);

const args = parseArgs(process.argv);
if (!args.manuscript || !args.candidates) {
  console.error('用法: node audit-refs.mjs --manuscript <md> --candidates <csv> [--claims <csv>] [--mapping <csv>] [--out <md>] [--strict]');
  process.exit(2);
}

const manuscriptPath = path.resolve(args.manuscript);
const candidates = parseCsv(fs.readFileSync(path.resolve(args.candidates), 'utf8'));
const claims = args.claims && fs.existsSync(args.claims) ? parseCsv(fs.readFileSync(path.resolve(args.claims), 'utf8')) : [];
const mapping = args.mapping && fs.existsSync(args.mapping) ? parseCsv(fs.readFileSync(path.resolve(args.mapping), 'utf8')) : [];
const raw = fs.readFileSync(manuscriptPath, 'utf8');
const text = stripCode(raw);

const errors = [];
const warnings = [];
const citedPapers = new Set();
const citedClaims = new Set();

const paperKey = (c) => (c.paper_id || c.id || '').trim();
const paperById = new Map();
const paperBySource = new Map();
for (const c of candidates) {
  const id = paperKey(c);
  if (!id) continue;
  paperById.set(id, c);
  if (c.source_id) paperBySource.set(c.source_id, c);
}
const included = candidates.filter((c) => c.included === '1');
const noAuthors = included.filter((c) => !(c.authors || '').trim()).length;

function loc(index) {
  if (index == null || index < 0) return '未知位置';
  return `第 ${text.slice(0, index).split(/\r?\n/).length} 行`;
}

function citePaper(token, index) {
  if (paperById.has(token)) {
    citedPapers.add(token);
    if (paperById.get(token).included !== '1') {
      errors.push({ type: '引用未纳入文献', where: loc(index), text: token, note: '候选表 included != 1' });
    }
    return true;
  }
  if (paperBySource.has(token)) {
    citedPapers.add(paperKey(paperBySource.get(token)));
    return true;
  }
  return false;
}

// 1. 显式 paper ID
for (const m of text.matchAll(/\bP\d{3,5}\b/g)) {
  if (!citePaper(m[0], m.index)) {
    errors.push({ type: '未知文献 ID', where: loc(m.index), text: m[0], note: '候选表没有这个 paper_id' });
  }
}
for (const m of text.matchAll(/\b(?:AM|WOS|CNKI|GS|PS|R)-\d{3,4}\b/g)) {
  if (!citePaper(m[0], m.index)) {
    errors.push({ type: '未知文献 ID', where: loc(m.index), text: m[0], note: '候选表没有这个 source_id / 遗留 ID' });
  }
}
// 任意格式的候选表主键（含历史 C-0134 这类）也认
for (const id of paperById.keys()) {
  if (!/[A-Za-z]/.test(id) || citedPapers.has(id)) continue;
  const re = new RegExp(`(^|[^A-Za-z0-9_-])${id.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^A-Za-z0-9_-]|$)`);
  if (re.test(text)) citePaper(id, 0);
}

// 2. claim 引用
const claimById = new Map(claims.map((c) => [c.claim_id, c]));
for (const s of sentences(text)) {
  const refs = [...s.matchAll(/\bC\d{3,5}\b/g)].map((m) => m[0]);
  if (!refs.length) continue;
  const hasNumber = /\d+(?:\.\d+)?\s*(?:%|％|倍|个|篇|项)/.test(s) || /\b\d+(?:\.\d+)?\b/.test(s);
  for (const id of refs) {
    citedClaims.add(id);
    const c = claimById.get(id);
    if (!c) { errors.push({ type: '未知 claim', where: loc(text.indexOf(s)), text: id, note: '台账里没有这条论断' }); continue; }
    if (!VERIFY.has(c.verification)) errors.push({ type: '核验等级非法', where: loc(text.indexOf(s)), text: id, note: c.verification });
    if (c.verification === '未核验') errors.push({ type: '未核验 claim 进正文', where: loc(text.indexOf(s)), text: id, note: '未核验不能形成正式断言' });
    if (hasNumber && c.verification === '摘要核验') errors.push({ type: '摘要核验支撑数字', where: loc(text.indexOf(s)), text: id, note: '摘要核验不能支撑实验数字' });
    if (hasNumber && c.verification === '元数据核验') errors.push({ type: '元数据核验支撑数字', where: loc(text.indexOf(s)), text: id, note: '元数据核验只能确认身份' });
    if (hasNumber && ['Empirical', 'Comparative'].includes(c.claim_type) && c.verification !== '全文核验') {
      errors.push({ type: '实验/比较论断未全文核验', where: loc(text.indexOf(s)), text: id, note: `${c.claim_type} 带数字，需全文核验` });
    }
    if (c.claim_type === 'Causal' && c.verification !== '全文核验') {
      errors.push({ type: '因果论断未全文核验', where: loc(text.indexOf(s)), text: id, note: '因果判断需全文与机制证据' });
    }
  }
}

// 3. 作者-年份（仅在候选表有作者时可信）
const hasAuthors = included.some((c) => (c.authors || '').trim());
const authorMatch = (authors, name) => (authors || '').split(/[;；,，\s]+/).some((t) => t && (name === t || name.endsWith(t) || name.toLowerCase() === t.toLowerCase()));
const cnCite = /([\u4e00-\u9fa5]{2,4})(?:等)?(?:[，,]\s*|[（(]\s*)((?:19|20)\d{2})/g;
const enCite = /\b([A-Z][A-Za-z'’\-]{1,})(?:\s+(?:et al\.?|and\s+[A-Z][A-Za-z'’\-]+))?[,\s]*\(?((?:19|20)\d{2})\)?/g;
for (const re of [cnCite, enCite]) {
  for (const m of text.matchAll(re)) {
    const name = m[1];
    const year = m[2];
    const matches = candidates.filter((c) => c.year === year && authorMatch(c.authors, name));
    if (!matches.length) {
      if (!hasAuthors) warnings.push({ type: '作者-年份无法核验', where: loc(m.index), text: `${name} ${year}`, note: '候选表缺 authors 字段' });
      else errors.push({ type: '找不到引用', where: loc(m.index), text: `${name} ${year}`, note: '候选表里没有该作者+年份' });
    } else {
      for (const c of matches) citedPapers.add(paperKey(c));
    }
  }
}

// 4. 段落映射
for (const [i, row] of mapping.entries()) {
  const where = `映射第 ${i + 2} 行（${row.paragraph_id || '?'}）`;
  const c = claimById.get(row.claim_id);
  if (!c) { errors.push({ type: '映射指向不存在的 claim', where, text: row.claim_id, note: '' }); continue; }
  const p = paperById.get(row.paper_id);
  if (!p) { errors.push({ type: '映射指向不存在的 paper', where, text: row.paper_id, note: '' }); continue; }
  if (c.paper_id && c.paper_id !== row.paper_id) {
    warnings.push({ type: '映射 paper 与 claim 不一致', where, text: `${row.claim_id}: ${c.paper_id} vs ${row.paper_id}`, note: '' });
  }
  if (row.verification && row.verification !== c.verification) {
    warnings.push({ type: '映射核验等级与 claim 不一致', where, text: `${row.claim_id}: ${c.verification} vs ${row.verification}`, note: '' });
  }
}

// 5. 数据质量
const dois = new Map();
for (const c of candidates) {
  const d = normDoi(c.doi);
  if (!d) continue;
  if (!/^10\.\d{4,9}\//.test(d)) warnings.push({ type: '疑似非法 DOI', where: paperKey(c), text: c.doi, note: '' });
  if (dois.has(d)) warnings.push({ type: '重复 DOI', where: paperKey(c), text: `与 ${dois.get(d)} 重复：${c.doi}`, note: '' });
  else dois.set(d, paperKey(c));
}
if (noAuthors) warnings.push({ type: '纳入文献缺作者', where: '候选表', text: `${noAuthors} 条`, note: '作者-年份引用无法核验' });

// 6. 纳入未引用
for (const c of included) {
  const id = paperKey(c);
  if (!citedPapers.has(id)) warnings.push({ type: '纳入未引用', where: '全文', text: id, note: c.title });
}

const summary = {
  errors: errors.length,
  warnings: warnings.length,
  citedPapers: citedPapers.size,
  citedClaims: citedClaims.size,
  included: included.length,
  mappingRows: mapping.length,
};

function table(rows) {
  if (!rows.length) return '_无_';
  return ['| # | 类型 | 位置 | 内容 | 说明 |', '|---|---|---|---|---|',
    ...rows.map((r, i) => `| ${i + 1} | ${r.type} | ${r.where} | ${r.text} | ${r.note} |`)].join('\n');
}

const report = `# 引用与事实审计

- 时间：${new Date().toISOString().slice(0, 10)}
- 稿件：${path.basename(manuscriptPath)}
- 候选表：${args.candidates}（${candidates.length} 条，纳入 ${included.length}）
- 台账：${args.claims || '（未提供）'}
- 段落映射：${args.mapping || '（未提供）'}

## 摘要

| 项 | 数量 |
|---|---|
| 错误 | ${summary.errors} |
| 警告 | ${summary.warnings} |
| 引用 paper | ${summary.citedPapers} |
| 引用 claim | ${summary.citedClaims} |
| 段落映射行 | ${summary.mappingRows} |

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
