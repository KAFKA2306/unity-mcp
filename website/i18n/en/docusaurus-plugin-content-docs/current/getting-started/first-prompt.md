---
id: first-prompt
slug: /getting-started/first-prompt
title: Your First Prompt
sidebar_label: Your First Prompt
description: End-to-end walkthrough from typing a prompt to seeing the result in Unity.
---

# Your First Prompt

After installing the package and connecting a client, try a concrete Unity task.

## Prerequisites

- [Install](./install) is complete
- MCP for Unity reports `Connected`
- A scene is open in Unity Editor

## The prompt

> Create a red, blue, and yellow cube in the current scene, spaced one unit apart on the X axis.

The assistant should inspect the scene, create three cubes, create or assign colored materials, and attach the materials to the MeshRenderers.

## What you should see

Three cubes appear in the Hierarchy and Scene view. If a URP/HDRP project shows gray materials, explicitly ask the assistant to use the correct shader.

## Next prompts

> Add a directional light and a perspective camera looking at the cubes.

> Write a C# script that makes the red cube oscillate and enter Play mode.

> Run all EditMode tests and report failures.

## When something goes wrong

- **`I couldn't find any Unity instance`** — check the MCP for Unity status panel.
- **`Multiple Unity instances detected`** — see [Multi-Instance Routing](/guides/multi-instance).
- **Tool calls succeed but nothing happens** — inspect tool-group visibility with `manage_tools` action `list_groups`.

## What to read next

- [Choosing an MCP Client](./clients)
- [Tool Groups](/guides/tool-groups)
- [Tool reference](/reference/tools)
