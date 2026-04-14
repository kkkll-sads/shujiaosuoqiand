import React, { useEffect, useRef, useState } from 'react';
import {
  AlertCircle,
  ArrowDownToLine,
  ArrowUpToLine,
  CheckCircle2,
  Coins,
  FileText,
  ShieldCheck,
  WifiOff,
  XCircle,
} from 'lucide-react';
import {
  balanceTreasureApi,
  type BalanceTreasureAccount,
  type BalanceTreasureDirection,
  type BalanceTreasureSummary,
} from '../../api';
import { getErrorMessage, isAbortError } from '../../api/core/errors';
import { WalletPageHeader } from '../../components/layout/WalletPageHeader';
import { Button } from '../../components/ui/Button';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useFeedback } from '../../components/ui/FeedbackProvider';
import { PullToRefreshContainer } from '../../components/ui/PullToRefreshContainer';
import { useAuthSession } from '../../hooks/useAuthSession';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useRouteScrollRestoration } from '../../hooks/useRouteScrollRestoration';
import { getBillingPath } from '../../lib/billing';
import { useAppNavigate } from '../../lib/navigation';

function formatMoney(value: number, fractionDigits = 2) {
  return value.toLocaleString('zh-CN', {
    maximumFractionDigits: fractionDigits,
    minimumFractionDigits: fractionDigits,
    useGrouping: false,
  });
}

function formatRate(value: number) {
  const percent = value * 100;
  const fractionDigits = percent >= 1 || percent === 0 ? 2 : 4;
  return `${percent.toFixed(fractionDigits)}%`;
}

function getModeLabel(value: BalanceTreasureDirection) {
  return value === 'in' ? '转入' : '转出';
}

