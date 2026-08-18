import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = path.join(root, "data", "failures");
const registry = JSON.parse(fs.readFileSync(path.join(data, "sources-web.json"), "utf8"));
const sources = registry.filter((source) => source.enabled);
const rawFiles = fs.readdirSync(data)
  .filter((name) => /^records-web(?:-[a-z0-9-]+)?-2026\.json$/.test(name))
  .sort();
const rawRecords = rawFiles.flatMap((name) => JSON.parse(fs.readFileSync(path.join(data, name), "utf8")));
const japaneseRawFile = "records-web-ja-2026.json";
const japaneseRaw = fs.existsSync(path.join(data, japaneseRawFile))
  ? JSON.parse(fs.readFileSync(path.join(data, japaneseRawFile), "utf8"))
  : [];
const japaneseSources = sources.filter((source) => (source.languages ?? []).includes("ja"));
const relevant = /vrchat|vrc|unity|avatar|world|sdk|vcc|modular avatar|udon|physbone|shader|liltoon|アバター|ワールド|ギミック|シェーダー|モジュラーアバター/i;
const failure = /error|fail|failed|failure|crash|broken|missing|cannot|can't|won't|validation|pink|fatal|warning|不具合|エラー|失敗|直し|解決|表示され|消え|起動しない|アップロードでき|認証|ライセンス|マゼンタ|警告|鳴らない|開けない|見つからない/i;

function decode(value = "") {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '\"').replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function first(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return decode(match[1]);
  }
  return null;
}

function parseRss(xml) {
  const blocks = [...xml.matchAll(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi)].map((match) => match[0]);
  return blocks.map((block) => {
    const title = first(block, [/<title[^>]*>([\s\S]*?)<\/title>/i]);
    const link = first(block, [/<link[^>]*href=["']([^"']+)["']/i, /<link[^>]*>([\s\S]*?)<\/link>/i]);
    const rawDate = first(block, [/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i, /<published[^>]*>([\s\S]*?)<\/published>/i, /<updated[^>]*>([\s\S]*?)<\/updated>/i]);
    const parsed = rawDate ? new Date(rawDate) : new Date(NaN);
    return { title, url: link, date: Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10) };
  }).filter((item) => item.date?.startsWith("2026-") && relevant.test(item.title ?? "") && failure.test(item.title ?? ""));
}

function parseSitemap(xml) {
  const nested = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>([\s\S]*?)<\/loc>[\s\S]*?<\/sitemap>/gi)].map((match) => decode(match[1]));
  const urls = [...xml.matchAll(/<url>[\s\S]*?<loc>([\s\S]*?)<\/loc>([\s\S]*?)<\/url>/gi)].map((match) => ({
    url: decode(match[1]),
    lastmod: first(match[2], [/<lastmod[^>]*>([\s\S]*?)<\/lastmod>/i])
  }));
  return { nested_sitemaps: nested, urls_2026: urls.filter((item) => item.lastmod?.startsWith("2026-")) };
}

function parseHtml(html, fallbackUrl) {
  const title = first(html, [/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i, /<title[^>]*>([\s\S]*?)<\/title>/i]);
  const rawDate = first(html, [/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i, /<time[^>]+datetime=["']([^"']+)["']/i, /(2026[-年\/]\d{1,2}[-月\/]\d{1,2})/]);
  const date = rawDate ? (() => {
    const normalized = rawDate.replace(/年|月/g, "-").replace(/日/g, "").replaceAll("/", "-").slice(0, 10);
    const parsed = new Date(`${normalized}T00:00:00Z`);
    return Number.isNaN(parsed.valueOf()) ? null : parsed.toISOString().slice(0, 10);
  })() : null;
  const canonicalUrl = first(html, [/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i]);
  return { title, url: canonicalUrl ?? fallbackUrl, date };
}

async function fetchText(source) {
  const response = await fetch(source.fetch_url, {
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
    headers: { "user-agent": "unity-mcp-failure-kb-web-raw-collector/1.0" }
  });
  if (!response.ok) {
    const error = new Error(`HTTP ${response.status}`);
    error.httpStatus = response.status;
    throw error;
  }
  return response.text();
}

