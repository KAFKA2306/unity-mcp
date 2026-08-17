---
id: cli
slug: /reference/cli
title: CLIリファレンス
sidebar_label: CLI
 description: unity-mcp CLIの起動方法、共通option、MCP toolとの対応を説明します。
---

# CLIリファレンス

`mcp-for-unity` / `unity-mcp` CLIは、MCP toolと同じUnity側C# handlerへterminalからアクセスするためのinterfaceです。MCPとCLIを分ける理由は[Python serverの3つのsurface](/architecture/python-layers)を参照してください。

## 起動

```bash
# installせずuvxで実行
uvx --from mcpforunityserver mcp-for-unity <command> [args]

# Server checkoutから実行
cd Server && uv run mcp-for-unity <command> [args]

# alias
uvx --from mcpforunityserver unity-mcp <command> [args]
```

## Unityへの通信

CLIはPython serverのHTTP endpoint（既定`http://127.0.0.1:8080`）を使用します。Python serverからUnity EditorへはWebSocket経由でcommandを送ります。

## 共通option

| Option | 既定 | 内容 |
|---|---|---|
| `--host` | `127.0.0.1` | Python server host |
| `--port` | `8080` | Python server port |
| `--instance` | 自動 | 対象Unity instance |
| `--format` | `text` | `text` / `json` |
| `--verbose`, `-v` | off | request / response詳細を表示 |
| `--version` | — | CLI versionを表示 |
| `--help` | — | helpを表示 |

複数instanceは[複数Unityインスタンス](/guides/multi-instance)を参照してください。

## 主なcommand groupと対応MCP tool

| CLI group | 内容 | 対応tool |
|---|---|---|
| `instance` | instance一覧・選択 | `set_active_instance` |
| `scene` | scene操作 | `manage_scene` |
| `gameobject` | GameObject操作 | `manage_gameobject` |
| `component` | component操作 | `manage_components` |
| `script` | C# script操作 | `manage_script`系 |
| `asset` | asset操作 | `manage_asset` |
| `material` | material操作 | `manage_material` |
| `prefab` | Prefab操作 | `manage_prefabs` |
| `texture` | texture生成 | `manage_texture` |
| `shader` | shader操作 | `manage_shader` |
| `vfx` | VFX操作 | `manage_vfx` |
| `camera` | Camera / Cinemachine | `manage_camera` |
| `graphics` | render pipeline / lighting | `manage_graphics` |
| `physics` | 2D / 3D physics | `manage_physics` |
| `animation` | Animator / AnimationClip | `manage_animation` |
| `ui` | UI Toolkit | `manage_ui` |
| `build` | Player build | `manage_build` |
| `editor` | Editor state / test等 | `manage_editor`ほか |
| `packages` | UPM package操作 | `manage_packages` |
| `probuilder` | ProBuilder | `manage_probuilder` |
| `profiler` | Profiler | `manage_profiler` |
| `code` | C#実行 | `execute_code` |
| `batch` | 複数operation | `batch_execute` |
| `tool` | tool group可視性 | `manage_tools` |
| `reflect` | Unity API reflection | `unity_reflect` |
| `docs` | Unity docs取得 | `unity_docs` |

## optionの正本

各command自身のhelpを最終的な正本とします。

```bash
mcp-for-unity --help
mcp-for-unity scene --help
mcp-for-unity scene load --help
```

詳細な実行例は[CLI使用例](/guides/cli-examples)を参照してください。

実装:
- `Server/src/cli/commands/`
- `Server/src/cli/main.py`
