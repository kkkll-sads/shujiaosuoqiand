import { ChevronRight, RefreshCcw, Star } from 'lucide-react';
import type { ShopProductReviewSummary } from '../../../api/modules/shopProduct';
import { Card } from '../../../components/ui/Card';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  getShopProductReviewImages,
  getShopProductReviewUser,
  resolveShopProductImageUrl,
} from '../../shop-product/utils';

interface ProductReviewsSectionProps {
  loading: boolean;
  moduleError: boolean;
  onOpenQa: () => void;
  onOpenReviews: () => void;
  onRetry: () => void;
  summary: ShopProductReviewSummary | null;
}

export const ProductReviewsSection = ({
  loading,
  moduleError,
  onOpenQa,
  onOpenReviews,
  onRetry,
  summary,
}: ProductReviewsSectionProps) => {
  if (moduleError) {
    return (
      <Card className="m-4 flex flex-col items-center justify-center p-6">
        <RefreshCcw size={24} className="mb-2 text-text-aux" />
        <p className="mb-3 text-sm text-text-sub">评价摘要加载失败</p>
        <button
          onClick={onRetry}
          className="rounded-full border border-border-light px-4 py-1 text-sm text-text-main"
        >
          重试
        </button>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="m-4 space-y-4 p-4">
        <div className="flex justify-between">
          <Skeleton className="h-5 w-20" />
          <Skeleton className="h-4 w-16" />
        </div>
        <div className="space-y-2">
          <div className="flex items-center space-x-2">
            <Skeleton className="h-6 w-6 rounded-full" />
            <Skeleton className="h-4 w-16" />
          </div>
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </Card>
    );
  }

  const preview = summary?.preview?.[0];
  const previewImages = preview ? getShopProductReviewImages(preview) : [];

  return (
    <Card className="m-4 p-4">
      <div
        className="mb-4 flex cursor-pointer items-center justify-between active:opacity-70"
        onClick={onOpenReviews}
      >
        <div className="flex items-center">
          <h3 className="mr-2 text-lg font-bold text-text-main">用户评价</h3>
          <span className="text-sm text-text-sub">
            好评率 {summary?.good_rate ?? 100}% · 共 {summary?.total ?? 0} 条
          </span>
        </div>
        <div className="flex items-center text-sm text-text-sub">
          查看全部
          <ChevronRight size={14} />
        </div>
      </div>

      {preview ? (
        <div className="space-y-4">
          <div className="border-b border-border-light pb-4 last:border-0 last:pb-0">
            <div className="mb-2 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img
                  src={resolveShopProductImageUrl(preview.avatar)}
                  alt={getShopProductReviewUser(preview)}
                  className="h-6 w-6 rounded-full object-cover"
                  referrerPolicy="no-referrer"
                />
                <span className="text-sm text-text-main">{getShopProductReviewUser(preview)}</span>
                <div className="flex text-primary-start">
                  {Array.from({ length: preview.rating ?? 5 }).map((_, index) => (
                    <Star key={index} size={10} fill="currentColor" />
                  ))}
                </div>
              </div>
              <span className="text-xs text-text-aux">{preview.time || '--'}</span>
            </div>
            <p className="mb-2 line-clamp-3 text-base text-text-main">
              {preview.content || '该用户暂未填写评价内容'}
            </p>
            {preview.purchase_info && (
              <div className="mb-2 text-xs text-text-sub">{preview.purchase_info}</div>
            )}
            {previewImages.length > 0 && (
              <div className="flex space-x-2 overflow-x-auto">
                {previewImages.map((image) => (
                  <img
                    key={image}
                    src={image}
                    className="h-16 w-16 shrink-0 rounded-lg object-cover"
                    referrerPolicy="no-referrer"
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      ) : (
        <div className="rounded-xl bg-bg-base p-4 text-sm text-text-sub">
          当前商品还没有公开评价。
        </div>
      )}

      <div
        className="mt-4 flex cursor-pointer items-center justify-between border-t border-border-light pt-4 active:opacity-70"
        onClick={onOpenQa}
      >
        <div className="flex items-center">
          <h3 className="mr-2 text-md font-bold text-text-main">商品问答</h3>
          <span className="text-sm text-text-sub">查看商品相关咨询</span>
        </div>
        <div className="flex items-center text-sm text-text-sub">
          去提问
          <ChevronRight size={14} />
        </div>
      </div>
    </Card>
  );
};
