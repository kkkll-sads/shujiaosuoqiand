import { ApiError, isAbortError } from './errors';
import { appendQueryParams, type QueryParams } from './query';
import { clearAuthSession, persistAuthRedirectPath } from '../../lib/auth';
import { emitGlobalToast } from '../../lib/feedback';

export type HttpMethod = 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';

type EnvelopeCode = number | string;

interface ApiEnvelope<TData> {
  code: EnvelopeCode;
  biz_code?: EnvelopeCode;
  message?: string;
  msg?: string;
  time?: number | string;
  data: TData;
}

export interface RequestOptions<TBody = unknown>
  extends Omit<RequestInit, 'body' | 'headers' | 'method' | 'signal'> {
  body?: TBody;
  headers?: HeadersInit;
  isSuccessCode?: (code: EnvelopeCode) => boolean;
  method?: HttpMethod;
  query?: QueryParams;
  responseType?: 'json' | 'text' | 'blob';
  signal?: AbortSignal;
  timeout?: number;
  unwrapEnvelope?: boolean;
  useMock?: boolean;
}

export interface MockRequestContext {
  body?: unknown;
  headers: Headers;
  method: HttpMethod;
  signal: AbortSignal;
  url: URL;
}

export type MockHandler = (context: MockRequestContext) => unknown | Promise<unknown>;
export type MockHandlerMap = Record<string, MockHandler>;

export interface BaseURLResolvedPayload {
  baseURL: string;
  line: number;
  total: number;
}

export interface HttpClientOptions {
  baseURL?: string;
  baseURLCacheKey?: string;
  baseURLCandidates?: string[];
  baseURLProbePath?: string;
  baseURLProbeTimeout?: number;
  defaultHeaders?: HeadersInit;
  discoverCandidates?: () => Promise<string[]>;
  enableMock?: boolean;
  getAccessToken?: () => string | null;
  getAuthHeaders?: () => HeadersInit | null;
  isSuccessCode?: (code: EnvelopeCode) => boolean;
  mockDelay?: number;
  mockHandlers?: MockHandlerMap;
  onBaseURLResolved?: (payload: BaseURLResolvedPayload) => void;
  timeout?: number;
}

function normalizeBaseURL(value: string): string {
  return value.trim().replace(/\/+$/, '');
}

function appendUniqueBaseURL(target: string[], value: string | undefined) {
  if (!value) {
    return;
  }

  const normalizedValue = normalizeBaseURL(value);
  if (!normalizedValue) {
    return;
  }

  if (!target.includes(normalizedValue)) {
    target.push(normalizedValue);
  }
}

function ensureTrailingSlash(value: string): string {
  return value.endsWith('/') ? value : `${value}/`;
}

function trimLeadingSlash(value: string): string {
  return value.startsWith('/') ? value.slice(1) : value;
}

function resolveUrl(path: string, baseURL?: string): URL {
  if (/^https?:\/\//i.test(path)) {
    return new URL(path);
  }

  if (baseURL) {
    return new URL(trimLeadingSlash(path), ensureTrailingSlash(baseURL));
  }

  const origin = typeof window === 'undefined' ? 'http://localhost' : window.location.origin;
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  return new URL(normalizedPath, origin);
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return Object.prototype.toString.call(value) === '[object Object]';
}

function isBodyInit(value: unknown): value is BodyInit {
  return (
    typeof value === 'string' ||
    value instanceof Blob ||
    value instanceof FormData ||
    value instanceof URLSearchParams ||
    value instanceof ArrayBuffer ||
    ArrayBuffer.isView(value)
  );
}

function hasJsonContentType(headers: Headers): boolean {
  return headers.get('content-type')?.includes('application/json') ?? false;
}

function getCharset(contentType: string): string | null {
  const matched = contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i);
  return matched?.[1]?.trim().toLowerCase() ?? null;
}

