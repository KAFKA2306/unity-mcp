import React, { useEffect, useMemo, useState } from "react";
import useDocusaurusContext from "@docusaurus/useDocusaurusContext";
import styles from "./styles.module.css";
import browseRecords from "@site/data/failures/browse-2026.json";
import taxonomy from "@site/data/failures/taxonomy.json";
import jaSeed from "@site/data/failures/display-ja-seed-2026.json";
import jaFeedback from "@site/data/failures/display-ja-feedback-2026.json";
import jaGithub from "@site/data/failures/display-ja-github-2026.json";
import jaModularAvatar from "@site/data/failures/display-ja-modular-avatar-2026.json";
import jaVrcfury from "@site/data/failures/display-ja-vrcfury-2026.json";
import jaVrchat from "@site/data/failures/display-ja-vrchat-official-2026.json";
import jaWeb from "@site/data/failures/display-ja-web-2026.json";
import {
  evidenceViews,
  filterKeys,
  matchesStructured,
  statusFor,
  valuesFor,
} from "@site/scripts/failure-view.mjs";

const allRecords = [...browseRecords].sort(
  (a, b) => b.date.localeCompare(a.date) || a.id.localeCompare(b.id)
);

const japaneseDisplay = {
  ...jaSeed,
  ...jaFeedback,
  ...jaGithub,
  ...jaModularAvatar,
  ...jaVrcfury,
  ...jaVrchat,
  ...jaWeb,
};

const emptyFilters = Object.fromEntries(filterKeys.map((key) => [key, ""]));

const quickSymptoms = {
  ja: [
    ["compile error", "コンパイルできない"],
    ["dependency error", "導入・更新で失敗する"],
    ["validation error", "ビルド・検証で止まる"],
    ["crash", "Unityが落ちる"],
    ["hang / timeout", "固まる・終わらない"],
    ["missing asset / reference", "参照・アセットがない"],
    ["incorrect behavior", "動きがおかしい"],
    ["rendering defect", "見た目がおかしい"],
    ["network / transport error", "接続・通信できない"],
  ],
  en: [
    ["compile error", "Won't compile"],
    ["dependency error", "Install or update fails"],
    ["validation error", "Build or validation stops"],
    ["crash", "Unity crashes"],
    ["hang / timeout", "Hangs or times out"],
    ["missing asset / reference", "Missing asset or reference"],
    ["incorrect behavior", "Behaves incorrectly"],
    ["rendering defect", "Looks wrong"],
    ["network / transport error", "Can't connect"],
  ],
};

const copyByLocale = {
  en: {
    all: "All",
    records: "known cases",
    verified: "current Unity verified",
    resolved: "resolved",
    workaround: "workaround available",
    unresolved: "under investigation",
    symptomHeading: "Find by what is happening",
    symptomHelp: "You do not need to know the cause. Start from the symptom you can see.",
    searchLabel: "Search an error or symptom",
    searchPlaceholder: "Paste an error message, or describe what is happening",
    searchHint: "Exact error messages are fine. Package names and symptoms also work.",
    advanced: "Filter by environment or technical details",
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
    matching: (count) => `matching case${count === 1 ? "" : "s"}`,
    symptom: "Symptom",
    firstAction: "Try this first",
    investigating: "No verified fix is recorded yet. Check the known conditions and evidence below.",
    details: "Cause, environment, and evidence",
    errorText: "Error text",
    trigger: "When it happens",
    rootCause: "Cause",
    remedies: "Fix / workaround",
    packages: "Packages",
    sources: "Evidence",
    related: "Same / similar error",
    exact: "exact",
    similar: "similar",
    supports: "supports",
    noRemedy: "No verified fix or workaround recorded.",
    currentVerified: "current Unity verified",
    legacy: "legacy Unity",
    otherVersion: "other Unity version",
    unverified: "Unity version unverified",
    statusLabels: { resolved: "resolved", workaround: "workaround", unresolved: "under investigation" },
    remedyLabels: { fix: "fix", workaround: "workaround" },
  },
  ja: {
    all: "すべて",
    records: "既知事例",
    verified: "現行Unity確認済み",
    resolved: "解決済み",
    workaround: "回避策あり",
    unresolved: "調査中",
    symptomHeading: "困っている症状から探す",
    symptomHelp: "原因が分からなくても大丈夫です。いま見えている症状から選んでください。",
    searchLabel: "エラーや症状を検索",
    searchPlaceholder: "エラー文を貼り付ける、または症状を入力",
    searchHint: "エラー全文、パッケージ名、「アップロードできない」などの症状でも検索できます。",
    advanced: "環境や技術情報で詳しく絞り込む",
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
    matching: () => "件見つかりました",
    symptom: "症状",
    firstAction: "まず試すこと",
    investigating: "確認済みの解決策はまだありません。分かっている発生条件と根拠を確認してください。",
    details: "原因・環境・根拠を詳しく見る",
    errorText: "エラー文字列",
    trigger: "発生条件",
    rootCause: "原因",
    remedies: "解決策・回避策",
    packages: "パッケージ",
    sources: "根拠",
    related: "同一・類似エラー",
    exact: "完全一致",
    similar: "類似",
    supports: "根拠対象",
    noRemedy: "確認済みの解決策・回避策はありません。",
    currentVerified: "現行Unity確認済み",
    legacy: "旧Unity",
    otherVersion: "別Unity version",
    unverified: "Unity version未確認",
    statusLabels: { resolved: "解決済み", workaround: "回避策あり", unresolved: "調査中" },
    remedyLabels: { fix: "解決策", workaround: "回避策" },
  },
};

