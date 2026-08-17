import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

export default function HomeStats() {
  const { siteConfig, i18n } = useDocusaurusContext();
  const toolCount = siteConfig.customFields?.toolCount ?? 47;
  const resourceCount = siteConfig.customFields?.resourceCount ?? 25;
  const clientCount = siteConfig.customFields?.supportedClientCount ?? 0;
  const ja = i18n.currentLocale !== 'en';

  const stats = ja ? [
    { value: String(toolCount), unit: 'ツール', label: 'MCPツール' },
    { value: String(resourceCount), unit: 'リソース', label: '読み取り専用状態' },
    { value: String(clientCount), unit: 'クライアント', label: '自動設定対応' },
    { value: '2021.3 → 6.x', unit: 'LTS', label: 'Unity対応範囲' },
  ] : [
    { value: String(toolCount), unit: 'tools', label: 'MCP tool surface' },
    { value: String(resourceCount), unit: 'resources', label: 'read-only state' },
    { value: String(clientCount), unit: 'clients', label: 'auto-configured' },
    { value: '2021.3 → 6.x', unit: 'lts', label: 'Unity version range' },
  ];

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.label}>{ja ? '// 仕様' : '// SPEC'}</span>
          <span className={styles.sub}>{ja ? '概要' : 'at a glance'}</span>
        </div>
        <dl className={styles.grid}>
          {stats.map((s) => (
            <div className={styles.cell} key={s.label}>
              <dt className={styles.cellLabel}>{s.label}</dt>
              <dd className={styles.cellValue}>
                <span className={styles.num}>{s.value}</span>
                <span className={styles.unit}>{s.unit}</span>
              </dd>
            </div>
          ))}
        </dl>
      </div>
    </section>
  );
}
