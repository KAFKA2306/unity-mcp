---
title: リモートServerのAPI Key認証
sidebar_label: リモートサーバー認証
description: shared remote serviceとしてMCP for Unityを運用する場合のAPI key認証とsession分離を設定します。
---

# リモートServerのAPI Key認証

MCP for Unity serverを共有remote serviceとして公開する場合、API keyで利用者を認証し、userごとにUnity sessionを分離できます。

## 前提条件

### 外部認証service

API keyの検証はMCP server自身ではなく、外部HTTP endpointへ委譲します。endpointは次を満たす必要があります。

- `POST`を受ける
- body: `{"api_key":"<key>"}`
- keyの有効性と安定した`user_id`をJSONで返す
- MCP serverからnetwork到達できる

### HTTP transport

API key認証は`--transport http`でのみ利用できます。stdio modeには影響しません。

## server設定

| Argument | Environment variable | 既定 | 内容 |
|---|---|---|---|
| `--http-remote-hosted` | `UNITY_MCP_HTTP_REMOTE_HOSTED` | `false` | remote-hosted modeを有効化 |
| `--api-key-validation-url URL` | `UNITY_MCP_API_KEY_VALIDATION_URL` | なし | key検証endpoint。remote-hostedでは必須 |
| `--api-key-login-url URL` | `UNITY_MCP_API_KEY_LOGIN_URL` | なし | key発行・管理画面URL |
| `--api-key-cache-ttl SECONDS` | `UNITY_MCP_API_KEY_CACHE_TTL` | `300` | 検証済みkeyのcache秒数 |
| `--api-key-service-token-header HEADER` | `UNITY_MCP_API_KEY_SERVICE_TOKEN_HEADER` | なし | auth serviceへ送るservice-token header名 |
| `--api-key-service-token TOKEN` | `UNITY_MCP_API_KEY_SERVICE_TOKEN` | なし | server-to-server認証token |

remote-hostedを有効にしてvalidation URLが無い場合、serverはstartup時にerrorで終了します。

### 起動例

```bash
python -m src.main \
  --transport http \
  --http-host 0.0.0.0 \
  --http-port 8080 \
  --http-remote-hosted \
  --api-key-validation-url https://auth.example.com/api/validate-key \
  --api-key-login-url https://app.example.com/api-keys \
  --api-key-cache-ttl 120
```

environment variableでも設定できます。

```bash
export UNITY_MCP_TRANSPORT=http
export UNITY_MCP_HTTP_HOST=0.0.0.0
export UNITY_MCP_HTTP_PORT=8080
export UNITY_MCP_HTTP_REMOTE_HOSTED=true
export UNITY_MCP_API_KEY_VALIDATION_URL=https://auth.example.com/api/validate-key
export UNITY_MCP_API_KEY_LOGIN_URL=https://app.example.com/api-keys
python -m src.main
```

## service token

auth service側もMCP serverを認証する場合はserver-to-server tokenを設定します。

```bash
--api-key-service-token-header X-Service-Token \
--api-key-service-token "your-server-secret"
```

validation endpointを外部から直接乱用されにくくするため、利用できる場合は設定を推奨します。

## Unity plugin側

remote serverへ接続するuserはUnity Editorで次を設定します。

1. **MCP for Unity** windowを開く
2. connection modeにHTTP Remoteを選ぶ
3. API Key fieldへkeyを入力する
4. 必要なら **Get API Key** からlogin URLを開く

keyは`EditorPrefs`へmachine単位で保存され、source controlには入りません。

## MCP client設定

API keyが設定されると、対応configuratorは`X-API-Key` headerを生成configへ追加します。

```json
{
  "mcpServers": {
    "mcp-for-unity": {
      "url": "http://remote-server:8080/mcp",
      "headers": {
        "X-API-Key": "<your-api-key>"
      }
    }
  }
}
```

Claude Code例:

```bash
claude mcp add --transport http mcp-for-unity http://remote-server:8080/mcp \
  --header "X-API-Key: <your-api-key>"
```

## remote-hosted modeで変わる動作

### MCP callは認証必須

`/mcp`へのtool / resource requestは`X-API-Key`が必須です。missing / invalid keyはMCP errorになります。

### WebSocket接続時にも認証する

Unity pluginの`/hub/plugin` handshakeでもkeyを検証します。

| 状態 | WebSocket close code | 意味 |
|---|---|---|
| keyなし | `4401` | API key required |
| invalid key | `4403` | Invalid API key |
| auth service障害 | `1013` | Try again later |
| valid key | 接続成功 | `user_id`をconnection stateへ保存 |

### userごとにsessionを分離する

userは自分と同じ`user_id`で接続したUnity instanceだけを参照・操作できます。他userのinstanceは一覧にも表示しません。

### instance自動選択を無効化する

local modeでは接続instanceが1つなら自動選択しますが、remote-hostedでは明示的に`set_active_instance`を呼びます。候補は`mcpforunity://instances`から取得します。

### unauthenticated REST routeを無効化する

remote-hostedでは次を無効化します。

- `POST /api/command`
- `GET /api/instances`
- `GET /api/custom-tools`

次は認証に関係なく利用できます。

- `GET /health`
- `GET /api/auth/login-url`

## validation contract

request:

```http
POST <api-key-validation-url>
Content-Type: application/json

{
  "api_key": "<the-api-key>"
}
```

valid response:

```json
{
  "valid": true,
  "user_id": "user-abc-123",
  "metadata": {}
}
```

invalid response:

```json
{
  "valid": false,
  "error": "API key expired"
}
```

HTTP `401`もinvalid keyとして扱います。

- request timeout: 5秒
- retry: 1回、100ms backoff
- error時: deny by default
- 5xx / timeout / network errorはcacheせず、次回requestで再検証

## トラブルシューティング

**全tool callで`API key authentication required`**  
client configに`X-API-Key`が入っているか、Unity plugin側にkeyを設定したか確認します。

**serverがcode 1ですぐ終了する**  
`--http-remote-hosted`には`--api-key-validation-url`または`UNITY_MCP_API_KEY_VALIDATION_URL`が必要です。

**WebSocketが4401で閉じる**  
Unity pluginがAPI keyを送っていません。

**WebSocketが1013で閉じる**  
auth serviceへ到達できません。MCP serverからvalidation URLへのnetwork経路を確認します。

**自分のUnity instanceが見えない**  
Unity pluginとMCP clientが同じ`user_id`へ解決されるAPI keyを使用しているか確認します。

**key revoke後もしばらく通る**  
検証済みkeyは`--api-key-cache-ttl`秒cacheされます。より早いrevokeが必要ならTTLを短くします。
