using System;
using MCPForUnity.Editor.Tools.VRChat;
using Newtonsoft.Json.Linq;
using NUnit.Framework;
using UnityEditor;
using UnityEngine;

namespace Anatawa12.ContinuousAvatarUploader.Editor
{
    public abstract class AvatarUploadSettingOrGroup : ScriptableObject
    {
    }

    public class AvatarUploadSetting : AvatarUploadSettingOrGroup
    {
    }

    public class AvatarUploadSettingGroup : AvatarUploadSettingOrGroup
    {
        public AvatarUploadSetting[] avatars = Array.Empty<AvatarUploadSetting>();
    }

    public class AvatarUploadSettingGroupGroup : AvatarUploadSettingOrGroup
    {
        public AvatarUploadSettingOrGroup[] groups = Array.Empty<AvatarUploadSettingOrGroup>();
    }
}

namespace MCPForUnityTests.Editor.Tools
{
    using Cau = Anatawa12.ContinuousAvatarUploader.Editor;

    [TestFixture]
    public class ContinuousAvatarUploaderTests
    {
        private const string Root = "Assets/Temp/ContinuousAvatarUploaderTests";

        [SetUp]
        public void SetUp()
        {
            if (!AssetDatabase.IsValidFolder("Assets/Temp"))
                AssetDatabase.CreateFolder("Assets", "Temp");
            if (!AssetDatabase.IsValidFolder(Root))
                AssetDatabase.CreateFolder("Assets/Temp", "ContinuousAvatarUploaderTests");
        }

        [TearDown]
        public void TearDown()
        {
            if (AssetDatabase.IsValidFolder(Root))
                AssetDatabase.DeleteAsset(Root);
        }

        [Test]
        public void DescribeSchema_ExplainsRecursiveFlatteningAndCycleRisk()
        {
            var raw = ContinuousAvatarUploader.HandleCommand(
                new JObject { ["action"] = "describe_schema" });
            var result = JObject.FromObject(raw);

            Assert.IsTrue(result.Value<bool>("success"));
            var types = (JArray)result["data"]["types"];
            Assert.AreEqual(2, types.Count);
            Assert.That(
                (string)types[1]["settings_semantics"],
                Does.Contain("recursively flattens"));
            Assert.That(
                (string)types[1]["cycle_risk"],
                Does.Contain("cycle guard"));
        }

        [Test]
        public void InspectGroup_FlattensNestedGroups()
        {
            var avatarA = CreateAsset<Cau.AvatarUploadSetting>("AvatarA.asset");
            var avatarB = CreateAsset<Cau.AvatarUploadSetting>("AvatarB.asset");
            var group = CreateAsset<Cau.AvatarUploadSettingGroup>("Group.asset");
            group.avatars = new[] { avatarA, avatarB };
            EditorUtility.SetDirty(group);

            var root = CreateAsset<Cau.AvatarUploadSettingGroupGroup>("Root.asset");
            root.groups = new Cau.AvatarUploadSettingOrGroup[] { group };
            EditorUtility.SetDirty(root);
            AssetDatabase.SaveAssets();

            var raw = ContinuousAvatarUploader.HandleCommand(new JObject
            {
                ["action"] = "inspect_group",
                ["target"] = AssetDatabase.GetAssetPath(root)
            });
            var result = JObject.FromObject(raw);

            Assert.IsTrue(result.Value<bool>("success"), result.ToString());
            Assert.AreEqual("groups", (string)result["data"]["direct_property"]);
            Assert.AreEqual(1, (int)result["data"]["direct_count"]);
            Assert.AreEqual(2, (int)result["data"]["flattened_count"]);
            Assert.IsFalse((bool)result["data"]["has_cycle"]);
        }

        [Test]
        public void InspectGroup_DetectsCycleWithoutRecursingForever()
        {
            var root = CreateAsset<Cau.AvatarUploadSettingGroupGroup>("Cycle.asset");
            root.groups = new Cau.AvatarUploadSettingOrGroup[] { root };
            EditorUtility.SetDirty(root);
            AssetDatabase.SaveAssets();

            var raw = ContinuousAvatarUploader.HandleCommand(new JObject
            {
                ["action"] = "inspect_group",
                ["target"] = AssetDatabase.GetAssetPath(root),
                ["max_depth"] = 16
            });
            var result = JObject.FromObject(raw);

            Assert.IsTrue(result.Value<bool>("success"), result.ToString());
            Assert.IsTrue((bool)result["data"]["has_cycle"]);
            Assert.Greater(((JArray)result["data"]["cycles"]).Count, 0);
            Assert.AreEqual(0, (int)result["data"]["flattened_count"]);
        }

        private static T CreateAsset<T>(string fileName) where T : ScriptableObject
        {
            var asset = ScriptableObject.CreateInstance<T>();
            string path = $"{Root}/{fileName}";
            AssetDatabase.CreateAsset(asset, path);
            return asset;
        }
    }
}
