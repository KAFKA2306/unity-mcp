using System;
using System.Collections.Generic;
using System.Linq;
using MCPForUnity.Editor.Helpers;
using Newtonsoft.Json.Linq;
using UnityEditor;
using UnityEngine;

namespace MCPForUnity.Editor.Tools.VRChat
{
    /// <summary>
    /// Read-only semantic inspection for anatawa12/ContinuousAvatarUploader group assets.
    /// This intentionally avoids a compile-time dependency on ContinuousAvatarUploader.
    /// </summary>
    [McpForUnityTool(
        "continuous_avatar_uploader",
        Description = "Understands ContinuousAvatarUploader AvatarUploadSettingGroup/GroupGroup semantics and inspects their asset graphs without taking a compile-time dependency on the package.",
        AutoRegister = false,
        Group = "scripting_ext")]
    public static class ContinuousAvatarUploader
    {
        private const string SettingType = "Anatawa12.ContinuousAvatarUploader.Editor.AvatarUploadSetting";
        private const string GroupType = "Anatawa12.ContinuousAvatarUploader.Editor.AvatarUploadSettingGroup";
        private const string GroupGroupType = "Anatawa12.ContinuousAvatarUploader.Editor.AvatarUploadSettingGroupGroup";
        private const int MaxNodes = 2048;

        public sealed class Parameters
        {
            [ToolParameter("Action: describe_schema, list_groups, or inspect_group.")]
            public string action { get; set; }

            [ToolParameter("Asset path or GUID for inspect_group.", Required = false)]
            public string target { get; set; }

            [ToolParameter("Maximum recursive group depth for traversal.", Required = false, DefaultValue = "32")]
            public int max_depth { get; set; }
        }

        public static object HandleCommand(JObject @params)
        {
            if (@params == null)
                return new ErrorResponse("Parameters cannot be null.");

            var p = new ToolParams(@params);
            string action = (p.Get("action") ?? string.Empty).Trim().ToLowerInvariant();

            try
            {
                switch (action)
                {
                    case "describe_schema":
                        return DescribeSchema();
                    case "list_groups":
                        return ListGroups(p.GetInt("max_depth", 32) ?? 32);
                    case "inspect_group":
                        return InspectGroup(p.Get("target"), p.GetInt("max_depth", 32) ?? 32);
                    case "":
                        return new ErrorResponse("'action' is required. Supported: describe_schema, list_groups, inspect_group.");
                    default:
                        return new ErrorResponse($"Unknown action '{action}'. Supported: describe_schema, list_groups, inspect_group.");
                }
            }
            catch (Exception ex)
            {
                return new ErrorResponse(ex.Message, new { stackTrace = ex.StackTrace });
            }
        }

        private static object DescribeSchema()
        {
            return new SuccessResponse(
                "ContinuousAvatarUploader group schema.",
                new
                {
                    installed = IsTypeLoaded(GroupType) || IsTypeLoaded(GroupGroupType),
                    upstream = "anatawa12/ContinuousAvatarUploader",
                    @namespace = "Anatawa12.ContinuousAvatarUploader.Editor",
                    types = new object[]
                    {
                        new
                        {
                            type = GroupType,
                            base_type = "AvatarUploadSettingOrGroup",
                            serialized_field = "avatars",
                            field_type = "AvatarUploadSetting[]",
                            settings_semantics = "Settings returns the avatars array directly."
                        },
                        new
                        {
                            type = GroupGroupType,
                            base_type = "AvatarUploadSettingOrGroup",
                            serialized_field = "groups",
                            field_type = "AvatarUploadSettingOrGroup[]",
                            former_serialized_name = "avatars",
                            settings_semantics = "Settings recursively flattens each non-null child group's Settings with SelectMany.",
                            null_semantics = "Null child entries contribute an empty array.",
                            cycle_risk = "The upstream getter has no cycle guard, so cyclic GroupGroup references can recurse indefinitely."
                        }
                    },
                    safe_editing = new
                    {
                        group_array_property = "avatars",
                        group_group_array_property = "groups",
                        recommended_writer = "manage_scriptable_object",
                        recommendation = "Inspect first, then patch object references through Unity SerializedObject paths. Reject cycles before saving."
                    }
                });
        }

