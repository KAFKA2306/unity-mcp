import fs from "node:fs";
import path from "node:path";
import { gunzipSync, gzipSync } from "node:zlib";
import { fileURLToPath } from "node:url";

const websiteRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = path.join(websiteRoot, "data", "failures");
const outputPath = path.join(websiteRoot, "note-failure-candidates.json");
const registry = JSON.parse(fs.readFileSync(path.join(data, "sources-web.json"), "utf8"));
const noteSource = registry.find((source) => source.id === "note-sitemap" && source.enabled);
if (!noteSource) throw new Error("enabled note-sitemap source is missing");

const YEAR = "2026";
const MAX_SITEMAPS = 16;
const MAX_UNKNOWN_ARTICLES = 60;
const FETCH_TIMEOUT_MS = 20000;
const USER_AGENT = "unity-mcp-failure-kb-note-discovery/1.0";
const articlePattern = /^https:\/\/note\.com\/[^/?#]+\/n\/[a-z0-9_-]+\/?$/i;
const relevant = /vrchat|vrcsdk|vrc sdk|vcc|unity|avatar|アバター|world|ワールド|physbone|contact|modular avatar|モジュラーアバター|udon|shader|シェーダー|liltoon|poiyomi|pipeline manager|vrm/i;
const failure = /error|exception|fail|failed|failure|cannot|can't|unable|crash|broken|missing|warning|invalid|unsupported|pink|magenta|エラー|失敗|できない|出来ない|動かない|揺れない|掴めない|消える|消えた|表示されない|見えない|警告|不具合|直らない|アップロードできない|ビルドできない|変換できない|ピンク|マゼンタ/i;

function decodeEntities(value = "") {
  return value
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .trim();
}

function stripHtml(value = "") {
  return decodeEntities(value)
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
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
    url.hash = "";
    url.search = "";
    url.pathname = url.pathname.replace(/\/$/, "");
    return url.toString().replace(/\/$/, "");
  } catch {
    return value;
  }
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

function sourceDate(value) {
  if (!value) return null;
  const literal = value.match(/^(\d{4}-\d{2}-\d{2})/);
  if (literal) return literal[1];
  const parsed = new Date(value);
  return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10);
}

function parseArticle(html, fallbackUrl) {
  const title = first(html, [
    /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
    /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
    /<title[^>]*>([\s\S]*?)<\/title>/i
  ]);
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
  return {
    url: normalizeUrl(canonical ?? fallbackUrl),
    title: title ? stripHtml(title) : null,
    description: description ? stripHtml(description) : null,
    published_at: sourceDate(published),
    searchable_text: stripHtml(html).slice(0, 50000)
  };
}

function decodeBody(buffer) {
  if (buffer.length >= 2 && buffer[0] === 0x1f && buffer[1] === 0x8b) return gunzipSync(buffer).toString("utf8");
  return buffer.toString("utf8");
}

async function fetchText(url) {
  const response = await fetch(url, {
    redirect: "follow",
    signal: AbortSignal.timeout(FETCH_TIMEOUT_MS),
    headers: { "user-agent": USER_AGENT, accept: "text/html,application/xml,text/xml,*/*" }
  });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status} ${url}`);
    error.httpStatus = response.status;
    throw error;
  }
  return decodeBody(Buffer.from(await response.arrayBuffer()));
}

function knownEvidenceUrls() {
  const urls = new Set();
  const files = fs.readdirSync(data).filter((name) => /^records(?:-[a-z0-9-]+)?-2026\.json$/.test(name));
  for (const file of files) {
    const records = JSON.parse(fs.readFileSync(path.join(data, file), "utf8"));
    for (const record of records) for (const url of record.source_urls ?? []) urls.add(normalizeUrl(url));
  }
  return urls;
}

function prioritizeSitemaps(items) {
  return [...items]
    .sort((a, b) => {
      const aYear = a.lastmod?.startsWith(`${YEAR}-`) || a.url.includes(YEAR) ? 1 : 0;
      const bYear = b.lastmod?.startsWith(`${YEAR}-`) || b.url.includes(YEAR) ? 1 : 0;
      if (aYear !== bYear) return bYear - aYear;
      return (b.lastmod ?? "").localeCompare(a.lastmod ?? "") || b.url.localeCompare(a.url);
    })
    .slice(0, MAX_SITEMAPS);
}

function selfTest() {
  const sitemap = `<sitemapindex><sitemap><loc>https://note.com/sitemap/a.xml.gz</loc><lastmod>2026-08-18</lastmod></sitemap></sitemapindex>`;
  const compressed = gzipSync(Buffer.from(sitemap));
  const parsed = parseSitemap(decodeBody(compressed));
  if (parsed.sitemaps.length !== 1 || parsed.sitemaps[0].lastmod !== "2026-08-18") throw new Error("gzip sitemap self-test failed");
  const page = parseArticle(`<html><head><meta property="og:title" content="VRChat upload error"><meta property="article:published_time" content="2026-06-19T00:00:00+09:00"><link rel="canonical" href="https://note.com/example/n/nabc"></head><body>Unityでアップロードできない</body></html>`, "https://note.com/fallback/n/nx");
  if (page.published_at !== "2026-06-19") throw new Error(`article date self-test failed: ${page.published_at}`);
  if (!relevant.test(`${page.title} ${page.searchable_text}`) || !failure.test(`${page.title} ${page.searchable_text}`)) throw new Error("candidate keyword self-test failed");
}

