---
title: 2026 Feature調査
sidebar_label: ロードマップ
description: Unity API domainを調査した2026年時点の研究メモです。現在の実装状態とは分離して扱います。
---

# 2026 Feature調査

この文書はUnity API surfaceをdomain別に調査した**研究メモ**です。作成時点のtool coverageや優先順位を含むため、現在の実装状況・commitment・release planとしては扱いません。

現在の実装は[tool reference](/reference/tools)、GitHub code、Releaseを正本とします。

## 調査時に見ていた観点

各domainについて次を評価しました。

- Unity APIの安定性
- 実装複雑性
- developer value
- optional package dependency
- domain reload / async operationなどのfailure mode
- 既存toolとの重複

## 主な候補domain

### Package management

`manage_packages`のようなpackage操作は、optional packageを必要とする他domainの前提を自動化できます。package add / removeはdomain reloadを伴うため、長時間処理stateを保持する設計が重要です。

### Scene / Editor QoL

multi-scene、scene validation、undo / redo、scene templateなど、既存toolのaction追加で表現できる領域です。新しいtoolを増やす前に既存domainへ統合できるかを優先します。

### Physics

Rigidbody / Colliderだけでなく、global settings、collision matrix、query、simulation、validationまで扱う候補でした。現在の設計は[`manage_physics`](/architecture/manage-physics)を参照してください。

### Input

Input System packageのaction map、binding、control scheme、PlayerInput設定など。optional package dependencyを先に解決できることが前提です。

### Navigation

NavMesh bake、path query、agent、obstacle、AI Navigation packageのsurfaceなど。core APIとoptional package APIを分けて扱う必要があります。

### Terrain

heightmap、layer、tree、detailなど。巨大なheightmap全体をJSONで往復させず、region単位・procedural generationをUnity側で実行する方が適しています。

### Timeline

track、clip、binding、signal、PlayableDirectorなど。animation / camera toolとの連携価値があります。

### Netcode

NetworkManager、NetworkObject、NetworkTransformなど。package dependencyとcode generationを含むため、単純なcomponent操作よりvalidationが重要です。

### Build / deploy

build target、PlayerSettings、build pipelineなど。処理時間が長く副作用も大きいため、polling、状態確認、明示的なtarget指定が必要です。

## 優先順位を固定しない

過去の調査で付けたTierや「次に作る」順序は、現在のGitHub stateと一致しなくなるためdefault docsから外しました。今後の優先順位は次を基準に再評価します。

1. 現在のIssue / failure evidence
2. 既存toolで代替できるか
3. upstream Unity APIの安定性
4. package dependencyとversion compatibility
5. 最小の追加codeで得られる利用価値

これにより、research noteを将来計画と誤認しない形で再利用できます。
