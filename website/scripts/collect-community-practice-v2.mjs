import fs from 'node:fs';
import path from 'node:path';
import { gunzipSync, gzipSync } from 'node:zlib';
import { fileURLToPath } from 'node:url';

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const sourcePath = path.join(websiteRoot, 'data', 'community-practice-sources.json');
const statePath = path.join(websiteRoot, 'data', 'community-practice-discovery-state.json');
const legacyIndexStatePath = path.join(websiteRoot, 'data', 'community-practice-index-state.json');
const rejectionPath = path.join(websiteRoot, 'data', 'community-practice-rejections.json');
const curatedPath = path.join(websiteRoot, 'static', 'data', 'community-practice.json');
const candidatePath = path.join(websiteRoot, 'static', 'data', 'community-practice-candidates.json');
const candidateDocPath = path.join(websiteRoot, 'docs', 'community-practice-candidates.md');
const reportPath = path.join(websiteRoot, 'community-practice-discovery-v2-report.json');

const CLASSIFIER_VERSION = 2;
const FETCH_TIMEOUT_MS = 20_000;
const ARTICLE_TEXT_LIMIT = 70_000;
const MAX_FEED_ENTRIES = 50;
const MAX_REVALIDATE_EXISTING = 160;
const MAX_STATE_URLS = 20_000;
const MAX_REJECTIONS = 5_000;
const FETCH_CONCURRENCY = 6;
const USER_AGENT = 'unity-mcp-community-practice-discovery/2.0';

const vrchatPattern = /vrchat|vrcsdk|vrc sdk|creator companion|\bvcc\b|vrc avatar descriptor|vrc scene descriptor|modular avatar|モジュラーアバター|avatar optimizer|\bndmf\b|udonsharp|udon sharp|physbones?|liltoon|poiyomi/i;
const titleTechnicalPattern = /unity|blender|vrcsdk|vrc sdk|creator companion|\bvcc\b|udon|udonsharp|physbone|modular avatar|モジュラーアバター|avatar optimizer|\bndmf\b|liltoon|poiyomi|animator|expression|prefab|vpm|osc|tracker|shader|シェーダ|mesh|メッシュ|bone|ボーン|weight|ウェイト|armature|アーマチュア|shape key|シェイプキー|blendshape|ブレンドシェイプ|constraint|コンストレイント|clientsim|parameter|パラメータ|ギミック|アバター|衣装|ワールド/i;
const titleProcedurePattern = /手順|方法|解説|作り方|設定|対処|修正|導入|実装|構築|使い方|自動化|軽量化|変換|改変|対応|作成方法|制作方法|アップロード|同期|デバッグ|検証|変更する|適用する|直す|how[ -]?to|guide|setup|configure|fix|troubleshoot|workflow/i;
const titleToolBuildPattern = /ツールを作|ツール.*作った|自作|開発した|開発して|作成した|実装した|built|created|developed/i;
const socialTitlePattern = /参加してき|行ってき|登壇して|出展して|開催しました|開催レポ|イベントレポ|ミートアップ|meetup|集会|交流会|オフ会|感想|日記|旅行|雑談|キャリア相談|会社選び|企業文化|懇親会|写真集|振り返り/i;

const technicalEvidenceRules = [
  /\bunity\b/i, /\bblender\b/i, /vrcsdk|vrc sdk/i, /creator companion|\bvcc\b/i,
  /modular avatar|モジュラーアバター/i, /avatar optimizer/i, /\bndmf\b/i,
  /udonsharp|udon sharp|udonsynced|networkevent|ownership/i, /physbones?/i,
  /liltoon/i, /poiyomi/i, /animator controller|fx layer|fxレイヤ/i,
  /expression menu|expression parameters|exメニュー/i, /vrc avatar descriptor/i,
  /prefab variant|prefab/i, /vpm|vpm package/i, /clientsim/i, /osc/i,
  /shader|シェーダ/i, /material|マテリアル/i, /mesh|メッシュ/i,
  /armature|アーマチュア/i, /weight paint|weight transfer|ウェイト/i,
  /shape key|シェイプキー|blendshape|ブレンドシェイプ/i,
  /constraint|コンストレイント/i, /parameter|パラメータ/i,
  /build & publish|build and publish|アップロード/i, /project settings|package manager/i
];

