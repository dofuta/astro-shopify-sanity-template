export const prerender = false;

import type { APIRoute } from 'astro';
import { getInventory } from '~/lib/shopify';
import type { InventoryStatus } from '~/lib/types';

function toInventoryStatus(availableForSale: boolean): InventoryStatus {
  return availableForSale ? 'available' : 'sold_out';
}

export const GET: APIRoute = async ({ url }) => {
  try {
    const variantId = url.searchParams.get('variantId');
    if (!variantId) {
      return new Response(JSON.stringify({ error: 'variantId query parameter is required' }), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    const inventory = await getInventory(variantId);
    if (!inventory) {
      return new Response(JSON.stringify({ error: 'Variant not found' }), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });
    }
    return new Response(
      JSON.stringify({
        id: inventory.id,
        availableForSale: inventory.availableForSale,
        quantityAvailable: inventory.quantityAvailable,
        status: toInventoryStatus(inventory.availableForSale),
      }),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }
};
