// @ts-check
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';

// https://astro.build/config
export default defineConfig({
  // デプロイ時: SSGページはビルド時生成、API ルートはNetlify Functionsに変換
  // ローカル開発 (astro dev): API ルートはAstroのサーバーで直接処理
  output: 'static',
  adapter: netlify(),
  site: process.env.BASE_DOMAIN,
  integrations: [sitemap(), react()],
  vite: {
    css: {
      preprocessorOptions: {
        scss: {
          additionalData: `@use "src/styles/_variables.scss" as *;`,
        },
      },
    },
    resolve: {
      alias: {
        '~': '/src',
      },
    },
  },
});
