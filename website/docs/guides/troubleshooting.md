---
id: troubleshooting
slug: /guides/troubleshooting
title: よくあるセットアップ問題
sidebar_label: トラブルシューティング / FAQ
description: macOS dyld、WSL2接続、DLL version conflict、client別FAQなど、実際に起きる問題の対処方法です。
---

# よくあるセットアップ問題

## macOS: Claude CLIが起動しない（dyld ICU library not loaded）

**症状**

- MCP for Unityで `Failed to start Claude CLI. dyld: Library not loaded: ...` が表示される
- Terminalで`claude`を実行しても`libicui18n.xx.dylib`不足で失敗する

**原因**

Homebrew Nodeまたは`claude` binaryが、現在は導入されていないICU versionへlinkされており、dyldがdylibを見つけられません。

**対処方法**

Homebrew Nodeを再導入し、現在のICUへlinkし直します。

```bash
brew update
brew reinstall node
npm uninstall -g @anthropic-ai/claude-code
npm install -g @anthropic-ai/claude-code
```

またはNVM Nodeを使います。

```bash
nvm install --lts
nvm use --lts
npm install -g @anthropic-ai/claude-code
# Unity MCP → Claude Code → Choose Claude Location → ~/.nvm/versions/node/<ver>/bin/claude
```

公式installerも利用できます。

```bash
curl -fsSL https://claude.ai/install.sh | bash
```

修復後、MCP for UnityのClaude Code sectionで **Choose Claude Location** から動作する`claude` binaryを指定し、再度 **Register** します。

---

## WSL2: Linux側Claude CodeからWindows側Unityへ接続する

Claude CodeをWSL2で、UnityをWindowsで動かす場合、MCP serverはWindows側で起動し、WSL側からそこへHTTP接続します。

### 1. Unity packageを導入する

Unity Package ManagerでGit URLを追加します。

```text
https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main
```

MCP for Unity設定でportを **8090** など空いている番号へ変更できます。8080が別serviceと競合する場合に有効です。

### 2. Windowsへuvを導入する

管理者PowerShellで実行します。

```powershell
irm https://astral.sh/uv/install.ps1 | iex
```

### 3. WSLからWindowsへport forwardする

WSL2は別network namespaceで動くため、管理者PowerShellからMCP portを転送します。

```powershell
netsh interface portproxy add v4tov4 listenport=8090 listenaddress=0.0.0.0 connectport=8090 connectaddress=127.0.0.1
```

firewall ruleも追加します。

```powershell
New-NetFirewallRule -DisplayName "Unity MCP Server" -Direction Inbound -LocalPort 8090 -Protocol TCP -Action Allow
```

### 4. WSLから見たWindows host IPを確認する

WSL内で次を実行します。

```bash
cat /etc/resolv.conf | grep nameserver | awk '{print $2}'
```

例: `172.21.48.1`

### 5. Claude CodeへMCP serverを追加する

```bash
claude mcp add --transport http UnityMCP http://<YOUR_WSL_HOST_IP>:8090/mcp
```

例:

```bash
claude mcp add --transport http UnityMCP http://172.21.48.1:8090/mcp
```

ここではserverがWindows側で動くため、stdioではなく**HTTP**を使います。

### 6. 確認する

Unityを起動してからClaude Codeを開き、`UnityMCP`がconnected MCP serverとして表示されることを確認します。scene情報を取得するpromptで動作確認できます。

**補足**

- PC再起動後にWSL host IPが変わる場合があります。その場合は手順4を再実行して設定を更新します。
- port proxyは再起動後も残ります。削除する場合:
  `netsh interface portproxy delete v4tov4 listenport=8090 listenaddress=0.0.0.0`
- 接続しない場合、UnityとMCP serverが起動しているかMCP for Unity panelで確認します。

---

## Unity AI Assistant packageとのDLL version不一致

**Unity 6.3以降**と**Unity AI Assistant** packageを併用すると、`System.Collections.Immutable`のversion conflictが発生することがあります。

**症状**

- `System.Collections.Immutable` version mismatchに関するcompile error
- Unity AI Assistant導入済みprojectへMCP for Unityを追加した後に発生

**原因**

Unity AI Assistant、MCP for UnityのCodeAnalysis依存、Unity組み込み環境が異なる`System.Collections.Immutable` versionを要求し、assembly resolutionで競合します。

**対処**

- Unity AI Assistantが不要ならPackage Managerから削除し、必要な`System.Collections.Immutable` DLLを`Assets/Plugins/`へ配置します。
- 両方必要な場合は、project内のassembly version requirementを確認して互換versionを`Assets/Plugins/`へ配置します。

これはUnityのassembly resolutionに関する問題で、NuGetのようなdependency resolverがproject全体へ自動適用されないため、DLL conflictを手動で解決する必要があります。

---

## `No Unity Instances Found`

:::tip まずMCPクライアントを再起動
Claude CodeやJetBrains Riderなどは通信方式をsession中に変えると古い設定を保持することがあります。まずclientを再起動します。
:::

改善しない場合:

- MCP for Unity status panelが`Connected`か確認する
- `mcpforunity://instances`を読み、空ならUnity側bridgeが動いているか確認する
- **Window → MCP for Unity → Restart Server** を試す

---

## FAQ — Claude Code

**Q: Terminalでは`claude`が動くのにUnityから見つからない。**  
A: macOSのFinder / Hubから起動したappはshellのPATHを引き継がないことがあります。MCP for Unityで **Choose Claude Location** を押し、`/opt/homebrew/bin/claude`や`~/.nvm/versions/node/<ver>/bin/claude`などの絶対pathを指定します。

**Q: NVMで導入した`claude`はどこにある？**  
A: 通常は`~/.nvm/versions/node/<ver>/bin/claude`です。MCP for Unity側からbrowseして指定できます。

**Q: Register buttonに`Claude Not Found`と表示される。**  
A: CLIを導入するかpathを指定します。[Claude Code CLIの導入・修復](/guides/claude-code-cli)も参照してください。

## FAQ — VS Code

**Q: 最初にMCP for Unity serverを起動すると`Canceled: Canceled`と表示される。**  
A: 新しいchatを開始します。既存chatが新しいMCP server設定を認識していない場合があります。

![Canceled error screenshot](https://github.com/user-attachments/assets/571e2aeb-c286-4235-ab2b-8285c0db3296)

## FAQ — Cursor / Windsurf / VS Code（Windowsのuv path）

**Q: `uv`は入っているのにMCP clientからserverを起動できない。**  
A: Windows上に複数の`uv.exe`が存在する場合があります。MCP for Unityの **Choose UV Install Location** から、upgrade後もpathが変わりにくいWinGet Links shim（`%LOCALAPPDATA%\Microsoft\WinGet\Links\uv.exe`）を明示指定してください。
