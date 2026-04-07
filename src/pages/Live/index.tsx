/**
 * @file Live/index.tsx - 直播页面
 * @description 展示当前官方直播配置信息，点击进入直播观看页。
 */

import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Eye,
  Flame,
  HeadphonesIcon,
  Loader2,
  PlayCircle,
  RefreshCcw,
  WifiOff,
} from 'lucide-react';
import { liveVideoApi, type HotVideoItem } from '../../api';
import { getErrorMessage } from '../../api/core/errors';
import { PageHeader } from '../../components/layout/PageHeader';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useRequest } from '../../hooks/useRequest';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { useAppNavigate } from '../../lib/navigation';
import { useFeedback } from '../../components/ui/FeedbackProvider';
import { openCustomerServiceLink } from '../../lib/customerService';

var PAGE_SIZE = 10;

function formatDateTime(timestamp: number): string {
  if (!timestamp) {
    return '';
  }

  var ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  var date = new Date(ms);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  var year = date.getFullYear();
  var month = String(date.getMonth() + 1).padStart(2, '0');
  var day = String(date.getDate()).padStart(2, '0');
  var hours = String(date.getHours()).padStart(2, '0');
  var minutes = String(date.getMinutes()).padStart(2, '0');
  return year + '-' + month + '-' + day + ' ' + hours + ':' + minutes;
}

function formatViewCount(value: number): string {
  if (value >= 10000) {
    return (value / 10000).toFixed(1) + 'w';
  }
  return String(value);
}

/**
 * LivePage - 直播页面
 */