const implementationEvidenceRules = [
  /Assets\//i, /Packages\//i, /Project Settings/i, /Package Manager/i,
  /Add Component|コンポーネントを追加/i, /Inspector|インスペクター/i,
  /VRC Avatar Descriptor/i, /VRC Scene Descriptor/i, /Animator Controller/i,
  /UdonSynced|SendCustomNetworkEvent|SetProgramVariable|GetProgramVariable/i,
  /\busing\s+[A-Za-z0-9_.]+\s*;/, /\bpublic\s+(?:class|void|bool|int|float|string)/,
  /\bprivate\s+(?:void|bool|int|float|string)/, /GetComponent\s*</,
  /\.cs\b/i, /\.unitypackage\b/i, /\.blend\b/i, /\.prefab\b/i,
  /weight paint|ウェイトペイント/i, /shape key|シェイプキー/i,
  /PhysBone/i, /Modular Avatar/i, /Avatar Optimizer/i, /UdonSharp/i
];

const procedureBodyPattern = /手順|クリック|選択|設定|追加|作成|変更|適用|インストール|導入|開く|押す|ドラッグ|インポート|エクスポート|確認|実行|配置|割り当て|install|import|export|select|click|add|configure|enable|disable|create|build/i;

const topicRules = [
  ['VRChat', /vrchat|vrcsdk|vrc sdk/i],
  ['Unity', /\bunity\b/i],
  ['Blender', /\bblender\b/i],
  ['avatar', /avatar|アバター/i],
  ['outfit fitting', /衣装|outfit|clothing/i],
  ['weight editing', /weight|ウェイト/i],
  ['armature', /armature|アーマチュア|bone|ボーン/i],
  ['shape keys', /shape key|シェイプキー|blendshape|ブレンドシェイプ/i],
  ['Expression Menu', /expression menu|exメニュー|expression parameters/i],
  ['Animator', /animator|fx layer|fxレイヤ/i],
  ['PhysBone', /physbone/i],
  ['UdonSharp', /udonsharp|udon sharp|u#/i],
  ['networking', /udonsynced|ownership|networkevent|同期/i],
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
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, '$1')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec) => String.fromCodePoint(parseInt(dec, 10)))
    .trim();
}

function stripHtml(value = '') {
  return decodeEntities(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[\s\S]*?<\/style>/gi, ' ')
    .replace(/<nav\b[\s\S]*?<\/nav>/gi, ' ')
    .replace(/<aside\b[\s\S]*?<\/aside>/gi, ' ')
    .replace(/<footer\b[\s\S]*?<\/footer>/gi, ' ')
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
    ...[...xml.matchAll(/<item\b[\s\S]*?<\/item>/gi)].map((match) => match[0]),
    ...[...xml.matchAll(/<entry\b[\s\S]*?<\/entry>/gi)].map((match) => match[0])
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
  const sitemaps = [...xml.matchAll(/<sitemap\b[\s\S]*?<loc>([\s\S]*?)<\/loc>([\s\S]*?)<\/sitemap>/gi)].map((match) => ({
    url: decodeEntities(match[1]),
    lastmod: first(match[2], [/<lastmod[^>]*>([\s\S]*?)<\/lastmod>/i])
  }));
  const urls = [...xml.matchAll(/<url\b[\s\S]*?<loc>([\s\S]*?)<\/loc>([\s\S]*?)<\/url>/gi)].map((match) => ({
    url: normalizeUrl(decodeEntities(match[1])),
    lastmod: first(match[2], [/<lastmod[^>]*>([\s\S]*?)<\/lastmod>/i])
  }));
  return { sitemaps, urls };
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
      // Ignore malformed links.
    }
  }
  return [...new Set(found)].slice(0, source.max_links ?? 80);
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
  ]) ?? feed.summary ?? null;
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
  const main = html.match(/<main\b[^>]*>([\s\S]*?)<\/main>/i);
  const structured = jsonStringValue(html, 'articleBody');
  const rawBody = article?.[1] ?? main?.[1] ?? structured ?? html;
  const body = stripHtml(rawBody).slice(0, ARTICLE_TEXT_LIMIT);
  return {
    url: normalizeUrl(canonical ?? fallbackUrl),
    title: title ? stripHtml(title) : feed.title ?? null,
    description: description ? stripHtml(description) : feed.summary ?? null,
    published_at: sourceDate(published) ?? feed.published_at ?? null,
    author: author ? stripHtml(author) : feed.author ?? null,
    article_text: body,
    code_block_count: (rawBody.match(/<(?:pre|code)\b/gi) ?? []).length
  };
}

