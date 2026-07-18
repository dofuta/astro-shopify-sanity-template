export const prerender = false;

import type { APIRoute } from 'astro';
import { getShopifyBuyerHeaders, shopifyJsonResponse, updateCartBuyerIdentity } from '~/lib/shopify';

export const POST: APIRoute = async ({ request }) => {
  let shopifyHeaders: Headers | undefined;
  try {
    const body = await request.json();
    const { cartId, countryCode, email } = body as {
      cartId: string;
      countryCode: string;
      email?: string;
    };
    if (!cartId || !countryCode) {
      return shopifyJsonResponse({ error: 'cartId and countryCode are required' }, { status: 400 });
    }
    const buyerIdentity: { countryCode: string; email?: string } = { countryCode };
    if (email) buyerIdentity.email = email;
    const cart = await updateCartBuyerIdentity(cartId, buyerIdentity, {
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
