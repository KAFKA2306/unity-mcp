import React from 'react';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import styles from './styles.module.css';

export default function HomeArchitecture() {
  const { i18n } = useDocusaurusContext();
  const ja = i18n.currentLocale !== 'en';

  return (
    <section className={styles.section}>
      <div className={styles.inner}>
        <div className={styles.header}>
          <span className={styles.eyebrow}>{ja ? '// アーキテクチャ' : '// ARCHITECTURE'}</span>
          <h2 className={styles.title}>{ja ? '仕組み' : 'How it works'}</h2>
          <p className={styles.lede}>
            {ja
              ? '3つの層、2つの通信方式、1つのUnity Editorで構成されます。MCPクライアントはUnityへ直接接続せず、中間のPythonサーバーがルーティング、セッション分離、C# Editorプラグインとの通信を担当します。'
              : 'Three layers, two transports, one Unity Editor. Your MCP client never talks to Unity directly — the Python server in the middle handles routing, session isolation, and the chatter with the C# Editor plugin.'}
          </p>
        </div>

        <div
          className={styles.diagram}
          role="img"
          aria-label={ja
            ? 'MCP for Unityの構成図。MCPクライアントがstdioまたはHTTPでPythonサーバーへ接続し、PythonサーバーがWebSocketでUnity Editorプラグインと通信します。'
            : 'MCP for Unity architecture diagram: MCP client connects to the Python server over stdio or HTTP, which talks to the Unity Editor plugin over WebSocket.'}
        >
          <Stage
            kicker={ja ? 'レイヤー 01' : 'LAYER 01'}
            title="MCP Client"
            sub="Claude · Codex · VS Code · Cursor · local LLMs"
            body={ja
              ? 'Model Context Protocolを使用し、ツールとリソースを検出して要求を送り、結果を表示します。'
              : 'Speaks the Model Context Protocol. Discovers tools and resources, sends prompts, renders results.'}
            tone="filled"
          />
          <Edge label="stdio  ·  HTTP /mcp" />
          <Stage
            kicker={ja ? 'レイヤー 02' : 'LAYER 02'}
            title="Python Server"
            sub="FastMCP + WebSocket hub"
            body={ja
              ? '@mcp_for_unity_tool登録を自動検出し、client_idと選択中のUnityインスタンスに基づいてセッションごとにルーティングします。'
              : 'Auto-discovers @mcp_for_unity_tool registrations. Routes per-session via client_id and active instance. Hot-reloadable.'}
            tone="filled"
          />
          <Edge label="WebSocket  ·  /hub/plugin" />
          <Stage
            kicker={ja ? 'レイヤー 03' : 'LAYER 03'}
            title="Unity Editor Plugin"
            sub="C# package · MCPForUnity"
            body={ja
              ? 'Unityのメインスレッドでコマンドを受け取り、Unity Editor APIを実行して構造化された結果を返します。'
              : 'Receives commands on the Unity main thread. Executes via Unity Editor APIs. Returns structured payloads.'}
            tone="outlined"
          />
        </div>

        <div className={styles.legend}>
          <span className={styles.legendItem}>
            <span className={`${styles.legendSwatch} ${styles.swatchFilled}`} />
            {ja ? 'PC上で実行' : 'Runs on your machine'}
          </span>
          <span className={styles.legendItem}>
            <span className={`${styles.legendSwatch} ${styles.swatchOutlined}`} />
            {ja ? 'Unity Editorプロセス内で実行' : 'Runs inside the Unity Editor process'}
          </span>
        </div>
      </div>
    </section>
  );
}

function Stage({ kicker, title, sub, body, tone }) {
  return (
    <div className={`${styles.stage} ${tone === 'outlined' ? styles.stageOutlined : styles.stageFilled}`}>
      <span className={styles.stageKicker}>{kicker}</span>
      <h3 className={styles.stageTitle}>{title}</h3>
      <p className={styles.stageSub}>{sub}</p>
      <p className={styles.stageBody}>{body}</p>
    </div>
  );
}

function Edge({ label }) {
  return (
    <div className={styles.edge} aria-hidden="true">
      <div className={styles.edgeLineHorizontal} />
      <div className={styles.edgeLineVertical} />
      <span className={styles.edgeLabel}>{label}</span>
    </div>
  );
}