function countDistinct(patterns, text) {
  return patterns.reduce((count, pattern) => count + (pattern.test(text) ? 1 : 0), 0);
}

function countMatches(pattern, text, max = 20) {
  const flags = pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`;
  const clone = new RegExp(pattern.source, flags);
  return Math.min(max, [...text.matchAll(clone)].length);
}

function classify(article) {
  const title = article.title ?? '';
  const description = article.description ?? '';
  const body = article.article_text ?? '';
  const all = `${title} ${description} ${body}`;
  const vrchatRelevant = vrchatPattern.test(all);
  const vrchatInTitle = vrchatPattern.test(title);
  const technicalTitle = titleTechnicalPattern.test(title);
  const proceduralTitle = titleProcedurePattern.test(title);
  const toolBuildTitle = titleToolBuildPattern.test(title);
  const socialTitle = socialTitlePattern.test(title);
  const technicalEvidence = countDistinct(technicalEvidenceRules, all);
  const implementationEvidence = countDistinct(implementationEvidenceRules, body);
  const procedureEvidence = countMatches(procedureBodyPattern, body);
  const codeEvidence = article.code_block_count ?? 0;

  let score = 0;
  const positive = [];
  const negative = [];

  if (vrchatInTitle) { score += 3; positive.push('vrchat-in-title:+3'); }
  else if (vrchatRelevant) { score += 2; positive.push('vrchat-in-body:+2'); }
  if (technicalTitle) { score += 3; positive.push('technical-title:+3'); }
  if (proceduralTitle) { score += 3; positive.push('procedural-title:+3'); }
  if (toolBuildTitle) { score += 2; positive.push('tool-build-title:+2'); }
  if (technicalEvidence >= 2) { score += 2; positive.push('technical-evidence>=2:+2'); }
  if (technicalEvidence >= 5) { score += 2; positive.push('technical-evidence>=5:+2'); }
  if (implementationEvidence >= 2) { score += 2; positive.push('implementation-evidence>=2:+2'); }
  if (implementationEvidence >= 5) { score += 1; positive.push('implementation-evidence>=5:+1'); }
  if (procedureEvidence >= 3) { score += 2; positive.push('procedure-evidence>=3:+2'); }
  if (codeEvidence >= 1) { score += 1; positive.push('code-block:+1'); }
  if (socialTitle) { score -= 8; negative.push('social-or-event-title:-8'); }

  const hasImplementationShape = technicalTitle || implementationEvidence >= 2;
  const hasPracticalShape = proceduralTitle || toolBuildTitle || procedureEvidence >= 3 || codeEvidence >= 1;
  const accepted = vrchatRelevant && !socialTitle && score >= 9 && hasImplementationShape && hasPracticalShape;

  return {
    version: CLASSIFIER_VERSION,
    accepted,
    score,
    vrchat_relevant: vrchatRelevant,
    technical_evidence: technicalEvidence,
    implementation_evidence: implementationEvidence,
    procedure_evidence: procedureEvidence,
    code_block_count: codeEvidence,
    positive_signals: positive,
    negative_signals: negative,
    decision: accepted ? 'accept' : socialTitle ? 'reject-social-event' : !vrchatRelevant ? 'reject-not-vrchat' : !hasImplementationShape ? 'reject-no-implementation' : !hasPracticalShape ? 'reject-no-practical-shape' : 'reject-low-score'
  };
}

function detect(patterns, article) {
  const text = `${article.title ?? ''} ${article.description ?? ''} ${article.article_text ?? ''}`;
  return patterns.filter(([, pattern]) => pattern.test(text)).map(([name]) => name);
}

function stableCandidate(article, source, discoveredAt, quality, prior = null) {
  return {
    title: article.title,
    url: article.url,
    author: article.author || prior?.author || null,
    source: source.platform ?? prior?.source ?? 'unknown',
    source_id: source.id ?? prior?.source_id ?? 'unknown',
    published_at: article.published_at ?? prior?.published_at ?? null,
    topics: detect(topicRules, article),
    tools: detect(toolRules, article),
    first_discovered_at: prior?.first_discovered_at ?? discoveredAt,
    last_verified_at: discoveredAt,
    review_status: 'discovered',
    evidence_type: 'community-practice-candidate',
    quality_version: quality.version,
    quality_status: 'accepted',
    quality_score: quality.score,
    quality_decision: quality.decision,
    quality_signals: [...quality.positive_signals, ...quality.negative_signals]
  };
}

function rejectionRecord(article, source, rejectedAt, quality, prior = null) {
  return {
    url: article.url,
    title: article.title ?? prior?.title ?? null,
    source: source.platform ?? prior?.source ?? 'unknown',
    source_id: source.id ?? prior?.source_id ?? 'unknown',
    rejected_at: rejectedAt,
    classifier_version: quality.version,
    score: quality.score,
    decision: quality.decision,
    signals: [...quality.positive_signals, ...quality.negative_signals]
  };
}

function renderCandidateDoc(items) {
  const lines = [
    '---',
    'id: community-practice-candidates',
    'title: VRChat / Unity 実践記事 — 自動収集候補',
    'description: GitHub Actions が定期探索し、技術実践性スコアを通過したVRChat、Unity、Blender記事候補。',
    'slug: /community-practice/candidates',
    '---',
    '',
    '# VRChat / Unity 実践記事 — 自動収集候補',
    '',
    'このページは GitHub Actions が定期探索した **未検証候補** です。第二世代classifierでイベント・日記・一般記事を除外していますが、正確性や現行仕様との適合は保証しません。検証後に採用した記事だけ [検証済みカタログ](/community-practice) へ移します。',
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

function prioritizeSitemaps(items, max) {
  return [...items].sort((a, b) => (b.lastmod ?? '').localeCompare(a.lastmod ?? '') || b.url.localeCompare(a.url)).slice(0, max);
}

async function mapLimit(items, limit, fn) {
  let cursor = 0;
  const workers = Array.from({ length: Math.min(limit, items.length) }, async () => {
    while (cursor < items.length) {
      const index = cursor++;
      await fn(items[index], index);
    }
  });
  await Promise.all(workers);
}

function selfTest() {
  const feed = `<?xml version="1.0"?><rss><channel><item><title><![CDATA[VRChat Blender 衣装対応の手順]]></title><link>https://example.com/a</link><pubDate>Thu, 20 Aug 2026 00:00:00 GMT</pubDate><description><![CDATA[UnityとBlenderでウェイトを修正する]]></description></item></channel></rss>`;
  if (parseFeed(feed).length !== 1) throw new Error('feed parser self-test failed');

  const sitemap = `<sitemapindex><sitemap><loc>https://note.com/sitemaps/a.xml.gz</loc><lastmod>2026-08-20</lastmod></sitemap></sitemapindex>`;
  if (parseSitemap(decodeBody(gzipSync(Buffer.from(sitemap)))).sitemaps.length !== 1) throw new Error('sitemap parser self-test failed');

  const indexSource = { url: 'https://example.com/category/vrchat', article_url_regex: '^/archives/\\d+/?$' };
  if (parseIndexLinks('<a href="/archives/123">A</a><a href="/category/x">X</a>', indexSource).length !== 1) throw new Error('index parser self-test failed');

  const howto = parseArticle('<html><head><meta property="og:title" content="VRChat UdonSharp 同期ボタンの作り方"></head><body><article><pre>public class SyncButton</pre>UnityでUdonSyncedを設定する手順。Inspectorでコンポーネントを追加し、Build & Publishを実行する。</article></body></html>', 'https://example.com/howto');
  if (!classify(howto).accepted) throw new Error('how-to classifier self-test failed');

  const outfit = parseArticle('<html><head><meta property="og:title" content="【VRChat】Blenderで非対応衣装を着せる方法"></head><body><article>BlenderでウェイトペイントとShape Keyを修正する。UnityにimportしてModular Avatarを設定し、VRC Avatar Descriptorを確認する。</article></body></html>', 'https://example.com/outfit');
  if (!classify(outfit).accepted) throw new Error('outfit classifier self-test failed');

  const toolBuild = parseArticle('<html><head><meta property="og:title" content="【VRChat】アバター設定を一括変更するUnityツールを作った"></head><body><article><code>using UnityEditor;</code>EditorWindowを実装する。InspectorのPrefabを選択し、Modular AvatarのParameter設定を変更する。</article></body></html>', 'https://example.com/tool');
  if (!classify(toolBuild).accepted) throw new Error('tool-build classifier self-test failed');

  const meetup = parseArticle('<html><head><meta property="og:title" content="VRChat公式Creator Meetupに参加してきた"></head><body><article>Unity、Blender、Modular Avatar、NDMF、PhysBoneの話を聞いた。会場で交流して写真を撮った。</article></body></html>', 'https://example.com/meetup');
  if (classify(meetup).accepted) throw new Error('meetup false-positive self-test failed');

  const career = parseArticle('<html><head><meta property="og:title" content="ITエンジニア キャリア相談集会で登壇してきました"></head><body><article>VRChatの集会で会社選びと企業文化について話した。Unityの話題も少し出た。</article></body></html>', 'https://example.com/career');
  if (classify(career).accepted) throw new Error('career false-positive self-test failed');
}

