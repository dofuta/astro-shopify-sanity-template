import { defineCliConfig } from 'sanity/cli';

export default defineCliConfig({
  api: {
    projectId: import.meta.env.SANITY_STUDIO_PROJECT_ID,
    dataset: import.meta.env.SANITY_STUDIO_DATASET || 'production',
  },
  // `npm run typegen` (= `sanity schema extract && sanity typegen generate`) が使う設定。
  // クエリは src/sanity/lib/queries.ts に集約しているため、スキャン範囲を絞っている。
  typegen: {
    path: './src/sanity/**/*.{ts,tsx}',
    schema: './schema.json',
    generates: './sanity.types.ts',
  },
});
