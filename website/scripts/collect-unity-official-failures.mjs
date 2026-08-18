import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(root, "data", "failures");
const sources = JSON.parse(fs.readFileSync(path.join(dataRoot, "sources-unity.json"), "utf8"));
const rawRecords = JSON.parse(fs.readFileSync(path.join(dataRoot, "records-unity-official-2026.json"), "utf8"));
const scope = JSON.parse(fs.readFileSync(path.join(dataRoot, "scope.json"), "utf8"));
const currentUnity = new Set(scope.current_unity_versions ?? []);

function issueIds(record) {
  return (record.tags ?? []).filter((tag) => /^uum-\d+$/i.test(tag)).map((tag) => tag.toUpperCase());
}

function assertRawArchive() {
  if (rawRecords.length < 10) throw new Error(`Unity raw archive below 10: ${rawRecords.length}`);
  const ids = new Set();
  for (const record of rawRecords) {
    if (!record.date.startsWith("2026-") || record.date_kind !== "published") {
      throw new Error(`${record.id}: Unity release evidence must use a 2026 published date`);
    }
    if (record.source_family !== "Unity Release Notes" || record.source_type !== "official_release") {
      throw new Error(`${record.id}: invalid Unity raw provenance`);
    }
    if (!record.source_urls.every((url) => url.startsWith("https://unity.com/releases/editor/whats-new/"))) {
      throw new Error(`${record.id}: non-Unity release URL`);
    }
    for (const id of issueIds(record)) {
      if (ids.has(id)) throw new Error(`duplicate Unity UUM id ${id}`);
      ids.add(id);
    }
  }
  if (ids.size !== rawRecords.length) throw new Error(`every Unity raw record must have one unique UUM tag; got ${ids.size}/${rawRecords.length}`);
  return ids;
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
    headers: { "user-agent": "unity-mcp-failure-kb-unity-raw-audit/1.0" }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.text();
}

const rawIds = assertRawArchive();
const currentScopeRecords = rawRecords.filter((record) => currentUnity.has(record.unity_version));
if (!process.argv.includes("--live")) {
  console.log(JSON.stringify({
    raw_records: rawRecords.length,
    current_scope_records: currentScopeRecords.length,
    sources: sources.length,
    uum_ids: rawIds.size
  }, null, 2));
  process.exit(0);
}

const report = [];
for (const source of sources.filter((source) => source.enabled)) {
  try {
    const html = await fetchText(source.fetch_url);
    const discovered = [...new Set((html.match(/UUM-\d+/gi) ?? []).map((id) => id.toUpperCase()))].sort();
    const expected = rawRecords
      .filter((record) => record.source_urls.includes(source.canonical_url))
      .flatMap(issueIds)
      .sort();
    const missing = expected.filter((id) => !discovered.includes(id));
    report.push({ source: source.id, status: missing.length ? "parse_failed" : "success", discovered_uum_ids: discovered.length, raw_uum_ids: expected.length, missing });
  } catch (error) {
    report.push({ source: source.id, status: "failed", error: String(error.message ?? error) });
  }
}

const result = {
  raw_records: rawRecords.length,
  current_scope_records: currentScopeRecords.length,
  checked_sources: report.length,
  success: report.filter((item) => item.status === "success").length,
  failed: report.filter((item) => item.status !== "success").length,
  report
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.failed) process.exit(1);
