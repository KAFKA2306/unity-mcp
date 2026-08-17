---
id: docs
slug: /contributing/docs
title: ドキュメント運用
sidebar_label: ドキュメント
description: Docusaurus site、generated reference、日本語default locale、Pages deployの運用方法です。
---

# ドキュメント運用

siteは`website/`配下のDocusaurus 3で構築し、通常のPRで`beta`へ変更します。

## 手書きと自動生成を分ける

| 範囲 | Source | 扱い |
|---|---|---|
| はじめに、Guide、Architecture、Contributing、Migration | `website/docs/` | 手書き。日本語をdefaultとする |
| Tool reference | `Server/src/services/tools/` | generatorから生成 |
| Resource catalog | `Server/src/services/resources/` | generatorから生成 |

自動生成referenceは`tools/generate_docs_reference.py`が所有します。tool名、parameter名、type、descriptionなど実装と同期すべき内容を手で分岐させません。

`<!-- examples:start -->`と`<!-- examples:end -->`の間だけは手書きexampleとして再生成後も保持されます。

## 日本語をdefaultにする

`docusaurus.config.js`では次を基本契約とします。

- `defaultLocale: 'ja'`
- 日本語URLはlocale prefixなし: `/getting-started`, `/failures`など
- 英語は`/en/`配下
- defaultの手書きdocsは日本語
- 英語版を維持するpageは`website/i18n/en/docusaurus-plugin-content-docs/current/`へ置く

API名、tool名、config key、code、exact error string、generated referenceなど技術的なcanonical identifierは原文を保持します。

## 手書きpageを変更する

1. `website/docs/`の対象fileを編集する
2. local preview:

```bash
cd website
npm run start
```

3. `http://localhost:3000/unity-mcp/`で確認する
4. `beta`向けPRを作る

CIは`npm run build`を実行し、broken linkやlocale build failureを検出します。

## 新しいpageを追加する

```yaml
---
id: my-page
slug: /guides/my-page
title: ページタイトル
sidebar_label: 短い表示名
description: 検索・OG向けの説明
---
```

`website/sidebars.js`へ追加します。URL slugにはproduct名を埋め込まず、意味のある一般的なpathを使います。

## URLを変更する

外部linkを壊さないようredirectを追加します。

```js
{
  redirects: [
    { from: '/old/slug', to: '/new/slug' },
  ],
}
```

## referenceを再生成する

```bash
cd Server
uv run python ../tools/generate_docs_reference.py
git diff ../website/docs/reference
```

registry変更時はgenerated referenceも同じPRへ含めます。CIの`docs-generate.yml`がdriftを検出します。

## Release note

`website/docs/releases.md`など自動同期対象はgenerator / sync scriptを正本とし、生成bodyを手で翻訳して次回syncで上書きされる構造にしません。release本文が英語の場合も、navbar・sidebar・周辺説明は日本語defaultとします。

## deploy

`beta`へのpushからGitHub Pagesへdeployします。

公開先:

`https://kafka2306.github.io/unity-mcp/`

GitHub Pagesのsourceは**GitHub Actions**です。workflowは`.github/workflows/docs-deploy.yml`を正本とします。

## Search

local searchは`@easyops-cn/docusaurus-search-local`を使用します。検索対象には日本語本文とexact technical stringの両方を残し、エラー原文からも到達できるようにします。