selfTest();
if (!process.argv.includes('--live')) {
  console.log(JSON.stringify({ status: 'offline', classifier_version: CLASSIFIER_VERSION, self_test: 'passed' }, null, 2));
  process.exit(0);
}

const registry = loadJson(sourcePath, { sources: [] });
const sources = (registry.sources ?? []).filter((source) => source.enabled);
const sourceById = new Map(sources.map((source) => [source.id, source]));
const curated = loadJson(curatedPath, { items: [] });
const candidateFile = loadJson(candidatePath, { schema_version: 1, items: [] });
const stateFile = loadJson(statePath, { schema_version: 1, classifier_version: CLASSIFIER_VERSION, seen: {} });
const legacyState = loadJson(legacyIndexStatePath, { seen: {} });
const rejectionFile = loadJson(rejectionPath, { schema_version: 1, classifier_version: CLASSIFIER_VERSION, items: [] });
const curatedUrls = new Set((curated.items ?? []).map((item) => normalizeUrl(item.url)));
const candidates = new Map((candidateFile.items ?? []).map((item) => [normalizeUrl(item.url), item]));
const state = { ...(legacyState.seen ?? {}), ...(stateFile.seen ?? {}) };
const rejections = new Map((rejectionFile.items ?? []).map((item) => [normalizeUrl(item.url), item]));
const discoveredAt = new Date().toISOString();
const report = {
  status: 'success',
  classifier_version: CLASSIFIER_VERSION,
  discovered_at: discoveredAt,
  existing_before: candidates.size,
  revalidated: 0,
  removed_existing: 0,
  retained_existing: 0,
  fetch_errors: 0,
  new_candidates: 0,
  new_rejections: 0,
  sources: [],
  errors: []
};

