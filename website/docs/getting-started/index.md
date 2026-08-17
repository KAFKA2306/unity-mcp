---
id: index
slug: /getting-started
title: はじめに
sidebar_label: はじめに
description: Model Context Protocolを介してAIアシスタントからUnity Editorを操作するための概要です。
---

# はじめに

MCP for Unityは、Claude、Codex、VS Code、ローカルLLMなどのAIアシスタントとUnity Editorを[Model Context Protocol](https://modelcontextprotocol.io/introduction)で接続します。アセット管理、シーン操作、スクリプト編集、テスト実行、定型作業の自動化に必要なツールをLLMから利用できます。

![MCP for Unityでシーンを構築する例](https://raw.githubusercontent.com/CoplayDev/unity-mcp/beta/docs/images/building_scene.gif)

## できること

- **40以上のUnity Editorツール**をMCP経由で利用できます。`manage_scene`、`manage_script`、`manage_gameobject`、`manage_material`、`manage_physics`、`run_tests`などを含みます。
- **25以上の読み取り専用リソース**から状態を確認できます。`editor_state`、`gameobject_components`、`project_info`、`unity_instances`などを含みます。
- **主要なMCPクライアントを自動設定**できます。Claude Desktop、Claude Code、Cursor、VS Code、Windsurf、Cline、Codex、Qwen、Gemini CLI、Copilot CLI、OpenClawなどに対応します。
- **複数Unityインスタンス**を1つのセッションから操作できます。`set_active_instance`で対象を切り替えられます。
- **2つの通信方式**に対応します。HTTPは複数クライアント・複数エージェント向け、stdioは単一クライアント向けです。

## 主な用途

- 自然言語からシーンやゲームプレイを試作する。
- プロジェクトの文脈を使ってC#スクリプトを生成・修正し、検証する。
- アセットの一括処理、シーン検証、回帰テストなど、Unity Editor内の反復作業を自動化する。
- MCPを基盤に独自のAI連携Editorツールを構築する。

## 次に読む

- **[インストール](./install.md)** — Unity packageとPython serverを導入し、最初のMCPクライアントを接続します。
- **[最初のプロンプト](./first-prompt.md)** — 「赤いCubeを作る」までを一通り実行します。
- **[MCPクライアントを選ぶ](./clients.md)** — 対応クライアントの違いを比較します。

---

MITライセンス。上流プロジェクトは[Aura](https://www.tryaura.dev/)の支援・保守によるもので、Unity Technologiesとは提携していません。
