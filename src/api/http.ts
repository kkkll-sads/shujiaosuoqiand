import { apiConfig } from './config';
import { HttpClient, type BaseURLResolvedPayload } from './core/client';
import { discoverBaseURLs } from './core/dns-resolver';
import { mockHandlers } from './mock/handlers';
import { getAuthHeaders } from '../lib/auth';
import { emitGlobalToast } from '../lib/feedback';
import { appendQueryParams } from './core/query';

let latestResolvedLine = '';

function resolveHostName(baseURL: string): string {
  try {
    return new URL(baseURL).hostname || '';
  } catch {
    return '';
  }
}

function buildDiscoverCandidates(): (() => Promise<string[]>) | undefined {
  if (!apiConfig.dnsEnabled || apiConfig.dnsDomains.length === 0) {
    return undefined;
  }

  let cachedResult: string[] | null = null;

  return async () => {
    if (cachedResult) {
      return cachedResult;
    }

    const urls = await discoverBaseURLs({
      domains: apiConfig.dnsDomains,
      dnsServers:
        apiConfig.dnsServers.length > 0 ? apiConfig.dnsServers : ['8.8.8.8', '1.1.1.1'],
      cloudUrl: apiConfig.dnsCloudUrl || undefined,
      dohTimeout: apiConfig.dnsDohTimeout,
      cloudTimeout: apiConfig.dnsCloudTimeout,
    });

    if (urls.length > 0) {
      cachedResult = urls;
    }

    return urls;
  };
}

export const http = new HttpClient({
  baseURL: apiConfig.baseURL,
  baseURLCacheKey: apiConfig.baseURLCacheKey,
  baseURLCandidates: apiConfig.baseURLCandidates,
  baseURLProbePath: apiConfig.baseURLProbePath,
  baseURLProbeTimeout: apiConfig.baseURLProbeTimeout,
  defaultHeaders: {
    accept: 'application/json',
  },
  discoverCandidates: buildDiscoverCandidates(),
  enableMock: apiConfig.useMock,
  getAuthHeaders,
  isSuccessCode: (code) => code === 0 || code === '0' || code === 1 || code === '1',
  mockDelay: apiConfig.mockDelay,
  mockHandlers,
  onBaseURLResolved: ({ baseURL, line, total }) => {
    if (total <= 1) {
      return;
    }

    const lineKey = `${line}:${baseURL}`;
    if (lineKey === latestResolvedLine) {
      return;
    }
    latestResolvedLine = lineKey;

    const host = resolveHostName(baseURL);
    const hostSuffix = host ? ` (${host})` : '';
    emitGlobalToast({
      message: `当前线路${line}${hostSuffix}`,
      type: 'info',
      duration: 1800,
    });
  },
  timeout: apiConfig.timeout,
});

// ---------------------------------------------------------------------------
// 单条线路探测结果
// ---------------------------------------------------------------------------

const LINE_LABELS = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H'];

export interface SingleProbeResult {
  label: string;
  url: string;
  hostname: string;
  status: number | null;
  ok: boolean;
  ms: number;
  testing: boolean;
  error?: string;
}

export interface AllLinesProbeResult {
  lines: SingleProbeResult[];
  winner: SingleProbeResult | null;
  winnerIndex: number;
  fallbackIndex: number;
  dnsEnabled: boolean;
  dnsDiscoveredCount: number;
}

export interface ProbeCallbacks {
  onCandidatesReady?: (candidates: SingleProbeResult[]) => void;
  onLineResult?: (result: SingleProbeResult, index: number) => void;
}

function buildCandidateInfo(url: string, index: number): SingleProbeResult {
  const label = LINE_LABELS[index] || `${index + 1}`;
  let hostname = '';
  try { hostname = new URL(url).hostname; } catch { /* empty */ }
  return { label, url, hostname, status: null, ok: false, ms: 0, testing: true };
}

