---
title: エラー情報のデータ範囲
slug: /failures/data
---

初期corpusは、**2026年に公開または観測された**Webページ、Issue、Release、forum投稿、記事を情報源とする記録に限定しています。canonical recordは必ず1つ以上の情報源URLを保持します。

recordの`date`は、`date_kind`で示された**情報源の公開日または観測日**です。その不具合自体が2026年に初めて発生したことを意味する値ではありません。

`root_cause`、`solution`、`workaround`は、情報源で確認できた事実だけを記録します。引用元から確認できない場合は推測で埋めず、canonical valueを`unknown`とします。

エラー文字列、API名、package名、versionなど、検索や再現に必要な技術情報は原文を保持します。日本語表示では、その周辺の説明を日本語で提示します。
