import type {
  Cart,
  CartUserError,
  InventoryResult,
  Product,
  ProductListItem,
  ProductVariant,
  ShopPolicies,
  ShopPolicy,
} from './types';
import { buildMetafieldsFragment, normalizeMetafields, type RawMetafield } from './metafields';
import { PRODUCT_METAFIELDS, VARIANT_METAFIELDS } from './metafields.generated';
import { DEFAULT_LOCALE, LOCALES, type Locale } from './i18n';

// ─── fetch ラッパー ────────────────────────────────────────────────────────────

function getShopifyUrl(apiVersion?: string): string {
  const domain = import.meta.env.SHOPIFY_STORE_DOMAIN ?? process.env.SHOPIFY_STORE_DOMAIN;
  const version =
    apiVersion ?? import.meta.env.SHOPIFY_API_VERSION ?? process.env.SHOPIFY_API_VERSION ?? '2026-01';
  if (!domain) throw new Error('SHOPIFY_STORE_DOMAIN is not set');
  return `https://${domain}/api/${version}/graphql.json`;
}

interface ShopifyFetchOptions {
  query: string;
  variables?: Record<string, unknown>;
  /** API バージョンを一時的に上書きする（例: 安定版に未追加のフィールドを unstable で取得） */
  apiVersion?: string;
  buyerHeaders?: HeadersInit;
  onResponseHeaders?: (headers: Headers) => void;
}

interface ShopifyResponse<T> {
  data: T;
  errors?: { message: string; locations?: unknown[]; path?: unknown[] }[];
}

export interface ShopifyRequestContext {
  buyerHeaders?: HeadersInit;
  onResponseHeaders?: (headers: Headers) => void;
}

const BUYER_HEADER_NAMES = [
  'accept-language',
  'cookie',
  'referer',
  'user-agent',
  'x-shopify-uniquetoken',
  'x-shopify-visittoken',
] as const;

export function getShopifyBuyerHeaders(request: Request): Headers {
  const headers = new Headers();

  for (const name of BUYER_HEADER_NAMES) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  return headers;
}

function appendSetCookieHeaders(target: Headers, source: Headers): void {
  const getSetCookie = (source as Headers & { getSetCookie?: () => string[] }).getSetCookie;
  const setCookies = getSetCookie?.call(source) ?? [];

  if (setCookies.length > 0) {
    for (const cookie of setCookies) {
      target.append('Set-Cookie', cookie);
    }
    return;
  }

  const setCookie = source.get('set-cookie');
  if (setCookie) target.append('Set-Cookie', setCookie);
}

export function appendShopifyTrackingHeaders(target: Headers, source?: Headers): void {
  if (!source) return;

  const serverTiming = source.get('server-timing');
  if (serverTiming) target.append('Server-Timing', serverTiming);
  appendSetCookieHeaders(target, source);
}

export function shopifyJsonResponse(body: unknown, init: ResponseInit = {}, shopifyHeaders?: Headers): Response {
  const headers = new Headers(init.headers);
  headers.set('Content-Type', 'application/json');
  appendShopifyTrackingHeaders(headers, shopifyHeaders);

  return new Response(JSON.stringify(body), {
    ...init,
    headers,
  });
}

export async function shopifyFetch<T>(options: ShopifyFetchOptions): Promise<ShopifyResponse<T>> {
  const token = import.meta.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN ?? process.env.SHOPIFY_STOREFRONT_ACCESS_TOKEN;
  if (!token) throw new Error('SHOPIFY_STOREFRONT_ACCESS_TOKEN is not set');

  const headers = new Headers(options.buyerHeaders);
  headers.set('Content-Type', 'application/json');
  // Headless チャネルの「非公開アクセストークン」はこのヘッダーで送る
  // （公開トークンの X-Shopify-Storefront-Access-Token とは別物）
  headers.set('Shopify-Storefront-Private-Token', token);

  const res = await fetch(getShopifyUrl(options.apiVersion), {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: options.query, variables: options.variables }),
  });

  options.onResponseHeaders?.(res.headers);

  if (!res.ok) {
    throw new Error(`Shopify API HTTP error: ${res.status} ${res.statusText}`);
  }

  const json: ShopifyResponse<T> = await res.json();

  if (json.errors?.length) {
    throw new Error(`Shopify GraphQL error: ${JSON.stringify(json.errors)}`);
  }

  return json;
}

