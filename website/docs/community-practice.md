---
id: community-practice
title: VRChat / Unity 実践記事
description: VRChat、Unity、Blender、アバター改変の実務記事を、出典URL・公開日・対象ツール・バージョン付きで整理した参照カタログ。
slug: /community-practice
---

# VRChat / Unity 実践記事

個人が実際に VRChat / Unity / Blender を使って作業し、手順、失敗、回避策、使用ツールを公開している記事を集めます。

このページの情報は **community-authored practical evidence** です。VRChat、Unity、Blender、Modular Avatar などの正式仕様そのものではありません。仕様判断が必要な場合は各プロジェクトの公式ドキュメントを優先してください。

機械可読データは [community-practice.json](https://kafka2306.github.io/unity-mcp/data/community-practice.json) で公開します。

## 収録方針

- 元記事の URL、タイトル、公開日を確認できたものだけ収録する。
- 実際の作業手順、失敗例、改善方法、使用ツールのいずれかを含む記事を優先する。
- Unity / Blender のバージョンが確認できる場合は保存する。
- 古い記事は削除せず、バージョンを明示して現行手順と区別する。
- 記事本文は転載せず、短い要約と原典 URL を保存する。
- 公式仕様とコミュニティ記事を同じ証拠レベルとして扱わない。

## 2026-08-20 初期収録

| 公開日 | 記事 | 主題 | 確認できたツール・環境 |
| --- | --- | --- | --- |
| 2026-02-27 | [非対応衣装を着せる（Blender使用）【VRChat】](https://note.com/dolce_vrc/n/nc1c557fa4797) | Blenderでの非対応衣装対応 | Blender |
| 2025-12-29 | [【VRChat】Modular AvatarでExメニューを整理しよう](https://kxn4t.hatenablog.com/entry/2025/12/29/000217) | Expression Menu整理 | Modular Avatar |
| 2025-12-22 | [【VRChat】Continuous Avatar Uploaderでアバターを一気にアップロードする](https://kxn4t.hatenablog.com/entry/2025/12/22/183257) | アバターアップロード自動化 | Continuous Avatar Uploader |
| 2025-12-07 | [【VRChat】衣装対応作業で愛用しているBlenderアドオンまとめ](https://kxn4t.hatenablog.com/entry/2025/12/07/172555) | 衣装対応、ウェイト、アーマチュア、シェイプキー | Robust Weight Transfer、Handy Weight Edit、SKKeeper、LoopTools ほか |
| 2025-10-14 | [【VRChat】ツールでサボりながらBlenderで非対応衣装を着せる](https://note.com/crystaldon/n/nbc0985526383) | ツール併用の衣装対応 | Blender 4.5.3 LTS、Modular Avatar |
| 2025-10-04 | [非対応衣装を着せる（Blender不使用）【VRChat】](https://note.com/dolce_vrc/n/n0c0eb43cc784) | Unityのみでの非対応衣装対応 | Modular Avatar、Avatar Optimizer |
| 2025-09-27 | [【VRChat】アバターと衣装や髪の明るさが違うときの対処法](https://kxn4t.hatenablog.com/entry/2025/09/27/230128) | 明るさ差のトラブルシューティング | Unity / VRChat |
| 2025-01-11 | [【VRChat】非対応衣装をBlenderで着せる作業の解説と動画](https://kxn4t.hatenablog.com/entry/2025/01/11/152921) | 衣装対応ワークフロー、ウェイト転送、シェイプキー | Robust Weight Transfer、SKKeeper、Handy Weight Edit、Modular Avatar |
| 2024-12-01 | [【VRChat】Blender 4.3.0とUnityで非対応衣装を着せるための記事](https://note.com/siloneco_vrc/n/n280759489d06) | Blender + Unityでの衣装対応 | Blender 4.3.0 |
| 2023-07-01 | [VRChatで使用するアバターをBlenderで着せ替える(非対応服)](https://note.com/shimenin/n/n3e683bebc6ac) | Blenderでの衣装対応 | Blender、Modular Avatarへの言及 |
| 2022-08-19 | [[VRChat]blenderでの非対応衣装着せ替え](https://note.com/alchemist_vr/n/n65cd9a80069c) | 旧環境の衣装対応 | Windows 11、Blender 3.2.2、Unity 2019.4.31f1 |

## 重点的に集めるテーマ

今後は次の実務テーマを優先して追加します。

- 非対応衣装、ウェイト転送、ウェイトペイント
- Armature / bone / rest pose
- Shape Keys と modifier
- Modular Avatar / NDMF / Avatar Optimizer
- Expression Menu / Animator / FX layer
- PhysBone / Contacts / Collider
- shader / material / lighting
- Quest 対応、軽量化、Performance Rank
- アバターの一括アップロード、検証、自動化
- Unity Editor 拡張と Blender add-on
- VRChat World 制作、UdonSharp、ビルド・アップロード失敗

## データ形式

`community-practice.json` の各項目は、少なくとも以下を保持します。

- `title`
- `url`
- `author`
- `source`
- `published_at`
- `topics`
- `tools`
- `versions`
- `summary`
- `evidence_type`

この形式にしておくことで、Pages の表示だけでなく、将来的に MCP resource、検索、タグ別集計、ツール別の失敗知識への接続にも再利用できます。
