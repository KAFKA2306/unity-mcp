import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = path.join(root, "data", "failures");
const sources = JSON.parse(fs.readFileSync(path.join(data, "sources.json"), "utf8"));
const canonical = JSON.parse(fs.readFileSync(path.join(data, "records-github-2026.json"), "utf8"));
const issueSources = sources.filter((s) => s.enabled && s.fetch_mode === "github_api" && s.content_type === "issues" && s.repository !== "unknown");
const releaseSources = sources.filter((s) => s.enabled && s.fetch_mode === "github_api" && s.content_type === "release" && s.repository !== "unknown");
const failure = /bug|error|exception|fail|crash|regression|broken|not working|wrong|missing|panic|hang|freeze|leak|duplicate|nullreference|cannot|can't|doesn't|corrupt|timeout|invalid|miscompile|overwrite|不具合|エラー|失敗|クラッシュ|削除|壊れ|動かない|おかしく|表示されない|できない/i;
const feature = /feature|enhancement|request|proposal|suggestion|機能追加|要望/i;
const spam = /t\.me\/|telegram|发卡|premium account|account stock/i;
const fixLine = /^(?:[-*]\s*)?(?:fix|fixed|bugfix|bug fix|修正|不具合修正)\b/i;
const token = process.env.GITHUB_TOKEN ?? "";

function headers() {
  const h = { accept: "application/vnd.github+json", "user-agent": "unity-mcp-failure-kb/1.0", "x-github-api-version": "2022-11-28" };
  if (token) h.authorization = `Bearer ${token}`;
  return h;
}

async function paged(urlForPage) {
  const out = [];
  for (let page = 1; page <= 10; page += 1) {
    const response = await fetch(urlForPage(page), { headers: headers(), signal: AbortSignal.timeout(20000) });
    if (!response.ok) throw new Error(`GitHub API HTTP ${response.status}: ${urlForPage(page)}`);
    const batch = await response.json();
    out.push(...batch);
    if (batch.length < 100) break;
  }
  return out;
}

async function issuesFor(repository) {
  const issues = await paged((page) => `https://api.github.com/repos/${repository}/issues?state=all&since=2026-01-01T00:00:00Z&sort=updated&direction=desc&per_page=100&page=${page}`);
  return issues.filter((issue) => !issue.pull_request && issue.created_at?.startsWith("2026-"));
}

async function releasesFor(repository) {
  const releases = await paged((page) => `https://api.github.com/repos/${repository}/releases?per_page=100&page=${page}`);
  return releases.filter((release) => release.published_at?.startsWith("2026-"));
}

function isFailure(issue) {
  const labels = (issue.labels ?? []).map((x) => typeof x === "string" ? x : x.name ?? "").join(" ");
  const text = `${issue.title ?? ""}\n${issue.body ?? ""}`;
  if (spam.test(text)) return false;
  const explicitBug = /bug|regression|不具合/i.test(labels);
  if (!explicitBug && feature.test(`${labels}\n${issue.title ?? ""}`)) return false;
  return explicitBug || failure.test(text);
}

function first(text, patterns) {
  for (const p of patterns) {
    const m = text.match(p);
    if (m) return m[1] ?? m[0];
  }
  return "unknown";
}

function candidate(source, issue) {
  const body = issue.body ?? "";
  return {
    id: `2026-github-${source.repository.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${issue.number}`,
    title: issue.title,
    date: issue.created_at.slice(0, 10),
    date_kind: "published",
    source_urls: [issue.html_url],
    source_type: "github_issue",
    source_family: source.source_family,
    component: source.source_family,
    unity_version: first(body, [/(?:Unity(?:\s+version)?\s*[:=]?\s*)(20\d{2}\.\d+\.\d+[a-z]\d+)/i, /\b(20\d{2}\.\d+\.\d+[a-z]\d+)\b/i]),
    vrcsdk_version: first(body, [/(?:VRCSDK|VRChat SDK)[^0-9]{0,24}(3\.\d+\.\d+(?:[-.a-z0-9]+)?)/i]),
    packages: [{ name: source.source_family, version: "unknown" }],
    platforms: ["unknown"],
    stage: "unknown",
    error_signature: first(`${issue.title}\n${body}`, [/(System\.[A-Za-z0-9_.]+Exception[^\n]*)/, /(CS\d{4}[^\n]*)/, /(panic[^\n]*)/i, /(error:\s*[^\n]+)/i]),
    symptom: issue.title,
    trigger: "unknown",
    root_cause: "unknown",
    solution: "unknown",
    workaround: "unknown",
    status: "unknown",
    tags: ["github", "issue", source.id]
  };
}

function releaseFixes(source, release) {
  const fixes = [];
  for (const raw of (release.body ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || !(fixLine.test(line.replace(/^[-*]\s*/, "")) || (/\bfix(?:es|ed)?\b/i.test(line) && /#\d+/.test(line)))) continue;
    const issueNumbers = [...line.matchAll(/#(\d+)/g)].map((match) => Number(match[1]));
    fixes.push({ source: source.id, repository: source.repository, release: release.tag_name, release_url: release.html_url, published_at: release.published_at, line, issue_numbers: issueNumbers });
  }
  return fixes;
}

const allUrls = new Set();
const candidates = [];
const issueReport = [];
for (const source of issueSources) {
  const issues = await issuesFor(source.repository);
  issues.forEach((issue) => allUrls.add(issue.html_url));
  const selected = issues.filter(isFailure);
  candidates.push(...selected.map((issue) => candidate(source, issue)));
  issueReport.push({ source: source.id, checked: issues.length, candidates: selected.length });
}
candidates.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));

const releaseCandidates = [];
const releaseReport = [];
for (const source of releaseSources) {
  const releases = await releasesFor(source.repository);
  const fixes = releases.flatMap((release) => releaseFixes(source, release));
  releaseCandidates.push(...fixes);
  releaseReport.push({ source: source.id, checked_releases: releases.length, fix_lines: fixes.length });
}

const canonicalKey = new Set(canonical.map((record) => record.source_urls[0]));
const matchedReleaseEvidence = releaseCandidates.filter((fix) => fix.issue_numbers.some((number) => canonicalKey.has(`https://github.com/${fix.repository}/issues/${number}`)));
const missing = canonical.filter((record) => !allUrls.has(record.source_urls[0]));
const duplicateUrls = canonical.length - new Set(canonical.map((record) => record.source_urls[0])).size;
if (canonical.length < 30) throw new Error(`canonical GitHub records below 30: ${canonical.length}`);
if (missing.length) throw new Error(`canonical GitHub records not found in 2026 source scan: ${missing.map((x) => x.id).join(", ")}`);
if (duplicateUrls) throw new Error(`canonical GitHub records contain ${duplicateUrls} duplicate source URL(s)`);
if (candidates.length < 30) throw new Error(`GitHub discovery produced only ${candidates.length} failure candidates`);
if (releaseCandidates.length === 0) throw new Error("No 2026 GitHub release/changelog fix lines discovered");

const result = {
  canonical: canonical.length,
  discovered_issue_candidates: candidates.length,
  discovered_release_fix_lines: releaseCandidates.length,
  release_fixes_matching_canonical: matchedReleaseEvidence.length,
  issue_sources: issueReport,
  release_sources: releaseReport
};

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify({ ...result, issue_candidates: candidates, release_candidates: releaseCandidates }, null, 2)}\n`);
} else {
  console.log(JSON.stringify(result, null, 2));
}
