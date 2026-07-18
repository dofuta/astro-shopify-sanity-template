import {
  AnalyticsEventName,
  ShopifySalesChannel,
  getClientBrowserParameters,
  getTrackingValues,
  sendShopifyAnalytics,
  SHOPIFY_UNIQUE_TOKEN_HEADER,
  SHOPIFY_VISIT_TOKEN_HEADER,
} from '@shopify/hydrogen-react';
import type { ShopifyAnalyticsProduct } from '@shopify/hydrogen-react';
import type { CurrencyCode, LanguageCode } from '@shopify/hydrogen-react/storefront-api-types';

interface ShopifyAnalyticsConfig {
  shopId: string;
  shopName: string;
  shopDomain: string;
  currency: string;
  acceptedLanguage: string;
  pageType: string;
  canonicalUrl: string;
  resourceId?: string;
  products?: ShopifyAnalyticsProduct[];
}

interface ShopifyAddToCartDetail {
  cartId: string;
  product: ShopifyAnalyticsProduct;
  currency?: string;
}

const CONFIG_SCRIPT_ID = 'shopify-analytics-config';
const ENSURE_COOKIES_QUERY = /* GraphQL */ `
  query EnsureShopifyAnalyticsCookies {
    consentManagement {
      cookies(visitorConsent: {}) {
        cookieDomain
      }
    }
  }
`;

function readConfig(): ShopifyAnalyticsConfig | null {
  const element = document.getElementById(CONFIG_SCRIPT_ID);
  if (!element?.textContent) return null;

  try {
    return JSON.parse(element.textContent) as ShopifyAnalyticsConfig;
  } catch (err) {
    console.warn('[shopify:analytics] failed to parse config:', err);
    return null;
  }
}

async function ensureShopifyCookies(): Promise<void> {
  const { uniqueToken, visitToken } = getTrackingValues();
  const headers = new Headers({ 'Content-Type': 'application/json' });

  if (uniqueToken) headers.set(SHOPIFY_UNIQUE_TOKEN_HEADER, uniqueToken);
  if (visitToken) headers.set(SHOPIFY_VISIT_TOKEN_HEADER, visitToken);

  const response = await fetch('/api/unstable/graphql.json', {
    method: 'POST',
    headers,
    body: JSON.stringify({ query: ENSURE_COOKIES_QUERY }),
  });

  if (!response.ok) {
    throw new Error(`ensure cookies failed: ${response.status} ${response.statusText}`);
  }

  await response.json().catch(() => null);
  getTrackingValues();
}

function buildBasePayload(config: ShopifyAnalyticsConfig) {
  const tracking = getTrackingValues();

  return {
    ...getClientBrowserParameters(),
    uniqueToken: tracking.uniqueToken,
    visitToken: tracking.visitToken,
    hasUserConsent: true,
    analyticsAllowed: true,
    marketingAllowed: true,
    saleOfDataAllowed: true,
    shopId: config.shopId,
    currency: config.currency as CurrencyCode,
    acceptedLanguage: config.acceptedLanguage as LanguageCode,
    shopifySalesChannel: ShopifySalesChannel.headless,
  };
}

async function sendPageView(config: ShopifyAnalyticsConfig): Promise<void> {
  await sendShopifyAnalytics(
    {
      eventName: AnalyticsEventName.PAGE_VIEW,
      payload: {
        ...buildBasePayload(config),
        canonicalUrl: config.canonicalUrl,
        pageType: config.pageType,
        resourceId: config.resourceId,
        products: config.products,
      },
    },
    config.shopDomain,
  );
}

async function sendAddToCart(config: ShopifyAnalyticsConfig, detail: ShopifyAddToCartDetail): Promise<void> {
  await sendShopifyAnalytics(
    {
      eventName: AnalyticsEventName.ADD_TO_CART,
      payload: {
        ...buildBasePayload(config),
        cartId: detail.cartId,
        currency: (detail.currency ?? config.currency) as CurrencyCode,
        products: [detail.product],
        totalValue: Number(detail.product.price) * (detail.product.quantity ?? 1),
      },
    },
    config.shopDomain,
  );
}

function listenForCartEvents(config: ShopifyAnalyticsConfig): void {
  document.addEventListener('shopify:add_to_cart', (event) => {
    const detail = (event as CustomEvent<ShopifyAddToCartDetail>).detail;
    if (!detail?.cartId || !detail.product) return;

    sendAddToCart(config, detail).catch((err) => {
      console.warn('[shopify:analytics] ADD_TO_CART failed:', err);
    });
  });
}

async function init(): Promise<void> {
  const config = readConfig();
  if (!config) return;

  listenForCartEvents(config);

  try {
    await ensureShopifyCookies();
    await sendPageView(config);
  } catch (err) {
    console.warn('[shopify:analytics] PAGE_VIEW failed:', err);
  }
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => void init(), { once: true });
} else {
  void init();
}
