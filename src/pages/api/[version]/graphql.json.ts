export const prerender = false;

import type { APIRoute } from 'astro';

const STOREFRONT_API_VERSION_RE = /^(unstable|2\d{3}-\d{2})$/;

const FORWARDED_HEADER_NAMES = [
  'accept',
  'accept-encoding',
  'accept-language',
  'access-control-request-headers',
  'access-control-request-method',
  'content-type',
  'cookie',
  'origin',
  'referer',
  'user-agent',
  'x-shopify-uniquetoken',
  'x-shopify-visittoken',
] as const;

function getRequiredEnv(name: string): string {
  const value = import.meta.env[name] ?? process.env[name];
  if (!value) throw new Error(`${name} is not set`);
  return value;
}

function getForwardedHeaders(request: Request, clientAddress: string): Headers {
  const headers = new Headers();

  for (const name of FORWARDED_HEADER_NAMES) {
    const value = request.headers.get(name);
    if (value) headers.set(name, value);
  }

  headers.set('X-Shopify-Storefront-Access-Token', getRequiredEnv('SHOPIFY_PUBLIC_STOREFRONT_ACCESS_TOKEN'));
  if (clientAddress) headers.set('x-forwarded-for', clientAddress);

  return headers;
}

async function forwardStorefrontApiRequest(request: Request, version: string, clientAddress: string): Promise<Response> {
  if (!STOREFRONT_API_VERSION_RE.test(version)) {
    return new Response(JSON.stringify({ error: 'Invalid Storefront API version' }), {
      status: 404,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  const domain = getRequiredEnv('SHOPIFY_STORE_DOMAIN');
  const url = `https://${domain}/api/${version}/graphql.json`;
  const hasBody = request.method !== 'GET' && request.method !== 'HEAD';

  const shopifyResponse = await fetch(url, {
    method: request.method,
    headers: getForwardedHeaders(request, clientAddress),
    body: hasBody ? await request.arrayBuffer() : undefined,
  });

  return new Response(shopifyResponse.body, {
    status: shopifyResponse.status,
    statusText: shopifyResponse.statusText,
    headers: shopifyResponse.headers,
  });
}

export const ALL: APIRoute = async ({ request, params, clientAddress }) => {
  try {
    return await forwardStorefrontApiRequest(request, params.version ?? '', clientAddress);
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
