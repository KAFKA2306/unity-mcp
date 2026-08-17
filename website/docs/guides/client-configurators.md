---
title: MCPクライアント設定の仕組み
sidebar_label: クライアント設定
description: MCP client configuratorの構造と新しいclientを追加する方法です。
---

# MCPクライアント設定の仕組み

MCP for Unityは、clientごとのconfig形式を**configurator class**へ分離しています。一般的なJSON clientと、Codex / Claude Code / OpenClawのような個別対応が必要なclientを同じregistryから扱います。

## 主要interfaceとbase class

- **`IMcpClientConfigurator`** — status確認、自動設定、manual snippet、導入手順を定義するcontract
- **`McpClientConfiguratorBase`** — 共通propertyとhelper
- **`JsonFileMcpConfigurator`** — JSON configを使う大半のclient向け
- **`CodexMcpConfigurator`** — TOML config向け
- **`ClaudeCliMcpConfigurator`** — CLIでMCP serverを登録するclient向け
- **`McpClient`** — client名、OS別config path、transport / JSON layoutなどの設定値
- **`McpClientRegistry`** — configuratorを自動検出するregistry

## 一般的なJSON clientを追加する

`MCPForUnity/Editor/Clients/Configurators`へpublic classを追加します。

```csharp
using System;
using System.Collections.Generic;
using System.IO;
using MCPForUnity.Editor.Models;

namespace MCPForUnity.Editor.Clients.Configurators
{
    public class MyClientConfigurator : JsonFileMcpConfigurator
    {
        public MyClientConfigurator() : base(new McpClient
        {
            name = "My Client",
            windowsConfigPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".myclient", "mcp.json"),
            macConfigPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".myclient", "mcp.json"),
            linuxConfigPath = Path.Combine(Environment.GetFolderPath(Environment.SpecialFolder.UserProfile), ".myclient", "mcp.json"),
        })
        { }

        public override IList<string> GetInstallationSteps() => new List<string>
        {
            "Open My Client and go to MCP settings",
            "Open or create the mcp.json file",
            "Configure MCP for Unity",
            "Restart My Client"
        };
    }
}
```

自動検出には次が必要です。

- `public`
- non-abstract class
- public parameterless constructor

追加のregistration listは不要です。

## `McpClient`で指定できる主な差分

- `windowsConfigPath` / `macConfigPath` / `linuxConfigPath`
- `SupportsHttpTransport` — HTTP対応可否
- `IsVsCodeLayout` — `servers` rootなどVS Code形式
- `HttpUrlProperty` — `url`または`serverUrl`など
- `EnsureEnvObject` / `StripEnvWhenNotRequired` — `env` objectの扱い
- `DefaultUnityFields` — `disabled: false`などclient固有の既定field

JSON生成の差分は`ConfigJsonBuilder`へ集約されているため、通常は`CheckStatus`、`Configure`、`GetManualSnippet`をoverrideする必要はありません。

## 特殊client

### Codex

`CodexMcpConfigurator`を使用します。通常は`~/.codex/config.toml`のようなTOMLを`CodexConfigHelper`で読み書きします。

### Claude Code

`ClaudeCliMcpConfigurator`を使用します。JSON fileではなく`claude mcp list/add/remove`で登録状態を管理します。

### Claude Desktop

JSON形式ですがstdioのみです。`SupportsHttpTransport = false`とtransport contractにより、全体設定がHTTPでもClaude Desktop向けにはstdioへcoerceして書き込みます。

### OpenClaw

`OpenClawConfigurator`が`~/.openclaw/openclaw.json`内の`openclaw-mcp-bridge`設定を扱います。HTTPでは`/mcp` endpoint、stdioでは`uvx ... --transport stdio`を設定します。

## Unityで検証する

1. Unityを開き **MCP for Unity** windowを表示する
2. 新しいclientが表示されることを確認する
3. **Check Status** で未設定 / 設定済みを確認する
4. **Configure** でconfigを書き込む
5. MCP clientを再起動し、Unityへ接続できることを確認する

## 原則

新しいclientがJSON形式なら、独自logicを増やす前に`JsonFileMcpConfigurator`と`McpClient`の既存fieldで表現できないか確認します。client固有の特殊処理は、標準形式で表せない場合だけ追加します。
