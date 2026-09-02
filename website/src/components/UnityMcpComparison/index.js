import React, { useMemo, useState } from 'react';
import styles from './styles.module.css';
import comparison from '@site/data/unity-mcp-comparison.json';

const statusLabel = {
  pass: '確認済み',
  warn: '制約あり',
  fail: '不適合',
  unverified: '未確認',
};

const decisionOptions = [...new Set(comparison.implementations.map((item) => item.decision))];

function Badge({ status, children }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{children ?? statusLabel[status] ?? status}</span>;
}

function searchable(implementation) {
  return [
    implementation.name,
    implementation.subtitle,
    implementation.decision,
    implementation.summary,
    ...Object.values(implementation.gates ?? {}).flatMap((gate) => [gate.status, gate.text]),
    ...implementation.evidence.flatMap((item) => [item.label, item.url]),
  ].filter(Boolean).join(' ').toLowerCase();
}

export default function UnityMcpComparison() {
  const { selection, implementations, criteria } = comparison;
  const [query, setQuery] = useState('');
  const [decision, setDecision] = useState('');
  const [vrchat, setVrchat] = useState('');

  const filtered = useMemo(() => implementations.filter((implementation) => {
    if (decision && implementation.decision !== decision) return false;
    if (vrchat && implementation.gates?.vrchat?.status !== vrchat) return false;
    const needle = query.trim().toLowerCase();
    return !needle || searchable(implementation).includes(needle);
  }), [query, decision, vrchat, implementations]);

  const compatibleCount = implementations.filter((item) => item.gates?.compatibility?.status === 'pass').length;
  const vrchatVerifiedCount = implementations.filter((item) => item.gates?.vrchat?.status === 'pass').length;
  const unverifiedGateCount = implementations.reduce(
    (count, item) => count + Object.values(item.gates ?? {}).filter((gate) => gate.status === 'unverified').length,
    0,
  );

  const clearFilters = () => {
    setQuery('');
    setDecision('');
    setVrchat('');
  };

  return (
    <div className={styles.root}>
      <div className={styles.summary}>
        <div><strong>{implementations.length}</strong><span>比較対象</span></div>
        <div><strong>{compatibleCount}</strong><span>Unity 2022.3 対応確認</span></div>
        <div><strong>{vrchatVerifiedCount}</strong><span>VRChat 根拠あり</span></div>
        <div><strong>{unverifiedGateCount}</strong><span>未確認項目</span></div>
      </div>

      <section className={styles.currentChoice}>
        <div className={styles.currentChoiceHeader}>
          <Badge status="pass">現在の標準</Badge>
          <strong>{selection.name}</strong>
        </div>
        <p>現行VRChat環境では実機確認済みの実装を優先します。確認済み version、repository内 version、upstream latest は混同せず別々に表示します。</p>
        <div className={styles.versionRow}>
          <span>実機確認 <strong>{selection.verified_version}</strong></span>
          <span>repository <strong>{selection.repository_version}</strong></span>
          <span>upstream <strong>{selection.upstream_latest}</strong></span>
          <span>確認日 <strong>{comparison.checked_at}</strong></span>
        </div>
      </section>

      <div className={styles.searchPanel}>
        <label className={`${styles.field} ${styles.query}`}>
          <span>実装名・特徴・判断理由</span>
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="例: VRChat、runtime、screenshot、Unity 2022.3"
            autoComplete="off"
          />
        </label>
        <label className={styles.field}>
          <span>判断</span>
          <select value={decision} onChange={(event) => setDecision(event.target.value)}>
            <option value="">すべて</option>
            {decisionOptions.map((value) => <option key={value} value={value}>{value}</option>)}
          </select>
        </label>
        <label className={styles.field}>
          <span>VRChat</span>
          <select value={vrchat} onChange={(event) => setVrchat(event.target.value)}>
            <option value="">すべて</option>
            <option value="pass">根拠あり</option>
            <option value="warn">制約あり</option>
            <option value="fail">不適合</option>
            <option value="unverified">未確認</option>
          </select>
        </label>
        <button className={styles.reset} type="button" onClick={clearFilters}>絞り込みを解除</button>
      </div>

      <div className={styles.legend}>
        <Badge status="pass" /> 公開資料または実機証拠で確認
        <Badge status="warn" /> 利用できるが制約あり
        <Badge status="fail" /> 現行条件に明示的に不適合
        <Badge status="unverified" /> 根拠不足。推測しない
      </div>

      <div className={styles.resultHeader}><strong>{filtered.length}</strong> 件一致</div>

      <div className={styles.records}>
        {filtered.map((implementation) => (
          <article className={styles.card} key={implementation.id}>
            <div className={styles.meta}>
              <Badge status={implementation.overall}>{implementation.decision}</Badge>
              <span>{implementation.subtitle}</span>
            </div>

            <h3><a href={implementation.repository} target="_blank" rel="noreferrer">{implementation.name}</a></h3>
            <p className={styles.summaryText}>{implementation.summary}</p>

            <div className={styles.chips}>
              {criteria.map((criterion) => {
                const gate = implementation.gates?.[criterion.key] ?? { status: 'unverified' };
                return (
                  <span className={`${styles.gateChip} ${styles[`chip_${gate.status}`]}`} key={criterion.key}>
                    <strong>{criterion.label}</strong>
                    <small>{statusLabel[gate.status] ?? gate.status}</small>
                  </span>
                );
              })}
            </div>

            <details className={styles.details}>
              <summary>判断理由と根拠</summary>
              <dl>
                {criteria.map((criterion) => {
                  const gate = implementation.gates?.[criterion.key] ?? { status: 'unverified', text: '確認できる根拠がありません。' };
                  return (
                    <React.Fragment key={criterion.key}>
                      <dt>{criterion.label}</dt>
                      <dd><Badge status={gate.status} /> <span>{gate.text}</span></dd>
                    </React.Fragment>
                  );
                })}
                <dt>根拠</dt>
                <dd>
                  <ul className={styles.compactList}>
                    {implementation.evidence.map((item) => (
                      <li key={item.url}><a href={item.url} target="_blank" rel="noreferrer">{item.label}</a></li>
                    ))}
                  </ul>
                </dd>
              </dl>
            </details>
          </article>
        ))}
      </div>
    </div>
  );
}
