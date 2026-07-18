import type { InventoryStatus } from '~/lib/types';

// ─── 在庫状態テキスト ─────────────────────────────────────────────────────────

export const INVENTORY_LABELS: Record<InventoryStatus, string> = {
  available: '在庫あり',
  sold_out: '売り切れ',
};

// ─── 在庫取得 ─────────────────────────────────────────────────────────────────

export interface InventoryResponse {
  id: string;
  availableForSale: boolean;
  quantityAvailable: number | null;
  status: InventoryStatus;
}

/**
 * variant ID の在庫をAPIから取得する。
 * variantId は Shopify の Global ID（gid://shopify/ProductVariant/...）
 */
export async function fetchInventory(variantId: string): Promise<InventoryResponse> {
  const res = await fetch(`/api/inventory?variantId=${encodeURIComponent(variantId)}`);
  const json = await res.json();
  if (!res.ok) throw new Error(json.error ?? `HTTP ${res.status}`);
  return json as InventoryResponse;
}

// ─── UI 更新ヘルパー ──────────────────────────────────────────────────────────

/**
 * 在庫状態に応じて表示要素を更新する。
 *
 * 使用例（HTML側）:
 *   <span data-inventory-status></span>
 *   <button data-add-to-cart>カートに追加</button>
 */
export function updateInventoryUI(
  containerEl: Element,
  status: InventoryStatus,
): void {
  const statusEl = containerEl.querySelector<HTMLElement>('[data-inventory-status]');
  const addToCartBtn = containerEl.querySelector<HTMLButtonElement>('[data-add-to-cart]');

  if (statusEl) {
    statusEl.textContent = INVENTORY_LABELS[status];
    statusEl.dataset.status = status;
  }

  if (addToCartBtn) {
    addToCartBtn.disabled = status === 'sold_out';
  }
}

// ─── variant 選択連動 ─────────────────────────────────────────────────────────

/**
 * variant セレクタが変更されたときに在庫を再取得して UI を更新する。
 *
 * 使用例（Astro frontmatter 内のインラインスクリプト）:
 *   import { initVariantInventoryListener } from '~/scripts/shopify/inventory';
 *   initVariantInventoryListener(document.querySelector('[data-product-form]'));
 */
export function initVariantInventoryListener(
  formEl: Element | null,
  onStatusChange?: (status: InventoryStatus) => void,
): void {
  if (!formEl) return;

  const selectEl = formEl.querySelector<HTMLSelectElement>('[data-variant-select]');
  if (!selectEl) return;

  const handleChange = async () => {
    const variantId = selectEl.value;
    if (!variantId) return;

    // ローディング状態を表示
    updateInventoryUI(formEl, 'available');
    const statusEl = formEl.querySelector<HTMLElement>('[data-inventory-status]');
    if (statusEl) statusEl.textContent = '確認中...';

    try {
      const { status } = await fetchInventory(variantId);
      updateInventoryUI(formEl, status);
      onStatusChange?.(status);
    } catch (err) {
      console.error('[inventory] Failed to fetch inventory:', err);
    }
  };

  selectEl.addEventListener('change', handleChange);

  // 初期表示時にも取得
  if (selectEl.value) {
    handleChange();
  }
}
