import type { APIRoute } from 'astro';

const getRobotsTxt = (sitemapURL: URL) => `\
User-agent: *
Allow: /

Sitemap: ${sitemapURL.href}
`;

export const GET: APIRoute = ({ site }) => {
  const siteUrl = site ?? new URL('http://localhost:4321');
  const sitemapUrl = new URL('/sitemap-index.xml', siteUrl);

  return new Response(getRobotsTxt(sitemapUrl));
};
