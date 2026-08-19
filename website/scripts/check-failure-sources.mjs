import { loadSources, sourceRegistryFiles } from "./failure-files.mjs";

const sourceFiles = sourceRegistryFiles();
const sources = loadSources(sourceFiles).filter((source) => source.enabled);

function requestHeaders(url) {
  const headers = { "user-agent": "unity-mcp-failure-kb-source-check/1.0" };
  if (url.startsWith("https://api.github.com/")) {
    headers.accept = "application/vnd.github+json";
    headers["x-github-api-version"] = "2022-11-28";
    if (process.env.GITHUB_TOKEN) headers.authorization = `Bearer ${process.env.GITHUB_TOKEN}`;
  }
  return headers;
}

async function check(source) {
  const started = Date.now();
  try {
    const response = await fetch(source.fetch_url, {
      method: "GET",
      redirect: "follow",
      signal: AbortSignal.timeout(20000),
      headers: requestHeaders(source.fetch_url),
    });
    await response.body?.cancel();
    const status = response.ok ? "success" : [401, 403, 429].includes(response.status) ? "blocked" : "failed";
    return {
      id: source.id,
      source_family: source.source_family,
      status,
      http_status: response.status,
      elapsed_ms: Date.now() - started,
      url: source.canonical_url,
    };
  } catch (error) {
    return {
      id: source.id,
      source_family: source.source_family,
      status: "failed",
      http_status: null,
      elapsed_ms: Date.now() - started,
      url: source.canonical_url,
      error: String(error.message ?? error),
    };
  }
}

const report = [];
const concurrency = 5;
for (let i = 0; i < sources.length; i += concurrency) {
  report.push(...await Promise.all(sources.slice(i, i + concurrency).map(check)));
}

const summary = {
  generated_at: new Date().toISOString(),
  registered_files: sourceFiles.length,
  enabled_sources: sources.length,
  success: report.filter((item) => item.status === "success").length,
  blocked: report.filter((item) => item.status === "blocked").length,
  failed: report.filter((item) => item.status === "failed").length,
  report,
};

process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (summary.failed > 0) process.exitCode = 1;
