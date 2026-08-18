import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { classifyFailure } from "./failure-classification.mjs";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(websiteRoot, "data", "failures");
const staticRoot = path.join(websiteRoot, "static", "data", "failures");
const scope = JSON.parse(fs.readFileSync(path.join(dataRoot, "scope.json"), "utf8"));
const currentUnityVersions = new Set(scope.current_unity_versions ?? []);
const recordFiles = fs.readdirSync(dataRoot)
  .filter((name) => /^records(?:-[a-z0-9-]+)?-2026\.json$/.test(name))
  .sort();
const rawRecords = recordFiles.flatMap((name) => JSON.parse(fs.readFileSync(path.join(dataRoot, name), "utf8")));

function known(value) {
  return typeof value === "string" && value.trim() !== "" && value !== "unknown";
}

function publisher(record) {
  const values = {
    "VRChat SDK releases": "VRChat",
    "Unity Release Notes": "Unity"
  };
  return values[record.source_family] ?? record.source_family;
}

function supports(record) {
  const values = ["title", "date", "environment", "symptom"];
  if (known(record.error_signature)) values.push("error_signature");
  if (known(record.trigger)) values.push("trigger");
  if (known(record.root_cause)) values.push("root_cause");
  if (known(record.solution) || known(record.workaround)) values.push("remedies");
  return values;
}

function evidence(record) {
  const seen = new Set();
  const items = [];
  for (const url of record.source_urls ?? []) {
    if (seen.has(url)) continue;
    seen.add(url);
    const item = {
      url,
      source_type: record.source_type,
      publisher: publisher(record),
      supports: supports(record)
    };
    if (record.date_kind === "published") item.published_at = record.date;
    items.push(item);
  }
  return items;
}

function hostOs(platform) {
  const value = platform.trim();
  let match = value.match(/^Windows(?:\s+(.+))?$/i);
  if (match) return { name: "Windows", ...(match[1] ? { version: match[1] } : {}) };
  match = value.match(/^macOS(?:\s+(.+))?$/i);
  if (match) return { name: "macOS", ...(match[1] ? { version: match[1] } : {}) };
  match = value.match(/^(?:Linux|Ubuntu|Xubuntu)(?:\s+(.+))?$/i);
  if (match) return { name: "Linux", ...(match[1] ? { version: match[1] } : {}) };
  return null;
}

function environment(record) {
  const packages = (record.packages ?? []).map((item) => ({
    name: item.name,
    ...(known(item.version) ? { version: item.version } : {})
  }));
  const hosts = [];
  const hostKeys = new Set();
  for (const value of record.platforms ?? []) {
    if (!known(value)) continue;
    const item = hostOs(value);
    if (!item) continue;
    const key = `${item.name}\u0000${item.version ?? ""}`;
    if (hostKeys.has(key)) continue;
    hostKeys.add(key);
    hosts.push(item);
  }
  return {
    unity_version: record.unity_version,
    ...(known(record.vrcsdk_version) ? { vrchat_sdk_version: record.vrcsdk_version } : {}),
    packages,
    ...(hosts.length ? { host_os: hosts } : {})
  };
}

function classification(record) {
  const values = classifyFailure(record);
  const result = {};
  for (const [key, value] of Object.entries(values)) if (value !== "unknown") result[key] = value;
  if (!result.software) throw new Error(`${record.id}: software could not be classified without inventing a value`);
  return result;
}

function remedies(record) {
  const values = [];
  if (known(record.solution)) values.push({ type: "fix", description: record.solution });
  if (known(record.workaround)) values.push({ type: "workaround", description: record.workaround });
  return values;
}

export function migrateRecord(record) {
  if (!currentUnityVersions.has(record.unity_version)) return null;
  const migrated = {
    id: record.id,
    title: record.title,
    date: record.date,
    date_kind: record.date_kind,
    evidence: evidence(record),
    environment: environment(record),
    classification: classification(record),
    symptom: record.symptom
  };
  if (known(record.error_signature)) migrated.error_signature = record.error_signature;
  if (known(record.trigger)) migrated.trigger = record.trigger;
  if (known(record.root_cause)) migrated.root_cause = record.root_cause;
  const migratedRemedies = remedies(record);
  if (migratedRemedies.length) migrated.remedies = migratedRemedies;
  return migrated;
}

export function migrateRecords(records) {
  const ids = new Set();
  const migrated = [];
  for (const record of records) {
    if (ids.has(record.id)) throw new Error(`duplicate raw record id: ${record.id}`);
    ids.add(record.id);
    const item = migrateRecord(record);
    if (item) migrated.push(item);
  }
  return migrated.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

const current = migrateRecords(rawRecords);
const summary = {
  raw_records: rawRecords.length,
  current_canonical_records: current.length,
  excluded_records: rawRecords.length - current.length,
  current_unity_versions: [...currentUnityVersions].sort(),
  raw_files: recordFiles
};

function assertNoUnknown(value, at = "record") {
  if (value === "unknown") throw new Error(`${at}: canonical sentinel \"unknown\" is forbidden`);
  if (Array.isArray(value)) value.forEach((item, index) => assertNoUnknown(item, `${at}[${index}]`));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) assertNoUnknown(child, `${at}.${key}`);
  }
}

for (const record of current) assertNoUnknown(record, record.id);
if (rawRecords.length !== 121) throw new Error(`expected 121 raw records during migration, got ${rawRecords.length}`);
if (current.length !== 8) throw new Error(`expected 8 verified current records during migration, got ${current.length}`);
if (summary.excluded_records !== 113) throw new Error(`expected 113 excluded records, got ${summary.excluded_records}`);

if (process.argv.includes("--write")) {
  fs.mkdirSync(staticRoot, { recursive: true });
  const content = `${JSON.stringify(current, null, 2)}\n`;
  const summaryContent = `${JSON.stringify(summary, null, 2)}\n`;
  fs.writeFileSync(path.join(dataRoot, "current-2026.json"), content);
  fs.writeFileSync(path.join(staticRoot, "current-2026.json"), content);
  fs.writeFileSync(path.join(staticRoot, "migration-summary-2026.json"), summaryContent);
}

if (process.argv.includes("--json")) process.stdout.write(`${JSON.stringify({ summary, records: current }, null, 2)}\n`);
else console.log(JSON.stringify(summary, null, 2));