export function BalanceTreasurePage() {
  const { goBack, goTo } = useAppNavigate();
  const { isAuthenticated } = useAuthSession();
  const { isOffline, refreshStatus } = useNetworkStatus();
  const { showConfirm, showToast } = useFeedback();

  const [summary, setSummary] = useState<BalanceTreasureSummary | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);
  const [selectedAccountType, setSelectedAccountType] = useState('');
  const [mode, setMode] = useState<BalanceTreasureDirection>('in');
  const [amount, setAmount] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);

  const loadSummary = async (signal?: AbortSignal) => {
    if (!isAuthenticated) {
      setSummary(null);
      setError(null);
      setIsLoading(false);
      setSelectedAccountType('');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await balanceTreasureApi.summary({ signal });
      setSummary(response);
      setSelectedAccountType((current) => {
        if (current && response.accounts.some((item) => item.accountType === current)) {
          return current;
        }
        return response.accounts[0]?.accountType ?? '';
      });
    } catch (nextError) {
      if (isAbortError(nextError)) {
        return;
      }

      setSummary(null);
      setSelectedAccountType('');
      setError(nextError instanceof Error ? nextError : new Error('加载余额宝信息失败'));
    } finally {
      if (!signal?.aborted) {
        setIsLoading(false);
      }
    }
  };

  useEffect(() => {
    const controller = new AbortController();
    void loadSummary(controller.signal);
    return () => controller.abort();
  }, [isAuthenticated]);

  const selectedAccount =
    summary?.accounts.find((item) => item.accountType === selectedAccountType) ?? summary?.accounts[0] ?? null;

  useEffect(() => {
    if (!selectedAccount) {
      return;
    }

    if (mode === 'in' && !selectedAccount.allowTransferIn && selectedAccount.allowTransferOut) {
      setMode('out');
    }
    if (mode === 'out' && !selectedAccount.allowTransferOut && selectedAccount.allowTransferIn) {
      setMode('in');
    }
  }, [mode, selectedAccount]);

  useRouteScrollRestoration({
    containerRef: scrollContainerRef,
    enabled: isAuthenticated,
    namespace: 'balance-treasure-page',
    restoreDeps: [isAuthenticated, isLoading, Boolean(error), selectedAccountType, mode],
    restoreWhen: isAuthenticated && !isLoading && !error,
  });

  const handleRefresh = async () => {
    refreshStatus();
    await loadSummary();
  };

  const handleGoHistory = () => {
    goTo(getBillingPath());
  };

  const handleAmountChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const nextValue = event.target.value;
    if (nextValue === '' || /^\d*\.?\d{0,2}$/.test(nextValue)) {
      setAmount(nextValue);
    }
  };

  const currentAvailable = mode === 'in' ? selectedAccount?.sourceBalance ?? 0 : selectedAccount?.totalBalance ?? 0;
  const currentMinAmount = mode === 'in' ? selectedAccount?.minTransferIn ?? 0 : selectedAccount?.minTransferOut ?? 0;
  const currentDailyLimit = mode === 'in' ? selectedAccount?.dailyInLimit ?? 0 : selectedAccount?.dailyOutLimit ?? 0;
  const currentTodayAmount = mode === 'in' ? selectedAccount?.todayInAmount ?? 0 : selectedAccount?.todayOutAmount ?? 0;
  const currentCountLimit = mode === 'in' ? selectedAccount?.dailyInCountLimit ?? 0 : selectedAccount?.dailyOutCountLimit ?? 0;
  const currentRemainingCount = mode === 'in' ? selectedAccount?.remainingInCount ?? null : selectedAccount?.remainingOutCount ?? null;
  const currentActionEnabled = mode === 'in' ? selectedAccount?.allowTransferIn ?? false : selectedAccount?.allowTransferOut ?? false;
  const numAmount = Number(amount);
  const isAmountExceed = numAmount > 0 && numAmount > currentAvailable;
  const isAmountTooLow = numAmount > 0 && currentMinAmount > 0 && numAmount < currentMinAmount;
  const willExceedDailyLimit =
    currentDailyLimit > 0 && numAmount > 0 && numAmount + currentTodayAmount > currentDailyLimit;
  const isNoCount = currentRemainingCount != null && currentRemainingCount <= 0;
  const canSubmit =
    Boolean(selectedAccount) &&
    currentActionEnabled &&
    !isOffline &&
    !isSubmitting &&
    Number.isFinite(numAmount) &&
    numAmount > 0 &&
    !isAmountExceed &&
    !isAmountTooLow &&
    !willExceedDailyLimit &&
    !isNoCount;

  const handleSelectAccount = (account: BalanceTreasureAccount) => {
    setSelectedAccountType(account.accountType);
    if (!account.allowTransferIn && account.allowTransferOut) {
      setMode('out');
    }
    if (!account.allowTransferOut && account.allowTransferIn) {
      setMode('in');
    }
  };

  const handleSelectAll = () => {
    setAmount(currentAvailable > 0 ? currentAvailable.toFixed(2) : '');
  };

  const handleSubmit = async () => {
    if (!selectedAccount || !canSubmit) {
      return;
    }

    const message =
      mode === 'in'
        ? `确认将 ¥${formatMoney(numAmount)} 从${selectedAccount.accountName}转入余额宝吗？`
        : `确认将 ¥${formatMoney(numAmount)} 从余额宝转出到${selectedAccount.accountName}吗？`;

    const confirmed = await showConfirm({
      title: `确认${getModeLabel(mode)}`,
      message,
      confirmText: `确认${getModeLabel(mode)}`,
      cancelText: '取消',
    });

    if (!confirmed) {
      return;
    }

    setIsSubmitting(true);
    try {
      const result = await balanceTreasureApi.submit({
        accountType: selectedAccount.accountType,
        direction: mode,
        amount: numAmount,
      });

      showToast({
        message:
          mode === 'in'
            ? `已转入 ¥${formatMoney(result.amount)} 至${summary?.title ?? '余额宝'}`
            : `已转出 ¥${formatMoney(result.amount)} 至${result.accountName}`,
        type: 'success',
        duration: 3000,
      });
      setAmount('');
      await loadSummary();
    } catch (nextError) {
      showToast({ message: getErrorMessage(nextError), type: 'error', duration: 3000 });
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderHeader = () => (
    <WalletPageHeader
      title="余额宝"
      onBack={goBack}
      action={{
        icon: FileText,
        label: '账单',
        onClick: handleGoHistory,
      }}
    />
  );

  const renderSkeleton = () => (
    <div className="space-y-4 p-4">
      <div className="h-32 rounded-2xl bg-white animate-pulse dark:bg-gray-800" />
      <div className="h-44 rounded-2xl bg-white animate-pulse dark:bg-gray-800" />
      <div className="h-56 rounded-2xl bg-white animate-pulse dark:bg-gray-800" />
    </div>
  );

  const renderOfflineBanner = () =>
    isOffline ? (
      <div className="flex items-center justify-between bg-orange-50 px-4 py-2 text-base text-orange-500 dark:bg-orange-500/15 dark:text-orange-300">
        <div className="flex items-center">
          <WifiOff size={14} className="mr-1.5 shrink-0" />
          <span>当前网络不可用，请检查网络设置</span>
        </div>
        <button
          type="button"
          onClick={() => {
            void handleRefresh();
          }}
          className="rounded bg-bg-card px-2 py-1 text-sm font-medium text-text-main shadow-soft"
        >
          刷新
        </button>
      </div>
    ) : null;

  const renderContent = () => {
    if (!isAuthenticated) {
      return (
        <EmptyState
          message="登录后才能查看余额宝"
          actionText="去登录"
          actionVariant="primary"
          onAction={() => goTo('login')}
        />
      );
    }

    if (isLoading && !summary) {
      return renderSkeleton();
    }

    if (error && !summary) {
      return <ErrorState message={getErrorMessage(error)} onRetry={() => void handleRefresh()} />;
    }

    if (!summary || summary.accounts.length === 0 || !selectedAccount) {
      return <EmptyState message="暂无可用余额宝账户" />;
    }

    return (
      <div className="space-y-4 p-4">
        <Card className="relative overflow-hidden border-none bg-gradient-to-br from-amber-100 via-white to-orange-50 p-5">
          <div className="pointer-events-none absolute -top-8 -right-8 h-28 w-28 rounded-full bg-amber-200/70 blur-2xl" />
          <div className="relative z-10">
            <div className="mb-1 flex items-center text-sm text-amber-900/70">
              <Coins size={14} className="mr-1.5" />
              <span>{summary.description || '支持灵活转入转出与按配置累计收益'}</span>
            </div>
            <div className="text-base text-text-sub">余额宝总额</div>
            <div className="mt-2 font-mono text-4xl font-bold text-text-main">¥{formatMoney(summary.totalBalance)}</div>
            <div className="mt-4 grid grid-cols-3 gap-2 border-t border-amber-200/80 pt-4">
              <div>
                <div className="text-xs text-text-sub">持有本金</div>
                <div className="mt-1 font-mono text-base font-semibold text-text-main">¥{formatMoney(summary.totalPrincipal)}</div>
              </div>
              <div>
                <div className="text-xs text-text-sub">累计收益</div>
                <div className="mt-1 font-mono text-base font-semibold text-orange-600">¥{formatMoney(summary.totalProfit)}</div>
              </div>
              <div>
                <div className="text-xs text-text-sub">预计日收益</div>
                <div className="mt-1 font-mono text-base font-semibold text-emerald-600">¥{formatMoney(summary.totalEstimatedDailyProfit)}</div>
              </div>
            </div>
          </div>
        </Card>

        <div className="space-y-3">
          <div className="px-1 text-sm font-medium text-text-main">选择账户仓位</div>
          {summary.accounts.map((account) => {
            const isActive = selectedAccount.accountType === account.accountType;
            return (
              <button
                key={account.accountType}
                type="button"
                onClick={() => handleSelectAccount(account)}
                className={`w-full rounded-2xl border text-left transition-all ${
                  isActive
                    ? 'border-amber-300 bg-amber-50/80 shadow-soft'
                    : 'border-border-light bg-white active:bg-gray-50 dark:border-gray-700 dark:bg-gray-800'
                }`}
              >
                <div className="p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-lg font-semibold text-text-main">{account.accountName}</div>
                      <div className="mt-1 text-sm text-text-sub">{account.productName}</div>
                    </div>
                    <div className="rounded-full bg-white/80 px-2 py-1 text-xs text-text-sub shadow-sm">
                      日收益率 {formatRate(account.dailyRate)}
                    </div>
                  </div>

                  <div className="mt-3 text-sm text-text-sub">{account.description}</div>

                  <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
                    <div className="rounded-xl bg-bg-hover px-3 py-2">
                      <div className="text-text-sub">账户余额</div>
                      <div className="mt-1 font-mono text-base font-semibold text-text-main">¥{formatMoney(account.sourceBalance)}</div>
                    </div>
                    <div className="rounded-xl bg-bg-hover px-3 py-2">
                      <div className="text-text-sub">余额宝持有</div>
                      <div className="mt-1 font-mono text-base font-semibold text-text-main">¥{formatMoney(account.totalBalance)}</div>
                    </div>
                    <div className="rounded-xl bg-bg-hover px-3 py-2">
                      <div className="text-text-sub">累计转入</div>
                      <div className="mt-1 font-mono text-base font-semibold text-text-main">¥{formatMoney(account.totalInAmount)}</div>
                    </div>
                    <div className="rounded-xl bg-bg-hover px-3 py-2">
                      <div className="text-text-sub">累计收益</div>
                      <div className="mt-1 font-mono text-base font-semibold text-orange-600">¥{formatMoney(account.totalProfitAmount)}</div>
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">
                    <span className={`rounded-full px-2.5 py-1 text-xs ${account.allowTransferIn ? 'bg-emerald-50 text-emerald-600' : 'bg-gray-100 text-gray-500'}`}>
                      {account.allowTransferIn ? '支持转入' : '暂停转入'}
                    </span>
                    <span className={`rounded-full px-2.5 py-1 text-xs ${account.allowTransferOut ? 'bg-blue-50 text-blue-600' : 'bg-gray-100 text-gray-500'}`}>
                      {account.allowTransferOut ? '支持转出' : '暂停转出'}
                    </span>
                  </div>
                </div>
              </button>
            );
          })}
        </div>

        <Card className="p-4">
          <div className="mb-4 flex rounded-full bg-bg-hover p-1">
            <button
              type="button"
              onClick={() => setMode('in')}
              disabled={!selectedAccount.allowTransferIn}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === 'in'
                  ? 'bg-white text-brand-red shadow-soft'
                  : 'text-text-sub'
              } ${!selectedAccount.allowTransferIn ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <span className="inline-flex items-center">
                <ArrowDownToLine size={14} className="mr-1.5" />
                转入余额宝
              </span>
            </button>
            <button
              type="button"
              onClick={() => setMode('out')}
              disabled={!selectedAccount.allowTransferOut}
              className={`flex-1 rounded-full px-4 py-2 text-sm font-medium transition ${
                mode === 'out'
                  ? 'bg-white text-brand-red shadow-soft'
                  : 'text-text-sub'
              } ${!selectedAccount.allowTransferOut ? 'cursor-not-allowed opacity-50' : ''}`}
            >
              <span className="inline-flex items-center">
                <ArrowUpToLine size={14} className="mr-1.5" />
                转出到原账户
              </span>
            </button>
          </div>

          <div className="mb-3">
            <div className="text-base font-medium text-text-main">
              {mode === 'in' ? `${selectedAccount.accountName}转入余额宝` : `余额宝转出到${selectedAccount.accountName}`}
            </div>
            <div className="mt-1 text-sm text-text-sub">
              {mode === 'in'
                ? `当前可转入余额 ¥${formatMoney(selectedAccount.sourceBalance)}`
                : `转出资金将回到${selectedAccount.accountName}，不可跨账户划转`}
            </div>
          </div>

          <div className={`mb-3 flex items-center border-b pb-2 transition-colors ${isAmountExceed ? 'border-red-500' : 'border-border-light'}`}>
            <span className="mr-2 text-5xl font-medium text-text-main">¥</span>
            <input
              type="text"
              inputMode="decimal"
              value={amount}
              onChange={handleAmountChange}
              placeholder={`请输入${getModeLabel(mode)}金额`}
              className="min-w-0 flex-1 bg-transparent text-5xl font-bold text-text-main outline-none placeholder:text-gray-300 dark:placeholder:text-gray-600 font-mono"
            />
            {amount ? (
              <button
                type="button"
                onClick={() => setAmount('')}
                className="mr-2 shrink-0 p-1 text-gray-300 hover:text-gray-400 dark:text-gray-600 dark:hover:text-gray-500"
              >
                <XCircle size={20} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleSelectAll}
              className="shrink-0 whitespace-nowrap border-l border-border-light pl-3 text-md font-medium text-brand-red active:opacity-70"
            >
              全部
            </button>
          </div>

          {!currentActionEnabled ? (
            <div className="mb-3 flex items-center text-sm text-red-500">
              <AlertCircle size={12} className="mr-1" />
              当前账户暂未开放{getModeLabel(mode)}
            </div>
          ) : null}

          {isAmountExceed ? (
            <div className="mb-3 flex items-center text-sm text-red-500">
              <AlertCircle size={12} className="mr-1" />
              输入金额超过可用额度
            </div>
          ) : null}

          {isAmountTooLow ? (
            <div className="mb-3 flex items-center text-sm text-red-500">
              <AlertCircle size={12} className="mr-1" />
              最低{getModeLabel(mode)}金额为 ¥{formatMoney(currentMinAmount)}
            </div>
          ) : null}

          {willExceedDailyLimit ? (
            <div className="mb-3 flex items-center text-sm text-red-500">
              <AlertCircle size={12} className="mr-1" />
              今日累计{getModeLabel(mode)}金额将超过日限额
            </div>
          ) : null}

          {isNoCount ? (
            <div className="mb-3 flex items-center text-sm text-red-500">
              <AlertCircle size={12} className="mr-1" />
              今日{getModeLabel(mode)}次数已达上限
            </div>
          ) : null}

          <div className="space-y-2 rounded-xl bg-bg-hover p-3">
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-sub">{mode === 'in' ? '可转入余额' : '可转出持有'}</span>
              <span className="font-mono text-text-main">¥{formatMoney(currentAvailable)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-sub">日收益率</span>
              <span className="font-medium text-text-main">{formatRate(selectedAccount.dailyRate)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-sub">预计日收益</span>
              <span className="font-mono text-emerald-600">¥{formatMoney(selectedAccount.estimatedDailyProfit)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-sub">今日已{getModeLabel(mode)}</span>
              <span className="font-mono text-text-main">¥{formatMoney(currentTodayAmount)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-text-sub">剩余次数</span>
              <span className="font-medium text-text-main">
                {currentRemainingCount == null ? '--' : currentRemainingCount} / {currentCountLimit || '--'}
              </span>
            </div>
            {currentDailyLimit > 0 ? (
              <div className="flex items-center justify-between text-sm">
                <span className="text-text-sub">日限额</span>
                <span className="font-mono text-text-main">¥{formatMoney(currentDailyLimit)}</span>
              </div>
            ) : null}
          </div>

          <Button
            className={`mt-4 h-12 w-full rounded-full text-xl font-medium ${
              canSubmit
                ? 'bg-gradient-to-r from-brand-start to-brand-end text-white shadow-md shadow-red-500/20 active:scale-[0.98]'
                : 'bg-gray-200 text-gray-400 dark:bg-gray-700 dark:text-gray-500'
            }`}
            disabled={!canSubmit}
            onClick={() => void handleSubmit()}
          >
            {isSubmitting ? '处理中...' : `确认${getModeLabel(mode)}`}
          </Button>
        </Card>

        <Card className="p-4">
          <div className="mb-3 flex items-center">
            <CheckCircle2 size={16} className="mr-2 text-emerald-500" />
            <h3 className="text-base font-medium text-text-main">使用说明</h3>
          </div>
          <div className="space-y-2 text-sm leading-6 text-text-sub">
            <p>1. 余额宝按账户独立持仓，专项金、可提现余额、拓展余额互不混用。</p>
            <p>2. 转出时资金自动回到对应原账户，不支持跨账户转出。</p>
            <p>3. 收益按后台配置的日收益率累计，实际以页面实时展示为准。</p>
          </div>
        </Card>

        <div className="flex items-start px-2 py-1">
          <ShieldCheck size={14} className="mr-1.5 mt-0.5 shrink-0 text-green-500" />
          <span className="text-sm leading-relaxed text-text-sub">
            为保证资金准确，转入转出前请核对账户与金额；若账户暂未开放对应操作，请联系管理员处理。
          </span>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex h-full flex-col bg-bg-hover dark:bg-gray-900">
      {renderHeader()}
      {renderOfflineBanner()}

      {isAuthenticated ? (
        <PullToRefreshContainer className="flex-1" onRefresh={handleRefresh} disabled={isSubmitting}>
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-6">
            {renderContent()}
          </div>
        </PullToRefreshContainer>
      ) : (
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto pb-6">
          {renderContent()}
        </div>
      )}
    </div>
  );
}

export default BalanceTreasurePage;
