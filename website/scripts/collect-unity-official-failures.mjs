import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(root, "data", "failures");
const sources = JSON.parse(fs.readFileSync(path.join(dataRoot, "sources-unity.json"), "utf8"));
const records = JSON.parse(fs.readFileSync(path.join(dataRoot, "records-unity-official-2026.json"), "utf8"));

function issueIds(record) {
  return (record.tags ?? []).filter((tag) => /^uum-\d+$/i.test(tag)).map((tag) => tag.toUpperCase());
}

function assertStatic() {
  if (records.length < 10) throw new Error(`Unity official corpus below 10: ${records.length}`);
  const ids = new Set();
  for (const record of records) {
    if (!record.date.startsWith("2026-") || record.date_kind !== "published") {
      throw new Error(`${record.id}: Unity release evidence must use a 2026 published date`);
    }
    if (record.source_family !== "Unity Release Notes" || record.source_type !== "official_release") {
      throw new Error(`${record.id}: invalid Unity official provenance`);
    }
    if (!record.source_urls.every((url) => url.startsWith("https://unity.com/releases/editor/whats-new/"))) {
      throw new Error(`${record.id}: non-Unity release URL`);
    }
    for (const id of issueIds(record)) {
      if (ids.has(id)) throw new Error(`duplicate Unity UUM id ${id}`);
      ids.add(id);
    }
  }
  if (ids.size !== records.length) throw new Error(`every Unity record must have exactly one unique UUM tag; got ${ids.size}/${records.length}`);
  return ids;
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
    headers: { "user-agent": "unity-mcp-failure-kb-unity-release-check/1.0" }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.text();
}

const canonicalIds = assertStatic();
if (!process.argv.includes("--live")) {
  console.log(JSON.stringify({ canonical: records.length, sources: sources.length, uum_ids: canonicalIds.size }, null, 2));
  process.exit(0);
}

const report = [];
for (const source of sources.filter((source) => source.enabled)) {
  try {
    const html = await fetchText(source.fetch_url);
    const discovered = [...new Set((html.match(/UUM-\d+/gi) ?? []).map((id) => id.toUpperCase()))].sort();
    const expected = records
      .filter((record) => record.source_urls.includes(source.canonical_url))
      .flatMap(issueIds)
      .sort();
    const missing = expected.filter((id) => !discovered.includes(id));
    report.push({
      source: source.id,
      status: missing.length ? "parse_failed" : "success",
      discovered_uum_ids: discovered.length,
      canonical_uum_ids: expected.length,
      missing
    });
  } catch (error) {
    report.push({ source: source.id, status: "failed", error: String(error.message ?? error) });
  }
}

const result = {
  canonical: records.length,
  checked_sources: report.length,
  success: report.filter((item) => item.status === "success").length,
  failed: report.filter((item) => item.status !== "success").length,
  report
};
process.stdout.write(`${JSON.stringify(result, null, 2)}\n`);
if (result.failed) process.exit(1);
