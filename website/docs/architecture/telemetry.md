---
title: テレメトリ
sidebar_label: テレメトリ
description: MCP for Unityの匿名telemetryで収集する情報、無効化方法、保存先を説明します。
---

# テレメトリ

MCP for Unityには、利用状況やfailure傾向を把握するための匿名telemetryがあります。このページは既存実装が収集する項目と無効化方法を説明します。

## 収集対象

### 利用状況

- 使用したMCP tool名
- 実行時間、成功 / 失敗
- Unity version、OS platform、MCP version
- 初回script作成などのmilestone event

### 技術diagnostic

- bridgeの起動・接続結果
- 匿名化・短縮されたerror message
- server startupやconnection latency

## 収集しないもの

- source code / script本文
- project名、file名、path
- 個人情報
- project固有の機密data

## 無効化する

次のいずれかを`true`にします。

```bash
export DISABLE_TELEMETRY=true
export UNITY_MCP_DISABLE_TELEMETRY=true
export MCP_DISABLE_TELEMETRY=true
```

MCP client configへ入れる場合:

```json
{
  "env": {
    "DISABLE_TELEMETRY": "true"
  }
}
```

Unity Editor側にtelemetry toggleがあるversionでは、MCP for Unity settingsからも無効化できます。

## local保存

主な保存先:

- Windows: `%APPDATA%\UnityMCP\`
- macOS: `~/Library/Application Support/UnityMCP/`
- Linux: `~/.local/share/UnityMCP/`

既存実装では匿名identifierやmilestone stateをlocal fileへ保存します。

## 送信

telemetryはHTTPS POSTで上流telemetry endpointへ送信します。送信failureがUnity操作を止めないようbackground / fail-safeとして実装されています。

## 開発時に確認する

Python側ではtelemetry helperからeventを記録し、有効状態を確認できます。

```python
from core.telemetry import record_telemetry, RecordType

record_telemetry(RecordType.USAGE, {
    "custom_event": "my_feature_used"
})
```

```python
from core.telemetry import is_telemetry_enabled

print(is_telemetry_enabled())
```

## event例

```json
{
  "record": "tool_execution",
  "customer_uuid": "550e8400-e29b-41d4-a716-446655440000",
  "session_id": "abc123-def456-ghi789",
  "data": {
    "tool_name": "manage_script",
    "success": true,
    "duration_ms": 42.5
  }
}
```

匿名UUID、tool名、performance値は含まれますが、code本文やproject pathは含めません。

telemetryの正確なfield・endpoint・retentionは実装が変更される可能性があるため、最終的な正本は`Server/src/core/telemetry`周辺の現在のcodeです。