function localizeProbeError(raw: string, ms: number, timeout: number): string {
  const s = raw.toLowerCase();
  if (s.includes('abort') || s.includes('timed out') || ms >= timeout - 200) {
    return `连接超时(${Math.round(timeout / 1000)}s)`;
  }
  if (s.includes('failed to fetch') || s.includes('networkerror') || s.includes('network request failed')) {
    return '网络不可达';
  }
  if (s.includes('ssl') || s.includes('certificate') || s.includes('cert')) {
    return 'SSL证书错误';
  }
  if (s.includes('dns') || s.includes('getaddrinfo') || s.includes('not found') || s.includes('nodename nor servname')) {
    return '域名解析失败';
  }
  if (s.includes('refused') || s.includes('econnrefused')) {
    return '连接被拒绝';
  }
  if (s.includes('reset') || s.includes('econnreset')) {
    return '连接被重置';
  }
  if (s.includes('cors') || s.includes('cross-origin') || s.includes('access-control')) {
    return '跨域被拦截(CORS)';
  }
  return raw;
}

async function probeSingleLine(
  url: string,
  probePath: string,
  timeout: number,
): Promise<{ status: number | null; ok: boolean; ms: number; error?: string }> {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);
  const start = performance.now();

  try {
    const probeURL = appendQueryParams(
      new URL(probePath, url.endsWith('/') ? url : `${url}/`),
      { __probe: Date.now() },
    );
    const response = await fetch(probeURL.toString(), {
      cache: 'no-store',
      method: 'GET',
      signal: controller.signal,
    });
    const ms = Math.round(performance.now() - start);
    const ok = response.status >= 200 && response.status < 500;
    const error = ok ? undefined : `服务端错误(${response.status})`;
    return { status: response.status, ok, ms, error };
  } catch (err) {
    const ms = Math.round(performance.now() - start);
    const raw = err instanceof Error ? err.message : String(err);
    return { status: null, ok: false, ms, error: localizeProbeError(raw, ms, timeout) };
  } finally {
    clearTimeout(timeoutId);
  }
}

/**
 * 并行探测所有候选线路。
 * - onCandidatesReady: DNS 发现完成后、探测开始前通知所有候选（用于 UI 渲染占位）
 * - onLineResult: 每条线路探测完成时通知（用于 UI 实时更新）
 * - 探测完成后选择最快可用线路，全部失败则回退到第一条
 */
