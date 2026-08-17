---
title: 開発環境
sidebar_label: 開発環境
description: MCP for Unityのrepository構造、local server、package source、tool/resource開発の基本です。
---

# 開発環境

feature / fixは`beta`からbranchを作り、`beta`向けPRにします。`main`はstable release用です。

大きな変更は、既存Issue・Discussion・PRと重複していないか確認してから進めます。bug fixではUnity version、package source、Git URLの場合のresolved commit、実行したtestをPRへ残します。

## repository構造

- `MCPForUnity/` — Unity package。Editor UI、C# tool / resource、compatibility helper、package metadata
- `Server/` — Python MCP server、CLI、FastMCP registry、transport、server test
- `TestProjects/UnityMCPTests/` — Unity EditMode / PlayMode test project
- `website/` — Docusaurus documentation
- `tools/` — build、release、docs generation、stress / test helper
- `CustomTools/` — project-defined custom toolのexample

## Python serverを準備する

CIと同じ基本pathを使います。

```bash
cd Server
uv sync
uv pip install -e ".[dev]"
uv run pytest tests/ -v --tb=short
```

多くのPython unit testはUnityを起動せずに実行できます。Editor integration testはbridge接続済みUnity instanceが必要です。

## local serverをUnityから使う

1. **Window → MCP for Unity** を開く
2. **Settings → Advanced Settings** を開く
3. **Server Source Override**へlocal `Server/` pathを指定する
4. 必要なら**Dev Mode (Force fresh server install)**を有効化する

server code変更を毎回確実に読み直したい場合に使います。

## Unity package sourceを切り替える

```bash
python mcp_source.py
```

用途に応じてstable upstream、beta upstream、remote branch、local workspaceを選びます。Unity package codeを開発する場合はlocal workspaceが最短です。

Git URLのbranch名だけを見ると実際にresolveされたcommitが分からないため、debug時は`Packages/manifest.json`と`Packages/packages-lock.json`の両方を確認します。

`Library/PackageCache/`を直接開発対象として編集しません。Unityのresolveで上書きされます。

## tool / resourceを追加する

built-in toolは通常2層あります。

```text
MCPForUnity/Editor/Tools/       # C# handler
Server/src/services/tools/      # Python MCP tool
```

resourceも同様です。

```text
MCPForUnity/Editor/Resources/
Server/src/services/resources/
```

Unity側は`[McpForUnityTool]` / `[McpForUnityResource]`、Python側は`@mcp_for_unity_tool` / `@mcp_for_unity_resource`を使用します。

長時間処理はbridgeをblockingせず、既存の`PendingResponse` / polling patternを使います。

## tool visibility

一般toolはgroupへ所属し、既定では`core`を中心に表示します。session単位の切り替えは`manage_tools`を使います。詳しくは[ツールグループ](/guides/tool-groups)を参照してください。

HTTPではtool list changeをconnected clientへ通知できます。stdioでは`manage_tools(action="sync")`またはsession再起動で同期します。

## test

Python:

```bash
cd Server
uv run pytest tests/ -v
```

Unity側:

```text
TestProjects/UnityMCPTests/Assets/Tests/
```

headless harness:

```bash
python tools/local_harness.py
```

Unity version compatibility:

```bash
tools/check-unity-versions.sh
tools/check-unity-versions.sh --full
```

詳細は[テスト](/contributing/testing)を参照してください。

## generated docs

tool / resource registryを変更した場合:

```bash
cd Server
uv run python ../tools/generate_docs_reference.py
```

`website/docs/reference/`のgenerated領域を手動で独立変更しません。

## 開発時によくある問題

- **古いGit packageを読む** — `packages-lock.json`のresolved hashを確認し、Unityを閉じてから必要最小限のcacheだけを整理する
- **Safe Modeになる** — package compile errorを先に修正する。MCP serverはcompile前のfailureを回復できない
- **server code変更が反映されない** — Server Source OverrideとDev Modeを確認する
- **stdioのtool visibilityが古い** — `manage_tools(action="sync")`またはsession再起動
- **複数Editorを開いている** — `mcpforunity://instances`と`set_active_instance`で対象を明示する

現在のworkflow、Unity version matrix、tool group一覧など時間とともに変わる情報は、docsへ複製しすぎずcode / `.github/workflows/` / `tools/unity-versions.json`を正本として確認します。
