import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(root, "data", "failures");

const STOP = new Set([
  "a","an","and","are","as","at","be","because","but","by","can","could","for","from","has","have","in","into","is","it","its","not","of","on","or","that","the","their","this","to","when","where","while","with","without","your",
  "avatar","vrchat","unity","issue","error","fails","failed","failure","fixed","fix","unknown"
]);

export function normalizeSignature(value) {
  return String(value ?? "")
    .normalize("NFKC")
    .toLowerCase()
    .replace(/\b[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}\b/gi, "<guid>")
    .replace(/\b[0-9a-f]{32,64}\b/gi, "<hash>")
    .replace(/\b[a-z]:\\(?:[^\\\s:]+\\)*[^\\\s:]+/gi, "<path>")
    .replace(/(?:\/[^\/\s:]+){2,}/g, "<path>")
    .replace(/\bline\s+\d+\b/gi, "line <n>")
    .replace(/\((\d+),(\d+)\)/g, "(<n>,<n>)")
    .replace(/:\d+(?::\d+)?\b/g, ":<n>")
    .replace(/\b(?:v)?\d+\.\d+(?:\.\d+)?(?:[-+._]?[a-z0-9]+)*\b/gi, "<version>")
    .replace(/\b0x[0-9a-f]+\b/gi, "<hex>")
    .replace(/\binstance\s+id\s*[:=]?\s*\d+\b/gi, "instance id <n>")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  return new Set(normalizeSignature(value)
    .replace(/[^\p{L}\p{N}_<>+.-]+/gu, " ")
    .split(/\s+/)
    .filter((token) => token.length >= 3 && !STOP.has(token)));
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let intersection = 0;
  for (const token of a) if (b.has(token)) intersection += 1;
  return intersection / (a.size + b.size - intersection);
}

function sharedStrongToken(a, b) {
  for (const token of a) {
    if (token.length >= 8 && !token.startsWith("<") && b.has(token)) return token;
  }
  return null;
}

function packageNames(record) {
  return new Set((record.packages ?? []).map((item) => item.name.toLowerCase()));
}

function overlap(a, b) {
  for (const item of a) if (b.has(item)) return true;
  return false;
}

function compatible(a, b) {
  if (a.component === b.component) return true;
  if (a.stage !== "unknown" && a.stage === b.stage) return true;
  if (a.source_family === b.source_family) return true;
  return overlap(packageNames(a), packageNames(b));
}

export function projectRecord(record) {
  const hasRaw = record.error_signature !== "unknown";
  const basis = hasRaw ? record.error_signature : `${record.title}. ${record.symptom}`;
  return {
    id: record.id,
    raw_signature: record.error_signature,
    normalized_signature: normalizeSignature(basis),
    basis: hasRaw ? "error_signature" : "title_symptom",
    component: record.component,
    stage: record.stage,
    source_family: record.source_family
  };
}

export function buildCandidates(records) {
  const projected = records.map(projectRecord);
  const exact = [];
  const similar = [];

  for (let i = 0; i < projected.length; i += 1) {
    for (let j = i + 1; j < projected.length; j += 1) {
      const a = projected[i];
      const b = projected[j];
      if (!compatible(records[i], records[j])) continue;

      if (a.basis === "error_signature" && b.basis === "error_signature" && a.normalized_signature === b.normalized_signature) {
        exact.push({ ids: [a.id, b.id], normalized_signature: a.normalized_signature, action: "candidate_only" });
        continue;
      }

      const aTokens = tokens(a.normalized_signature);
      const bTokens = tokens(b.normalized_signature);
      const score = jaccard(aTokens, bTokens);
      const strong = sharedStrongToken(aTokens, bTokens);
      if (score >= 0.55 || (strong && score >= 0.08)) {
        similar.push({
          ids: [a.id, b.id],
          score: Number(score.toFixed(3)),
          reason: score >= 0.55 ? "token_similarity" : `shared_strong_token:${strong}`,
          bases: [a.basis, b.basis],
          action: "candidate_only"
        });
      }
    }
  }
  return { projected, exact, similar: similar.sort((a, b) => b.score - a.score || a.ids[0].localeCompare(b.ids[0])) };
}

