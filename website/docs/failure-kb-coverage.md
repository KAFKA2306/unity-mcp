---
title: エラー情報の収集範囲と検証
slug: /failures/coverage
---

Failure KBは、収集した`records-*.json`を**raw collection**、そこからVRChat current scopeへ昇格した`current-2026.json`を**current canonical corpus**として区別します。

通常のdocs buildはlive network collectionを行いません。commit済みraw dataから`migrate-failures.mjs`を実行し、current canonicalを決定的に生成します。current ontologyの正本検証は`npm run validate:ontology`の1コマンドで行い、schema、VRChat Unity scope、taxonomy、Evidence、Environment、status導出、source domain/repository派生、filter semantics、migration determinismをまとめて検証します。

`validate:ontology`には不正データのnegative fixtureも含めます。unsupported Unity、`unknown` sentinel、重複Evidence、非HTTP URL、taxonomy外値、host OS/target platformの誤用、根拠のないclaim、legacy canonical field、複数Evidenceを跨ぐsource filter誤一致をrejectできなければ失敗します。

2026-08-18時点のmigration baselineはraw 121件、current canonical 8件、scope外またはUnity version未確認113件です。coverage reportではこの3値を別々に表示し、121件をcanonical件数とは呼びません。

Unity 6000系の2026 release notesはraw archiveとして保持できますが、VRChat current Unity `2022.3.22f1` のcurrent corpus件数には含めません。

WebやUnity release notesのlive取得、raw schema、raw signature、raw taxonomyの検証は`audit:*`コマンドとしてcurrent ontology validationと分離します。source checkを実行した場合は`success` / `blocked` / `failed`を分けて報告します。
