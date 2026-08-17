---
title: リリース手順
sidebar_label: リリース手順
description: betaからstable releaseへ進める際のbranch、workflow、確認事項です。
---

# リリース手順

このrepositoryは`beta`をintegration branch、`main`をstable branchとして扱います。実際の自動化内容は`.github/workflows/`を正本とし、このページでは運用上の要点だけを示します。

## 1. `beta`を`main`へ反映する

- base: `main`
- compare: `beta`
- 必要なCIがgreenであることを確認する
- feature PRは`beta`へsquash mergeして構いませんが、`beta → main`のrelease promotionではrelease note履歴を保つためmerge / rebaseを優先します

## 2. Release workflowを実行する

GitHub ActionsのRelease workflowを`main`から実行し、`patch` / `minor` / `major`を選択します。

workflowは実装に応じてversion bump、PR、tag、GitHub Release、artifact publish、`main → beta`同期などを行います。詳細は現在のworkflow YAMLを確認してください。

## 3. 出力を確認する

- `vX.Y.Z` tagが存在する
- GitHub Releaseが作成されている
- 設定されているpublish先のartifactが成功している
- release後に`beta`へversion差分が戻っている

## branch protection

release automationはPR経由を前提とします。`main`へ直接pushする例外を増やすより、必要なstatus checkを通したPRをmergeする方が安全です。

## 失敗時

### tagが既に存在する

同じversionを上書きせず、version計算と既存tagを確認します。

### version bump PRがmergeできない

CI failureを修正し、PRを正常化してからreleaseを続行します。tag / artifact作成前なら中断して再実行できます。

### `main → beta`同期でconflictする

release artifactが既に公開済みか確認し、sync PRのconflictだけを解消します。

### temporary release branchが残る

workflowが途中で停止して不要branchが残った場合だけ削除します。

```bash
git push origin --delete release/vX.Y.Z
```

古い手順をdocsへ複製しないため、release automationの具体的なstep数やartifact名はworkflow実装を正本とします。
