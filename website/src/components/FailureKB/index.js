import React, { useEffect, useMemo, useState } from "react";
import styles from "./styles.module.css";
import seed from "@site/data/failures/records-2026.json";
import github from "@site/data/failures/records-github-2026.json";
import vrchat from "@site/data/failures/records-vrchat-official-2026.json";
import web from "@site/data/failures/records-web-2026.json";
import unity from "@site/data/failures/records-unity-official-2026.json";

const allRecords = [...seed, ...github, ...vrchat, ...web, ...unity].sort(
  (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)
);

const emptyFilters = {
  q: "",
  component: "",
  stage: "",
  status: "",
  platform: "",
  unity: "",
  vrcsdk: "",
  package: "",
};

function values(key) {
  const collected = new Set();
  for (const record of allRecords) {
    if (key === "platform") (record.platforms ?? []).forEach((value) => collected.add(value));
    else if (key === "package") (record.packages ?? []).forEach((item) => collected.add(item.name));
    else if (record[key]) {
      const hideUnknown = key === "unity_version" || key === "vrcsdk_version";
      if (!hideUnknown || record[key] !== "unknown") collected.add(record[key]);
    }
  }
  return [...collected].sort((a, b) => a.localeCompare(b, undefined, { numeric: true }));
}

function normalizeSignature(value = "") {
  return value
    .toLowerCase()
    .replace(/[a-f0-9]{8}-[a-f0-9]{4}-[1-5][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}/gi, "<guid>")
    .replace(/\b0x[a-f0-9]+\b/gi, "<hex>")
    .replace(/\bline\s+\d+\b/gi, "line <n>")
    .replace(/\b\d{2,}\b/g, "<n>")
    .replace(/[a-z]:\\[^\n:]+/gi, "<path>")
    .replace(/\s+/g, " ")
    .trim();
}

function tokens(value) {
  return new Set(normalizeSignature(value).split(/[^a-z0-9_.:+<>-]+/).filter((token) => token.length > 2));
}

function jaccard(a, b) {
  if (!a.size || !b.size) return 0;
  let common = 0;
  for (const value of a) if (b.has(value)) common += 1;
  return common / (a.size + b.size - common);
}

function candidatesFor(record) {
  if (!record.error_signature || record.error_signature === "unknown") return [];
  const signature = normalizeSignature(record.error_signature);
  const sourceTokens = tokens(record.error_signature);
  return allRecords
    .filter((candidate) => candidate.id !== record.id && candidate.error_signature !== "unknown")
    .map((candidate) => {
      const normalized = normalizeSignature(candidate.error_signature);
      return {
        record: candidate,
        kind: normalized === signature ? "exact" : "similar",
        score: normalized === signature ? 1 : jaccard(sourceTokens, tokens(candidate.error_signature)),
      };
    })
    .filter((candidate) => candidate.score === 1 || candidate.score >= 0.58)
    .sort((a, b) => b.score - a.score || a.record.id.localeCompare(b.record.id))
    .slice(0, 6);
}

function searchable(record) {
  return [
    record.title,
    record.error_signature,
    record.symptom,
    record.trigger,
    record.root_cause,
    record.solution,
    record.workaround,
    record.component,
    record.stage,
    record.unity_version,
    record.vrcsdk_version,
    ...(record.tags ?? []),
    ...(record.packages ?? []).flatMap((item) => [item.name, item.version]),
  ]
    .join(" ")
    .toLowerCase();
}

function matches(record, filters) {
  const query = filters.q.trim().toLowerCase();
  if (query && !searchable(record).includes(query)) return false;
  if (filters.component && record.component !== filters.component) return false;
  if (filters.stage && record.stage !== filters.stage) return false;
  if (filters.status && record.status !== filters.status) return false;
  if (filters.platform && !(record.platforms ?? []).includes(filters.platform)) return false;
  if (filters.unity && record.unity_version !== filters.unity) return false;
  if (filters.vrcsdk && record.vrcsdk_version !== filters.vrcsdk) return false;
  if (filters.package && !(record.packages ?? []).some((item) => item.name === filters.package)) return false;
  return true;
}

function Select({ label, name, value, options, onChange }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select name={name} value={value} onChange={onChange}>
        <option value="">All</option>
        {options.map((option) => (
          <option key={option} value={option}>{option}</option>
        ))}
      </select>
    </label>
  );
}

