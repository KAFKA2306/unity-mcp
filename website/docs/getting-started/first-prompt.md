---
id: first-prompt
slug: /getting-started/first-prompt
title: 最初のプロンプト
sidebar_label: 最初のプロンプト
description: MCPクライアントから指示を送り、Unityシーンに結果が反映されるまでを一通り確認します。
---

# 最初のプロンプト

packageの導入とMCPクライアントの接続が終わったら、実際にUnityを操作します。

## 前提条件

- [インストール](./install)が完了している
- MCP for Unityのstatus panelが `Connected` になっている
- Unity Editorで何らかのsceneが開かれている。空sceneでも構いません

## プロンプト

Claude Desktop、CursorなどのMCPクライアントから次のように指示します。

> 現在のシーンに赤・青・黄のCubeを作り、X軸方向に1 unitずつ離して配置してください。

AIアシスタントは概ね次の処理を行います。

1. `manage_scene` または `find_gameobjects` で現在のsceneを確認する
2. `manage_gameobject` を3回呼び、Cubeを作成する
3. `manage_material` で色付きmaterialを作成または割り当てる
4. `manage_components` で各CubeのMeshRendererへmaterialを設定する

## Unityで確認する

**Hierarchy** に3つのCubeが追加されます。Scene viewへ切り替えると、横に並んだCubeを確認できます。materialが正しく設定されていれば赤、青、黄で表示されます。

Cubeは作られたのにmaterialが灰色の場合、URP / HDRPのshader選択が合っていない可能性があります。例えば次のように明示します。

> このプロジェクトはURPです。URP/Lit shaderを使ってください。

## 続けて試す

同じセッションで指示を追加できます。

> Directional Lightが無ければ追加し、(0, 2, -5) にPerspective Cameraを置いてCubeを見る向きにしてください。

> 赤いCubeを上下0.5 unitの幅で往復させるC# scriptを書き、そのCubeへ追加してPlay Modeに入ってください。

> EditModeの全テストを実行し、失敗したテストを報告してください。

これらは異なるツール群を使用します。objectやscript操作は`core`、Editor状態の操作も`core`、テスト実行は`testing`です。必要に応じて`testing` groupを有効化してください。詳細は[ツールグループ](/guides/tool-groups)を参照します。

## うまく動かない場合

- **`I couldn't find any Unity instance`** — serverからUnityへ到達できていません。status panelを確認します。
- **`Multiple Unity instances detected`** — 複数のEditorが開いています。[複数Unityインスタンス](/guides/multi-instance)を参照します。
- **tool callは成功するがsceneが変化しない** — 対象tool groupが非表示になっている可能性があります。AIアシスタントに `manage_tools` の `list_groups` を呼ぶよう指示し、利用可能なgroupを確認します。

## 次に読む

- [MCPクライアントを選ぶ](./clients) — クライアントごとの機能差
- [ツールグループ](/guides/tool-groups) — vfx、animation、ui、testingなどの有効化
- [ツールリファレンス](/reference/tools) — 利用可能なtoolとparameter
