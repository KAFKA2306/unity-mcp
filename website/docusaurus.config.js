// @ts-check
// Brand-neutral configuration: product name lives here so a future rename
// changes one file rather than every URL slug. Do NOT bake "mcp-for-unity"
// or "unity-mcp" into sidebar slugs, file paths, or docs URLs.

import { themes as prismThemes } from 'prism-react-renderer';
import { readdirSync, existsSync, readFileSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));

function countConfigurators() {
  const dir = resolve(__dirname, '..', 'MCPForUnity', 'Editor', 'Clients', 'Configurators');
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((f) => f.endsWith('Configurator.cs')).length;
}
const supportedClientCount = countConfigurators();

function listMarkdownFiles(dir) {
  if (!existsSync(dir)) return [];
  return readdirSync(dir).flatMap((entry) => {
    const path = resolve(dir, entry);
    if (statSync(path).isDirectory()) return listMarkdownFiles(path);
    return entry.endsWith('.md') ? [path] : [];
  });
}

function countReferenceTools() {
  const dir = resolve(__dirname, 'docs', 'reference', 'tools');
  return listMarkdownFiles(dir).filter((path) => !path.endsWith('/index.md')).length;
}

function countToolGroups() {
  const dir = resolve(__dirname, 'docs', 'reference', 'tools');
  if (!existsSync(dir)) return 0;
  return readdirSync(dir).filter((entry) => {
    const path = resolve(dir, entry);
    return statSync(path).isDirectory();
  }).length;
}