function countReplacementChars(value: string): number {
  let count = 0;
  for (const char of value) {
    if (char === '\uFFFD') {
      count += 1;
    }
  }
  return count;
}

function tryDecodeBuffer(buffer: ArrayBuffer, charset: string): string | null {
  try {
    return new TextDecoder(charset).decode(buffer);
  } catch {
    return null;
  }
}

function decodeResponseText(buffer: ArrayBuffer, contentType: string): string {
  const declaredCharset = getCharset(contentType);
  const decodeOrder = declaredCharset
    ? [declaredCharset, 'utf-8']
    : ['utf-8', 'gb18030', 'gbk'];

  let bestText = '';
  let bestReplacementCount = Number.POSITIVE_INFINITY;

  decodeOrder.forEach((charset, index) => {
    const decoded = tryDecodeBuffer(buffer, charset);
    if (decoded == null) {
      return;
    }

    const replacementCount = countReplacementChars(decoded);
    const isBetter =
      replacementCount < bestReplacementCount ||
      (replacementCount === bestReplacementCount && index === 0);

    if (isBetter) {
      bestText = decoded;
      bestReplacementCount = replacementCount;
    }
  });

  if (bestText) {
    return bestText;
  }

  return new TextDecoder().decode(buffer);
}

function isEnvelope<TData>(payload: unknown): payload is ApiEnvelope<TData> {
  return isPlainObject(payload) && 'code' in payload && 'data' in payload;
}

const responseListFieldKeys = new Set([
  'list',
  'rows',
  'items',
  'menus',
  'children',
  'sessions',
  'packages',
  'zones',
  'package_zones',
  'session_options',
  'records',
  'resources',
  'hotNews',
  'hotVideos',
  'cards',
  'collections',
  'consignments',
  'controllers',
  'columns',
  'databases',
  'ips',
  'related_users',
  'errors',
  'skus',
  'specs',
  'stages',
  'top_winners',
]);

function normalizeArrayField(value: unknown): unknown[] {
  if (Array.isArray(value)) {
    return value.map((item) => normalizeListPayload(item));
  }

  if (isPlainObject(value)) {
    return Object.values(value).map((item) => normalizeListPayload(item));
  }

  return [];
}

function normalizeListPayload<T>(payload: T): T {
  if (Array.isArray(payload)) {
    return payload.map((item) => normalizeListPayload(item)) as T;
  }

  if (!isPlainObject(payload)) {
    return payload;
  }

  const normalized = payload as Record<string, unknown>;
  Object.keys(normalized).forEach((key) => {
    const value = normalized[key];
    if (responseListFieldKeys.has(key)) {
      normalized[key] = normalizeArrayField(value);
      return;
    }

    normalized[key] = normalizeListPayload(value);
  });

  return payload;
}

function buildMockKey(method: HttpMethod, url: URL): string {
  return `${method} ${url.pathname}`;
}

function createAbortError(): Error {
  return new DOMException('The operation was aborted.', 'AbortError');
}

const AUTH_FAILURE_MSG_RE =
  /token.*(?:失效|过期|无效|错误)|(?:未登录|请登录|登录.*(?:过期|失效|超时|已过期))|请重新登录|需要登录|会话.*(?:过期|失效)|身份验证失败|认证失败|unauthorized|unauthenticated|token\s*expir/i;

function shouldRedirectToLogin(
  status?: number,
  code?: EnvelopeCode,
  message?: string,
): boolean {
  if (status === 303 || code === 303 || code === '303') {
    return true;
  }
  if (status === 401 || status === 403) {
    return true;
  }
  if (code === 401 || code === '401' || code === 403 || code === '403') {
    return true;
  }
  if (message && AUTH_FAILURE_MSG_RE.test(message)) {
    return true;
  }
  return false;
}

function getBizCode(payload: ApiEnvelope<unknown>): EnvelopeCode {
  return payload.biz_code ?? payload.code;
}

