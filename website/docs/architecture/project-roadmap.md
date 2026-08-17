---
id: project-roadmap
slug: /architecture/project-roadmap
title: プロジェクトの方向性
sidebar_label: プロジェクトロードマップ
description: MCP for Unityの方向性を示し、現在状態の正本をGitHubへ寄せます。
---

# プロジェクトの方向性

このページはMCP for Unityの長期的な方向性を示します。**現在の実装状況や優先順位の正本ではありません。** 個別機能の現在状態はcode、Release、Issue、Pull Requestを確認してください。

## 基本目標

1. **導入を簡単にする** — Python server、MCP client設定、Unity側接続の初期障壁を減らす
2. **操作を速くする** — latency、不要なtool exposure、token使用量を減らす
3. **接続先を増やす** — 標準的なMCP client、HTTP、remote運用との互換性を高める
4. **保守しやすくする** — API、documentation、version compatibilityを明確にする
5. **実際のfailureから改善する** — Issue、release、Failure KBなどの証拠を優先する

## 現在状態の確認先

- このforkのIssue: https://github.com/KAFKA2306/unity-mcp/issues
- このforkのPull Request: https://github.com/KAFKA2306/unity-mcp/pulls
- 上流Issue: https://github.com/CoplayDev/unity-mcp/issues
- 上流Release: https://github.com/CoplayDev/unity-mcp/releases
- [リリース履歴](/releases)

## 2026 feature research

機能domainごとの技術調査は[2026 Feature Roadmap](/architecture/roadmap)に分離しています。そこに書かれた候補は**調査結果であり実装commitmentではありません**。

## 原則

roadmap本文へ「Current Focus」のような時間依存情報を複製しません。時間とともに変わる状態はGitHub側へ寄せ、docsには長く維持できる目的・設計判断だけを残します。
