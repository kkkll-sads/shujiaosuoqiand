/**
 * @file 通用请求 Hook（带内存缓存）
 * @description 发起异步请求并管理 loading / data / error 状态。
 *              默认开启内存缓存：组件卸载后重新挂载时，先用缓存数据渲染（无 loading），
 *              再后台静默刷新。设置 cache: false 可关闭缓存。
 */

import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { isAbortError } from '../api/core/errors';
import { apiConfig } from '../api/config';
import {
  AUTH_SESSION_CHANGE_EVENT,
  getAuthSessionSnapshot,
  resolveAuthCacheScope,
  subscribeAuthSessionChange,
} from '../lib/auth';

/* ==================== 全局内存缓存 ==================== */

interface CacheEntry<TData = unknown> {
  data: TData;
  /** 写入时间戳（ms） */
  timestamp: number;
}

/** 全局缓存 Map，应用生命周期内有效 */
const globalCache = new Map<string, CacheEntry>();
const REQUEST_CACHE_SYNC_FLAG = '__request_cache_auth_sync_bound__';

/** 默认缓存有效期：15 分钟 */
const DEFAULT_CACHE_TTL = 15 * 60 * 1000;

/** 清空全局内存缓存，供「清理缓存」等场景调用 */
export function clearRequestCache() {
  globalCache.clear();
}

function shouldResetCacheForStorageKey(key: string | null) {
  return (
    key === null ||
    key === 'member_auth_session' ||
    key === apiConfig.tokenStorageKey ||
    key === apiConfig.baTokenStorageKey ||
    key === apiConfig.baUserTokenStorageKey
  );
}

function ensureRequestCacheSync() {
  if (typeof window === 'undefined') {
    return;
  }

  const targetWindow = window as Window & { [REQUEST_CACHE_SYNC_FLAG]?: boolean };
  if (targetWindow[REQUEST_CACHE_SYNC_FLAG]) {
    return;
  }

  targetWindow[REQUEST_CACHE_SYNC_FLAG] = true;

  window.addEventListener(AUTH_SESSION_CHANGE_EVENT, () => {
    clearRequestCache();
  });

  window.addEventListener('storage', (event) => {
    if (shouldResetCacheForStorageKey(event.key)) {
      clearRequestCache();
    }
  });
}

ensureRequestCacheSync();

/** 根据 deps 生成缓存 key */
function buildCacheKey(deps: readonly unknown[]): string {
  return deps
    .map((dep) => {
      if (dep === null) return 'null';
      if (dep === undefined) return 'undefined';
      if (typeof dep === 'object') return JSON.stringify(dep);
      return String(dep);
    })
    .join('::');
}

/* ==================== Hook ==================== */

interface UseRequestOptions<TData> {
  /** 是否启用缓存，默认 true */
  cache?: boolean;
  /** 是否按登录身份隔离缓存 */
  authScoped?: boolean;
  /** 自定义缓存 key，不设则根据 deps 自动生成 */
  cacheKey?: string;
  /** 缓存有效期（ms），默认 5 分钟 */
  cacheTTL?: number;
  deps?: readonly unknown[];
  initialData?: TData;
  keepPreviousData?: boolean;
  manual?: boolean;
}