let lastLoginRedirectAt = 0;

function shouldSkipLoginRedirect(currentPath: string): boolean {
  return currentPath.startsWith('/live/view') || /^\/live\/\d+$/.test(currentPath);
}

function redirectToLogin(message?: string) {
  if (typeof window === 'undefined') {
    return;
  }

  const now = Date.now();
  if (message && now - lastLoginRedirectAt > 1200) {
    emitGlobalToast({
      message,
      type: 'warning',
    });
  }
  lastLoginRedirectAt = now;

  const currentPath = window.location.hash.startsWith('#')
    ? window.location.hash.slice(1)
    : window.location.pathname;

  if (shouldSkipLoginRedirect(currentPath)) {
    clearAuthSession();
    return;
  }

  persistAuthRedirectPath(currentPath || '/');
  clearAuthSession();

  if (window.location.hash === '#/login') {
    return;
  }

  window.location.replace('#/login');
}

async function delay(duration: number, signal: AbortSignal): Promise<void> {
  if (duration <= 0) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    const timer = window.setTimeout(() => {
      signal.removeEventListener('abort', handleAbort);
      resolve();
    }, duration);

    const handleAbort = () => {
      window.clearTimeout(timer);
      reject(createAbortError());
    };

    signal.addEventListener('abort', handleAbort, { once: true });
  });
}

export class HttpClient {
  private readonly options: Required<
    Pick<
      HttpClientOptions,
      | 'defaultHeaders'
      | 'enableMock'
      | 'mockDelay'
      | 'timeout'
      | 'baseURLCandidates'
      | 'baseURLProbePath'
      | 'baseURLProbeTimeout'
    >
  > &
    Omit<
      HttpClientOptions,
      | 'defaultHeaders'
      | 'enableMock'
      | 'mockDelay'
      | 'timeout'
      | 'baseURLCandidates'
      | 'baseURLProbePath'
      | 'baseURLProbeTimeout'
    >;
  private resolvedBaseURL?: string;
  private resolvingBaseURL?: Promise<string | undefined>;
  private lastNotifiedBaseURL?: string;
  /** 正在进行中的 GET 请求，key → Promise，用于去重避免并发发起相同请求 */
  private readonly inflightGetRequests = new Map<string, Promise<unknown>>();

  constructor(options: HttpClientOptions = {}) {
    const baseURLCandidates: string[] = [];
    (options.baseURLCandidates ?? []).forEach((candidate) => {
      appendUniqueBaseURL(baseURLCandidates, candidate);
    });
    appendUniqueBaseURL(baseURLCandidates, options.baseURL);

    this.options = {
      baseURL: options.baseURL,
      baseURLCacheKey: options.baseURLCacheKey,
      baseURLCandidates,
      baseURLProbePath: options.baseURLProbePath ?? '/api/User/checkIn',
      baseURLProbeTimeout: options.baseURLProbeTimeout ?? 3500,
      defaultHeaders: options.defaultHeaders ?? {},
      enableMock: options.enableMock ?? false,
      getAccessToken: options.getAccessToken,
      getAuthHeaders: options.getAuthHeaders,
      isSuccessCode: options.isSuccessCode ?? ((code) => code === 1 || code === '1'),
      mockDelay: options.mockDelay ?? 0,
      mockHandlers: options.mockHandlers ?? {},
      timeout: options.timeout ?? 10000,
    };
  }

  async request<TResponse, TBody = unknown>(
    path: string,
    options: RequestOptions<TBody> = {},
  ): Promise<TResponse> {
    const method = options.method ?? 'GET';

    // GET 请求去重：相同路径+查询参数的并发请求共享同一个 Promise
    if (method === 'GET' && !options.signal) {
      const queryStr = options.query ? JSON.stringify(options.query) : '';
      const dedupeKey = `${path}::${queryStr}`;
      const inflight = this.inflightGetRequests.get(dedupeKey);
      if (inflight) {
        return inflight as Promise<TResponse>;
      }
      const promise = this.doRequest<TResponse, TBody>(path, options);
      this.inflightGetRequests.set(dedupeKey, promise);
      promise.finally(() => {
        this.inflightGetRequests.delete(dedupeKey);
      });
      return promise;
    }

    return this.doRequest<TResponse, TBody>(path, options);
  }

