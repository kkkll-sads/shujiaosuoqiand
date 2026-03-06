import { Search } from 'lucide-react';

interface OrderHeaderProps {
  onSearch: () => void;
}

export const OrderHeader = ({ onSearch }: OrderHeaderProps) => (
  <div className="bg-bg-card px-4 py-3 flex items-center justify-between border-b border-border-light sticky top-0 z-40">
    <div className="w-6"></div>
    <h1 className="text-3xl font-bold text-text-main">订单</h1>
    <button className="text-text-main p-1 -mr-1 active:opacity-70" onClick={onSearch}>
      <Search size={20} />
    </button>
  </div>
);
