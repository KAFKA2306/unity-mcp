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
    .replace(/(?:[a-z]:\\|\/)(?:[^\s:]+[\\/])+[^\s:]+/gi, "<path>")
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
        exact.push({ ids: [a.id, b.id], normalized_signature: a.normalized_signature });
        continue;
      }

      const score = jaccard(tokens(a.normalized_signature), tokens(b.normalized_signature));
      if (score >= 0.55) {
        similar.push({ ids: [a.id, b.id], score: Number(score.toFixed(3)), bases: [a.basis, b.basis] });
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

  const cs = normalizeSignature("CS0246: The type or namespace name Foo could not be found");
  if (!cs.includes("cs0246")) throw new Error("stable compiler error code was removed");
}

selfTest();
const records = loadRecords();
const result = buildCandidates(records);
if (result.projected.length < 90) throw new Error(`expected >=90 projected records, got ${result.projected.length}`);
if (new Set(result.projected.map((item) => item.id)).size !== result.projected.length) throw new Error("duplicate projected record id");
if (result.projected.some((item) => !item.normalized_signature)) throw new Error("empty normalized signature");

const seedIds = new Set(JSON.parse(fs.readFileSync(path.join(dataRoot, "records-2026.json"), "utf8")).map((record) => record.id));
const seedProjection = result.projected.filter((item) => seedIds.has(item.id));
if (seedProjection.length !== 10) throw new Error(`expected 10 seed projections, got ${seedProjection.length}`);

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
  console.log(JSON.stringify({ records: records.length, exact_candidates: result.exact.length, similar_candidates: result.similar.length, seed_projections: seedProjection.length }, null, 2));
}
