import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataRoot = path.join(root, "data", "failures");
const taxonomy = JSON.parse(fs.readFileSync(path.join(dataRoot, "taxonomy.json"), "utf8"));
const records = fs.readdirSync(dataRoot)
  .filter((name) => /^records(?:-[a-z0-9-]+)?-2026\.json$/.test(name))
  .sort()
  .flatMap((name) => JSON.parse(fs.readFileSync(path.join(dataRoot, name), "utf8")));

const softwareRules = [
  [/VRChat SDK/i, "VRChat SDK"],
  [/Creator Companion|\bVCC\b/i, "VRChat Creator Companion"],
  [/ClientSim/i, "VRChat ClientSim"],
  [/UdonSharp/i, "UdonSharp"],
  [/Modular Avatar|\bMA\b/i, "Modular Avatar"],
  [/\bNDMF\b/i, "NDMF"],
  [/Avatar Optimizer|\bAAO\b/i, "Avatar Optimizer"],
  [/vrc-get|ALCOM/i, "vrc-get / ALCOM"],
  [/lilToon/i, "lilToon"],
  [/Poiyomi/i, "Poiyomi Toon Shader"],
  [/Gesture Manager/i, "VRC Gesture Manager"],
  [/TexTransTool/i, "TexTransTool"],
  [/MCP for Unity/i, "MCP for Unity"],
  [/Unity Issue Tracker|Unity Editor/i, "Unity"]
];

function packages(record) {
  return record.environment?.packages ?? record.packages ?? [];
}

function text(record) {
  return [
    record.title,
    record.symptom,
    record.trigger,
    record.root_cause,
    record.solution,
    record.workaround,
    record.component,
    record.phase ?? record.stage,
    ...(record.tags ?? []),
    ...packages(record).map((item) => item.name)
  ].filter(Boolean).join(" ");
}

function software(record) {
  const publishers = (record.evidence ?? []).map((item) => item.publisher).join(" ");
  const value = `${record.source_family ?? ""} ${publishers} ${text(record)}`;
  for (const [pattern, canonical] of softwareRules) if (pattern.test(value)) return canonical;
  const sourceTypes = new Set([
    record.source_type,
    ...(record.evidence ?? []).map((item) => item.source_type)
  ].filter(Boolean));
  return [...sourceTypes].every((value) => value === "article" || value === "forum") ? "other" : "unknown";
}

function component(record) {
  const value = text(record);
  const rules = [
    [/vpm|package|dependency|resolve|repository|webview2/i, "package management"],
    [/project creation|project setup|layers|collision matrix|unity version/i, "project setup"],
    [/inspector|editor window|white screen|settings window|editor ui/i, "editor UI"],
    [/armature|humanoid|\brig\b|chest bone|body mesh/i, "avatar rig"],
    [/expression parameter|parameter budget|parameters? exceed/i, "avatar parameters"],
    [/animator|gesture layer|blendtree|animation/i, "animation"],
    [/physbone|contact receiver|contact sender|contacts?/i, "PhysBones / Contacts"],
    [/shader|material|audiolink|mtoon|ltcgi/i, "shader / material"],
    [/render|pink|bounds|culling|invisible/i, "rendering"],
    [/world|scene|pipeline manager/i, "scene / world"],
    [/udon|script|cs\d{4}|codedom/i, "Udon / scripting"],
    [/upload|publish|blueprint/i, "upload / publishing"],
    [/clientsim|preview|play mode/i, "simulation / preview"],
    [/optimi[sz]|trace and optimize|liloptimizer/i, "optimization"],
    [/import|export|vrm|fbx|xavatar/i, "import / export"],
    [/network|http|server|transport|pipe instances/i, "networking / transport"],
    [/execute_code|tool call|mcp tool|tool execution/i, "tool execution"],
    [/filesystem|file path|symlink|junction|stdin|process|device name|user settings/i, "filesystem / process"],
    [/build|validation|validator/i, "build / validation"]
  ];
  for (const [pattern, canonical] of rules) if (pattern.test(value)) return canonical;
  return "unknown";
}

function phase(record) {
  const value = `${record.phase ?? record.stage ?? ""} ${record.title ?? ""} ${record.symptom ?? ""}`;
  const rules = [
    [/validation|validator/i, "validation"],
    [/upload|publish/i, "upload"],
    [/compile|cs\d{4}|miscompile/i, "compile"],
    [/package install|\binstall/i, "install"],
    [/resolve|dependency|package resolution/i, "resolve"],
    [/import|export|fbx|vrm/i, "import"],
    [/preview/i, "preview"],
    [/clientsim|test runner|\btest\b/i, "test"],
    [/build|bake/i, "build"],
    [/runtime|play mode/i, "runtime"],
    [/launch|startup|open project|project launch/i, "launch"],
    [/editor|inspector|gizmo/i, "editor"],
    [/setup|project creation/i, "setup"]
  ];
  for (const [pattern, canonical] of rules) if (pattern.test(value)) return canonical;
  return "unknown";
}

function failureType(record) {
  const value = text(record);
  const rules = [
    [/nullreferenceexception|argumentexception|exception|\bpanic\b/i, "exception"],
    [/cs\d{4}|compile|miscompile|codedom/i, "compile error"],
    [/dependency|package resolution|could not resolve|legacy package|http 502/i, "dependency error"],
    [/validation failed|not allowed|needs valid mask|must address|validation message/i, "validation error"],
    [/\bcrash|fatalerror|fatal error/i, "crash"],
    [/timeout|hang|freeze|stall|busy: compiling|spinning/i, "hang / timeout"],
    [/vram|memory leak|resource leak/i, "resource leak"],
    [/missing|not found|cannot find|not specified|absent/i, "missing asset / reference"],
    [/pink|render|culling|invisible|disappear.*view/i, "rendering defect"],
    [/minutes|slow|performance regression|path explosion/i, "performance regression"],
    [/network|http|pipe|socket|transport|egl/i, "network / transport error"],
    [/inspector|white screen|ui thread|dropdown|field.*appear/i, "UI defect"],
    [/overwrite|corrupt|duplicate component|revert cannot|state corruption/i, "data / state corruption"],
    [/unsupported|version compatibility|not supported|incompatible/i, "unsupported configuration"],
    [/regression|incorrect|wrong|does not|doesn't|not working|removed|omitted|fails|failure|broken/i, "incorrect behavior"]
  ];
  for (const [pattern, canonical] of rules) if (pattern.test(value)) return canonical;
  return "unknown";
}

function assertVocabulary(axis, value, id) {
  if (!taxonomy.axes[axis].includes(value)) throw new Error(`${id}: invalid ${axis} ${value}`);
}

function classify(record) {
  const result = {
    id: record.id,
    software: software(record),
    component: component(record),
    phase: phase(record),
    failure_type: failureType(record)
  };
  for (const [axis, value] of Object.entries(result)) if (axis !== "id") assertVocabulary(axis, value, record.id);
  return result;
}

function selfTest() {
  const fixture = { source_type:"github_issue", title:"", symptom:"", trigger:"", root_cause:"", solution:"", workaround:"", component:"", stage:"", tags:[], packages:[] };
  if (software({ ...fixture, source_family:"VCC" }) !== "VRChat Creator Companion") throw new Error("VCC synonym canonicalization failed");
  if (software({ ...fixture, source_family:"AAO" }) !== "Avatar Optimizer") throw new Error("AAO synonym canonicalization failed");
  if (phase({ ...fixture, stage:"optimization" }) === "optimization") throw new Error("optimization must not be a phase");
  if (phase({ ...fixture, stage:"networking" }) === "networking") throw new Error("networking must not be a phase");

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
