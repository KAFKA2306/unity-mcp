---
title: リモート認証の設計
sidebar_label: リモート認証
description: remote-hosted HTTP serverでAPI key認証とuser単位session分離を行う設計です。
---

# リモート認証の設計

remote-hosted modeでは、MCP serverを複数userで共有できるようAPI key認証を入口に置きます。設定手順は[リモートServerのAPI Key認証](/guides/remote-server-auth)へ集約し、このページでは設計上の境界だけを扱います。

## 認証責務

MCP serverはAPI key databaseを持たず、外部validation endpointへ検証を委譲します。

```http
POST <validation-url>
Content-Type: application/json

{
  "api_key": "<key>"
}
```

valid responseは安定した`user_id`を返します。

```json
{
  "valid": true,
  "user_id": "user-abc-123"
}
```

`user_id`はremote session isolationのkeyとして使います。

## 認証する経路

remote-hosted modeでは少なくとも次の入口で同じidentity contractを使います。

- MCP HTTP `/mcp`
- Unity plugin WebSocket `/hub/plugin`

MCP clientとUnity pluginが同じAPI keyから同じ`user_id`へ解決されることで、自分のUnity instanceだけを参照できます。

## fail closed

validation serviceへ到達できない、keyが無い、keyがinvalidな場合は認証成功として扱いません。remote serviceで「認証serviceが落ちたから全員通す」というfallbackは行いません。

## session isolation

remote-hostedではuser Aのinstanceをuser Bの`mcpforunity://instances`へ混ぜません。`set_active_instance`も同じuser scope内だけで解決します。

## local modeとの分離

local HTTPやstdioへremote authの複雑さを持ち込まないため、API key enforcementはremote-hosted HTTPでのみ有効にします。

## unauthenticated endpoint

health checkやAPI key取得導線など、認証前に必要なendpointは明示的に限定します。command実行やinstance列挙のような操作surfaceをanonymous REST routeとして残しません。

## service-to-service認証

validation endpoint自体を保護する必要がある場合、MCP serverからauth serviceへservice token headerを付与できます。user API keyとserver credentialを同じ値にしません。

## cache

valid keyは短時間cacheできますが、revoke反映とのtrade-offがあります。transient network failureはvalid resultとしてcacheしません。

正確なCLI option、environment variable、close codeは[設定guide](/guides/remote-server-auth)と現在の実装を正本として確認してください。
