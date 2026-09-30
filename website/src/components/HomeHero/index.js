import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import CopyButton from '@site/src/components/CopyButton';
import styles from './styles.module.css';

const UPM_MAIN = 'https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main';
const UPM_BETA = 'https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#beta';

const copy = {
  ja: {
    status: '接続状態',
    unchecked: 'このWebページでは未判定',
    statusHint: '実際の接続状態はUnity Editor内のMCP for Unityパネルで確認してください。',
    eyebrow: '// START / RECOVER',
    headline: <>Unityと接続する。<br />壊れたら診断する。</>,
    tagline: 'このページでは、最初の接続とトラブル解決の2つを最短経路にします。機能紹介や内部アーキテクチャは、その後で確認できます。',
    connectKicker: '01 · CONNECT',
    connectTitle: 'Unityを接続する',
    connectBody: 'Packageを導入し、serverを起動し、MCP clientからUnity Editorへ到達できる状態にします。',
    connectCta: '接続手順を開く',
    diagnoseKicker: '02 · DIAGNOSE',
    diagnoseTitle: 'Failureを診断する',
    diagnoseBody: '症状とUnity versionからfailure候補を絞り、root cause、remedy、Evidenceまで辿ります。',
    diagnoseCta: 'Failure KBを開く',
    reference: 'ツールリファレンス',
    comparison: '他実装との比較',
    installSummary: 'Package URLが必要な場合',
    install: 'Unity Package Manager',
    installHint: 'Window → Package Manager → + → Add package from git URL',
    stableLabel: '安定版URL',
    betaLabel: 'ベータ版URL',
  },
  en: {
    status: 'CONNECTION STATUS',
    unchecked: 'NOT CHECKED BY THIS WEB PAGE',
    statusHint: 'Check the MCP for Unity panel inside the Unity Editor for the actual local connection state.',
    eyebrow: '// START / RECOVER',
    headline: <>Connect Unity.<br />Diagnose failures.</>,
    tagline: 'The homepage prioritizes the two jobs that matter first: establish the connection or recover from a failure. Capabilities and architecture come later.',
    connectKicker: '01 · CONNECT',
    connectTitle: 'Connect the Unity Editor',
    connectBody: 'Install the package, start the server, and make the Unity Editor reachable from your MCP client.',
    connectCta: 'Open connection guide',
    diagnoseKicker: '02 · DIAGNOSE',
    diagnoseTitle: 'Diagnose a failure',
    diagnoseBody: 'Start from the symptom and Unity version, then follow root cause, remedy, and evidence.',
    diagnoseCta: 'Open Failure KB',
    reference: 'Tool reference',
    comparison: 'Compare implementations',
    installSummary: 'Need the package URL?',
    install: 'Unity Package Manager',
    installHint: 'Window → Package Manager → + → Add package from git URL',
    stableLabel: 'stable URL',
    betaLabel: 'beta URL',
  },
};

export default function HomeHero() {
  const { siteConfig, i18n } = useDocusaurusContext();
  const version = siteConfig.customFields?.latestVersion ?? 'v10.0.0';
  const t = copy[i18n.currentLocale] ?? copy.ja;

  return (
    <header className={styles.hero}>
      <div className={styles.inner}>
        <section className={styles.statusPanel} aria-label={t.status}>
          <div>
            <span className={styles.statusKey}>{t.status}</span>
            <strong className={styles.statusValue}>{t.unchecked}</strong>
            <p className={styles.statusHint}>{t.statusHint}</p>
          </div>
          <span className={styles.version}>{version}</span>
        </section>

        <div className={styles.headingBlock}>
          <span className={styles.eyebrow}>{t.eyebrow}</span>
          <h1 className={styles.headline}>{t.headline}</h1>
          <p className={styles.tagline}>{t.tagline}</p>
        </div>

        <div className={styles.taskGrid} aria-label="Primary tasks">
          <Link className={styles.task + ' ' + styles.taskPrimary} to="/getting-started/install">
            <span className={styles.taskKicker}>{t.connectKicker}</span>
            <h2 className={styles.taskTitle}>{t.connectTitle}</h2>
            <p className={styles.taskBody}>{t.connectBody}</p>
            <span className={styles.taskCta}>{t.connectCta} <span aria-hidden="true">→</span></span>
          </Link>

          <Link className={styles.task} to="/failures">
            <span className={styles.taskKicker}>{t.diagnoseKicker}</span>
            <h2 className={styles.taskTitle}>{t.diagnoseTitle}</h2>
            <p className={styles.taskBody}>{t.diagnoseBody}</p>
            <span className={styles.taskCta}>{t.diagnoseCta} <span aria-hidden="true">→</span></span>
          </Link>
        </div>

        <nav className={styles.secondaryActions} aria-label="Secondary resources">
          <Link to="/reference/tools">{t.reference} →</Link>
          <Link to="/unity-mcp-comparison">{t.comparison} →</Link>
        </nav>

        <details className={styles.installDetails}>
          <summary>{t.installSummary}</summary>
          <div className={styles.install}>
            <div className={styles.installHeader}>
              <span className={styles.installLabel}>{t.install}</span>
              <span className={styles.installHint}>{t.installHint}</span>
            </div>
            <div className={styles.installLine}>
              <span className={styles.installChannel}>STABLE</span>
              <code className={styles.installUrl}>{UPM_MAIN}</code>
              <CopyButton text={UPM_MAIN} label={t.stableLabel} className={styles.installCopy} />
            </div>
            <div className={styles.installLine}>
              <span className={styles.installChannel}>BETA</span>
              <code className={styles.installUrl}>{UPM_BETA}</code>
              <CopyButton text={UPM_BETA} label={t.betaLabel} className={styles.installCopy} />
            </div>
          </div>
        </details>
      </div>
    </header>
  );
}
