/**
 * @file LiveWebView/index.tsx - 直播/视频观看页面
 * @description iframe 或 video 播放，热门视频详情、评论、分享；深浅色与全局字号随主题与 data-font-scale。
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { SyntheticEvent } from 'react';
import { useParams, useSearchParams } from 'react-router-dom';
import {
  ChevronLeft,
  Eye,
  Heart,
  Loader2,
  MessageSquare,
  Play,
  RefreshCcw,
  Share2,
} from 'lucide-react';
import { liveVideoApi, type HotVideoCommentItem } from '../../api';
import { getErrorMessage } from '../../api/core/errors';
import { OfflineBanner } from '../../components/layout/OfflineBanner';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useRequest } from '../../hooks/useRequest';
import { useInfiniteScroll } from '../../hooks/useInfiniteScroll';
import { copyToClipboard } from '../../lib/clipboard';
import { useAppNavigate } from '../../lib/navigation';
import { useFeedback } from '../../components/ui/FeedbackProvider';
import { useAuthSession } from '../../hooks/useAuthSession';

/** 评论头像加载失败或无地址时的兜底（对应 public/img/launch-logo.jpg → 构建后 dist/img/launch-logo.jpg） */
function getCommentAvatarFallbackUrl(): string {
  const base = import.meta.env.BASE_URL || '/';
  const prefix = base.endsWith('/') ? base : `${base}/`;
  return `${prefix}img/launch-logo.jpg`;
}

const COMMENT_AVATAR_FALLBACK = getCommentAvatarFallbackUrl();

function handleCommentAvatarError(event: SyntheticEvent<HTMLImageElement>) {
  const img = event.currentTarget;
  if (img.getAttribute('data-avatar-fallback') === '1') {
    return;
  }
  img.setAttribute('data-avatar-fallback', '1');
  img.src = COMMENT_AVATAR_FALLBACK;
}

/** 判断 URL 是否为媒体文件地址 */
function looksLikeMediaUrl(url: string): boolean {
  return /\.(m3u8|mp4|webm|ogg|mov|mpd)(\?|$)/i.test(url);
}

interface PlayerConfig {
  description: string;
  title: string;
  videoUrl: string;
  coverImage?: string;
  viewCount?: number;
  publishTime?: number;
}

interface LiveCommentItem {
  id: string;
  /** 接口评论 id，本地缓存评论无此字段 */
  remoteId?: number;
  nickname: string;
  avatar?: string;
  content: string;
  createdAt: number;
  userLevel?: number;
  userLevelText?: string;
  agentLevel?: number;
  agentLevelText?: string;
  likeCount?: number;
  isLiked?: boolean;
}

function formatCommentTime(timestamp: number): string {
  const ms = timestamp < 10000000000 ? timestamp * 1000 : timestamp;
  const date = new Date(ms);
  if (Number.isNaN(date.getTime())) {
    return '';
  }

  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hour = String(date.getHours()).padStart(2, '0');
  const minute = String(date.getMinutes()).padStart(2, '0');
  return `${month}-${day} ${hour}:${minute}`;
}

/** 详情发布时间展示（秒级时间戳） */
function formatPublishDate(timestamp: number): string {
  const sec = timestamp < 10000000000 ? timestamp : Math.floor(timestamp / 1000);
  const date = new Date(sec * 1000);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  const h = String(date.getHours()).padStart(2, '0');
  const min = String(date.getMinutes()).padStart(2, '0');
  return `${y}-${m}-${d} ${h}:${min}`;
}

/**
 * LiveWebViewPage - 直播观看页
 */
