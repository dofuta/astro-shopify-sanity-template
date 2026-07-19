// @ts-check
import { loadEnv } from 'vite';
import { defineConfig } from 'astro/config';
import sitemap from '@astrojs/sitemap';
import netlify from '@astrojs/netlify';
import react from '@astrojs/react';
import sanity from '@sanity/astro';
import sanityPreviewMode from './src/integrations/sanity-preview-mode.mjs';

// astro.config.mjs は Astro の env 読み込みより前に評価されるため process.env では
// .env ファイルの値を読めない（Astro自体の既知の制約）。Viteの loadEnv で明示的に読み込む。
// 実際の環境変数（Netlifyの Environment variables 等）が設定されていればそちらが優先される。
const env = loadEnv(process.env.NODE_ENV ?? 'production', process.cwd(), '');

// https://astro.build/config
export default defineConfig({
  // デプロイ時: SSGページはビルド時生成、API ルートはNetlify Functionsに変換
  // ローカル開発 (astro dev): API ルートはAstroのサーバーで直接処理
  output: 'static',
  adapter: netlify(),
  site: env.BASE_DOMAIN,
  integrations: [
    sitemap(),
    react(),
    sanity({
      projectId: env.SANITY_STUDIO_PROJECT_ID,
      dataset: env.SANITY_STUDIO_DATASET || 'production',
      apiVersion: '2026-01-01',
      useCdn: true,
      // Studio を /studio に埋め込む（Netlify アダプタ経由でこのルートのみ SSR される）
      studioBasePath: '/studio',
      // stega: Live Preview 時に文字列へ埋め込む Studio の参照先
      stega: {
        studioUrl: '/studio',
      },
    }),
    // SANITY_VISUAL_EDITING_ENABLED=true のときだけ Sanity 連携ページを SSR に切り替える
    sanityPreviewMode({ enabled: env.SANITY_VISUAL_EDITING_ENABLED === 'true' }),
  ],
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
    // 埋め込み Studio（sanity.config.ts）のブラウザ用バンドルにも SANITY_STUDIO_* を公開する
    envPrefix: ['PUBLIC_', 'SANITY_STUDIO_'],
  },
});