const existingToRevalidate = [...candidates.values()].filter((item) => item.quality_version !== CLASSIFIER_VERSION || item.quality_status !== 'accepted').slice(0, MAX_REVALIDATE_EXISTING);
await mapLimit(existingToRevalidate, FETCH_CONCURRENCY, async (prior) => {
  const key = normalizeUrl(prior.url);
  if (curatedUrls.has(key)) {
    candidates.delete(key);
    return;
  }
  const source = sourceById.get(prior.source_id) ?? { id: prior.source_id, platform: prior.source };
  try {
    const article = parseArticle(await fetchText(key), key, prior);
    const quality = classify(article);
    report.revalidated += 1;
    state[key] = { evaluated_at: discoveredAt, source_id: source.id, outcome: quality.accepted ? 'candidate' : quality.decision, classifier_version: CLASSIFIER_VERSION, score: quality.score };
    candidates.delete(key);
    if (quality.accepted) {
      candidates.set(article.url, stableCandidate(article, source, discoveredAt, quality, prior));
      report.retained_existing += 1;
    } else {
      rejections.set(article.url, rejectionRecord(article, source, discoveredAt, quality, prior));
      report.removed_existing += 1;
      report.new_rejections += 1;
    }
  } catch (error) {
    report.fetch_errors += 1;
    report.errors.push({ source: source.id, url: key, phase: 'revalidate', error: String(error.message ?? error) });
    candidates.set(key, { ...prior, quality_status: 'fetch-error', quality_decision: 'retry-later' });
  }
});

