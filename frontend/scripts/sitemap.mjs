// Build-time sitemap generator. Run automatically after `vite build`.
import { writeFileSync } from "node:fs";
import { resolve, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const SITE = process.env.VITE_SITE_URL || "https://blazing8s.com";

const routes = [
  { loc: "/", priority: 1.0, changefreq: "weekly" },
  { loc: "/auth", priority: 0.6, changefreq: "monthly" },
  { loc: "/how-to-play", priority: 0.8, changefreq: "monthly" },
];

const today = new Date().toISOString().slice(0, 10);
const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${routes
  .map(
    (r) => `  <url>
    <loc>${SITE}${r.loc}</loc>
    <lastmod>${today}</lastmod>
    <changefreq>${r.changefreq}</changefreq>
    <priority>${r.priority}</priority>
  </url>`,
  )
  .join("\n")}
</urlset>
`;

writeFileSync(resolve(__dirname, "../dist/sitemap.xml"), xml);
console.log("✓ sitemap.xml generated for", SITE);
