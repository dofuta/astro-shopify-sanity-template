import { createClient } from 'microcms-js-sdk';
import type {
  MicroCMSQueries,
  MicroCMSListResponse,
  MicroCMSListContent,
  MicroCMSObjectContent,
} from 'microcms-js-sdk';

// ─── SDK の型を re-export（呼び出し側で import できるように） ─────────────────

export type { MicroCMSQueries, MicroCMSListResponse, MicroCMSListContent, MicroCMSObjectContent };

// ─── クライアント（シングルトン） ─────────────────────────────────────────────

function createMicrocmsClient() {
  const serviceDomain = process.env.MICROCMS_SERVICE_DOMAIN;
  const apiKey = process.env.MICROCMS_API_KEY;
  if (!serviceDomain) throw new Error('MICROCMS_SERVICE_DOMAIN is not set');
  if (!apiKey) throw new Error('MICROCMS_API_KEY is not set');
  return createClient({ serviceDomain, apiKey });
}

// ビルド時（Node.js）および Netlify Functions から呼ばれるため、
// モジュール評価時に環境変数が未設定でもエラーにならないよう遅延初期化する
let _client: ReturnType<typeof createClient> | null = null;

function getClient(): ReturnType<typeof createClient> {
  if (!_client) _client = createMicrocmsClient();
  return _client;
}

// ─── リスト取得 ───────────────────────────────────────────────────────────────

/**
 * コンテンツのリストを取得する。
 * 型引数にはコンテンツ固有のフィールドだけを渡す（SDK が MicroCMSListContent を自動付与）。
 */
export function getMicrocmsList<T extends Record<string, unknown>>(
  endpoint: string,
  queries?: MicroCMSQueries,
) {
  return getClient().getList<T>({ endpoint, queries });
}

/**
 * コンテンツの全件を取得する（SDK の getAllContents がページネーションを自動処理）。
 */
export function getAllMicrocmsContents<T extends Record<string, unknown>>(
  endpoint: string,
  queries?: Omit<MicroCMSQueries, 'limit' | 'offset'>,
) {
  return getClient().getAllContents<T>({ endpoint, queries });
}

// ─── 単一取得（リスト形式） ───────────────────────────────────────────────────

/**
 * コンテンツ ID から単一コンテンツを取得する。
 */
export function getMicrocmsDetail<T extends Record<string, unknown>>(
  endpoint: string,
  contentId: string,
  queries?: Pick<MicroCMSQueries, 'fields' | 'draftKey' | 'depth'>,
) {
  return getClient().getListDetail<T>({ endpoint, contentId, queries });
}

// ─── オブジェクト形式取得 ─────────────────────────────────────────────────────

/**
 * オブジェクト形式のコンテンツを取得する。
 */
export function getMicrocmsObject<T extends Record<string, unknown>>(
  endpoint: string,
  queries?: Pick<MicroCMSQueries, 'fields' | 'draftKey' | 'depth'>,
) {
  return getClient().getObject<T>({ endpoint, queries });
}