function isKnown(url) {
  const key = normalizeUrl(url);
  return curatedUrls.has(key) || candidates.has(key) || rejections.has(key) || Boolean(state[key]);
}

async function consider(url, source, feed = {}) {
  const normalized = normalizeUrl(url);
  if (!normalized || isKnown(normalized)) return 'skipped';
  try {
    const article = parseArticle(await fetchText(normalized), normalized, feed);
    if (!article.title) {
      state[normalized] = { evaluated_at: discoveredAt, source_id: source.id, outcome: 'reject-no-title', classifier_version: CLASSIFIER_VERSION, score: 0 };
      return 'rejected';
    }
    const quality = classify(article);
    state[article.url] = { evaluated_at: discoveredAt, source_id: source.id, outcome: quality.accepted ? 'candidate' : quality.decision, classifier_version: CLASSIFIER_VERSION, score: quality.score };
    if (!quality.accepted) {
      if (quality.vrchat_relevant) {
        rejections.set(article.url, rejectionRecord(article, source, discoveredAt, quality));
        report.new_rejections += 1;
      }
      return 'rejected';
    }
    if (curatedUrls.has(article.url) || candidates.has(article.url)) return 'skipped';
    candidates.set(article.url, stableCandidate(article, source, discoveredAt, quality));
    report.new_candidates += 1;
    return 'added';
  } catch (error) {
    report.fetch_errors += 1;
    report.errors.push({ source: source.id, url: normalized, phase: 'discover', error: String(error.message ?? error) });
    return 'error';
  }
}

for (const source of sources.filter((item) => item.kind === 'feed')) {
  const sourceReport = { id: source.id, kind: 'feed', entries: 0, considered: 0, added: 0, rejected: 0, status: 'success' };
  try {
    const entries = parseFeed(await fetchText(source.url));
    sourceReport.entries = entries.length;
    const preliminary = entries
      .filter((entry) => !isKnown(entry.url))
      .filter((entry) => vrchatPattern.test(`${entry.title} ${entry.summary}`) && (titleTechnicalPattern.test(entry.title) || titleProcedurePattern.test(entry.title) || titleToolBuildPattern.test(entry.title) || titleTechnicalPattern.test(entry.summary)))
      .slice(0, source.max_entries ?? MAX_FEED_ENTRIES);
    sourceReport.considered = preliminary.length;
    await mapLimit(preliminary, FETCH_CONCURRENCY, async (entry) => {
      const outcome = await consider(entry.url, source, entry);
      if (outcome === 'added') sourceReport.added += 1;
      else if (outcome === 'rejected') sourceReport.rejected += 1;
    });
  } catch (error) {
    sourceReport.status = 'failed';
    sourceReport.error = String(error.message ?? error);
    report.errors.push({ source: source.id, url: source.url, phase: 'feed', error: sourceReport.error });
  }
  report.sources.push(sourceReport);
}

