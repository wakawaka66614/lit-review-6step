#!/usr/bin/env node
/**
 * 端到端对照测试的运行目录生成器。
 *
 *   node scripts/e2e-init.mjs --topic "graph neural network cold start recommendation" --out e2e
 *
 * 生成：
 *   e2e/<slug>-<date>/
 *     README.md          运行说明
 *     gold-set.csv       金标准文献集（人工填）
 *     scores.csv         评分表
 *     runs/A|B|C/        三条条件的产物目录
 */
import fs from 'node:fs';
import path from 'node:path';

function parseArgs(argv) {
  const out = { out: 'e2e' };
  for (let i = 2; i < argv.length; i += 1) {
    if (argv[i].startsWith('--')) out[argv[i].slice(2)] = argv[++i];
  }
  return out;
}

const args = parseArgs(process.argv);
if (!args.topic) {
  console.error('用法: node scripts/e2e-init.mjs --topic "主题" [--out e2e]');
  process.exit(2);
}

const slug = args.topic.toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'topic';
const date = new Date().toISOString().slice(0, 10).replace(/-/g, '');
const root = path.resolve(args.out || 'e2e', `${slug}-${date}`);

if (fs.existsSync(root)) {
  console.error(`目录已存在：${root}`);
  process.exit(1);
}

const dirs = ['runs/A', 'runs/B', 'runs/C', 'runs/C/01_检索', 'runs/C/02_筛选', 'runs/C/03_精读', 'runs/C/04_综合', 'runs/C/05_成稿'];
for (const d of dirs) fs.mkdirSync(path.join(root, d), { recursive: true });

fs.writeFileSync(path.join(root, 'gold-set.csv'),
  'id,doi,title,year,venue,why_core,verified_by\n', 'utf8');
fs.writeFileSync(path.join(root, 'scores.csv'),
  'metric,A_baseline,B_current,C_v2,notes\n' +
  'coverage,,,\n' +
  'citation_verifiable,,,\n' +
  'evidence_supported,,,\n' +
  'extraction_accuracy,,,\n' +
  'taxonomy_quality,,,\n' +
  'synthesis_depth,,,\n' +
  'citation_accuracy,,,\n' +
  'cost_minutes,,,\n' +
  'heavy_edit_ratio,,,\n', 'utf8');

fs.writeFileSync(path.join(root, 'README.md'), `# 端到端对照：${args.topic}

生成日期：${date}

## 步骤

1. 填 \`gold-set.csv\`：人工检索并核验 20–40 篇核心文献，写清 \`why_core\` 与 \`verified_by\`。
2. 条件 A：普通 LLM 一次性写综述，产物放 \`runs/A/\`。
3. 条件 B：当前 skill 全流程，产物放 \`runs/B/\`。
4. 条件 C：V2 流程，产物放 \`runs/C/\`（已有目录骨架）。
5. 按 \`scores.csv\` 评分；结论写 \`RESULTS.md\`。

## 规则

- 三条条件用同一主题、同一截止日期、同一模型（若可比）。
- 记录耗时、token、人工修改分钟。
- 必须报告失败案例与人工大改比例。
- 评价人姓名与分工写进 RESULTS.md。

参考：\`docs/E2E_TEST_PLAN.md\`。
`, 'utf8');

console.log(`已创建 ${root}`);
console.log('下一步：填 gold-set.csv，再跑 A/B/C 三条条件。');
