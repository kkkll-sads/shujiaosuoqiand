import { ShieldCheck } from 'lucide-react';
import type { ShopProductDetail } from '../../../api/modules/shopProduct';
import { Skeleton } from '../../../components/ui/Skeleton';
import {
  buildShopProductDescription,
  buildShopProductServiceItems,
  buildShopProductSpecs,
  getShopProductPurchaseTag,
  resolveShopProductImageUrl,
} from '../../shop-product/utils';
import { PRODUCT_DETAIL_TABS } from '../constants';
import type { ProductDetailTab } from '../types';

interface ProductTabsSectionProps {
  activeTab: ProductDetailTab;
  loading: boolean;
  onChange: (tab: ProductDetailTab) => void;
  product: ShopProductDetail | null;
}

export const ProductTabsSection = ({
  activeTab,
  loading,
  onChange,
  product,
}: ProductTabsSectionProps) => {
  const specs = buildShopProductSpecs(product);
  const serviceItems = buildShopProductServiceItems(product);
  const parameterRows =
    specs.length > 0
      ? specs
      : [
          { name: '商品分类', value: product?.category || '--' },
          { name: '购买方式', value: product ? getShopProductPurchaseTag(product) : '--' },
          { name: '库存', value: String(product?.stock ?? 0) },
          { name: '销量', value: String(product?.sales ?? 0) },
        ];

  return (
    <div className="mt-4 bg-white pb-4 dark:bg-gray-900">
      <div className="sticky top-12 z-30 flex border-b border-border-light bg-white dark:bg-gray-900">
        {PRODUCT_DETAIL_TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={`relative flex-1 py-3 text-md font-medium ${
              activeTab === tab.id ? 'text-primary-start' : 'text-text-main'
            }`}
          >
            {tab.label}
            {activeTab === tab.id && (
              <span className="absolute bottom-0 left-1/2 h-0.5 w-6 -translate-x-1/2 rounded-full bg-primary-start" />
            )}
          </button>
        ))}
      </div>

      <div className="p-4">
        {loading ? (
          <div className="space-y-4">
            <Skeleton className="h-48 w-full" />
            <Skeleton className="h-48 w-full" />
          </div>
        ) : activeTab === 'details' ? (
          <div className="space-y-3">
            {(product?.detail_images ?? []).length > 0 ? (
              product?.detail_images.map((image) => (
                <img
                  key={image}
                  src={resolveShopProductImageUrl(image)}
                  alt={product.name}
                  className="w-full rounded-lg"
                  referrerPolicy="no-referrer"
                />
              ))
            ) : (
              <div className="rounded-xl border border-border-light bg-bg-base p-4 text-sm leading-6 text-text-sub">
                {buildShopProductDescription(product)}
              </div>
            )}
          </div>
        ) : activeTab === 'params' ? (
          <div className="overflow-hidden rounded-lg border border-border-light">
            {parameterRows.map((item, index) => (
              <div
                key={`${item.name}-${index}`}
                className={`flex text-sm ${
                  index < parameterRows.length - 1 ? 'border-b border-border-light' : ''
                }`}
              >
                <div className="w-1/3 bg-bg-base p-2 text-text-sub">{item.name}</div>
                <div className="w-2/3 p-2 text-text-main">{item.value}</div>
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-4 text-base text-text-main">
            {serviceItems.map((item) => (
              <div key={item}>
                <h4 className="mb-1 flex items-center font-bold">
                  <ShieldCheck size={14} className="mr-1 text-primary-start" />
                  服务说明
                </h4>
                <p className="text-sm text-text-sub">{item}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
