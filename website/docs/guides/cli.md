---
title: Unity MCP CLI
sidebar_label: CLI
description: local HTTP経由でUnity Editorを操作するunity-mcp CLIの使い方です。
---

# Unity MCP CLI

`unity-mcp` CLIは、MCP for UnityのHTTP serverへcommandを送り、terminalからUnity Editorを操作します。現行CLIは**local HTTP**向けです。

## 導入

```bash
cd Server
pip install -e .
# または
uv pip install -e .
```

## 最初に確認する

```bash
unity-mcp status
unity-mcp instance list
unity-mcp scene hierarchy
unity-mcp gameobject find "Player"
```

## 共通option

| Option | Environment variable | 内容 |
|---|---|---|
| `-h, --host` | `UNITY_MCP_HOST` | server host。既定`127.0.0.1` |
| `-p, --port` | `UNITY_MCP_HTTP_PORT` | server port。既定`8080` |
| `-t, --timeout` | `UNITY_MCP_TIMEOUT` | timeout秒。既定`30` |
| `-f, --format` | `UNITY_MCP_FORMAT` | `text` / `json` / `table` |
| `-i, --instance` | `UNITY_MCP_INSTANCE` | 対象Unity instance |

## instance

```bash
unity-mcp instance list
unity-mcp instance set "ProjectName@abc123"
unity-mcp instance current
```

1 commandだけ対象を指定する場合:

```bash
unity-mcp --instance "ProjectName@abc123" scene hierarchy
```

## scene / GameObject

```bash
unity-mcp scene hierarchy --limit 20 --depth 3
unity-mcp scene active
unity-mcp scene load "Assets/Scenes/Main.unity"
unity-mcp scene save

unity-mcp gameobject find "Player"
unity-mcp gameobject create "NewCube" --primitive Cube
unity-mcp gameobject modify "Cube" --position 1 2 3 --rotation 0 45 0
unity-mcp gameobject delete "OldObject" --force
unity-mcp gameobject duplicate "Template"
```

## component / script / code search

```bash
unity-mcp component add "Player" Rigidbody
unity-mcp component remove "Player" Rigidbody
unity-mcp component set "Player" Rigidbody mass 10

unity-mcp script create "PlayerController" --path "Assets/Scripts"
unity-mcp script read "Assets/Scripts/Player.cs"
unity-mcp script delete "Assets/Scripts/Old.cs" --force
unity-mcp code search "TODO|FIXME" "Assets/Scripts/Utils.cs"
```

## Editor操作

```bash
unity-mcp editor play
unity-mcp editor pause
unity-mcp editor stop
unity-mcp editor refresh --compile
unity-mcp editor console
unity-mcp editor console --clear
unity-mcp editor tests --mode EditMode
unity-mcp editor tests --mode PlayMode --async
unity-mcp editor poll-test <job_id> --wait 60 --details
```

## screenshot / camera

```bash
unity-mcp camera screenshot --file-name "capture"
unity-mcp camera screenshot --camera-ref "MainCam" --include-image --max-resolution 512
unity-mcp camera screenshot --batch surround --max-resolution 256
unity-mcp camera screenshot --batch orbit --view-target "Player"
unity-mcp camera screenshot --capture-source scene_view --view-target "Canvas" --include-image
unity-mcp camera screenshot-multiview --view-target "Player" --max-resolution 480
```

Cinemachine操作例:

```bash
unity-mcp camera list
unity-mcp camera create --name "Cam" --preset follow --follow "Player"
unity-mcp camera set-target "Cam" --follow "Player" --look-at "Enemy"
unity-mcp camera set-lens "Cam" --fov 60 --near 0.1 --far 1000
unity-mcp camera ensure-brain --blend-style "EaseInOut" --blend-duration 1.5
```

## asset / prefab / material / shader

```bash
unity-mcp asset search --pattern "*.mat" --path "Assets/Materials"
unity-mcp asset info "Assets/Materials/Red.mat"
unity-mcp asset mkdir "Assets/NewFolder"

unity-mcp prefab open "Assets/Prefabs/Player.prefab"
unity-mcp prefab create "Player" --path "Assets/Prefabs"
unity-mcp prefab modify "Assets/Prefabs/Player.prefab" --set-property "Rigidbody.mass=5"

unity-mcp material create "Assets/Materials/Red.mat"
unity-mcp material set-color "Assets/Materials/Red.mat" 1 0 0
unity-mcp material assign "Assets/Materials/Red.mat" "Cube"

unity-mcp shader create "MyShader" --path "Assets/Shaders"
unity-mcp shader read "Assets/Shaders/Custom.shader"
```

## graphics / package / VFX / ProBuilder

```bash
unity-mcp graphics pipeline-info
unity-mcp graphics stats
unity-mcp graphics bake-start --sync
unity-mcp graphics feature-list

unity-mcp packages list
unity-mcp packages search "cinemachine"
unity-mcp packages add "com.unity.cinemachine"
unity-mcp packages remove "com.unity.cinemachine" --force

unity-mcp vfx particle info "Fire"
unity-mcp vfx particle play "Fire" --with-children

unity-mcp probuilder create-shape Cube
unity-mcp probuilder info "MyCube"
```

ProBuilder commandはUnity projectに`com.unity.probuilder`が必要です。VFX Graph系commandは対象packageとrender pipelineの互換性を確認してください。

## batch / raw access

```bash
unity-mcp batch run commands.json --fail-fast
unity-mcp batch inline '[{"tool":"manage_scene","params":{"action":"get_active"}}]'

unity-mcp raw manage_scene '{"action":"get_active"}'
unity-mcp raw manage_packages '{"action":"list_packages"}'
```

## commandを確認する

CLIの実装とdocumentationのずれを避けるため、詳細なoptionは実際のCLIを正本として確認します。

```bash
unity-mcp --help
unity-mcp <command> --help
```

使用例は[CLI使用例](/guides/cli-examples)も参照してください。
