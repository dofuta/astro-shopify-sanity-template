import type { Cart } from '~/lib/types';
import type { ShopifyAnalyticsProduct } from '@shopify/hydrogen-react';

// ─── localStorage キー ────────────────────────────────────────────────────────

const CART_ID_KEY = 'shopify_cart_id';

interface AddToCartOptions {
  product?: ShopifyAnalyticsProduct;
  currency?: string;
}

// ─── cartId 管理 ──────────────────────────────────────────────────────────────

export function getCartId(): string | null {
  return localStorage.getItem(CART_ID_KEY);
}

export function setCartId(cartId: string): void {
  localStorage.setItem(CART_ID_KEY, cartId);
}

export function clearCartId(): void {
  localStorage.removeItem(CART_ID_KEY);
}

// ─── API ヘルパー ─────────────────────────────────────────────────────────────

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as T;
}

async function getJson<T>(path: string): Promise<T> {
  const res = await fetch(path);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as T;
}

// ─── カート操作 ───────────────────────────────────────────────────────────────

/**
 * cartId を取得する。存在しない場合は空のカートを作成して返す。
 * カートが有効期限切れの場合は localStorage をクリアして新規作成する。
 */
export async function getOrCreateCart(): Promise<string> {
  const cartId = getCartId();

  if (cartId) {
    // 有効期限チェック：取得できなければ新規作成
    try {
      const res = await fetch(`/api/cart/get?cartId=${encodeURIComponent(cartId)}`);
      if (res.status === 404) {
        clearCartId();
        return createNewCart();
      }
      return cartId;
    } catch {
      clearCartId();
      return createNewCart();
    }
  }

  return createNewCart();
}

async function createNewCart(): Promise<string> {
  const cart = await postJson<Cart>('/api/cart/create', { lines: [] });
  setCartId(cart.id);
  return cart.id;
}

/**
 * 商品をカートに追加する。
 * カートが存在しない場合は自動的に作成する。
 */
export async function addToCart(
  variantId: string,
  quantity: number = 1,
  options: AddToCartOptions = {},
): Promise<Cart> {
  const cartId = await getOrCreateCart();
  const cart = await postJson<Cart>('/api/cart/add', {
    cartId,
    lines: [{ merchandiseId: variantId, quantity }],
  });

  if (options.product) {
    document.dispatchEvent(
      new CustomEvent('shopify:add_to_cart', {
        detail: {
          cartId: cart.id,
          currency: options.currency,
          product: {
            ...options.product,
            quantity,
          },
        },
      }),
    );
  }

  return cart;
}

/**
 * カートから商品行を削除する。
 * lineId は Cart.lines.edges[].node.id
 */
export async function removeFromCart(lineId: string): Promise<Cart> {
  const cartId = getCartId();
  if (!cartId) throw new Error('No cart');
  return postJson<Cart>('/api/cart/remove', { cartId, lineIds: [lineId] });
}

/**
 * カートの商品数量を更新する。
 * quantity を 0 にすると削除と同等になる。
 */
export async function updateCartLine(lineId: string, quantity: number): Promise<Cart> {
  const cartId = getCartId();
  if (!cartId) throw new Error('No cart');
  return postJson<Cart>('/api/cart/update', {
    cartId,
    lines: [{ id: lineId, quantity }],
  });
}

/**
 * カートの現在の状態を取得する。
 * 404 の場合は localStorage をクリアして null を返す。
 */
export async function fetchCart(): Promise<Cart | null> {
  const cartId = getCartId();
  if (!cartId) return null;

  try {
    return await getJson<Cart>(`/api/cart/get?cartId=${encodeURIComponent(cartId)}`);
  } catch (err) {
    if (err instanceof Error && err.message.includes('404')) {
      clearCartId();
      return null;
    }
    throw err;
  }
}

/**
 * checkoutUrl を取得してリダイレクトする。
 */
export async function redirectToCheckout(): Promise<void> {
  const cartId = getCartId();
  if (!cartId) throw new Error('No cart');

  const cart = await getJson<Cart>(`/api/cart/get?cartId=${encodeURIComponent(cartId)}`);
  window.location.href = cart.checkoutUrl;
}

/**
 * 送付先を更新して送料オプションを取得する。
 */
export async function updateShipping(
  countryCode: string,
  email?: string,
): Promise<Cart> {
  const cartId = getCartId();
  if (!cartId) throw new Error('No cart');
  return postJson<Cart>('/api/cart/shipping', { cartId, countryCode, email });
}

// ─── カート表示ユーティリティ ─────────────────────────────────────────────────

/** カートのアイテム件数バッジを更新する */
export function updateCartBadge(totalQuantity: number): void {
  const badges = document.querySelectorAll<HTMLElement>('[data-cart-badge]');
  badges.forEach((badge) => {
    badge.textContent = totalQuantity > 0 ? String(totalQuantity) : '';
    badge.hidden = totalQuantity === 0;
  });
}

/** 金額を表示用にフォーマットする */
export function formatMoney(amount: string, currencyCode: string): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: currencyCode,
  }).format(parseFloat(amount));
}
