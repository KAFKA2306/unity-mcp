---
id: clients
slug: /getting-started/clients
title: MCPクライアントを選ぶ
sidebar_label: MCPクライアント
description: MCP for Unityが自動設定できるMCPクライアントの違いを比較します。
---

# MCPクライアントを選ぶ

MCP for UnityはPC上で検出した対応クライアントを自動設定できます。用途に合うものを選ぶための主な違いをまとめます。

## 機能比較

| クライアント | 通信方式 | 自動設定 | Streaming reasoning | 無料枠 | 補足 |
|---|---|---|---|---|---|
| **Claude Desktop** | stdioのみ | 対応 | 対応 | あり（制限あり） | 導入が簡単。全体でHTTPを選んでいてもClaude Desktopにはstdioが設定されます。 |
| **Claude Code** | HTTP | 対応 | 対応 | Anthropic planが必要 | 複数toolを使うworkflowに向きます。 |
| **Cursor** | HTTP | 対応 | 対応 | 一部あり | 自動設定後、Cursor側のMCP設定で有効化が必要です。 |
| **VS Code (Copilot)** | HTTP | 対応 | 対応 | Copilot契約に依存 | `mcpServers`ではなく`servers`へ設定します。 |
| **Windsurf** | HTTP | 対応 | 対応 | あり | 設定後に自動接続します。 |
| **Cline** | HTTP | 対応 | 対応 | あり | 設定後に自動接続します。 |
| **GitHub Copilot CLI** | HTTP | 対応 | 対応 | Copilot契約に依存 | terminalで利用するagentです。 |
| **Codex** | HTTP | 対応 | 対応 | OpenAI planに依存 | 自動接続します。 |
| **Qwen Code** | HTTP | 対応 | 対応 | あり | 自動接続します。 |
| **Gemini CLI** | HTTP | 対応 | 対応 | あり | 自動接続します。 |
| **OpenClaw** | HTTP / stdio | 対応 | 対応 | あり | `openclaw-mcp-bridge` pluginが必要です。MCP for Unity側の通信方式に従います。 |
| **Antigravity** | HTTP | 対応 | 対応 | 提供条件による | Antigravity側でMCPを有効化する必要があります。 |

## 選び方

- **まず簡単に動かしたい**: Claude Desktop。stdioのためport競合やfirewall設定を避けやすい構成です。
- **複数agentやremote環境で使いたい**: HTTP対応クライアント。複数クライアントで1つのPython serverを共有できます。[複数Unityインスタンス](/guides/multi-instance)も参照してください。
- **IDE内で完結したい**: Cursor、VS Code Copilot、Cline。
- **terminal中心で使いたい**: Claude Code、Copilot CLI、Codex、Gemini CLI、Qwen Code。

## 手動設定

offline環境やsandboxなどで自動設定できない場合は、[インストール](./install)の**MCPクライアントを手動設定する**にある設定例をクライアントのMCP設定ファイルへ追加します。

## クライアント側で追加操作が必要なもの

- **Cursor** → Settings → MCP → `unityMCP` serverを有効化
- **Antigravity** → Settings → MCP servers → 有効化
- **OpenClaw** → `openclaw-mcp-bridge` pluginを有効化

その他の対応クライアントは、通常は設定後の次回起動から接続します。

## package更新後

**Window → MCP for Unity → Configure All Detected Clients** を再実行できます。設定処理は再実行しても同じ結果になるよう設計されています。
