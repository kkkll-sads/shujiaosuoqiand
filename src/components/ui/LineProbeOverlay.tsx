import React, { useEffect, useRef, useState } from 'react';
import {
  Loader2, CheckCircle2, XCircle, Wifi, Zap, Monitor,
  AlertTriangle, RefreshCw, Globe, Shield, ChevronDown,
} from 'lucide-react';
import {
  probeAllLines,
  checkFrontendResources,
  type SingleProbeResult,
  type AllLinesProbeResult,
  type ResourceCheckResult,
} from '../../api/http';

type Phase = 'checking' | 'probing' | 'done';

interface ExtNetResult { ok: boolean; ms: number; error?: string }
interface PermItem { key: string; label: string; state: PermState }
type PermState = 'granted' | 'denied' | 'denied_permanent' | 'prompt' | 'unsupported' | 'checking';

interface NativeBridge {
  checkAppPermission(key: string): string;
  requestAppPermission(key: string, callbackId: string): void;
  goToAppSettings(): void;
}

interface LineProbeOverlayProps {
  autoCloseOnDone?: boolean;
  autoCloseDelayMs?: number;
  showOpenButtonWhenHidden?: boolean;
}

declare global {
  interface Window {
    NativeBridge?: NativeBridge;
    __onNativePermResult?: (callbackId: string, state: string) => void;
  }
}

const PERM_DEFS: { key: string; label: string }[] = [
  { key: 'location', label: '定位' },
  { key: 'camera', label: '相机' },
  { key: 'microphone', label: '麦克风' },
  { key: 'clipboard', label: '剪贴板' },
  { key: 'notifications', label: '通知' },
  { key: 'storage', label: '文件存储' },
];

