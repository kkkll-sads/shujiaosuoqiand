import { startTransition, useCallback, useEffect, useRef, useState } from 'react';
import { isAbortError } from '../api/core/errors';

interface UseRequestOptions<TData> {
  deps?: readonly unknown[];
  initialData?: TData;
  keepPreviousData?: boolean;
  manual?: boolean;
}

export function useRequest<TData>(
  service: (signal: AbortSignal) => Promise<TData>,
  options: UseRequestOptions<TData> = {},
) {
  const { deps = [], initialData, keepPreviousData = true, manual = false } = options;
  const [data, setData] = useState<TData | undefined>(initialData);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(!manual);

  const abortRef = useRef<AbortController | null>(null);
  const initialDataRef = useRef(initialData);
  const keepPreviousDataRef = useRef(keepPreviousData);
  const requestIdRef = useRef(0);
  const serviceRef = useRef(service);

  useEffect(() => {
    serviceRef.current = service;
  }, [service]);

  useEffect(() => {
    initialDataRef.current = initialData;
  }, [initialData]);

  useEffect(() => {
    keepPreviousDataRef.current = keepPreviousData;
  }, [keepPreviousData]);

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
  }, [manual, reload, ...deps]);

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
