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

const productRules = [
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

function text(record) {
  return [record.title, record.symptom, record.trigger, record.root_cause, record.solution, record.workaround, record.component, record.stage, ...(record.tags ?? []), ...(record.packages ?? []).map((item) => item.name)].join(" ");
}

function product(record) {
  const value = `${record.source_family} ${text(record)}`;
  for (const [pattern, canonical] of productRules) if (pattern.test(value)) return canonical;
  return record.source_type === "article" || record.source_type === "forum" ? "other" : "unknown";
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

function stage(record) {
  const value = `${record.stage} ${record.title} ${record.symptom}`;
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
    [/network/i, "networking"],
    [/optimi[sz]/i, "optimization"],
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

function platform(record) {
  const values = new Set((record.platforms ?? []).map((value) => value.toLowerCase()));
  const hasWindows = [...values].some((value) => value.includes("windows"));
  const hasMac = [...values].some((value) => value.includes("mac"));
  const hasLinux = [...values].some((value) => value.includes("linux") || value.includes("ubuntu") || value.includes("xubuntu"));
  const hasAndroid = [...values].some((value) => value.includes("android") || value.includes("quest"));
  const hasPc = [...values].some((value) => value === "pc");
  const count = [hasWindows, hasMac, hasLinux, hasAndroid, hasPc].filter(Boolean).length;
  if (count > 1) return "cross-platform";
  if (hasWindows) return "Windows";
  if (hasMac) return "macOS";
  if (hasLinux) return "Linux";
  if (hasAndroid) return "Android / Quest";
  if (hasPc) return "PC";
  return "unknown";
}

function assertVocabulary(axis, value, id) {
  if (!taxonomy.axes[axis].includes(value)) throw new Error(`${id}: invalid ${axis} ${value}`);
}

function classify(record) {
  const result = {
    id: record.id,
    product: product(record),
    component: component(record),
    stage: stage(record),
    failure_type: failureType(record),
    platform: platform(record)
  };
  for (const [axis, value] of Object.entries(result)) if (axis !== "id") assertVocabulary(axis, value, record.id);
  return result;
}

function selfTest() {
  const vcc = product({ source_family:"VCC", source_type:"github_issue", title:"", symptom:"", trigger:"", root_cause:"", solution:"", workaround:"", component:"", stage:"", tags:[], packages:[] });
  if (vcc !== "VRChat Creator Companion") throw new Error("VCC synonym canonicalization failed");
  const aa = product({ source_family:"AAO", source_type:"github_issue", title:"", symptom:"", trigger:"", root_cause:"", solution:"", workaround:"", component:"", stage:"", tags:[], packages:[] });
  if (aa !== "Avatar Optimizer") throw new Error("AAO synonym canonicalization failed");
}

selfTest();
if (records.length < 90) throw new Error(`taxonomy requires >=90 observed records, got ${records.length}`);
const classified = records.map(classify);
const counts = {};
for (const axis of ["product", "component", "stage", "failure_type", "platform"]) {
  counts[axis] = Object.fromEntries([...taxonomy.axes[axis]].map((value) => [value, classified.filter((item) => item[axis] === value).length]).filter(([, count]) => count > 0));
}

const output = { taxonomy_version: taxonomy.version, records: classified.length, counts, classified };
if (process.argv.includes("--json")) process.stdout.write(`${JSON.stringify(output, null, 2)}\n`);
else console.log(JSON.stringify({ taxonomy_version: taxonomy.version, records: classified.length, counts }, null, 2));
