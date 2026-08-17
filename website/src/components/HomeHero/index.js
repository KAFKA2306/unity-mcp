import React from 'react';
import Link from '@docusaurus/Link';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import CopyButton from '@site/src/components/CopyButton';
import styles from './styles.module.css';

const UPM_MAIN = 'https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main';
const UPM_BETA = 'https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#beta';

const copy = {
  ja: {
    status: '状態',
    operational: '正常稼働',
    headline: <>AIアシスタントから<br />Unity Editorを<em>動かす</em>。</>,
    tagline: 'MCP for UnityはModel Context Protocolを介して、Claude、Codex、VS Code、ローカルLLMなどのAIアシスタントとUnity Editorを接続します。アセット管理、シーン操作、スクリプト編集、テスト実行、定型作業の自動化を自然言語から行えます。',
    start: '使い始める',
    reference: 'リファレンスを見る',
    install: '// インストール · Unity Package Manager',
    installHint: 'Window → Package Manager → + → Add package from git URL',
    stableLabel: '安定版URL',
    betaLabel: 'ベータ版URL',
    live: '// 実演',
    demo: 'MCPクライアントがUnityシーンを構築する一連の流れ',
    videoLabel: 'MCP for Unityを介してLLMがUnityシーンを構築するデモ',
  },
  en: {
    status: 'STATUS',
    operational: 'OPERATIONAL',
    headline: <>Run the Unity Editor<br />with your <em>AI&nbsp;assistant</em>.</>,
    tagline: 'MCP for Unity bridges AI assistants — Claude, Codex, VS Code, local LLMs, and more — with the Unity Editor via the Model Context Protocol. Manage assets, control scenes, edit scripts, run tests, and automate workflows.',
    start: 'Get started',
    reference: 'Browse the reference',
    install: '// INSTALL · Unity Package Manager',
    installHint: 'Window → Package Manager → + → Add package from git URL',
    stableLabel: 'stable URL',
    betaLabel: 'beta URL',
    live: '// LIVE',
    demo: 'an MCP client building a scene, end-to-end',
    videoLabel: 'An LLM building a Unity scene through MCP for Unity',
  },
};

export default function HomeHero() {
  const { siteConfig, i18n } = useDocusaurusContext();
  const version = siteConfig.customFields?.latestVersion ?? 'v10.0.0';
  const t = copy[i18n.currentLocale] ?? copy.ja;

  return (
    <header className={styles.hero}>
      <div className={styles.gridBackdrop} aria-hidden="true" />

      <div className={styles.inner}>
        <div className={styles.statusBar}>
          <span className={styles.statusDot} aria-hidden="true" />
          <span className={styles.statusKey}>{t.status}</span>
          <span className={styles.statusValue}>{t.operational} · {version}</span>
        </div>

        <h1 className={styles.headline}>{t.headline}</h1>

        <p className={styles.tagline}>{t.tagline}</p>

        <div className={styles.ctaRow}>
          <Link className={styles.ctaPrimary} to="/getting-started/install">
            {t.start}
            <span className={styles.ctaArrow} aria-hidden="true">↗</span>
          </Link>
          <Link className={styles.ctaSecondary} to="/reference/tools">
            {t.reference}
            <span className={styles.linkArrow} aria-hidden="true">→</span>
          </Link>
        </div>

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
            <span className={`${styles.installChannel} ${styles.installChannelBeta}`}>BETA</span>
            <code className={styles.installUrl}>{UPM_BETA}</code>
            <CopyButton text={UPM_BETA} label={t.betaLabel} className={styles.installCopy} />
          </div>
        </div>

        <figure className={styles.demo}>
          <figcaption className={styles.demoCaption}>
            <span className={styles.demoTag}>{t.live}</span>
            <span>{t.demo}</span>
          </figcaption>
          <div className={styles.demoFrame}>
            <video
              autoPlay
              loop
              muted
              playsInline
              preload="metadata"
              poster="/unity-mcp/img/logo.png"
              aria-label={t.videoLabel}
              width="640"
              height="416"
            >
              <source src="/unity-mcp/img/building_scene.webm" type="video/webm" />
              <source src="/unity-mcp/img/building_scene.mp4" type="video/mp4" />
              <img
                src="/unity-mcp/img/building_scene.gif"
                alt={t.videoLabel}
                width="640"
                height="416"
                loading="lazy"
              />
            </video>
          </div>
        </figure>
      </div>
    </header>
  );
}
