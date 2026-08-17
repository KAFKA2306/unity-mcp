---
title: エラー情報の収集範囲と検証
slug: /failures/coverage
---

Failure KBは`website/data/failures/`配下のファイルをcanonical data sourceとして使用します。

build時には、2026年canonical recordが100件未満、情報源ファミリーが6未満、日本語Web recordが12件未満、または有効な日本語情報源が3件未満になると失敗します。

定期workflowでは、登録済み・有効な情報源、source check結果、recordの追加・更新、version / error / cause / solutionの欠損、status別件数、正規化signatureの重複候補を記録します。

取得制限などにより確認できない`blocked` sourceは、成功したsourceとは分けて報告します。引用元に記載されていない原因、解決策、回避策は`unknown`のまま維持します。

定期監査reportはGitHub Actionsのartifactとして保存し、通常のGit履歴へはcommitしません。
