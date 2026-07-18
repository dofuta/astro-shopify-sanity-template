export const prerender = false;

import type { APIRoute } from 'astro';
import { getShopifyBuyerHeaders, removeCartLines, shopifyJsonResponse } from '~/lib/shopify';

export const POST: APIRoute = async ({ request }) => {
  let shopifyHeaders: Headers | undefined;
  try {
    const body = await request.json();
    const { cartId, lineIds } = body as { cartId: string; lineIds: string[] };
    if (!cartId || !lineIds?.length) {
      return shopifyJsonResponse({ error: 'cartId and lineIds are required' }, { status: 400 });
    }
    const cart = await removeCartLines(cartId, lineIds, {
      buyerHeaders: getShopifyBuyerHeaders(request),
      onResponseHeaders: (headers) => {
        shopifyHeaders = headers;
      },
    });
    return shopifyJsonResponse(cart, { status: 200 }, shopifyHeaders);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return shopifyJsonResponse({ error: message }, { status: 500 }, shopifyHeaders);
  }
};
