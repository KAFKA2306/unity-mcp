import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = path.join(root, "data", "failures");
const sources = JSON.parse(fs.readFileSync(path.join(data, "sources.json"), "utf8"));
const rawRecords = JSON.parse(fs.readFileSync(path.join(data, "records-github-2026.json"), "utf8"));
const issueSources = sources.filter((source) => source.enabled && source.fetch_mode === "github_api" && source.content_type === "issues" && source.repository !== "unknown");
const releaseSources = sources.filter((source) => source.enabled && source.fetch_mode === "github_api" && source.content_type === "release" && source.repository !== "unknown");
const failure = /bug|error|exception|fail|crash|regression|broken|not working|wrong|missing|panic|hang|freeze|leak|duplicate|nullreference|cannot|can't|doesn't|corrupt|timeout|invalid|miscompile|overwrite|不具合|エラー|失敗|クラッシュ|削除|壊れ|動かない|おかしく|表示されない|できない/i;
const feature = /feature|enhancement|request|proposal|suggestion|機能追加|要望/i;
const spam = /t\.me\/|telegram|发卡|premium account|account stock/i;
const fixLine = /^(?:[-*]\s*)?(?:fix|fixed|bugfix|bug fix|修正|不具合修正)\b/i;
const token = process.env.GITHUB_TOKEN ?? "";

function headers() {
  const value = { accept: "application/vnd.github+json", "user-agent": "unity-mcp-failure-kb-raw-collector/1.0", "x-github-api-version": "2022-11-28" };
  if (token) value.authorization = `Bearer ${token}`;
  return value;
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
  const labels = (issue.labels ?? []).map((item) => typeof item === "string" ? item : item.name ?? "").join(" ");
  const text = `${issue.title ?? ""}\n${issue.body ?? ""}`;
  if (spam.test(text)) return false;
  const explicitBug = /bug|regression|不具合/i.test(labels);
  if (!explicitBug && feature.test(`${labels}\n${issue.title ?? ""}`)) return false;
  return explicitBug || failure.test(text);
}

function first(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1] ?? match[0];
  }
  return null;
}

function candidate(source, issue) {
  const body = issue.body ?? "";
  const unityVersion = first(body, [/(?:Unity(?:\s+version)?\s*[:=]?\s*)(20\d{2}\.\d+\.\d+[a-z]\d+)/i, /\b(20\d{2}\.\d+\.\d+[a-z]\d+)\b/i]);
  const sdkVersion = first(body, [/(?:VRCSDK|VRChat SDK)[^0-9]{0,24}(3\.\d+\.\d+(?:[-.a-z0-9]+)?)/i]);
  const errorSignature = first(`${issue.title}\n${body}`, [/(System\.[A-Za-z0-9_.]+Exception[^\n]*)/, /(CS\d{4}[^\n]*)/, /(panic[^\n]*)/i, /(error:\s*[^\n]+)/i]);
  return {
    id: `2026-github-${source.repository.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${issue.number}`,
    title: issue.title,
    date: issue.created_at.slice(0, 10),
    date_kind: "published",
    source_url: issue.html_url,
    source_type: "github_issue",
    publisher: source.source_family,
    repository: source.repository,
    symptom: issue.title,
    ...(unityVersion ? { unity_version: unityVersion } : {}),
    ...(sdkVersion ? { vrchat_sdk_version: sdkVersion } : {}),
    ...(errorSignature ? { error_signature: errorSignature } : {})
  };
}

function releaseFixes(source, release) {
  const fixes = [];
  for (const raw of (release.body ?? "").split(/\r?\n/)) {
    const line = raw.trim();
    if (!line || !(fixLine.test(line.replace(/^[-*]\s*/, "")) || (/\bfix(?:es|ed)?\b/i.test(line) && /#\d+/.test(line)))) continue;
    fixes.push({
      source: source.id,
      repository: source.repository,
      release: release.tag_name,
      release_url: release.html_url,
      published_at: release.published_at,
      line,
      issue_numbers: [...line.matchAll(/#(\d+)/g)].map((match) => Number(match[1]))
    });
  }
  return fixes;
}

const discoveredUrls = new Set();
const candidates = [];
const issueReport = [];
for (const source of issueSources) {
  const issues = await issuesFor(source.repository);
  issues.forEach((issue) => discoveredUrls.add(issue.html_url));
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

const rawKeys = new Set(rawRecords.map((record) => record.source_urls[0]));
const matchedReleaseEvidence = releaseCandidates.filter((fix) => fix.issue_numbers.some((number) => rawKeys.has(`https://github.com/${fix.repository}/issues/${number}`)));
const missingRaw = rawRecords.filter((record) => !discoveredUrls.has(record.source_urls[0]));
const duplicateRawUrls = rawRecords.length - new Set(rawRecords.map((record) => record.source_urls[0])).size;
if (missingRaw.length) throw new Error(`GitHub raw records not found in 2026 source scan: ${missingRaw.map((item) => item.id).join(", ")}`);
if (duplicateRawUrls) throw new Error(`GitHub raw records contain ${duplicateRawUrls} duplicate source URL(s)`);

const result = {
  raw_records: rawRecords.length,
  discovered_issue_candidates: candidates.length,
  discovered_release_fix_lines: releaseCandidates.length,
  release_fixes_matching_raw: matchedReleaseEvidence.length,
  candidates_with_explicit_unity: candidates.filter((item) => item.unity_version).length,
  issue_sources: issueReport,
  release_sources: releaseReport
};

if (process.argv.includes("--json")) process.stdout.write(`${JSON.stringify({ ...result, issue_candidates: candidates, release_candidates: releaseCandidates }, null, 2)}\n`);
else console.log(JSON.stringify(result, null, 2));
