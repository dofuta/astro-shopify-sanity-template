// メタフィールドの取得・整形ロジック（単一の真実の源は metafields.generated.ts）
//
// Shopify Storefront API はメタフィールドを一括取得できず、namespace + key を
// 明示する必要がある。ここでは生成済みの定義（MetafieldDef[]）から
//   1. Storefront クエリ片（metafields(identifiers: [...])）を組み立て
//   2. 配列レスポンスを表示用に整形（normalizeMetafields）
// する。

/** メタフィールド定義（metafields.generated.ts が持つ形） */
export interface MetafieldDef {
  namespace: string;
  key: string;
  /** 詳細ページでの表示ラベル（Shopify 定義の name を流用） */
  label: string;
  /** Shopify のメタフィールド型（例: single_line_text_field） */
  type: string;
}

/** Storefront から返る生のメタフィールド要素 */
export interface RawMetafield {
  namespace: string;
  key: string;
  value: string;
  type: string;
}

/** 表示用に整形したメタフィールド */
export interface MetafieldEntry {
  namespace: string;
  key: string;
  label: string;
  type: string;
  value: string;
}

function escapeGraphQLString(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/"/g, '\\"');
}

/**
 * 定義配列から Storefront 用の metafields クエリ片を生成する。
 * 定義が空のときは空文字を返す（クエリに何も注入しない）。
 */
export function buildMetafieldsFragment(defs: readonly MetafieldDef[]): string {
  if (defs.length === 0) return '';

  const identifiers = defs
    .map((def) => `{ namespace: "${escapeGraphQLString(def.namespace)}", key: "${escapeGraphQLString(def.key)}" }`)
    .join(', ');

  return `metafields(identifiers: [${identifiers}]) {
    namespace
    key
    value
    type
  }`;
}

/**
 * Storefront の配列レスポンス（順序は identifiers と一致・存在しないものは null）を
 * 表示用 MetafieldEntry[] に整形する。値が無いものは除外する。
 */
export function normalizeMetafields(
  raw: (RawMetafield | null)[] | null | undefined,
  defs: readonly MetafieldDef[],
): MetafieldEntry[] {
  if (!raw) return [];

  const labelByIdentifier = new Map(defs.map((def) => [`${def.namespace}.${def.key}`, def.label]));

  return raw
    .filter((mf): mf is RawMetafield => mf != null && mf.value != null && mf.value !== '')
    .map((mf) => ({
      namespace: mf.namespace,
      key: mf.key,
      label: labelByIdentifier.get(`${mf.namespace}.${mf.key}`) ?? mf.key,
      type: mf.type,
      value: mf.value,
    }));
}
