import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(websiteRoot, "data", "failures");
const schema = JSON.parse(fs.readFileSync(path.join(dataRoot, "canonical-schema.json"), "utf8"));
const taxonomy = JSON.parse(fs.readFileSync(path.join(dataRoot, "taxonomy.json"), "utf8"));
const records = JSON.parse(fs.readFileSync(path.join(dataRoot, "current-2026.json"), "utf8"));
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
  if (rule.const !== undefined && value !== rule.const) errors.push(`${at}: expected ${JSON.stringify(rule.const)}`);
  if (rule.enum && !rule.enum.includes(value)) errors.push(`${at}: invalid value ${JSON.stringify(value)}`);
  if (typeof value === "string") {
    if ((rule.minLength ?? 0) > value.length || value.trim().length === 0) errors.push(`${at}: empty string`);
    if (rule.pattern && !new RegExp(rule.pattern).test(value)) errors.push(`${at}: does not match ${rule.pattern}`);
    if (rule.format === "uri") {
      try {
        const url = new URL(value);
        if (!["http:", "https:"].includes(url.protocol)) throw new Error("protocol");
      } catch {
        errors.push(`${at}: invalid http(s) URI`);
      }
    }
    if (rule.format === "date") {
      const parsed = new Date(`${value}T00:00:00Z`);
      if (Number.isNaN(parsed.valueOf()) || parsed.toISOString().slice(0, 10) !== value) errors.push(`${at}: invalid date`);
    }
  }
  if (Array.isArray(value)) {
    if ((rule.minItems ?? 0) > value.length) errors.push(`${at}: requires at least ${rule.minItems} item(s)`);
    if (rule.items) value.forEach((item, index) => validate(item, rule.items, `${at}[${index}]`));
  }
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of rule.required ?? []) if (!(key in value)) errors.push(`${at}: missing ${key}`);
    if (rule.additionalProperties === false) {
      for (const key of Object.keys(value)) if (!(key in (rule.properties ?? {}))) errors.push(`${at}: unexpected ${key}`);
    }
    for (const [key, childRule] of Object.entries(rule.properties ?? {})) {
      if (key in value) validate(value[key], childRule, `${at}.${key}`);
    }
  }
}

function findUnknown(value, at, found) {
  if (value === "unknown") found.push(at);
  else if (Array.isArray(value)) value.forEach((item, index) => findUnknown(item, `${at}[${index}]`, found));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) findUnknown(child, `${at}.${key}`, found);
  }
}

if (!Array.isArray(records)) errors.push("current-2026.json: expected array");
else {
  if (records.length !== 8) errors.push(`current-2026.json: expected 8 records, got ${records.length}`);
  const ids = new Set();
  for (const [index, record] of records.entries()) {
    const at = `records[${index}]`;
    validate(record, schema, at);
    if (ids.has(record.id)) errors.push(`${at}: duplicate id ${record.id}`);
    ids.add(record.id);

    const unknowns = [];
    findUnknown(record, at, unknowns);
    errors.push(...unknowns.map((value) => `${value}: forbidden sentinel \"unknown\"`));

    for (const [axis, value] of Object.entries(record.classification ?? {})) {
      if (!taxonomy.axes[axis]?.includes(value)) errors.push(`${at}.classification.${axis}: not in taxonomy`);
    }

    const evidenceUrls = new Set();
    const supports = new Set();
    for (const evidence of record.evidence ?? []) {
      if (evidenceUrls.has(evidence.url)) errors.push(`${at}: duplicate evidence URL ${evidence.url}`);
      evidenceUrls.add(evidence.url);
      for (const claim of evidence.supports ?? []) supports.add(claim);
    }
    for (const claim of ["title", "date", "environment", "symptom"]) {
      if (!supports.has(claim)) errors.push(`${at}: no evidence supports ${claim}`);
    }
    for (const optionalClaim of ["error_signature", "trigger", "root_cause", "remedies"]) {
      if (optionalClaim in record && !supports.has(optionalClaim)) errors.push(`${at}: no evidence supports ${optionalClaim}`);
    }
  }
}

if (errors.length) {
  console.error(`Current failure validation failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Current failure validation passed: ${records.length} canonical record(s), 0 unsupported Unity versions, 0 unknown sentinels, 0 duplicate ids/evidence URLs.`);
