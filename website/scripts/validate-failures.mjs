import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const schemaPath = path.join(websiteRoot, "data", "failures", "schema.json");
const recordsPath = path.join(websiteRoot, "data", "failures", "records-2026.json");
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const records = JSON.parse(fs.readFileSync(recordsPath, "utf8"));
const errors = [];

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

  if (rule.enum && !rule.enum.includes(value)) {
    errors.push(`${at}: invalid value ${JSON.stringify(value)}`);
  }

  if (typeof value === "string") {
    if ((rule.minLength ?? 0) > value.length || value.trim().length === 0) {
      errors.push(`${at}: empty strings are not allowed; use "unknown" when unknown`);
    }
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) {
      errors.push(`${at}: does not match ${rule.pattern}`);
    }
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
      if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) {
        errors.push(`${at}: invalid calendar date`);
      }
    }
  }

  if (Array.isArray(value)) {
    if ((rule.minItems ?? 0) > value.length) errors.push(`${at}: requires at least ${rule.minItems} item(s)`);
    if (rule.items) value.forEach((item, i) => validate(item, rule.items, `${at}[${i}]`));
  }

  if (value !== null && typeof value === "object" && !Array.isArray(value)) {
    for (const key of rule.required ?? []) {
      if (!(key in value)) errors.push(`${at}: missing required field ${key}`);
    }
    if (rule.additionalProperties === false) {
      for (const key of Object.keys(value)) {
        if (!(key in (rule.properties ?? {}))) errors.push(`${at}: unexpected field ${key}`);
      }
    }
    for (const [key, childRule] of Object.entries(rule.properties ?? {})) {
      if (key in value) validate(value[key], childRule, `${at}.${key}`);
    }
  }
}

if (!Array.isArray(records)) {
  errors.push("records-2026.json: expected a JSON array");
} else {
  if (records.length < 10) errors.push(`records-2026.json: expected at least 10 seed records, got ${records.length}`);
  records.forEach((record, i) => validate(record, schema, `records[${i}]`));

  const ids = new Set();
  for (const record of records) {
    if (ids.has(record.id)) errors.push(`duplicate id: ${record.id}`);
    ids.add(record.id);
  }
}

if (errors.length) {
  console.error(`FailureRecord validation failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`FailureRecord validation passed: ${records.length} record(s), ${new Set(records.map((r) => r.source_family)).size} source families.`);
