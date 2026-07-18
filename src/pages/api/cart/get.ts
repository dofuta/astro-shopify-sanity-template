export const prerender = false;

import type { APIRoute } from 'astro';
import { getCart, getShopifyBuyerHeaders, shopifyJsonResponse } from '~/lib/shopify';

export const GET: APIRoute = async ({ request, url }) => {
  let shopifyHeaders: Headers | undefined;
  try {
    const cartId = url.searchParams.get('cartId');
    if (!cartId) {
      return shopifyJsonResponse({ error: 'cartId query parameter is required' }, { status: 400 });
    }
    const cart = await getCart(cartId, {
      buyerHeaders: getShopifyBuyerHeaders(request),
      onResponseHeaders: (headers) => {
        shopifyHeaders = headers;
      },
    });
    if (!cart) {
      return shopifyJsonResponse({ error: 'Cart not found' }, { status: 404 }, shopifyHeaders);
    }
    return shopifyJsonResponse(cart, { status: 200 }, shopifyHeaders);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return shopifyJsonResponse({ error: message }, { status: 500 }, shopifyHeaders);
  }
};
