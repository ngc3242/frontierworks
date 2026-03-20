import { defineConfig } from 'astro/config';
import vercel from '@astrojs/vercel';

export default defineConfig({
  site: 'https://frontierworks.kr',
  output: 'static',
  adapter: vercel(),
});
