import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(websiteRoot, 'data', 'community-practice-sources.json');
const statePath = path.join(websiteRoot, 'data', 'community-practice-index-state.json');
const curatedPath = path.join(websiteRoot, 'static', 'data', 'community-practice.json');
const candidatePath = path.join(websiteRoot, 'static', 'data', 'community-practice-candidates.json');
const candidateDocPath = path.join(websiteRoot, 'docs', 'community-practice-candidates.md');
const reportPath = path.join(websiteRoot, 'community-practice-index-discovery-report.json');

const FETCH_TIMEOUT_MS = 20_000;
const ARTICLE_TEXT_LIMIT = 60_000;
const DEFAULT_MAX_LINKS = 80;
const MAX_STATE_URLS = 10_000;
const USER_AGENT = 'unity-mcp-community-practice-index-discovery/1.0';

const vrchatAnchor = /vrchat|vrcsdk|vrc sdk|creator companion|\bvcc\b|modular avatar|モジュラーアバター|avatar optimizer|ndmf|udonsharp|udon sharp|physbones?|liltoon|poiyomi|vrc avatar descriptor|vrc scene descriptor/i;
const practicalAnchor = /unity|blender|avatar|アバター|衣装|改変|world|ワールド|udon|shader|シェーダ|physbone|expression|animator|weight|ウェイト|bone|ボーン|armature|アーマチュア|mesh|メッシュ|shape key|シェイプキー|upload|アップロード|build|ビルド|light|ライト|texture|テクスチャ|material|マテリアル|optimization|最適化|quest|performance rank|constraint|コンストレイント|設定|手順|方法|解説|使い方|実装|制作|トラブル|エラー|失敗|修正|自動化|network|同期|clientSim|デバッグ/i;

const topicRules = [
  ['VRChat', /vrchat|vrcsdk|vrc sdk/i],
  ['Unity', /\bunity\b/i],
  ['Blender', /\bblender\b/i],
  ['avatar', /avatar|アバター/i],
  ['outfit fitting', /衣装|outfit|clothing/i],
  ['weight editing', /weight|ウェイト/i],
  ['armature', /armature|アーマチュア|bone|ボーン/i],
  ['shape keys', /shape key|シェイプキー/i],
  ['Expression Menu', /expression menu|exメニュー|expression/i],
  ['Animator', /animator|fx layer|fxレイヤ/i],
  ['PhysBone', /physbone/i],
  ['UdonSharp', /udonsharp|udon sharp|u#/i],
  ['networking', /udonsynced|ownership|network|同期/i],
  ['shader', /shader|シェーダ|liltoon|poiyomi/i],
  ['lighting', /light|lighting|ライト|明るさ|bakery/i],
  ['optimization', /optim|最適化|performance rank|quest対応/i],
  ['automation', /automat|自動化|一括|continuous avatar uploader/i]
];

const toolRules = [
  ['Modular Avatar', /modular avatar|モジュラーアバター/i],
  ['Avatar Optimizer', /avatar optimizer/i],
  ['NDMF', /\bndmf\b/i],
  ['Robust Weight Transfer', /robust weight transfer/i],
  ['Handy Weight Edit', /handy weight edit/i],
  ['SKKeeper', /skkeeper/i],
  ['LoopTools', /looptools/i],
  ['Continuous Avatar Uploader', /continuous avatar uploader/i],
  ['lilToon', /liltoon/i],
  ['Poiyomi', /poiyomi/i],
  ['UdonSharp', /udonsharp|udon sharp|u#/i],
  ['ClientSim', /clientsim/i],
  ['Bakery', /\bbakery\b/i]
];

function loadJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
}

function decodeEntities(value = '') {
  return value
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function stripHtml(value = '') {
  return decodeEntities(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function first(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return decodeEntities(match[1]);
  }
  return null;
}

function normalizeUrl(value) {
  try {
    const url = new URL(value);
    url.hash = '';
    for (const key of [...url.searchParams.keys()]) {
      if (/^(utm_|fbclid|gclid)/i.test(key)) url.searchParams.delete(key);
    }
    url.pathname = url.pathname.replace(/\/$/, '');
    return url.toString().replace(/[?&]$/, '').replace(/\/$/, '');
  } catch {
    return value;
  }
}

function sourceDate(value) {
  if (!value) return null;
  const literal = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (literal) return literal[1];
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10);
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { 'user-agent': USER_AGENT, accept: 'text/html,*/*' }
  });
  if (!response.ok) throw new Error(`HTTP ${response.status} ${url}`);
  return Buffer.from(await response.arrayBuffer()).toString('utf8');
}

