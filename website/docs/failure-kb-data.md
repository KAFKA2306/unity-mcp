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

初期corpusのraw collectionは、**2026年に公開または観測された**Webページ、Issue、Release、forum投稿、記事を情報源とする記録です。canonical recordは必ず1つ以上の情報源URLを保持します。raw collectionにscope外recordが存在しても、current view・current count・類似候補には入りません。物理的な移行・削除はontology migrationで行います。

recordの`date`は、`date_kind`で示された**情報源の公開日または観測日**です。その不具合自体が2026年に初めて発生したことを意味する値ではありません。

`root_cause`、`solution`、`workaround`は、情報源で確認できた事実だけを記録します。引用元から確認できない場合は推測で埋めず、canonical valueを`unknown`とします。

エラー文字列、API名、package名、versionなど、検索や再現に必要な技術情報は原文を保持します。日本語表示では、その周辺の説明を日本語で提示します。
