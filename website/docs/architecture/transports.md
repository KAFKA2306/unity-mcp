---
id: transports
slug: /architecture/transports
title: 通信方式
sidebar_label: 通信方式
description: HTTPとstdioの使い分け、session分離、network上の違いを説明します。
---

# 通信方式

MCP clientとPython serverの間は**HTTP**または**stdio**を使用します。選択によって複数client、remote hosting、instance routingの挙動が変わります。

## 選び方

| 用途 | 推奨 |
|---|---|
| 複数MCP clientで1つのserverを共有 | **HTTP** |
| 複数Unity instanceを1 clientから操作 | どちらでも可 |
| localで最小構成 | **stdio** |
| remote / container上のserver | **HTTP** |

## HTTP

1つのPython processに複数のMCP clientが接続し、Unity pluginとは`/hub/plugin` WebSocketで通信します。

```json
{
  "mcpServers": {
    "unityMCP": { "url": "http://localhost:8080/mcp" }
  }
}
```

主な特徴:

- 複数clientを同時接続できる
- active instance、tool groupなどをMCP session単位で分離できる
- remote hostingに対応できる
- instance指定は`Name@hash`を基本とする

local HTTPは既定でloopbackへbindします。LAN bindやremote URLは明示的なopt-inが必要です。

## stdio

MCP clientが専用Python processを起動し、stdin/stdoutで通信します。

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

主な特徴:

- HTTP port設定が不要
- clientごとにprocessが分かれる
- port numberによるinstance省略指定を利用できる
- remote hostingには使わない

Claude Desktopはstdioのみを使うため、全体設定がHTTPでもClaude Desktop向けconfigはstdioになります。

## instance状態

- **HTTP** — MCP session単位でactive instanceを保持する
- **stdio** — process-local stateとして保持する

詳細な操作は[複数Unityインスタンス](/guides/multi-instance)を参照してください。

## 切り替え

Unity Editorで **Window → MCP for Unity → Settings** からHTTP / stdioを選び、**Configure All Detected Clients** を実行します。既存MCP clientは再起動して設定を読み直します。

## 実装箇所

- Python transport: `Server/src/transport/`
- C# transport / server management: `MCPForUnity/Editor/Services/`
