import { createHash } from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const repoRoot = path.resolve(here, '..', '..');
const config = JSON.parse(fs.readFileSync(path.join(repoRoot, 'design.config.json'), 'utf8'));
const lock = JSON.parse(fs.readFileSync(path.join(repoRoot, 'design.lock.json'), 'utf8'));

const sha256 = (value) => createHash('sha256').update(value).digest('hex');
const toPosix = (value) => value.split(path.sep).join('/');
const fail = (message) => { throw new Error(message); };

if (config.schemaVersion !== 1 || lock.schemaVersion !== 1) fail('design schemaVersion must be 1');
if (config.designSha !== lock.designSha) fail('design SHA differs between config and lock');
if (config.preset !== lock.preset) fail('design preset differs between config and lock');
if (lock.integration?.cssEntry !== config.cssEntry) fail('design CSS entry differs between config and lock');

for (const item of lock.managedFiles ?? []) {
  const filePath = path.join(repoRoot, item.path);
  if (!fs.existsSync(filePath)) fail(`managed design file missing: ${item.path}`);
  const actual = sha256(fs.readFileSync(filePath));
  if (actual !== item.sha256) fail(`managed design file drift: ${item.path}`);
}

const cssEntry = path.join(repoRoot, config.cssEntry);
const cssSource = fs.readFileSync(cssEntry, 'utf8');
const start = '/* kafka-design:managed-start */';
const end = '/* kafka-design:managed-end */';
if ((cssSource.split(start).length - 1) !== 1 || (cssSource.split(end).length - 1) !== 1) {
  fail('managed CSS import block is missing or duplicated');
}

const managedPrefix = `${toPosix(config.managedDir).replace(/\/$/, '')}/`;
const extensions = new Set(['.css', '.scss', '.sass', '.less']);
const skip = new Set(['.git', '.docusaurus', 'node_modules', 'build', 'dist', 'coverage']);

function walk(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
    if (entry.isDirectory() && skip.has(entry.name)) return [];
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) return walk(full);
    return entry.isFile() && extensions.has(path.extname(entry.name).toLowerCase()) ? [full] : [];
  });
}

function stripComments(source) {
  return source.replace(/\/\*[\s\S]*?\*\//g, '');
}

const errors = [];
for (const filePath of walk(repoRoot)) {
  const relative = toPosix(path.relative(repoRoot, filePath));
  if (relative.startsWith(managedPrefix)) continue;
  const source = stripComments(fs.readFileSync(filePath, 'utf8'));

  if (/#[0-9a-f]{3,8}\b|\brgba?\s*\(|\bhsla?\s*\(/i.test(source)) {
    errors.push(`${relative}: raw color literal`);
  }

  const visualVariable = /(--[\w-]*(?:color|background|surface|foreground|muted|accent|primary|border|radius|shadow)[\w-]*)\s*:\s*([^;]+);/gi;
  for (const match of source.matchAll(visualVariable)) {
    const value = match[2].trim();
    if (/^var\(--k-[\w-]+\)$/.test(value) || /^(?:inherit|initial|unset|none|transparent|currentColor)$/.test(value)) continue;
    errors.push(`${relative}: ${match[1]} is not mapped to a canonical --k-* token`);
  }

  const forbidden = [
    ['gradient', /\b(?:linear|radial|conic)-gradient\s*\(/i],
    ['glass', /\bbackdrop-filter\s*:/i],
    ['glow/shadow', /\bbox-shadow\s*:\s*(?!none\b)(?!var\(--k-)/i],
    ['blur', /\bfilter\s*:\s*[^;]*\bblur\s*\(/i],
  ];
  for (const [name, pattern] of forbidden) {
    if (pattern.test(source)) errors.push(`${relative}: forbidden ${name} effect`);
  }
}

if (errors.length) fail(`design conformance failed:\n${errors.join('\n')}`);
console.log(`design contract ok: ${config.designSha} (${config.preset})`);