for (const source of sources.filter((item) => item.kind === 'sitemap')) {
  const sourceReport = { id: source.id, kind: 'sitemap', sitemap_documents: 0, considered: 0, added: 0, rejected: 0, status: 'success' };
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
        report.errors.push({ source: source.id, url: sitemap.url, phase: 'sitemap-child', error: String(error.message ?? error) });
      }
    }
    const articlePattern = source.platform === 'note' ? /^https:\/\/note\.com\/[^/?#]+\/n\/[a-z0-9_-]+\/?$/i : /^https?:\/\//i;
    const unknown = [...new Map(allUrls
      .filter((item) => articlePattern.test(item.url))
      .filter((item) => !isKnown(item.url))
      .sort((a, b) => (b.lastmod ?? '').localeCompare(a.lastmod ?? ''))
      .map((item) => [normalizeUrl(item.url), item])).values()]
      .slice(0, source.max_unknown_articles ?? 60);
    sourceReport.considered = unknown.length;
    await mapLimit(unknown, FETCH_CONCURRENCY, async (item) => {
      const outcome = await consider(item.url, source);
      if (outcome === 'added') sourceReport.added += 1;
      else if (outcome === 'rejected') sourceReport.rejected += 1;
    });
  } catch (error) {
    sourceReport.status = 'failed';
    sourceReport.error = String(error.message ?? error);
    report.errors.push({ source: source.id, url: source.url, phase: 'sitemap', error: sourceReport.error });
  }
  report.sources.push(sourceReport);
}

for (const source of sources.filter((item) => item.kind === 'index')) {
  const sourceReport = { id: source.id, kind: 'index', links: 0, considered: 0, added: 0, rejected: 0, status: 'success' };
  try {
    const links = parseIndexLinks(await fetchText(source.url), source).filter((url) => !isKnown(url));
    sourceReport.links = links.length;
    sourceReport.considered = links.length;
    await mapLimit(links, FETCH_CONCURRENCY, async (url) => {
      const outcome = await consider(url, source);
      if (outcome === 'added') sourceReport.added += 1;
      else if (outcome === 'rejected') sourceReport.rejected += 1;
    });
  } catch (error) {
    sourceReport.status = 'failed';
    sourceReport.error = String(error.message ?? error);
    report.errors.push({ source: source.id, url: source.url, phase: 'index', error: sourceReport.error });
  }
  report.sources.push(sourceReport);
}

if (report.errors.length && report.sources.every((source) => source.status === 'failed')) report.status = 'failed';
else if (report.errors.length) report.status = 'partial';

const candidateItems = [...candidates.values()]
  .filter((item) => !curatedUrls.has(normalizeUrl(item.url)))
  .sort((a, b) => (b.quality_score ?? -999) - (a.quality_score ?? -999) || (b.published_at ?? '').localeCompare(a.published_at ?? '') || a.url.localeCompare(b.url));

const stateEntries = Object.entries(state).sort((a, b) => String(b[1]?.evaluated_at ?? b[1] ?? '').localeCompare(String(a[1]?.evaluated_at ?? a[1] ?? ''))).slice(0, MAX_STATE_URLS);
const rejectionItems = [...rejections.values()].sort((a, b) => (b.rejected_at ?? '').localeCompare(a.rejected_at ?? '')).slice(0, MAX_REJECTIONS);

const nextCandidates = {
  schema_version: 2,
  classifier_version: CLASSIFIER_VERSION,
  generated_at: discoveredAt,
  review_policy: 'Automated discovery plus technical-practice scoring. Promote to community-practice.json only after source metadata and practical content are manually or agent-verified.',
  items: candidateItems
};
const nextState = { schema_version: 1, classifier_version: CLASSIFIER_VERSION, seen: Object.fromEntries(stateEntries) };
const nextRejections = { schema_version: 1, classifier_version: CLASSIFIER_VERSION, items: rejectionItems };

fs.writeFileSync(candidatePath, `${JSON.stringify(nextCandidates, null, 2)}\n`);
fs.writeFileSync(candidateDocPath, renderCandidateDoc(candidateItems));
fs.writeFileSync(statePath, `${JSON.stringify(nextState, null, 2)}\n`);
fs.writeFileSync(rejectionPath, `${JSON.stringify(nextRejections, null, 2)}\n`);
fs.writeFileSync(reportPath, `${JSON.stringify({ ...report, candidate_count: candidateItems.length, rejection_count: rejectionItems.length, state_count: stateEntries.length }, null, 2)}\n`);
console.log(JSON.stringify({ ...report, candidate_count: candidateItems.length, rejection_count: rejectionItems.length, state_count: stateEntries.length }, null, 2));
