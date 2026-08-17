---
id: python-layers
slug: /architecture/python-layers
title: Python serverの3つのsurface
sidebar_label: Pythonレイヤー
description: MCP tool、CLI command、resourceが同じC# Editor handlerへ接続する構造を説明します。
---

# Python serverの3つのsurface

`Server/src/`は3種類の外部surfaceを持ちます。利用者とinterfaceが異なるため、1つから他を自動生成するのではなく、同じC# handlerへ別経路で接続します。

| Surface | 場所 | Framework | 利用者 | Unityへの通信 |
|---|---|---|---|---|
| **MCP Tools** | `Server/src/services/tools/` | FastMCP / `@mcp_for_unity_tool` | AI assistant | WebSocket |
| **CLI Commands** | `Server/src/cli/commands/` | Click / `@click.command` | terminal user | HTTP |
| **Resources** | `Server/src/services/resources/` | FastMCP / `@mcp_for_unity_resource` | AI assistant、読み取り専用 | WebSocket |

MCP toolとCLI commandは最終的に`MCPForUnity/Editor/Tools/`のC# `HandleCommand`へ到達します。resourceはstate観測を目的とし、原則として変更操作を行いません。

## 3つに分ける理由

- **MCP tool** — LLMが読むtype / parameter descriptionとsession routingが必要
- **CLI** — shell向けoption、default、error表示が必要
- **resource** — 繰り返し読み取りやすい軽量interfaceが必要

consumerが違うため、無理に同一interfaceへ寄せるより、domain単位で対称な実装を維持します。

## 新しいdomainを追加する場合

例えば`manage_navigation`なら、概ね次を追加します。

```text
Server/src/services/tools/manage_navigation.py
Server/src/cli/commands/navigation.py
MCPForUnity/Editor/Tools/ManageNavigation.cs
```

MCP tool / CLIは別interfaceですが、同じC# handlerを利用します。

## MCP toolの登録

`Server/src/services/tools/`を走査し、`@mcp_for_unity_tool`付きfunctionをserver startup時にregistryへ登録します。このregistryは`tools/generate_docs_reference.py`がtool referenceを生成する際にも使用します。

`group`はsession単位のtool可視性を制御します。詳細は[ツールグループ](/guides/tool-groups)を参照してください。

## surfaceごとの差分

- MCP tool — parameter normalization、telemetry、session単位instance routing
- CLI — terminal向けerror処理とasync coreの同期wrapper
- resource — read-only hot pathとしてmiddlewareを最小化

## server entry point

`Server/src/main.py`は概ね次を行います。

1. FastMCP serverを構築
2. toolを登録
3. resourceを登録
4. HTTP時のWebSocket hubを準備
5. middlewareを設定
6. HTTP / stdio transportを起動

実装を見る場合は`Server/src/services/registry/`、`Server/src/transport/`、`MCPForUnity/Editor/Tools/`を起点にすると追いやすくなります。
