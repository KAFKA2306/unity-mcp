import fs from "node:fs";
import path from "node:path";
import { classifyFailure } from "./failure-classification.mjs";
import { dataRoot, loadRawRecords, rawRecordFiles, readFailureJson, staticFailureRoot as staticRoot } from "./failure-files.mjs";

const scope = readFailureJson("scope.json");
const currentUnityVersions = new Set(scope.current_unity_versions ?? []);
const legacyUnityVersions = new Set(scope.legacy_unity_versions ?? []);
const recordFiles = rawRecordFiles();
const rawRecords = loadRawRecords(recordFiles);

function known(value) {
  return typeof value === "string" && value.trim() !== "" && value !== "unknown";
}

function publisher(record) {
  return {
    "VRChat SDK releases": "VRChat",
    "Unity Release Notes": "Unity"
  }[record.source_family] ?? record.source_family;
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
  const result = {
    packages: (record.packages ?? []).map((item) => ({
      name: item.name,
      ...(known(item.version) ? { version: item.version } : {})
    }))
  };
  if (known(record.unity_version)) result.unity_version = record.unity_version;
  if (known(record.vrcsdk_version)) result.vrchat_sdk_version = record.vrcsdk_version;

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
  if (hosts.length) result.host_os = hosts;
  return result;
}

function classification(record, strict = false) {
  const result = {};
  for (const [key, value] of Object.entries(classifyFailure(record))) {
    if (value !== "unknown") result[key] = value;
  }
  if (strict && !result.software) throw new Error(`${record.id}: software could not be classified without inventing a value`);
  return result;
}

function remedies(record) {
  const values = [];
  if (known(record.solution)) values.push({ type: "fix", description: record.solution });
  if (known(record.workaround)) values.push({ type: "workaround", description: record.workaround });
  return values;
}

function commonRecord(record, strictClassification = false) {
  const item = {
    id: record.id,
    title: record.title,
    date: record.date,
    date_kind: record.date_kind,
    evidence: evidence(record),
    environment: environment(record),
    classification: classification(record, strictClassification)
  };
  if (known(record.symptom)) item.symptom = record.symptom;
  if (known(record.error_signature)) item.error_signature = record.error_signature;
  if (known(record.trigger)) item.trigger = record.trigger;
  if (known(record.root_cause)) item.root_cause = record.root_cause;
  const migratedRemedies = remedies(record);
  if (migratedRemedies.length) item.remedies = migratedRemedies;
  return item;
}

export function migrateRecord(record) {
  if (!currentUnityVersions.has(record.unity_version)) return null;
  const migrated = commonRecord(record, true);
  migrated.environment.unity_version = record.unity_version;
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

export function browseRecord(record) {
  const item = commonRecord(record, false);
  const unityVersion = record.unity_version;
  item.verification = {
    current_scope: currentUnityVersions.has(unityVersion),
    unity_version_status: currentUnityVersions.has(unityVersion)
      ? "current"
      : legacyUnityVersions.has(unityVersion)
        ? "legacy"
        : known(unityVersion)
          ? "other"
          : "unverified"
  };
  return item;
}

export function browseRecords(records) {
  const ids = new Set();
  const browsable = records.map((record) => {
    if (ids.has(record.id)) throw new Error(`duplicate raw record id: ${record.id}`);
    ids.add(record.id);
    return browseRecord(record);
  });
  return browsable.sort((a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id));
}

const current = migrateRecords(rawRecords);
const browsable = browseRecords(rawRecords);
const summary = {
  raw_records: rawRecords.length,
  browsable_records: browsable.length,
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
for (const record of browsable) assertNoUnknown(record, record.id);
if (browsable.length !== rawRecords.length) throw new Error(`browse/raw count invariant violated: ${browsable.length} != ${rawRecords.length}`);
if (rawRecords.length < current.length) throw new Error(`raw/current count invariant violated: ${rawRecords.length} < ${current.length}`);
if (summary.excluded_records !== rawRecords.length - current.length) throw new Error("excluded record count invariant violated");
if (!current.length) throw new Error("current canonical corpus must not be empty");
const browseIds = new Set(browsable.map((record) => record.id));
for (const record of current) if (!browseIds.has(record.id)) throw new Error(`${record.id}: current record missing from browse corpus`);

if (process.argv.includes("--write")) {
  fs.mkdirSync(staticRoot, { recursive: true });
  const currentContent = `${JSON.stringify(current, null, 2)}\n`;
  const browseContent = `${JSON.stringify(browsable, null, 2)}\n`;
  const summaryContent = `${JSON.stringify(summary, null, 2)}\n`;
  fs.writeFileSync(path.join(dataRoot, "current-2026.json"), currentContent);
  fs.writeFileSync(path.join(dataRoot, "browse-2026.json"), browseContent);
  fs.writeFileSync(path.join(staticRoot, "current-2026.json"), currentContent);
  fs.writeFileSync(path.join(staticRoot, "browse-2026.json"), browseContent);
  fs.writeFileSync(path.join(staticRoot, "migration-summary-2026.json"), summaryContent);
}

if (process.argv.includes("--json")) process.stdout.write(`${JSON.stringify({ summary, records: current, browsable }, null, 2)}\n`);
else console.log(JSON.stringify(summary, null, 2));
