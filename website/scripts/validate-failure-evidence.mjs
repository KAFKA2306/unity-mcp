import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { githubRepository, sourceDomain } from './failure-evidence.mjs';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataRoot = path.join(root, 'data', 'failures');
const recordFiles = fs.readdirSync(dataRoot)
  .filter((name) => /^records(?:-[a-z0-9-]+)?-2026\.json$/.test(name))
  .sort();
const records = recordFiles.flatMap((name) => JSON.parse(fs.readFileSync(path.join(dataRoot, name), 'utf8')));
const errors = [];

function assertEqual(actual, expected, label) {
  if (actual !== expected) errors.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
}

assertEqual(
  sourceDomain('https://creators.vrchat.com/releases/release-3-10-4/'),
  'creators.vrchat.com',
  'VRChat source domain'
);
assertEqual(
  sourceDomain('https://GitHub.com/vrchat-community/ClientSim/issues/142'),
  'github.com',
  'GitHub source domain normalization'
);
assertEqual(
  githubRepository('https://github.com/vrchat-community/ClientSim/issues/142'),
  'vrchat-community/ClientSim',
  'GitHub repository derivation'
);
assertEqual(
  githubRepository('https://creators.vrchat.com/releases/release-3-10-4/'),
  null,
  'non-GitHub repository derivation'
);

let evidenceRecords = 0;
let evidenceItems = 0;
for (const record of records) {
  if (!record.evidence) continue;
  evidenceRecords += 1;
  const urls = new Set();
  for (const [index, evidence] of record.evidence.entries()) {
    evidenceItems += 1;
    const at = `${record.id}.evidence[${index}]`;
    try {
      sourceDomain(evidence.url);
    } catch (error) {
      errors.push(`${at}.url: ${error.message}`);
    }
    if (urls.has(evidence.url)) errors.push(`${record.id}: duplicate evidence URL ${evidence.url}`);
    urls.add(evidence.url);
    const supports = new Set(evidence.supports ?? []);
    if (supports.size !== (evidence.supports ?? []).length) errors.push(`${at}.supports: duplicate value`);
    if ('source_domain' in evidence) errors.push(`${at}: source_domain must be derived from url, not stored`);
    if ('repository' in evidence) errors.push(`${at}: repository must be derived from GitHub url, not stored`);
  }
}

if (errors.length) {
  console.error(`Failure evidence validation failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Failure evidence validation passed: ${evidenceRecords} migrated record(s), ${evidenceItems} evidence item(s); derivation fixtures passed.`);
