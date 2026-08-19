import fs from "node:fs";
import { dataRoot, rawRecordFiles, readFailureJson } from "./failure-files.mjs";

const fields = ["title", "symptom", "trigger", "root_cause", "solution", "workaround"];
const japanese = /[\u3040-\u30ff\u3400-\u9fff]/u;
const displayPattern = /^display-ja-([a-z0-9-]+)-2026\.json$/;

function needsTranslation(value) {
  return typeof value === "string" && value.length > 0 && value !== "unknown" && !japanese.test(value);
}

function isJapaneseRecord(record) {
  const tags = new Set(record.tags ?? []);
  return tags.has("ja") || tags.has("日本語");
}

const failures = [];
let checkedRecords = 0;
let checkedFields = 0;

const recordFiles = rawRecordFiles();
const recordSet = new Set(recordFiles);
const displayFiles = fs.readdirSync(dataRoot)
  .filter((name) => displayPattern.test(name))
  .sort();

const translated = [];
for (const displayFile of displayFiles) {
  const family = displayFile.match(displayPattern)[1];
  const recordsFile = `records-${family}-2026.json`;
  if (!recordSet.has(recordsFile)) {
    failures.push(`${displayFile}: matching source file not found: ${recordsFile}`);
    continue;
  }
  translated.push([recordsFile, displayFile]);
}
const translatedFiles = new Set(translated.map(([recordsFile]) => recordsFile));

for (const [recordsFile, displayFile] of translated) {
  const records = readFailureJson(recordsFile);
  const display = readFailureJson(displayFile);
  const ids = new Set(records.map((record) => record.id));

  for (const id of Object.keys(display)) {
    if (!ids.has(id)) failures.push(`${displayFile}: source record not found: ${id}`);
  }

  for (const record of records) {
    checkedRecords += 1;
    const overlay = display[record.id] ?? {};
    for (const field of fields) {
      const source = record[field];
      if (!needsTranslation(source)) continue;
      checkedFields += 1;
      const value = overlay[field];
      if (typeof value !== "string" || !japanese.test(value)) {
        failures.push(`${recordsFile}: ${record.id}.${field} has no Japanese display text`);
      }
    }
  }
}

for (const recordsFile of recordFiles.filter((name) => !translatedFiles.has(name))) {
  for (const record of readFailureJson(recordsFile)) {
    if (!isJapaneseRecord(record)) continue;
    checkedRecords += 1;
    for (const field of fields) {
      const value = record[field];
      if (typeof value !== "string" || value.length === 0 || value === "unknown") continue;
      checkedFields += 1;
      if (!japanese.test(value)) {
        failures.push(`${recordsFile}: ${record.id}.${field} is not Japanese`);
      }
    }
  }
}

if (failures.length) {
  console.error("Japanese Failure KB display validation failed:");
  for (const failure of failures) console.error(`- ${failure}`);
  process.exit(1);
}

console.log(`Japanese Failure KB display validation passed: ${checkedRecords} records, ${checkedFields} text fields.`);
