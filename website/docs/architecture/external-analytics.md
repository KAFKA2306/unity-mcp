---
title: 外部分析
sidebar_label: 外部分析
description: 利用状況をaggregate signalで把握する仕組みと公開範囲を説明します。
---

# 外部分析

利用状況の把握には、性質の異なる複数のaggregate signalを使います。**download数やstar数をactive user数として扱わない**ことが重要です。

## signalの意味

- **in-product DAU / WAU** — 匿名install単位でdeduplicateできるため、実利用へ最も近いsignal
- **GitHub unique clone / viewer** — codeへ実際に接触したdeveloperのproxy。ただしrepository traffic APIはcollaborator向け
- **GitHub stars / forks** — 関心のsignalであり利用数ではない
- **PyPI download** — `mcpforunityserver`のdownload event。CI、mirror、`uvx`再取得などで膨らむためuser数ではない
- **docs traffic** — analyticsが設定されている場合のpageview aggregate

## 公開範囲

- READMEに表示するpublic badgeは、もともと公開されているdownload情報などに限定する
- maintainer向けの集計はGitHub Actions run summaryなどprivateな運用面へ置く
- siteへ個別user情報や識別可能なraw eventを公開しない

## privacy

- cookie / fingerprintで個人を追跡しない
- source code、project内容、PIIを分析目的で公開しない
- telemetry自体の収集内容とopt-outは[テレメトリ](/architecture/telemetry)に分離する

## workflow

上流実装では`.github/workflows/stats.yml`と`website/scripts/fetch-stats.mjs`がaggregate dataを取得し、GitHub Actions summaryへ出力する構成です。数値はdocs siteへcommitしません。

## 解釈上の原則

1. active user、download、starを同じ指標として混ぜない
2. proxyにはproxyであることを明記する
3. 公開する必要のない運用統計はpublic siteへ出さない
4. 現在の実装・APIが変わった場合はcodeとworkflowを正本とする
