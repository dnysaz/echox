// @ts-check
import { defineConfig } from 'astro/config';

// https://astro.build/config
export default defineConfig({
  // Builds absolute canonical + Open Graph URLs for social previews.
  site: process.env.SITE_URL ?? 'https://echox.only4.fun',
});
