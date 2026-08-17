---
title: カスタムツールを追加する
sidebar_label: カスタムツール
description: McpForUnityTool属性とreflectionを使い、Unity project固有のtoolを追加します。
---

# カスタムツールを追加する

MCP for UnityはC# attributeとreflectionからcustom toolを自動検出します。手動のregistration listは不要です。

## 最小構成

Unity project内の任意の`Editor/` folderへC# fileを置きます。Editor assembly以外はtool discovery対象になりません。

```csharp
using Newtonsoft.Json.Linq;
using MCPForUnity.Editor.Helpers;
using MCPForUnity.Editor.Tools;

namespace MyProject.Editor.CustomTools
{
    [McpForUnityTool("my_custom_tool")]
    public static class MyCustomTool
    {
        public class Parameters
        {
            [ToolParameter("Value to process")]
            public string param1 { get; set; }

            [ToolParameter("Optional integer payload", Required = false)]
            public int? param2 { get; set; }
        }

        public static object HandleCommand(JObject @params)
        {
            var parameters = @params.ToObject<Parameters>();
            if (string.IsNullOrEmpty(parameters.param1))
                return new ErrorResponse("param1 is required");

            return new SuccessResponse("Custom tool executed successfully!", new
            {
                parameters.param1,
                parameters.param2
            });
        }
    }
}
```

必要な要素は次の3つです。

1. `[McpForUnityTool("tool_name")]`
2. `public static object HandleCommand(JObject @params)`
3. 必要に応じたnested `Parameters` classと`[ToolParameter]`

## MCP clientへ反映する

toolを追加した後はMCP clientをserverへ再接続し、tool discoveryを更新します。clientによってはMCP for Unity server設定の再読み込みやclient再起動が必要です。

CLIから確認する場合:

```bash
unity-mcp tool list
unity-mcp custom_tool list
unity-mcp editor custom-tool "my_custom_tool"
unity-mcp editor custom-tool "my_custom_tool" --params '{"param1":"value"}'
```

## 長時間処理はpollingを使う

test、lightmap bake、player buildなど、1 callで完了しない処理はpolled toolとして実装します。

```csharp
[McpForUnityTool(
    "bake_lightmaps",
    RequiresPolling = true,
    PollAction = "status"
)]
```

### 1. 処理開始時に`PendingResponse`を返す

```csharp
return new PendingResponse("Starting lightmap bake", 0.5, data);
```

### 2. `PollAction`を処理する

poll時には`pending` / `complete` / `error`を返します。

```csharp
return new { _mcp_status = "complete", message = "Bake finished", data = state };
```

`PollAction`文字列は記述どおりに呼ばれます。snake_case / camelCaseの自動変換はありません。

### 3. domain reloadをまたぐstateは永続化する

Unity domain reloadでstatic fieldは失われます。継続処理のstateは`McpJobStateStore`で`Library/`へ保存します。

```csharp
McpJobStateStore.SaveState(ToolName, state);
var state = McpJobStateStore.LoadState<State>(ToolName);
```

## polling protocol

- `_mcp_status: "pending"` — polling継続
- `_mcp_status: "complete"` — 完了
- `_mcp_status: "error"` — 失敗
- `_mcp_poll_interval` — 次回確認までの秒数。server側で0.1〜5秒へclampされます
- null / empty response — 処理継続として再poll
- timeout — 最大時間を超えた場合は最後のresponseを添えてtimeout error

## 実装時の原則

- project固有toolは`Editor/` assemblyへ置く
- parameterは`ToolParameter`で明示する
- validation errorは`ErrorResponse`として返す
- 長時間処理を同期callで待たせずpollingへ分ける
- domain reloadをまたぐstateをstatic fieldだけに置かない
- 既存toolで表現できる操作ならcustom toolを増やさない
