---
id: multi-instance
slug: /guides/multi-instance
title: 複数Unityインスタンスのルーティング
sidebar_label: 複数Unityインスタンス
description: set_active_instanceとcall単位の指定で、1つのMCP sessionから複数のUnity Editorを操作します。
---

# 複数Unityインスタンスのルーティング

複数のUnity Editorを同時に開き、1つのMCP sessionから操作対象を切り替えられます。

## 主な用途

- 共通packageを変更し、2つのprojectで同じ変更を検証する
- Unity LTSとUnity 6の挙動を比較する
- runtime projectとtooling projectを同時に接続する
- 普段のprojectとCI fixture projectを並行して扱う

## instanceの識別方法

接続したUnity Editorは`Name@hash`形式の安定したIDを通知します。

- `Name` — Player Settingsのproject `productName`
- `hash` — project pathから計算した安定した8文字hash

例: `MyGame@a1b2c3d4`

次の指定方法も利用できます。

- **hash prefix** — 例: 他と重複しなければ`a1b`
- **port number** — stdio通信のみ

## instanceを確認する

次のresourceを読み取ります。

> `mcpforunity://instances`

現在接続中のEditorについて、`Name@hash`、project path、transport、portを返します。多くのMCP clientでは`unity_instances` resourceとして表示されます。

## sessionのactive instanceを設定する

```
set_active_instance(instance="MyGame@a1b2c3d4")
```

設定後は、変更するまで**同じsession内の後続tool call**がそのinstanceへ送られます。通常は最初に1回選び、その後は普通にpromptを続けます。

次の指定も可能です。

```
set_active_instance(instance="a1b")         # hash prefix
set_active_instance(instance="6401")        # port number（stdioのみ）
```

## session既定値を変えず1 callだけ別instanceへ送る

個別tool callに`unity_instance`を渡します。

```
manage_scene(action="get_hierarchy", unity_instance="MyGame@a1b2c3d4")
```

「2つのprojectから同じscriptを読み、差分を比較する」のようなpromptで有効です。`set_active_instance`と同様、`Name@hash`、hash prefix、stdioではport numberを使用できます。

## active instance未設定時

- **Unity Editorが1つだけ接続** → 自動的にそのinstanceを使用します。
- **複数Editorが接続しactive未設定** → 利用可能なinstance一覧を含むerrorになります。`set_active_instance`後に再実行します。

## HTTPとstdioの違い

- **HTTP** — instance状態はMCP session（`MCP-Session-Id`）単位です。同じPython serverへ接続した複数clientが、それぞれ別のEditorを選べます。
- **stdio** — clientごとにPython processが分かれるためport numberの省略指定も使え、session keyはsubprocessごとのUUIDです。

routingのkeyはsessionです。client idそのものではありません。

## 複数agentから1つのEditorを操作する場合

routingは「どのEditorへ送るか」を決めます。複数agentが同じEditorへ同時にcallする場合、Unity側は1 commandずつ実行します。受信loopは各commandの完了を待ってから次のframeを読むため、同時callは重ならずqueueされます。

高負荷時は通常よりlatencyが伸びます。batchにしてもUnity側の処理throughput自体は大きく増えません。

またdomain reload中はinstance registryが一時的に空になり、次のようなerrorが出ることがあります。

```
Instance 'MyGame@a1b2c3d4' not found. Available: none.
Read mcpforunity://instances for current sessions.
```

この場合、Editor自体は生きており、再登録の短いwindowにcallが重なっただけのことがあります。instance解決時点で失敗したcallはUnityへ届いていないため、副作用は発生していません。

**ただしretryは常に安全ではありません。** idempotency keyは無いため、timeoutしたcommandがUnity側で既に実行中だった場合、同じcommandを再送すると二重適用になる可能性があります。

| serverが失敗と判断した時点 | 影響 | retry |
|---|---|---|
| dispatch前（instance解決失敗） | なし | 安全 |
| queue中で未実行（connection切断） | なし | 安全 |
| Unityで実行開始後にtimeout | **適用済み**。遅れて返った結果は破棄される | そのまま再実行しない |

通常のtool callは30秒budgetへ近づきませんが、`execute_code`、長いimport、test実行では注意が必要です。`hint: "retry"`があっても、状態を確認してから再実行してください。

## 関連リファレンス

- [`set_active_instance`](/reference/tools/core/set_active_instance) — tool詳細
- [`unity_instances` resource](/reference/resources) — instance discovery
- [インスタンスルーティング](/architecture/instance-routing) — routing contract
