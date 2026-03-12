import type { ShopProductPriceSource } from '../utils';
import { getShopProductPricePresentation } from '../utils';

interface ShopProductPriceDisplayProps {
  className?: string;
  product: ShopProductPriceSource;
  size?: 'card' | 'narrow';
}

function ScorePriceChip({
  amount,
  compact,
  prefixed,
}: {
  amount: string;
  compact: boolean;
  prefixed?: boolean;
}) {
  return (
    <span
      className={`inline-flex max-w-full items-center rounded-full border border-[#efb8ab] bg-[#fff4f0] text-[#d9482e] shadow-[inset_0_1px_0_rgba(255,255,255,0.88)] ${
        compact ? 'px-1.5 py-0.5' : 'px-2 py-0.75'
      }`}
    >
      {prefixed ? (
        <span className={`mr-1 font-semibold text-[#e06c54] ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
          +
        </span>
      ) : null}
      <span
        className={`mr-1 flex shrink-0 items-center justify-center rounded-full bg-[#ffe0d6] font-bold text-[#d53c22] ${
          compact ? 'h-3.5 w-3.5 text-[8px]' : 'h-4 w-4 text-[9px]'
        }`}
      >
        金
      </span>
      <span className={`tabular-nums font-semibold ${compact ? 'text-[10px]' : 'text-[11px]'}`}>
        {amount}
      </span>
      <span className={`ml-1 font-medium text-[#ef755c] ${compact ? 'text-[9px]' : 'text-[10px]'}`}>
        消费金
      </span>
    </span>
  );
}

function SecondaryLabel({
  children,
  compact,
}: {
  children: string;
  compact: boolean;
}) {
  return (
    <span
      className={`inline-flex items-center rounded-full border border-border-light bg-bg-base text-text-sub ${
        compact ? 'px-1.5 py-0.5 text-[10px]' : 'px-2 py-0.75 text-[11px]'
      }`}
    >
      {children}
    </span>
  );
}

export const ShopProductPriceDisplay = ({
  className = '',
  product,
  size = 'card',
}: ShopProductPriceDisplayProps) => {
  const presentation = getShopProductPricePresentation(product);
  const compact = size === 'narrow';
  const moneyClass = compact ? 'text-lg' : 'text-xl';

  if (presentation.mode === 'mixed' && presentation.moneyText && presentation.scoreText) {
    return (
      <div className={`flex flex-col items-start gap-1 ${className}`}>
        <span
          className={`${moneyClass} tabular-nums font-bold leading-none tracking-[-0.02em] text-primary-start`}
        >
          {presentation.moneyText}
        </span>
        <ScorePriceChip amount={presentation.scoreText} compact={compact} prefixed />
      </div>
    );
  }

  if (presentation.mode === 'score' && presentation.scoreText) {
    return (
      <div className={`flex items-center ${className}`}>
        <ScorePriceChip amount={presentation.scoreText} compact={compact} />
      </div>
    );
  }

  if (presentation.mode === 'money' && presentation.moneyText) {
    return (
      <div className={className}>
        <span
          className={`${moneyClass} tabular-nums font-bold leading-none tracking-[-0.02em] text-primary-start`}
        >
          {presentation.moneyText}
        </span>
      </div>
    );
  }

  if (presentation.mode === 'green_power' && presentation.greenPowerText) {
    return (
      <div className={className}>
        <SecondaryLabel compact={compact}>{presentation.greenPowerText}</SecondaryLabel>
      </div>
    );
  }

  if (presentation.mode === 'balance' && presentation.balanceText) {
    return (
      <div className={className}>
        <SecondaryLabel compact={compact}>{presentation.balanceText}</SecondaryLabel>
      </div>
    );
  }

  return (
    <div className={className}>
      <span className={`${compact ? 'text-sm' : 'text-base'} font-medium leading-none text-text-sub`}>
        {presentation.primaryText}
      </span>
    </div>
  );
};
