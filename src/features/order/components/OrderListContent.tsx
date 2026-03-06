import { Fragment } from 'react';
import { FileX, RefreshCcw } from 'lucide-react';
import { Button } from '../../../components/ui/Button';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import { CollectibleOrderCard } from './CollectibleOrderCard';
import { MallOrderCard } from './MallOrderCard';
import type { OrderType } from '../types';

interface OrderListContentProps {
  orderType: OrderType;
  loading: boolean;
  moduleError: boolean;
  emptyList: boolean;
  onRetry: () => void;
  onOpenEmptyTarget: () => void;
  onCopy: (text: string) => void;
  onOpenMallOrderDetail: () => void;
  onOpenCollectibleDetail: (id: number) => void;
  onOpenLogistics: () => void;
  onOpenCashier: () => void;
}

export const OrderListContent = ({
  orderType,
  loading,
  moduleError,
  emptyList,
  onRetry,
  onOpenEmptyTarget,
  onCopy,
  onOpenMallOrderDetail,
  onOpenCollectibleDetail,
  onOpenLogistics,
  onOpenCashier,
}: OrderListContentProps) => {
  if (moduleError) {
    return (
      <Card className="flex flex-col items-center justify-center py-10 border border-border-light">
        <RefreshCcw size={32} className="text-text-aux mb-3" />
        <p className="text-md text-text-sub mb-4">订单数据加载失败</p>
        <Button variant="outline" fullWidth={false} onClick={onRetry} className="h-[32px] px-6 text-sm">
          重试
        </Button>
      </Card>
    );
  }

  if (emptyList) {
    return (
      <Card className="flex flex-col items-center justify-center py-12 border border-border-light bg-transparent shadow-none">
        <FileX size={48} className="text-text-aux mb-4 opacity-50" strokeWidth={1.5} />
        <p className="text-md text-text-sub mb-5">
          {orderType === 'mall' ? '暂无商城订单，去逛逛自营商城' : '暂无藏品订单，去确权中心看看'}
        </p>
        <Button
          variant="outline"
          fullWidth={false}
          className="h-[36px] px-6 rounded-full border-primary-start text-primary-start text-sm"
          onClick={onOpenEmptyTarget}
        >
          {orderType === 'mall' ? '去商城' : '去确权中心'}
        </Button>
      </Card>
    );
  }

  if (loading) {
    return (
      <>
        {[1, 2, 3].map(i => (
          <Card key={i} className="mb-3 p-0 overflow-hidden">
            <div className="px-3 py-3 border-b border-border-light flex justify-between items-center">
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-12 h-4" />
            </div>
            <div className="p-3">
              <div className="flex space-x-3 mb-3">
                <Skeleton className="w-[72px] h-[72px] rounded-lg shrink-0" />
                <div className="flex-1 space-y-2 py-1">
                  <Skeleton className="w-full h-4" />
                  <Skeleton className="w-2/3 h-4" />
                  <Skeleton className="w-1/3 h-3 mt-2" />
                </div>
              </div>
              <div className="flex justify-between mb-3">
                <Skeleton className="w-32 h-3" />
                <Skeleton className="w-16 h-4" />
              </div>
              <div className="flex justify-end space-x-2 pt-3 border-t border-border-light">
                <Skeleton className="w-20 h-[28px] rounded-full" />
                <Skeleton className="w-20 h-[28px] rounded-full" />
              </div>
            </div>
          </Card>
        ))}
      </>
    );
  }

  return orderType === 'mall' ? (
    <>
      {[1, 2, 3].map(id => (
        <Fragment key={id}>
          <MallOrderCard
            id={id}
            onOpenOrderDetail={onOpenMallOrderDetail}
            onCopy={onCopy}
            onOpenLogistics={onOpenLogistics}
            onOpenCashier={onOpenCashier}
          />
        </Fragment>
      ))}
    </>
  ) : (
    <>
      {[1, 2].map(id => (
        <Fragment key={id}>
          <CollectibleOrderCard id={id} onSelect={() => onOpenCollectibleDetail(id)} onCopy={onCopy} />
        </Fragment>
      ))}
    </>
  );
};
