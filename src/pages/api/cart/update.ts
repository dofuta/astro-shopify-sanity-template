export const prerender = false;

import type { APIRoute } from 'astro';
import { getShopifyBuyerHeaders, shopifyJsonResponse, updateCartLines } from '~/lib/shopify';

export const POST: APIRoute = async ({ request }) => {
  let shopifyHeaders: Headers | undefined;
  try {
    const body = await request.json();
    const { cartId, lines } = body as {
      cartId: string;
      lines: { id: string; quantity: number }[];
    };
    if (!cartId || !lines?.length) {
      return shopifyJsonResponse({ error: 'cartId and lines are required' }, { status: 400 });
    }
    const cart = await updateCartLines(cartId, lines, {
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
