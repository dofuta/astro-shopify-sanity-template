import { useState, useEffect } from 'react';
import type { Cart as CartType } from '~/lib/types';
import {
  fetchCart,
  removeFromCart,
  updateCartLine,
  redirectToCheckout,
  formatMoney,
} from '~/scripts/shopify/cart';
import { CartLine } from './CartLine';
import '~/styles/cart.scss';

type CartState =
  | { status: 'loading' }
  | { status: 'empty' }
  | { status: 'error'; message: string }
  | { status: 'loaded'; cart: CartType };

export function Cart() {
  const [state, setState] = useState<CartState>({ status: 'loading' });
  const [checkingOut, setCheckingOut] = useState(false);

  useEffect(() => {
    fetchCart()
      .then((cart) => {
        if (!cart || cart.totalQuantity === 0) {
          setState({ status: 'empty' });
        } else {
          setState({ status: 'loaded', cart });
        }
      })
      .catch((err) => {
        console.error('[cart] fetchCart failed:', err);
        setState({ status: 'error', message: 'カートの読み込みに失敗しました。' });
      });
  }, []);

  const handleRemove = async (lineId: string) => {
    try {
      const cart = await removeFromCart(lineId);
      setState(cart.totalQuantity === 0 ? { status: 'empty' } : { status: 'loaded', cart });
    } catch (err) {
      console.error('[cart] removeFromCart failed:', err);
    }
  };

  const handleUpdate = async (lineId: string, quantity: number) => {
    try {
      const cart = await updateCartLine(lineId, quantity);
      setState(cart.totalQuantity === 0 ? { status: 'empty' } : { status: 'loaded', cart });
    } catch (err) {
      console.error('[cart] updateCartLine failed:', err);
    }
  };

  const handleCheckout = async () => {
    setCheckingOut(true);
    try {
      await redirectToCheckout();
    } catch (err) {
      console.error('[cart] redirectToCheckout failed:', err);
      setCheckingOut(false);
    }
  };

  return (
    <section className="cart">
      <h2 className="cart__title">カート</h2>

      {state.status === 'loading' && (
        <div className="cart__loading">読み込み中...</div>
      )}

      {(state.status === 'empty') && (
        <div className="cart__empty">
          <p>カートは空です。</p>
          <a href="/products" className="cart__continue-link">
            商品一覧を見る
          </a>
        </div>
      )}

      {state.status === 'error' && (
        <div className="cart__loading">{state.message}</div>
      )}

      {state.status === 'loaded' && (
        <div className="cart__content">
          <ul className="cart__lines">
            {state.cart.lines.edges.map(({ node: line }) => (
              <CartLine
                key={line.id}
                line={line}
                onRemove={handleRemove}
                onUpdate={handleUpdate}
              />
            ))}
          </ul>

          <div className="cart__summary">
            <div className="cart__subtotal">
              小計：
              <span>
                {formatMoney(
                  state.cart.cost.subtotalAmount.amount,
                  state.cart.cost.subtotalAmount.currencyCode,
                )}
              </span>
            </div>
            <p className="cart__note">※送料は次のステップで計算されます</p>
            <button
              className="cart__checkout-btn"
              type="button"
              disabled={checkingOut}
              onClick={handleCheckout}
            >
              {checkingOut ? '移動中...' : '購入手続きへ'}
            </button>
            <a href="/products" className="cart__continue-link">
              買い物を続ける
            </a>
          </div>
        </div>
      )}
    </section>
  );
}
