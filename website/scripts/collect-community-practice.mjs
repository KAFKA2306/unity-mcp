import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(websiteRoot, 'data', 'community-practice-sources.json');
const curatedPath = path.join(websiteRoot, 'static', 'data', 'community-practice.json');
const candidatePath = path.join(websiteRoot, 'static', 'data', 'community-practice-candidates.json');
const candidateDocPath = path.join(websiteRoot, 'docs', 'community-practice-candidates.md');
const reportPath = path.join(websiteRoot, 'community-practice-discovery-report.json');

const FETCH_TIMEOUT_MS = 20_000;
const MAX_FEED_ARTICLES_PER_SOURCE = 40;
const USER_AGENT = 'unity-mcp-community-practice-discovery/1.0';
const ARTICLE_TEXT_LIMIT = 60_000;

const vrchatAnchor = /vrchat|vrcsdk|vrc sdk|creator companion|\bvcc\b|modular avatar|モジュラーアバター|avatar optimizer|ndmf|udonsharp|udon sharp|physbones?|liltoon|poiyomi|vrc avatar descriptor|vrc scene descriptor/i;
const practicalAnchor = /unity|blender|avatar|アバター|衣装|改変|world|ワールド|udon|shader|シェーダ|physbone|expression|animator|weight|ウェイト|bone|ボーン|armature|アーマチュア|mesh|メッシュ|shape key|シェイプキー|upload|アップロード|build|ビルド|light|ライト|texture|テクスチャ|material|マテリアル|optimization|最適化|quest|performance rank|constraint|コンストレイント|設定|手順|方法|解説|使い方|実装|制作|トラブル|エラー|失敗|修正|自動化/i;

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
  ['Bakery', /\bbakery\b/i]
];

function decodeEntities(value = '') {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
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

function decodeBody(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) return gunzipSync(buffer).toString('utf8');
  return buffer.toString('utf8');
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: 'follow',
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: {
      'user-agent': USER_AGENT,
      accept: 'text/html,application/xml,text/xml,application/rss+xml,application/atom+xml,*/*'
    }
  });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} ${url}`);
    error.httpStatus = response.status;
    throw error;
  }
  return decodeBody(Buffer.from(await response.arrayBuffer()));
}

function parseFeed(xml) {
  const blocks = [
    ...[...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((m) => m[0]),
    ...[...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((m) => m[0])
  ];
  return blocks.map((block) => {
    const href = first(block, [
      /<link\b[^>]*href=["']([^"']+)["'][^>]*\/?\s*>/i,
      /<link\b[^>]*>([\s\S]*?)<\/link>/i,
      /<guid\b[^>]*>([\s\S]*?)<\/guid>/i
    ]);
    return {
      url: href ? normalizeUrl(stripHtml(href)) : null,
      title: stripHtml(first(block, [/<title\b[^>]*>([\s\S]*?)<\/title>/i]) ?? ''),
      published_at: sourceDate(first(block, [
        /<pubDate\b[^>]*>([\s\S]*?)<\/pubDate>/i,
        /<published\b[^>]*>([\s\S]*?)<\/published>/i,
        /<updated\b[^>]*>([\s\S]*?)<\/updated>/i,
        /<dc:date\b[^>]*>([\s\S]*?)<\/dc:date>/i
      ])),
      author: stripHtml(first(block, [
        /<dc:creator\b[^>]*>([\s\S]*?)<\/dc:creator>/i,
        /<author\b[^>]*>[\s\S]*?<name\b[^>]*>([\s\S]*?)<\/name>[\s\S]*?<\/author>/i,
        /<author\b[^>]*>([\s\S]*?)<\/author>/i
      ]) ?? ''),
      summary: stripHtml(first(block, [
        /<content:encoded\b[^>]*>([\s\S]*?)<\/content:encoded>/i,
        /<content\b[^>]*>([\s\S]*?)<\/content>/i,
        /<description\b[^>]*>([\s\S]*?)<\/description>/i,
        /<summary\b[^>]*>([\s\S]*?)<\/summary>/i
      ]) ?? '').slice(0, ARTICLE_TEXT_LIMIT)
    };
  }).filter((item) => item.url && item.title);
}

function parseSitemap(xml) {
  const sitemaps = [...xml.matchAll(/<sitemap\b[\s\S]*?<loc>([\s\S]*?)<\/loc>([\s\S]*?)<\/sitemap>/gi)]
    .map((match) => ({
      url: decodeEntities(match[1]),
      lastmod: first(match[2], [/<lastmod[^>]*>([\s\S]*?)<\/lastmod>/i])
    }));
  const urls = [...xml.matchAll(/<url\b[\s\S]*?<loc>([\s\S]*?)<\/loc>([\s\S]*?)<\/url>/gi)]
    .map((match) => ({
      url: normalizeUrl(decodeEntities(match[1])),
      lastmod: first(match[2], [/<lastmod[^>]*>([\s\S]*?)<\/lastmod>/i])
    }));
  return { sitemaps, urls };
}

function jsonStringValue(html, key) {
  const match = html.match(new RegExp(`"${key}"\\s*:\\s*("(?:\\\\.|[^"\\\\])*")`, 'i'));
  if (!match) return null;
  try {
    return JSON.parse(match[1]);
  } catch {
    return null;
  }
}

