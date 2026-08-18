import { githubRepository, sourceDomain } from "./failure-evidence.mjs";

export const filterKeys = [
  "q",
  "software",
  "component",
  "phase",
  "failure_type",
  "host_os",
  "target_platform",
  "unity",
  "vrcsdk",
  "package",
  "source_domain",
  "source_type",
  "repository"
];

export function statusFor(record) {
  const remedies = record.remedies ?? [];
  if (remedies.some((item) => item.type === "fix")) return "resolved";
  if (remedies.some((item) => item.type === "workaround")) return "workaround";
  return "unresolved";
}

export function evidenceView(item) {
  return {
    ...item,
    source_domain: sourceDomain(item.url),
    repository: githubRepository(item.url)
  };
}

export function evidenceViews(record) {
  return (record.evidence ?? []).map(evidenceView);
}

export function matchesEvidence(record, filters) {
  const selected = [filters.source_domain, filters.source_type, filters.repository].some(Boolean);
  if (!selected) return true;
  return evidenceViews(record).some((item) =>
    (!filters.source_domain || item.source_domain === filters.source_domain) &&
    (!filters.source_type || item.source_type === filters.source_type) &&
    (!filters.repository || item.repository === filters.repository)
  );
}

export function matchesStructured(record, filters) {
  const classification = record.classification ?? {};
  const environment = record.environment ?? {};
  if (filters.software && classification.software !== filters.software) return false;
  if (filters.component && classification.component !== filters.component) return false;
  if (filters.phase && classification.phase !== filters.phase) return false;
  if (filters.failure_type && classification.failure_type !== filters.failure_type) return false;
  if (filters.host_os && !(environment.host_os ?? []).some((item) => item.name === filters.host_os)) return false;
  if (filters.target_platform && !(environment.target_platform ?? []).includes(filters.target_platform)) return false;
  if (filters.unity && environment.unity_version !== filters.unity) return false;
  if (filters.vrcsdk && environment.vrchat_sdk_version !== filters.vrcsdk) return false;
  if (filters.package && !(environment.packages ?? []).some((item) => item.name === filters.package)) return false;
  return matchesEvidence(record, filters);
}

export function valuesFor(records, key) {
  const values = new Set();
  for (const record of records) {
    const classification = record.classification ?? {};
    const environment = record.environment ?? {};
    if (["software", "component", "phase", "failure_type"].includes(key)) {
      if (classification[key]) values.add(classification[key]);
    } else if (key === "host_os") {
      for (const item of environment.host_os ?? []) values.add(item.name);
    } else if (key === "target_platform") {
      for (const value of environment.target_platform ?? []) values.add(value);
    } else if (key === "unity") {
      if (environment.unity_version) values.add(environment.unity_version);
    } else if (key === "vrcsdk") {
      if (environment.vrchat_sdk_version) values.add(environment.vrchat_sdk_version);
    } else if (key === "package") {
      for (const item of environment.packages ?? []) values.add(item.name);
    } else if (key === "source_domain") {
      for (const item of evidenceViews(record)) values.add(item.source_domain);
    } else if (key === "source_type") {
      for (const item of evidenceViews(record)) values.add(item.source_type);
    } else if (key === "repository") {
      for (const item of evidenceViews(record)) if (item.repository) values.add(item.repository);
    }
  }
  return [...values].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}
