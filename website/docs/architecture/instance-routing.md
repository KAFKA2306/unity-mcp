---
title: インスタンスルーティングの契約
sidebar_label: インスタンスルーティング
description: 複数Unity Editorへtool callを振り分けるためのsession単位routing contractです。
---

# インスタンスルーティングの契約

MCP for Unityは、複数のUnity Editorが同じPython serverへ接続している場合でも、各tool callを明示したinstanceへ送れるようにします。

操作手順は[複数Unityインスタンス](/guides/multi-instance)にまとめ、このページでは設計上の契約だけを扱います。

## instance ID

Unity Editorは`Name@hash`形式のIDで識別します。

- `Name` — projectの`productName`
- `hash` — project pathから得る安定した短いidentifier

表示名だけでは同名projectを区別できないため、routingのcanonical keyにはhashを含めます。

## session既定値

`set_active_instance`で選んだinstanceはMCP session単位で保持します。

```text
set_active_instance(instance="MyGame@a1b2c3d4")
```

以後、そのsessionのtool callは明示overrideが無い限り同じinstanceへ送ります。

## call単位override

個別callに`unity_instance`を渡した場合、そのcallだけ指定instanceへ送ります。

```text
manage_scene(action="get_hierarchy", unity_instance="MyGame@a1b2c3d4")
```

session既定値を書き換えないため、2 project比較のようなcross-instance操作に使えます。

## instance未指定時

- 接続instanceが1つならlocal modeでは自動選択できる
- 複数instanceがあり既定値もoverrideも無い場合は、候補一覧を返して明示選択を要求する
- remote-hosted modeではuser isolationのため自動選択を前提にしない

## HTTPとstdio

- HTTP — active instanceはMCP session単位で保持する
- stdio — process-local sessionとして保持し、port shorthandも利用できる

routing stateをglobal singletonにすると複数clientが互いの選択を上書きするため、sessionを境界にします。

## domain reload

Unity domain reload中はregistryからinstanceが一時的に消えることがあります。instance解決前に失敗したcallはUnityへdispatchされていないため、副作用はありません。

一方、Unity側で実行を開始した後のtimeoutは別です。idempotency keyがないcommandを無条件でretryすると二重適用になる可能性があるため、長時間commandでは状態を確認してから再実行します。

## 実装を追う

- instance discovery: `mcpforunity://instances`
- session選択: `set_active_instance`
- tool call override: `unity_instance`
- transport: `Server/src/transport/`
- routing middleware: `Server/src/`内のinstance routing関連実装
