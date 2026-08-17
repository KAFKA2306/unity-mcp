---
id: testing
slug: /contributing/testing
title: テスト
sidebar_label: テスト
description: Python、Unity、複数Unity versionのテストをlocalとCIで実行する方法です。
---

# テスト

MCP for Unityには大きく3種類の検証があります。変更した層に対応するものをpush前に実行します。

## Python test

場所: `Server/tests/`

```bash
cd Server
uv run pytest tests/ -v

# 1 file
uv run pytest tests/test_manage_material.py -v

# name pattern
uv run pytest tests/ -k "test_create_material" -v
```

新しい`manage_<domain>`を追加する場合は、既存testを参考に`Server/tests/test_manage_<domain>.py`を追加します。

## Unity test

場所: `TestProjects/UnityMCPTests/Assets/Tests/`

Unityで`TestProjects/UnityMCPTests`を開き、**Window → General → Test Runner**からEditMode / PlayMode testを実行できます。

C# toolを追加した場合は、対応するEditMode testを既存asmdef配下へ追加します。

## local headless harness

CIと同じ入口でbridgeを起動し、smoke / EditMode / PlayModeを実行できます。

```bash
python tools/local_harness.py
```

主なoption:

```bash
python tools/local_harness.py --legs smoke,editmode
python tools/local_harness.py --reuse
python tools/local_harness.py --keep-alive
python tools/local_harness.py --no-warmup
```

exit codeはsetup failure、compile failure、license不足などを区別します。正確なcontractは`tools/local_harness.py`を正本として確認します。

## 複数Unity versionのcompile check

```bash
tools/check-unity-versions.sh
tools/check-unity-versions.sh --full
```

Windows:

```powershell
pwsh .\tools\check-unity-versions.ps1
pwsh .\tools\check-unity-versions.ps1 -Full
```

matrixは`tools/unity-versions.json`です。compatibility shimや`#if UNITY_*_OR_NEWER`を変更した場合は特に重要です。

## Git hook

```bash
tools/install-hooks.sh
```

Unity関連pathを変更したpushではversion checkを実行します。またserver tool/resource registryの変更時にはreference docsの再生成も支援します。

## generated referenceの検証

```bash
cd Server
uv run python ../tools/generate_docs_reference.py
git diff --exit-code ../website/docs/reference
```

CIではgenerated referenceとregistryのdriftを検出します。自動生成範囲は手書きで修正しません。

## 主なCI

- `python-tests.yml` — Python test
- `unity-tests.yml` — Unity test / version matrix
- `docs-deploy.yml` — Docusaurus buildとPages deploy
- `docs-generate.yml` — generated referenceのdrift check

workflow名やmatrixは変更される可能性があるため、最終的な正本は`.github/workflows/`と`tools/unity-versions.json`です。
