import { apiConfig } from '../../api/config';
import type {
  ShopProductDetail,
  ShopProductItem,
  ShopProductReview,
  ShopProductSkuSpec,
} from '../../api/modules/shopProduct';

type ProductPriceSource = Pick<
  ShopProductItem,
  'balance_available_amount' | 'green_power_amount' | 'price' | 'purchase_type' | 'score_price'
>;

export interface ShopProductOptionGroup {
  name: string;
  options: string[];
}

function toFiniteNumber(value: number | null | undefined): number {
  return Number.isFinite(value) ? Number(value) : 0;
}

function formatDecimalAmount(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 2,
    minimumFractionDigits: Number.isInteger(value) ? 0 : 2,
  }).format(value);
}

function formatIntegerAmount(value: number) {
  return new Intl.NumberFormat('zh-CN', {
    maximumFractionDigits: 0,
  }).format(value);
}

function withApiBase(pathname: string) {
  return new URL(pathname.replace(/^\/+/, ''), `${apiConfig.baseURL}/`).toString();
}

function readStringList(source: unknown): string[] {
  if (!Array.isArray(source)) {
    return [];
  }

  return source
    .map((item) => (typeof item === 'string' ? item.trim() : ''))
    .filter(Boolean);
}

export function buildShopProductPath(id: number | string) {
  return `/product/${id}`;
}

export function buildShopProductReviewsPath(id: number | string) {
  return `/product/${id}/reviews`;
}

export function buildShopProductQaPath(id: number | string) {
  return `/product/${id}/qa`;
}

export function buildShopProductSearchResultPath(keyword: string) {
  return `/search/result?keyword=${encodeURIComponent(keyword.trim())}`;
}

export function resolveShopProductImageUrl(url?: string | null) {
  const nextUrl = typeof url === 'string' ? url.trim() : '';
  if (!nextUrl) {
    return '';
  }

  if (/^https?:\/\//i.test(nextUrl)) {
    return nextUrl;
  }

  return withApiBase(nextUrl);
}

export function getShopProductPrimaryPrice(product: ProductPriceSource) {
  const price = toFiniteNumber(product.price);
  const greenPowerAmount = toFiniteNumber(product.green_power_amount);
  const balanceAvailableAmount = toFiniteNumber(product.balance_available_amount);
  const scorePrice = toFiniteNumber(product.score_price);

  if (price > 0) {
    return `¥${formatDecimalAmount(price)}`;
  }

  if (greenPowerAmount > 0) {
    return `绿色算力 ${formatDecimalAmount(greenPowerAmount)}`;
  }

  if (balanceAvailableAmount > 0) {
    return `余额 ${formatDecimalAmount(balanceAvailableAmount)}`;
  }

  if (scorePrice > 0) {
    return `消费金 ${formatIntegerAmount(scorePrice)}`;
  }

  if (product.purchase_type === 'score') {
    return '消费金待定';
  }

  return '价格待定';
}

export function getShopProductPriceCaption(product: ProductPriceSource) {
  const scorePrice = toFiniteNumber(product.score_price);
  const price = toFiniteNumber(product.price);
  const greenPowerAmount = toFiniteNumber(product.green_power_amount);
  const balanceAvailableAmount = toFiniteNumber(product.balance_available_amount);
  const captions: string[] = [];

  if (scorePrice > 0 && price > 0) {
    captions.push(`消费金 ${formatIntegerAmount(scorePrice)}`);
  }

  if (greenPowerAmount > 0 && price > 0) {
    captions.push(`绿色算力 ${formatDecimalAmount(greenPowerAmount)}`);
  }

  if (balanceAvailableAmount > 0 && price > 0) {
    captions.push(`余额 ${formatDecimalAmount(balanceAvailableAmount)}`);
  }

  return captions.join(' + ');
}

export function getShopProductPurchaseTag(product: ProductPriceSource) {
  if (product.purchase_type === 'score') {
    return '消费金兑换';
  }

  if (product.purchase_type === 'both') {
    return '组合支付';
  }

  return '现金购买';
}

export function getShopProductBadges(product: ShopProductItem) {
  const badges = [getShopProductPurchaseTag(product)];

  if (product.is_physical === '1') {
    badges.push('实物商品');
  }

  if (product.stock > 0) {
    badges.push('有货');
  }

  return badges;
}

export function formatShopProductSales(value?: number | null) {
  const sales = toFiniteNumber(value);
  if (sales >= 10000) {
    return `${formatDecimalAmount(sales / 10000)}万+`;
  }

  return `${formatIntegerAmount(sales)}`;
}

export function normalizeShopProductCategories(categories: string[] | undefined) {
  return (categories ?? [])
    .map((name) => name.trim())
    .filter(Boolean)
    .map((name) => ({
      id: name,
      name,
    }));
}

export function buildShopProductOptionGroups(product: ShopProductDetail | null | undefined) {
  if (!product?.sku_specs?.length) {
    return [];
  }

  return product.sku_specs.reduce<ShopProductOptionGroup[]>((groups, item: ShopProductSkuSpec) => {
    const name = item.name?.trim();
    const options = [
      ...readStringList(item.options),
      ...readStringList(item.values),
    ].filter((option, index, source) => source.indexOf(option) === index);

    if (!name || !options.length) {
      return groups;
    }

    groups.push({
      name,
      options,
    });
    return groups;
  }, []);
}

export function buildShopProductSelectedSummary(
  optionGroups: ShopProductOptionGroup[],
  selectedOptions: Record<string, string>,
  quantity: number,
) {
  const summary = optionGroups
    .map((group) => selectedOptions[group.name])
    .filter(Boolean);

  summary.push(`x${quantity}`);
  return summary.join(' / ');
}

export function buildShopProductDescription(product: ShopProductDetail | null | undefined) {
  const description = product?.description?.trim();
  if (description) {
    return description.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
  }

  return '暂无商品描述';
}

export function buildShopProductSpecs(product: ShopProductDetail | null | undefined) {
  return (product?.specs ?? []).filter((item) => item.name?.trim() && item.value?.trim());
}

export function buildShopProductServiceItems(product: ShopProductDetail | null | undefined) {
  const items: string[] = [];

  if (product?.delivery_info?.free_shipping) {
    items.push('包邮');
  }

  if (product?.delivery_info?.delivery_time) {
    items.push(product.delivery_info.delivery_time);
  }

  if (product?.delivery_info?.support_same_day) {
    items.push('支持当日达');
  }

  if (product?.after_sale?.return_policy) {
    items.push(product.after_sale.return_policy);
  }

  if (product?.after_sale?.exchange_policy) {
    items.push(product.after_sale.exchange_policy);
  }

  if (product?.after_sale?.warranty) {
    items.push(product.after_sale.warranty);
  }

  if (!items.length) {
    items.push('平台发货');
    items.push('售后保障');
  }

  return items;
}

export function getShopProductReviewUser(review: ShopProductReview) {
  return review.user?.trim() || '匿名用户';
}

export function getShopProductReviewImages(review: ShopProductReview) {
  return (review.images ?? [])
    .map((image) => resolveShopProductImageUrl(image))
    .filter(Boolean);
}
