---
title: エラー情報のデータ範囲
slug: /failures/data
---

`/failures` のcurrent corpusは、**VRChatが現在対応しているUnity `2022.3.22f1` がrecord内で明示されている2026年の失敗事例**に限定します。

VRChat公式の対応Unityは以下で確認します。

- https://creators.vrchat.com/sdk/upgrade/current-unity-version/
- https://creators.vrchat.com/getting-started/
- https://creators.vrchat.com/sdk/upgrade/unity-2022/

Unity `2019.4.31f1` はlegacy versionとしてcurrent corpusには含めません。Unity 6000系、その他の明示的な非対応version、Unity version未確認のrecordもcurrent canonicalへ昇格しません。scopeは`website/data/failures/scope.json`を正本として機械的に適用します。

## Raw collection と current canonical

既存の`records-*.json`は、2026年に収集した**raw collection**として保持します。rawの値を消したり、Unity versionを推測で補完したりしません。

`website/scripts/migrate-failures.mjs`がraw collectionからcurrent scopeだけを決定的に変換し、build/start前に新ontologyの`current-2026.json`を生成します。生成物はサイト上の`/data/failures/current-2026.json`から再利用できます。migration summaryも`/data/failures/migration-summary-2026.json`として生成します。

2026-08-18時点の固定検証値はraw 121件、current canonical 8件、scope外またはUnity version未確認113件です。件数が変わる場合はcollector変更とscope根拠を同時に更新します。

## Evidence

current canonicalでは情報源をURL単位の`evidence[]`として保持します。各evidenceは`url`、`source_type`、`publisher`、`supports[]`を持ち、公開日を確認できる場合だけ`published_at`を保持します。

`source_domain`は保存せず`evidence[].url`のhostnameから導出します。GitHub URLの`owner/repo`もURL pathから派生させます。

## Environment

制作環境は`environment`へまとめます。current canonicalの`unity_version`は`2022.3.22f1`だけを許可します。VRChat SDK version、package version、host OS versionは確認できる場合だけ保持し、`unknown`文字列は使いません。

`host_os`は制作側OSで`Windows`、`macOS`、`Linux`をcanonical nameとします。legacy `platforms`からOSだと明確に判断できる値だけ移行します。

`target_platform`はVRChat SDKでbuild/uploadする対象で、`Windows`、`Android`、`iOS`をcanonical valueとします。raw `platforms`からtargetを推測して補完しません。

- https://creators.vrchat.com/platforms/
- https://creators.vrchat.com/platforms/android/cross-platform-setup/

## Failure と Remedy

rawの`solution`と`workaround`はcurrent canonicalでは`remedies[]`へ移し、`fix`と`workaround`を区別します。`status`は保存せずremedyから表示時に導出します。`tags`もcanonical dataには複製しません。

`error_signature`、`trigger`、`root_cause`、version等がrawで`unknown`の場合、current canonicalではfieldそのものを省略します。情報源にない内容は推測で補完しません。

recordの`date`は`date_kind`で示された情報源の公開日または観測日です。不具合自体の初発日を意味しません。
