---
id: manifest
slug: /reference/manifest
title: manifest.jsonリファレンス
sidebar_label: manifest.json
description: repository rootのmanifest.jsonが表すMCP package metadataと各fieldの役割です。
---

# `manifest.json`リファレンス

repository rootの`manifest.json`は、Unity UPM用`MCPForUnity/package.json`とは別に、MCP marketplace / aggregator向けのpackage metadataを記述します。

## top-level field

| Field | Type | 内容 |
|---|---|---|
| `manifest_version` | string | manifest schema version |
| `name` | string | 表示名 |
| `version` | string | release semver |
| `description` | string | product説明 |
| `author.name` | string | maintainer表示名 |
| `author.url` | string | maintainer URL |
| `repository.type` | string | 通常`git` |
| `repository.url` | string | canonical repository URL |
| `homepage` | string | homepage |
| `documentation` | string | docs landing URL |
| `support` | string | Issue等のsupport URL |
| `icon` | string | manifestからの相対icon path |

## `server`

Python serverの起動方法をaggregatorへ伝えます。

```json
"server": {
  "type": "python",
  "entry_point": "Server/src/main.py",
  "mcp_config": {
    "command": "uvx",
    "args": ["--from", "mcpforunityserver", "mcp-for-unity"],
    "env": {}
  }
}
```

- `type` — runtime family
- `entry_point` — server entry file
- `mcp_config.command` / `args` — 推奨起動command
- `mcp_config.env` — 起動時environment variable

## `tools`

`{name, description}`のflat arrayで、marketplaceがlive serverを起動せずtool catalogを表示するために使います。

parameterを含む最も詳しいtool metadataの正本はPython registryです。[Tool reference](/reference/tools)はそこから自動生成されます。

## 他のmanifestとの違い

- MCP marketplace: repository root `manifest.json`
- Unity UPM: `MCPForUnity/package.json`
- Python package: `Server/pyproject.toml`

似たmetadataを持ちますが別surfaceです。versionやrenameを行う場合はそれぞれの役割を確認します。

MCPB bundle生成には`tools/generate_mcpb.py`を使用します。

現在のmanifest自体はrepository rootの`manifest.json`を正本として確認してください。
