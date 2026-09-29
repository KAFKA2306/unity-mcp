---
title: continuous_avatar_uploader
sidebar_label: continuous_avatar_uploader
description: "Understand and inspect anatawa12/ContinuousAvatarUploader AvatarUploadSettingGroup and AvatarUploadSettingGroupGroup assets."
---

# `continuous_avatar_uploader`

> **Auto-generated** from the Python tool registry. Do not hand-edit outside `<!-- examples:start --><!-- examples:end -->` blocks — the generator (`tools/generate_docs_reference.py`) will overwrite them.

**Group:** `scripting_ext` &nbsp;·&nbsp; **Module:** `services.tools.continuous_avatar_uploader`

## Description

Understand and inspect anatawa12/ContinuousAvatarUploader AvatarUploadSettingGroup and AvatarUploadSettingGroupGroup assets. Use describe_schema for the upstream Group.cs semantics, list_groups to discover project assets, and inspect_group for cycle-safe recursive flattening.

## Parameters

| Name | Type | Required | Description |
|------|------|----------|-------------|
| `action` | `Literal['describe_schema', 'list_groups', 'inspect_group']` | yes | Action to perform. |
| `target` | `str \| None` | — | Asset path or GUID for inspect_group. |
| `max_depth` | `int \| None` | — | Maximum recursive group depth. Defaults to 32 and is clamped to 1..128. |

## Returns

A `dict` containing the Unity response. The exact shape depends on the action.

## Examples

<!-- examples:start -->
*No examples yet. Add usage examples here — they will be preserved across regenerations.*
<!-- examples:end -->

