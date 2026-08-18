---
title: エラー情報の収集範囲と検証
slug: /failures/coverage
---

Failure KBは、収集した`records-*.json`を**raw collection**、そこからVRChat current scopeへ昇格した`current-2026.json`を**current canonical corpus**として区別します。

通常のdocs buildはlive network collectionを行いません。commit済みraw dataから`migrate-failures.mjs`を実行し、current canonicalを決定的に生成します。current ontologyの正本検証は`npm run validate:ontology`の1コマンドで行い、schema、VRChat Unity scope、taxonomy、Evidence、Environment、status導出、source domain/repository派生、filter semantics、migration determinismをまとめて検証します。

`validate:ontology`には不正データのnegative fixtureも含めます。unsupported Unity、`unknown` sentinel、重複Evidence、非HTTP URL、taxonomy外値、host OS/target platformの誤用、根拠のないclaim、legacy canonical field、複数Evidenceを跨ぐsource filter誤一致をrejectできなければ失敗します。日本語native raw recordはファイル名を個別列挙せず、`ja` / `日本語` tagを持つrecordとして`validate:ja-display`が検証します。

raw / current canonical / scope外・未確認の件数は収集に応じて変化するため、固定値をドキュメントやCIへ埋め込みません。`migrate-failures.mjs`が生成する`migration-summary-2026.json`と`failure-coverage.mjs`を正本とし、`excluded_records = raw_records - current_canonical_records`、current canonical非空、current recordのUnity versionが`scope.json`内にあることを機械的に検証します。

Unity 6000系の2026 release notesはraw archiveとして保持できますが、VRChat current Unity `2022.3.22f1` のcurrent corpusには含めません。Unity version未確認のcommunity記事も、根拠を推測で補完せずraw collectionへ留めます。

WebやUnity release notesのlive取得、raw schema、raw signature、raw taxonomyの検証は`audit:*`コマンドとしてcurrent ontology validationと分離します。source checkを実行した場合は`success` / `blocked` / `failed`を分けて報告します。