        private static object ListGroups(int maxDepth)
        {
            maxDepth = ClampDepth(maxDepth);
            var guids = new HashSet<string>(StringComparer.Ordinal);

            foreach (string guid in AssetDatabase.FindAssets("t:AvatarUploadSettingGroup"))
                guids.Add(guid);
            foreach (string guid in AssetDatabase.FindAssets("t:AvatarUploadSettingGroupGroup"))
                guids.Add(guid);

            var items = new List<object>();
            bool truncated = false;

            foreach (string guid in guids.OrderBy(x => x, StringComparer.Ordinal))
            {
                if (items.Count >= 200)
                {
                    truncated = true;
                    break;
                }

                string path = AssetDatabase.GUIDToAssetPath(guid);
                var asset = AssetDatabase.LoadAssetAtPath<UnityEngine.Object>(path);
                if (asset == null || !IsSupportedRoot(asset))
                    continue;

                var traversal = Traverse(asset, maxDepth);
                items.Add(new
                {
                    name = asset.name,
                    path,
                    guid,
                    type = asset.GetType().FullName,
                    direct_property = DirectPropertyName(asset),
                    direct_count = ReadReferences(asset, DirectPropertyName(asset)).Count,
                    flattened_count = traversal.Flattened.Count,
                    has_cycle = traversal.Cycles.Count > 0,
                    traversal_truncated = traversal.Truncated
                });
            }

            return new SuccessResponse(
                $"Found {items.Count} ContinuousAvatarUploader group asset(s).",
                new
                {
                    installed = IsTypeLoaded(GroupType) || IsTypeLoaded(GroupGroupType),
                    count = items.Count,
                    items,
                    truncated
                });
        }

        private static object InspectGroup(string target, int maxDepth)
        {
            if (string.IsNullOrWhiteSpace(target))
                return new ErrorResponse("'target' is required for inspect_group. Use an asset path or GUID.");

            maxDepth = ClampDepth(maxDepth);

            if (!TryResolveTarget(target, out var asset, out var path, out var guid, out var error))
                return error;

            if (!IsSupportedRoot(asset))
            {
                return new ErrorResponse(
                    $"Target is not a ContinuousAvatarUploader group asset: {asset.GetType().FullName}",
                    new { path, guid, type = asset.GetType().FullName });
            }

            string directProperty = DirectPropertyName(asset);
            var directRefs = ReadReferences(asset, directProperty)
                .Select(DescribeReference)
                .ToArray();

            var traversal = Traverse(asset, maxDepth);

            return new SuccessResponse(
                $"Inspected ContinuousAvatarUploader group '{asset.name}'.",
                new
                {
                    name = asset.name,
                    path,
                    guid,
                    type = asset.GetType().FullName,
                    direct_property = directProperty,
                    direct_entries = directRefs,
                    direct_count = directRefs.Length,
                    flattened_settings = traversal.Flattened.Select(DescribeReference).ToArray(),
                    flattened_count = traversal.Flattened.Count,
                    cycles = traversal.Cycles,
                    has_cycle = traversal.Cycles.Count > 0,
                    traversal_truncated = traversal.Truncated,
                    max_depth = maxDepth,
                    semantics = IsTypeOrSubclass(asset, GroupGroupType)
                        ? "Equivalent intent to upstream groups.SelectMany(x => x?.Settings ?? Array.Empty<AvatarUploadSetting>()).ToArray(), but traversal is cycle-safe."
                        : "Equivalent intent to upstream Settings => avatars."
                });
        }

        private static int ClampDepth(int value)
        {
            if (value < 1) return 1;
            if (value > 128) return 128;
            return value;
        }

        private static bool TryResolveTarget(
            string target,
            out UnityEngine.Object asset,
            out string path,
            out string guid,
            out object error)
        {
            asset = null;
            path = null;
            guid = null;
            error = null;

            string candidatePath = target.Trim();

            if (!candidatePath.StartsWith("Assets/", StringComparison.OrdinalIgnoreCase)
                && !candidatePath.StartsWith("Packages/", StringComparison.OrdinalIgnoreCase))
            {
                string fromGuid = AssetDatabase.GUIDToAssetPath(candidatePath);
                if (!string.IsNullOrEmpty(fromGuid))
                    candidatePath = fromGuid;
            }

            asset = AssetDatabase.LoadAssetAtPath<UnityEngine.Object>(candidatePath);
            if (asset == null)
            {
                error = new ErrorResponse($"Asset not found for target '{target}'. Use an asset path or GUID.");
                return false;
            }

            path = AssetDatabase.GetAssetPath(asset);
            guid = AssetDatabase.AssetPathToGUID(path);
            return true;
        }

