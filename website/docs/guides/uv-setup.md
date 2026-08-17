---
id: uv-setup
slug: /guides/uv-setup
title: uv + Pythonの導入・修復
sidebar_label: uv + Python
description: MCP for UnityのPython serverを起動するために必要なuvとPythonを導入・修復します。
---

# uv + Pythonの導入・修復

Cursor、VS Code、Windsurf、RiderなどからMCP serverを起動する際の中心になるのが[`uv`](https://docs.astral.sh/uv/)です。

- `uv`はUnity MCP Server（`mcp-for-unity`）の導入・実行に使う高速なPython package managerです。
- MCP client設定では`command: uvx`と、`--from mcpforunityserver mcp-for-unity --transport stdio`のようなargumentを指定します。
- `uv`が未導入、またはPATH上に無いと、クライアントからserverを起動できません。MCP for Unity windowには **uv Not Found** と表示されます。
- MCP for Unityは一般的なpathとPATHから`uv`を自動検出します。見つからない場合は **Choose UV Install Location** から`uv` binaryを指定できます。

:::tip 通信方式を変えたらクライアントを再起動
Claude CodeやJetBrains Riderなどは、`http`と`stdio`をsession中に切り替えると以前の設定を保持することがあります。`No Unity Instances found`と表示される場合はクライアントを再起動してください。
:::

## 必要なもの

**Python 3.10以降** と **`uv`** が必要です。

### 確認

```bash
python3 --version   # 3.10+を確認
uv --version        # "uv 0.x"のようなversionが表示されることを確認
```

## Pythonを導入する

**macOS:**

```bash
# 方法A: 公式installer（推奨）
# https://www.python.org/downloads/ から取得

# 方法B: Homebrew
brew install python@3.12
```

**Windows:**

```powershell
# 公式installerを推奨
# https://www.python.org/downloads/windows/
```

## uvを導入する

**macOS / Linux / WSL:**

```bash
curl -LsSf https://astral.sh/uv/install.sh | sh
# macOSではHomebrewも利用可能
brew install uv
```

**Windows PowerShell:**

```powershell
powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"
# または
winget install --id=astral-sh.uv -e
```

## よくあるuvの配置先

| OS | Path |
|---|---|
| **macOS** | `/opt/homebrew/bin/uv`, `/usr/local/bin/uv`, `~/.local/bin/uv` |
| **Linux** | `/usr/local/bin/uv`, `/usr/bin/uv`, `~/.local/bin/uv` |
| **Windows** | `%LOCALAPPDATA%/Programs/Python/Python3xx/Scripts/uv.exe` |

## MCP for Unity windowでの動作

- `uv`が見つからない場合、status panelに赤色で **uv Not Found** と表示されます。
- **Choose UV Install Location** から`uv` binaryを指定するとpathを保存し、自動的に再設定します。
- macOSでFinderから起動したUnityがshellのPATHを引き継がない場合、この方法で明示指定するのが簡単です。

## 注意点

- **macOS GUI appはshell startup fileを引き継ぎません。** TerminalとUnityでPATHが異なることがあります。
- **WindowsとWSLは別環境です。** WSL内だけに`uv`を導入してもWindows nativeのUnityからは見えません。Windows側にも導入するか、Windowsの`uv.exe`を指定してください。
- **独自pathへ導入した場合**、pickerで指定したpathは`UnityMCP.UvPath`へ保存されます。

## Repair Python Env buttonの動作

- serverの`.venv`と`.python-version`が存在すれば削除する
- Unity MCP Serverの`src` directoryで`uv sync`を実行し、cleanな環境を再構築する
- Python更新後やmodule不足を修復する際に利用する

## Unity MCP Serverの配置先

| OS | Path |
|---|---|
| **macOS** | `~/Library/Application Support/UnityMCP/UnityMcpServer/src`（またはsymlink経由の`~/Library/AppSupport/UnityMCP/UnityMcpServer/src`） |
| **Windows** | `%USERPROFILE%/AppData/Local/UnityMCP/UnityMcpServer/src` |
| **Linux** | `~/.local/share/UnityMCP/UnityMcpServer/src` |

## 手動修復・実行

```bash
cd <UnityMcpServer/src>
uv sync
uv run server.py
```