const PERM_CFG: Record<PermState, { label: string; cls: string; action?: 'request' | 'settings' }> = {
  granted:          { label: '已授权', cls: 'text-green-600 bg-green-50 dark:text-green-400 dark:bg-green-900/20' },
  denied:           { label: '去授权', cls: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20', action: 'request' },
  denied_permanent: { label: '去设置', cls: 'text-red-600 bg-red-50 dark:text-red-400 dark:bg-red-900/20', action: 'settings' },
  prompt:           { label: '去授权', cls: 'text-blue-600 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20', action: 'request' },
  unsupported:      { label: '不支持', cls: 'text-gray-400 bg-gray-100 dark:text-gray-500 dark:bg-gray-700' },
  checking:         { label: '检查中', cls: 'text-blue-500 bg-blue-50 dark:text-blue-400 dark:bg-blue-900/20' },
};

/* ── Helpers ── */

async function checkExtNet(): Promise<ExtNetResult> {
  const t0 = Date.now();
  try {
    await fetch('https://www.baidu.com', {
      mode: 'no-cors', cache: 'no-store',
      signal: AbortSignal.timeout(5000),
    });
    return { ok: true, ms: Date.now() - t0 };
  } catch (e: any) {
    return { ok: false, ms: Date.now() - t0, error: e?.message ?? String(e) };
  }
}

function checkPermNative(key: string): PermState {
  try {
    const state = window.NativeBridge!.checkAppPermission(key);
    if (state === 'granted' || state === 'denied' || state === 'denied_permanent' || state === 'prompt') {
      return state;
    }
    return 'unsupported';
  } catch { return 'unsupported'; }
}

async function checkPermWeb(key: string): Promise<PermState> {
  const webName = key === 'location' ? 'geolocation'
    : key === 'storage' ? 'persistent-storage'
    : key === 'clipboard' ? 'clipboard-read'
    : key;
  try {
    return (await navigator.permissions.query({ name: webName as PermissionName })).state as PermState;
  } catch { return 'unsupported'; }
}

async function checkAllPerms(): Promise<PermItem[]> {
  const hasNative = !!window.NativeBridge?.checkAppPermission;
  return Promise.all(PERM_DEFS.map(async (d) => ({
    ...d,
    state: hasNative ? checkPermNative(d.key) : await checkPermWeb(d.key),
  })));
}

function requestPermNative(key: string): Promise<PermState> {
  return new Promise(resolve => {
    const bridge = window.NativeBridge;
    if (!bridge?.requestAppPermission) { resolve('unsupported'); return; }

    const cbId = `perm_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const timeout = setTimeout(() => {
      delete window.__onNativePermResult;
      resolve('unsupported');
    }, 30000);

    window.__onNativePermResult = (id, state) => {
      if (id !== cbId) return;
      clearTimeout(timeout);
      delete window.__onNativePermResult;
      resolve(state as PermState);
    };
    bridge.requestAppPermission(key, cbId);
  });
}

/* ── Component ── */

export const LineProbeOverlay: React.FC<LineProbeOverlayProps> = ({
  autoCloseOnDone = false,
  autoCloseDelayMs = 1200,
  showOpenButtonWhenHidden = false,
}) => {
  const [phase, setPhase] = useState<Phase>('checking');
  const [isOpen, setIsOpen] = useState(true);
  const [lines, setLines] = useState<SingleProbeResult[]>([]);
  const [result, setResult] = useState<AllLinesProbeResult | null>(null);
  const [resources, setResources] = useState<ResourceCheckResult | null>(null);
  const [extNet, setExtNet] = useState<ExtNetResult | null>(null);
  const [perms, setPerms] = useState<PermItem[]>(PERM_DEFS.map(d => ({ ...d, state: 'checking' as const })));
  const [elapsed, setElapsed] = useState(0);
  const [runId, setRunId] = useState(0);
  const [lastAutoClosedRunId, setLastAutoClosedRunId] = useState<number | null>(null);
  const [resExpanded, setResExpanded] = useState(false);
  const startRef = useRef(Date.now());

  useEffect(() => {
    startRef.current = Date.now();
    const timer = setInterval(() => setElapsed(Date.now() - startRef.current), 100);
    let stale = false;

    (async () => {
      const [resCheck, extResult, permsResult] = await Promise.all([
        checkFrontendResources(),
        checkExtNet(),
        checkAllPerms(),
      ]);
      if (stale) return;

      setResources(resCheck);
      setResExpanded(!resCheck.allOk);
      setExtNet(extResult);
      setPerms(permsResult);
      setPhase('probing');

      const probeRes = await probeAllLines({
        onCandidatesReady: (c) => { if (!stale) setLines([...c]); },
        onLineResult: (item, idx) => {
          if (!stale) setLines(prev => prev.map((o, i) => (i === idx ? item : o)));
        },
      }).catch((): AllLinesProbeResult => ({
        lines: [], winner: null, winnerIndex: -1, fallbackIndex: -1,
        dnsEnabled: false, dnsDiscoveredCount: 0,
      }));

      if (stale) return;
      clearInterval(timer);
      setElapsed(Date.now() - startRef.current);
      if (probeRes.lines.length > 0) setLines(probeRes.lines);
      setResult(probeRes);
      setPhase('done');
    })();

    return () => { stale = true; clearInterval(timer); };
  }, [runId]);

  const handleRefresh = () => {
    setIsOpen(true);
    setPhase('checking');
    setLines([]);
    setResult(null);
    setResources(null);
    setExtNet(null);
    setResExpanded(false);
    setPerms(PERM_DEFS.map(d => ({ ...d, state: 'checking' as const })));
    setRunId(n => n + 1);
  };

  const handlePermTap = async (index: number) => {
    const p = perms[index];
    const cfg = PERM_CFG[p.state];
    if (!cfg.action) return;

    if (cfg.action === 'settings') {
      window.NativeBridge?.goToAppSettings();
      return;
    }

    setPerms(prev => prev.map((item, i) => i === index ? { ...item, state: 'checking' as const } : item));

    let newState: PermState;
    if (window.NativeBridge?.requestAppPermission) {
      newState = await requestPermNative(p.key);
    } else {
      newState = await checkPermWeb(p.key);
    }
    setPerms(prev => prev.map((item, i) => i === index ? { ...item, state: newState } : item));
  };

  const winner = result?.winner;
  const linesDone = phase === 'done';
  const hasLineError = linesDone && !winner;
  const hasResError = resources != null && !resources.allOk;
  const hasExtNetError = extNet != null && !extNet.ok;
  const fallbackLine = hasLineError && result && result.fallbackIndex >= 0
    ? result.lines[result.fallbackIndex] : null;
  const isRunning = phase !== 'done';
  const permsDone = !perms.some(p => p.state === 'checking');
  const deniedCount = perms.filter(p => p.state === 'denied' || p.state === 'denied_permanent').length;
  const promptCount = perms.filter(p => p.state === 'prompt').length;
  const hasAttention = hasLineError || hasResError || hasExtNetError || deniedCount > 0;

  useEffect(() => {
    if (!autoCloseOnDone || phase !== 'done' || lastAutoClosedRunId === runId) {
      return undefined;
    }

    const timer = window.setTimeout(() => {
      setIsOpen(false);
      setLastAutoClosedRunId(runId);
    }, autoCloseDelayMs);

    return () => {
      window.clearTimeout(timer);
    };
  }, [autoCloseDelayMs, autoCloseOnDone, lastAutoClosedRunId, phase, runId]);

  if (!isOpen) {
    if (!showOpenButtonWhenHidden) {
      return null;
    }

    return (
      <div className="fixed bottom-6 right-4 z-200 pointer-events-none">
        <button
          type="button"
          onClick={() => setIsOpen(true)}
          className="pointer-events-auto inline-flex items-center gap-2 rounded-full border border-black/5 bg-white px-3.5 py-2 shadow-lg active:opacity-90"
        >
          {isRunning ? (
            <Loader2 size={14} className="shrink-0 text-blue-500 animate-spin" />
          ) : hasAttention ? (
            <AlertTriangle size={14} className="shrink-0 text-amber-500" />
          ) : (
            <CheckCircle2 size={14} className="shrink-0 text-green-500" />
          )}
          <span className="text-sm font-medium text-gray-700">应用诊断</span>
          <span
            className={`text-xs ${
              isRunning
                ? 'text-blue-500'
                : hasAttention
                  ? 'text-amber-600'
                  : 'text-green-600'
            }`}
          >
            {isRunning ? '检测中' : hasAttention ? '异常' : '正常'}
          </span>
        </button>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 z-200 flex items-center justify-center pointer-events-none">
      <div className="pointer-events-auto bg-white dark:bg-gray-800 rounded-2xl shadow-2xl w-[320px] max-h-[80vh] overflow-hidden animate-in zoom-in-95 fade-in duration-200 flex flex-col">

        {/* ── Header ── */}
        <div className={`px-4 py-3 flex items-center gap-2.5 shrink-0 ${
          linesDone
            ? (hasLineError || hasResError || hasExtNetError)
              ? 'bg-linear-to-r from-orange-500 to-red-500'
              : 'bg-linear-to-r from-green-500 to-green-600'
            : 'bg-linear-to-r from-blue-500 to-blue-600'
        }`}>
          <Wifi size={18} className="text-white shrink-0" />
          <span className="text-white font-semibold text-sm">应用诊断</span>
          <span className="ml-auto text-white/70 text-xs">{(elapsed / 1000).toFixed(1)}s</span>
          <button
            onClick={handleRefresh}
            disabled={isRunning}
            className="p-1 -mr-1 rounded-full hover:bg-white/20 transition-colors disabled:opacity-40"
          >
            <RefreshCw size={14} className={`text-white ${isRunning ? 'animate-spin' : ''}`} />
          </button>
        </div>

        <div className="overflow-y-auto flex-1">

          {/* ── 前端资源（正常时折叠） ── */}
          <div className="px-4 pt-3 pb-2">
            <button
              type="button"
              className="flex items-center gap-1.5 mb-2 w-full text-left"
              onClick={() => resources && setResExpanded(v => !v)}
            >
              <Monitor size={13} className="text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">前端资源</span>
              {resources && (
                <>
                  {resources.allOk
                    ? <CheckCircle2 size={13} className="text-green-500 ml-auto" />
                    : <AlertTriangle size={13} className="text-amber-500 ml-auto" />}
                  <ChevronDown
                    size={13}
                    className={`text-gray-400 transition-transform duration-200 ${resExpanded ? 'rotate-180' : ''}`}
                  />
                </>
              )}
            </button>

            {!resources ? (
              <div className="flex items-center gap-2 py-2 justify-center">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-xs text-gray-400">检查中...</span>
              </div>
            ) : resources.allOk && !resExpanded ? (
              <div className="text-xs text-green-600 dark:text-green-400 py-0.5">
                {resources.items.length}项资源全部正常
              </div>
            ) : resExpanded ? (
              <div className="space-y-0.5">
                {resources.items.map(item => (
                  <div key={item.name} className="flex items-center gap-2 text-xs py-0.5">
                    {item.ok
                      ? <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                      : <XCircle size={12} className="text-red-500 shrink-0" />}
                    <span className="text-gray-600 dark:text-gray-400 w-14 shrink-0">{item.name}</span>
                    <span className={`flex-1 truncate ${item.ok ? 'text-gray-500' : 'text-red-500 font-medium'}`}>
                      {item.detail}
                    </span>
                  </div>
                ))}
              </div>
            ) : null}
          </div>

          <div className="mx-4 border-t border-gray-100 dark:border-gray-700" />

          {/* ── 外网检测 ── */}
          <div className="px-4 pt-2 pb-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Globe size={13} className="text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">外网检测</span>
              {extNet && (
                extNet.ok
                  ? <CheckCircle2 size={13} className="text-green-500 ml-auto" />
                  : <XCircle size={13} className="text-red-500 ml-auto" />
              )}
            </div>
            {!extNet ? (
              <div className="flex items-center gap-2 py-1.5 justify-center">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-xs text-gray-400">检测 baidu.com ...</span>
              </div>
            ) : (
              <div className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs ${
                extNet.ok ? 'bg-green-50 dark:bg-green-900/10' : 'bg-red-50 dark:bg-red-900/10'
              }`}>
                {extNet.ok
                  ? <CheckCircle2 size={12} className="text-green-500 shrink-0" />
                  : <XCircle size={12} className="text-red-500 shrink-0" />}
                <span className="text-gray-700 dark:text-gray-300">baidu.com</span>
                <span className={`ml-auto font-mono ${extNet.ok ? 'text-green-600' : 'text-red-500'}`}>
                  {extNet.ok ? `${extNet.ms}ms` : '不可达'}
                </span>
              </div>
            )}
          </div>

          <div className="mx-4 border-t border-gray-100 dark:border-gray-700" />

          {/* ── 线路检测 ── */}
          <div className="px-4 pt-2 pb-2">
            <div className="flex items-center gap-1.5 mb-2">
              <Wifi size={13} className="text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">线路检测</span>
              {linesDone && (
                winner
                  ? <CheckCircle2 size={13} className="text-green-500 ml-auto" />
                  : <XCircle size={13} className="text-red-500 ml-auto" />
              )}
            </div>

            {lines.length === 0 && phase !== 'done' && (
              <div className="flex items-center gap-2 py-2 justify-center">
                <Loader2 className="w-4 h-4 text-blue-500 animate-spin" />
                <span className="text-xs text-gray-400">
                  {phase === 'checking' ? '等待资源检查...' : '正在发现线路...'}
                </span>
              </div>
            )}

            <div className="space-y-1">
              {lines.map((line, i) => {
                const isWinner = linesDone && result?.winnerIndex === i;
                const isFallback = linesDone && !winner && result?.fallbackIndex === i;
                return (
                  <div
                    key={`${line.label}-${line.url}`}
                    className={`flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-xs transition-all ${
                      isWinner
                        ? 'bg-green-50 dark:bg-green-900/20 ring-1 ring-green-400'
                        : isFallback
                          ? 'bg-amber-50 dark:bg-amber-900/20 ring-1 ring-amber-400'
                          : line.testing
                            ? 'bg-blue-50 dark:bg-blue-900/10'
                            : line.ok
                              ? 'bg-gray-50 dark:bg-gray-700/30'
                              : 'bg-red-50 dark:bg-red-900/10'
                    }`}
                  >
                    <span className={`w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold shrink-0 ${
                      isWinner ? 'bg-green-500 text-white'
                        : isFallback ? 'bg-amber-500 text-white'
                        : line.testing ? 'bg-blue-400 text-white'
                        : line.ok ? 'bg-gray-300 dark:bg-gray-600 text-white'
                        : 'bg-red-400 text-white'
                    }`}>
                      {line.label}
                    </span>
                    <span className="flex-1 truncate text-gray-700 dark:text-gray-300">
                      {line.hostname}
                    </span>

                    {line.testing ? (
                      <Loader2 className="w-3.5 h-3.5 text-blue-500 animate-spin shrink-0" />
                    ) : line.ok ? (
                      <div className="flex items-center gap-1 shrink-0">
                        {isWinner && <Zap className="w-3 h-3 text-green-500" />}
                        <span className={`font-mono ${isWinner ? 'text-green-600 font-bold' : 'text-green-500'}`}>
                          {line.status}
                        </span>
                        <span className="text-gray-400 font-mono">{line.ms}ms</span>
                      </div>
                    ) : (
                      <div className="flex flex-col items-end gap-0.5 shrink-0 max-w-[55%]">
                        <div className="flex items-center gap-1">
                          <XCircle className="w-3 h-3 text-red-400" />
                          <span className="text-red-400">{line.status ? `${line.status}` : '失败'}</span>
                          <span className="text-gray-400 font-mono">{line.ms}ms</span>
                          {isFallback && <span className="text-amber-500 text-xs">回退</span>}
                        </div>
                        {line.error && (
                          <span className="text-red-400/70 text-2xs leading-tight truncate w-full text-right">
                            {line.error}
                          </span>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="mx-4 border-t border-gray-100 dark:border-gray-700" />

          {/* ── 权限检测 ── */}
          <div className="px-4 pt-2 pb-3">
            <div className="flex items-center gap-1.5 mb-2">
              <Shield size={13} className="text-gray-500" />
              <span className="text-xs font-semibold text-gray-500 uppercase tracking-wide">权限检测</span>
              {permsDone && (
                deniedCount > 0
                  ? <span className="ml-auto text-xs text-red-500">{deniedCount}项拒绝</span>
                  : promptCount > 0
                    ? <span className="ml-auto text-xs text-blue-500">{promptCount}项待授权</span>
                    : <CheckCircle2 size={13} className="text-green-500 ml-auto" />
              )}
            </div>
            <div className="grid grid-cols-2 gap-1">
              {perms.map((p, idx) => {
                const cfg = PERM_CFG[p.state];
                const canTap = !!cfg.action;
                return (
                  <button
                    key={p.key}
                    type="button"
                    disabled={!canTap}
                    onClick={() => canTap && handlePermTap(idx)}
                    className={`flex items-center gap-1.5 rounded-md px-2 py-1.5 text-xs bg-gray-50 dark:bg-gray-700/30 text-left transition-colors ${
                      canTap ? 'active:bg-gray-100 dark:active:bg-gray-600/40 cursor-pointer' : ''
                    }`}
                  >
                    <span className="text-gray-600 dark:text-gray-400 flex-1 truncate">{p.label}</span>
                    {p.state === 'checking' ? (
                      <Loader2 className="w-3 h-3 text-blue-500 animate-spin shrink-0" />
                    ) : (
                      <span className={`px-1.5 py-0.5 rounded text-2xs font-medium leading-none shrink-0 ${cfg.cls}`}>
                        {cfg.label}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* ── Bottom ── */}
        {linesDone && (
          <div className="px-4 pb-3 shrink-0 space-y-2 border-t border-gray-100 dark:border-gray-700 pt-2">
            {winner ? (
              <div className="flex items-center gap-2 rounded-lg bg-green-50 dark:bg-green-900/20 px-3 py-1.5">
                <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />
                <div className="flex-1 min-w-0">
                  <span className="text-xs font-semibold text-green-700 dark:text-green-300">
                    已选择线路 {winner.label}
                  </span>
                  <span className="text-xs text-green-600/70 ml-1">
                    {winner.hostname} · {winner.ms}ms
                  </span>
                </div>
              </div>
            ) : fallbackLine ? (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <div className="text-xs font-semibold text-amber-700 dark:text-amber-300">
                      所有线路检测失败，已回退到线路 {fallbackLine.label}
                    </div>
                    <div className="text-xs text-amber-600/70">
                      {fallbackLine.hostname}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-1.5">
                <XCircle className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-xs font-semibold text-red-700 dark:text-red-300">
                  无可用线路，请检查网络
                </span>
              </div>
            )}

            {hasResError && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5">
                <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-amber-700">
                  部分前端资源异常，可能导致白屏
                </span>
              </div>
            )}

            {hasExtNetError && (
              <div className="flex items-center gap-2 rounded-lg bg-red-50 dark:bg-red-900/20 px-3 py-1.5">
                <Globe className="w-4 h-4 text-red-500 shrink-0" />
                <span className="text-xs font-semibold text-red-700">
                  外网不可达，请检查网络连接
                </span>
              </div>
            )}

            {deniedCount > 0 && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 dark:bg-amber-900/20 px-3 py-1.5">
                <Shield className="w-4 h-4 text-amber-500 shrink-0" />
                <span className="text-xs font-semibold text-amber-700">
                  {deniedCount}项权限被拒绝，部分功能可能受限
                </span>
              </div>
            )}

            <div className="flex items-center justify-between text-xs text-gray-400 px-1">
              <span>{result ? `${result.lines.length}条线路` : ''}</span>
              <span>DNS: {result?.dnsEnabled ? `发现${result.dnsDiscoveredCount}条` : '未启用'}</span>
            </div>

            <button
              className={`w-full h-9 rounded-xl text-white text-sm font-medium transition-colors ${
                winner ? 'bg-green-500 active:bg-green-600'
                  : fallbackLine ? 'bg-amber-500 active:bg-amber-600'
                  : 'bg-red-500 active:bg-red-600'
              }`}
              onClick={() => setIsOpen(false)}
            >
              {showOpenButtonWhenHidden ? '关闭' : '确定'}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
