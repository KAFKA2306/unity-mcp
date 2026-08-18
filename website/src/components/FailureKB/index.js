import React, { useEffect, useMemo, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import styles from "./styles.module.css";
import currentRecords from "@site/data/failures/current-2026.json";
import taxonomy from "@site/data/failures/taxonomy.json";
import jaSeed from "@site/data/failures/display-ja-seed-2026.json";
import jaGithub from "@site/data/failures/display-ja-github-2026.json";
import jaVrchat from "@site/data/failures/display-ja-vrchat-official-2026.json";
import jaWeb from "@site/data/failures/display-ja-web-2026.json";
import jaUnity from "@site/data/failures/display-ja-unity-official-2026.json";
import {
  evidenceViews,
  filterKeys,
  matchesStructured,
  statusFor,
  valuesFor,
} from "@site/scripts/failure-view.mjs";

const allRecords = [...currentRecords].sort(
  (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)
);

const japaneseDisplay = {
  ...jaSeed,
  ...jaGithub,
  ...jaVrchat,
  ...jaWeb,
  ...jaUnity,
};

const emptyFilters = Object.fromEntries(filterKeys.map((key) => [key, ""]));

const copyByLocale = {
  en: {
    all: "All",
    records: "current records",
    sourceDomains: "source domains",
    resolved: "resolved",
    workarounds: "workarounds",
    unresolved: "unresolved",
    searchLabel: "Error / exception / symptom",
    searchPlaceholder: "Paste an error string, exception name, symptom, package, or source",
    software: "Software",
    component: "Component",
    phase: "Phase",
    failureType: "Failure type",
    hostOs: "Host OS",
    targetPlatform: "Target platform",
    unity: "Unity",
    vrcsdk: "VRCSDK",
    package: "Package",
    sourceDomain: "Source domain",
    sourceType: "Source type",
    repository: "GitHub repository",
    clear: "Clear filters",
    matching: (count) => `matching record${count === 1 ? "" : "s"}`,
    evidence: "Evidence and resolution",
    trigger: "Trigger",
    rootCause: "Root cause",
    remedies: "Remedies",
    packages: "Packages",
    sources: "Evidence",
    related: "Same / similar signatures",
    exact: "exact",
    similar: "similar",
    supports: "supports",
    noRemedy: "No verified remedy recorded.",
    statusLabels: {
      resolved: "resolved",
      workaround: "workaround",
      unresolved: "unresolved",
    },
    remedyLabels: {
      fix: "fix",
      workaround: "workaround",
    },
  },
  ja: {
    all: "すべて",
    records: "現行レコード",
    sourceDomains: "情報源ドメイン",
    resolved: "解決済み",
    workarounds: "回避策あり",
    unresolved: "未解決",
    searchLabel: "エラー / 例外 / 症状",
    searchPlaceholder: "エラー文字列、例外名、症状、パッケージ、情報源を検索",
    software: "ソフトウェア",
    component: "コンポーネント",
    phase: "工程",
    failureType: "不具合種別",
    hostOs: "制作OS",
    targetPlatform: "対象プラットフォーム",
    unity: "Unity",
    vrcsdk: "VRCSDK",
    package: "パッケージ",
    sourceDomain: "情報源ドメイン",
    sourceType: "情報源種別",
    repository: "GitHubリポジトリ",
    clear: "絞り込みを解除",
    matching: () => "件一致",
    evidence: "根拠と解決情報",
    trigger: "発生条件",
    rootCause: "原因",
    remedies: "解決策・回避策",
    packages: "パッケージ",
    sources: "根拠",
    related: "同一・類似シグネチャ",
    exact: "完全一致",
    similar: "類似",
    supports: "根拠対象",
    noRemedy: "確認済みの解決策・回避策はありません。",
    statusLabels: {
      resolved: "解決済み",
      workaround: "回避策あり",
      unresolved: "未解決",
    },
    remedyLabels: {
      fix: "解決策",
      workaround: "回避策",
    },
  },
};

const sourceTypeLabels = {
  ja: {
    official_release: "公式リリース",
    github_issue: "GitHub Issue",
    article: "記事",
    forum: "フォーラム",
    unity_issue_tracker: "Unity Issue Tracker",
  },
};

function taxonomyLabel(axis, value, locale) {
  if (!value || locale === "en") return value;
  return taxonomy.labels?.[axis]?.[value] ?? value;
}

function sourceTypeLabel(value, locale) {
  return sourceTypeLabels[locale]?.[value] ?? value;
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
  if (!record.error_signature) return [];
  const signature = normalizeSignature(record.error_signature);
  const sourceTokens = tokens(record.error_signature);
  return allRecords
    .filter((candidate) =>
      candidate.id !== record.id &&
      candidate.classification?.component === record.classification?.component &&
      candidate.error_signature
    )
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

function localized(record, field, locale) {
  if (locale === "en") return record[field];
  return japaneseDisplay[record.id]?.[field] ?? record[field];
}

function localizedRemedy(record, remedy, locale) {
  if (locale === "en") return remedy.description;
  const display = japaneseDisplay[record.id] ?? {};
  const legacyField = remedy.type === "fix" ? "solution" : "workaround";
  return display[legacyField] ?? remedy.description;
}

function searchable(record) {
  const ja = japaneseDisplay[record.id] ?? {};
  const evidence = evidenceViews(record);
  return [
    record.id,
    record.title,
    ja.title,
    record.error_signature,
    normalizeSignature(record.error_signature),
    record.symptom,
    ja.symptom,
    record.trigger,
    ja.trigger,
    record.root_cause,
    ja.root_cause,
    record.classification?.software,
    record.classification?.component,
    taxonomy.labels?.component?.[record.classification?.component],
    record.classification?.phase,
    taxonomy.labels?.phase?.[record.classification?.phase],
    record.classification?.failure_type,
    taxonomy.labels?.failure_type?.[record.classification?.failure_type],
    record.environment?.unity_version,
    record.environment?.vrchat_sdk_version,
    ...(record.environment?.packages ?? []).flatMap((item) => [item.name, item.version]),
    ...(record.environment?.host_os ?? []).flatMap((item) => [item.name, item.version]),
    ...(record.environment?.target_platform ?? []),
    ...(record.remedies ?? []).flatMap((item) => [item.type, item.description]),
    ja.solution,
    ja.workaround,
    ...evidence.flatMap((item) => [
      item.url,
      item.publisher,
      item.source_type,
      item.source_domain,
      item.repository,
    ]),
  ]
    .filter(Boolean)
    .join(" ")
    .toLowerCase();
}

function matches(record, filters) {
  if (!matchesStructured(record, filters)) return false;
  const query = filters.q.trim().toLowerCase();
  if (!query) return true;
  const text = searchable(record);
  return text.includes(query) || text.includes(normalizeSignature(filters.q));
}

function Select({ label, name, value, options, onChange, allLabel, optionLabel = (option) => option, disabled = false }) {
  return (
    <label className={styles.field}>
      <span>{label}</span>
      <select name={name} value={value} onChange={onChange} disabled={disabled}>
        <option value="">{allLabel}</option>
        {options.map((option) => (
          <option key={option} value={option}>{optionLabel(option)}</option>
        ))}
      </select>
    </label>
  );
}

export default function FailureKB() {
  const { i18n } = useDocusaurusContext();
  const locale = i18n.currentLocale;
  const copy = copyByLocale[locale] ?? copyByLocale.ja;
  const [filters, setFilters] = useState(emptyFilters);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setFilters(Object.fromEntries(filterKeys.map((key) => [key, params.get(key) ?? ""])));
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
  const facets = useMemo(() => Object.fromEntries([
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
    "repository",
  ].map((key) => [key, valuesFor(allRecords, key)])), []);
  const statuses = useMemo(() => Object.fromEntries(
    ["resolved", "workaround", "unresolved"].map((status) => [status, allRecords.filter((record) => statusFor(record) === status).length])
  ), []);

  const onChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => {
      const next = { ...current, [name]: value };
      if (name === "source_domain" && value && value !== "github.com") next.repository = "";
      return next;
    });
  };

  return (
    <div className={styles.root}>
      <div className={styles.summary}>
        <div><strong>{allRecords.length}</strong><span>{copy.records}</span></div>
        <div><strong>{facets.source_domain.length}</strong><span>{copy.sourceDomains}</span></div>
        <div><strong>{statuses.resolved}</strong><span>{copy.resolved}</span></div>
        <div><strong>{statuses.workaround}</strong><span>{copy.workarounds}</span></div>
        <div><strong>{statuses.unresolved}</strong><span>{copy.unresolved}</span></div>
      </div>

      <div className={styles.searchPanel}>
        <label className={`${styles.field} ${styles.query}`}>
          <span>{copy.searchLabel}</span>
          <input name="q" value={filters.q} onChange={onChange} placeholder={copy.searchPlaceholder} autoComplete="off" />
        </label>
        <Select label={copy.software} name="software" value={filters.software} options={facets.software} onChange={onChange} allLabel={copy.all} />
        <Select label={copy.component} name="component" value={filters.component} options={facets.component} onChange={onChange} allLabel={copy.all} optionLabel={(value) => taxonomyLabel("component", value, locale)} />
        <Select label={copy.phase} name="phase" value={filters.phase} options={facets.phase} onChange={onChange} allLabel={copy.all} optionLabel={(value) => taxonomyLabel("phase", value, locale)} />
        <Select label={copy.failureType} name="failure_type" value={filters.failure_type} options={facets.failure_type} onChange={onChange} allLabel={copy.all} optionLabel={(value) => taxonomyLabel("failure_type", value, locale)} />
        <Select label={copy.hostOs} name="host_os" value={filters.host_os} options={facets.host_os} onChange={onChange} allLabel={copy.all} />
        <Select label={copy.targetPlatform} name="target_platform" value={filters.target_platform} options={facets.target_platform} onChange={onChange} allLabel={copy.all} />
        <Select label={copy.unity} name="unity" value={filters.unity} options={facets.unity} onChange={onChange} allLabel={copy.all} />
        <Select label={copy.vrcsdk} name="vrcsdk" value={filters.vrcsdk} options={facets.vrcsdk} onChange={onChange} allLabel={copy.all} />
        <Select label={copy.package} name="package" value={filters.package} options={facets.package} onChange={onChange} allLabel={copy.all} />
        <Select label={copy.sourceDomain} name="source_domain" value={filters.source_domain} options={facets.source_domain} onChange={onChange} allLabel={copy.all} />
        <Select label={copy.sourceType} name="source_type" value={filters.source_type} options={facets.source_type} onChange={onChange} allLabel={copy.all} optionLabel={(value) => sourceTypeLabel(value, locale)} />
        <Select label={copy.repository} name="repository" value={filters.repository} options={facets.repository} onChange={onChange} allLabel={copy.all} disabled={Boolean(filters.source_domain && filters.source_domain !== "github.com")} />
        <button className={styles.reset} type="button" onClick={() => setFilters(emptyFilters)}>{copy.clear}</button>
      </div>

      <div className={styles.resultHeader}>
        <strong>{filtered.length}</strong> {copy.matching(filtered.length)}
      </div>

      <div className={styles.records}>
        {filtered.map((record) => {
          const related = candidatesFor(record);
          const status = statusFor(record);
          const classification = record.classification ?? {};
          const environment = record.environment ?? {};
          const evidence = evidenceViews(record);
          return (
            <article className={styles.card} key={record.id} id={`failure-${record.id}`}>
              <div className={styles.meta}>
                <span className={`${styles.status} ${styles[status]}`}>{copy.statusLabels[status]}</span>
                <span>{record.date}</span>
                <span>{classification.software}</span>
              </div>
              <h3>{localized(record, "title", locale)}</h3>
              {record.error_signature && <pre className={styles.signature}>{record.error_signature}</pre>}
              <p>{localized(record, "symptom", locale)}</p>
              <div className={styles.chips}>
                {classification.component && <span>{taxonomyLabel("component", classification.component, locale)}</span>}
                {classification.phase && <span>{taxonomyLabel("phase", classification.phase, locale)}</span>}
                {classification.failure_type && <span>{taxonomyLabel("failure_type", classification.failure_type, locale)}</span>}
                {(environment.host_os ?? []).map((host) => <span key={`${host.name}-${host.version ?? ""}`}>{host.name}{host.version ? ` ${host.version}` : ""}</span>)}
                {(environment.target_platform ?? []).map((target) => <span key={target}>{target}</span>)}
                <span>Unity {environment.unity_version}</span>
                {environment.vrchat_sdk_version && <span>VRCSDK {environment.vrchat_sdk_version}</span>}
              </div>

              <details className={styles.details}>
                <summary>{copy.evidence}</summary>
                <dl>
                  {record.trigger && <><dt>{copy.trigger}</dt><dd>{localized(record, "trigger", locale)}</dd></>}
                  {record.root_cause && <><dt>{copy.rootCause}</dt><dd>{localized(record, "root_cause", locale)}</dd></>}
                  <dt>{copy.remedies}</dt>
                  <dd>
                    {(record.remedies ?? []).length ? (
                      <ul className={styles.compactList}>
                        {(record.remedies ?? []).map((remedy, index) => (
                          <li key={`${remedy.type}-${index}`}><strong>{copy.remedyLabels[remedy.type]}:</strong> {localizedRemedy(record, remedy, locale)}</li>
                        ))}
                      </ul>
                    ) : copy.noRemedy}
                  </dd>
                  <dt>{copy.packages}</dt>
                  <dd>{(environment.packages ?? []).map((item) => `${item.name}${item.version ? ` ${item.version}` : ""}`).join(", ")}</dd>
                  <dt>{copy.sources}</dt>
                  <dd>
                    <ul className={styles.compactList}>
                      {evidence.map((item) => (
                        <li key={item.url}>
                          <a href={item.url} target="_blank" rel="noreferrer">{item.source_domain}</a>
                          {` — ${item.publisher} / ${sourceTypeLabel(item.source_type, locale)}`}
                          {item.repository ? ` / ${item.repository}` : ""}
                          {item.supports?.length ? ` / ${copy.supports}: ${item.supports.join(", ")}` : ""}
                        </li>
                      ))}
                    </ul>
                  </dd>
                </dl>
                {related.length > 0 && (
                  <div className={styles.related}>
                    <strong>{copy.related}</strong>
                    <ul>
                      {related.map(({ record: candidate, kind, score }) => (
                        <li key={candidate.id}>
                          <a href={`?q=${encodeURIComponent(candidate.error_signature)}#failure-${candidate.id}`}>{localized(candidate, "title", locale)}</a>
                          <span>{kind === "exact" ? copy.exact : copy.similar}{kind === "similar" ? ` ${Math.round(score * 100)}%` : ""}</span>
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
