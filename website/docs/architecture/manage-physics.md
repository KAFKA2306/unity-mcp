---
title: manage_physicsの構造
sidebar_label: 物理操作
description: manage_physicsのaction構成、C# / Python分離、互換性方針を説明します。
---

# `manage_physics`の構造

`manage_physics`はUnityの3D / 2D physicsを1つのMCP toolへまとめています。設定、collision matrix、material、joint、query、force、Rigidbody、validation、simulationをactionで分けます。

## 主なaction category

| Category | 代表action |
|---|---|
| Settings | `ping`, `get_settings`, `set_settings` |
| Collision Matrix | `get_collision_matrix`, `set_collision_matrix` |
| Materials | `create_physics_material`, `configure_physics_material`, `assign_physics_material` |
| Joints | `add_joint`, `configure_joint`, `remove_joint` |
| Queries | `raycast`, `raycast_all`, `linecast`, `shapecast`, `overlap` |
| Forces | `apply_force` |
| Rigidbody | `get_rigidbody`, `configure_rigidbody` |
| Validation | `validate` |
| Simulation | `simulate_step` |

## C#側

`MCPForUnity/Editor/Tools/Physics/`でdomainごとにclassを分け、巨大な単一handlerへ集約しない構造です。

- `ManagePhysics.cs` — action dispatch / tool registration
- `PhysicsSettingsOps.cs`
- `CollisionMatrixOps.cs`
- `PhysicsMaterialOps.cs`
- `JointOps.cs`
- `PhysicsQueryOps.cs`
- `PhysicsForceOps.cs`
- `PhysicsRigidbodyOps.cs`
- `PhysicsValidationOps.cs`
- `PhysicsSimulationOps.cs`

## Python側

- `Server/src/services/tools/manage_physics.py` — MCP tool
- `Server/src/cli/commands/physics.py` — CLI
- `Server/tests/test_manage_physics.py` — Python unit test

MCPとCLIは別interfaceですが、最終的に同じC# actionへ到達します。

## 設計上の要点

- **2D / 3Dを自動判定**し、必要な場合だけ`dimension`で上書きする
- Unity version差分はcompatibility layerへ寄せる
- 大きなvalidation結果はpaginationする
- static colliderなど正常な構成を過剰なwarningにしない
- force / simulation / validationは結果を構造化して返し、LLM側の再推測を減らす

parameterの正確な一覧は[tool reference](/reference/tools)と実装を正本として確認してください。
