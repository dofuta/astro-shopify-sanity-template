import type { MetafieldEntry } from './metafields';

// ─── Shopify 共通 ─────────────────────────────────────────────────────────────

export interface Money {
  amount: string;
  currencyCode: string;
}

export interface Image {
  url: string;
  altText: string | null;
}

// ─── Shopify Product ──────────────────────────────────────────────────────────

export interface ProductOption {
  id: string;
  name: string;
  values: string[];
}

export interface SelectedOption {
  name: string;
  value: string;
}

export interface ProductVariant {
  id: string;
  title: string;
  availableForSale: boolean;
  selectedOptions: SelectedOption[];
  price: Money;
  image: Image | null;
  metafields: MetafieldEntry[];
}

export interface Product {
  id: string;
  handle: string;
  title: string;
  descriptionHtml: string;
  featuredImage: Image | null;
  priceRange: {
    minVariantPrice: Money;
  };
  options: ProductOption[];
  variants: {
    edges: { node: ProductVariant }[];
  };
  metafields: MetafieldEntry[];
}

export type ProductListItem = Pick<
  Product,
  'id' | 'handle' | 'title' | 'featuredImage' | 'priceRange'
> & {
  variants: {
    edges: { node: Pick<ProductVariant, 'id' | 'availableForSale'> }[];
  };
};

// ─── Shopify ストアポリシー ───────────────────────────────────────────────────

export interface ShopPolicy {
  id: string;
  title: string;
  handle: string;
  body: string;
  url: string;
}

export interface ShopPolicies {
  /** プライバシーポリシー */
  privacyPolicy: ShopPolicy | null;
  /** 法定通知（日本では「特定商取引法に基づく表記」） */
  legalNotice: ShopPolicy | null;
}

// ─── Shopify Cart ─────────────────────────────────────────────────────────────

export interface CartLine {
  id: string;
  quantity: number;
  merchandise: {
    id: string;
    title: string;
    product: {
      id: string;
      handle: string;
      title: string;
      featuredImage: Image | null;
    };
    price: Money;
  };
}

export interface Cart {
  id: string;
  checkoutUrl: string;
  totalQuantity: number;
  cost: {
    subtotalAmount: Money;
    totalAmount: Money;
    totalTaxAmount: Money | null;
  };
  lines: {
    edges: { node: CartLine }[];
  };
}

export interface CartUserError {
  field: string[] | null;
  message: string;
}

// ─── Shopify Inventory ────────────────────────────────────────────────────────

export type InventoryStatus = 'available' | 'sold_out';

export interface InventoryResult {
  id: string;
  availableForSale: boolean;
  quantityAvailable: number | null;
}

// ─── microCMS コンテンツ型（用途に合わせて拡張する） ──────────────────────────
// SDK の MicroCMSListContent が id / createdAt / updatedAt / publishedAt / revisedAt を保持するため、
// 各型にはコンテンツ固有のフィールドだけを定義する。
// 使用例: getMicrocmsList<NewsItem>(...) → (NewsItem & MicroCMSListContent)[]

export interface NewsItem {
  title: string;
  body: string;
  category?: { id: string; name: string };
}

export interface BannerItem {
  title: string;
  image: { url: string; width: number; height: number };
  link?: string;
  isExternal?: boolean;
}

export interface PageContent {
  title: string;
  slug: string;
  body: string;
  description?: string;
}
