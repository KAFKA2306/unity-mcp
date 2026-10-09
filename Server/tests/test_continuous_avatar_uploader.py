"""Contract tests for read-only ContinuousAvatarUploader inspection routing."""

from __future__ import annotations

import asyncio
from types import SimpleNamespace
from unittest.mock import AsyncMock

from services.tools.continuous_avatar_uploader import continuous_avatar_uploader


def test_inspect_group_forwards_exact_asset_reference_and_depth(monkeypatch):
    calls = []

    async def fake_send(send_fn, instance, name, params):
        calls.append((instance, name, params))
        return {"success": True, "data": {"groups": ["child"]}}

    instance = object()
    context = SimpleNamespace(info=AsyncMock())
    monkeypatch.setattr(
        "services.tools.continuous_avatar_uploader.get_unity_instance_from_context",
        AsyncMock(return_value=instance),
    )
    monkeypatch.setattr(
        "services.tools.continuous_avatar_uploader.send_with_unity_instance",
        fake_send,
    )

    result = asyncio.run(
        continuous_avatar_uploader(
            context,
            action="inspect_group",
            target="Assets/Avatar/Groups/Main.asset",
            max_depth=4,
        )
    )

    assert result["success"] is True
    assert calls == [
        (
            instance,
            "continuous_avatar_uploader",
            {
                "action": "inspect_group",
                "target": "Assets/Avatar/Groups/Main.asset",
                "max_depth": 4,
            },
        )
    ]
    context.info.assert_awaited_once()


def test_list_groups_omits_optional_inspection_parameters(monkeypatch):
    calls = []

    async def fake_send(send_fn, instance, name, params):
        calls.append((name, params))
        return {"success": True, "data": []}

    context = SimpleNamespace(info=AsyncMock())
    monkeypatch.setattr(
        "services.tools.continuous_avatar_uploader.get_unity_instance_from_context",
        AsyncMock(return_value="unity-instance"),
    )
    monkeypatch.setattr(
        "services.tools.continuous_avatar_uploader.send_with_unity_instance",
        fake_send,
    )

    result = asyncio.run(continuous_avatar_uploader(context, action="list_groups"))
    assert result["success"] is True
    assert calls == [("continuous_avatar_uploader", {"action": "list_groups"})]


def test_unexpected_unity_response_fails_closed(monkeypatch):
    async def fake_send(send_fn, instance, name, params):
        return ["unexpected", "response"]

    monkeypatch.setattr(
        "services.tools.continuous_avatar_uploader.get_unity_instance_from_context",
        AsyncMock(return_value="unity-instance"),
    )
    monkeypatch.setattr(
        "services.tools.continuous_avatar_uploader.send_with_unity_instance",
        fake_send,
    )
    result = asyncio.run(
        continuous_avatar_uploader(
            SimpleNamespace(info=AsyncMock()),
            action="describe_schema",
        )
    )

    assert result["success"] is False
    assert "Unexpected response" in result["message"]
