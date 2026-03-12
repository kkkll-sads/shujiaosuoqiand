import { MessageCircle, ShoppingCart, Store } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { CartCountBadge } from '../../../components/ui/CartCountBadge';

interface ProductPurchaseBarProps {
  onAddToCart: () => void;
  onBuyNow: () => void;
  onOpenCart: () => void;
  onOpenHelp: () => void;
  onOpenStore: () => void;
  cartCount?: number;
}

export const ProductPurchaseBar = ({
  onAddToCart,
  onBuyNow,
  onOpenCart,
  onOpenHelp,
  onOpenStore,
  cartCount = 0,
}: ProductPurchaseBarProps) => (
  <div className="fixed bottom-0 left-0 right-0 z-40 flex items-center justify-between border-t border-border-light bg-white px-2 py-2 pb-safe dark:bg-gray-900">
    <div className="flex items-center space-x-4 px-2">
      <button
        type="button"
        className="flex flex-col items-center text-text-main active:opacity-70"
        onClick={onOpenStore}
      >
        <Store size={20} className="mb-0.5" />
        <span className="text-xs">商城</span>
      </button>
      <button
        type="button"
        className="flex flex-col items-center text-text-main active:opacity-70"
        onClick={onOpenHelp}
      >
        <MessageCircle size={20} className="mb-0.5" />
        <span className="text-xs">客服</span>
      </button>
      <button
        type="button"
        className="relative flex flex-col items-center text-text-main active:opacity-70"
        onClick={onOpenCart}
      >
        <CartCountBadge count={cartCount} />
        <ShoppingCart size={20} className="mb-0.5" />
        <span className="text-xs">购物车</span>
      </button>
    </div>

    <div className="ml-4 flex flex-1 space-x-2">
      <Button
        variant="outline"
        className="h-[40px] flex-1 rounded-full border-primary-start text-base text-primary-start"
        onClick={onAddToCart}
      >
        加入购物车
      </Button>
      <Button className="h-[40px] flex-1 rounded-full text-base" onClick={onBuyNow}>
        立即购买
      </Button>
    </div>
  </div>
);