function loadRecords() {
  return fs.readdirSync(dataRoot)
    .filter((name) => /^records(?:-[a-z0-9-]+)?-2026\.json$/.test(name))
    .sort()
    .flatMap((name) => JSON.parse(fs.readFileSync(path.join(dataRoot, name), "utf8")));
}

function selfTest() {
  const variants = [
    "System.NullReferenceException at C:\\Users\\alice\\Project\\Foo.cs:123",
    " system.nullreferenceexception AT D:\\work\\Foo.cs:987 ",
    "System.NullReferenceException at /home/user/project/Foo.cs:44"
  ];
  const normalized = variants.map(normalizeSignature);
  if (new Set(normalized).size !== 1) throw new Error(`path/line normalization failed: ${JSON.stringify(normalized)}`);

  const guidA = normalizeSignature("Missing object 123e4567-e89b-12d3-a456-426614174000 in v1.2.3");
  const guidB = normalizeSignature("Missing object 223e4567-e89b-12d3-a456-426614174999 in v9.9.9");
  if (guidA !== guidB) throw new Error("GUID/version normalization failed");
  if (!normalizeSignature("CS0246: Missing Foo").includes("cs0246")) throw new Error("stable compiler error code was removed");

  const synthetic = [
    { id:"a", error_signature: variants[0], title:"a", symptom:"a", component:"test", stage:"compile", source_family:"x", packages:[] },
    { id:"b", error_signature: variants[1], title:"b", symptom:"b", component:"test", stage:"compile", source_family:"y", packages:[] },
    { id:"c", error_signature:"unknown", title:"Object disappears when tagged EditorOnly", symptom:"EditorOnly object is omitted from build", component:"tags", stage:"build / runtime", source_family:"x", packages:[] },
    { id:"d", error_signature:"unknown", title:"Clothing missing because EditorOnly", symptom:"Clothing tagged EditorOnly is absent after build", component:"other", stage:"build / runtime", source_family:"y", packages:[] }
  ];
  const candidates = buildCandidates(synthetic);
  if (candidates.exact.length !== 1) throw new Error("exact duplicate classification self-test failed");
  if (!candidates.similar.some((item) => item.ids.includes("c") && item.ids.includes("d"))) throw new Error("similar candidate self-test failed");
}

selfTest();
const records = loadRecords();
const result = buildCandidates(records);
if (result.projected.length < 90) throw new Error(`expected >=90 projected records, got ${result.projected.length}`);
if (new Set(result.projected.map((item) => item.id)).size !== result.projected.length) throw new Error("duplicate projected record id");
if (result.projected.some((item) => !item.normalized_signature)) throw new Error("empty normalized signature");

const fixtures = JSON.parse(fs.readFileSync(path.join(dataRoot, "signature-fixtures-2026.json"), "utf8"));
if (fixtures.length !== 10) throw new Error(`expected 10 signature fixtures, got ${fixtures.length}`);
const byId = new Map(result.projected.map((item) => [item.id, item]));
for (const fixture of fixtures) {
  const actual = byId.get(fixture.id)?.normalized_signature;
  if (actual !== fixture.normalized_signature) throw new Error(`signature fixture drift for ${fixture.id}: ${JSON.stringify(actual)}`);
}

const editorOnlyPair = ["2026-note-editoronly-avatar-parts-disappear", "2026-note-editoronly-clothes-missing-runtime"];
if (!result.similar.some((item) => editorOnlyPair.every((id) => item.ids.includes(id)))) {
  throw new Error("expected EditorOnly field reports to appear as a similar candidate pair");
}

const output = {
  generated_from_records: records.length,
  normalization: "deterministic-v1",
  projected: result.projected,
  exact_candidates: result.exact,
  similar_candidates: result.similar
};

if (process.argv.includes("--json")) {
  process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
} else {
  console.log(JSON.stringify({ records: records.length, exact_candidates: result.exact.length, similar_candidates: result.similar.length, signature_fixtures: fixtures.length }, null, 2));
}
