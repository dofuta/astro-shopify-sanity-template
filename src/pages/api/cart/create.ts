export const prerender = false;

import type { APIRoute } from 'astro';
import { createCart, getShopifyBuyerHeaders, shopifyJsonResponse } from '~/lib/shopify';

export const POST: APIRoute = async ({ request }) => {
  let shopifyHeaders: Headers | undefined;
  try {
    const body = await request.json().catch(() => ({}));
    const lines: { merchandiseId: string; quantity: number }[] = body.lines ?? [];
    const cart = await createCart(lines, {
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
