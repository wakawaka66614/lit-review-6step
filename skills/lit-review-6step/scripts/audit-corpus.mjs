import fs from 'node:fs';
import path from 'node:path';

const args = {};
for (let i = 2; i < process.argv.length; i += 1) {
  if (!process.argv[i].startsWith('--')) continue;
  const k = process.argv[i].slice(2).replace(/-([a-z])/g, (_, c) => c.toUpperCase());
  args[k] = process.argv[++i];
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

const cands = parseCsv(fs.readFileSync(path.resolve(args.candidates), 'utf8'));
const included = cands.filter((c) => c.included === '1');
const extraction = args.extraction && fs.existsSync(args.extraction)
  ? parseCsv(fs.readFileSync(path.resolve(args.extraction), 'utf8'))
  : [];
const minIncluded = Number(args.minIncluded || 50);
const minFulltext = Number(args.minFulltext || 5);
const minCited = Number(args.minCited || 50);

const fulltext = extraction.filter((e) => /全文/.test(e.note || '') || ['高', '中'].includes(e.quality || ''));
const errors = [];
const warnings = [];
if (included.length < minIncluded) errors.push(`纳入 ${included.length} 篇，低于硬门槛 ${minIncluded}`);
if (fulltext.length < minFulltext) errors.push(`全文 ${fulltext.length} 篇，低于硬门槛 ${minFulltext}`);
if (included.length && fulltext.length / included.length < 0.2) warnings.push(`全文占比 ${(fulltext.length / included.length * 100).toFixed(1)}%，低于 20%`);

let cited = 0;
if (args.manuscript && fs.existsSync(args.manuscript)) {
  const text = fs.readFileSync(path.resolve(args.manuscript), 'utf8');
  const set = new Set([...text.matchAll(/\bP\d{3,5}\b/g)].map((m) => m[0]));
  const authorMatch = (authors, name) => (authors || '').split(/[;；,，\s]+/).some((t) => t && (name === t || name.endsWith(t)));
  const cn = /([\u4e00-\u9fa5]{2,4})(?:等)?(?:[，,]\s*|[（(]\s*)((?:19|20)\d{2})/g;
  const en = /\b([A-Z][A-Za-z'’\-]{1,})(?:\s+(?:et al\.?))?[,\s]*\(?((?:19|20)\d{2})\)?/g;
  for (const re of [cn, en]) {
    for (const m of text.matchAll(re)) {
      for (const c of included) {
        if (c.year === m[2] && authorMatch(c.authors, m[1])) set.add(c.paper_id || c.id);
      }
    }
  }
  cited = [...set].filter((id) => included.some((c) => (c.paper_id || c.id) === id)).length;
  if (cited < minCited) errors.push(`正文引用 ${cited} 篇，低于硬门槛 ${minCited}`);
}

console.log(`纳入 ${included.length}（≥${minIncluded}）｜全文 ${fulltext.length}（≥${minFulltext}）｜正文引用 ${cited}（≥${minCited}）`);
for (const e of errors) console.log('  ERROR', e);
for (const w of warnings) console.log('  WARN ', w);
process.exit(errors.length ? 1 : 0);
