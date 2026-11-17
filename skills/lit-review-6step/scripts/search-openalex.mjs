#!/usr/bin/env node
/**
 * OpenAlex 检索通道（无需 API key，支持引文追踪）。
 *
 * 检索：
 *   node search-openalex.mjs --query "retrieval augmented generation" --pages 2 --out 01_检索/oa.csv
 *
 * 前向引文（谁引用了这篇）：
 *   node search-openalex.mjs --mode cited-by --id W2741809807 --pages 2 --out cites.csv
 *
 * 后向引文（这篇引用了谁）：
 *   node search-openalex.mjs --mode references --id W2741809807 --out refs.csv
 *
 * 常用参数：--per-page 25 --from-year 2020 --to-year 2026
 *           --sort cited_by_count|publication_date|relevance_score
 *           --mailto you@example.com（礼貌池，建议填）
 *           --max 200（总条数上限）
 *
 * 输出 CSV 与 `原始检索结果.csv` 同构：
 *   record_id,source,platform,query,search_date,title,authors,year,doi,url,note
 */
import fs from 'node:fs';
import path from 'node:path';

const API = 'https://api.openalex.org';

function parseArgs(argv) {
  const out = { mode: 'search', pages: 1, perPage: 25, max: 200, sort: 'relevance_score' };
  for (let i = 2; i < argv.length; i += 1) {
    const a = argv[i];
    if (!a.startsWith('--')) continue;
    const key = a.slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[key] = argv[++i];
  }
  out.pages = Number(out.pages) || 1;
  out.perPage = Math.min(Number(out.perPage) || 25, 200);
  out.max = Number(out.max) || 200;
  return out;
}

function buildFilter(args) {
  const parts = [];
  if (args.fromYear) parts.push(`from_publication_date:${args.fromYear}-01-01`);
  if (args.toYear) parts.push(`to_publication_date:${args.toYear}-12-31`);
  if (args.type) parts.push(`type:${args.type}`);
  return parts.join(',');
}

async function getJson(url, mailto) {
  const u = new URL(url);
  if (mailto) u.searchParams.set('mailto', mailto);
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const res = await fetch(u, { headers: { 'user-agent': 'lit-review-6step/2.0' } });
    if (res.ok) return res.json();
    if (res.status === 429) { await sleep(1500 * (attempt + 1)); continue; }
    throw new Error(`HTTP ${res.status} ${u.pathname}`);
  }
  throw new Error('多次重试仍失败');
}

function sleep(ms) { return new Promise((r) => setTimeout(r, ms)); }

function normalizeDoi(doi) {
  return (doi || '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').toLowerCase();
}

function toRow(work, idx, query, mode) {
  const authors = (work.authorships || []).map((a) => a.author && a.author.display_name).filter(Boolean).join('; ');
  const venue = work.primary_location && work.primary_location.source && work.primary_location.source.display_name;
  const noteParts = [];
  if (venue) noteParts.push(venue);
  if (typeof work.cited_by_count === 'number') noteParts.push(`被引 ${work.cited_by_count}`);
  noteParts.push(mode === 'search' ? '检索' : mode === 'cited-by' ? '前向引文' : '后向引文');
  return {
    record_id: `OA-${String(idx).padStart(4, '0')}`,
    source: 'openalex',
    platform: 'OpenAlex',
    query,
    search_date: new Date().toISOString().slice(0, 10),
    title: work.title || work.display_name || '',
    authors,
    year: work.publication_year || '',
    doi: normalizeDoi(work.doi),
    url: work.id || '',
    note: noteParts.join(' | '),
  };
}

async function collectSearch(args, query) {
  const rows = [];
  let cursor = '*';
  for (let page = 0; page < args.pages && rows.length < args.max; page += 1) {
    const params = new URLSearchParams();
    params.set('search', query);
    params.set('per-page', String(args.perPage));
    params.set('cursor', cursor);
    if (args.sort && args.sort !== 'relevance_score') params.set('sort', args.sort);
    const filter = buildFilter(args);
    if (filter) params.set('filter', filter);
    const data = await getJson(`${API}/works?${params}`, args.mailto);
    for (const w of data.results || []) rows.push(w);
    cursor = data.meta && data.meta.next_cursor;
    if (!cursor || !(data.results || []).length) break;
  }
  return rows;
}

async function collectCitedBy(args, id) {
  const rows = [];
  let cursor = '*';
  for (let page = 0; page < args.pages && rows.length < args.max; page += 1) {
    const params = new URLSearchParams();
    params.set('filter', [buildFilter(args), `cites:${id}`].filter(Boolean).join(','));
    params.set('per-page', String(args.perPage));
    params.set('cursor', cursor);
    const data = await getJson(`${API}/works?${params}`, args.mailto);
    for (const w of data.results || []) rows.push(w);
    cursor = data.meta && data.meta.next_cursor;
    if (!cursor || !(data.results || []).length) break;
  }
  return rows;
}

async function collectReferences(args, id) {
  const work = await getJson(`${API}/works/${id}`, args.mailto);
  const refs = (work.referenced_works || []).map((u) => u.split('/').pop()).filter(Boolean);
  const rows = [];
  for (let i = 0; i < refs.length && rows.length < args.max; i += 50) {
    const chunk = refs.slice(i, i + 50);
    const params = new URLSearchParams();
    params.set('filter', `openalex_id:${chunk.join('|')}`);
    params.set('per-page', '50');
    const data = await getJson(`${API}/works?${params}`, args.mailto);
    for (const w of data.results || []) rows.push(w);
    await sleep(120);
  }
  return rows;
}

function dedupe(rows) {
  const seen = new Set();
  const out = [];
  for (const r of rows) {
    const key = r.doi ? `doi:${r.doi}` : `title:${(r.title || '').toLowerCase().replace(/\s+/g, ' ')}`;
    if (!key || key === 'title:') continue;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(r);
  }
  return out;
}

function toCsv(rows) {
  const header = 'record_id,source,platform,query,search_date,title,authors,year,doi,url,note';
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const lines = rows.map((r) => [r.record_id, r.source, r.platform, r.query, r.search_date, r.title, r.authors, r.year, r.doi, r.url, r.note].map(esc).join(','));
  return [header, ...lines].join('\r\n');
}

const args = parseArgs(process.argv);
const query = args.query || (args.mode === 'cited-by' ? `cites:${args.id}` : args.mode === 'references' ? `refs:${args.id}` : null);
if (!query) {
  console.error('用法：--query "..." 或 --mode cited-by|references --id Wxxxx');
  process.exit(2);
}

let works;
try {
  if (args.mode === 'search') works = await collectSearch(args, args.query);
  else if (args.mode === 'cited-by') works = await collectCitedBy(args, args.id);
  else if (args.mode === 'references') works = await collectReferences(args, args.id);
  else throw new Error(`未知 mode: ${args.mode}`);
} catch (e) {
  console.error(`检索失败：${e.message}`);
  process.exit(1);
}

const rows = dedupe(works.map((w, i) => toRow(w, i + 1, query, args.mode))).slice(0, args.max);
console.log(`模式 ${args.mode}｜原始 ${works.length} 条｜去重后 ${rows.length} 条`);
for (const r of rows.slice(0, 5)) console.log(`  ${r.year} ${r.title.slice(0, 70)} ${r.doi ? `(${r.doi})` : ''}`);

if (args.out) {
  const outPath = path.resolve(args.out);
  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, toCsv(rows), 'utf8');
  console.log(`已写入 ${args.out}`);
}
