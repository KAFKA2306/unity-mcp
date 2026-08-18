import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(websiteRoot, "data", "failures");
const errors = [];

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(dataRoot, name), "utf8"));
}

const recordSchema = readJson("schema.json");
const scope = readJson("scope.json");
const recordFiles = fs.readdirSync(dataRoot)
  .filter((name) => /^records(?:-[a-z0-9-]+)?-2026\.json$/.test(name))
  .sort();
const records = recordFiles.flatMap((name) => readJson(name));
const sourceSchema = readJson("source-schema.json");
const sourceFiles = fs.readdirSync(dataRoot)
  .filter((name) => /^sources(?:-[a-z0-9-]+)?\.json$/.test(name))
  .sort();
const sources = sourceFiles.flatMap((name) => readJson(name));

const currentUnityVersions = new Set(scope.current_unity_versions ?? []);
const implicitCurrentFamilies = new Set(scope.current_vrchat_source_families_without_explicit_unity ?? []);

function isCurrentRecord(record) {
  if (currentUnityVersions.has(record.unity_version)) return true;
  if (record.unity_version !== "unknown") return false;
  return implicitCurrentFamilies.has(record.source_family);
}

function typeMatches(value, type) {
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === type;
}

function validate(value, rule, at) {
  if (rule.type && !typeMatches(value, rule.type)) {
    errors.push(`${at}: expected ${rule.type}`);
    return;
  }
  if (rule.enum && !rule.enum.includes(value)) errors.push(`${at}: invalid value ${JSON.stringify(value)}`);

  if (typeof value === "string") {
    if ((rule.minLength ?? 0) > value.length || value.trim().length === 0) {
      errors.push(`${at}: empty strings are not allowed; use "unknown" when unknown`);
    }
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) errors.push(`${at}: does not match ${rule.pattern}`);
    if (rule.format === "uri") {
      try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("unsupported protocol");
      } catch {
        errors.push(`${at}: invalid http(s) URI`);
      }
    }
    if (rule.format === "date") {
      const parsed = new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) errors.push(`${at}: invalid calendar date`);
    }
  }

  if (Array.isArray(value)) {
    if ((rule.minItems ?? 0) > value.length) errors.push(`${at}: requires at least ${rule.minItems} item(s)`);
    if (rule.items) value.forEach((item, i) => validate(item, rule.items, `${at}[${i}]`));
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const key of rule.required ?? []) if (!(key in value)) errors.push(`${at}: missing required field ${key}`);
    if (rule.additionalProperties === false) {
      for (const key of Object.keys(value)) if (!(key in (rule.properties ?? {}))) errors.push(`${at}: unexpected field ${key}`);
    }
    for (const [key, childRule] of Object.entries(rule.properties ?? {})) {
      if (key in value) validate(value[key], childRule, `${at}.${key}`);
    }
  }
}

function validateCollection(items, schema, label, minimum) {
  if (!Array.isArray(items)) {
    errors.push(`${label}: expected a JSON array`);
    return;
  }
  if (items.length < minimum) errors.push(`${label}: expected at least ${minimum} entries, got ${items.length}`);
  items.forEach((item, i) => validate(item, schema, `${label}[${i}]`));
  const ids = new Set();
  for (const item of items) {
    if (ids.has(item.id)) errors.push(`${label}: duplicate id ${item.id}`);
    ids.add(item.id);
  }
}

validateCollection(records, recordSchema, "records", 10);
validateCollection(sources, sourceSchema, "sources", 20);

if (currentUnityVersions.size !== 1 || !currentUnityVersions.has("2022.3.22f1")) {
  errors.push(`scope: current Unity must be exactly 2022.3.22f1, got ${JSON.stringify([...currentUnityVersions])}`);
}
if ((scope.legacy_unity_versions ?? []).some((version) => currentUnityVersions.has(version))) {
  errors.push("scope: legacy Unity version must not be included in current Unity versions");
}
if (!isCurrentRecord({ unity_version: "2022.3.22f1", source_family: "test" })) {
  errors.push("scope: supported Unity version was rejected");
}
for (const unsupported of ["2019.4.31f1", "2022.3.8f1", "6000.0.0f1"]) {
  if (isCurrentRecord({ unity_version: unsupported, source_family: "VRChat SDK releases" })) {
    errors.push(`scope: unsupported Unity version accepted: ${unsupported}`);
  }
}
if (!isCurrentRecord({ unity_version: "unknown", source_family: "VRChat SDK releases" })) {
  errors.push("scope: VRChat official record without explicit Unity version was rejected");
}
if (isCurrentRecord({ unity_version: "unknown", source_family: "MCP for Unity" })) {
  errors.push("scope: unrelated record without explicit Unity version was accepted");
}

const currentRecords = records.filter(isCurrentRecord);
const excludedRecords = records.filter((record) => !isCurrentRecord(record));
if (currentRecords.length < 10) errors.push(`current records: expected at least 10 entries, got ${currentRecords.length}`);

if (Array.isArray(sources)) {
  const families = new Set(sources.map((source) => source.source_family));
  if (families.size < 6) errors.push(`sources: expected at least 6 source families, got ${families.size}`);
  const canonicalUrls = new Set();
  for (const source of sources) {
    if (canonicalUrls.has(source.canonical_url)) errors.push(`sources: duplicate canonical URL ${source.canonical_url}`);
    canonicalUrls.add(source.canonical_url);
  }
}

if (errors.length) {
  console.error(`Failure KB validation failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(
  `Failure KB validation passed: ${currentRecords.length} current record(s), ${excludedRecords.length} excluded by Unity scope, ` +
  `${records.length} raw record(s) in ${recordFiles.length} file(s), ` +
  `${sources.length} source endpoint(s) in ${sourceFiles.length} file(s), ` +
  `${new Set(sources.map((source) => source.source_family)).size} source families.`
);

async function checkUrl(source) {
  try {
    const response = await fetch(source.fetch_url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(15000),
      headers: { "user-agent": "unity-mcp-failure-kb-link-check/1.0" }
    });
    await response.body?.cancel();
    if (!response.ok) return `${source.id}: HTTP ${response.status} ${source.fetch_url}`;
    return null;
  } catch (error) {
    return `${source.id}: ${error.name ?? "Error"} ${source.fetch_url}`;
  }
}

async function checkSourceLinks() {
  const pending = sources.filter((source) => source.enabled);
  const failures = [];
  const concurrency = 4;
  for (let i = 0; i < pending.length; i += concurrency) {
    const results = await Promise.all(pending.slice(i, i + concurrency).map(checkUrl));
    failures.push(...results.filter(Boolean));
  }
  if (failures.length) {
    console.error(`Source link check failed (${failures.length}):`);
    for (const failure of failures) console.error(`- ${failure}`);
    process.exit(1);
  }
  console.log(`Source link check passed: ${pending.length} enabled endpoint(s).`);
}

if (process.argv.includes("--check-source-links")) await checkSourceLinks();
