#!/usr/bin/env node
/**
 * 从提取表生成“主题相关的统计问题”候选。
 *
 *   node scripts/stat-questions.mjs \
 *     --extraction 03_精读/提取表.csv \
 *     --candidates 01_检索/候选表.csv \
 *     --relations 04_综合/文献关系表.csv \
 *     --coverage 04_综合/覆盖矩阵.csv \
 *     --topic "graph neural network recommendation" \
 *     --out-dir 04_综合
 *
 * 输出：
 *   04_综合/统计问题清单.csv
 *   04_综合/统计问题建议.md（含数据画像）
 *
 * 它只生成“数据允许回答、且与主题相关”的问题；选哪些、怎么解读仍要人/模型判断。
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
  if (!h) return { header: [], rows: [] };
  return { header: h.map((x) => x.trim()), rows: b.map((r) => Object.fromEntries(h.map((x, i) => [x.trim(), (r[i] || '').trim()]))) };
}

function writeCsv(file, header, rows) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  fs.writeFileSync(file, [header.join(','), ...rows.map((r) => r.map(esc).join(','))].join('\r\n'), 'utf8');
}

const read = (p) => (p && fs.existsSync(p) ? parseCsv(fs.readFileSync(p, 'utf8')) : { header: [], rows: [] });
const nonEmpty = (rows, col) => rows.map((r) => r[col]).filter((v) => v && v.trim());
const uniq = (arr) => [...new Set(arr)];
const top = (arr, n = 8) => {
  const m = new Map();
  for (const v of arr) m.set(v, (m.get(v) || 0) + 1);
  return [...m.entries()].sort((a, b) => b[1] - a[1]).slice(0, n);
};

const ROLE_PATTERNS = [
  ['id', /^(paper_id|id)$/i],
  ['year', /^(year|年份)$/i],
  ['venue', /venue|期刊|会议/i],
  ['design', /design|设计/i],
  ['quality', /quality|质量/i],
  ['method', /method|approach|technique|方法|模型/i],
  ['dataset', /sample|dataset|data|benchmark|数据|样本|数据集/i],
  ['task', /task|application|任务|应用/i],
  ['metric', /metric|指标/i],
  ['code', /code|repo|代码/i],
  ['citations', /citation|被引/i],
  ['limitations', /limitation|局限/i],
  ['findings', /finding|结论|发现/i],
];

function detectRoles(header) {
  const roles = {};
  for (const col of header) {
    for (const [role, re] of ROLE_PATTERNS) {
      if (re.test(col) && !roles[role]) { roles[role] = col; break; }
    }
  }
  return roles;
}

function topicTokens(topic) {
  const tokens = new Set();
  for (const w of (topic || '').toLowerCase().split(/[^a-z0-9\u4e00-\u9fa5]+/)) {
    if (w.length >= 2) tokens.add(w);
  }
  const cjk = (topic || '').match(/[\u4e00-\u9fa5]{2,}/g) || [];
  for (const seg of cjk) for (let i = 0; i < seg.length - 1; i += 1) tokens.add(seg.slice(i, i + 2));
  return [...tokens];
}

const DOMAIN_BOOST = [
  [/推荐|recommend|recsys|graph|gnn|图神经/i, ['method', 'dataset', 'metric', 'task']],
  [/医学|临床|patient|clinical|治疗|干预/i, ['design', 'dataset', 'quality']],
  [/教育|学生|student|learning|教学/i, ['dataset', 'design', 'task']],
  [/安全|隐私|fair|公平|privacy/i, ['task', 'quality', 'limitations']],
];

const args = parseArgs(process.argv);
if (!args.extraction) {
  console.error('用法: node stat-questions.mjs --extraction <csv> --topic "主题" [--candidates ...] [--relations ...] [--coverage ...] [--out-dir ...]');
  process.exit(2);
}

const extraction = read(args.extraction);
const candidates = read(args.candidates);
const relations = read(args.relations);
const coverage = read(args.coverage);
const outDir = path.resolve(args['out-dir'] || '04_综合');

const rows = extraction.rows.length ? extraction.rows : candidates.rows;
const header = extraction.rows.length ? extraction.header : candidates.header;
const roles = detectRoles([...new Set([...header, ...candidates.header])]);
for (const [role, col] of Object.entries(detectRoles(candidates.header))) {
  if (!roles[role]) roles[role] = col;
}

const tokens = topicTokens(args.topic || '');
const boosts = new Set();
for (const [re, dims] of DOMAIN_BOOST) if (re.test(args.topic || '')) dims.forEach((d) => boosts.add(d));
const focus = new Set((args.focus || '').split(',').map((s) => s.trim()).filter(Boolean));

const profile = [];
const questions = [];
let qn = 0;

function relevance(col, role) {
  const sample = nonEmpty(rows, col).slice(0, 30).join(' ').toLowerCase();
  let score = 0;
  for (const t of tokens) {
    if (col.toLowerCase().includes(t) || sample.includes(t)) score += 1;
  }
  if (focus.has(role)) score += 3;
  if (boosts.has(role)) score += 3;
  return score;
}

function addQuestion(question, dimension, fields, metric, chart, roleHint, reason) {
  qn += 1;
  const score = relevance(fields.split(',')[0].trim(), roleHint);
  questions.push({
    question_id: `Q${String(qn).padStart(2, '0')}`,
    question,
    dimension,
    fields,
    metric,
    chart_type: chart,
    priority: score >= 3 ? '高' : score >= 1 ? '中' : '低',
    reason,
    status: '候选',
  });
}

// 数据画像
for (const [role, col] of Object.entries(roles)) {
  const vals = nonEmpty(rows, col);
  if (!vals.length) continue;
  const cats = uniq(vals);
  profile.push({ role, column: col, filled: vals.length, unique: cats.length, top: top(vals, 4).map(([v, c]) => `${v}(${c})`).join('; ') });
}

// 分类维度：计数 + 与年份交叉
const CAT_ROLES = [['method', '方法'], ['dataset', '数据集/样本'], ['design', '研究设计'], ['venue', '期刊/会议'], ['quality', '质量评级'], ['task', '任务/应用'], ['metric', '评价指标'], ['code', '代码开放']];
for (const [role, label] of CAT_ROLES) {
  const col = roles[role];
  if (!col) continue;
  const vals = nonEmpty(rows, col);
  if (!vals.length) continue;
  const n = uniq(vals).length;
  if (n > 30) continue;
  const chart = n <= 7 ? 'bar' : 'hbar';
  addQuestion(`${label}各有多少篇文献？`, label, col, 'count', chart, role, `数据里有 ${n} 个${label}取值`);
  if (roles.year && roles[role]) addQuestion(`${label}随年份如何变化？`, `${label}×年份`, `${col},${roles.year}`, 'count', 'stacked_bar', role, '同时有年份与分类字段');
}

if (roles.citations && roles.year) {
  addQuestion('被引次数与发表年份是什么关系？', '引用×年份', `${roles.citations},${roles.year}`, 'scatter', 'scatter', 'citations', '有被引与年份两个数值/有序字段');
}

if (roles.limitations) {
  addQuestion('局限性集中在哪几类？', '局限', roles.limitations, 'keyword frequency', 'bar', 'limitations', '需要先人工/规则编码，不能直接分词当结论');
}

if (relations.rows.length) {
  const rcol = relations.header.includes('relation_type') ? 'relation_type' : null;
  if (rcol) addQuestion('文献关系类型如何分布？', '关系类型', rcol, 'count', 'bar', 'relations', '关系表已有类型字段');
  if (relations.header.includes('theme')) addQuestion('哪些主题的冲突最多？', '冲突×主题', 'theme', 'count(where relation_type=结论冲突)', 'bar', 'relations', '关系表含主题与冲突类型');
}

if (coverage.rows.length) {
  addQuestion('哪些研究方向的覆盖不足？', '覆盖', 'direction,status', 'count/status', 'grouped_bar', 'coverage', '覆盖矩阵已有方向与状态');
  addQuestion('经典/近期/全文的覆盖差距在哪？', '覆盖×时间', 'direction,classic_count,recent_count,fulltext_count', 'mean', 'grouped_bar', 'coverage', '覆盖矩阵已有三列计数');
}

// 排序：优先级 高>中>低，再按维度顺序
const order = { '高': 0, '中': 1, '低': 2 };
questions.sort((a, b) => order[a.priority] - order[b.priority]);

const headerOut = ['question_id', 'question', 'dimension', 'fields', 'metric', 'chart_type', 'priority', 'reason', 'status'];
writeCsv(path.join(outDir, '统计问题清单.csv'), headerOut, questions.map((q) => headerOut.map((h) => q[h])));

const md = [
  '# 统计问题建议（主题相关）',
  '',
  `- 主题：${args.topic || '（未提供）'}`,
  `- 数据：${extraction.rows.length} 篇提取 / ${candidates.rows.length} 条候选 / ${relations.rows.length} 条关系`,
  `- 候选问题：${questions.length}`,
  '',
  '## 数据画像',
  '',
  '| 角色 | 列 | 非空 | 取值数 | 高频值 |',
  '|---|---|---|---|---|',
  ...profile.map((p) => `| ${p.role} | ${p.column} | ${p.filled} | ${p.unique} | ${p.top} |`),
  '',
  '## 问题候选',
  '',
  '| ID | 问题 | 维度 | 图型 | 优先级 | 为什么 |',
  '|---|---|---|---|---|---|',
  ...questions.map((q) => `| ${q.question_id} | ${q.question} | ${q.dimension} | ${q.chart_type} | ${q.priority} | ${q.reason} |`),
  '',
  '## 怎么用',
  '',
  '1. 只保留能支撑论点的 3–6 条；删掉“数据里正好有”但与主题无关的。',
  '2. 每条补 `claim_id` 与结论式标题，写进 `图表计划.csv`。',
  '3. 文本类（局限、发现）先编码再统计，禁止把分词结果当结论。',
  '4. 统计结果回答“多少/怎么分布”，不回答“为什么更好”。',
].join('\n');
fs.writeFileSync(path.join(outDir, '统计问题建议.md'), md, 'utf8');

console.log(`生成 ${questions.length} 条统计问题候选（主题：${args.topic || '未提供'}）`);
for (const q of questions.slice(0, 10)) console.log(`  ${q.question_id} [${q.priority}] ${q.question} (${q.chart_type})`);
