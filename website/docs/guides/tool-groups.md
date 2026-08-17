---
id: tool-groups
slug: /guides/tool-groups
title: Tool Groupとmanage_tools
sidebar_label: ツールグループ
description: 47 toolのセッション単位の可視性を管理し、必要なgroupだけを有効化します。
---

# Tool Group

MCP for Unityには47 toolがありますが、すべてを常にLLMへ公開するとpromptが大きくなり、tool選択も曖昧になります。そのためtoolを**group**へ分け、既定では`core`だけを有効にします。

## group一覧

| Group | 既定 | 内容 |
|---|---|---|
| `core` | 有効 | scene、script、asset、Editorの基本tool。常時有効です。 |
| `animation` | 無効 | Animator操作、AnimationClip作成。 |
| `ui` | 無効 | UI Toolkit — UXML、USS、UIDocument。 |
| `vfx` | 無効 | VFX Graph、shader、procedural texture。 |
| `scripting_ext` | 無効 | ScriptableObject管理。 |
| `testing` | 無効 | Test runnerと非同期test job。 |
| `probuilder` | 無効 | ProBuilderによる3D modeling。`com.unity.probuilder` packageが必要です。 |
| `profiling` | 無効 | Profiler session、counter、memory snapshot、Frame Debugger。 |
| `docs` | 無効 | Unity API reflectionとdocumentation lookup。 |

## groupを有効化する

promptから`manage_tools` meta-toolを使います。

> shaderを作るため`vfx` groupを有効化してください。

AIアシスタントは次を呼びます。

```
manage_tools(action="activate", group="vfx")
```

有効化すると、そのgroupのtoolが次回以降のtool一覧へ現れ、同じsession中で利用できます。

## 利用可能なgroupを確認する

```
manage_tools(action="list_groups")
```

各groupの有効状態とtool名を返します。

## 無効化する

```
manage_tools(action="deactivate", group="vfx")
```

使っていないgroupのtoolが選択を迷わせる場合に有効です。例えば`manage_shader`と`manage_material`を同時に必要としない作業では、不要なgroupを隠すことで選択肢を減らせます。

## その他のaction

- `sync` — Unity Editor側のtool toggle UIの状態を現在のsessionへ反映します。`Window > MCP for Unity > Tools`で変更した後に使います。
- `reset` — 既定状態（`core`のみ有効）へ戻します。

## この仕組みがある理由

1. **promptを小さくする** — visible toolが増えるほど各callで必要なtokenも増えます。
2. **tool選択を明確にする** — 不要な候補を隠すことで誤ったtoolを選びにくくします。
3. **package要件を分離する** — `probuilder`のtoolは`com.unity.probuilder`が必要です。未導入環境では既定で隠す方が明確です。

## server状態とsession状態

- Unity Editorにはserver側の可視性を制御するtool toggle UI（`Window > MCP for Unity > Tools`）があります。
- `manage_tools`は**session単位**の可視性を制御します。同じserverに接続していてもMCP sessionごとに異なるgroupを表示できます。

`sync`はEditor側のtoggle状態を現在のsessionへ同期します。

## 関連リファレンス

- [`manage_tools`](/reference/tools/core/manage_tools) — toolの詳細
- [`tool_groups` resource](/reference/resources) — group catalog
