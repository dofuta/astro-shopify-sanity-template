import { defineConfig } from 'sanity';
import { structureTool } from 'sanity/structure';
import { presentationTool, defineLocations } from 'sanity/presentation';
import { schemaTypes } from './src/sanity/schemaTypes';

// このファイルは Sanity CLI（schema extract / typegen）と、Astro に埋め込まれた
// Studio のブラウザバンドルの両方から読み込まれる。どちらのコンテキストでも
// `import.meta.env` に値が渡ってくるのは `SANITY_STUDIO_` 接頭辞の変数だけ
// （Sanity 公式の規約。astro.config.mjs 側で vite.envPrefix にも追加している）。
const projectId = import.meta.env.SANITY_STUDIO_PROJECT_ID;
const dataset = import.meta.env.SANITY_STUDIO_DATASET || 'production';
const previewUrl = import.meta.env.SANITY_STUDIO_PREVIEW_URL || 'http://localhost:4321';

export default defineConfig({
  name: 'default',
  title: 'Content Studio',
  projectId,
  dataset,
  // Studio 埋め込みパスは astro.config.mjs の studioBasePath 側で決定される（basePath はここでは設定しない）
  plugins: [
    structureTool(),
    presentationTool({
      previewUrl: {
        initial: previewUrl,
        previewMode: {
          enable: '/api/draft-mode/enable',
        },
      },
      resolve: {
        locations: {
          news: defineLocations({
            select: { title: 'title', slug: 'slug.current' },
            resolve: (doc) => ({
              locations: [
                { title: doc?.title || '無題', href: `/news/${doc?.slug}` },
                { title: 'お知らせ一覧', href: '/news' },
              ],
            }),
          }),
          page: defineLocations({
            select: { title: 'title', slug: 'slug.current' },
            resolve: (doc) => ({
              locations: [{ title: doc?.title || '無題', href: `/${doc?.slug}` }],
            }),
          }),
        },
      },
    }),
  ],
  schema: {
    types: schemaTypes,
  },
});