selfTest();

if (!process.argv.includes("--live")) {
  console.log(JSON.stringify({ status: "offline", source: noteSource.id, max_sitemaps: MAX_SITEMAPS, max_unknown_articles: MAX_UNKNOWN_ARTICLES }, null, 2));
  process.exit(0);
}

const known = knownEvidenceUrls();
const discoveredAt = new Date().toISOString();
const report = {
  status: "success",
  source: noteSource.id,
  discovered_at: discoveredAt,
  known_evidence_urls: known.size,
  sitemap_documents_checked: 0,
  article_pages_checked: 0,
  page_errors: [],
  candidates: []
};

let rootSitemap;
try {
  rootSitemap = parseSitemap(await fetchText(noteSource.fetch_url));
  report.sitemap_documents_checked += 1;
} catch (error) {
  report.status = [401, 403, 429].includes(error.httpStatus) ? "blocked" : "failed";
  report.error = String(error.message ?? error);
  if (process.argv.includes("--write")) fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
  console.log(JSON.stringify(report, null, 2));
  process.exit(0);
}

const sitemapUrls = [...rootSitemap.urls];
for (const sitemap of prioritizeSitemaps(rootSitemap.sitemaps)) {
  try {
    const parsed = parseSitemap(await fetchText(sitemap.url));
    report.sitemap_documents_checked += 1;
    sitemapUrls.push(...parsed.urls);
  } catch (error) {
    report.page_errors.push({ url: sitemap.url, error: String(error.message ?? error) });
  }
}

const unknownArticles = [...new Map(sitemapUrls
  .filter((item) => articlePattern.test(item.url))
  .filter((item) => !known.has(normalizeUrl(item.url)))
  .sort((a, b) => (b.lastmod ?? "").localeCompare(a.lastmod ?? ""))
  .map((item) => [normalizeUrl(item.url), item])).values()]
  .slice(0, MAX_UNKNOWN_ARTICLES);

for (const item of unknownArticles) {
  try {
    const article = parseArticle(await fetchText(item.url), item.url);
    report.article_pages_checked += 1;
    if (!article.published_at?.startsWith(`${YEAR}-`)) continue;
    if (!articlePattern.test(article.url) || known.has(article.url)) continue;
    const haystack = `${article.title ?? ""} ${article.description ?? ""} ${article.searchable_text}`;
    if (!relevant.test(haystack) || !failure.test(haystack)) continue;
    report.candidates.push({
      url: article.url,
      title: article.title,
      description: article.description,
      published_at: article.published_at,
      sitemap_lastmod: item.lastmod ?? null,
      discovered_at: discoveredAt
    });
  } catch (error) {
    report.page_errors.push({ url: item.url, error: String(error.message ?? error) });
  }
}

report.candidates.sort((a, b) => (b.published_at ?? "").localeCompare(a.published_at ?? "") || a.url.localeCompare(b.url));
if (report.page_errors.length && report.article_pages_checked === 0 && unknownArticles.length) report.status = "blocked";
else if (report.page_errors.length) report.status = "partial";

if (process.argv.includes("--write")) fs.writeFileSync(outputPath, `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify(report, null, 2));
