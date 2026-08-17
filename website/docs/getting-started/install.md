---
id: install
slug: /getting-started/install
title: インストール
sidebar_label: インストール
description: MCP for UnityをUnityプロジェクトへ追加し、MCPクライアントを接続します。
---

# インストール

3つの導入方法があります。まず試すだけなら **Git URL** が最短です。

## 前提条件

- **Unity 2021.3 LTS以降** — [Unityをダウンロード](https://unity.com/download)
- **Python 3.10以降** と [`uv`](https://docs.astral.sh/uv/getting-started/installation/) — 未導入の場合はセットアップウィザードから案内されます
- **MCPクライアント** — [Claude Desktop](https://claude.ai/download)、[Claude Code](https://docs.anthropic.com/en/docs/claude-code)、[Cursor](https://www.cursor.com/)、[VS Code Copilot](https://code.visualstudio.com/docs/copilot/overview)、[GitHub Copilot CLI](https://docs.github.com/en/copilot/concepts/agents/about-copilot-cli)、[Windsurf](https://windsurf.com/)、[Cline](https://cline.bot/)、[OpenClaw](https://openclaw.ai/)など

## 方法1 — Git URL

Unityで **Window → Package Manager** を開き、**`+`** → **Add package from git URL...** を選び、次のURLを貼り付けます。

```text
https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main
```

最新のbeta機能を使う場合は `beta` branchを指定します。

```text
https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#beta
```

## 方法2 — Unity Asset Store

1. [Asset StoreのMCP for Unity](https://assetstore.unity.com/packages/tools/generative-ai/mcp-for-unity-ai-driven-development-329908)を開きます。
2. **Add to My Assets** を選びます。
3. **Window → Package Manager → My Assets** からimportします。

## 方法3 — OpenUPM

```bash
openupm add com.coplaydev.unity-mcp
```

## serverを起動して接続する

import後、MCP for Unityの**セットアップウィザード**が自動的に開きます。

1. Pythonと`uv`が導入済みか確認します。未導入の場合はウィザードの案内に従います。
2. 依存関係が正常になったら **Done** を押します。PC上で検出されたMCPクライアントの一覧が表示されます。
3. 設定したいクライアントを選び、**Configure Selected** を押します。

以後は **Window → MCP for Unity** からserverの起動・停止、通信方式（HTTP / stdio）の切り替え、クライアントの再設定を行えます。接続できるとstatus panelに `Connected` と表示されます。

### 最初に試すプロンプト

MCPクライアントから例えば次のように指示します。

> 現在のシーンに赤・青・黄のCubeを作り、X軸方向に1 unitずつ離して配置してください。

> WASD移動と二段ジャンプを持つ簡単なplayer controllerを作ってください。

> `Assets/Scripts` 内の全scriptを一覧化し、`Rigidbody`を参照しているものを教えてください。

## クライアントごとの注意点

- **Claude Desktop** はstdioのみ対応します。全体設定でHTTPを選んでいても、MCP for UnityはClaude Desktop用にはstdioを設定します。
- **Cursor、Antigravity、OpenClaw** は自動設定後、各クライアント側でMCPまたはpluginを有効化する必要があります。
- **OpenClaw** は `openclaw-mcp-bridge` pluginも必要で、MCP for Unityで現在選択されている通信方式に従います。
- **Claude Code、VS Code、Windsurf、Cline、CLI系クライアント** は設定後に自動接続します。

詳細は[MCPクライアント設定ガイド](/guides/client-configurators)を参照してください。

## MCPクライアントを手動設定する

自動設定が使えない場合は、各クライアントのMCP設定ファイルへ以下を追加します。

### HTTP（既定 — Cursor、Windsurf、Antigravity、VS Code、Clineなど）

```json
{
  "mcpServers": {
    "unityMCP": {
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

### VS Code

```json
{
  "servers": {
    "unityMCP": {
      "type": "http",
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

### Stdio（Claude Desktop、またはHTTP非対応クライアント）

**macOS / Linux:**

```json
{
  "mcpServers": {
    "unityMCP": {
      "command": "uvx",
      "args": ["--from", "mcpforunityserver", "mcp-for-unity", "--transport", "stdio"]
    }
  }
}
```

**Windows:**

```json
{
  "mcpServers": {
    "unityMCP": {
      "command": "C:/Users/YOUR_USERNAME/AppData/Local/Microsoft/WinGet/Links/uvx.exe",
      "args": ["--from", "mcpforunityserver", "mcp-for-unity", "--transport", "stdio"]
    }
  }
}
```

## トラブルシューティング

- **Unity Bridgeが接続しない** — **Window → MCP for Unity** を開いてstatus panelを確認します。必要ならUnityを再起動します。
- **serverが起動しない** — terminalで `uv --version` が動作するか確認し、MCP for Unityのlogを確認します。
- **クライアントが接続しない** — HTTP serverが `localhost:8080` で起動していることと、クライアント設定のURLが一致していることを確認します。

Cursor / VS Code / Windsurf / Claude Codeの詳細なトラブルシューティングは[GitHub Wiki](https://github.com/CoplayDev/unity-mcp/wiki)も参照できます。

解決しない場合は[KAFKA2306/unity-mcpのIssue](https://github.com/KAFKA2306/unity-mcp/issues)を作成するか、上流コミュニティの[Discord](https://discord.gg/y4p8KfzrN4)を確認してください。
