import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'react-router-dom';
import { shopProductApi } from '../../api';
import { OfflineBanner } from '../../components/layout/OfflineBanner';
import { ErrorState } from '../../components/ui/ErrorState';
import { ProductDetailHeader } from '../../features/product-detail/components/ProductDetailHeader';
import { ProductOverviewSection } from '../../features/product-detail/components/ProductOverviewSection';
import { ProductPurchaseBar } from '../../features/product-detail/components/ProductPurchaseBar';
import { ProductReviewsSection } from '../../features/product-detail/components/ProductReviewsSection';
import { ProductSkuSheet } from '../../features/product-detail/components/ProductSkuSheet';
import { ProductTabsSection } from '../../features/product-detail/components/ProductTabsSection';
import type { ProductDetailTab, SkuMode } from '../../features/product-detail/types';
import {
  buildShopProductOptionGroups,
  buildShopProductPath,
  buildShopProductQaPath,
  buildShopProductReviewsPath,
  buildShopProductSelectedSummary,
} from '../../features/shop-product/utils';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useRequest } from '../../hooks/useRequest';
import { useAppNavigate } from '../../lib/navigation';

const EMPTY_REVIEW_SUMMARY = {
  follow_up_count: 0,
  good_rate: 100,
  preview: [],
  total: 0,
  with_media_count: 0,
};

export const ProductDetailPage = () => {
  const params = useParams();
  const { goBack, goTo, navigate } = useAppNavigate();
  const { isOffline, refreshStatus } = useNetworkStatus();

  const routeProductId = Number(params.id);
  const hasValidProductId = Number.isFinite(routeProductId) && routeProductId > 0;

  const [showSkuSheet, setShowSkuSheet] = useState(false);
  const [skuMode, setSkuMode] = useState<SkuMode>('select');
  const [quantity, setQuantity] = useState(1);
  const [activeTab, setActiveTab] = useState<ProductDetailTab>('details');
  const [isScrolled, setIsScrolled] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>({});

  const scrollRef = useRef<HTMLDivElement>(null);

  const fallbackProductRequest = useRequest(
    (signal) =>
      hasValidProductId
        ? Promise.resolve(null)
        : shopProductApi
            .latest({ limit: 1, page: 1 }, signal)
            .then((response) => response.list[0] ?? null),
    {
      deps: [hasValidProductId],
      initialData: null,
    },
  );

  const resolvedProductId = hasValidProductId ? routeProductId : fallbackProductRequest.data?.id ?? 0;

  useEffect(() => {
    if (!hasValidProductId && fallbackProductRequest.data?.id) {
      navigate(buildShopProductPath(fallbackProductRequest.data.id), { replace: true });
    }
  }, [fallbackProductRequest.data, hasValidProductId, navigate]);

  const productRequest = useRequest(
    (signal) =>
      resolvedProductId > 0 ? shopProductApi.detail(resolvedProductId, signal) : Promise.resolve(null),
    {
      deps: [resolvedProductId],
      initialData: null,
      keepPreviousData: true,
    },
  );

  const reviewSummaryRequest = useRequest(
    (signal) =>
      resolvedProductId > 0
        ? shopProductApi.reviewSummary(resolvedProductId, signal)
        : Promise.resolve(EMPTY_REVIEW_SUMMARY),
    {
      deps: [resolvedProductId],
      initialData: EMPTY_REVIEW_SUMMARY,
      keepPreviousData: true,
    },
  );

  const product = productRequest.data;
  const optionGroups = useMemo(() => buildShopProductOptionGroups(product), [product]);
  const selectedSummary = buildShopProductSelectedSummary(optionGroups, selectedOptions, quantity);

  useEffect(() => {
    setSelectedOptions((previous) => {
      const nextSelections: Record<string, string> = {};
      for (const group of optionGroups) {
        const previousValue = previous[group.name];
        nextSelections[group.name] = group.options.includes(previousValue)
          ? previousValue
          : group.options[0];
      }
      return nextSelections;
    });
  }, [optionGroups]);

  useEffect(() => {
    const currentRef = scrollRef.current;
    if (!currentRef) {
      return undefined;
    }

    const handleScroll = () => {
      setIsScrolled(currentRef.scrollTop > 100);
    };

    currentRef.addEventListener('scroll', handleScroll);
    return () => currentRef.removeEventListener('scroll', handleScroll);
  }, []);

  const openSkuSheet = (mode: SkuMode) => {
    setSkuMode(mode);
    setShowSkuSheet(true);
  };

  const closeSkuSheet = () => {
    setShowSkuSheet(false);
  };

  const handleAddToCart = () => {
    closeSkuSheet();
  };

  const handleBuyNow = () => {
    closeSkuSheet();
    goTo('checkout');
  };

  const isLoading =
    (productRequest.loading && !product) || (!hasValidProductId && fallbackProductRequest.loading);
  const hasBlockingError =
    !isLoading &&
    !product &&
    (Boolean(productRequest.error) || (!hasValidProductId && Boolean(fallbackProductRequest.error)));

  return (
    <div className="relative flex flex-1 flex-col overflow-hidden bg-bg-base">
      {isOffline && (
        <OfflineBanner
          onAction={refreshStatus}
          className="absolute left-0 right-0 top-0 z-50"
        />
      )}

      <ProductDetailHeader isScrolled={isScrolled} onBack={goBack} title={product?.name} />

      {hasBlockingError ? (
        <ErrorState
          message="商品详情加载失败"
          onRetry={() => {
            void Promise.allSettled([fallbackProductRequest.reload(), productRequest.reload()]);
          }}
        />
      ) : (
        <>
          <div ref={scrollRef} className="flex-1 overflow-y-auto pb-[60px]">
            <ProductOverviewSection
              loading={isLoading}
              onOpenServiceDescription={() => goTo('service_description')}
              onOpenSku={openSkuSheet}
              product={product}
              quantity={quantity}
              selectedSummary={selectedSummary}
            />
            <ProductReviewsSection
              loading={reviewSummaryRequest.loading && reviewSummaryRequest.data?.total === 0}
              moduleError={Boolean(reviewSummaryRequest.error)}
              onRetry={() => void reviewSummaryRequest.reload().catch(() => undefined)}
              onOpenReviews={() => goTo(buildShopProductReviewsPath(resolvedProductId))}
              onOpenQa={() => goTo(buildShopProductQaPath(resolvedProductId))}
              summary={reviewSummaryRequest.data}
            />
            <ProductTabsSection
              activeTab={activeTab}
              loading={isLoading}
              onChange={setActiveTab}
              product={product}
            />
          </div>

          <ProductPurchaseBar
            onOpenStore={() => goTo('store')}
            onOpenHelp={() => goTo('help_center')}
            onOpenCart={() => goTo('cart')}
            onAddToCart={() => openSkuSheet('cart')}
            onBuyNow={() => openSkuSheet('buy')}
          />

          <ProductSkuSheet
            isOpen={showSkuSheet}
            mode={skuMode}
            onAddToCart={handleAddToCart}
            onClose={closeSkuSheet}
            onConfirm={handleBuyNow}
            onDecreaseQuantity={() => setQuantity((previous) => Math.max(1, previous - 1))}
            onIncreaseQuantity={() => setQuantity((previous) => previous + 1)}
            onSelectOption={(groupName, option) =>
              setSelectedOptions((previous) => ({
                ...previous,
                [groupName]: option,
              }))
            }
            optionGroups={optionGroups}
            product={product}
            quantity={quantity}
            selectedOptions={selectedOptions}
          />
        </>
      )}
    </div>
  );
};