export async function probeAllLines(
  callbacks?: ProbeCallbacks,
): Promise<AllLinesProbeResult> {
  const staticCandidates = http.getBaseURLCandidates();

  // Web / 反代：非 localhost 直接用 window.location.origin，跳过所有探测
  if (typeof window !== 'undefined') {
    try {
      const origin = window.location.origin;
      if (origin && origin !== 'null' && /^https?:\/\//i.test(origin)) {
        const hostname = new URL(origin).hostname.trim().toLowerCase();
        const isLocal =
          hostname === 'localhost' ||
          hostname === '127.0.0.1' ||
          hostname === '0.0.0.0' ||
          hostname === '::1' ||
          hostname === '[::1]';

        if (!isLocal) {
          const normalizedOrigin = origin.trim().replace(/\/+$/, '');
          const matched = buildCandidateInfo(normalizedOrigin, 0);
          matched.status = 200;
          matched.ok = true;
          matched.ms = 0;
          matched.testing = false;

          const lines = [matched];
          callbacks?.onCandidatesReady?.(lines);
          callbacks?.onLineResult?.(matched, 0);
          http.forceSetBaseURL(normalizedOrigin);

          return {
            lines,
            winner: matched,
            winnerIndex: 0,
            fallbackIndex: 0,
            dnsEnabled: apiConfig.dnsEnabled,
            dnsDiscoveredCount: 0,
          };
        }
      }
    } catch { /* ignore */ }
  }

  const probePath = http.getBaseURLProbePath();
  const probeTimeout = http.getBaseURLProbeTimeout();

  // 1) 收集所有候选 URL（env 静态 + DNS 动态）—— 仅原生 App 走这条路径
  const allCandidates = [...staticCandidates];
  let dnsDiscoveredCount = 0;

  if (apiConfig.dnsEnabled && apiConfig.dnsDomains.length > 0) {
    try {
      const discovered = await discoverBaseURLs({
        domains: apiConfig.dnsDomains,
        dnsServers:
          apiConfig.dnsServers.length > 0 ? apiConfig.dnsServers : ['8.8.8.8', '1.1.1.1'],
        cloudUrl: apiConfig.dnsCloudUrl || undefined,
        dohTimeout: apiConfig.dnsDohTimeout,
        cloudTimeout: apiConfig.dnsCloudTimeout,
      });
      discovered.forEach((url) => {
        const normalized = url.trim().replace(/\/+$/, '');
        if (normalized && !allCandidates.includes(normalized)) {
          allCandidates.push(normalized);
        }
      });
      dnsDiscoveredCount = discovered.length;
    } catch {
      // DNS discovery failed, continue with static candidates
    }
  }

  if (allCandidates.length === 0) {
    return {
      lines: [],
      winner: null,
      winnerIndex: -1,
      fallbackIndex: -1,
      dnsEnabled: apiConfig.dnsEnabled,
      dnsDiscoveredCount: 0,
    };
  }

  // 2) 通知 UI 所有候选线路（testing 状态）
  const placeholders = allCandidates.map((url, i) => buildCandidateInfo(url, i));
  callbacks?.onCandidatesReady?.(placeholders);

  // 3) 并行探测所有线路
  const probePromises = allCandidates.map(async (url, index): Promise<SingleProbeResult> => {
    const info = placeholders[index];
    const probeResult = await probeSingleLine(url, probePath, probeTimeout);
    const result: SingleProbeResult = {
      ...info,
      ...probeResult,
      testing: false,
    };
    callbacks?.onLineResult?.(result, index);
    return result;
  });

  const lines = await Promise.all(probePromises);

  // 4) 按配置顺序选第一个可用的线路（优先级 > 速度）
  let winner: SingleProbeResult | null = null;
  let winnerIndex = -1;
  let fallbackIndex = 0;

  for (let i = 0; i < lines.length; i++) {
    if (lines[i].ok) {
      winner = lines[i];
      winnerIndex = i;
      break;
    }
  }

  // 5) 设置 baseURL：有可用的选第一个，全失败则回退到第一条
  if (winner) {
    http.forceSetBaseURL(winner.url);
  } else if (allCandidates.length > 0) {
    http.forceSetBaseURL(allCandidates[0]);
    fallbackIndex = 0;
  }

  return {
    lines,
    winner,
    winnerIndex,
    fallbackIndex,
    dnsEnabled: apiConfig.dnsEnabled,
    dnsDiscoveredCount,
  };
}

// ---------------------------------------------------------------------------
// 前端资源健康检查
// ---------------------------------------------------------------------------

export interface ResourceCheckItem {
  name: string;
  ok: boolean;
  detail: string;
}

export interface ResourceCheckResult {
  items: ResourceCheckItem[];
  allOk: boolean;
}