function parseIndexLinks(html, source) {
  const base = new URL(source.url);
  const pattern = source.article_url_regex ? new RegExp(source.article_url_regex, 'i') : null;
  const found = [];
  for (const match of html.matchAll(/<a\b[^>]*href=["']([^"']+)["'][^>]*>/gi)) {
    const raw = decodeEntities(match[1]);
    if (!raw || /^(?:mailto:|javascript:|tel:)/i.test(raw)) continue;
    try {
      const url = new URL(raw, base);
      if (source.same_origin !== false && url.origin !== base.origin) continue;
      if (pattern && !pattern.test(url.pathname)) continue;
      found.push(normalizeUrl(url.toString()));
    } catch {
      // Ignore malformed links from community pages.
    }
  }
  return [...new Set(found)].slice(0, source.max_links ?? DEFAULT_MAX_LINKS);
}

function parseArticle(html, fallbackUrl) {
  const title = first(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i
  ]);
  const description = first(html, [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i
  ]);
  const canonical = first(html, [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i
  ]);
  const published = first(html, [
    /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
    /["']datePublished["']\s*:\s*["']([^"']+)["']/i,
    /<time[^>]+datetime=["']([^"']+)["']/i
  ]);
  const author = first(html, [
    /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["']/i,
    /["']author["']\s*:\s*\{[\s\S]*?["']name["']\s*:\s*["']([^"']+)["']/i
  ]);
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  const body = stripHtml(article ? article[1] : html).slice(0, ARTICLE_TEXT_LIMIT);
  return {
    url: normalizeUrl(canonical ?? fallbackUrl),
    title: title ? stripHtml(title) : null,
    description: description ? stripHtml(description) : null,
    published_at: sourceDate(published),
    author: author ? stripHtml(author) : null,
    article_text: body
  };
}

function candidateText(article) {
  return `${article.title ?? ''} ${article.description ?? ''} ${article.article_text ?? ''}`;
}

function isPractical(article) {
  const text = candidateText(article);
  return vrchatAnchor.test(text) && practicalAnchor.test(text);
}

function detect(patterns, article) {
  const text = candidateText(article);
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function stableCandidate(article, source, discoveredAt) {
  return {
    title: article.title,
    url: article.url,
    author: article.author || null,
    source: source.platform,
    source_id: source.id,
    published_at: article.published_at,
    topics: detect(topicRules, article),
    tools: detect(toolRules, article),
    first_discovered_at: discoveredAt,
    review_status: 'discovered',
    evidence_type: 'community-practice-candidate'
  };
}

function renderCandidateDoc(items) {
  const lines = [
    '---',
    'id: community-practice-candidates',
    'title: VRChat / Unity 実践記事 — 自動収集候補',
    'description: GitHub Actions が定期探索したVRChat、Unity、Blenderの実践記事候補。検証済みカタログへ採用する前のキュー。',
    'slug: /community-practice/candidates',
    '---',
    '',
    '# VRChat / Unity 実践記事 — 自動収集候補',
    '',
    'このページは GitHub Actions が定期探索して保存した **未検証候補** です。候補であること自体は、記事内容の正確性や現行仕様との適合を保証しません。検証後に採用された記事は [検証済みカタログ](/community-practice) へ移します。',
    '',
    `現在の候補: **${items.length}件**`,
    '',
    '| 公開日 | 記事 | 出典 | 検出トピック |',
    '| --- | --- | --- | --- |'
  ];
  for (const item of items) {
    const title = (item.title ?? '(title unavailable)').replaceAll('|', '\\|');
    const source = (item.source ?? '').replaceAll('|', '\\|');
    const topics = (item.topics ?? []).join(', ').replaceAll('|', '\\|');
    lines.push(`| ${item.published_at ?? ''} | [${title}](${item.url}) | ${source} | ${topics} |`);
  }
  lines.push('', '機械可読データ: [`/data/community-practice-candidates.json`](/data/community-practice-candidates.json)', '');
  return `${lines.join('\n')}\n`;
}

function selfTest() {
  const source = { url: 'https://example.com/category/vrchat', article_url_regex: '^/archives/\\d+/?$' };
  const links = parseIndexLinks('<a href="/archives/123">A</a><a href="/category/x">X</a><a href="https://other.example/archives/9">Y</a>', source);
  if (links.length !== 1 || links[0] !== 'https://example.com/archives/123') throw new Error('index parser self-test failed');
  const practical = parseArticle('<html><head><meta property="og:title" content="VRChat UdonSharp 同期ボタンの作り方"></head><body><article>UnityでUdonSyncedを設定する実装手順。</article></body></html>', 'https://example.com/archives/123');
  if (!isPractical(practical)) throw new Error('index practical self-test failed');
}

selfTest();
if (!process.argv.includes('--live')) {
  console.log(JSON.stringify({ status: 'offline', self_test: 'passed' }, null, 2));
  process.exit(0);
}

const registry = loadJson(sourcePath, { sources: [] });
const sources = (registry.sources ?? []).filter((source) => source.enabled && source.kind === 'index');
const curated = loadJson(curatedPath, { items: [] });
const candidates = loadJson(candidatePath, { schema_version: 1, items: [] });
const state = loadJson(statePath, { schema_version: 1, seen: {} });
const curatedUrls = new Set((curated.items ?? []).map((item) => normalizeUrl(item.url)));
const existing = new Map((candidates.items ?? []).map((item) => [normalizeUrl(item.url), item]));
const seen = state.seen ?? {};
const discoveredAt = new Date().toISOString();
const report = { status: 'success', discovered_at: discoveredAt, new_candidates: 0, sources: [], errors: [] };

for (const source of sources) {
  const sourceReport = { id: source.id, kind: 'index', links: 0, skipped_seen: 0, considered: 0, added: 0, status: 'success' };
  try {
    const links = parseIndexLinks(await fetchText(source.url), source);
    sourceReport.links = links.length;
    for (const link of links) {
      const normalized = normalizeUrl(link);
      if (curatedUrls.has(normalized) || existing.has(normalized)) continue;
      if (seen[normalized]) {
        sourceReport.skipped_seen += 1;
        continue;
      }
      sourceReport.considered += 1;
      try {
        const article = parseArticle(await fetchText(normalized), normalized);
        seen[normalized] = discoveredAt;
        if (!article.title || !isPractical(article)) continue;
        if (curatedUrls.has(article.url) || existing.has(article.url)) continue;
        existing.set(article.url, stableCandidate(article, source, discoveredAt));
        sourceReport.added += 1;
        report.new_candidates += 1;
      } catch (error) {
        report.errors.push({ source: source.id, url: normalized, error: String(error.message ?? error) });
      }
    }
  } catch (error) {
    sourceReport.status = 'failed';
    sourceReport.error = String(error.message ?? error);
    report.errors.push({ source: source.id, url: source.url, error: sourceReport.error });
  }
  report.sources.push(sourceReport);
}

if (report.errors.length && report.sources.length && report.sources.every((source) => source.status === 'failed')) report.status = 'failed';
else if (report.errors.length) report.status = 'partial';

const items = [...existing.values()].sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? '') || a.url.localeCompare(b.url));
const nextCandidates = {
  schema_version: 1,
  generated_at: report.new_candidates > 0 ? discoveredAt : candidates.generated_at ?? discoveredAt,
  review_policy: 'Automated discovery only. Promote to community-practice.json only after source metadata and practical content are verified.',
  items
};
const stateEntries = Object.entries(seen).sort((a, b) => String(b[1]).localeCompare(String(a[1]))).slice(0, MAX_STATE_URLS);
fs.writeFileSync(candidatePath, `${JSON.stringify(nextCandidates, null, 2)}\n`);
fs.writeFileSync(candidateDocPath, renderCandidateDoc(items));
fs.writeFileSync(statePath, `${JSON.stringify({ schema_version: 1, seen: Object.fromEntries(stateEntries) }, null, 2)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify({ ...report, candidate_count: items.length, seen_count: stateEntries.length }, null, 2)}\n`);
console.log(JSON.stringify({ ...report, candidate_count: items.length, seen_count: stateEntries.length }, null, 2));
