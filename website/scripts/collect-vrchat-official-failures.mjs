import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const outputPath = path.join(websiteRoot, "data", "failures", "records-vrchat-official-2026.json");
const seedPath = path.join(websiteRoot, "data", "failures", "records-2026.json");
const versions = ["3.10.2", "3.10.3", "3.10.4"];
const rawBase = "https://raw.githubusercontent.com/vrchat-community/creator-docs/main/Docs/releases";
const publicBase = "https://creators.vrchat.com/releases";
const failureSignal = /fixed|fail|incorrect|exception|regression|not working|wrong|revert|jitter|again|accurate|correctly|redundant|miscompile|preventing|could result|no longer|not appearing|not persist|match|instead of|now logs you in|behave as if/i;

function plain(markdown) {
  return markdown
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, "$1")
    .replace(/[`*_~]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function frontmatter(markdown, key) {
  const match = markdown.match(new RegExp(`^${key}:\\s*([^\\n]+)$`, "m"));
  return match?.[1]?.trim().replace(/^['\"]|['\"]$/g, "") ?? "unknown";
}

function componentFor(text) {
  if (/ClientSim/i.test(text)) return "VRChat ClientSim";
  if (/PhysBone/i.test(text)) return "VRChat PhysBones";
  if (/Constraint/i.test(text)) return "VRChat Constraints";
  if (/VRCJson|DataDictionary|data list|data dictionary/i.test(text)) return "VRChat Data Containers";
  if (/UdonSharp/i.test(text)) return "UdonSharp";
  if (/VRCPickup/i.test(text)) return "VRCPickup";
  if (/Mirror/i.test(text)) return "VRCMirrorReflection";
  if (/VRCRaycast/i.test(text)) return "VRCRaycast";
  if (/material|shader|VRCFallback/i.test(text)) return "VRChat materials / shaders";
  return "VRChat SDK";
}

function stageFor(text) {
  if (/build|building|validation/i.test(text)) return "build / validation";
  if (/play mode/i.test(text)) return "play mode";
  if (/inspector|gizmo/i.test(text)) return "editor UI";
  if (/compile|miscompile/i.test(text)) return "compile";
  if (/ClientSim/i.test(text)) return "ClientSim runtime";
  return "unknown";
}

function errorSignature(text) {
  if (/All pipe instances are busy/i.test(text)) return "All pipe instances are busy";
  const quoted = text.match(/["“]([^"”]+)["”]/);
  return quoted && /error|exception/i.test(text) ? quoted[1] : "unknown";
}

function idFor(version, text) {
  const hash = crypto.createHash("sha256").update(text).digest("hex").slice(0, 12);
  return `2026-vrchat-sdk-${version.replaceAll(".", "-")}-${hash}`;
}

function extractRelease(markdown, version) {
  const date = frontmatter(markdown, "date");
  const sourceUrl = `${publicBase}/release-${version.replaceAll(".", "-")}/`;
  const candidates = [];
  let mode = null;

  for (const line of markdown.split(/\r?\n/)) {
    const heading = line.match(/^##\s+(.+)/)?.[1] ?? null;
    if (heading) {
      mode = heading.startsWith("Fixes") ? "fixed" : heading === "Known Issues" ? "known" : null;
      continue;
    }
    const bullet = line.match(/^\s*-\s+(.+)/)?.[1] ?? null;
    if (!mode || !bullet) continue;

    const text = plain(bullet);
    if (mode === "fixed" && !failureSignal.test(text)) continue;

    const signature = errorSignature(text);
    const known = mode === "known";
    candidates.push({
      id: idFor(version, text),
      title: text.length > 180 ? `${text.slice(0, 177)}...` : text,
      date,
      date_kind: "published",
      source_urls: [sourceUrl],
      source_type: "official_release",
      source_family: "VRChat SDK releases",
      component: componentFor(text),
      unity_version: "unknown",
      vrcsdk_version: version,
      packages: [{ name: "VRChat SDK", version }],
      platforms: ["unknown"],
      stage: stageFor(text),
      error_signature: signature,
      symptom: text,
      trigger: "unknown",
      root_cause: /This is a Unity issue/i.test(text)
        ? "Unity issue; the VRChat release note does not identify the underlying Unity defect."
        : "unknown",
      solution: known ? "unknown" : `Fixed in VRChat SDK ${version}.`,
      workaround: /restarting your editor and trying again/i.test(text)
        ? "Restart the Unity Editor and retry the build."
        : "unknown",
      status: known ? (/restarting your editor and trying again/i.test(text) ? "workaround" : "unresolved") : "resolved",
      tags: ["vrchat", "sdk", "official-release"]
    });
  }
  return candidates;
}

async function fetchText(url) {
  const response = await fetch(url, {
    signal: AbortSignal.timeout(15000),
    headers: { "user-agent": "unity-mcp-failure-kb-collector/1.0" }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status}: ${url}`);
  return response.text();
}

function dedupe(candidates, seeds) {
  const seedSignatures = new Set(seeds.map((record) => record.error_signature).filter((value) => value !== "unknown"));
  const seenText = new Set();
  return candidates.filter((record) => {
    const textKey = record.symptom.toLowerCase();
    if (seenText.has(textKey)) return false;
    seenText.add(textKey);
    if (record.error_signature !== "unknown" && seedSignatures.has(record.error_signature)) return false;
    return true;
  });
}

async function collect() {
  const seeds = JSON.parse(fs.readFileSync(seedPath, "utf8"));
  const candidates = [];
  for (const version of versions) {
    const markdown = await fetchText(`${rawBase}/release-${version}.md`);
    candidates.push(...extractRelease(markdown, version));
  }
  return dedupe(candidates, seeds).sort((a, b) => a.date.localeCompare(b.date) || a.id.localeCompare(b.id));
}

const records = await collect();
const serialized = `${JSON.stringify(records, null, 2)}\n`;

if (process.argv.includes("--check")) {
  const current = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
  if (current !== serialized) {
    console.error("VRChat official failure records are stale. Run: node scripts/collect-vrchat-official-failures.mjs");
    process.exit(1);
  }
  console.log(`VRChat official records are current: ${records.length} record(s).`);
} else {
  fs.writeFileSync(outputPath, serialized);
  console.log(`Wrote ${records.length} VRChat official record(s) to ${path.relative(websiteRoot, outputPath)}.`);
}
