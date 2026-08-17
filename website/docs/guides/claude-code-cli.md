---
id: claude-code-cli
slug: /guides/claude-code-cli
title: Claude Code CLIの導入・修復
sidebar_label: Claude Code CLI
description: MCP for Unityから起動できるようClaude Code CLI（claude）を導入または修復します。
---

# Claude Code CLIの導入・修復

システム上でClaude Code CLI（`claude`）を実行できる必要があります。

:::caution 通信方式を変えたら再起動が必要
MCP for Unityのwindowで`http`と`stdio`を切り替えた場合、変更を反映するため**Claude Codeを再起動**してください。
:::

## 推奨: 公式installer

**macOS / Linux / WSL:**

```bash
curl -fsSL https://claude.ai/install.sh | bash
claude doctor
```

**Windows PowerShell:**

```powershell
irm https://claude.ai/install.ps1 | iex
claude doctor
```

## 別案: NVM経由のnpm

```bash
# Node versionを導入・選択
nvm install v21.7.1
nvm use v21.7.1

# Claude Code CLIをこのNodeのglobal prefixへ導入
npm install -g @anthropic-ai/claude-code

# NVM配下にあることを確認
which claude
claude --version
```

## 別案: system / Homebrew Nodeのnpm

```bash
# macOSでNodeが無い場合
brew install node

# Claude Code CLIをglobalに導入
npm install -g @anthropic-ai/claude-code

# PATH上にあることを確認
which claude
claude --version
```

## macOSのPATHに注意

FinderやUnity Hubから起動したUnityはshellのPATHを引き継がないことがあります。`claude`が見つからない場合は、次のどちらかを行います。

- TerminalからUnity Hubを起動してPATHを引き継ぐ
- MCP for Unity windowの **Choose Claude Install Location** から`claude`の絶対pathを指定する

## 関連するトラブルシューティング

- macOSのdyld / ICU library error: [トラブルシューティング](/guides/troubleshooting)を参照
- Register buttonに`Claude Not Found`と出る場合: 同じく[トラブルシューティング](/guides/troubleshooting)を参照
