import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';

const rawSite = process.env.SITE_URL ?? process.env.DOMAIN;
const site = rawSite
  ? rawSite.startsWith('http://') || rawSite.startsWith('https://')
    ? rawSite
    : `https://${rawSite}`
  : 'http://localhost:4321';

export default defineConfig({
  output: 'static',
  site,
  integrations: [sitemap()]
});
