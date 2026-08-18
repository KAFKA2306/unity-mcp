import { matchesEvidence, matchesStructured, statusFor, valuesFor } from "./failure-view.mjs";

const fixture = {
  id: "fixture",
  classification: {
    software: "VRChat SDK",
    component: "build / validation",
    phase: "build",
    failure_type: "validation error"
  },
  environment: {
    unity_version: "2022.3.22f1",
    vrchat_sdk_version: "3.10.4",
    packages: [{ name: "VRChat SDK", version: "3.10.4" }],
    host_os: [{ name: "Windows", version: "11" }],
    target_platform: ["Windows", "Android"]
  },
  evidence: [
    {
      url: "https://github.com/vrchat-community/ClientSim/issues/142",
      source_type: "github_issue",
      publisher: "VRChat Community",
      supports: ["symptom"]
    },
    {
      url: "https://creators.vrchat.com/releases/release-3-10-4/",
      source_type: "official_release",
      publisher: "VRChat",
      supports: ["remedies"]
    }
  ],
  remedies: [{ type: "workaround", description: "test" }]
};

function assert(value, label) {
  if (!value) throw new Error(label);
}

assert(matchesEvidence(fixture, { source_domain: "github.com", source_type: "github_issue", repository: "vrchat-community/ClientSim" }), "same-evidence GitHub filter should match");
assert(!matchesEvidence(fixture, { source_domain: "github.com", source_type: "official_release", repository: "" }), "domain/type must not cross evidence items");
assert(!matchesEvidence(fixture, { source_domain: "creators.vrchat.com", source_type: "", repository: "vrchat-community/ClientSim" }), "domain/repository must not cross evidence items");
assert(matchesStructured(fixture, {
  software: "VRChat SDK",
  component: "build / validation",
  phase: "build",
  failure_type: "validation error",
  host_os: "Windows",
  target_platform: "Android",
  unity: "2022.3.22f1",
  vrcsdk: "3.10.4",
  package: "VRChat SDK",
  source_domain: "github.com",
  source_type: "github_issue",
  repository: "vrchat-community/ClientSim"
}), "full structured filter should match");
assert(statusFor(fixture) === "workaround", "workaround status derivation failed");
assert(statusFor({ remedies: [{ type: "fix", description: "x" }, { type: "workaround", description: "y" }] }) === "resolved", "fix must take precedence in status derivation");
assert(statusFor({}) === "unresolved", "no remedy must derive unresolved");

const domains = valuesFor([fixture], "source_domain");
assert(JSON.stringify(domains) === JSON.stringify(["creators.vrchat.com", "github.com"]), "source domain facets failed");
const repositories = valuesFor([fixture], "repository");
assert(JSON.stringify(repositories) === JSON.stringify(["vrchat-community/ClientSim"]), "repository facets failed");

console.log("Failure view validation passed: same-evidence source filters, ontology filters, facets, and derived status verified.");
