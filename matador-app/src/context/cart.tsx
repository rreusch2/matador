import { createContext, useContext, useMemo, useReducer, type ReactNode } from 'react';

import { getProduct, type Product } from '@/data/products';

export type CartItem = {
  key: string;
  productId: string;
  variant?: string;
  unitPrice: number;
  quantity: number;
};

type State = { items: CartItem[]; favorites: string[] };

type Action =
  | { type: 'add'; product: Product; variant?: string; unitPrice: number; quantity: number }
  | { type: 'setQty'; key: string; quantity: number }
  | { type: 'remove'; key: string }
  | { type: 'clear' }
  | { type: 'toggleFavorite'; productId: string };

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'add': {
      const key = `${action.product.id}::${action.variant ?? ''}`;
      const existing = state.items.find((i) => i.key === key);
      if (existing) {
        return {
          ...state,
          items: state.items.map((i) =>
            i.key === key ? { ...i, quantity: i.quantity + action.quantity } : i
          ),
        };
      }
      return {
        ...state,
        items: [
          ...state.items,
          {
            key,
            productId: action.product.id,
            variant: action.variant,
            unitPrice: action.unitPrice,
            quantity: action.quantity,
          },
        ],
      };
    }
    case 'setQty':
      return {
        ...state,
        items:
          action.quantity <= 0
            ? state.items.filter((i) => i.key !== action.key)
            : state.items.map((i) => (i.key === action.key ? { ...i, quantity: action.quantity } : i)),
      };
    case 'remove':
      return { ...state, items: state.items.filter((i) => i.key !== action.key) };
    case 'clear':
      return { ...state, items: [] };
    case 'toggleFavorite':
      return {
        ...state,
        favorites: state.favorites.includes(action.productId)
          ? state.favorites.filter((f) => f !== action.productId)
          : [...state.favorites, action.productId],
      };
  }
}

type CartContextValue = {
  items: (CartItem & { product: Product })[];
  count: number;
  subtotal: number;
  favorites: string[];
  add: (product: Product, opts: { variant?: string; unitPrice: number; quantity: number }) => void;
  setQty: (key: string, quantity: number) => void;
  remove: (key: string) => void;
  clear: () => void;
  toggleFavorite: (productId: string) => void;
};

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(reducer, { items: [], favorites: [] });

  const value = useMemo<CartContextValue>(() => {
    const items = state.items
      .map((i) => ({ ...i, product: getProduct(i.productId)! }))
      .filter((i) => i.product);
    return {
      items,
      count: items.reduce((n, i) => n + i.quantity, 0),
      subtotal: items.reduce((n, i) => n + i.quantity * i.unitPrice, 0),
      favorites: state.favorites,
      add: (product, { variant, unitPrice, quantity }) =>
        dispatch({ type: 'add', product, variant, unitPrice, quantity }),
      setQty: (key, quantity) => dispatch({ type: 'setQty', key, quantity }),
      remove: (key) => dispatch({ type: 'remove', key }),
      clear: () => dispatch({ type: 'clear' }),
      toggleFavorite: (productId) => dispatch({ type: 'toggleFavorite', productId }),
    };
  }, [state]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside <CartProvider>');
  return ctx;
}
