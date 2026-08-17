---
id: install
slug: /getting-started/install
title: Install
sidebar_label: Install
description: Add MCP for Unity to your Unity project and connect an MCP client.
---

# Install

Three install paths are supported. Pick one. **Git URL** is the fastest if you just want to try it.

## Prerequisites

- **Unity 2021.3 LTS or newer** — [Download Unity](https://unity.com/download)
- **Python 3.10+** with [`uv`](https://docs.astral.sh/uv/getting-started/installation/) — the setup wizard guides you through both if missing
- **An MCP client** — Claude Desktop, Claude Code, Cursor, VS Code Copilot, Windsurf, Cline, Codex, Gemini CLI, Qwen Code, OpenClaw, and more

## Option 1 — Git URL

In Unity, open **Window → Package Manager**, click **`+`**, choose **Add package from git URL...**, and paste:

```text
https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#main
```

For beta features:

```text
https://github.com/CoplayDev/unity-mcp.git?path=/MCPForUnity#beta
```

## Option 2 — Unity Asset Store

1. Visit [MCP for Unity on the Asset Store](https://assetstore.unity.com/packages/tools/generative-ai/mcp-for-unity-ai-driven-development-329908).
2. Click **Add to My Assets**.
3. Import via **Window → Package Manager → My Assets**.

## Option 3 — OpenUPM

```bash
openupm add com.coplaydev.unity-mcp
```

## Start the server and connect

After import, MCP for Unity opens a setup wizard automatically.

1. Confirm Python and `uv` are installed.
2. Click **Done** after dependencies are green.
3. Pick clients and click **Configure Selected**.

Return to **Window → MCP for Unity** to start or stop the server, switch HTTP/stdio, or reconfigure clients. The status panel reads `Connected` when ready.

## Manual MCP client configuration

### HTTP

```json
{
  "mcpServers": {
    "unityMCP": {
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

### VS Code

```json
{
  "servers": {
    "unityMCP": {
      "type": "http",
      "url": "http://localhost:8080/mcp"
    }
  }
}
```

### Stdio

```json
{
  "mcpServers": {
    "unityMCP": {
      "command": "uvx",
      "args": ["--from", "mcpforunityserver", "mcp-for-unity", "--transport", "stdio"]
    }
  }
}
```

## Troubleshooting

- **Unity Bridge not connecting** — open **Window → MCP for Unity** and inspect status.
- **Server not starting** — verify `uv --version` and inspect logs.
- **Client not connecting** — confirm HTTP is running on `localhost:8080` and the configured URL matches.
