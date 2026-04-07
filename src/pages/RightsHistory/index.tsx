/**
 * @file RightsHistory/index.tsx - 确权记录页面
 * @description 展示用户的确权操作历史记录列表。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import { FileText, Loader2 } from 'lucide-react';
import {
  rightsDeclarationApi,
  type RightsDeclarationRecord,
  type RightsDeclarationStatus,
} from '../../api';
import { getErrorMessage } from '../../api/core/errors';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { PullToRefreshContainer } from '../../components/ui/PullToRefreshContainer';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useRouteScrollRestoration } from '../../hooks/useRouteScrollRestoration';
import { useRequest } from '../../hooks/useRequest';
import { useAppNavigate } from '../../lib/navigation';

var PAGE_SIZE = 20;

var VOUCHER_TYPES: Record<string, string> = {
  other: '其他',
  screenshot: '截图凭证',
  transfer_record: '转账记录',
};

var STATUS_MAP: Record<
  RightsDeclarationStatus,
  { bg: string; color: string; text: string }
> = {
  approved: { text: '已通过', color: 'text-green-500', bg: 'bg-green-50 dark:bg-green-500/10' },
  cancelled: { text: '已取消', color: 'text-gray-500 dark:text-gray-400', bg: 'bg-gray-50 dark:bg-gray-500/10' },
  pending: { text: '审核中', color: 'text-orange-500', bg: 'bg-orange-50 dark:bg-orange-500/10' },
  rejected: { text: '已驳回', color: 'text-red-500', bg: 'bg-red-50 dark:bg-red-500/10' },
};

type HistoryFilter = 'all' | RightsDeclarationStatus;

var FILTER_OPTIONS: Array<{ label: string; value: HistoryFilter }> = [
  { label: '全部', value: 'all' },
  { label: '审核中', value: 'pending' },
  { label: '已通过', value: 'approved' },
  { label: '已驳回', value: 'rejected' },
  { label: '已取消', value: 'cancelled' },
];

function HistorySkeleton() {
  return (
    <div className="space-y-3 p-4">
      {[1, 2, 3].map(function (item) {
        return <Card key={item} className="h-28 animate-pulse rounded-2xl bg-white dark:bg-bg-card" />;
      })}
    </div>
  );
}

export function RightsHistoryPage() {
  var { goBack } = useAppNavigate();
  var [statusFilter, setStatusFilter] = useState<HistoryFilter>('all');
  var scrollContainerRef = useRef<HTMLDivElement | null>(null);
  var loadMoreRef = useRef<HTMLDivElement>(null);
  var [accRecords, setAccRecords] = useState<RightsDeclarationRecord[]>([]);
  var [currentPage, setCurrentPage] = useState(1);
  var [hasMore, setHasMore] = useState(false);
  var [loadingMore, setLoadingMore] = useState(false);

  var {
    data,
    error,
    loading,
    reload,
  } = useRequest(
    function (signal) {
      return rightsDeclarationApi.getList(
        {
          limit: PAGE_SIZE,
          page: 1,
          status: statusFilter === 'all' ? undefined : statusFilter,
        },
        { signal },
      );
    },
    {
      cacheKey: 'rights-declaration:list:' + statusFilter,
      deps: [statusFilter],
    },
  );

  useEffect(function () {
    var list = data?.list ?? [];
    setAccRecords(list);
    setCurrentPage(1);
    var total = data?.total ?? 0;
    setHasMore(list.length > 0 && list.length < total);
  }, [data]);

  useRouteScrollRestoration({
    containerRef: scrollContainerRef,
    namespace: 'rights-history-page',
    restoreDeps: [loading, statusFilter, accRecords.length],
    restoreWhen: !loading,
  });

  var loadMore = useCallback(function () {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    var nextPage = currentPage + 1;
    return rightsDeclarationApi.getList({
      limit: PAGE_SIZE,
      page: nextPage,
      status: statusFilter === 'all' ? undefined : statusFilter,
    })
      .then(function (result) {
        var newList = result?.list ?? [];
        setAccRecords(function (prev) { return prev.concat(newList); });
        setCurrentPage(nextPage);
        var total = result?.total ?? 0;
        setHasMore(newList.length >= PAGE_SIZE && (nextPage * PAGE_SIZE) < total);
      })
      .catch(function () { /* silent */ })
      .finally(function () { setLoadingMore(false); });
  }, [loadingMore, hasMore, currentPage, statusFilter]);

  useInfiniteScroll({
    hasMore: hasMore,
    loading: loadingMore || loading,
    onLoadMore: loadMore,
    targetRef: loadMoreRef,
  });

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#FDFBFB] dark:bg-bg-base">
      <PageHeader
        title="确权记录"
        onBack={goBack}
        className="border-b border-border-light bg-white/95 shadow-sm backdrop-blur-md dark:bg-bg-card/90"
        contentClassName="h-12 px-4"
      />

      <div className="z-10 shrink-0 border-b border-border-light bg-white px-4 py-3 dark:bg-bg-card">
        <div className="flex min-w-0 gap-2 overflow-x-auto overflow-y-hidden no-scrollbar overscroll-x-contain">
          {FILTER_OPTIONS.map(function (option) {
            var active = statusFilter === option.value;
            return (
              <button
                key={option.value}
                type="button"
                onClick={function () { setStatusFilter(option.value); }}
                className={'whitespace-nowrap rounded-full px-4 py-1.5 text-sm font-medium transition-colors ' + (
                  active
                    ? 'bg-gradient-to-r from-brand-start to-brand-end text-white shadow-sm'
                    : 'bg-gray-100 text-text-sub dark:bg-gray-800 dark:text-text-sub'
                )}
              >
                {option.label}
              </button>
            );
          })}
        </div>
      </div>

      <PullToRefreshContainer
        className="flex-1 overflow-y-auto"
        onRefresh={function () {
          return reload().catch(function () { return undefined; });
        }}
      >
        <div ref={scrollContainerRef} className="pb-8">
          {loading && !data ? <HistorySkeleton /> : null}

          {!loading && error && !data ? (
            <ErrorState
              message={getErrorMessage(error)}
              onRetry={function () {
                void reload().catch(function () { return undefined; });
              }}
            />
          ) : null}

          {!loading && !error && accRecords.length === 0 ? (
            <EmptyState icon={<FileText size={48} />} message="暂无确权记录" />
          ) : null}

          {accRecords.length > 0 ? (
            <div className="space-y-3 p-4">
              {accRecords.map(function (record) {
                var statusInfo = STATUS_MAP[record.status];
                return (
                  <Card
                    key={record.id}
                    className="rounded-2xl border border-border-light bg-white p-4 shadow-sm dark:bg-bg-card"
                  >
                    <div className="mb-2 flex items-start justify-between gap-3">
                      <div>
                        <div className="mb-1 flex items-center gap-2">
                          <span className="text-lg font-bold text-text-main">
                            {record.voucherTypeText || VOUCHER_TYPES[record.voucherType]}
                          </span>
                          <span className={statusInfo.bg + ' ' + statusInfo.color + ' rounded px-1.5 py-0.5 text-xs'}>
                            {record.statusText || statusInfo.text}
                          </span>
                        </div>
                        <div className="text-sm text-text-sub">{record.createTimeText}</div>
                        {record.reviewTimeText ? (
                          <div className="mt-1 text-xs text-text-aux">审核时间 {record.reviewTimeText}</div>
                        ) : null}
                      </div>
                      <div
                        className={'text-3xl font-bold ' + (
                          record.status === 'rejected' || record.status === 'cancelled'
                            ? 'text-text-main'
                            : 'text-red-500'
                        )}
                      >
                        ¥{record.amount.toLocaleString('zh-CN', { useGrouping: false })}
                      </div>
                    </div>

                    {record.reviewRemark ? (
                      <div className="mt-3 rounded-lg border-t border-border-light bg-gray-50 p-2 pt-3 text-base text-text-sub dark:bg-gray-800/50">
                        {record.reviewRemark}
                      </div>
                    ) : null}
                  </Card>
                );
              })}

              <div ref={loadMoreRef} className="py-3 text-center text-s">
                {loadingMore ? (
                  <span className="inline-flex items-center gap-1.5 text-text-sub">
                    <Loader2 size={14} className="animate-spin" /> 加载中...
                  </span>
                ) : hasMore ? (
                  <span className="text-text-aux">上滑加载更多</span>
                ) : (
                  <span className="text-text-aux">— 到底了 —</span>
                )}
              </div>
            </div>
          ) : null}
        </div>
      </PullToRefreshContainer>
    </div>
  );
}
