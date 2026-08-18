import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const dataRoot = path.join(root, 'data', 'failures');
const schema = JSON.parse(fs.readFileSync(path.join(dataRoot, 'schema.json'), 'utf8'));
const scope = JSON.parse(fs.readFileSync(path.join(dataRoot, 'scope.json'), 'utf8'));
const recordFiles = fs.readdirSync(dataRoot)
  .filter((name) => /^records(?:-[a-z0-9-]+)?-2026\.json$/.test(name))
  .sort();
const records = recordFiles.flatMap((name) => JSON.parse(fs.readFileSync(path.join(dataRoot, name), 'utf8')));
const errors = [];

const environmentSchema = schema.properties.environment;
const hostOsValues = environmentSchema.properties.host_os.items.properties.name.enum;
const targetPlatformValues = environmentSchema.properties.target_platform.items.enum;
const currentUnityVersions = new Set(scope.current_unity_versions ?? []);

function assertArray(actual, expected, label) {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    errors.push(`${label}: expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}

assertArray(hostOsValues, ['Windows', 'macOS', 'Linux'], 'host OS vocabulary');
assertArray(targetPlatformValues, ['Windows', 'Android', 'iOS'], 'VRChat target platform vocabulary');

let migratedRecords = 0;
for (const record of records) {
  const environment = record.environment;
  if (!environment) continue;
  migratedRecords += 1;

  if (!currentUnityVersions.has(environment.unity_version)) {
    errors.push(`${record.id}.environment.unity_version: unsupported current Unity ${environment.unity_version}`);
  }
  if (environment.vrchat_sdk_version === 'unknown') {
    errors.push(`${record.id}.environment.vrchat_sdk_version: omit unknown values instead of storing the sentinel`);
  }

  const hostNames = new Set();
  for (const host of environment.host_os ?? []) {
    if (hostNames.has(host.name)) errors.push(`${record.id}.environment.host_os: duplicate ${host.name}`);
    hostNames.add(host.name);
    if (host.version === 'unknown') errors.push(`${record.id}.environment.host_os: omit unknown version`);
  }

  const targets = new Set(environment.target_platform ?? []);
  if (targets.size !== (environment.target_platform ?? []).length) {
    errors.push(`${record.id}.environment.target_platform: duplicate value`);
  }

  const packageNames = new Set();
  for (const item of environment.packages ?? []) {
    if (packageNames.has(item.name)) errors.push(`${record.id}.environment.packages: duplicate ${item.name}`);
    packageNames.add(item.name);
    if (item.version === 'unknown') errors.push(`${record.id}.environment.packages: omit unknown version for ${item.name}`);
  }
}

if (errors.length) {
  console.error(`Failure environment validation failed (${errors.length}):`);
  for (const error of errors) console.error(`- ${error}`);
  process.exit(1);
}

console.log(`Failure environment validation passed: ${migratedRecords} migrated record(s); host OS and VRChat target vocabularies verified.`);
