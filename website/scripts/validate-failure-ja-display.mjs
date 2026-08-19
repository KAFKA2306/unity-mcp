import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const here = path.dirname(fileURLToPath(import.meta.url));
const dataDir = path.resolve(here, "../data/failures");
const fields = ["title", "symptom", "trigger", "root_cause", "solution", "workaround"];
const japanese = /[\u3040-\u30ff\u3400-\u9fff]/u;

const translated = [
  ["records-2026.json", "display-ja-seed-2026.json"],
  ["records-feedback-2026.json", "display-ja-feedback-2026.json"],
  ["records-github-2026.json", "display-ja-github-2026.json"],
  ["records-modular-avatar-2026.json", "display-ja-modular-avatar-2026.json"],
  ["records-vrcfury-2026.json", "display-ja-vrcfury-2026.json"],
  ["records-vrchat-official-2026.json", "display-ja-vrchat-official-2026.json"],
  ["records-web-2026.json", "display-ja-web-2026.json"],
];
const translatedFiles = new Set(translated.map(([recordsFile]) => recordsFile));

function readJson(name) {
  return JSON.parse(fs.readFileSync(path.join(dataDir, name), "utf8"));
}

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

for (const [recordsFile, displayFile] of translated) {
  const records = readJson(recordsFile);
  const display = readJson(displayFile);
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

const nativeJapaneseFiles = fs.readdirSync(dataDir)
  .filter((name) => /^records(?:-[a-z0-9-]+)?-2026\.json$/.test(name))
  .filter((name) => !translatedFiles.has(name))
  .sort();

for (const recordsFile of nativeJapaneseFiles) {
  for (const record of readJson(recordsFile)) {
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