function selfTest() {
  const rss = parseRss(`<rss><channel><item><title>VRChat Unity build error</title><link>https://example.com/a</link><pubDate>Fri, 19 Jun 2026 00:00:00 GMT</pubDate></item></channel></rss>`);
  if (rss.length !== 1 || rss[0].date !== "2026-06-19") throw new Error("RSS parser self-test failed");
  const map = parseSitemap(`<sitemapindex><sitemap><loc>https://example.com/sitemap-1.xml</loc></sitemap></sitemapindex>`);
  if (map.nested_sitemaps.length !== 1) throw new Error("sitemap parser self-test failed");
  const html = parseHtml(`<html><head><title>VRChat error</title><meta property="article:published_time" content="2026-07-23T00:00:00+09:00"><link rel="canonical" href="https://example.com/post"></head></html>`, "https://fallback.invalid");
  if (html.date !== "2026-07-23" || html.url !== "https://example.com/post") throw new Error("HTML parser self-test failed");
}

selfTest();
const modes = new Set(sources.map((source) => source.fetch_mode));
for (const required of ["rss", "sitemap", "manual_url"]) if (!modes.has(required)) throw new Error(`enabled web source registry missing ${required}`);
if (rawRecords.length < 20) throw new Error(`web raw corpus below 20: ${rawRecords.length}`);
if (japaneseRaw.length < 12) throw new Error(`Japanese web raw corpus below 12: ${japaneseRaw.length}`);
if (japaneseSources.length < 3) throw new Error(`enabled Japanese web sources below 3: ${japaneseSources.length}`);
const domains = new Set(rawRecords.flatMap((record) => record.source_urls).map((url) => new URL(url).hostname.toLowerCase()));

if (!process.argv.includes("--live")) {
  console.log(JSON.stringify({
    raw_records: rawRecords.length,
    japanese_raw_records: japaneseRaw.length,
    raw_domains: domains.size,
    registered_source_endpoints: registry.length,
    enabled_source_endpoints: sources.length,
    enabled_japanese_source_endpoints: japaneseSources.length,
    modes: [...modes]
  }, null, 2));
  process.exit(0);
}

const report = [];
for (const source of sources) {
  try {
    const body = await fetchText(source);
    const common = { source: source.id, languages: source.languages ?? [] };
    if (source.fetch_mode === "rss") {
      const items = parseRss(body);
      report.push({ ...common, status: "success", mode: "rss", candidates_2026: items.length, sample: items.slice(0, 5) });
    } else if (source.fetch_mode === "sitemap") {
      const map = parseSitemap(body);
      report.push({ ...common, status: "success", mode: "sitemap", nested_sitemaps: map.nested_sitemaps.length, urls_2026: map.urls_2026.length });
    } else {
      const page = parseHtml(body, source.canonical_url);
      report.push({ ...common, status: page.date?.startsWith("2026-") ? "success" : "parse_failed", mode: "manual_url", page });
    }
  } catch (error) {
    const blocked = [401, 403, 429].includes(error.httpStatus);
    report.push({ source: source.id, languages: source.languages ?? [], status: blocked ? "blocked" : "failed", mode: source.fetch_mode, error: String(error.message ?? error) });
  }
}

const japaneseReport = report.filter((item) => item.languages.includes("ja"));
console.log(JSON.stringify({
  raw_records: rawRecords.length,
  japanese_raw_records: japaneseRaw.length,
  raw_domains: domains.size,
  registered_source_endpoints: registry.length,
  enabled_source_endpoints: sources.length,
  enabled_japanese_source_endpoints: japaneseSources.length,
  japanese_source_checks: {
    checked: japaneseReport.length,
    success: japaneseReport.filter((item) => item.status === "success").length,
    blocked: japaneseReport.filter((item) => item.status === "blocked").length,
    failed: japaneseReport.filter((item) => item.status === "failed" || item.status === "parse_failed").length
  },
  report
}, null, 2));
if (report.some((item) => item.status === "failed" || item.status === "parse_failed")) process.exit(1);