export var LivePage = function LivePage() {
  var { goBack, navigate } = useAppNavigate();
  var { showToast } = useFeedback();
  var [offline, setOffline] = useState(!navigator.onLine);
  var scrollRef = useRef<HTMLDivElement>(null);
  var loadMoreRef = useRef<HTMLDivElement>(null);
  var [accVideos, setAccVideos] = useState<HotVideoItem[]>([]);
  var [currentPage, setCurrentPage] = useState(1);
  var [hasMore, setHasMore] = useState(false);
  var [loadingMore, setLoadingMore] = useState(false);

  var handleOpenSupport = function () {
    void openCustomerServiceLink(function (opts) {
      showToast({ duration: opts.duration, message: opts.message, type: opts.type });
    });
  };

  var {
    data: hotVideoResult,
    error: hotVideoError,
    loading: hotVideoLoading,
    reload: reloadHotVideos,
  } = useRequest(function (signal) { return liveVideoApi.getHotVideoList({ page: 1, limit: PAGE_SIZE }, signal); }, {
    cacheKey: 'live-video:hot-list',
  });

  useEffect(function () {
    var list = hotVideoResult?.list ?? [];
    setAccVideos(list);
    setCurrentPage(1);
    var total = hotVideoResult?.total ?? 0;
    setHasMore(list.length > 0 && list.length < total);
  }, [hotVideoResult]);

  useEffect(function () {
    var handleOnline = function () { setOffline(false); };
    var handleOffline = function () { setOffline(true); };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return function () {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  var loadMore = useCallback(function () {
    if (loadingMore || !hasMore) return;
    setLoadingMore(true);
    var nextPage = currentPage + 1;
    return liveVideoApi.getHotVideoList({ page: nextPage, limit: PAGE_SIZE })
      .then(function (result) {
        var newList = result?.list ?? [];
        setAccVideos(function (prev) { return prev.concat(newList); });
        setCurrentPage(nextPage);
        var total = result?.total ?? 0;
        setHasMore(newList.length >= PAGE_SIZE && (nextPage * PAGE_SIZE) < total);
      })
      .catch(function () { /* silent */ })
      .finally(function () { setLoadingMore(false); });
  }, [loadingMore, hasMore, currentPage]);

  useInfiniteScroll({
    disabled: offline,
    hasMore: hasMore,
    loading: loadingMore || hotVideoLoading,
    onLoadMore: loadMore,
    rootRef: scrollRef,
    targetRef: loadMoreRef,
  });

  var handleOpenHotVideo = function (
    videoId: number,
    videoTitle: string,
    videoSummary: string,
    videoUrl: string,
  ) {
    if (videoId > 0) {
      navigate('/live/' + videoId);
      return;
    }

    if (!videoUrl) {
      return;
    }

    var params = new URLSearchParams({
      description: videoSummary || '',
      title: videoTitle || '',
      url: videoUrl || '',
    });
    navigate('/live/view?' + params.toString());
  };

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-[#fff4ec] dark:bg-gray-950">
      <PageHeader
        title="直播"
        onBack={goBack}
        offline={offline}
        onRefresh={function () {
          void reloadHotVideos().catch(function () { return undefined; });
        }}
        className="border-b border-border-light bg-white/90 shadow-sm backdrop-blur-md dark:bg-bg-card/90"
        contentClassName="h-12 px-4"
        rightAction={
          <button
            type="button"
            onClick={handleOpenSupport}
            className="text-text-sub active:opacity-70"
          >
            <HeadphonesIcon size={20} />
          </button>
        }
      />

      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 pb-8 pt-4">
        {hotVideoLoading && accVideos.length === 0 ? (
          <div className="space-y-4">
            {[0, 1, 2].map(function (item) {
              return <div key={item} className="h-16 animate-pulse rounded-2xl bg-white dark:bg-gray-900" />;
            })}
          </div>
        ) : null}

        {!hotVideoLoading && hotVideoError ? (
          <ErrorState
            message={getErrorMessage(hotVideoError)}
            onRetry={function () {
              void reloadHotVideos().catch(function () { return undefined; });
            }}
          />
        ) : null}

        {!hotVideoLoading && !hotVideoError ? (
          <div className="space-y-4">
            <section className="rounded-[24px] border border-white/70 bg-white/95 p-4 shadow-[0_12px_32px_rgba(143,80,31,0.08)] backdrop-blur dark:border-gray-700/60 dark:bg-gray-900/95 dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)]">
              <div className="mb-3 flex items-center justify-between">
                <h3 className="inline-flex items-center gap-2 text-base font-semibold text-text-main">
                  <Flame size={16} className="text-orange-500" />
                  热门视频
                </h3>
                <button
                  type="button"
                  onClick={function () {
                    void reloadHotVideos().catch(function () { return undefined; });
                  }}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-full border border-border-light text-text-sub active:bg-bg-base"
                >
                  <RefreshCcw size={14} />
                </button>
              </div>

              {accVideos.length === 0 ? (
                <EmptyState icon={<PlayCircle size={36} />} message="暂无热门视频" />
              ) : null}

              {accVideos.length > 0 ? (
                <div className="space-y-3">
                  {accVideos.map(function (item) {
                    var publishTimeText = formatDateTime(item.publishTime || item.createTime);
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={function () {
                          handleOpenHotVideo(item.id, item.title, item.summary, item.videoUrl);
                        }}
                        className="flex w-full items-center gap-3 rounded-2xl border border-border-light bg-bg-card p-3 text-left active:scale-[0.995]"
                      >
                        {item.coverImage ? (
                          <img
                            src={item.coverImage}
                            alt={item.title || '视频封面'}
                            className="h-16 w-24 shrink-0 rounded-xl object-cover"
                          />
                        ) : (
                          <div className="flex h-16 w-24 shrink-0 items-center justify-center rounded-xl bg-bg-base text-text-sub">
                            <PlayCircle size={22} />
                          </div>
                        )}

                        <div className="min-w-0 flex-1">
                          <div className="line-clamp-1 text-sm font-medium text-text-main">
                            {item.title || '未命名视频'}
                          </div>
                          <div className="mt-1 line-clamp-2 text-xs leading-5 text-text-sub">
                            {item.summary || '点击查看视频详情'}
                          </div>
                          <div className="mt-2 inline-flex items-center gap-3 text-s text-text-aux">
                            <span className="inline-flex items-center gap-1">
                              <Eye size={12} />
                              {formatViewCount(item.viewCount)}
                            </span>
                            {publishTimeText ? <span>{publishTimeText}</span> : null}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              ) : null}

              <div ref={loadMoreRef} className="pt-3 text-center text-s">
                {loadingMore ? (
                  <span className="inline-flex items-center gap-1.5 text-text-sub">
                    <Loader2 size={14} className="animate-spin" /> 加载中...
                  </span>
                ) : hasMore ? (
                  <span className="text-text-aux">上滑加载更多</span>
                ) : accVideos.length > 0 ? (
                  <span className="text-text-aux">— 到底了 —</span>
                ) : null}
              </div>
            </section>

            {offline ? (
              <div className="flex items-center rounded-[22px] border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-300">
                <WifiOff size={16} className="mr-2 shrink-0" />
                当前网络不可用，恢复网络后可继续打开直播。
              </div>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
};
