import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const repoRoot = path.resolve(root, "..");
const dataRoot = path.join(root, "data", "failures");

function readJson(file) { return JSON.parse(fs.readFileSync(file, "utf8")); }

const recordFiles = fs.readdirSync(dataRoot).filter((name) => /^records(?:-[a-z0-9-]+)?-2026\.json$/.test(name)).sort();
const sourceFiles = fs.readdirSync(dataRoot).filter((name) => /^sources(?:-[a-z0-9-]+)?\.json$/.test(name)).sort();
const records = recordFiles.flatMap((name) => readJson(path.join(dataRoot, name)));
const sources = sourceFiles.flatMap((name) => readJson(path.join(dataRoot, name)));
const japaneseWebFile = path.join(dataRoot, "records-web-ja-2026.json");
const japaneseWebRecords = fs.existsSync(japaneseWebFile) ? readJson(japaneseWebFile) : [];
const enabledJapaneseSources = sources.filter((source) => source.enabled && (source.languages ?? []).includes("ja"));

function countBy(values) {
  const counts = {};
  for (const value of values) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

function normalizeSignature(value = "") {
  return value.toLowerCase()
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/gi, "<guid>")
    .replace(/\b0x[a-f0-9]+\b/gi, "<hex>")
    .replace(/\bline\s+\d+\b/gi, "line <n>")
    .replace(/\b\d{2,}\b/g, "<n>")
    .replace(/[a-z]:\\[^\n:]+/gi, "<path>")
    .replace(/\s+/g, " ").trim();
}

function missing(record) {
  const versionMissing = record.unity_version === "unknown" && record.vrcsdk_version === "unknown" &&
    (record.packages ?? []).every((item) => item.version === "unknown");
  return {
    version: versionMissing,
    error: record.error_signature === "unknown",
    cause: record.root_cause === "unknown",
    solution: record.solution === "unknown" && record.workaround === "unknown",
  };
}

const fingerprint = (record) => JSON.stringify(record);
function baselineRecords() {
  const byId = new Map();
  for (const name of recordFiles) {
    const relative = path.posix.join("website", "data", "failures", name);
    try {
      const text = execFileSync("git", ["show", `HEAD:${relative}`], { cwd: repoRoot, encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] });
      for (const record of JSON.parse(text)) byId.set(record.id, fingerprint(record));
    } catch {
      // A file created after checkout has no HEAD baseline and is counted as new.
    }
  }
  return byId;
}

const baseline = baselineRecords();
let added = 0, updated = 0, unchanged = 0;
for (const record of records) {
  if (!baseline.has(record.id)) added += 1;
  else if (baseline.get(record.id) !== fingerprint(record)) updated += 1;
  else unchanged += 1;
}

const signatures = new Map();
for (const record of records) {
  if (record.error_signature === "unknown") continue;
  const key = `${record.component}::${normalizeSignature(record.error_signature)}`;
  const list = signatures.get(key) ?? [];
  list.push(record.id);
  signatures.set(key, list);
}
const duplicateGroups = [...signatures.values()].filter((ids) => ids.length > 1);

const sourceReportArg = process.argv.indexOf("--source-report");
let sourceReport = null;
if (sourceReportArg >= 0 && process.argv[sourceReportArg + 1] && fs.existsSync(process.argv[sourceReportArg + 1])) {
  sourceReport = readJson(process.argv[sourceReportArg + 1]);
}

const sourceLanguages = countBy(sources.flatMap((source) => source.languages ?? []));
const metrics = {
  generated_at: new Date().toISOString(),
  registered_sources: sources.length,
  enabled_sources: sources.filter((source) => source.enabled).length,
  enabled_japanese_sources: enabledJapaneseSources.length,
  checked_sources: sourceReport?.report?.length ?? null,
  source_status: sourceReport ? { success: sourceReport.success ?? 0, blocked: sourceReport.blocked ?? 0, failed: sourceReport.failed ?? 0 } : null,
  source_languages: sourceLanguages,
  canonical_records: records.length,
  japanese_web_records: japaneseWebRecords.length,
  changes: { new: added, updated, unchanged },
  source_families: countBy(records.map((record) => record.source_family)),
  components: countBy(records.map((record) => record.component)),
  stages: countBy(records.map((record) => record.stage)),
  statuses: countBy(records.map((record) => record.status)),
  missing: {
    version: records.filter((record) => missing(record).version).length,
    error: records.filter((record) => missing(record).error).length,
    cause: records.filter((record) => missing(record).cause).length,
    solution: records.filter((record) => missing(record).solution).length,
  },
  duplicate_signature_groups: duplicateGroups.length,
  duplicate_signature_records: duplicateGroups.reduce((sum, ids) => sum + ids.length, 0),
};

const families = Object.keys(metrics.source_families).length;
const problems = [];
if (records.length < 100) problems.push(`canonical record count ${records.length} is below 100`);
if (families < 6) problems.push(`source family count ${families} is below 6`);
if (japaneseWebRecords.length < 7) problems.push(`Japanese web record count ${japaneseWebRecords.length} is below 7`);
if (enabledJapaneseSources.length < 3) problems.push(`enabled Japanese source count ${enabledJapaneseSources.length} is below 3`);
if (sourceReport && (sourceReport.failed ?? 0) > 0) problems.push(`${sourceReport.failed} source check(s) failed`);

if (process.env.GITHUB_STEP_SUMMARY) {
  const source = metrics.source_status ? `${metrics.source_status.success} success / ${metrics.source_status.blocked} blocked / ${metrics.source_status.failed} failed` : "not run";
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
    "## Failure KB coverage", "",
    `- Canonical 2026 records: **${records.length}**`,
    `- Japanese 2026 web records: **${japaneseWebRecords.length}**`,
    `- Source families represented: **${families}**`,
    `- Registered / enabled sources: **${metrics.registered_sources} / ${metrics.enabled_sources}**`,
    `- Enabled Japanese sources: **${enabledJapaneseSources.length}**`,
    `- Source languages: **${Object.entries(sourceLanguages).map(([language, count]) => `${language} ${count}`).join(" / ")}**`,
    `- Source checks: **${source}**`,
    `- Record changes: **${added} new / ${updated} updated / ${unchanged} unchanged**`,
    `- Missing version / error / cause / solution: **${metrics.missing.version} / ${metrics.missing.error} / ${metrics.missing.cause} / ${metrics.missing.solution}**`,
    `- Exact normalized duplicate groups: **${metrics.duplicate_signature_groups}**`, ""
  ].join("\n"));
}

process.stdout.write(`${JSON.stringify({ ...metrics, problems }, null, 2)}\n`);
if (problems.length) process.exitCode = 1;