        private static bool IsSupportedRoot(UnityEngine.Object asset)
        {
            return IsTypeOrSubclass(asset, GroupType) || IsTypeOrSubclass(asset, GroupGroupType);
        }

        private static string DirectPropertyName(UnityEngine.Object asset)
        {
            if (IsTypeOrSubclass(asset, GroupGroupType))
                return "groups";
            if (IsTypeOrSubclass(asset, GroupType))
                return "avatars";
            return null;
        }

        private static List<UnityEngine.Object> ReadReferences(UnityEngine.Object asset, string propertyName)
        {
            var result = new List<UnityEngine.Object>();
            if (asset == null || string.IsNullOrEmpty(propertyName))
                return result;

            using var serialized = new SerializedObject(asset);
            var property = serialized.FindProperty(propertyName);
            if (property == null || !property.isArray)
                return result;

            for (int i = 0; i < property.arraySize; i++)
            {
                var element = property.GetArrayElementAtIndex(i);
                if (element.propertyType == SerializedPropertyType.ObjectReference)
                    result.Add(element.objectReferenceValue);
            }

            return result;
        }

        private static TraversalResult Traverse(UnityEngine.Object root, int maxDepth)
        {
            var result = new TraversalResult();
            var stack = new List<int>();
            TraverseRecursive(root, 0, maxDepth, stack, result);
            return result;
        }

        private static void TraverseRecursive(
            UnityEngine.Object current,
            int depth,
            int maxDepth,
            List<int> stack,
            TraversalResult result)
        {
            if (current == null)
                return;

            if (depth > maxDepth || result.NodeCount >= MaxNodes)
            {
                result.Truncated = true;
                return;
            }

            result.NodeCount++;
            int instanceId = current.GetInstanceID();

            if (stack.Contains(instanceId))
            {
                result.Cycles.Add(new
                {
                    name = current.name,
                    path = AssetDatabase.GetAssetPath(current),
                    guid = AssetDatabase.AssetPathToGUID(AssetDatabase.GetAssetPath(current)),
                    type = current.GetType().FullName,
                    depth
                });
                return;
            }

            if (IsTypeOrSubclass(current, SettingType))
            {
                result.Flattened.Add(current);
                return;
            }

            string propertyName = DirectPropertyName(current);
            if (propertyName == null)
                return;

            stack.Add(instanceId);
            foreach (var child in ReadReferences(current, propertyName))
                TraverseRecursive(child, depth + 1, maxDepth, stack, result);
            stack.RemoveAt(stack.Count - 1);
        }

        private static object DescribeReference(UnityEngine.Object obj)
        {
            if (obj == null)
                return new { is_null = true };

            string path = AssetDatabase.GetAssetPath(obj);
            return new
            {
                is_null = false,
                name = obj.name,
                path,
                guid = string.IsNullOrEmpty(path) ? null : AssetDatabase.AssetPathToGUID(path),
                type = obj.GetType().FullName
            };
        }

        private static bool IsTypeLoaded(string fullName)
        {
            foreach (var assembly in AppDomain.CurrentDomain.GetAssemblies())
            {
                try
                {
                    if (assembly.GetType(fullName, false) != null)
                        return true;
                }
                catch
                {
                    // Ignore partially loaded or incompatible assemblies.
                }
            }

            return false;
        }

        private static bool IsTypeOrSubclass(UnityEngine.Object obj, string fullName)
        {
            if (obj == null)
                return false;

            for (Type type = obj.GetType(); type != null; type = type.BaseType)
            {
                if (string.Equals(type.FullName, fullName, StringComparison.Ordinal))
                    return true;
            }

            return false;
        }

        private sealed class TraversalResult
        {
            public readonly List<UnityEngine.Object> Flattened = new();
            public readonly List<object> Cycles = new();
            public int NodeCount;
            public bool Truncated;
        }
    }
}