// ─── 型付きレスポンス検証ヘルパー ─────────────────────────────────────────────

export function assertNoUserErrors(errors: CartUserError[] | undefined, context: string): void {
  if (errors && errors.length > 0) {
    throw new Error(`${context} userErrors: ${JSON.stringify(errors)}`);
  }
}

// ─── GraphQL クエリ・ミューテーション ─────────────────────────────────────────

// 商品一覧（SSG・getStaticPaths 共通で使用）
export const GET_PRODUCTS_QUERY = /* GraphQL */ `
  query GetProducts($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo {
        hasNextPage
        endCursor
      }
      edges {
        node {
          id
          handle
          title
          featuredImage {
            url
            altText
          }
          priceRange {
            minVariantPrice {
              amount
              currencyCode
            }
          }
          variants(first: 1) {
            edges {
              node {
                id
                availableForSale
              }
            }
          }
        }
      }
    }
  }
`;

// 商品詳細（SSG）
export const GET_PRODUCT_BY_HANDLE_QUERY = /* GraphQL */ `
  query GetProductByHandle($handle: String!) {
    product(handle: $handle) {
      id
      handle
      title
      descriptionHtml
      featuredImage {
        url
        altText
      }
      options {
        id
        name
        values
      }
      variants(first: 100) {
        edges {
          node {
            id
            title
            availableForSale
            selectedOptions {
              name
              value
            }
            price {
              amount
              currencyCode
            }
            image {
              url
              altText
            }
            ${buildMetafieldsFragment(VARIANT_METAFIELDS)}
          }
        }
      }
      priceRange {
        minVariantPrice {
          amount
          currencyCode
        }
      }
      ${buildMetafieldsFragment(PRODUCT_METAFIELDS)}
    }
  }
`;

// variant単位の在庫取得（動的）
export const GET_INVENTORY_QUERY = /* GraphQL */ `
  query GetInventory($variantId: ID!) {
    node(id: $variantId) {
      ... on ProductVariant {
        id
        availableForSale
        quantityAvailable
      }
    }
  }
`;

export const GET_SHOP_ANALYTICS_INFO_QUERY = /* GraphQL */ `
  query GetShopAnalyticsInfo {
    shop {
      id
      name
      primaryDomain {
        host
        url
      }
    }
    localization {
      country {
        currency {
          isoCode
        }
      }
      language {
        isoCode
      }
    }
  }
`;

// ストアポリシー取得（多言語対応・@inContext で翻訳版を取得）
//
// privacyPolicy は安定版に存在するが、legalNotice（特定商取引法に基づく表記）は
// 2026-06 時点では Storefront の unstable バージョンにしか存在しない。
// そのため安定版にフィールドが無い場合のみ unstable へ自動フォールバックする
// （将来 legalNotice が安定版へ昇格すれば、設定中のバージョンがそのまま使われる）。
type ShopPolicyField = 'privacyPolicy' | 'legalNotice';

const SHOP_POLICY_FIELDS = /* GraphQL */ `
  id
  title
  handle
  body
  url
`;

function buildShopPolicyQuery(field: ShopPolicyField): string {
  return /* GraphQL */ `
    query GetShopPolicy($language: LanguageCode!) @inContext(language: $language) {
      shop {
        ${field} {
          ${SHOP_POLICY_FIELDS}
        }
      }
    }
  `;
}

