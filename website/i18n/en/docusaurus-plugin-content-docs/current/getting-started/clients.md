---
id: clients
slug: /getting-started/clients
title: Choosing an MCP Client
sidebar_label: Choosing a Client
description: Compare MCP clients that MCP for Unity can auto-configure.
---

# Choosing an MCP Client

MCP for Unity can auto-configure supported clients detected on your machine. Pick one based on transport and workflow.

## Capability matrix

| Client | Transport | Auto-config | Notes |
|---|---|---|---|
| **Claude Desktop** | stdio only | yes | Simple setup; stdio is selected for this client. |
| **Claude Code** | HTTP | yes | Strong multi-tool terminal workflow. |
| **Cursor** | HTTP | yes | Enable the MCP server in Cursor settings after configuration. |
| **VS Code (Copilot)** | HTTP | yes | Uses `servers` in configuration. |
| **Windsurf** | HTTP | yes | Auto-connects after config. |
| **Cline** | HTTP | yes | Auto-connects after config. |
| **GitHub Copilot CLI** | HTTP | yes | Terminal agent. |
| **Codex** | HTTP | yes | Auto-connects. |
| **Qwen Code** | HTTP | yes | Auto-connects. |
| **Gemini CLI** | HTTP | yes | Auto-connects. |
| **OpenClaw** | HTTP / stdio | yes | Requires `openclaw-mcp-bridge`. |
| **Antigravity** | HTTP | yes | Enable MCP in client settings. |

## How to pick

- For the simplest local setup, use Claude Desktop.
- For multi-agent or remote use, choose an HTTP client.
- For IDE workflows, consider Cursor, VS Code Copilot, or Cline.
- For terminal workflows, consider Claude Code, Copilot CLI, Codex, Gemini CLI, or Qwen Code.

## Manual configuration

See [Install](./install) for configuration snippets when auto-configuration is unavailable.
