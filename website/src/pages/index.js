import React from 'react';
import Layout from '@theme/Layout';
import useDocusaurusContext from '@docusaurus/useDocusaurusContext';
import HomeHero from '@site/src/components/HomeHero';
import HomeStats from '@site/src/components/HomeStats';
import HomeArchitecture from '@site/src/components/HomeArchitecture';
import HomeFeatures from '@site/src/components/HomeFeatures';
import HomeCloser from '@site/src/components/HomeCloser';

export default function Home() {
  const { siteConfig, i18n } = useDocusaurusContext();
  const ja = i18n.currentLocale !== 'en';
  return (
    <Layout
      title="MCP for Unity"
      description={ja
        ? siteConfig.tagline
        : 'AI-driven game development for the Unity Editor via the Model Context Protocol.'}
    >
      <main>
        <HomeHero />
        <HomeFeatures />
        <HomeStats />
        <HomeArchitecture />
        <HomeCloser />
      </main>
    </Layout>
  );
}
