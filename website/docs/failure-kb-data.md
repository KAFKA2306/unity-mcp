---
title: エラー情報のデータ範囲
slug: /failures/data
---

`/failures` のcurrent viewは、**VRChatが現在対応しているUnity `2022.3.22f1` がrecord内で明示されている2026年の失敗事例**に限定します。

VRChat公式の対応Unityは以下で確認します。

- https://creators.vrchat.com/sdk/upgrade/current-unity-version/
- https://creators.vrchat.com/getting-started/
- https://creators.vrchat.com/sdk/upgrade/unity-2022/

Unity `2019.4.31f1` は旧VRChat SDK向けのlegacy versionとしてcurrent viewには含めません。Unity 6000系や、情報源からUnity versionを確認できずcanonical recordが`unknown`のままの記録もcurrent viewには含めません。raw collectionからcurrent viewへのscopeは`website/data/failures/scope.json`を正本として機械的に適用します。

初期corpusのraw collectionは、**2026年に公開または観測された**Webページ、Issue、Release、forum投稿、記事を情報源とする記録です。raw collectionにscope外recordが存在しても、current view・current count・類似候補には入りません。物理的な移行・削除はontology migrationで行います。

## Evidence

情報源はURL単位の`evidence[]`へ移行します。各evidenceは最低限`url`、`source_type`、`publisher`、`supports[]`を持ち、`supports[]`でそのURLが裏付けるrecord内の主張を示します。公開日を情報源から確認できる場合だけ`published_at`を保持します。

`source_domain`はcanonical dataへ重複保存せず、`evidence[].url`をURLとしてparseした`hostname`から導出します。GitHub URLの場合の`owner/repo`もURL pathから派生させます。これによりURLとdomain/repositoryの不整合を作りません。

既存recordの`source_urls`、`source_type`、`source_family`は移行期間中のみ残し、全recordを`evidence[]`へ変換するmigrationで削除します。

## Environment

制作環境は`environment`へまとめます。`unity_version`はcurrent corpusではVRChat対応版を必須とし、確認できない値を`unknown`で埋めません。VRChat SDK version、package version、host OS versionは確認できる場合だけ保持します。

`host_os`はFailureを観測した制作側OSで、`Windows`、`macOS`、`Linux`をcanonical nameとします。必要なら各OSにversionを保持します。

`target_platform`はVRChat SDKでbuild/uploadする対象で、VRChat公式のplatform表記に合わせ`Windows`、`Android`、`iOS`だけをcanonical valueにします。`PC`や`Quest`はcanonical target valueとして保存しません。

- https://creators.vrchat.com/platforms/
- https://creators.vrchat.com/platforms/android/cross-platform-setup/

既存のflat `unity_version`、`vrcsdk_version`、`packages`、`platforms`は移行期間中のみ残し、ontology migrationで`environment`へ統合します。

recordの`date`は、`date_kind`で示された**情報源の公開日または観測日**です。その不具合自体が2026年に初めて発生したことを意味する値ではありません。

`root_cause`、`solution`、`workaround`は、情報源で確認できた事実だけを記録します。現行recordでは引用元から確認できない場合に`unknown`を使っていますが、このsentinelはontology migrationでnullable/field omissionへ移行します。

エラー文字列、API名、package名、versionなど、検索や再現に必要な技術情報は原文を保持します。日本語表示では、その周辺の説明を日本語で提示します。
