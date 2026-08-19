import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export const dataRoot = path.join(websiteRoot, "data", "failures");
export const staticFailureRoot = path.join(websiteRoot, "static", "data", "failures");

export function readFailureJson(name) {
  return JSON.parse(fs.readFileSync(path.join(dataRoot, name), "utf8"));
}

export function rawRecordFiles() {
  return fs.readdirSync(dataRoot)
    .filter((name) => /^records-[a-z0-9-]+-2026\.json$/.test(name))
    .sort();
}

export function loadRawRecords(files = rawRecordFiles()) {
  return files.flatMap((name) => readFailureJson(name));
}

export function sourceRegistryFiles() {
  return fs.readdirSync(dataRoot)
    .filter((name) => /^sources(?:-[a-z0-9-]+)?\.json$/.test(name))
    .sort();
}

export function loadSources(files = sourceRegistryFiles()) {
  return files.flatMap((name) => readFailureJson(name));
}
