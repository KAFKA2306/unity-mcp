import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(websiteRoot, "data", "failures");
const outputPath = path.join(dataRoot, "records-github-2026.json");
const sources = JSON.parse(fs.readFileSync(path.join(dataRoot, "sources.json"), "utf8"));
const issueSources = sources.filter((source) => source.enabled && source.fetch_mode === "github_api" && source.content_type === "issues" && source.repository !== "unknown");
const failurePattern = /bug|error|exception|fail|crash|regression|broken|not working|wrong|missing|panic|hang|freeze|leak|duplicate|nullreference|cannot|can't|doesn't|corrupt|timeout|invalid|miscompile|overwrite/i;
const featurePattern = /feature|enhancement|request|proposal|suggestion/i;
const token = process.env.GITHUB_TOKEN ?? "";

function existingRecords() {
  return fs.readdirSync(dataRoot)
    .filter((name) => /^records(?:-[a-z0-9-]+)?-2026\.json$/.test(name) && name !== path.basename(outputPath))
    .flatMap((name) => JSON.parse(fs.readFileSync(path.join(dataRoot, name), "utf8")));
}

function headers() {
  const value = {
    accept: "application/vnd.github+json",
    "user-agent": "unity-mcp-failure-kb-github-collector/1.0",
    "x-github-api-version": "2022-11-28"
  };
  if (token) value.authorization = `Bearer ${token}`;
  return value;
}

async function fetchPage(repository, page) {
  const url = `https://api.github.com/repos/${repository}/issues?state=all&since=2026-01-01T00:00:00Z&sort=updated&direction=desc&per_page=100&page=${page}`;
  const response = await fetch(url, { headers: headers(), signal: AbortSignal.timeout(20000) });
  if (!response.ok) throw new Error(`${repository}: GitHub API HTTP ${response.status}`);
  return response.json();
}

async function issuesFor(repository) {
  const issues = [];
  for (let page = 1; page <= 10; page += 1) {
    const batch = await fetchPage(repository, page);
    issues.push(...batch);
    if (batch.length < 100) break;
  }
  return issues.filter((issue) => !issue.pull_request && issue.created_at?.startsWith("2026-"));
}

function isFailure(issue) {
  const labels = (issue.labels ?? []).map((label) => typeof label === "string" ? label : label.name ?? "").join(" ");
  const text = `${issue.title ?? ""}\n${issue.body ?? ""}`;
  const explicitlyBug = /bug|regression/i.test(labels);
  if (!explicitlyBug && featurePattern.test(labels)) return false;
  return explicitlyBug || failurePattern.test(text);
}

function firstMatch(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return match[1] ?? match[0];
  }
  return "unknown";
}

function errorSignature(title, body) {
  const text = `${title}\n${body ?? ""}`;
  const line = text.split(/\r?\n/).map((value) => value.replace(/^\s*[-*>`#]+\s*/, "").trim()).find((value) =>
    /\b(?:[A-Za-z0-9_.]+Exception|NullReferenceException|CS\d{4}|panic|fatal error|error:)\b/i.test(value)
  );
  return line && line.length <= 240 ? line : "unknown";
}

function recordFor(source, issue) {
  const body = issue.body ?? "";
  const unityVersion = firstMatch(body, [/(?:Unity(?:\s+version)?\s*[:=]?\s*)(20\d{2}\.\d+\.\d+[a-z]\d+)/i, /\b(20\d{2}\.\d+\.\d+[a-z]\d+)\b/i]);
  const sdkVersion = firstMatch(body, [/(?:VRCSDK|VRChat SDK)[^0-9]{0,24}(3\.\d+\.\d+(?:[-.a-z0-9]+)?)/i]);
  return {
    id: `2026-github-${source.repository.toLowerCase().replace(/[^a-z0-9]+/g, "-")}-${issue.number}`,
    title: issue.title,
    date: issue.created_at.slice(0, 10),
    date_kind: "published",
    source_urls: [issue.html_url],
    source_type: "github_issue",
    source_family: source.source_family,
    component: source.source_family,
    unity_version: unityVersion,
    vrcsdk_version: sdkVersion,
    packages: [{ name: source.source_family, version: "unknown" }],
    platforms: ["unknown"],
    stage: "unknown",
    error_signature: errorSignature(issue.title, body),
    symptom: issue.title,
    trigger: "unknown",
    root_cause: "unknown",
    solution: "unknown",
    workaround: "unknown",
    status: "unknown",
    tags: ["github", "issue", source.id]
  };
}

async function collect() {
  const existingUrls = new Set(existingRecords().flatMap((record) => record.source_urls));
  const records = [];
  const report = [];
  for (const source of issueSources) {
    const issues = await issuesFor(source.repository);
    const failures = issues.filter(isFailure);
    const selected = failures.filter((issue) => !existingUrls.has(issue.html_url));
    records.push(...selected.map((issue) => recordFor(source, issue)));
    report.push({ source: source.id, checked: issues.length, candidates: failures.length, new_records: selected.length });
  }
  records.sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
  return { records, report };
}

const { records, report } = await collect();
if (records.length < 30) throw new Error(`GitHub collector produced only ${records.length} new records; inspect coverage before accepting.`);

const serialized = `${JSON.stringify(records, null, 2)}\n`;
if (process.argv.includes("--check")) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (current !== serialized) {
    console.error(JSON.stringify(report, null, 2));
    console.error("GitHub failure records are stale. Run: node scripts/collect-github-failures.mjs");
    process.exit(1);
  }
} else {
  fs.writeFileSync(outputPath, serialized);
}
console.log(JSON.stringify({ records: records.length, sources: report }, null, 2));
