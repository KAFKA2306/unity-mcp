import { classifyFailure, classifyPhase, classifySoftware } from "./failure-classification.mjs";
import { loadRawRecords, readFailureJson } from "./failure-files.mjs";

const taxonomy = readFailureJson("taxonomy.json");
const records = loadRawRecords();

function assertVocabulary(axis, value, id) {
  if (!taxonomy.axes[axis].includes(value)) throw new Error(`${id}: invalid ${axis} ${value}`);
}

function classify(record) {
  const result = { id: record.id, ...classifyFailure(record) };
  for (const [axis, value] of Object.entries(result)) if (axis !== "id") assertVocabulary(axis, value, record.id);
  return result;
}

function selfTest() {
  const fixture = { source_type:"github_issue", title:"", symptom:"", trigger:"", root_cause:"", solution:"", workaround:"", component:"", stage:"", tags:[], packages:[] };
  if (classifySoftware({ ...fixture, source_family:"VCC" }) !== "VRChat Creator Companion") throw new Error("VCC synonym canonicalization failed");
  if (classifySoftware({ ...fixture, source_family:"AAO" }) !== "Avatar Optimizer") throw new Error("AAO synonym canonicalization failed");
  if (classifyPhase({ ...fixture, stage:"optimization" }) === "optimization") throw new Error("optimization must not be a phase");
  if (classifyPhase({ ...fixture, stage:"networking" }) === "networking") throw new Error("networking must not be a phase");

  for (const [axis, labels] of Object.entries(taxonomy.labels ?? {})) {
    if (!(axis in taxonomy.axes)) throw new Error(`labels reference unknown axis ${axis}`);
    for (const value of Object.keys(labels)) assertVocabulary(axis, value, `labels.${axis}`);
  }
}

selfTest();
if (records.length < 90) throw new Error(`taxonomy requires >=90 observed records, got ${records.length}`);
const classified = records.map(classify);
const counts = {};
for (const axis of ["software", "component", "phase", "failure_type"]) {
  counts[axis] = Object.fromEntries(
    taxonomy.axes[axis]
      .map((value) => [value, classified.filter((item) => item[axis] === value).length])
      .filter(([, count]) => count > 0)
  );
}

const output = { taxonomy_version: taxonomy.version, records: classified.length, counts, classified };
if (process.argv.includes("--json")) process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
else console.log(JSON.stringify({ taxonomy_version: taxonomy.version, records: classified.length, counts }, null, 2));
