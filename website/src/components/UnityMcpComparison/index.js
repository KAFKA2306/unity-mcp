import React from 'react';
import styles from './styles.module.css';
import comparison from '@site/data/unity-mcp-comparison.json';

const statusLabel = {
  pass: 'PASS',
  warn: 'WARN',
  fail: 'FAIL',
  unverified: 'UNVERIFIED',
};

function Badge({ status, children }) {
  return <span className={`${styles.badge} ${styles[status]}`}>{children ?? statusLabel[status] ?? status}</span>;
}

function GateCell({ gate }) {
  if (!gate) return <td><Badge status="unverified" /></td>;
  return (
    <td>
      <Badge status={gate.status} />
      <div className={styles.cellText}>{gate.text}</div>
    </td>
  );
}

export default function UnityMcpComparison() {
  const { selection, implementations, criteria } = comparison;

  return (
    <div className={styles.root}>
      <div className={styles.summary}>
        <dl>
          <dt>Checked</dt>
          <dd>{comparison.checked_at}</dd>
        </dl>
        <dl>
          <dt>Target</dt>
          <dd>{comparison.target_environment}</dd>
        </dl>
        <dl>
          <dt>Selected</dt>
          <dd>{selection.name}</dd>
        </dl>
        <dl>
          <dt>Verified / repository / upstream</dt>
          <dd>{selection.verified_version} / {selection.repository_version} / {selection.upstream_latest}</dd>
        </dl>
      </div>

      <div className={styles.legend}>
        <Badge status="pass" /> 根拠あり
        <Badge status="warn" /> 制約あり
        <Badge status="fail" /> 明示的に不適合
        <Badge status="unverified" /> 根拠不足
      </div>

      <div className={styles.tableWrap}>
        <table className={styles.matrix}>
          <thead>
            <tr>
              <th>判断</th>
              <th>実装</th>
              {criteria.map((criterion) => <th key={criterion.key}>{criterion.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {implementations.map((implementation) => (
              <tr key={implementation.id}>
                <td className={styles.decisionCell}>
                  <Badge status={implementation.overall}>{implementation.decision}</Badge>
                </td>
                <td className={styles.nameCell}>
                  <a href={implementation.repository} target="_blank" rel="noreferrer"><strong>{implementation.name}</strong></a>
                  <div className={styles.subtitle}>{implementation.subtitle}</div>
                  <p>{implementation.summary}</p>
                </td>
                {criteria.map((criterion) => <GateCell key={criterion.key} gate={implementation.gates?.[criterion.key]} />)}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className={styles.evidenceSection}>
        <h2>根拠</h2>
        {implementations.map((implementation) => (
          <details className={styles.evidenceCard} key={implementation.id}>
            <summary>
              <Badge status={implementation.overall}>{implementation.decision}</Badge>
              <span>{implementation.name}</span>
            </summary>
            <p>{implementation.summary}</p>
            <ul>
              {implementation.evidence.map((item) => (
                <li key={item.url}><a href={item.url} target="_blank" rel="noreferrer">{item.label}</a></li>
              ))}
            </ul>
          </details>
        ))}
      </div>
    </div>
  );
}
