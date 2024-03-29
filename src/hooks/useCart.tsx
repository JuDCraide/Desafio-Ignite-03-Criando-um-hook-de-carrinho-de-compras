import { createContext, ReactNode, useContext, useState } from 'react';
import { toast } from 'react-toastify';
import { api } from '../services/api';
import { Product, Stock } from '../types';

interface CartProviderProps {
  children: ReactNode;
}

interface UpdateProductAmount {
  productId: number;
  amount: number;
}

interface CartContextData {
  cart: Product[];
  addProduct: (productId: number) => Promise<void>;
  removeProduct: (productId: number) => void;
  updateProductAmount: ({ productId, amount }: UpdateProductAmount) => void;
}

const CartContext = createContext<CartContextData>({} as CartContextData);

export function CartProvider({ children }: CartProviderProps): JSX.Element {
  const [cart, setCart] = useState<Product[]>(() => {
    const storageCart = localStorage.getItem('@RocketShoes:cart');

    if (storageCart) {
      return JSON.parse(storageCart);
    }

    return [];
  });

  const addProduct = async (productId: number) => {
    try {
      const stockResponse = await api.get(`/stock/${productId}`);
      const stock: Stock = stockResponse.data;

      if (stock.amount < 1) {
        toast.error('Quantidade solicitada fora de estoque');
        return;
      };

      const productInCart = cart.find(product => product.id === productId);

      var newCart = [] as Product[];

      if (productInCart) {
        const product = { ...productInCart, amount: productInCart.amount + 1 };

        if (product.amount > stock.amount) {
          toast.error('Quantidade solicitada fora de estoque');
          return;
        }

        newCart = cart.map(cartProduct =>
          cartProduct.id === productId ? product : cartProduct
        );

      } else {

        const response = await api.get(`/products/${productId}`);
        newCart = [...cart, {
          ...response.data,
          amount: 1
        }];
      }
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);

    } catch {
      toast.error('Erro na adição do produto')
    }
  };

  const removeProduct = (productId: number) => {
    try {
      const productInCart = cart.find(product => product.id === productId);
      if (!productInCart) throw new Error();
      var newCart = cart.filter(product => product.id !== productId);
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);
    } catch {
      toast.error('Erro na remoção do produto')
    }
  };

  const updateProductAmount = async ({
    productId,
    amount,
  }: UpdateProductAmount) => {
    try {
      const productInCart = cart.find(product => product.id === productId);
      if (!productInCart) throw new Error();

      const stockResponse = await api.get(`/stock/${productId}`);
      const stock: Stock = stockResponse.data;

      if (amount < 1) throw new Error();

      if (stock.amount < amount) {
        return toast.error('Quantidade solicitada fora de estoque');
      };

      const product = { ...productInCart, amount: amount };

      const newCart = cart.map(cartProduct =>
        cartProduct.id === productId ? product : cartProduct
      );
      localStorage.setItem('@RocketShoes:cart', JSON.stringify(newCart));
      setCart(newCart);
    } catch {
      toast.error('Erro na alteração de quantidade do produto');
    }
  };

  return (
    <CartContext.Provider
      value={{ cart, addProduct, removeProduct, updateProductAmount }}
    >
      {children}
    </CartContext.Provider>
  );
}

export function useCart(): CartContextData {
  const context = useContext(CartContext);

  return context;
}