function countReferenceResources() {
  const path = resolve(__dirname, 'docs', 'reference', 'resources', 'index.md');
  if (!existsSync(path)) return 0;
  return (readFileSync(path, 'utf8').match(/\n## `/g) ?? []).length;
}

const latestVersion = 'v10.0.0';
const toolCount = countReferenceTools();
const toolGroupCount = countToolGroups();
const resourceCount = countReferenceResources();

const baseUrl = '/unity-mcp/';

/** @type {import('@docusaurus/types').Config} */
const config = {
  title: 'MCP for Unity',
  tagline: 'AIアシスタントからUnity Editorを操作するためのModel Context Protocol連携',
  favicon: 'img/favicon.png',

  url: 'https://kafka2306.github.io',
  baseUrl,

  organizationName: 'KAFKA2306',
  projectName: 'unity-mcp',
  deploymentBranch: 'gh-pages',
  trailingSlash: false,

  customFields: {
    latestVersion,
    toolCount,
    toolGroupCount,
    resourceCount,
    supportedClientCount,
  },

  onBrokenLinks: 'throw',

  headTags: [
    {
      tagName: 'link',
      attributes: { rel: 'preconnect', href: 'https://api.fontshare.com' },
    },
    {
      tagName: 'link',
      attributes: {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossorigin: 'anonymous',
      },
    },
    {
      tagName: 'link',
      attributes: { rel: 'icon', type: 'image/png', sizes: '32x32', href: `${baseUrl}img/favicon-32.png` },
    },
    {
      tagName: 'link',
      attributes: { rel: 'apple-touch-icon', sizes: '180x180', href: `${baseUrl}img/apple-touch-icon.png` },
    },
    {
      tagName: 'link',
      attributes: { rel: 'icon', type: 'image/png', sizes: '192x192', href: `${baseUrl}img/android-chrome-192.png` },
    },
    {
      tagName: 'link',
      attributes: { rel: 'icon', type: 'image/png', sizes: '512x512', href: `${baseUrl}img/android-chrome-512.png` },
    },
  ],
  stylesheets: [
    'https://api.fontshare.com/v2/css?f[]=satoshi@300,400,500,700,900&display=swap',
    'https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;500;700&display=swap',
  ],

  markdown: {
    format: 'detect',
    hooks: {
      onBrokenMarkdownLinks: 'warn',
    },
  },

  i18n: {
    defaultLocale: 'ja',
    locales: ['ja', 'en'],
    localeConfigs: {
      ja: {
        label: '日本語',
        htmlLang: 'ja-JP',
      },
      en: {
        label: 'English',
        htmlLang: 'en',
      },
    },
  },

  presets: [
    [
      'classic',
      /** @type {import('@docusaurus/preset-classic').Options} */
      ({
        docs: {
          routeBasePath: '/',
          sidebarPath: './sidebars.js',
          editUrl: 'https://github.com/KAFKA2306/unity-mcp/edit/beta/website/',
          showLastUpdateTime: true,
          showLastUpdateAuthor: true,
        },
        blog: false,
        theme: {
          customCss: './src/css/custom.css',
        },
      }),
    ],
  ],

  plugins: [
    [
      '@easyops-cn/docusaurus-search-local',
      {
        hashed: true,
        indexBlog: false,
        docsRouteBasePath: '/',
        highlightSearchTermsOnTargetPage: true,
      },
    ],
    [
      '@docusaurus/plugin-client-redirects',
      {
        redirects: [
          { from: '/ja/failures', to: '/failures' },
        ],
      },
    ],
    ...(process.env.GOATCOUNTER_CODE ? ['docusaurus-plugin-goatcounter'] : []),
  ],

  themeConfig:
    /** @type {import('@docusaurus/preset-classic').ThemeConfig} */
    ({
      image: 'img/social-card.png',
      metadata: [{ name: 'theme-color', content: '#4f46e5' }],
      navbar: {
        title: 'MCP for Unity',
        logo: {
          alt: 'MCP for Unity ロゴ',
          src: 'img/logo-mark.svg',
          srcDark: 'img/logo-mark.svg',
        },
        items: [
          {
            type: 'docSidebar',
            sidebarId: 'mainSidebar',
            position: 'left',
            label: 'ドキュメント',
          },
          {
            to: '/reference/tools',
            label: 'リファレンス',
            position: 'left',
          },
          {
            to: '/releases',
            label: 'リリース',
            position: 'left',
          },
          {
            type: 'localeDropdown',
            position: 'right',
          },
          {
            href: 'https://github.com/KAFKA2306/unity-mcp',
            position: 'right',
            className: 'header-icon-link header-github-link',
            'aria-label': 'GitHubリポジトリ',
          },
          {
            href: 'https://discord.gg/y4p8KfzrN4',
            position: 'right',
            className: 'header-icon-link header-discord-link',
            'aria-label': 'Discordコミュニティ',
          },
        ],
      },
      footer: {
        style: 'dark',
        links: [
          {
            title: 'ドキュメント',
            items: [
              { label: 'はじめに', to: '/getting-started' },
              { label: 'ガイド', to: '/guides/cli' },
              { label: 'リファレンス', to: '/reference/tools/' },
            ],
          },
          {
            title: 'コミュニティ',
            items: [
              { label: 'Discord', href: 'https://discord.gg/y4p8KfzrN4' },
              { label: 'GitHub Issues', href: 'https://github.com/KAFKA2306/unity-mcp/issues' },
            ],
          },
          {
            title: 'その他',
            items: [
              { label: 'GitHub', href: 'https://github.com/KAFKA2306/unity-mcp' },
              { label: 'PyPI', href: 'https://pypi.org/p/mcpforunityserver' },
            ],
          },
        ],
        copyright: `MITライセンス。上流プロジェクトは<a href="https://www.tryaura.dev/">Aura</a>の支援・保守によるものです。Unity Technologiesとは提携していません。`,
      },
      prism: {
        theme: prismThemes.github,
        darkTheme: prismThemes.dracula,
        additionalLanguages: ['csharp', 'bash', 'json', 'python'],
      },
      colorMode: {
        defaultMode: 'light',
        respectPrefersColorScheme: true,
      },
      ...(process.env.GOATCOUNTER_CODE ? { goatcounter: { code: process.env.GOATCOUNTER_CODE } } : {}),
    }),
};

export default config;
