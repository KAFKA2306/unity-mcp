import fs from "node:fs";
import { loadRawRecords, loadSources, rawRecordFiles, readFailureJson, sourceRegistryFiles } from "./failure-files.mjs";

const excludedNonVrchatFamilies = new Set(["MCP for Unity", "Unity Release Notes"]);

function countBy(values) {
  const counts = {};
  for (const value of values.filter(Boolean)) counts[value] = (counts[value] ?? 0) + 1;
  return Object.fromEntries(Object.entries(counts).sort(([a], [b]) => a.localeCompare(b)));
}

const rawFiles = rawRecordFiles();
const sourceFiles = sourceRegistryFiles();
const raw = loadRawRecords(rawFiles);
const current = readFailureJson("current-2026.json");
const sources = loadSources(sourceFiles);
const scope = readFailureJson("scope.json");
const currentUnityVersions = new Set(scope.current_unity_versions ?? []);

const sourceReportArg = process.argv.indexOf("--source-report");
let sourceReport = null;
if (sourceReportArg >= 0 && process.argv[sourceReportArg + 1] && fs.existsSync(process.argv[sourceReportArg + 1])) {
  sourceReport = JSON.parse(fs.readFileSync(process.argv[sourceReportArg + 1], "utf8"));
}

const metrics = {
  raw_records: raw.length,
  current_canonical_records: current.length,
  excluded_or_unverified_records: raw.length - current.length,
  raw_files: rawFiles,
  registered_sources: sources.length,
  enabled_sources: sources.filter((source) => source.enabled).length,
  source_languages: countBy(sources.flatMap((source) => source.languages ?? [])),
  source_checks: sourceReport ? {
    checked: sourceReport.report?.length ?? 0,
    success: sourceReport.success ?? 0,
    blocked: sourceReport.blocked ?? 0,
    failed: sourceReport.failed ?? 0
  } : null,
  raw_source_families: countBy(raw.map((record) => record.source_family)),
  current: {
    software: countBy(current.map((record) => record.classification?.software)),
    component: countBy(current.map((record) => record.classification?.component)),
    phase: countBy(current.map((record) => record.classification?.phase)),
    failure_type: countBy(current.map((record) => record.classification?.failure_type)),
    host_os: countBy(current.flatMap((record) => (record.environment?.host_os ?? []).map((item) => item.name))),
    unity_versions: countBy(current.map((record) => record.environment?.unity_version)),
    source_domains: countBy(current.flatMap((record) => (record.evidence ?? []).map((item) => new URL(item.url).hostname.toLowerCase())))
  }
};

const problems = [];
if (!current.length) problems.push("current canonical corpus is empty");
if (raw.length < current.length) problems.push(`raw record count ${raw.length} is below current count ${current.length}`);
if (metrics.excluded_or_unverified_records !== raw.length - current.length) problems.push("excluded/unverified count invariant failed");
if (Object.keys(metrics.current.unity_versions).some((version) => !currentUnityVersions.has(version))) {
  problems.push("current corpus contains a Unity version outside scope.json");
}
const excludedRawFamilies = [...excludedNonVrchatFamilies].filter((family) => metrics.raw_source_families[family]);
if (excludedRawFamilies.length) problems.push(`non-VRChat source families returned to raw corpus: ${excludedRawFamilies.join(", ")}`);
const excludedRegisteredFamilies = [...excludedNonVrchatFamilies].filter((family) => sources.some((source) => source.source_family === family));
if (excludedRegisteredFamilies.length) problems.push(`non-VRChat source families returned to source registry: ${excludedRegisteredFamilies.join(", ")}`);
if (sourceReport && (sourceReport.failed ?? 0) > 0) problems.push(`${sourceReport.failed} source check(s) failed`);

if (process.env.GITHUB_STEP_SUMMARY) {
  fs.appendFileSync(process.env.GITHUB_STEP_SUMMARY, [
    "## Failure KB coverage",
    "",
    `- Raw 2026 records: **${metrics.raw_records}**`,
    `- Current canonical records: **${metrics.current_canonical_records}**`,
    `- Excluded or unverified raw records: **${metrics.excluded_or_unverified_records}**`,
    `- Registered / enabled sources: **${metrics.registered_sources} / ${metrics.enabled_sources}**`,
    `- Current Unity: **${Object.keys(metrics.current.unity_versions).join(", ")}**`,
    `- Current source domains: **${Object.keys(metrics.current.source_domains).join(", ")}**`,
    `- Raw source families: **${Object.entries(metrics.raw_source_families).map(([name, count]) => `${name} ${count}`).join(", ")}**`,
    ""
  ].join("\n"));
}

process.stdout.write(`${JSON.stringify({ ...metrics, problems }, null, 2)}\n`);
if (problems.length) process.exitCode = 1;
