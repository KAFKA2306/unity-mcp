---
title: エラー情報の使い方
slug: /failures/index
---

[2026 VRChat 制作エラー情報](/failures)では、根拠URL付きの記録をエラー文字列と症状から検索し、`software`、`component`、`phase`、`failure_type`で分類します。制作環境はtaxonomyに混ぜず、Unity / VRChat SDK / host OS / target platformとして別に扱います。

`phase`は制作工程だけを表します。`networking`や`optimization`は工程ではないためphaseには置かず、component側で扱います。日本語のcanonical表示名は`website/data/failures/taxonomy.json`を正本とします。

- [データの範囲と根拠](/failures/data) — VRChat対応Unity、Evidence、Environmentのデータ契約
- [収集範囲と検証](/failures/coverage) — 件数、情報源、定期監査、coverageの意味