function parseArticle(html, fallbackUrl, feed = {}) {
  const title = first(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i
  ]) ?? feed.title ?? null;
  const description = first(html, [
    /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+name=["']description["'][^>]+content=["']([^"']*)["']/i,
    /<meta[^>]+content=["']([^"']*)["'][^>]+(?:property=["']og:description["']|name=["']description["'])/i
  ]);
  const canonical = first(html, [
    /<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i,
    /<link[^>]+href=["']([^"']+)["'][^>]+rel=["']canonical["']/i
  ]);
  const published = first(html, [
    /<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']article:published_time["']/i,
    /["']datePublished["']\s*:\s*["']([^"']+)["']/i,
    /<time[^>]+datetime=["']([^"']+)["']/i
  ]);
  const author = first(html, [
    /<meta[^>]+name=["']author["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+property=["']article:author["'][^>]+content=["']([^"']+)["']/i,
    /["']author["']\s*:\s*\{[\s\S]*?["']name["']\s*:\s*["']([^"']+)["']/i
  ]) ?? feed.author ?? null;
  const article = html.match(/<article\b[^>]*>([\s\S]*?)<\/article>/i);
  const structuredBody = jsonStringValue(html, 'articleBody');
  const body = article ? stripHtml(article[1]) : structuredBody ? stripHtml(structuredBody) : stripHtml(html);
  return {
    url: normalizeUrl(canonical ?? fallbackUrl),
    title: title ? stripHtml(title) : feed.title ?? null,
    description: description ? stripHtml(description) : feed.summary ?? null,
    published_at: sourceDate(published) ?? feed.published_at ?? null,
    author: author ? stripHtml(author) : feed.author ?? null,
    article_text: body.slice(0, ARTICLE_TEXT_LIMIT)
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

function loadJson(file, fallback) {
  if (!fs.existsSync(file)) return fallback;
  return JSON.parse(fs.readFileSync(file, 'utf8'));
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

function prioritizeSitemaps(items, max) {
  return [...items]
    .sort((a, b) => (b.lastmod ?? '').localeCompare(a.lastmod ?? '') || b.url.localeCompare(a.url))
    .slice(0, max);
}

function selfTest() {
  const feed = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[VRChat Blender 衣装対応]]></title><link>https://example.com/a</link><pubDate>Thu, 20 Aug 2026 00:00:00 GMT</pubDate><description><![CDATA[UnityとBlenderで非対応衣装のウェイトを修正する手順]]></description></item></channel></rss>`;
  const parsedFeed = parseFeed(feed);
  if (parsedFeed.length !== 1 || parsedFeed[0].published_at !== '2026-08-20') throw new Error('feed self-test failed');

  const sitemap = `<sitemapindex><sitemap><loc>https://note.com/sitemaps/a.xml.gz</loc><lastmod>2026-08-20</lastmod></sitemap></sitemapindex>`;
  const parsedSitemap = parseSitemap(decodeBody(gzipSync(Buffer.from(sitemap))));
  if (parsedSitemap.sitemaps.length !== 1) throw new Error('sitemap self-test failed');

  const practical = parseArticle('<html><head><meta property="og:title" content="VRChatで非対応衣装を直す"><meta property="article:published_time" content="2026-08-20T00:00:00+09:00"></head><body><article>Blenderでウェイト転送し、UnityでModular Avatarを設定する手順。</article></body></html>', 'https://example.com/practical');
  if (!isPractical(practical)) throw new Error('practical article self-test failed');

  const social = parseArticle('<html><head><meta property="og:title" content="VRChatで友達と遊んだ日記"></head><body><article>イベントの感想と写真。</article></body></html>', 'https://example.com/social');
  if (isPractical(social)) throw new Error('social false-positive self-test failed');
}

selfTest();

if (!process.argv.includes('--live')) {
  console.log(JSON.stringify({ status: 'offline', self_test: 'passed' }, null, 2));
  process.exit(0);
}

const registry = loadJson(sourcePath, { sources: [] });
const sources = (registry.sources ?? []).filter((source) => source.enabled);
const curated = loadJson(curatedPath, { items: [] });
const existingFile = loadJson(candidatePath, { schema_version: 1, items: [] });
const existing = new Map((existingFile.items ?? []).map((item) => [normalizeUrl(item.url), item]));
const curatedUrls = new Set((curated.items ?? []).map((item) => normalizeUrl(item.url)));
const discoveredAt = new Date().toISOString();
const report = {
  status: 'success',
  discovered_at: discoveredAt,
  curated_urls: curatedUrls.size,
  existing_candidates: existing.size,
  new_candidates: 0,
  sources: [],
  errors: []
};

async function consider(url, source, feed = {}) {
  const normalized = normalizeUrl(url);
  if (!normalized || curatedUrls.has(normalized) || existing.has(normalized)) return false;
  try {
    const article = parseArticle(await fetchText(normalized), normalized, feed);
    if (!article.title || !isPractical(article)) return false;
    if (curatedUrls.has(article.url) || existing.has(article.url)) return false;
    existing.set(article.url, stableCandidate(article, source, discoveredAt));
    report.new_candidates += 1;
    return true;
  } catch (error) {
    report.errors.push({ source: source.id, url: normalized, error: String(error.message ?? error) });
    return false;
  }
}

for (const source of sources.filter((item) => item.kind === 'feed')) {
  const sourceReport = { id: source.id, kind: source.kind, entries: 0, considered: 0, added: 0, status: 'success' };
  try {
    const entries = parseFeed(await fetchText(source.url));
    sourceReport.entries = entries.length;
    const preliminary = entries
      .filter((entry) => !curatedUrls.has(normalizeUrl(entry.url)) && !existing.has(normalizeUrl(entry.url)))
      .filter((entry) => vrchatAnchor.test(`${entry.title} ${entry.summary}`) && practicalAnchor.test(`${entry.title} ${entry.summary}`))
      .slice(0, MAX_FEED_ARTICLES_PER_SOURCE);
    sourceReport.considered = preliminary.length;
    for (const entry of preliminary) if (await consider(entry.url, source, entry)) sourceReport.added += 1;
  } catch (error) {
    sourceReport.status = 'failed';
    sourceReport.error = String(error.message ?? error);
    report.errors.push({ source: source.id, url: source.url, error: sourceReport.error });
  }
  report.sources.push(sourceReport);
}

for (const source of sources.filter((item) => item.kind === 'sitemap')) {
  const sourceReport = { id: source.id, kind: source.kind, sitemap_documents: 0, considered: 0, added: 0, status: 'success' };
  try {
    const root = parseSitemap(await fetchText(source.url));
    sourceReport.sitemap_documents += 1;
    const allUrls = [...root.urls];
    for (const sitemap of prioritizeSitemaps(root.sitemaps, source.max_sitemaps ?? 12)) {
      try {
        const parsed = parseSitemap(await fetchText(sitemap.url));
        sourceReport.sitemap_documents += 1;
        allUrls.push(...parsed.urls);
      } catch (error) {
        report.errors.push({ source: source.id, url: sitemap.url, error: String(error.message ?? error) });
      }
    }
    const articlePattern = source.platform === 'note' ? /^https:\/\/note\.com\/[^/?#]+\/n\/[a-z0-9_-]+\/?$/i : /^https?:\/\//i;
    const unknown = [...new Map(allUrls
      .filter((item) => articlePattern.test(item.url))
      .filter((item) => !curatedUrls.has(normalizeUrl(item.url)) && !existing.has(normalizeUrl(item.url)))
      .sort((a, b) => (b.lastmod ?? '').localeCompare(a.lastmod ?? ''))
      .map((item) => [normalizeUrl(item.url), item])).values()]
      .slice(0, source.max_unknown_articles ?? 60);
    sourceReport.considered = unknown.length;
    for (const item of unknown) if (await consider(item.url, source)) sourceReport.added += 1;
  } catch (error) {
    sourceReport.status = 'failed';
    sourceReport.error = String(error.message ?? error);
    report.errors.push({ source: source.id, url: source.url, error: sourceReport.error });
  }
  report.sources.push(sourceReport);
}

if (report.errors.length && report.sources.every((source) => source.status === 'failed')) report.status = 'failed';
else if (report.errors.length) report.status = 'partial';

const items = [...existing.values()].sort((a, b) => (b.published_at ?? '').localeCompare(a.published_at ?? '') || a.url.localeCompare(b.url));
const nextFile = {
  schema_version: 1,
  generated_at: report.new_candidates > 0 ? discoveredAt : existingFile.generated_at ?? discoveredAt,
  review_policy: 'Automated discovery only. Promote to community-practice.json only after source metadata and practical content are verified.',
  items
};

fs.writeFileSync(candidatePath, `${JSON.stringify(nextFile, null, 2)}\n`);
fs.writeFileSync(candidateDocPath, renderCandidateDoc(items));
fs.writeFileSync(reportPath, `${JSON.stringify({ ...report, candidate_count: items.length }, null, 2)}\n`);
console.log(JSON.stringify({ ...report, candidate_count: items.length }, null, 2));
