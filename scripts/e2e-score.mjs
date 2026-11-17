#!/usr/bin/env node
/**
 * 端到端对照的机械评分：覆盖率、引用可核验性、claim 使用。
 *
 *   node scripts/e2e-score.mjs \
 *     --run e2e/<topic>-<date>/runs/C \
 *     --gold e2e/<topic>-<date>/gold-set.csv \
 *     --out e2e/<topic>-<date>/scores-C.md
 *
 * 只算能自动算的指标；证据准确率、分类合理性等必须人工评。
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

function normDoi(v) {
  return (v || '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim().toLowerCase();
}

function readFirst(dir, names) {
  for (const n of names) {
    const p = path.join(dir, n);
    if (fs.existsSync(p)) return { path: p, text: fs.readFileSync(p, 'utf8') };
  }
  return null;
}

const args = parseArgs(process.argv);
if (!args.run) {
  console.error('用法: node scripts/e2e-score.mjs --run <runDir> [--gold gold.csv] [--out report.md]');
  process.exit(2);
}

const runDir = path.resolve(args.run);
const candidatesFile = readFirst(runDir, ['01_检索/候选表.csv', 'candidates.csv']);
const candidates = candidatesFile ? parseCsv(candidatesFile.text) : [];
const candDois = new Set(candidates.map((c) => normDoi(c.doi)).filter(Boolean));
const candIds = new Set(candidates.map((c) => c.id).filter(Boolean));

// 覆盖率
let coverage = null;
let goldTotal = 0;
let goldMatched = 0;
if (args.gold && fs.existsSync(args.gold)) {
  const gold = parseCsv(fs.readFileSync(args.gold, 'utf8')).filter((g) => normDoi(g.doi));
  goldTotal = gold.length;
  goldMatched = gold.filter((g) => candDois.has(normDoi(g.doi))).length;
  if (goldTotal) coverage = (goldMatched / goldTotal) * 100;
}

// 稿件引用
const manuscript = readFirst(runDir, ['05_成稿/终稿.md', '05_成稿/初稿.md', 'manuscript.md']);
let citedIds = [];
let unknownIds = [];
let citedClaims = [];
if (manuscript) {
  citedIds = [...new Set([...manuscript.text.matchAll(/\b(?:AM|WOS|CNKI|GS|PS|R)-\d{3,4}\b/g)].map((m) => m[0]))];
  unknownIds = citedIds.filter((id) => !candIds.has(id));
  citedClaims = [...new Set([...manuscript.text.matchAll(/\bC\d{3,4}\b/g)].map((m) => m[0]))];
}

const claimsFile = readFirst(runDir, ['03_精读/论断证据.csv']);
const claims = claimsFile ? parseCsv(claimsFile.text) : [];
const claimById = new Map(claims.map((c) => [c.claim_id, c]));
const weakClaims = citedClaims.filter((id) => {
  const c = claimById.get(id);
  return c && ['摘要核验', '元数据核验', '未核验'].includes(c.verification);
});

const lines = [
  '# 机械评分',
  '',
  `- 运行目录：${path.relative(process.cwd(), runDir) || '.'}`,
  `- 候选表：${candidatesFile ? path.basename(candidatesFile.path) : '缺失'}`,
  `- 稿件：${manuscript ? path.basename(manuscript.path) : '缺失'}`,
  '',
  '| 指标 | 值 |',
  '|---|---|',
  `| 金标准文献数 | ${goldTotal || '未提供'} |`,
  `| 金标准被候选表覆盖 | ${goldTotal ? `${goldMatched} / ${goldTotal}` : '未提供'} |`,
  `| 覆盖率 | ${coverage === null ? 'N/A' : coverage.toFixed(1) + '%'} |`,
  `| 候选表条数 | ${candidates.length} |`,
  `| 稿件引用 ID 数 | ${citedIds.length} |`,
  `| 未知引用 ID | ${unknownIds.length}${unknownIds.length ? '（' + unknownIds.join(', ') + '）' : ''} |`,
  `| 引用 claim 数 | ${citedClaims.length} |`,
  `| 弱证据 claim 被引用 | ${weakClaims.length}${weakClaims.length ? '（' + weakClaims.join(', ') + '）' : ''} |`,
  '',
  '> 只含可自动计算的指标；证据准确率、分类合理性、综合深度需人工评。',
];

const report = lines.join('\n');
console.log(report);
if (args.out) {
  const outPath = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, report, 'utf8');
  console.log(`\n已写入 ${args.out}`);
}