export async function checkFrontendResources(): Promise<ResourceCheckResult> {
  const items: ResourceCheckItem[] = [];

  // 1) CSS 样式表是否加载
  try {
    const sheets = document.styleSheets;
    const cssCount = sheets.length;
    const hasCss = cssCount > 0;
    let hasAppCss = false;
    try {
      for (let i = 0; i < sheets.length; i++) {
        const href = sheets[i].href || '';
        if (href.includes('/assets/') && href.endsWith('.css')) {
          hasAppCss = true;
          break;
        }
      }
    } catch { /* cross-origin sheets may throw */ }
    items.push({
      name: 'CSS样式',
      ok: hasCss && hasAppCss,
      detail: hasAppCss ? `${cssCount}个样式表已加载` : (hasCss ? `${cssCount}个样式表(无主样式)` : '未加载'),
    });
  } catch (e) {
    items.push({ name: 'CSS样式', ok: false, detail: String(e) });
  }

  // 2) JS 主入口是否执行（React root 已渲染）
  try {
    const root = document.getElementById('root');
    const hasChildren = root && root.children.length > 0;
    items.push({
      name: 'JS执行',
      ok: !!hasChildren,
      detail: hasChildren ? 'React已挂载' : (root ? 'root为空(可能白屏)' : 'root节点缺失'),
    });
  } catch (e) {
    items.push({ name: 'JS执行', ok: false, detail: String(e) });
  }

  // 3) localStorage 可用
  try {
    const testKey = '__health_check__';
    localStorage.setItem(testKey, '1');
    const v = localStorage.getItem(testKey);
    localStorage.removeItem(testKey);
    items.push({ name: '本地存储', ok: v === '1', detail: v === '1' ? '正常' : '读写异常' });
  } catch (e) {
    items.push({ name: '本地存储', ok: false, detail: '不可用: ' + String(e) });
  }

  // 4) 网络连接状态
  try {
    const online = navigator.onLine;
    items.push({ name: '网络状态', ok: online, detail: online ? '在线' : '离线' });
  } catch {
    items.push({ name: '网络状态', ok: false, detail: '无法检测' });
  }

  // 5) WebView / 环境信息
  try {
    const ua = navigator.userAgent || '';
    const isCapacitor = !!(window as any).Capacitor;
    const hasNativeBridge = !!(window as any).NativeBridge;
    const envParts: string[] = [];
    if (isCapacitor) envParts.push('Capacitor');
    if (hasNativeBridge) envParts.push('NativeBridge');
    if (/Android/i.test(ua)) envParts.push('Android');
    else if (/iPhone|iPad/i.test(ua)) envParts.push('iOS');
    else envParts.push('Web');
    items.push({ name: '运行环境', ok: true, detail: envParts.join(' + ') || 'Unknown' });
  } catch {
    items.push({ name: '运行环境', ok: true, detail: 'Unknown' });
  }

  // 6) 版本号
  try {
    const version = import.meta.env.VITE_APP_VERSION || '未知';
    items.push({ name: '应用版本', ok: true, detail: `v${version}` });
  } catch {
    items.push({ name: '应用版本', ok: true, detail: '未知' });
  }

  // 7) 全局错误捕获（检查最近是否有未捕获错误）
  try {
    const errors = (window as any).__capturedErrors as string[] | undefined;
    const hasErrors = errors && errors.length > 0;
    items.push({
      name: 'JS错误',
      ok: !hasErrors,
      detail: hasErrors ? `${errors.length}个: ${errors[errors.length - 1]}` : '无',
    });
  } catch {
    items.push({ name: 'JS错误', ok: true, detail: '无' });
  }

  return {
    items,
    allOk: items.every((item) => item.ok),
  };
}

// Legacy: simple probe info (still used by non-overlay callers)
export interface LineProbeResult extends BaseURLResolvedPayload {
  hostname: string;
  dnsEnabled: boolean;
  error?: string;
}

export async function probeLineInfo(): Promise<LineProbeResult> {
  try {
    const result = await http.eagerResolve();
    if (!result) {
      return {
        baseURL: apiConfig.baseURL || '(未配置)',
        line: 0,
        total: apiConfig.baseURLCandidates.length,
        hostname: '',
        dnsEnabled: apiConfig.dnsEnabled,
        error: '所有候选线路均不可达',
      };
    }

    let hostname = '';
    try {
      hostname = new URL(result.baseURL).hostname;
    } catch { /* empty */ }

    return {
      ...result,
      hostname,
      dnsEnabled: apiConfig.dnsEnabled,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return {
      baseURL: apiConfig.baseURL || '(未配置)',
      line: 0,
      total: apiConfig.baseURLCandidates.length,
      hostname: '',
      dnsEnabled: apiConfig.dnsEnabled,
      error: message || '线路解析异常',
    };
  }
}
