import type { FC } from 'react';
import { ChevronRight, Clock, Copy } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';

interface CollectibleOrderCardProps {
  id: number;
  onSelect: () => void;
  onCopy: (text: string) => void;
}

export const CollectibleOrderCard: FC<CollectibleOrderCardProps> = ({
  id,
  onSelect,
  onCopy,
}) => (
  <Card className="mb-3 p-0 overflow-hidden cursor-pointer" onClick={onSelect}>
    <div className="px-3 py-2.5 border-b border-border-light flex justify-between items-center bg-bg-base/50">
      <div className="flex items-center">
        <span className="bg-purple-500 text-white text-xs px-1 rounded mr-1.5 font-medium leading-tight">藏品</span>
        <span className="text-base font-bold text-text-main">国家博物馆数字文创</span>
        <ChevronRight size={14} className="text-text-aux ml-0.5" />
      </div>
      <span className="text-base text-orange-500 font-medium">撮合中</span>
    </div>
    <div className="px-3 py-2 bg-orange-50 text-orange-600 text-s flex items-center">
      <Clock size={12} className="mr-1" />
      预计在 24 小时内完成撮合交割
    </div>
    <div className="p-3">
      <div className="flex space-x-3 mb-3">
        <div className="w-[72px] h-[72px] rounded-lg bg-bg-base overflow-hidden shrink-0 border border-border-light">
          <img
            src={`https://picsum.photos/seed/col${id}/150/150`}
            alt="Collectible"
            className="w-full h-full object-cover"
            referrerPolicy="no-referrer"
          />
        </div>
        <div className="flex-1 flex flex-col">
          <div className="text-md font-bold text-text-main line-clamp-1 leading-tight mb-1">
            四羊方尊 3D 数字复刻件
          </div>
          <div className="text-s text-text-aux mb-auto">编号: #1024 / 发行量: 5000</div>
          <div className="flex justify-between items-end mt-1">
            <div className="text-lg font-bold text-text-main leading-none">
              <span className="text-s">¥</span>299.00
            </div>
            <div className="text-sm text-text-aux">1 件</div>
          </div>
        </div>
      </div>
      <div className="flex justify-between items-center mb-3 text-s text-text-sub">
        <div className="flex items-center">
          交易单号: T993820192
          <button
            className="ml-1 cursor-pointer text-text-aux"
            onClick={event => {
              event.stopPropagation();
              onCopy('T993820192');
            }}
          >
            <Copy size={10} />
          </button>
        </div>
        <div>
          合计金额: <span className="text-md font-bold text-text-main">¥299.00</span>
        </div>
      </div>
      <div className="flex justify-end space-x-2 pt-3 border-t border-border-light" onClick={event => event.stopPropagation()}>
        <Button variant="secondary" fullWidth={false} className="text-sm h-[28px] px-3">
          取消交易
        </Button>
        <Button variant="outline" fullWidth={false} className="text-sm h-[28px] px-3 border-text-main text-text-main" onClick={onSelect}>
          查看详情
        </Button>
      </div>
    </div>
  </Card>
);
