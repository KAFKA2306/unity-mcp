---
title: CLI使用例
sidebar_label: CLI使用例
description: MCP for UnityをCLI modeで操作する代表的なcommand例です。
---

# Unity MCP CLI 使用例

CLI modeではpersistentなMCP接続を持たず、必要な時にHTTP serverへcommandを送ります。Unity再起動を含む作業やterminal中心のautomationで扱いやすい方法です。

> CLIを使う場合もMCP for UnityのHTTP serverは起動している必要があります。

## 接続確認

```bash
unity-mcp status
unity-mcp instance list
unity-mcp instance set "ProjectName@abc"
unity-mcp instance current
```

## sceneを確認・保存する

```bash
unity-mcp scene hierarchy --limit 20 --depth 3
unity-mcp scene active
unity-mcp scene load "Assets/Scenes/Main.unity"
unity-mcp scene save
unity-mcp --format json scene hierarchy
```

## GameObjectを作る・変更する

```bash
unity-mcp gameobject find "Player"
unity-mcp gameobject create "Cube" --primitive Cube --position 0 1 0
unity-mcp gameobject modify "Cube" --position 1 2 3 --rotation 0 45 0
unity-mcp gameobject duplicate "Cube"
unity-mcp gameobject delete "Cube" --force
```

## componentを操作する

```bash
unity-mcp component add "Player" Rigidbody
unity-mcp component set "Player" Rigidbody mass 10
unity-mcp component remove "Player" Rigidbody
```

## scriptを扱う

```bash
unity-mcp script create "PlayerController" --path "Assets/Scripts"
unity-mcp script read "Assets/Scripts/PlayerController.cs"
unity-mcp code search "TODO|FIXME" "Assets/Scripts/PlayerController.cs"
unity-mcp script delete "Assets/Scripts/Old.cs" --force
```

## screenshotを取る

```bash
unity-mcp camera screenshot --file-name "capture"
unity-mcp camera screenshot --camera-ref "MainCam" --include-image --max-resolution 512
unity-mcp camera screenshot --batch surround --max-resolution 256
unity-mcp camera screenshot --batch orbit --view-target "Player"
unity-mcp camera screenshot --capture-source scene_view --view-target "Canvas" --include-image
```

## Play Mode・Console・test

```bash
unity-mcp editor play
unity-mcp editor pause
unity-mcp editor stop
unity-mcp editor console
unity-mcp editor console --clear
unity-mcp editor tests --mode EditMode
unity-mcp editor tests --mode PlayMode --async
unity-mcp editor poll-test <job_id> --wait 60 --details
```

## assetとPrefab

```bash
unity-mcp asset search --pattern "*.mat" --path "Assets/Materials"
unity-mcp asset info "Assets/Materials/Red.mat"
unity-mcp asset move "Assets/Old.mat" "Assets/Materials/"

unity-mcp prefab open "Assets/Prefabs/Player.prefab"
unity-mcp prefab create "Player" --path "Assets/Prefabs"
unity-mcp prefab modify "Assets/Prefabs/Player.prefab" --target Weapon --position "0,1,2"
unity-mcp prefab modify "Assets/Prefabs/Player.prefab" --set-property "Rigidbody.mass=5"
unity-mcp prefab save
unity-mcp prefab close
```

## materialとshader

```bash
unity-mcp material create "Assets/Materials/Red.mat"
unity-mcp material set-color "Assets/Materials/Red.mat" 1 0 0
unity-mcp material assign "Assets/Materials/Red.mat" "Cube"

unity-mcp shader create "MyShader" --path "Assets/Shaders"
unity-mcp shader read "Assets/Shaders/Custom.shader"
unity-mcp shader update "Assets/Shaders/Custom.shader" --file local.shader
```

## packageとgraphics

```bash
unity-mcp packages list
unity-mcp packages search "cinemachine"
unity-mcp packages info "com.unity.cinemachine"
unity-mcp packages add "com.unity.cinemachine"

unity-mcp graphics pipeline-info
unity-mcp graphics stats
unity-mcp graphics volume-create --name "PostFX" --global
unity-mcp graphics volume-add-effect --target "PostFX" --effect "Bloom"
unity-mcp graphics bake-start --sync
```

## custom tool

```bash
unity-mcp tool list
unity-mcp custom_tool list
unity-mcp editor custom-tool "my_custom_tool"
unity-mcp editor custom-tool "my_custom_tool" --params '{"param1":"value"}'
```

## batch

`commands.json`から複数commandを実行できます。

```bash
unity-mcp batch run commands.json
unity-mcp batch run commands.json --fail-fast
unity-mcp batch inline '[{"tool":"manage_scene","params":{"action":"get_active"}}]'
unity-mcp batch template > commands.json
```

## 任意toolをrawで呼ぶ

```bash
unity-mcp raw manage_scene '{"action":"get_active"}'
unity-mcp raw manage_camera '{"action":"screenshot","include_image":true}'
unity-mcp raw manage_packages '{"action":"list_packages"}'
```

利用可能なcommandとoptionの最終的な正本はCLI自身です。

```bash
unity-mcp --help
unity-mcp <command> --help
```
