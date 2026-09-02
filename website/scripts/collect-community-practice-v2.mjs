import fs from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const scriptDir = path.dirname(fileURLToPath(import.meta.url));
const websiteRoot = path.resolve(scriptDir, '..');
const engine = path.join(scriptDir, 'collect-community-practice-engine.mjs');
const titlePolicy = path.join(scriptDir, 'apply-community-practice-title-policy.mjs');
const live = process.argv.includes('--live');

function run(script, args = []) {
  const result = spawnSync(process.execPath, [script, ...args], {
    cwd: websiteRoot,
    stdio: 'inherit',
    env: process.env
  });
  if (result.error) throw result.error;
  if (result.status !== 0) process.exit(result.status ?? 1);
}

run(engine, live ? ['--live'] : []);
run(titlePolicy, live ? ['--live'] : []);

if (!live) {
  console.log(JSON.stringify({
    status: 'offline',
    pipeline: 'scored-collector+title-policy',
    self_test: 'passed'
  }, null, 2));
  process.exit(0);
}

const scoredReportPath = path.join(websiteRoot, 'community-practice-discovery-v2-report.json');
const policyReportPath = path.join(websiteRoot, 'community-practice-title-policy-report.json');
const candidatePath = path.join(websiteRoot, 'static', 'data', 'community-practice-candidates.json');
const rejectionPath = path.join(websiteRoot, 'data', 'community-practice-rejections.json');
const statePath = path.join(websiteRoot, 'data', 'community-practice-discovery-state.json');

const scored = JSON.parse(fs.readFileSync(scoredReportPath, 'utf8'));
const policy = JSON.parse(fs.readFileSync(policyReportPath, 'utf8'));
const candidates = JSON.parse(fs.readFileSync(candidatePath, 'utf8'));
const rejections = JSON.parse(fs.readFileSync(rejectionPath, 'utf8'));
const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));

const finalReport = {
  ...scored,
  title_policy_version: policy.policy_version ?? 1,
  title_policy_removed: policy.removed ?? 0,
  candidate_count: candidates.items?.length ?? policy.candidate_count ?? scored.candidate_count ?? 0,
  rejection_count: rejections.items?.length ?? scored.rejection_count ?? 0
};

state.last_run = {
  at: finalReport.discovered_at ?? new Date().toISOString(),
  status: finalReport.status ?? 'unknown',
  classifier_version: finalReport.classifier_version ?? 2,
  title_policy_version: finalReport.title_policy_version,
  candidate_count: finalReport.candidate_count,
  rejection_count: finalReport.rejection_count,
  new_candidates: finalReport.new_candidates ?? 0,
  removed_existing: finalReport.removed_existing ?? 0,
  title_policy_removed: finalReport.title_policy_removed,
  fetch_errors: finalReport.fetch_errors ?? 0,
  sources: (finalReport.sources ?? []).map((source) => ({
    id: source.id,
    kind: source.kind,
    status: source.status ?? 'unknown',
    error: source.error ?? null
  }))
};

fs.writeFileSync(scoredReportPath, `${JSON.stringify(finalReport, null, 2)}\n`);
fs.writeFileSync(statePath, `${JSON.stringify(state, null, 2)}\n`);
console.log(JSON.stringify(finalReport, null, 2));
