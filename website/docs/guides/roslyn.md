---
id: roslyn
slug: /guides/roslyn
title: RoslynによるScript検証（上級）
sidebar_label: Roslyn
description: Unity compilerへ渡す前に未定義namespace、type、methodを検出する厳密なC#検証を有効化します。
---

# RoslynによるScript検証

MCP for Unityは既定で、LLMが生成したscriptに対して高速な構造検証を行います。完全なUnity compileを実行せず、書き込み時点で未定義namespace、type、methodまで検出したい場合は、任意機能のRoslyn DLLを導入します。

多くの用途では不要です。次のような場合に有効化します。

- LLMへ大量のC#生成を任せ、より厳密なfeedback loopが必要
- 構造検証を通過したcompile errorが繰り返し発生する
- symbol resolutionの正確さを必要とするcustom toolを作る

## 1-click installer（推奨）

1. **Window → MCP for Unity** を開きます。
2. Scripts / Validation tabの **Runtime Code Execution (Roslyn)** まで移動します。
3. **Install Roslyn DLLs** を押します。

installerは必要なNuGet packageを取得し、DLLを`Assets/Plugins/Roslyn/`へ配置して、Scripting Define Symbolsへ`USE_ROSLYN`を追加します。

**Window → MCP for Unity → Install Roslyn DLLs** からも実行できます。

## 手動導入（installerが使えない場合）

1. [NuGetForUnity](https://github.com/GlitchEnzo/NuGetForUnity)を導入します。
2. **Window → NuGet Package Manager** を開きます。
3. 次を導入します。
   - `Microsoft.CodeAnalysis` v5.0
   - `SQLitePCLRaw.core` v3.0.2
   - `SQLitePCLRaw.bundle_e_sqlite3` v3.0.2
4. **Player Settings → Scripting Define Symbols** に`USE_ROSLYN`を追加します。
5. Unityを再起動します。

## DLLを直接導入する

1. [NuGet.org](https://www.nuget.org/packages/Microsoft.CodeAnalysis.CSharp/)から`Microsoft.CodeAnalysis.CSharp.dll`と依存DLLを取得します。
2. `Assets/Plugins/Roslyn/`へ配置します。
3. 使用中のUnity versionに合う.NET互換設定を確認します。
4. Scripting Define Symbolsへ`USE_ROSLYN`を追加します。
5. Unityを再起動します。

## 有効化を確認する

再起動後、MCP for Unityのstatus panelでScripts sectionの **Roslyn: enabled** を確認します。`validate_script`は構造検証ではなくsemantic analysisを実行するようになります。

## 無効化する

Scripting Define Symbolsから`USE_ROSLYN`を削除します。pluginは構造検証へ戻ります。`Assets/Plugins/Roslyn/`のDLLは残しても削除しても構いません。
