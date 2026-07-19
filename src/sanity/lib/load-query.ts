import type { ClientPerspective, QueryParams } from '@sanity/client';
import { sanityClient } from 'sanity:client';

const token = import.meta.env.SANITY_API_READ_TOKEN;

interface LoadQueryOptions {
  query: string;
  params?: QueryParams;
  /** `getDraftModeProps(Astro.cookies)` の `perspectiveCookie` を渡す */
  perspectiveCookie?: string;
}

/**
 * GROQ クエリを実行する。
 * - 通常時: `published` パースペクティブ + CDN（本番配信向け）
 * - Draft mode 時: `drafts` パースペクティブ + stega エンコード + API トークン（Live Preview 向け）
 */
export async function loadQuery<QueryResponse>({
  query,
  params,
  perspectiveCookie,
}: LoadQueryOptions): Promise<QueryResponse> {
  const draftMode = Boolean(perspectiveCookie);

  if (draftMode && !token) {
    throw new Error(
      'Live Preview を利用するには環境変数 SANITY_API_READ_TOKEN の設定が必要です。',
    );
  }

  const perspective: ClientPerspective = draftMode
    ? ((perspectiveCookie as ClientPerspective) ?? 'drafts')
    : 'published';

  return sanityClient.fetch<QueryResponse>(query, params ?? {}, {
    perspective,
    stega: draftMode,
    useCdn: !draftMode,
    ...(draftMode ? { token } : {}),
  });
}
