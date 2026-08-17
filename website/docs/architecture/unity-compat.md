---
id: unity-compat
slug: /architecture/unity-compat
title: Unity API互換shim
sidebar_label: Unity互換性
description: Unity 2021.3 LTSから6.xまでのAPI差分を少数のcompatibility shimへ集約する方針です。
---

# Unity API互換shim

MCP for Unityは**Unity 2021.3 LTS → Unity 6.x → CoreCLR系の将来path**まで広いversion範囲を扱います。versionごとのrename / deprecationを各call siteへ散らさず、`MCPForUnity/Runtime/Helpers/`の小さなcompatibility shimへ集約します。

## 主なshim

canonicalなcatalogは`MCPForUnity/Runtime/Helpers/UnityCompatShims.cs`にあります。

| Shim | 対象 |
|---|---|
| `UnityFindObjectsCompat` | `Object.FindObjectsOfType` → `FindObjectsByType` |
| `UnityObjectIdCompat` | `InstanceID` ↔ `EntityId` |
| `UnityPhysicsCompat` | physics simulation / transform sync API差分 |
| `UnityAssembliesCompat` | assembly enumeration API差分 |

## 新しいshimを追加する条件

次のいずれかを目安にします。

1. APIが`[Obsolete]`になり、call site自体は削除できない
2. 同じversion gateが3箇所以上へ広がる
3. Unityがrename / removalを公開している

1〜2箇所だけの差分ならlocalな`#if UNITY_*_OR_NEWER`で十分です。将来壊れるか不明なAPIまで先回りしてshim化しません。

## shimへ入れないもの

- `Transform.position`、`Vector3.*`、`GetComponent<T>`など安定したhot-path API
- rename / removal予定が無い一般API
- undocumentedなEditor internal API。これは壊れた時に明示的に検知できる方が安全です

## 実装方式

- **compile-time dispatch** — 新旧APIがtarget SDKで利用できる場合に`#if`で選択
- **cached reflection** — target外versionや将来削除されるAPIを扱う必要がある場合

call siteからversion判定を隠し、互換処理を1箇所へ閉じ込めることが目的です。

## version別compile check

```bash
tools/check-unity-versions.sh
tools/check-unity-versions.sh --full
```

version matrixは`tools/unity-versions.json`です。

## 実装箇所

- policy / catalog: `MCPForUnity/Runtime/Helpers/UnityCompatShims.cs`
- individual shim: `MCPForUnity/Runtime/Helpers/Unity*Compat.cs`