export default function FailureKB() {
  const [filters, setFilters] = useState(emptyFilters);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters(Object.fromEntries(Object.keys(emptyFilters).map((key) => [key, params.get(key) ?? ""])));
    setReady(true);
  }, []);

  useEffect(() => {
    if (!ready) return;
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(filters)) if (value) params.set(key, value);
    const query = params.toString();
    window.history.replaceState(null, "", `${window.location.pathname}${query ? `?${query}` : ""}${window.location.hash}`);
  }, [filters, ready]);

  const filtered = useMemo(() => allRecords.filter((record) => matches(record, filters)), [filters]);
  const sourceFamilies = useMemo(() => new Set(allRecords.map((record) => record.source_family)).size, []);
  const statuses = useMemo(
    () => Object.fromEntries(["resolved", "workaround", "unresolved", "unknown"].map(
      (status) => [status, allRecords.filter((record) => record.status === status).length]
    )),
    []
  );

  const onChange = (event) => setFilters((current) => ({ ...current, [event.target.name]: event.target.value }));

  return (
    <div className={styles.root}>
      <div className={styles.summary}>
        <div><strong>{allRecords.length}</strong><span>2026 records</span></div>
        <div><strong>{sourceFamilies}</strong><span>source families</span></div>
        <div><strong>{statuses.resolved}</strong><span>resolved</span></div>
        <div><strong>{statuses.workaround}</strong><span>workarounds</span></div>
        <div><strong>{statuses.unresolved}</strong><span>unresolved</span></div>
      </div>

      <div className={styles.searchPanel}>
        <label className={`${styles.field} ${styles.query}`}>
          <span>Error / exception / symptom</span>
          <input
            name="q"
            value={filters.q}
            onChange={onChange}
            placeholder="Paste an error string, UUM id, exception name, or symptom"
            autoComplete="off"
          />
        </label>
        <Select label="Component" name="component" value={filters.component} options={values("component")} onChange={onChange} />
        <Select label="Stage" name="stage" value={filters.stage} options={values("stage")} onChange={onChange} />
        <Select label="Status" name="status" value={filters.status} options={values("status")} onChange={onChange} />
        <Select label="Platform" name="platform" value={filters.platform} options={values("platform")} onChange={onChange} />
        <Select label="Unity" name="unity" value={filters.unity} options={values("unity_version")} onChange={onChange} />
        <Select label="VRCSDK" name="vrcsdk" value={filters.vrcsdk} options={values("vrcsdk_version")} onChange={onChange} />
        <Select label="Package" name="package" value={filters.package} options={values("package")} onChange={onChange} />
        <button className={styles.reset} type="button" onClick={() => setFilters(emptyFilters)}>Clear filters</button>
      </div>

      <div className={styles.resultHeader}>
        <strong>{filtered.length}</strong> matching record{filtered.length === 1 ? "" : "s"}
      </div>

      <div className={styles.records}>
        {filtered.map((record) => {
          const related = candidatesFor(record);
          return (
            <article className={styles.card} key={record.id} id={`failure-${record.id}`}>
              <div className={styles.meta}>
                <span className={`${styles.status} ${styles[record.status]}`}>{record.status}</span>
                <span>{record.date}</span>
                <span>{record.source_family}</span>
              </div>
              <h3>{record.title}</h3>
              {record.error_signature !== "unknown" && <pre className={styles.signature}>{record.error_signature}</pre>}
              <p>{record.symptom}</p>
              <div className={styles.chips}>
                <span>{record.component}</span>
                <span>{record.stage}</span>
                {(record.platforms ?? []).map((platform) => <span key={platform}>{platform}</span>)}
                {record.unity_version !== "unknown" && <span>Unity {record.unity_version}</span>}
                {record.vrcsdk_version !== "unknown" && <span>VRCSDK {record.vrcsdk_version}</span>}
              </div>

              <details className={styles.details}>
                <summary>Evidence and resolution</summary>
                <dl>
                  <dt>Trigger</dt><dd>{record.trigger}</dd>
                  <dt>Root cause</dt><dd>{record.root_cause}</dd>
                  <dt>Solution</dt><dd>{record.solution}</dd>
                  <dt>Workaround</dt><dd>{record.workaround}</dd>
                  <dt>Packages</dt>
                  <dd>{(record.packages ?? []).map((item) => `${item.name} ${item.version}`).join(", ")}</dd>
                  <dt>Sources</dt>
                  <dd>
                    {(record.source_urls ?? []).map((url) => (
                      <div key={url}><a href={url} target="_blank" rel="noreferrer">{url}</a></div>
                    ))}
                  </dd>
                </dl>
                {related.length > 0 && (
                  <div className={styles.related}>
                    <strong>Same / similar signatures</strong>
                    <ul>
                      {related.map(({ record: candidate, kind, score }) => (
                        <li key={candidate.id}>
                          <a href={`#failure-${candidate.id}`}>{candidate.title}</a>
                          <span>{kind}{kind === "similar" ? ` ${Math.round(score * 100)}%` : ""}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </details>
            </article>
          );
        })}
      </div>
    </div>
  );
}
