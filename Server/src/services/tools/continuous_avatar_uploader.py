"""Read-only ContinuousAvatarUploader group inspection.

Unity-side handler: MCPForUnity.Editor.Tools.VRChat.ContinuousAvatarUploader
Command name: "continuous_avatar_uploader"
"""

from __future__ import annotations

from typing import Annotated, Any, Literal

from fastmcp import Context
from mcp.types import ToolAnnotations

from services.registry import mcp_for_unity_tool
from services.tools import get_unity_instance_from_context
from transport.unity_transport import send_with_unity_instance
from transport.legacy.unity_connection import async_send_command_with_retry


@mcp_for_unity_tool(
    group="scripting_ext",
    description=(
        "Understand and inspect anatawa12/ContinuousAvatarUploader "
        "AvatarUploadSettingGroup and AvatarUploadSettingGroupGroup assets. "
        "Use describe_schema for the upstream Group.cs semantics, list_groups "
        "to discover project assets, and inspect_group for cycle-safe recursive flattening."
    ),
    annotations=ToolAnnotations(
        title="Continuous Avatar Uploader Groups",
        readOnlyHint=True,
        destructiveHint=False,
    ),
)
async def continuous_avatar_uploader(
    ctx: Context,
    action: Annotated[
        Literal["describe_schema", "list_groups", "inspect_group"],
        "Action to perform.",
    ],
    target: Annotated[
        str | None,
        "Asset path or GUID for inspect_group.",
    ] = None,
    max_depth: Annotated[
        int | None,
        "Maximum recursive group depth. Defaults to 32 and is clamped to 1..128.",
    ] = None,
) -> dict[str, Any]:
    unity_instance = await get_unity_instance_from_context(ctx)

    params: dict[str, Any] = {"action": action}
    if target is not None:
        params["target"] = target
    if max_depth is not None:
        params["max_depth"] = max_depth

    response = await send_with_unity_instance(
        async_send_command_with_retry,
        unity_instance,
        "continuous_avatar_uploader",
        params,
    )
    await ctx.info(f"Response {response}")
    return response if isinstance(response, dict) else {
        "success": False,
        "message": "Unexpected response from Unity.",
    }
