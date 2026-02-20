import { defineConfig } from 'astro/config';

const rawSite = process.env.SITE_URL ?? process.env.DOMAIN;
const site = rawSite
  ? rawSite.startsWith('http://') || rawSite.startsWith('https://')
    ? rawSite
    : `https://${rawSite}`
  : undefined;

export default defineConfig({
  output: 'static',
  site
});