export const LiveWebViewPage = () => {
  const { goBack, goTo } = useAppNavigate();
  const { showToast } = useFeedback();
  const { isAuthenticated } = useAuthSession();
  const { id: routeIdParam } = useParams();
  const [searchParams] = useSearchParams();
  const [offline, setOffline] = useState(!navigator.onLine);
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [metadataReady, setMetadataReady] = useState(false);
  const [playerError, setPlayerError] = useState('');
  const [playerKey, setPlayerKey] = useState(0);
  const [commentText, setCommentText] = useState('');
  const [submittingComment, setSubmittingComment] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [videoLike, setVideoLike] = useState({ count: 0, liked: false });
  const [likingVideo, setLikingVideo] = useState(false);
  const [commentLikeMap, setCommentLikeMap] = useState<
    Record<number, { count: number; liked: boolean }>
  >({});
  const [likingCommentId, setLikingCommentId] = useState<number | null>(null);
  /** 视频原始宽高比，用于播放器容器自适应横屏/竖屏等比例 */
  const [videoNaturalSize, setVideoNaturalSize] = useState<{ w: number; h: number } | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const scrollAreaRef = useRef<HTMLDivElement | null>(null);
  const loadMoreCommentRef = useRef<HTMLDivElement>(null);
  var [accComments, setAccComments] = useState<HotVideoCommentItem[]>([]);
  var [commentPage, setCommentPage] = useState(1);
  var [commentHasMore, setCommentHasMore] = useState(false);
  var [commentLoadingMore, setCommentLoadingMore] = useState(false);

  const routeId = Number(routeIdParam?.trim() ?? '');
  const hasRouteIdParam = typeof routeIdParam === 'string' && routeIdParam.trim().length > 0;
  const hasRouteId = Number.isFinite(routeId) && routeId > 0;
  const queryIdRaw = searchParams.get('id')?.trim() ?? '';
  const queryId = Number(queryIdRaw);
  const videoId = hasRouteId ? routeId : queryId;
  const hasVideoId = Number.isFinite(videoId) && videoId > 0;
  const hasInvalidRouteId = hasRouteIdParam && !hasRouteId;
  const queryUrl = searchParams.get('url')?.trim() ?? '';
  const queryTitle = searchParams.get('title')?.trim() ?? '';
  const queryDescription = searchParams.get('description')?.trim() ?? '';
  const hasQueryConfig = queryUrl.length > 0;
  const useQueryConfigOnly = !hasVideoId && !hasInvalidRouteId && hasQueryConfig;

  const {
    data,
    error,
    loading,
    reload,
  } = useRequest((signal) => liveVideoApi.getConfig(signal), {
    cacheKey: 'live-video:config',
    manual: useQueryConfigOnly || hasVideoId || hasInvalidRouteId,
  });
  const {
    data: hotVideoDetail,
    error: detailError,
    loading: detailLoading,
    reload: reloadDetail,
  } = useRequest((signal) => liveVideoApi.getHotVideoDetail(videoId, signal), {
    cacheKey: `live-video:detail:${videoId}`,
    manual: !hasVideoId,
  });
  const {
    data: hotVideoCommentResult,
    error: commentError,
    loading: commentLoading,
    reload: reloadCommentList,
  } = useRequest(
    (signal) => liveVideoApi.getHotVideoCommentList({ id: videoId, page: 1, limit: 10 }, signal),
    {
      cacheKey: `live-video:comments:${videoId}`,
      manual: !hasVideoId,
    },
  );

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  useEffect(() => {
    if (!hasVideoId || !hotVideoDetail?.video) {
      setVideoLike({ count: 0, liked: false });
      return;
    }
    const v = hotVideoDetail.video;
    setVideoLike({ count: v.likeCount, liked: v.isLiked });
  }, [hasVideoId, hotVideoDetail?.video?.id, hotVideoDetail?.video?.likeCount, hotVideoDetail?.video?.isLiked]);

  useEffect(function () {
    var list = hotVideoCommentResult?.list ?? [];
    setAccComments(list);
    setCommentPage(1);
    var total = hotVideoCommentResult?.total ?? 0;
    setCommentHasMore(list.length > 0 && list.length < total);
    var next: Record<number, { count: number; liked: boolean }> = {};
    for (var i = 0; i < list.length; i += 1) {
      var c = list[i];
      next[c.id] = { count: c.likeCount, liked: c.isLiked };
    }
    setCommentLikeMap(next);
  }, [hotVideoCommentResult]);

  var COMMENT_PAGE_SIZE = 10;

  var loadMoreComments = useCallback(function () {
    if (commentLoadingMore || !commentHasMore || !hasVideoId) return;
    setCommentLoadingMore(true);
    var nextPage = commentPage + 1;
    return liveVideoApi.getHotVideoCommentList({ id: videoId, page: nextPage, limit: COMMENT_PAGE_SIZE })
      .then(function (result) {
        var newList = result?.list ?? [];
        setAccComments(function (prev) { return prev.concat(newList); });
        setCommentPage(nextPage);
        setCommentLikeMap(function (prev) {
          var merged: Record<number, { count: number; liked: boolean }> = {};
          var keys = Object.keys(prev);
          for (var k = 0; k < keys.length; k++) {
            var key = Number(keys[k]);
            merged[key] = prev[key];
          }
          for (var j = 0; j < newList.length; j++) {
            var item = newList[j];
            if (!(item.id in merged)) {
              merged[item.id] = { count: item.likeCount, liked: item.isLiked };
            }
          }
          return merged;
        });
        var totalLoaded = commentPage * COMMENT_PAGE_SIZE + newList.length;
        var total = result?.total ?? 0;
        setCommentHasMore(newList.length >= COMMENT_PAGE_SIZE && totalLoaded < total);
      })
      .catch(function () { /* silent */ })
      .finally(function () { setCommentLoadingMore(false); });
  }, [commentLoadingMore, commentHasMore, commentPage, hasVideoId, videoId]);

  useInfiniteScroll({
    disabled: !hasVideoId,
    hasMore: commentHasMore,
    loading: commentLoadingMore || commentLoading,
    onLoadMore: loadMoreComments,
    rootRef: scrollAreaRef,
    targetRef: loadMoreCommentRef,
  });

  const requireLoginForLike = (): boolean => {
    if (isAuthenticated) {
      return true;
    }
    showToast({ message: '请先登录后再点赞', type: 'warning' });
    goTo('login');
    return false;
  };

  const config: PlayerConfig = useMemo(
    () =>
      hasVideoId && hotVideoDetail?.video
        ? {
            description: hotVideoDetail.video.summary,
            title: hotVideoDetail.video.title,
            videoUrl: hotVideoDetail.video.videoUrl,
            coverImage: hotVideoDetail.video.coverImage || undefined,
            viewCount: hotVideoDetail.video.viewCount,
            publishTime: hotVideoDetail.video.publishTime,
          }
        : hasQueryConfig
        ? {
            description: queryDescription,
            title: queryTitle,
            videoUrl: queryUrl,
          }
        : {
            description: data?.description ?? '',
            title: data?.title ?? '',
            videoUrl: data?.videoUrl ?? '',
          },
    [data, hasQueryConfig, hasVideoId, hotVideoDetail, queryDescription, queryTitle, queryUrl],
  );

  const title = config.title.trim() || '直播详情';
  const description = config.description.trim();
  const playerUrl = config.videoUrl;
  const isMediaUrl = looksLikeMediaUrl(playerUrl);
  const invalidRouteError = hasInvalidRouteId ? new Error('视频链接无效') : null;
  const activeLoading = hasVideoId ? detailLoading : loading && !useQueryConfigOnly && !hasInvalidRouteId;
  const activeError = invalidRouteError ?? (hasVideoId ? detailError : useQueryConfigOnly ? null : error);
  const showBottomActions = !activeLoading && !activeError && Boolean(playerUrl) && !playerError;
  /** 仅带视频 id 时展示评论列表与发表（走接口，无本地假数据） */
  const showCommentBar = showBottomActions && hasVideoId;
  var remoteComments = accComments.map(function (item) {
    var likeState = commentLikeMap[item.id];
    return {
      id: 'remote:' + item.id,
      remoteId: item.id,
      nickname: item.nickname,
      avatar: item.avatar || undefined,
      content: item.content,
      createdAt: item.createTime,
      userLevel: item.userLevel,
      userLevelText: item.userLevelText,
      agentLevel: item.agentLevel,
      agentLevelText: item.agentLevelText,
      likeCount: likeState ? likeState.count : item.likeCount,
      isLiked: likeState ? likeState.liked : item.isLiked,
    };
  });
  var comments = remoteComments;
  const commentTotal = hasVideoId ? hotVideoCommentResult?.total ?? comments.length : 0;
  const viewCountText =
    typeof config.viewCount === 'number' && config.viewCount >= 0 ? `${config.viewCount} 次播放` : null;
  const publishText =
    config.publishTime && config.publishTime > 0 ? formatPublishDate(config.publishTime) : null;

  useEffect(() => {
    setMediaLoaded(false);
    setMetadataReady(false);
    setVideoNaturalSize(null);
    setPlayerError('');
    setPlayerKey(0);
    setIsPlaying(false);
  }, [playerUrl]);

  const videoPlayerShellStyle = useMemo(() => {
    const maxH = '85vh';
    if (videoNaturalSize && videoNaturalSize.w > 0 && videoNaturalSize.h > 0) {
      return {
        aspectRatio: `${videoNaturalSize.w} / ${videoNaturalSize.h}`,
        maxHeight: maxH,
      } as const;
    }
    return {
      aspectRatio: '16 / 9',
      maxHeight: maxH,
    } as const;
  }, [videoNaturalSize]);

  useEffect(() => {
    setCommentText('');
  }, [hasVideoId, videoId]);

  const buildShareUrl = (): string | null => {
    if (!playerUrl) {
      return null;
    }

    if (hasVideoId) {
      return `${window.location.origin}${window.location.pathname}${window.location.search}#/live/${videoId}`;
    }

    const params = new URLSearchParams();
    params.set('title', title);
    params.set('description', description);
    params.set('url', playerUrl);
    return `${window.location.origin}${window.location.pathname}${window.location.search}#/live/view?${params.toString()}`;
  };

  const handleShare = async () => {
    const shareUrl = buildShareUrl();
    if (!shareUrl) {
      showToast({ message: '当前暂无可分享的内容', type: 'warning' });
      return;
    }

    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({ title, text: title, url: shareUrl });
        showToast({ message: '分享已唤起', type: 'success' });
        return;
      } catch (err: unknown) {
        const name = err && typeof err === 'object' && 'name' in err ? String((err as { name: string }).name) : '';
        if (name === 'AbortError') {
          return;
        }
      }
    }

    const ok = await copyToClipboard(shareUrl);
    showToast({
      message: ok ? '链接已复制，可粘贴分享' : '复制失败，请稍后重试',
      type: ok ? 'success' : 'error',
    });
  };

  const handleRefresh = () => {
    setMediaLoaded(false);
    setMetadataReady(false);
    setVideoNaturalSize(null);
    setPlayerError('');
    setPlayerKey((current) => current + 1);
    if (hasVideoId) {
      void Promise.allSettled([reloadDetail(), reloadCommentList()]);
      return;
    }
    if (!useQueryConfigOnly) {
      void reload().catch(() => undefined);
    }
  };

  const handleSubmitComment = () => {
    const content = commentText.trim();
    if (!content) {
      showToast({ message: '请输入评论内容', type: 'warning' });
      return;
    }
    if (content.length > 300) {
      showToast({ message: '评论内容最多300字', type: 'warning' });
      return;
    }

    if (!playerUrl) {
      showToast({ message: '当前无可评论的视频', type: 'warning' });
      return;
    }

    if (!hasVideoId) {
      showToast({ message: '请从热门视频进入后再发表评论', type: 'warning' });
      return;
    }

    setSubmittingComment(true);
    void liveVideoApi
      .submitHotVideoComment({ id: videoId, content })
      .then(() => {
        setCommentText('');
        showToast({ message: '评论发布成功', type: 'success' });
        return reloadCommentList();
      })
      .catch((submitError: unknown) => {
        showToast({ message: getErrorMessage(submitError), type: 'error' });
      })
      .finally(() => {
        setSubmittingComment(false);
      });
  };

  const toggleVideoPlay = () => {
    const el = videoRef.current;
    if (!el) {
      return;
    }
    if (isPlaying) {
      el.pause();
    } else {
      void el.play().catch(() => undefined);
    }
  };

  const handleVideoLike = () => {
    if (!hasVideoId) {
      return;
    }
    if (!requireLoginForLike()) {
      return;
    }
    if (likingVideo) {
      return;
    }
    const action = videoLike.liked ? 'unlike' : 'like';
    setLikingVideo(true);
    void liveVideoApi
      .likeHotVideo({ id: videoId, action })
      .then((result) => {
        setVideoLike({ count: result.likeCount, liked: result.isLiked });
      })
      .catch((err: unknown) => {
        showToast({ message: getErrorMessage(err), type: 'error' });
      })
      .finally(() => {
        setLikingVideo(false);
      });
  };

  const handleCommentLike = (remoteId: number) => {
    if (!hasVideoId) {
      return;
    }
    if (!requireLoginForLike()) {
      return;
    }
    if (likingCommentId != null) {
      return;
    }
    const fromMap = commentLikeMap[remoteId];
    const fromList = hotVideoCommentResult?.list?.find((c) => c.id === remoteId);
    const liked = fromMap ? fromMap.liked : Boolean(fromList?.isLiked);
    const action = liked ? 'unlike' : 'like';
    setLikingCommentId(remoteId);
    void liveVideoApi
      .likeHotVideoComment({ commentId: remoteId, action })
      .then((result) => {
        setCommentLikeMap((prev) => ({
          ...prev,
          [remoteId]: { count: result.likeCount, liked: result.isLiked },
        }));
      })
      .catch((err: unknown) => {
        showToast({ message: getErrorMessage(err), type: 'error' });
      })
      .finally(() => {
        setLikingCommentId(null);
      });
  };

  const headerWrapClass =
    'sticky top-0 z-40 shrink-0 border-b pt-safe backdrop-blur-md ' +
    'border-border-light bg-bg-card/90 text-text-main dark:border-white/5 dark:bg-black/80 dark:text-white';
  const headerBarClass = 'flex h-12 items-center px-4';

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-bg-base text-text-main dark:bg-[#0A0B0E] dark:text-white">
      {offline ? (
        <OfflineBanner onAction={handleRefresh} className="dark:bg-red-900/20" />
      ) : null}

      <div className={headerWrapClass}>
        <div className={headerBarClass}>
          <button
            type="button"
            onClick={goBack}
            className="-ml-1 p-1 text-text-sub active:opacity-70 dark:text-white/60 dark:active:text-white"
            aria-label="返回"
          >
            <ChevronLeft size={24} />
          </button>
          <h1 className="min-w-0 flex-1 truncate px-3 text-center text-lg font-bold">{title}</h1>
          <div className="flex shrink-0 items-center justify-end gap-0.5">
            {showBottomActions ? (
              <button
                type="button"
                onClick={handleRefresh}
                className="p-2 text-text-sub active:opacity-70 dark:text-white/60 dark:active:text-white"
                aria-label="刷新"
              >
                <RefreshCcw size={20} />
              </button>
            ) : null}
            <button
              type="button"
              onClick={() => void handleShare()}
              className="p-2 text-text-sub active:opacity-70 dark:text-white/60 dark:active:text-white"
              aria-label="分享"
            >
              <Share2 size={20} />
            </button>
          </div>
        </div>
      </div>

      <div
        ref={scrollAreaRef}
        className={'min-h-0 flex-1 overflow-y-auto no-scrollbar ' + (showCommentBar ? 'pb-24' : 'pb-8')}
      >
        {activeLoading ? (
          <div className="space-y-4 px-4 pt-4">
            <div className="aspect-video animate-pulse rounded-2xl bg-bg-skeleton dark:bg-white/10" />
            <div className="h-24 animate-pulse rounded-2xl bg-bg-skeleton dark:bg-white/10" />
          </div>
        ) : null}

        {!activeLoading && activeError ? (
          <div className="px-4 pt-4">
            <ErrorState
              message={getErrorMessage(activeError)}
              onRetry={() => {
                if (hasVideoId) {
                  void reloadDetail().catch(() => undefined);
                  return;
                }
                if (!useQueryConfigOnly) {
                  void reload().catch(() => undefined);
                }
              }}
            />
          </div>
        ) : null}

        {!activeLoading && !activeError && !playerUrl ? (
          <div className="px-4 pt-4">
            <EmptyState
              icon={<Play size={48} className="text-text-aux" />}
              message="当前暂无可播放的地址"
              actionText="重新加载"
              onAction={() => {
                if (hasVideoId) {
                  void reloadDetail().catch(() => undefined);
                  return;
                }
                if (!useQueryConfigOnly) {
                  void reload().catch(() => undefined);
                }
              }}
            />
          </div>
        ) : null}

        {!activeLoading && !activeError && playerUrl && !playerError ? (
          <div>
            <div
              className="relative mx-auto w-full max-w-full bg-black"
              style={videoPlayerShellStyle}
            >
              {isMediaUrl && !mediaLoaded && !metadataReady ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 text-white">
                  <RefreshCcw size={22} className="mb-2 animate-spin" />
                  <span className="text-sm">内容加载中...</span>
                </div>
              ) : null}

              {!isMediaUrl && !mediaLoaded ? (
                <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-black/60 text-white">
                  <RefreshCcw size={22} className="mb-2 animate-spin" />
                  <span className="text-sm">内容加载中...</span>
                </div>
              ) : null}

              {isMediaUrl ? (
                <video
                  ref={videoRef}
                  key={`${playerKey}:${playerUrl}`}
                  src={playerUrl}
                  poster={config.coverImage}
                  controls
                  autoPlay
                  playsInline
                  preload="auto"
                  className="h-full w-full object-contain"
                  onLoadedMetadata={(event) => {
                    setMetadataReady(true);
                    const el = event.currentTarget;
                    if (el.videoWidth > 0 && el.videoHeight > 0) {
                      setVideoNaturalSize({ w: el.videoWidth, h: el.videoHeight });
                    }
                  }}
                  onLoadedData={() => setMediaLoaded(true)}
                  onCanPlay={() => setMediaLoaded(true)}
                  onPlay={() => {
                    setIsPlaying(true);
                    setMediaLoaded(true);
                  }}
                  onPause={() => setIsPlaying(false)}
                  onError={() => setPlayerError('视频加载失败，请稍后重试')}
                />
              ) : (
                <iframe
                  key={`${playerKey}:${playerUrl}`}
                  src={playerUrl}
                  title={title}
                  className="aspect-video h-full max-h-[85vh] min-h-[200px] w-full border-0 bg-white dark:bg-gray-950"
                  referrerPolicy="no-referrer"
                  allow="autoplay; clipboard-write; encrypted-media; picture-in-picture; fullscreen"
                  onLoad={() => setMediaLoaded(true)}
                />
              )}

              {isMediaUrl && !isPlaying && metadataReady && !mediaLoaded ? (
                <button
                  type="button"
                  className="absolute inset-0 z-10 flex cursor-pointer items-center justify-center bg-black/20"
                  onClick={toggleVideoPlay}
                  aria-label="播放"
                >
                  <span className="flex h-16 w-16 items-center justify-center rounded-full border border-white/30 bg-white/20 shadow-xl backdrop-blur-md">
                    <Play size={32} fill="white" className="ml-1 text-white" />
                  </span>
                </button>
              ) : null}

              {isMediaUrl && mediaLoaded ? (
                <div className="absolute bottom-0 left-0 right-0 z-20 flex items-center justify-between bg-gradient-to-t from-black/70 to-transparent px-3 pb-2 pt-5 text-white">
                  <span className="inline-flex items-center gap-1.5 text-xs">
                    <span
                      className={`h-2 w-2 rounded-full ${
                        isPlaying ? 'bg-emerald-400 animate-pulse' : 'bg-white/50'
                      }`}
                    />
                    {isPlaying ? '播放中' : '已暂停'}
                  </span>
                  <span className="text-2xs text-white/50">{isMediaUrl ? '视频' : '直播'}</span>
                </div>
              ) : null}
            </div>

            <div className="border-b border-border-light px-4 py-4 dark:border-white/5">
              <h2 className="mb-2 text-xl font-bold">{title}</h2>
              <div className="mb-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-s text-text-aux dark:text-white/40">
                {viewCountText ? (
                  <span className="inline-flex items-center">
                    <Eye size={14} className="mr-1 shrink-0" />
                    {viewCountText}
                  </span>
                ) : null}
                {publishText ? <span>{publishText}</span> : null}
              </div>
              {description ? (
                <p className="mb-4 text-sm leading-relaxed text-text-sub dark:text-white/60">{description}</p>
              ) : null}

              <div className="flex flex-wrap items-center gap-6">
                <button
                  type="button"
                  onClick={handleVideoLike}
                  disabled={!hasVideoId || likingVideo}
                  className={`inline-flex items-center gap-1.5 text-sm disabled:opacity-50 ${
                    hasVideoId && videoLike.liked
                      ? 'text-brand-start dark:text-[#FF4142]'
                      : 'text-text-aux dark:text-white/60'
                  }`}
                >
                  <Heart size={20} fill={hasVideoId && videoLike.liked ? 'currentColor' : 'none'} />
                  <span>{hasVideoId ? String(videoLike.count) : '0'}</span>
                </button>
                <span className="inline-flex items-center gap-1.5 text-sm text-text-aux dark:text-white/60">
                  <MessageSquare size={20} />
                  <span>{commentTotal}</span>
                </span>
                <button
                  type="button"
                  onClick={() => void handleShare()}
                  className="inline-flex items-center gap-1.5 text-sm text-text-aux dark:text-white/60 active:opacity-80"
                >
                  <Share2 size={20} />
                  <span>分享</span>
                </button>
              </div>
            </div>

            {hasVideoId ? (
            <div className="p-4">
              <div className="mb-4">
                <h3 className="text-md font-bold">评论 ({commentTotal})</h3>
              </div>

              {commentLoading ? (
                <div className="space-y-3">
                  {[0, 1, 2].map((item) => (
                    <div key={item} className="h-20 animate-pulse rounded-xl bg-bg-skeleton dark:bg-white/10" />
                  ))}
                </div>
              ) : null}
              {!commentLoading && commentError ? (
                <ErrorState
                  message={getErrorMessage(commentError)}
                  onRetry={() => {
                    void reloadCommentList().catch(() => undefined);
                  }}
                />
              ) : null}
              {!commentLoading && !commentError && comments.length === 0 ? (
                <div className="rounded-xl bg-bg-hover px-3 py-4 text-sm text-text-sub dark:bg-white/5 dark:text-white/50">
                  暂无评论，快来抢沙发
                </div>
              ) : null}

              <div className="space-y-6">
                {comments.map(function (item) {
                  return (
                    <div key={item.id} className="flex gap-3">
                      <img
                        src={item.avatar?.trim() ? item.avatar.trim() : COMMENT_AVATAR_FALLBACK}
                        alt=""
                        className="h-10 w-10 shrink-0 rounded-full bg-bg-skeleton object-cover dark:bg-white/10"
                        referrerPolicy="no-referrer"
                        onError={handleCommentAvatarError}
                      />
                      <div className="min-w-0 flex-1">
                        <div className="mb-1 flex items-start justify-between gap-2">
                          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                            <span className="max-w-[140px] truncate text-sm font-bold text-text-main dark:text-white/90">
                              {item.nickname}
                            </span>
                            {item.userLevelText ? (
                              <span className="rounded border border-blue-500/30 bg-blue-500/10 px-1.5 py-0.5 text-3xs text-blue-600 dark:border-blue-400/30 dark:bg-blue-500/20 dark:text-blue-300">
                                {item.userLevelText}
                              </span>
                            ) : null}
                            {item.agentLevelText ? (
                              <span className="rounded border border-amber-500/40 bg-amber-500/10 px-1.5 py-0.5 text-3xs text-amber-700 dark:border-[#E6B800]/30 dark:bg-[#E6B800]/20 dark:text-[#E6B800]">
                                {item.agentLevelText}
                              </span>
                            ) : null}
                          </div>
                          <span className="shrink-0 text-2xs text-text-aux dark:text-white/30">
                            {formatCommentTime(item.createdAt)}
                          </span>
                        </div>
                        <p className="text-sm leading-relaxed text-text-sub dark:text-white/70">{item.content}</p>
                        {typeof item.remoteId === 'number' ? (
                          <div className="mt-2 flex items-center gap-4">
                            <button
                              type="button"
                              onClick={function () { handleCommentLike(item.remoteId); }}
                              disabled={likingCommentId === item.remoteId}
                              className={'inline-flex items-center gap-1 text-2xs disabled:opacity-50 ' + (
                                item.isLiked
                                  ? 'text-brand-start dark:text-[#FF4142]'
                                  : 'text-text-aux dark:text-white/30'
                              )}
                            >
                              <Heart size={12} fill={item.isLiked ? 'currentColor' : 'none'} />
                              <span>{typeof item.likeCount === 'number' ? item.likeCount : 0}</span>
                            </button>
                          </div>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div ref={loadMoreCommentRef} className="py-4 text-center text-s">
                {commentLoadingMore ? (
                  <span className="inline-flex items-center gap-1.5 text-text-sub dark:text-white/40">
                    <Loader2 size={14} className="animate-spin" /> 加载中...
                  </span>
                ) : commentHasMore ? (
                  <span className="text-text-aux dark:text-white/30">上滑加载更多</span>
                ) : comments.length > 0 ? (
                  <span className="text-text-aux dark:text-white/30">— 已显示全部评论 —</span>
                ) : null}
              </div>
            </div>
            ) : null}
          </div>
        ) : null}

        {!activeLoading && !activeError && playerError ? (
          <div className="px-4 pt-4">
            <ErrorState message={playerError} onRetry={handleRefresh} />
          </div>
        ) : null}
      </div>

      {showCommentBar ? (
        <div className="shrink-0 border-t border-border-light bg-bg-card px-3 py-3 pb-safe dark:border-white/5 dark:bg-[#16181D]">
          <div className="flex items-center gap-3">
            <div className="flex h-10 flex-1 items-center rounded-full bg-bg-hover px-4 dark:bg-white/5">
              <input
                value={commentText}
                onChange={(event) => setCommentText(event.target.value)}
                maxLength={300}
                placeholder="说点什么吧..."
                className="w-full border-0 bg-transparent text-sm text-text-main outline-none placeholder:text-text-aux dark:text-white/80 dark:placeholder:text-white/25"
              />
            </div>
            <button
              type="button"
              onClick={handleSubmitComment}
              disabled={submittingComment}
              className="shrink-0 px-2 text-sm font-bold text-brand-start disabled:cursor-not-allowed disabled:opacity-60 dark:text-[#FF4142]"
            >
              {submittingComment ? '发送中...' : '发送'}
            </button>
          </div>
          <p className="mt-2 px-1 text-2xs text-text-aux dark:text-white/35">最多 300 字</p>
        </div>
      ) : null}
    </div>
  );
};
