import { useState, useEffect, useCallback } from 'react';
import type { ProductVariant, ProductOption, Money, InventoryStatus } from '~/lib/types';
import { fetchInventory } from '~/scripts/shopify/inventory';
import { addToCart, updateCartBadge } from '~/scripts/shopify/cart';
import styles from './ProductForm.module.scss';

interface Props {
  productId: string;
  productTitle: string;
  variants: ProductVariant[];
  options: ProductOption[];
  initialPrice: Money;
}

type CartStatus = 'idle' | 'adding' | 'added' | 'error';

function formatPrice(money: Money): string {
  return new Intl.NumberFormat('ja-JP', {
    style: 'currency',
    currency: money.currencyCode,
  }).format(parseFloat(money.amount));
}

export default function ProductForm({ productId, productTitle, variants, options, initialPrice }: Props) {
  const hasOptions = options.length > 0;
  const hasMultipleVariants = variants.length > 1;

  const buildInitialOptions = (): Record<string, string> => {
    if (!hasOptions) return {};
    return Object.fromEntries(options.map((opt) => [opt.name, opt.values[0]]));
  };

  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(buildInitialOptions);
  const [selectedVariantId, setSelectedVariantId] = useState<string>(variants[0]?.id ?? '');
  const [price, setPrice] = useState<Money>(initialPrice);
  const [inventoryStatus, setInventoryStatus] = useState<InventoryStatus | 'loading'>('loading');
  const [cartStatus, setCartStatus] = useState<CartStatus>('idle');

  const findVariantByOptions = useCallback(
    (opts: Record<string, string>): ProductVariant | undefined => {
      return variants.find((v) => v.selectedOptions.every((opt) => opts[opt.name] === opt.value));
    },
    [variants],
  );

  const loadInventory = useCallback(async (variantId: string) => {
    setInventoryStatus('loading');
    try {
      const { status } = await fetchInventory(variantId);
      setInventoryStatus(status);
    } catch {
      setInventoryStatus('available');
    }
  }, []);

  // 初回マウント時に在庫取得
  useEffect(() => {
    if (selectedVariantId) {
      loadInventory(selectedVariantId);
    }
  }, []);

  const handleOptionChange = (optionName: string, value: string) => {
    const newOptions = { ...selectedOptions, [optionName]: value };
    setSelectedOptions(newOptions);

    const matched = findVariantByOptions(newOptions);
    if (matched) {
      setSelectedVariantId(matched.id);
      setPrice(matched.price);
      loadInventory(matched.id);
    }
  };

  const handleVariantSelectChange = (variantId: string) => {
    setSelectedVariantId(variantId);
    const matched = variants.find((v) => v.id === variantId);
    if (matched) {
      setPrice(matched.price);
      loadInventory(matched.id);
    }
  };

  const handleAddToCart = async () => {
    if (!selectedVariantId) return;
    setCartStatus('adding');
    try {
      const selectedVariant = variants.find((v) => v.id === selectedVariantId);
      const cart = await addToCart(
        selectedVariantId,
        1,
        selectedVariant
          ? {
              currency: selectedVariant.price.currencyCode,
              product: {
                productGid: productId,
                variantGid: selectedVariant.id,
                name: productTitle,
                variantName: selectedVariant.title,
                brand: '',
                price: selectedVariant.price.amount,
                quantity: 1,
              },
            }
          : undefined,
      );
      updateCartBadge(cart.totalQuantity);
      setCartStatus('added');
      setTimeout(() => setCartStatus('idle'), 2000);
    } catch (err) {
      console.error('[cart] addToCart failed:', err);
      setCartStatus('error');
      setTimeout(() => setCartStatus('idle'), 2000);
    }
  };

  const cartButtonLabel = () => {
    switch (cartStatus) {
      case 'adding':
        return '追加中...';
      case 'added':
        return '追加しました';
      case 'error':
        return 'エラーが発生しました';
      default:
        return 'カートに追加';
    }
  };

  const isCartButtonDisabled = cartStatus !== 'idle' || inventoryStatus === 'sold_out';

  const selectedVariant = variants.find((v) => v.id === selectedVariantId);
  const variantMetafields = selectedVariant?.metafields ?? [];

  return (
    <>
      <p className={styles.price}>
        {formatPrice(price)}
        <span className={styles.tax}>（税込）</span>
      </p>

      {hasOptions && (
        <div className={styles.options}>
          {options.map((option) => (
            <div key={option.id} className={styles.option}>
              <label className={styles.optionLabel} htmlFor={`option-${option.id}`}>
                {option.name}
              </label>
              <select
                id={`option-${option.id}`}
                className={styles.optionSelect}
                value={selectedOptions[option.name] ?? ''}
                onChange={(e) => handleOptionChange(option.name, e.target.value)}
              >
                {option.values.map((value) => (
                  <option key={value} value={value}>
                    {value}
                  </option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}

      {hasMultipleVariants && !hasOptions && (
        <div className={styles.variant}>
          <label className={styles.optionLabel} htmlFor="variant-select">
            バリエーション
          </label>
          <select
            id="variant-select"
            className={styles.optionSelect}
            value={selectedVariantId}
            onChange={(e) => handleVariantSelectChange(e.target.value)}
          >
            {variants.map((v) => (
              <option key={v.id} value={v.id}>
                {v.title}
              </option>
            ))}
          </select>
        </div>
      )}

      <div className={styles.inventory}>
        <span
          className={styles.inventoryStatus}
          data-status={inventoryStatus === 'loading' ? '' : inventoryStatus}
        >
          {inventoryStatus === 'loading' ? '確認中...' : inventoryStatus === 'available' ? '在庫あり' : '売り切れ'}
        </span>
      </div>

      <button
        className={styles.addToCart}
        type="button"
        disabled={isCartButtonDisabled}
        onClick={handleAddToCart}
      >
        {cartButtonLabel()}
      </button>

      {variantMetafields.length > 0 && (
        <dl className={styles.metafields}>
          {variantMetafields.map((mf) => (
            <div key={`${mf.namespace}.${mf.key}`} className={styles.metafield}>
              <dt className={styles.metafieldLabel}>{mf.label}</dt>
              <dd className={styles.metafieldValue}>{mf.value}</dd>
            </div>
          ))}
        </dl>
      )}
    </>
  );
}
