#!/usr/bin/env node
/**
 * 从顶刊综述构建金标准参考集（survey-derived reference set）。
 *
 *   node scripts/gold-from-surveys.mjs \
 *     --surveys W3097300053,W4315977496,W4402306238 \
 *     --keyword cold --min-shared 2 --max 30 \
 *     --out e2e/gold.csv
 *
 * 做法：
 *   1. 取每篇综述的 referenced_works；
 *   2. 统计被几篇综述共同引用；
 *   3. 取共同引用 >= min-shared 的候选，抓元数据；
 *   4. 标题匹配 keyword 的，按被引数排序，取前 max 条。
 *
 * 注意：这是“综述派生的参考集”，不是人工逐篇核验的金标准；
 * 写进 RESULTS 时要如实标注来源与局限。
 */
import fs from 'node:fs';
import path from 'node:path';

const API = 'https://api.openalex.org';

function parseArgs(argv) {
  const out = { minShared: 2, max: 30, keyword: 'cold' };
  for (let i = 2; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const key = argv[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = argv[++i];
  }
  out.minShared = Number(out.minShared);
  out.max = Number(out.max);
  return out;
}

async function getJson(url) {
  for (let i = 0; i < 4; i += 1) {
    const res = await fetch(url, { headers: { 'user-agent': 'lit-review-6step/2.0' } });
    if (res.ok) return res.json();
    if (res.status === 429) { await sleep(1500 * (i + 1)); continue; }
    const body = await res.text().catch(() => '');
    throw new Error(`HTTP ${res.status} ${url}：${body.slice(0, 160)}`);
  }
  throw new Error('重试失败');
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function normDoi(v) {
  return (v || '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim().toLowerCase();
}

function csvEscape(v) {
  return `"${String(v ?? '').replace(/"/g, '""')}"`;
}

const args = parseArgs(process.argv);
if (!args.surveys) {
  console.error('用法: node scripts/gold-from-surveys.mjs --surveys W1,W2,W3 [--keyword cold] [--min-shared 2] [--max 30] [--out gold.csv]');
  process.exit(2);
}

const ids = args.surveys.split(',').map((s) => s.trim()).filter(Boolean);
const counts = new Map();
const surveyMeta = [];

for (const id of ids) {
  const w = await getJson(`${API}/works/${id}`);
  surveyMeta.push({ id: w.id.split('/').pop(), title: w.title, year: w.publication_year, venue: w.primary_location?.source?.display_name || '' });
  for (const ref of w.referenced_works || []) {
    const rid = ref.split('/').pop();
    counts.set(rid, (counts.get(rid) || 0) + 1);
  }
  await sleep(150);
}

const candidates = [...counts.entries()].filter(([, c]) => c >= args.minShared).map(([id, c]) => ({ id, shared: c }));
console.log(`综述 ${ids.length} 篇｜去重后引用 ${counts.size} 条｜共同引用 >= ${args.minShared} 的 ${candidates.length} 条`);

const works = [];
for (let i = 0; i < candidates.length; i += 50) {
  const chunk = candidates.slice(i, i + 50);
  const filter = `openalex_id:${chunk.map((c) => c.id).join('|')}`;
  const data = await getJson(`${API}/works?filter=${filter}&per-page=50`);
  const sharedById = new Map(chunk.map((c) => [c.id, c.shared]));
  for (const w of data.results || []) {
    const wid = w.id.split('/').pop();
    works.push({ ...w, shared: sharedById.get(wid) || 0 });
  }
  await sleep(200);
}

const kw = args.keyword && args.keyword !== '*' ? new RegExp(args.keyword, 'i') : null;
const picked = works
  .filter((w) => !kw || kw.test(w.title || '') || kw.test(w.abstract_inverted_index ? Object.keys(w.abstract_inverted_index).join(' ') : ''))
  .sort((a, b) => (b.shared - a.shared) || (b.cited_by_count - a.cited_by_count))
  .slice(0, args.max);

const header = 'id,doi,title,year,venue,why_core,verified_by';
const rows = picked.map((w, i) => [
  `SD-${String(i + 1).padStart(3, '0')}`,
  normDoi(w.doi),
  csvEscape(w.title || ''),
  w.publication_year || '',
  csvEscape(w.primary_location?.source?.display_name || ''),
  csvEscape(`被 ${w.shared} 篇顶刊综述引用；被引 ${w.cited_by_count}`),
  'survey-derived',
].join(','));

console.log('\n综述来源：');
for (const s of surveyMeta) console.log(`  ${s.year} ${s.title} — ${s.venue} (${s.id})`);
console.log(`\n金标准候选 ${picked.length} 条：`);
for (const w of picked.slice(0, 10)) console.log(`  ${w.publication_year} ${w.title.slice(0, 80)}`);

if (args.out) {
  const outPath = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, [header, ...rows].join('\r\n'), 'utf8');
  console.log(`\n已写入 ${args.out}`);
}