// カート作成
export const CART_CREATE_MUTATION = /* GraphQL */ `
  mutation CartCreate($input: CartInput!) {
    cartCreate(input: $input) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          subtotalAmount {
            amount
            currencyCode
          }
          totalAmount {
            amount
            currencyCode
          }
          totalTaxAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    id
                    handle
                    title
                    featuredImage {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// カートに商品追加
export const CART_ADD_LINES_MUTATION = /* GraphQL */ `
  mutation CartLinesAdd($cartId: ID!, $lines: [CartLineInput!]!) {
    cartLinesAdd(cartId: $cartId, lines: $lines) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          subtotalAmount {
            amount
            currencyCode
          }
          totalAmount {
            amount
            currencyCode
          }
          totalTaxAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    id
                    handle
                    title
                    featuredImage {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// カートから商品削除
export const CART_REMOVE_LINES_MUTATION = /* GraphQL */ `
  mutation CartLinesRemove($cartId: ID!, $lineIds: [ID!]!) {
    cartLinesRemove(cartId: $cartId, lineIds: $lineIds) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          subtotalAmount {
            amount
            currencyCode
          }
          totalAmount {
            amount
            currencyCode
          }
          totalTaxAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    id
                    handle
                    title
                    featuredImage {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// カート数量更新
export const CART_UPDATE_LINES_MUTATION = /* GraphQL */ `
  mutation CartLinesUpdate($cartId: ID!, $lines: [CartLineUpdateInput!]!) {
    cartLinesUpdate(cartId: $cartId, lines: $lines) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          subtotalAmount {
            amount
            currencyCode
          }
          totalAmount {
            amount
            currencyCode
          }
          totalTaxAmount {
            amount
            currencyCode
          }
        }
        lines(first: 100) {
          edges {
            node {
              id
              quantity
              merchandise {
                ... on ProductVariant {
                  id
                  title
                  price {
                    amount
                    currencyCode
                  }
                  product {
                    id
                    handle
                    title
                    featuredImage {
                      url
                      altText
                    }
                  }
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// カート取得
export const GET_CART_QUERY = /* GraphQL */ `
  query GetCart($cartId: ID!) {
    cart(id: $cartId) {
      id
      checkoutUrl
      totalQuantity
      cost {
        subtotalAmount {
          amount
          currencyCode
        }
        totalAmount {
          amount
          currencyCode
        }
        totalTaxAmount {
          amount
          currencyCode
        }
      }
      lines(first: 100) {
        edges {
          node {
            id
            quantity
            merchandise {
              ... on ProductVariant {
                id
                title
                price {
                  amount
                  currencyCode
                }
                product {
                  id
                  handle
                  title
                  featuredImage {
                    url
                    altText
                  }
                }
              }
            }
          }
        }
      }
    }
  }
`;

// 送付先更新（buyer identity）→ 送料計算に使用
export const CART_BUYER_IDENTITY_MUTATION = /* GraphQL */ `
  mutation CartBuyerIdentityUpdate($cartId: ID!, $buyerIdentity: CartBuyerIdentityInput!) {
    cartBuyerIdentityUpdate(cartId: $cartId, buyerIdentity: $buyerIdentity) {
      cart {
        id
        checkoutUrl
        totalQuantity
        cost {
          subtotalAmount {
            amount
            currencyCode
          }
          totalAmount {
            amount
            currencyCode
          }
          totalTaxAmount {
            amount
            currencyCode
          }
        }
        deliveryGroups(first: 10) {
          edges {
            node {
              deliveryOptions {
                handle
                title
                estimatedCost {
                  amount
                  currencyCode
                }
              }
            }
          }
        }
      }
      userErrors {
        field
        message
      }
    }
  }
`;

// ─── 型付き取得関数（SSG 用の便利ラッパー） ───────────────────────────────────

interface GetProductsData {
  products: {
    pageInfo: { hasNextPage: boolean; endCursor: string | null };
    edges: { node: ProductListItem }[];
  };
}

/** SSGビルド時に全商品を取得する（ページネーション対応） */
export async function getAllProducts(): Promise<ProductListItem[]> {
  const products: ProductListItem[] = [];
  let hasNextPage = true;
  let after: string | null = null;

  while (hasNextPage) {
    const { data }: ShopifyResponse<GetProductsData> = await shopifyFetch<GetProductsData>({
      query: GET_PRODUCTS_QUERY,
      variables: { first: 250, after },
    });
    products.push(...data.products.edges.map((e) => e.node));
    hasNextPage = data.products.pageInfo.hasNextPage;
    after = data.products.pageInfo.endCursor;
  }

  return products;
}

// Storefront から返る生の形（metafields は配列・null 含む。正規化前）
type RawVariant = Omit<ProductVariant, 'metafields'> & {
  metafields?: (RawMetafield | null)[] | null;
};

type RawProduct = Omit<Product, 'metafields' | 'variants'> & {
  metafields?: (RawMetafield | null)[] | null;
  variants: { edges: { node: RawVariant }[] };
};

interface GetProductByHandleData {
  product: RawProduct | null;
}

/** SSGビルド時に handle から商品詳細を取得する */
export async function getProductByHandle(handle: string): Promise<Product | null> {
  const { data } = await shopifyFetch<GetProductByHandleData>({
    query: GET_PRODUCT_BY_HANDLE_QUERY,
    variables: { handle },
  });

  const raw = data.product;
  if (!raw) return null;

  return {
    ...raw,
    metafields: normalizeMetafields(raw.metafields, PRODUCT_METAFIELDS),
    variants: {
      edges: raw.variants.edges.map(({ node }) => ({
        node: {
          ...node,
          metafields: normalizeMetafields(node.metafields, VARIANT_METAFIELDS),
        },
      })),
    },
  };
}

interface GetInventoryData {
  node: InventoryResult | null;
}

/** variant ID から在庫を取得する（Netlify Functions 経由で使用） */
export async function getInventory(variantId: string): Promise<InventoryResult | null> {
  const { data } = await shopifyFetch<GetInventoryData>({
    query: GET_INVENTORY_QUERY,
    variables: { variantId },
  });
  return data.node;
}

export interface ShopifyAnalyticsInfo {
  shopId: string;
  shopName: string;
  shopDomain: string;
  currency: string;
  acceptedLanguage: string;
}

interface GetShopAnalyticsInfoData {
  shop: {
    id: string;
    name: string;
    primaryDomain?: {
      host: string;
      url: string;
    } | null;
  };
  localization?: {
    country?: {
      currency?: {
        isoCode: string;
      } | null;
    } | null;
    language?: {
      isoCode: string;
    } | null;
  } | null;
}

/** Shopify Analytics のイベント送信に必要なストア基本情報を取得する。 */
export async function getShopAnalyticsInfo(): Promise<ShopifyAnalyticsInfo> {
  const { data } = await shopifyFetch<GetShopAnalyticsInfoData>({
    query: GET_SHOP_ANALYTICS_INFO_QUERY,
  });

  return {
    shopId: data.shop.id,
    shopName: data.shop.name,
    shopDomain: data.shop.primaryDomain?.host ?? import.meta.env.SHOPIFY_STORE_DOMAIN ?? process.env.SHOPIFY_STORE_DOMAIN ?? '',
    currency: data.localization?.country?.currency?.isoCode ?? 'JPY',
    acceptedLanguage: data.localization?.language?.isoCode ?? DEFAULT_LOCALE.toUpperCase(),
  };
}

type GetShopPolicyData = {
  shop: Partial<Record<ShopPolicyField, ShopPolicy | null>>;
};

function isUndefinedFieldError(err: unknown): boolean {
  return err instanceof Error && err.message.includes("doesn't exist on type 'Shop'");
}

/** 単一ポリシーを取得。安定版にフィールドが無い場合は unstable に再試行する。 */
async function fetchShopPolicy(field: ShopPolicyField, language: string): Promise<ShopPolicy | null> {
  const query = buildShopPolicyQuery(field);
  try {
    const { data } = await shopifyFetch<GetShopPolicyData>({ query, variables: { language } });
    return data.shop[field] ?? null;
  } catch (err) {
    if (isUndefinedFieldError(err)) {
      try {
        const { data } = await shopifyFetch<GetShopPolicyData>({
          query,
          variables: { language },
          apiVersion: 'unstable',
        });
        return data.shop[field] ?? null;
      } catch (fallbackErr) {
        console.warn(`[shopify] policy "${field}" の取得に失敗（unstable も不可）:`, (fallbackErr as Error).message);
        return null;
      }
    }
    console.warn(`[shopify] policy "${field}" の取得に失敗:`, (err as Error).message);
    return null;
  }
}

/** ストアポリシー（プライバシーポリシー・特定商取引法に基づく表記）を取得する */
export async function getShopPolicies(locale: Locale = DEFAULT_LOCALE): Promise<ShopPolicies> {
  const language = LOCALES[locale].shopifyLanguage;
  const [privacyPolicy, legalNotice] = await Promise.all([
    fetchShopPolicy('privacyPolicy', language),
    fetchShopPolicy('legalNotice', language),
  ]);
  return { privacyPolicy, legalNotice };
}

interface CartCreateData {
  cartCreate: { cart: Cart | null; userErrors: CartUserError[] };
}

/** カートを作成する */
export async function createCart(
  lines: { merchandiseId: string; quantity: number }[] = [],
  context: ShopifyRequestContext = {},
): Promise<Cart> {
  const { data } = await shopifyFetch<CartCreateData>({
    query: CART_CREATE_MUTATION,
    variables: { input: { lines } },
    ...context,
  });
  assertNoUserErrors(data.cartCreate.userErrors, 'cartCreate');
  if (!data.cartCreate.cart) throw new Error('cartCreate returned null cart');
  return data.cartCreate.cart;
}

interface CartLinesAddData {
  cartLinesAdd: { cart: Cart | null; userErrors: CartUserError[] };
}

/** カートに商品を追加する */
export async function addCartLines(
  cartId: string,
  lines: { merchandiseId: string; quantity: number }[],
  context: ShopifyRequestContext = {},
): Promise<Cart> {
  const { data } = await shopifyFetch<CartLinesAddData>({
    query: CART_ADD_LINES_MUTATION,
    variables: { cartId, lines },
    ...context,
  });
  assertNoUserErrors(data.cartLinesAdd.userErrors, 'cartLinesAdd');
  if (!data.cartLinesAdd.cart) throw new Error('cartLinesAdd returned null cart');
  return data.cartLinesAdd.cart;
}

interface CartLinesRemoveData {
  cartLinesRemove: { cart: Cart | null; userErrors: CartUserError[] };
}

/** カートから商品を削除する */
export async function removeCartLines(
  cartId: string,
  lineIds: string[],
  context: ShopifyRequestContext = {},
): Promise<Cart> {
  const { data } = await shopifyFetch<CartLinesRemoveData>({
    query: CART_REMOVE_LINES_MUTATION,
    variables: { cartId, lineIds },
    ...context,
  });
  assertNoUserErrors(data.cartLinesRemove.userErrors, 'cartLinesRemove');
  if (!data.cartLinesRemove.cart) throw new Error('cartLinesRemove returned null cart');
  return data.cartLinesRemove.cart;
}

interface CartLinesUpdateData {
  cartLinesUpdate: { cart: Cart | null; userErrors: CartUserError[] };
}

/** カートの数量を更新する */
export async function updateCartLines(
  cartId: string,
  lines: { id: string; quantity: number }[],
  context: ShopifyRequestContext = {},
): Promise<Cart> {
  const { data } = await shopifyFetch<CartLinesUpdateData>({
    query: CART_UPDATE_LINES_MUTATION,
    variables: { cartId, lines },
    ...context,
  });
  assertNoUserErrors(data.cartLinesUpdate.userErrors, 'cartLinesUpdate');
  if (!data.cartLinesUpdate.cart) throw new Error('cartLinesUpdate returned null cart');
  return data.cartLinesUpdate.cart;
}

interface GetCartData {
  cart: Cart | null;
}

/** カートを取得する */
export async function getCart(cartId: string, context: ShopifyRequestContext = {}): Promise<Cart | null> {
  const { data } = await shopifyFetch<GetCartData>({
    query: GET_CART_QUERY,
    variables: { cartId },
    ...context,
  });
  return data.cart;
}

interface CartBuyerIdentityData {
  cartBuyerIdentityUpdate: { cart: Cart | null; userErrors: CartUserError[] };
}

/** 送付先を更新して送料オプションを取得する */
export async function updateCartBuyerIdentity(
  cartId: string,
  buyerIdentity: { countryCode: string; email?: string },
  context: ShopifyRequestContext = {},
): Promise<Cart> {
  const { data } = await shopifyFetch<CartBuyerIdentityData>({
    query: CART_BUYER_IDENTITY_MUTATION,
    variables: { cartId, buyerIdentity },
    ...context,
  });
  assertNoUserErrors(data.cartBuyerIdentityUpdate.userErrors, 'cartBuyerIdentityUpdate');
  if (!data.cartBuyerIdentityUpdate.cart) throw new Error('cartBuyerIdentityUpdate returned null cart');
  return data.cartBuyerIdentityUpdate.cart;
}
