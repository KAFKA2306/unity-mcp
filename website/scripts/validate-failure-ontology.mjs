import fs from "node:fs";
import path from "node:path";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { githubRepository, sourceDomain } from "./failure-evidence.mjs";
import { matchesEvidence, statusFor } from "./failure-view.mjs";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(websiteRoot, "data", "failures");
const schema = JSON.parse(fs.readFileSync(path.join(dataRoot, "canonical-schema.json"), "utf8"));
const taxonomy = JSON.parse(fs.readFileSync(path.join(dataRoot, "taxonomy.json"), "utf8"));
const scope = JSON.parse(fs.readFileSync(path.join(dataRoot, "scope.json"), "utf8"));
const records = JSON.parse(fs.readFileSync(path.join(dataRoot, "current-2026.json"), "utf8"));
const legacyFields = new Set(["source_urls", "source_type", "source_family", "unity_version", "vrcsdk_version", "packages", "platforms", "stage", "solution", "workaround", "status", "tags"]);

function typeMatches(value, type) {
  if (type === "array") return Array.isArray(value);
  if (type === "object") return value !== null && typeof value === "object" && !Array.isArray(value);
  return typeof value === type;
}

function validateSchema(value, rule, at, errors) {
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
    if (rule.items) value.forEach((item, index) => validateSchema(item, rule.items, `${at}[${index}]`, errors));
  }

  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const key of rule.required ?? []) if (!(key in value)) errors.push(`${at}: missing ${key}`);
    if (rule.additionalProperties === false) {
      for (const key of Object.keys(value)) if (!(key in (rule.properties ?? {}))) errors.push(`${at}: unexpected ${key}`);
    }
    for (const [key, childRule] of Object.entries(rule.properties ?? {})) {
      if (key in value) validateSchema(value[key], childRule, `${at}.${key}`, errors);
    }
  }
}

function findUnknown(value, at, errors) {
  if (value === "unknown") errors.push(`${at}: forbidden sentinel \"unknown\"`);
  else if (Array.isArray(value)) value.forEach((item, index) => findUnknown(item, `${at}[${index}]`, errors));
  else if (value && typeof value === "object") {
    for (const [key, child] of Object.entries(value)) findUnknown(child, `${at}.${key}`, errors);
  }
}

export function validateCanonicalRecords(items) {
  const errors = [];
  if (!Array.isArray(items)) return ["records: expected array"];

  const ids = new Set();
  for (const [index, record] of items.entries()) {
    const at = `records[${index}]`;
    validateSchema(record, schema, at, errors);
    findUnknown(record, at, errors);

    if (ids.has(record.id)) errors.push(`${at}: duplicate id ${record.id}`);
    ids.add(record.id);

    for (const field of legacyFields) if (field in record) errors.push(`${at}: legacy canonical field ${field}`);

    if (!(scope.current_unity_versions ?? []).includes(record.environment?.unity_version)) {
      errors.push(`${at}.environment.unity_version: outside current VRChat scope`);
    }

    for (const [axis, value] of Object.entries(record.classification ?? {})) {
      if (!taxonomy.axes[axis]?.includes(value)) errors.push(`${at}.classification.${axis}: not in taxonomy`);
    }

    const evidenceUrls = new Set();
    const supports = new Set();
    for (const [evidenceIndex, evidence] of (record.evidence ?? []).entries()) {
      const evidenceAt = `${at}.evidence[${evidenceIndex}]`;
      if (evidenceUrls.has(evidence.url)) errors.push(`${at}: duplicate evidence URL ${evidence.url}`);
      evidenceUrls.add(evidence.url);
      for (const claim of evidence.supports ?? []) supports.add(claim);
      try {
        const domain = sourceDomain(evidence.url);
        if (domain !== new URL(evidence.url).hostname.toLowerCase()) errors.push(`${evidenceAt}: nondeterministic source domain`);
        const repository = githubRepository(evidence.url);
        if (domain === "github.com" && !repository) errors.push(`${evidenceAt}: GitHub evidence lacks owner/repo derivation`);
        if (domain !== "github.com" && repository !== null) errors.push(`${evidenceAt}: non-GitHub evidence derived a repository`);
      } catch (error) {
        errors.push(`${evidenceAt}: ${error.message}`);
      }
    }

    for (const claim of ["title", "date", "environment", "symptom"]) {
      if (!supports.has(claim)) errors.push(`${at}: no evidence supports ${claim}`);
    }
    for (const optionalClaim of ["error_signature", "trigger", "root_cause", "remedies"]) {
      if (optionalClaim in record && !supports.has(optionalClaim)) errors.push(`${at}: no evidence supports ${optionalClaim}`);
    }

    if ("status" in record) errors.push(`${at}: status must be derived from remedies`);
    if (!new Set(["resolved", "workaround", "unresolved"]).has(statusFor(record))) errors.push(`${at}: status derivation failed`);
  }
  return errors;
}

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function expectRejected(name, mutate) {
  const fixture = clone(records[0]);
  mutate(fixture);
  const errors = validateCanonicalRecords([fixture]);
  if (!errors.length) throw new Error(`negative fixture was accepted: ${name}`);
}