export function useRequest<TData>(
  service: (signal: AbortSignal) => Promise<TData>,
  options: UseRequestOptions<TData> = {},
) {
  const {
    cache = true,
    authScoped = false,
    cacheKey: customCacheKey,
    cacheTTL = DEFAULT_CACHE_TTL,
    deps = [],
    initialData,
    keepPreviousData = true,
    manual = false,
  } = options;

  const [authScope, setAuthScope] = useState(() =>
    authScoped ? resolveAuthCacheScope(getAuthSessionSnapshot()) : '',
  );

  useEffect(() => {
    if (!authScoped) {
      setAuthScope('');
      return undefined;
    }

    setAuthScope(resolveAuthCacheScope(getAuthSessionSnapshot()));
    return subscribeAuthSessionChange(() => {
      setAuthScope(resolveAuthCacheScope(getAuthSessionSnapshot()));
    });
  }, [authScoped]);

  /** 实际缓存 key */
  const baseCacheKey = cache ? (customCacheKey ?? buildCacheKey(deps)) : '';
  const resolvedCacheKey =
    authScope && baseCacheKey ? `${baseCacheKey}::auth=${authScope}` : baseCacheKey;

  /** 尝试从缓存获取初始数据 */
  const getCachedData = useCallback((targetCacheKey = resolvedCacheKey): TData | undefined => {
    if (!targetCacheKey) return undefined;
    const entry = globalCache.get(targetCacheKey);
    if (!entry) return undefined;
    if (Date.now() - entry.timestamp > cacheTTL) {
      globalCache.delete(targetCacheKey);
      return undefined;
    }
    return entry.data as TData;
  }, [cacheTTL, resolvedCacheKey]);

  const getInitialValue = useCallback((targetCacheKey = resolvedCacheKey) => {
    return getCachedData(targetCacheKey) ?? initialData;
  }, [getCachedData, initialData, resolvedCacheKey]);

  /** 尝试从缓存获取初始数据 */
  const cachedData = getCachedData();
  const hasCache = cachedData !== undefined;

  const [data, setData] = useState<TData | undefined>(cachedData ?? initialData);
  const [error, setError] = useState<Error | null>(null);
  /**
   * 有缓存时不显示 loading（静默刷新），无缓存时正常 loading
   */
  const [loading, setLoading] = useState(!manual && !hasCache);

  const abortRef = useRef<AbortController | null>(null);
  const initialDataRef = useRef(initialData);
  const keepPreviousDataRef = useRef(keepPreviousData);
  const requestIdRef = useRef(0);
  const serviceRef = useRef(service);
  const cacheKeyRef = useRef(resolvedCacheKey);
  const previousResolvedCacheKeyRef = useRef(resolvedCacheKey);

  useEffect(() => {
    if (previousResolvedCacheKeyRef.current === resolvedCacheKey) {
      return;
    }

    previousResolvedCacheKeyRef.current = resolvedCacheKey;
    const nextCachedData = getInitialValue(resolvedCacheKey);
    setData(nextCachedData);
    setError(null);
    setLoading(!manual && nextCachedData === undefined);
  }, [getInitialValue, manual, resolvedCacheKey]);

  /*
   * 以下保留原有逻辑
   */

  useEffect(() => {
    serviceRef.current = service;
  }, [service]);

  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  useEffect(() => {
    keepPreviousDataRef.current = keepPreviousData;
  }, [keepPreviousData]);

  useEffect(() => {
    cacheKeyRef.current = resolvedCacheKey;
  }, [resolvedCacheKey]);

  const reload = useCallback(async () => {
    const requestId = requestIdRef.current + 1;
    requestIdRef.current = requestId;

    abortRef.current?.abort();

    const controller = new AbortController();
    abortRef.current = controller;

    if (!keepPreviousDataRef.current) {
      setData(initialDataRef.current);
    }

    setLoading(true);
    setError(null);

    try {
      const response = await serviceRef.current(controller.signal);
      if (controller.signal.aborted || requestId !== requestIdRef.current) {
        return undefined;
      }

      startTransition(() => {
        setData(response);
      });

      /* 写入缓存 */
      const currentKey = cacheKeyRef.current;
      if (currentKey) {
        globalCache.set(currentKey, { data: response, timestamp: Date.now() });
      }

      return response;
    } catch (nextError) {
      if (controller.signal.aborted || isAbortError(nextError)) {
        return undefined;
      }

      const normalizedError =
        nextError instanceof Error ? nextError : new Error('Request failed.');

      if (requestId === requestIdRef.current) {
        setError(normalizedError);
      }

      throw normalizedError;
    } finally {
      if (requestId === requestIdRef.current && !controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    if (manual) {
      setLoading(false);
      return;
    }

    void reload().catch(() => undefined);
  }, [manual, reload, resolvedCacheKey, ...deps]);

  useEffect(() => {
    return () => {
      abortRef.current?.abort();
    };
  }, []);

  return {
    data,
    error,
    loading,
    reload,
    setData,
  };
}
