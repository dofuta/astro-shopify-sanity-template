// SANITY_VISUAL_EDITING_ENABLED=true のときだけ、Sanity 連携ページを SSR（prerender: false）に切り替える。
// - 本番（未設定 / false）: 全ページ SSG のまま（既存の配信特性を維持）
// - ローカル開発 / プレビュー用デプロイ（true）: 該当ページが SSR になり、
//   Sanity の Presentation Tool から Live Preview（draft content・Visual Editing）を利用できる
//
// 対象は Sanity のコンテンツを描画するページのみ（`src/pages/news/` 以下）。
// Shopify 側のページ（商品・カート等）は影響を受けない。
const CONTENT_PATH_MATCH = '/pages/news/';

export default function sanityPreviewMode({ enabled = false } = {}) {
  return {
    name: 'sanity-preview-mode',
    hooks: {
      'astro:route:setup': ({ route }) => {
        if (enabled && route.component.includes(CONTENT_PATH_MATCH)) {
          route.prerender = false;
        }
      },
    },
  };
}
