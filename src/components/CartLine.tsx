import type { CartLine as CartLineType } from '~/lib/types';
import { formatMoney } from '~/scripts/shopify/cart';

interface Props {
  line: CartLineType;
  onRemove: (lineId: string) => void;
  onUpdate: (lineId: string, quantity: number) => void;
}

export function CartLine({ line, onRemove, onUpdate }: Props) {
  const { merchandise } = line;
  const productImage = merchandise.product.featuredImage;
  const total = formatMoney(
    String(parseFloat(merchandise.price.amount) * line.quantity),
    merchandise.price.currencyCode,
  );

  const handleDecrease = () => {
    if (line.quantity <= 1) {
      onRemove(line.id);
    } else {
      onUpdate(line.id, line.quantity - 1);
    }
  };

  return (
    <li className="cart__line">
      <div className="cart__line-image-wrap">
        {productImage && (
          <img
            src={productImage.url}
            alt={productImage.altText ?? merchandise.product.title}
            className="cart__line-image"
            width={80}
            height={80}
            loading="lazy"
          />
        )}
      </div>

      <div className="cart__line-info">
        <p className="cart__line-product">{merchandise.product.title}</p>
        <p className="cart__line-variant">{merchandise.title}</p>
        <div className="cart__line-controls">
          <button
            className="cart__line-qty-btn"
            type="button"
            aria-label="数量を減らす"
            onClick={handleDecrease}
          >
            －
          </button>
          <span className="cart__line-qty">{line.quantity}</span>
          <button
            className="cart__line-qty-btn"
            type="button"
            aria-label="数量を増やす"
            onClick={() => onUpdate(line.id, line.quantity + 1)}
          >
            ＋
          </button>
        </div>
        <p className="cart__line-price">{total}</p>
      </div>

      <button
        className="cart__line-remove"
        type="button"
        aria-label="削除"
        onClick={() => onRemove(line.id)}
      >
        ✕
      </button>
    </li>
  );
}
