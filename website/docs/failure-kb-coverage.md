---
title: エラー情報の収集範囲と検証
slug: /failures/coverage
---

Failure KBは、収集した`records-*.json`を**raw collection**、そこからVRChat current scopeへ昇格した`current-2026.json`を**current canonical corpus**として区別します。

通常のdocs buildはlive network collectionを行いません。commit済みraw dataから`migrate-failures.mjs`を実行し、current canonicalを決定的に生成・検証します。WebやUnity release notesのlive取得はraw source監査として別コマンドで実行します。

2026-08-18時点のmigration baselineはraw 121件、current canonical 8件、scope外またはUnity version未確認113件です。coverage reportではこの3値を別々に表示し、121件をcanonical件数とは呼びません。

Unity 6000系の2026 release notesはraw archiveとして保持できますが、VRChat current Unity `2022.3.22f1` のcurrent corpus件数には含めません。

source checkを実行した場合、`success` / `blocked` / `failed`を分けて報告します。collectorは確認できたraw evidenceだけを取得し、currentへの昇格、Evidence/Environment正規化、`unknown`除去は単一のmigrationで行います。