const sourceTypeLabels = {
  ja: {
    official_release: "公式リリース",
    github_issue: "GitHub Issue",
    github_commit: "GitHub Commit",
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
  return display[remedy.type === "fix" ? "solution" : "workaround"] ?? remedy.description;
}

function verificationLabel(record, copy) {
  switch (record.verification?.unity_version_status) {
    case "current": return copy.currentVerified;
    case "legacy": return copy.legacy;
    case "other": return copy.otherVersion;
    default: return copy.unverified;
  }
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
    record.verification?.unity_version_status,
    ...(record.environment?.packages ?? []).flatMap((item) => [item.name, item.version]),
    ...(record.environment?.host_os ?? []).flatMap((item) => [item.name, item.version]),
    ...(record.environment?.target_platform ?? []),
    ...(record.remedies ?? []).flatMap((item) => [item.type, item.description]),
    ja.solution,
    ja.workaround,
    ...evidence.flatMap((item) => [item.url, item.publisher, item.source_type, item.source_domain, item.repository]),
  ].filter(Boolean).join(" ").toLowerCase();
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
        {options.map((option) => <option key={option} value={option}>{optionLabel(option)}</option>)}
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
    "software", "component", "phase", "failure_type", "host_os", "target_platform",
    "unity", "vrcsdk", "package", "source_domain", "source_type", "repository",
  ].map((key) => [key, valuesFor(allRecords, key)])), []);
  const statuses = useMemo(() => Object.fromEntries(
    ["resolved", "workaround", "unresolved"].map((status) => [status, allRecords.filter((record) => statusFor(record) === status).length])
  ), []);
  const verifiedCount = useMemo(() => allRecords.filter((record) => record.verification?.current_scope).length, []);
  const symptomOptions = quickSymptoms[locale] ?? quickSymptoms.ja;

  const onChange = (event) => {
    const { name, value } = event.target;
    setFilters((current) => {
      const next = { ...current, [name]: value };
      if (name === "source_domain" && value && value !== "github.com") next.repository = "";
      return next;
    });
  };

  const chooseSymptom = (failureType) => {
    setFilters((current) => ({ ...current, failure_type: current.failure_type === failureType ? "" : failureType }));
  };

  return (
    <div className={styles.root}>
      <div className={styles.summary}>
        <div><strong>{allRecords.length}</strong><span>{copy.records}</span></div>
        <div><strong>{verifiedCount}</strong><span>{copy.verified}</span></div>
        <div><strong>{statuses.resolved}</strong><span>{copy.resolved}</span></div>
        <div><strong>{statuses.workaround}</strong><span>{copy.workaround}</span></div>
        <div><strong>{statuses.unresolved}</strong><span>{copy.unresolved}</span></div>
      </div>

      <section className={styles.finder}>
        <h2>{copy.symptomHeading}</h2>
        <p>{copy.symptomHelp}</p>
        <div className={styles.symptomGrid}>
          {symptomOptions.map(([value, label]) => {
            const count = allRecords.filter((record) => record.classification?.failure_type === value).length;
            if (!count) return null;
            const active = filters.failure_type === value;
            return (
              <button
                key={value}
                type="button"
                className={`${styles.symptomButton} ${active ? styles.symptomActive : ""}`}
                onClick={() => chooseSymptom(value)}
                aria-pressed={active}
              >
                <span>{label}</span>
                <small>{count}</small>
              </button>
            );
          })}
        </div>

        <label className={styles.mainSearch}>
          <span>{copy.searchLabel}</span>
          <input name="q" value={filters.q} onChange={onChange} placeholder={copy.searchPlaceholder} autoComplete="off" />
          <small>{copy.searchHint}</small>
        </label>
      </section>

      <details className={styles.advanced}>
        <summary>{copy.advanced}</summary>
        <div className={styles.searchPanel}>
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
        </div>
      </details>

      <div className={styles.resultBar}>
        <div><strong>{filtered.length}</strong> {copy.matching(filtered.length)}</div>
        {Object.values(filters).some(Boolean) && <button type="button" onClick={() => setFilters(emptyFilters)}>{copy.clear}</button>}
      </div>

      <div className={styles.records}>
        {filtered.map((record) => {
          const related = candidatesFor(record);
          const status = statusFor(record);
          const classification = record.classification ?? {};
          const environment = record.environment ?? {};
          const evidence = evidenceViews(record);
          const remedies = record.remedies ?? [];
          const primaryRemedy = remedies.find((item) => item.type === "fix") ?? remedies[0];
          return (
            <article className={styles.card} key={record.id} id={`failure-${record.id}`}>
              <div className={styles.meta}>
                <span className={`${styles.status} ${styles[status]}`}>{copy.statusLabels[status]}</span>
                {classification.software && <span>{classification.software}</span>}
                <span>{record.date}</span>
              </div>

              <h3>{localized(record, "title", locale)}</h3>
              {record.symptom && <p className={styles.symptom}><strong>{copy.symptom}:</strong> {localized(record, "symptom", locale)}</p>}

              {primaryRemedy ? (
                <div className={styles.answer}>
                  <strong>{copy.firstAction}</strong>
                  <p>{localizedRemedy(record, primaryRemedy, locale)}</p>
                </div>
              ) : (
                <div className={`${styles.answer} ${styles.answerPending}`}>
                  <strong>{copy.statusLabels.unresolved}</strong>
                  <p>{copy.investigating}</p>
                </div>
              )}

              <div className={styles.chips}>
                {classification.component && <span>{taxonomyLabel("component", classification.component, locale)}</span>}
                {classification.phase && <span>{taxonomyLabel("phase", classification.phase, locale)}</span>}
                {environment.unity_version && <span>Unity {environment.unity_version}</span>}
              </div>

              <details className={styles.details}>
                <summary>{copy.details}</summary>
                <dl>
                  <dt>Unity</dt><dd>{verificationLabel(record, copy)}{environment.unity_version ? ` / ${environment.unity_version}` : ""}</dd>
                  {record.error_signature && <><dt>{copy.errorText}</dt><dd><pre className={styles.signature}>{record.error_signature}</pre></dd></>}
                  {record.trigger && <><dt>{copy.trigger}</dt><dd>{localized(record, "trigger", locale)}</dd></>}
                  {record.root_cause && <><dt>{copy.rootCause}</dt><dd>{localized(record, "root_cause", locale)}</dd></>}
                  <dt>{copy.remedies}</dt>
                  <dd>{remedies.length ? (
                    <ul className={styles.compactList}>
                      {remedies.map((remedy, index) => (
                        <li key={`${remedy.type}-${index}`}><strong>{copy.remedyLabels[remedy.type]}:</strong> {localizedRemedy(record, remedy, locale)}</li>
                      ))}
                    </ul>
                  ) : copy.noRemedy}</dd>
                  {(environment.packages ?? []).length > 0 && <><dt>{copy.packages}</dt><dd>{environment.packages.map((item) => `${item.name}${item.version ? ` ${item.version}` : ""}`).join(", ")}</dd></>}
                  <dt>{copy.sources}</dt>
                  <dd><ul className={styles.compactList}>
                    {evidence.map((item) => (
                      <li key={item.url}>
                        <a href={item.url} target="_blank" rel="noreferrer">{item.source_domain}</a>
                        {` — ${item.publisher} / ${sourceTypeLabel(item.source_type, locale)}`}
                        {item.repository ? ` / ${item.repository}` : ""}
                        {item.supports?.length ? ` / ${copy.supports}: ${item.supports.join(", ")}` : ""}
                      </li>
                    ))}
                  </ul></dd>
                </dl>
                {related.length > 0 && <div className={styles.related}>
                  <strong>{copy.related}</strong>
                  <ul>{related.map(({ record: candidate, kind, score }) => (
                    <li key={candidate.id}>
                      <a href={`?q=${encodeURIComponent(candidate.error_signature)}#failure-${candidate.id}`}>{localized(candidate, "title", locale)}</a>
                      <span>{kind === "exact" ? copy.exact : copy.similar}{kind === "similar" ? ` ${Math.round(score * 100)}%` : ""}</span>
                    </li>
                  ))}</ul>
                </div>}
              </details>
            </article>
          );
        })}
      </div>
    </div>
  );
}
