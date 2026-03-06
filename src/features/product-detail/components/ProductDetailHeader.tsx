import { ChevronLeft, MoreHorizontal, Share } from 'lucide-react';

interface ProductDetailHeaderProps {
  isScrolled: boolean;
  onBack: () => void;
  title?: string;
}

export const ProductDetailHeader = ({
  isScrolled,
  onBack,
  title,
}: ProductDetailHeaderProps) => (
  <div
    className={`fixed left-0 right-0 top-0 z-40 transition-colors duration-300 ${
      isScrolled ? 'bg-white shadow-sm dark:bg-gray-900' : 'bg-transparent'
    }`}
  >
    <div className="flex h-12 items-center justify-between px-4 pt-safe">
      <button
        onClick={onBack}
        className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
          isScrolled ? 'text-text-main' : 'bg-black/30 text-white'
        }`}
      >
        <ChevronLeft size={20} />
      </button>

      {isScrolled && (
        <div className="animate-in fade-in flex flex-1 items-center justify-center px-6 text-center text-md font-medium text-text-main">
          <span className="line-clamp-1">{title || '商品详情'}</span>
        </div>
      )}

      <div className="flex space-x-3">
        <button
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            isScrolled ? 'text-text-main' : 'bg-black/30 text-white'
          }`}
        >
          <Share size={18} />
        </button>
        <button
          className={`flex h-8 w-8 items-center justify-center rounded-full transition-colors ${
            isScrolled ? 'text-text-main' : 'bg-black/30 text-white'
          }`}
        >
          <MoreHorizontal size={18} />
        </button>
      </div>
    </div>
  </div>
);
