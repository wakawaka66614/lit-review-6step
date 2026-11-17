#!/usr/bin/env node
/**
 * 多源检索结果合并：去重、分配 paper_id、保留来源链、标记出版状态。
 *
 *   node scripts/merge-results.mjs \
 *     --inputs 01_检索/oa.csv,01_检索/aminer.csv \
 *     --out 01_检索/候选表.csv [--start 1] [--include 1]
 *
 * 输入：各通道的原始结果（record_id,source,platform,query,search_date,title,authors,year,doi,url,note）
 * 输出：候选表（paper_id,source,source_id,doi,title,authors,year,venue,included,...,discovery,pub_status）
 */
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = { start: 1, include: '' };
  for (let i = 2; i < argv.length; i += 1) {
    if (!argv[i].startsWith('--')) continue;
    const k = argv[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    out[k] = argv[++i];
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

const normDoi = (v) => (v || '').replace(/^https?:\/\/(dx\.)?doi\.org\//i, '').trim().toLowerCase();
const normTitle = (v) => (v || '').toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '');
const csvEscape = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

function pubStatus(row) {
  const title = (row.title || '').toLowerCase();
  const venue = (row.venue || row.note || '').toLowerCase();
  const doi = normDoi(row.doi);
  if (/retract|withdraw|撤稿/.test(title)) return 'retracted';
  if (/^10\.48550\/arxiv|^10\.1101\/|^10\.21203\/|^10\.26434\//.test(doi)) return 'preprint';
  if (/arxiv|biorxiv|medrxiv|research square|ssrn|preprint/.test(venue)) return 'preprint';
  if (venue) return 'published';
  return 'unknown';
}

const args = parseArgs(process.argv);
if (!args.inputs || !args.out) {
  console.error('用法: node merge-results.mjs --inputs a.csv,b.csv --out 候选表.csv [--start 1] [--include 1]');
  process.exit(2);
}

const files = args.inputs.split(',').map((s) => s.trim()).filter(Boolean);
const merged = new Map();
const order = [];

for (const file of files) {
  const rows = parseCsv(fs.readFileSync(path.resolve(file), 'utf8'));
  for (const r of rows) {
    const key = normDoi(r.doi) ? `doi:${normDoi(r.doi)}` : `title:${normTitle(r.title)}`;
    if (!key || key === 'title:') continue;
    const source = (r.source || r.platform || 'unknown').toLowerCase();
    const sourceId = (r.url || '').split('/').pop() || r.record_id || '';
    const discovery = `${source}:${r.query || ''}`;
    if (merged.has(key)) {
      const m = merged.get(key);
      if (!m.discovery.includes(discovery)) m.discovery += `; ${discovery}`;
      if (!m.authors && r.authors) m.authors = r.authors;
      continue;
    }
    const venue = (r.note || '').split(' | ')[0] || '';
    merged.set(key, {
      source,
      source_id: sourceId,
      doi: normDoi(r.doi),
      title: r.title || '',
      authors: r.authors || '',
      year: r.year || '',
      venue,
      citations: (r.note || '').match(/被引\s*(\d+)/)?.[1] || '',
      url: r.url || '',
      discovery,
      pub_status: pubStatus({ title: r.title, venue, doi: r.doi }),
      note: r.note || '',
    });
    order.push(key);
  }
}

const header = 'paper_id,source,source_id,doi,title,authors,year,venue,included,exclude_code,channel,query,citations,url,lang,note,discovery,pub_status';
const lines = order.map((key, i) => {
  const r = merged.get(key);
  const pid = `P${String(Number(args.start) + i).padStart(4, '0')}`;
  return [pid, r.source, r.source_id, r.doi, csvEscape(r.title), csvEscape(r.authors), r.year, csvEscape(r.venue), args.include, '', r.source, '', r.citations, r.url, '', csvEscape(r.note), csvEscape(r.discovery), r.pub_status].join(',');
});

fs.mkdirSync(path.dirname(path.resolve(args.out)), { recursive: true });
fs.writeFileSync(path.resolve(args.out), [header, ...lines].join('\r\n'), 'utf8');

const statusCount = {};
for (const key of order) { const s = merged.get(key).pub_status; statusCount[s] = (statusCount[s] || 0) + 1; }
console.log(`合并 ${files.length} 个文件，去重后 ${order.length} 条`);
console.log('出版状态：', JSON.stringify(statusCount));
console.log(`已写入 ${args.out}`);