  private async doRequest<TResponse, TBody = unknown>(
    path: string,
    options: RequestOptions<TBody> = {},
  ): Promise<TResponse> {
    const method = options.method ?? 'GET';
    const headers = new Headers(this.options.defaultHeaders);
    const controller = new AbortController();
    const timeout = options.timeout ?? this.options.timeout;
    let timedOut = false;
    const shouldResolveBaseURL = !/^https?:\/\//i.test(path);
    let activeBaseURL = this.options.baseURL;

    if (options.headers) {
      new Headers(options.headers).forEach((value, key) => {
        headers.set(key, value);
      });
    }

    const authHeaders = this.options.getAuthHeaders?.();
    if (authHeaders) {
      new Headers(authHeaders).forEach((value, key) => {
        if (!headers.has(key)) {
          headers.set(key, value);
        }
      });
    }

    const token = this.options.getAccessToken?.();
    if (token && !headers.has('authorization')) {
      headers.set('authorization', `Bearer ${token}`);
    }

    const detachAbortBridge = this.bridgeAbortSignal(options.signal, controller);
    const timeoutId = window.setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);

    try {
      const preparedBody = this.prepareBody(options.body, headers);
      const enableMock = options.useMock ?? this.options.enableMock;
      if (shouldResolveBaseURL) {
        activeBaseURL = await this.resolveBaseURL(controller.signal);
      }
      const url = appendQueryParams(resolveUrl(path, activeBaseURL), options.query);

      if (enableMock) {
        const mockHandler = this.options.mockHandlers[buildMockKey(method, url)];
        if (mockHandler) {
          await delay(this.options.mockDelay, controller.signal);
          const payload = await mockHandler({
            body: options.body,
            headers,
            method,
            signal: controller.signal,
            url,
          });
          return this.unwrapPayload<TResponse>(
            payload,
            200,
            options.isSuccessCode ?? this.options.isSuccessCode,
            options.unwrapEnvelope ?? true,
          );
        }
      }

      const response = await fetch(url.toString(), {
        ...options,
        body: preparedBody,
        headers,
        method,
        signal: controller.signal,
      });

      const payload = await this.parseResponse(response, options.responseType ?? 'json');

      if (!response.ok) {
        throw this.toApiError(payload, response.status);
      }

      return this.unwrapPayload<TResponse>(
        payload,
        response.status,
        options.isSuccessCode ?? this.options.isSuccessCode,
        options.unwrapEnvelope ?? true,
      );
    } catch (error) {
      if (timedOut) {
        throw new ApiError('Request timed out.', { code: 'REQUEST_TIMEOUT' });
      }

      if (error instanceof ApiError || isAbortError(error)) {
        throw error;
      }

      throw new ApiError('Network request failed.', { details: error });
    } finally {
      window.clearTimeout(timeoutId);
      detachAbortBridge();
    }
  }

  get<TResponse>(path: string, options: Omit<RequestOptions<never>, 'body' | 'method'> = {}) {
    return this.request<TResponse>(path, { ...options, method: 'GET' });
  }

  post<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options: Omit<RequestOptions<TBody>, 'body' | 'method'> = {},
  ) {
    return this.request<TResponse, TBody>(path, { ...options, body, method: 'POST' });
  }

  put<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options: Omit<RequestOptions<TBody>, 'body' | 'method'> = {},
  ) {
    return this.request<TResponse, TBody>(path, { ...options, body, method: 'PUT' });
  }

  patch<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options: Omit<RequestOptions<TBody>, 'body' | 'method'> = {},
  ) {
    return this.request<TResponse, TBody>(path, { ...options, body, method: 'PATCH' });
  }

  delete<TResponse, TBody = unknown>(
    path: string,
    body?: TBody,
    options: Omit<RequestOptions<TBody>, 'body' | 'method'> = {},
  ) {
    return this.request<TResponse, TBody>(path, { ...options, body, method: 'DELETE' });
  }

  getResolvedBaseURL(): string | undefined {
    if (this.resolvedBaseURL) {
      return this.resolvedBaseURL;
    }

    const cachedBaseURL = this.readCachedBaseURL();
    if (cachedBaseURL) {
      return cachedBaseURL;
    }

    return this.options.baseURL ? normalizeBaseURL(this.options.baseURL) : undefined;
  }

  forceSetBaseURL(baseURL: string) {
    const normalized = normalizeBaseURL(baseURL);
    this.resolvedBaseURL = normalized;
    this.writeCachedBaseURL(normalized);
    appendUniqueBaseURL(this.options.baseURLCandidates, normalized);
  }

  getBaseURLCandidates(): string[] {
    return [...this.options.baseURLCandidates];
  }

  getBaseURLProbePath(): string {
    return this.options.baseURLProbePath || '/api/User/checkIn';
  }

  getBaseURLProbeTimeout(): number {
    return this.options.baseURLProbeTimeout || 3500;
  }

  async eagerResolve(): Promise<BaseURLResolvedPayload | null> {
    const candidates = this.options.baseURLCandidates;
    if (candidates.length === 0 && !this.options.discoverCandidates) {
      return null;
    }

    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), 30000);

    try {
      const baseURL = await this.resolveBaseURL(controller.signal);
      if (!baseURL) {
        return null;
      }

      const lineIndex = this.options.baseURLCandidates.findIndex(
        (c) => c === normalizeBaseURL(baseURL),
      );

      return {
        baseURL: normalizeBaseURL(baseURL),
        line: lineIndex >= 0 ? lineIndex + 1 : 1,
        total: this.options.baseURLCandidates.length,
      };
    } catch {
      return null;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  private async resolveBaseURL(signal: AbortSignal): Promise<string | undefined> {
    const candidates = this.options.baseURLCandidates;
    if (candidates.length === 0 && !this.options.discoverCandidates) {
      return this.options.baseURL;
    }

    if (this.resolvedBaseURL && candidates.includes(this.resolvedBaseURL)) {
      return this.resolvedBaseURL;
    }

    if (!this.resolvingBaseURL) {
      this.resolvingBaseURL = this.pickReachableBaseURL(candidates).finally(() => {
        this.resolvingBaseURL = undefined;
      });
    }

    const selectedBaseURL = await this.awaitWithAbortSignal(this.resolvingBaseURL, signal);
    this.resolvedBaseURL = selectedBaseURL;
    this.notifyResolvedBaseURL(selectedBaseURL);
    return selectedBaseURL;
  }

  private static isLocalOrigin(origin: string): boolean {
    try {
      const hostname = new URL(origin).hostname.trim().toLowerCase();
      return (
        hostname === 'localhost' ||
        hostname === '127.0.0.1' ||
        hostname === '0.0.0.0' ||
        hostname === '::1' ||
        hostname === '[::1]'
      );
    } catch {
      return true;
    }
  }

  private async pickReachableBaseURL(candidates: string[]): Promise<string | undefined> {
    // Web 部署 / 反代：非 localhost 直接用 window.location.origin，跳过探测
    if (typeof window !== 'undefined') {
      try {
        const origin = window.location.origin;
        if (origin && origin !== 'null' && /^https?:\/\//i.test(origin) && !HttpClient.isLocalOrigin(origin)) {
          const normalizedOrigin = normalizeBaseURL(origin);
          this.writeCachedBaseURL(normalizedOrigin);
          return normalizedOrigin;
        }
      } catch { /* ignore */ }
    }

    if (this.options.discoverCandidates) {
      try {
        const discovered = await this.options.discoverCandidates();
        discovered.forEach((url) => {
          appendUniqueBaseURL(this.options.baseURLCandidates, url);
          appendUniqueBaseURL(candidates, url);
        });
      } catch {
        // DNS/cloud discovery failed silently, fall through to static candidates
      }
    }

    const cachedBaseURL = this.readCachedBaseURL();
    if (cachedBaseURL) {
      appendUniqueBaseURL(this.options.baseURLCandidates, cachedBaseURL);
      appendUniqueBaseURL(candidates, cachedBaseURL);
    }
    const orderedCandidates = cachedBaseURL
      ? [cachedBaseURL, ...candidates.filter((candidate) => candidate !== cachedBaseURL)]
      : [...candidates];

    for (const candidate of orderedCandidates) {
      const isReachable = await this.probeBaseURL(candidate);
      if (isReachable) {
        this.writeCachedBaseURL(candidate);
        return candidate;
      }
    }

    const fallbackBaseURL = orderedCandidates[0];
    this.writeCachedBaseURL(fallbackBaseURL);
    return fallbackBaseURL;
  }

  private readCachedBaseURL(): string | undefined {
    var cacheKey = this.options.baseURLCacheKey;
    if (!cacheKey || typeof window === 'undefined') {
      return undefined;
    }

    try {
      var cachedValue = window.localStorage.getItem(cacheKey);
      if (!cachedValue) {
        return undefined;
      }

      return normalizeBaseURL(cachedValue);
    } catch {
      return undefined;
    }
  }

  private writeCachedBaseURL(baseURL: string | undefined) {
    const cacheKey = this.options.baseURLCacheKey;
    if (!cacheKey || typeof window === 'undefined') {
      return;
    }

    try {
      if (!baseURL) {
        window.localStorage.removeItem(cacheKey);
        return;
      }

      window.localStorage.setItem(cacheKey, baseURL);
    } catch {
      return;
    }
  }

  private async probeBaseURL(baseURL: string): Promise<boolean> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => {
      controller.abort();
    }, this.options.baseURLProbeTimeout);

    try {
      const probeURL = appendQueryParams(
        resolveUrl(this.options.baseURLProbePath, baseURL),
        { __probe: Date.now() },
      );
      const response = await fetch(probeURL.toString(), {
        cache: 'no-store',
        method: 'GET',
        signal: controller.signal,
      });

      return response.status < 500;
    } catch (error) {
      return false;
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  private async awaitWithAbortSignal<T>(promise: Promise<T>, signal: AbortSignal): Promise<T> {
    if (signal.aborted) {
      throw createAbortError();
    }

    return new Promise<T>((resolve, reject) => {
      const handleAbort = () => {
        reject(createAbortError());
      };

      signal.addEventListener('abort', handleAbort, { once: true });

      promise.then(
        (value) => {
          signal.removeEventListener('abort', handleAbort);
          resolve(value);
        },
        (error) => {
          signal.removeEventListener('abort', handleAbort);
          reject(error);
        },
      );
    });
  }

  private notifyResolvedBaseURL(baseURL: string | undefined) {
    if (!baseURL || !this.options.onBaseURLResolved) {
      return;
    }

    const normalizedBaseURL = normalizeBaseURL(baseURL);
    if (this.lastNotifiedBaseURL === normalizedBaseURL) {
      return;
    }

    const lineIndex = this.options.baseURLCandidates.findIndex(
      (candidate) => candidate === normalizedBaseURL,
    );
    if (lineIndex < 0) {
      return;
    }

    this.lastNotifiedBaseURL = normalizedBaseURL;
    this.options.onBaseURLResolved({
      baseURL: normalizedBaseURL,
      line: lineIndex + 1,
      total: this.options.baseURLCandidates.length,
    });
  }

  private bridgeAbortSignal(signal: AbortSignal | undefined, controller: AbortController) {
    if (!signal) {
      return () => undefined;
    }

    if (signal.aborted) {
      controller.abort();
      return () => undefined;
    }

    const handleAbort = () => controller.abort();
    signal.addEventListener('abort', handleAbort, { once: true });

    return () => signal.removeEventListener('abort', handleAbort);
  }

  private prepareBody<TBody>(body: TBody | undefined, headers: Headers): BodyInit | undefined {
    if (body == null) {
      return undefined;
    }

    if (isBodyInit(body)) {
      return body;
    }

    if (isPlainObject(body) || Array.isArray(body)) {
      if (!hasJsonContentType(headers)) {
        headers.set('content-type', 'application/json');
      }
      return JSON.stringify(body);
    }

    return String(body) as BodyInit;
  }

  private async parseResponse(response: Response, responseType: 'json' | 'text' | 'blob') {
    if (responseType === 'blob') {
      return response.blob();
    }

    const contentType = response.headers.get('content-type') ?? '';
    const buffer = await response.arrayBuffer();
    const text = decodeResponseText(buffer, contentType);

    if (responseType === 'text') {
      return text;
    }

    if (contentType.includes('application/json')) {
      if (!text) {
        return null;
      }

      return JSON.parse(text);
    }

    if (!text) {
      return null;
    }

    try {
      return JSON.parse(text);
    } catch {
      return text;
    }
  }

  private toApiError(payload: unknown, status: number): ApiError {
    if (isEnvelope(payload)) {
      const msg = payload.message || payload.msg || '';
      if (shouldRedirectToLogin(status, getBizCode(payload), msg)) {
        redirectToLogin(msg || '请先登录');
      }

      return new ApiError(msg || 'Request failed.', {
        code: getBizCode(payload),
        details: payload,
        status,
      });
    }

    if (isPlainObject(payload) && typeof payload.message === 'string') {
      if (shouldRedirectToLogin(status, undefined, payload.message)) {
        redirectToLogin(payload.message || '请先登录');
      }
      return new ApiError(payload.message, { details: payload, status });
    }

    if (shouldRedirectToLogin(status)) {
      redirectToLogin('请先登录');
    }

    return new ApiError('Request failed.', { details: payload, status });
  }

  private unwrapPayload<TResponse>(
    payload: unknown,
    status: number,
    isSuccessCode: (code: EnvelopeCode) => boolean,
    unwrapEnvelope: boolean,
  ): TResponse {
    if (isEnvelope<TResponse>(payload)) {
      const isPrimarySuccess = isSuccessCode(payload.code);
      const isBizSuccess =
        payload.biz_code == null ? true : isSuccessCode(payload.biz_code);

      if (!isPrimarySuccess || !isBizSuccess) {
        const failMsg = payload.message || payload.msg || '';
        if (shouldRedirectToLogin(status, getBizCode(payload), failMsg)) {
          redirectToLogin(failMsg || '请先登录');
        }

        throw new ApiError(failMsg || 'Request failed.', {
          code: getBizCode(payload),
          details: payload,
          status,
        });
      }

      // 部分接口在 code 为成功时仍通过 message 返回业务错误（如提现：支付密码错误）
      const bizMsg = payload.message || payload.msg;
      if (
        payload.data == null &&
        typeof bizMsg === 'string' &&
        bizMsg.trim().length > 0
      ) {
        throw new ApiError(bizMsg.trim(), {
          code: getBizCode(payload),
          details: payload,
          status,
        });
      }

      if (!unwrapEnvelope) {
        return {
          ...payload,
          data: normalizeListPayload(payload.data),
        } as TResponse;
      }

      return normalizeListPayload(payload.data);
    }

    return normalizeListPayload(payload as TResponse);
  }
}

