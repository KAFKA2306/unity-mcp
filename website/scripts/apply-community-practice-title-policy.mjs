import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const candidatePath = path.join(websiteRoot, 'static', 'data', 'community-practice-candidates.json');
const candidateDocPath = path.join(websiteRoot, 'docs', 'community-practice-candidates.md');
const rejectionPath = path.join(websiteRoot, 'data', 'community-practice-rejections.json');
const reportPath = path.join(websiteRoot, 'community-practice-title-policy-report.json');
const POLICY_VERSION = 1;
const MAX_REJECTIONS = 5_000;

const policies = [
  ['retrospective', /振り返って|振り返り|年が経った|周年|\d+年目|活動記録|近況/i],
  ['product-review', /レビュー|review\b|開封|使用感|買ってみた|使ってみた[！!]?$/i],
  ['shopping', /買うべき|おすすめ商品|セール|amazon|prime.?day|プライムデー|購入ガイド|予算別.*pc/i],
  ['commerce', /販売を始め|販売しました|発売しました|販売開始|boothで販売|頒布開始/i],
  ['event-report', /参加してき|行ってき|登壇して|出展して|イベントレポ|開催レポ|交流会|オフ会|集会/i]
];

function loadJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function titleDecision(title = '') {
  for (const [name, pattern] of policies) {
    if (pattern.test(title)) return { rejected: true, policy: name };
  }
  return { rejected: false, policy: null };
}

function renderCandidateDoc(items) {
  const lines = [
    '---',
    'id: community-practice-candidates',
    'title: VRChat / Unity 実践記事 — 自動収集候補',
    'description: GitHub Actions が定期探索し、技術実践性スコアとタイトルpolicyを通過したVRChat、Unity、Blender記事候補。',
    'slug: /community-practice/candidates',
    '---',
    '',
    '# VRChat / Unity 実践記事 — 自動収集候補',
    '',
    'このページは GitHub Actions が定期探索した **未検証候補** です。第二世代classifierとタイトルpolicyでイベント・日記・商品レビュー・販売告知などを除外していますが、正確性や現行仕様との適合は保証しません。検証後に採用した記事だけ [検証済みカタログ](/community-practice) へ移します。',
    '',
    `現在の候補: **${items.length}件**`,
    '',
    '| score | 公開日 | 記事 | 出典 | 検出トピック |',
    '| ---: | --- | --- | --- | --- |'
  ];
  for (const item of items) {
    const title = (item.title ?? '(title unavailable)').replaceAll('|', '\\|');
    const source = (item.source ?? '').replaceAll('|', '\\|');
    const topics = (item.topics ?? []).join(', ').replaceAll('|', '\\|');
    lines.push(`| ${item.quality_score ?? ''} | ${item.published_at ?? ''} | [${title}](${item.url}) | ${source} | ${topics} |`);
  }
  lines.push('', '機械可読データ: [`/data/community-practice-candidates.json`](/data/community-practice-candidates.json)', '');
  return `${lines.join('\n')}\n`;
}

function selfTest() {
  const rejected = [
    '2025年を振り返って - 一年中こたつ出てる',
    'VRChatアバター改変に液タブは使えるのか！？HUION Kamvas 13をレビュー',
    '【2026年】Amazonプライムデーで買うべきVRChat関連おすすめ商品まとめ',
    '【VRChat】ワールドの販売を始めてみました',
    'VRChat公式Creator Meetupに参加してきた'
  ];
  for (const title of rejected) if (!titleDecision(title).rejected) throw new Error(`policy should reject: ${title}`);

  const accepted = [
    '【VRChat】UdonSharp開発環境の構築：VCC導入からインタラクトオブジェクト作成まで',
    '【VRChat】VIVE Ultimate Trackerの電源をワンボタンでまとめてオフにするツールを作った',
    '【VRChat】Light Limit Changerの逆光ライトをバッチリ光らせる設定方法',
    '【VRChat】Avatar Optimizerで軽いアバターになろう！'
  ];
  for (const title of accepted) if (titleDecision(title).rejected) throw new Error(`policy should retain: ${title}`);
}

selfTest();
if (!process.argv.includes('--live')) {
  console.log(JSON.stringify({ status: 'offline', policy_version: POLICY_VERSION, self_test: 'passed' }, null, 2));
  process.exit(0);
}

const candidates = loadJson(candidatePath, { items: [] });
const rejectionFile = loadJson(rejectionPath, { items: [] });
const rejectedAt = new Date().toISOString();
const rejectionMap = new Map((rejectionFile.items ?? []).map((item) => [item.url, item]));
const kept = [];
const removed = [];

for (const item of candidates.items ?? []) {
  const decision = titleDecision(item.title ?? '');
  if (!decision.rejected) {
    kept.push(item);
    continue;
  }
  const rejection = {
    url: item.url,
    title: item.title,
    source: item.source ?? 'unknown',
    source_id: item.source_id ?? 'unknown',
    rejected_at: rejectedAt,
    classifier_version: item.quality_version ?? candidates.classifier_version ?? 2,
    score: item.quality_score ?? null,
    decision: `reject-title-policy:${decision.policy}`,
    signals: [`title-policy:${decision.policy}`],
    policy_version: POLICY_VERSION
  };
  rejectionMap.set(item.url, rejection);
  removed.push(rejection);
}

if (removed.length) {
  const nextCandidates = {
    ...candidates,
    generated_at: rejectedAt,
    title_policy_version: POLICY_VERSION,
    items: kept
  };
  const nextRejections = {
    ...rejectionFile,
    title_policy_version: POLICY_VERSION,
    items: [...rejectionMap.values()].sort((a, b) => (b.rejected_at ?? '').localeCompare(a.rejected_at ?? '')).slice(0, MAX_REJECTIONS)
  };
  fs.writeFileSync(candidatePath, `${JSON.stringify(nextCandidates, null, 2)}\n`);
  fs.writeFileSync(candidateDocPath, renderCandidateDoc(kept));
  fs.writeFileSync(rejectionPath, `${JSON.stringify(nextRejections, null, 2)}\n`);
}

const report = {
  status: 'success',
  policy_version: POLICY_VERSION,
  removed: removed.length,
  candidate_count: kept.length,
  removed_items: removed.map(({ url, title, decision }) => ({ url, title, decision }))
};
fs.writeFileSync(reportPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