function validateNegativeFixtures() {
  expectRejected("unsupported Unity", (record) => { record.environment.unity_version = "6000.0.0f1"; });
  expectRejected("unknown sentinel", (record) => { record.environment.vrchat_sdk_version = "unknown"; });
  expectRejected("duplicate evidence URL", (record) => { record.evidence.push(clone(record.evidence[0])); });
  expectRejected("non-http evidence URL", (record) => { record.evidence[0].url = "ftp://example.com/failure"; });
  expectRejected("taxonomy value", (record) => { record.classification.software = "Imaginary Tool"; });
  expectRejected("host OS vocabulary", (record) => { record.environment.host_os = [{ name: "Android" }]; });
  expectRejected("target platform vocabulary", (record) => { record.environment.target_platform = ["Linux"]; });
  expectRejected("unsupported claim without evidence", (record) => {
    record.root_cause = "A verified-looking but unsupported cause";
    for (const evidence of record.evidence) evidence.supports = evidence.supports.filter((claim) => claim !== "root_cause");
  });
  expectRejected("legacy field", (record) => { record.status = "resolved"; });

  const evidenceFixture = {
    evidence: [
      { url: "https://github.com/vrchat-community/ClientSim/issues/142", source_type: "github_issue", publisher: "VRChat Community", supports: ["symptom"] },
      { url: "https://creators.vrchat.com/releases/release-3-10-4/", source_type: "official_release", publisher: "VRChat", supports: ["remedies"] }
    ]
  };
  if (matchesEvidence(evidenceFixture, { source_domain: "github.com", source_type: "official_release", repository: "" })) {
    throw new Error("negative fixture was accepted: source filters crossed evidence items");
  }
}

function validateMigrationDeterminism() {
  const script = path.join(websiteRoot, "scripts", "migrate-failures.mjs");
  const run = () => execFileSync(process.execPath, [script, "--json"], { encoding: "utf8" });
  const first = run();
  const second = run();
  if (first !== second) throw new Error("migration output is not deterministic across identical raw input");
  const generated = JSON.parse(fs.readFileSync(path.join(dataRoot, "current-2026.json"), "utf8"));
  const migrated = JSON.parse(first).records;
  if (JSON.stringify(generated) !== JSON.stringify(migrated)) throw new Error("generated current-2026.json differs from migration output");
}

const currentUnity = scope.current_unity_versions ?? [];
if (currentUnity.length !== 1 || currentUnity[0] !== "2022.3.22f1") {
  throw new Error(`current VRChat Unity scope changed unexpectedly: ${JSON.stringify(currentUnity)}`);
}
if (schema.properties?.environment?.properties?.unity_version?.const !== currentUnity[0]) {
  throw new Error("canonical schema Unity const differs from scope.json");
}
if (records.length !== 8) throw new Error(`migration baseline changed: expected 8 current canonical records, got ${records.length}`);

const errors = validateCanonicalRecords(records);
if (errors.length) {
  console.error(`Failure ontology validation failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

validateNegativeFixtures();
validateMigrationDeterminism();

const domains = [...new Set(records.flatMap((record) => record.evidence.map((item) => sourceDomain(item.url))))].sort();
console.log(`Failure ontology validation passed: ${records.length} current records, ${domains.length} source domains, schema/scope/taxonomy/evidence/environment/status/filter/determinism checks passed, 9 negative fixtures rejected.`);
