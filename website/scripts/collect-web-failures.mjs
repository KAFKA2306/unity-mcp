import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const data = path.join(root, "data", "failures");
const registry = JSON.parse(fs.readFileSync(path.join(data, "sources-web.json"), "utf8"));
const sources = registry.filter((source) => source.enabled);
const canonical = JSON.parse(fs.readFileSync(path.join(data, "records-web-2026.json"), "utf8"));
const relevant = /vrchat|vrc|unity|avatar|world|sdk|vcc|modular avatar|udon|physbone|shader/i;
const failure = /error|fail|failed|failure|crash|broken|missing|cannot|can't|won't|validation|pink|fatal|warning|不具合|エラー|失敗|直し|解決|表示され|消え|起動しない|アップロードでき/i;

function decode(value = "") {
  return value.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&amp;/g, "&").replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'")
    .replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
}

function first(text, patterns) {
  for (const pattern of patterns) {
    const match = text.match(pattern);
    if (match) return decode(match[1]);
  }
  return "unknown";
}

function parseRss(xml) {
  const blocks = [...xml.matchAll(/<(?:item|entry)\b[\s\S]*?<\/(?:item|entry)>/gi)].map((match) => match[0]);
  return blocks.map((block) => {
    const title = first(block, [/<title[^>]*>([\s\S]*?)<\/title>/i]);
    const link = first(block, [/<link[^>]*href=["']([^"']+)["']/i, /<link[^>]*>([\s\S]*?)<\/link>/i]);
    const rawDate = first(block, [/<pubDate[^>]*>([\s\S]*?)<\/pubDate>/i, /<published[^>]*>([\s\S]*?)<\/published>/i, /<updated[^>]*>([\s\S]*?)<\/updated>/i]);
    const parsed = new Date(rawDate);
    return { title, url: link, date: Number.isNaN(parsed.valueOf()) ? "unknown" : parsed.toISOString().slice(0, 10) };
  }).filter((item) => item.date.startsWith("2026-") && relevant.test(item.title) && failure.test(item.title));
}

function parseSitemap(xml) {
  const sitemapLocs = [...xml.matchAll(/<sitemap>[\s\S]*?<loc>([\s\S]*?)<\/loc>[\s\S]*?<\/sitemap>/gi)].map((match) => decode(match[1]));
  const urls = [...xml.matchAll(/<url>[\s\S]*?<loc>([\s\S]*?)<\/loc>([\s\S]*?)<\/url>/gi)].map((match) => {
    const url = decode(match[1]);
    const lastmod = first(match[2], [/<lastmod[^>]*>([\s\S]*?)<\/lastmod>/i]);
    return { url, lastmod };
  });
  return { nested_sitemaps: sitemapLocs, urls_2026: urls.filter((item) => item.lastmod.startsWith("2026-")) };
}

function parseHtml(html, fallbackUrl) {
  const title = first(html, [/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i, /<title[^>]*>([\s\S]*?)<\/title>/i]);
  const date = first(html, [/<meta[^>]+property=["']article:published_time["'][^>]+content=["']([^"']+)["']/i, /<time[^>]+datetime=["']([^"']+)["']/i, /(2026[-年\/]\d{1,2}[-月\/]\d{1,2})/]);
  const iso = date === "unknown" ? "unknown" : (() => {
    const normalized = date.replace(/年|月/g, "-").replace(/日/g, "").replaceAll("/", "-").slice(0, 10);
    const parsed = new Date(`${normalized}T00:00:00Z`);
    return Number.isNaN(parsed.valueOf()) ? "unknown" : parsed.toISOString().slice(0, 10);
  })();
  const canonicalUrl = first(html, [/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i]);
  return { title, url: canonicalUrl === "unknown" ? fallbackUrl : canonicalUrl, date: iso };
}

async function fetchText(source) {
  const response = await fetch(source.fetch_url, {
    redirect: "follow",
    signal: AbortSignal.timeout(20000),
    headers: { "user-agent": "unity-mcp-failure-kb-web-collector/1.0" }
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
for (const required of ["rss", "sitemap", "manual_url"]) {
  if (!modes.has(required)) throw new Error(`enabled web source registry missing ${required}`);
}
if (canonical.length < 20) throw new Error(`web canonical corpus below 20: ${canonical.length}`);
const domains = new Set(canonical.flatMap((record) => record.source_urls).map((url) => new URL(url).hostname));
if (domains.size < 5) throw new Error(`web canonical corpus requires >=5 domains; got ${domains.size}`);

if (!process.argv.includes("--live")) {
  console.log(JSON.stringify({ canonical: canonical.length, domains: domains.size, registered_source_endpoints: registry.length, enabled_source_endpoints: sources.length, modes: [...modes] }, null, 2));
  process.exit(0);
}

const report = [];
for (const source of sources) {
  try {
    const body = await fetchText(source);
    if (source.fetch_mode === "rss") {
      const items = parseRss(body);
      report.push({ source: source.id, status: "success", mode: "rss", candidates_2026: items.length, sample: items.slice(0, 5) });
    } else if (source.fetch_mode === "sitemap") {
      const map = parseSitemap(body);
      report.push({ source: source.id, status: "success", mode: "sitemap", nested_sitemaps: map.nested_sitemaps.length, urls_2026: map.urls_2026.length });
    } else {
      const page = parseHtml(body, source.canonical_url);
      report.push({ source: source.id, status: page.date.startsWith("2026-") ? "success" : "parse_failed", mode: "manual_url", page });
    }
  } catch (error) {
    const blocked = [401, 403, 429].includes(error.httpStatus);
    report.push({ source: source.id, status: blocked ? "blocked" : "failed", mode: source.fetch_mode, error: String(error.message ?? error) });
  }
}

console.log(JSON.stringify({ canonical: canonical.length, domains: domains.size, registered_source_endpoints: registry.length, enabled_source_endpoints: sources.length, report }, null, 2));
if (report.some((item) => item.status === "failed" || item.status === "parse_failed")) process.exit(1);
