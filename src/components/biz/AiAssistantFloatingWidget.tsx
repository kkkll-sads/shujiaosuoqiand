import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type MouseEvent as ReactMouseEvent,
  type RefObject,
  type TouchEvent as ReactTouchEvent,
} from 'react';
import { Sparkles, X } from 'lucide-react';
import { aiChatApi, type AiChatConfig } from '../../api/modules/aiChat';
import { useAuthSession } from '../../hooks/useAuthSession';
import { useRequest } from '../../hooks/useRequest';
import { useAppNavigate } from '../../lib/navigation';

type WidgetSide = 'left' | 'right';

interface StoredWidgetState {
  hidden: boolean;
  side: WidgetSide;
  top: number;
}

interface WidgetPosition {
  left: number;
  top: number;
  side: WidgetSide;
}

interface DragState {
  active: boolean;
  startX: number;
  startY: number;
  originLeft: number;
  originTop: number;
  moved: boolean;
}

interface AiAssistantFloatingWidgetProps {
  containerRef: RefObject<HTMLDivElement | null>;
  pathname: string;
}

const STORAGE_KEY = 'ai-assistant:floating-widget:v1';
const DRAFT_STORAGE_KEY = 'ai-chat:draft';
const EDGE_MARGIN = 12;
const ICON_SIZE = 60;
const TOP_MARGIN = 84;
const BOTTOM_MARGIN = 112;
const HIDDEN_PILL_WIDTH = 22;
const HIDDEN_PILL_HEIGHT = 58;
const PANEL_MAX_WIDTH = 320;
const PANEL_MIN_WIDTH = 248;
const PANEL_GAP = 14;

const HIDDEN_EXACT_PATHS = new Set([
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/change-password',
  '/change-pay-password',
  '/reset-pay-password',
  '/support/ai',
  '/support/chat',
  '/cashier',
  '/payment/result',
]);

const HIDDEN_PATH_PATTERNS = [
  /^\/live(\/|$)/,
];

function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max);
}

function readStoredWidgetState(): StoredWidgetState {
  if (typeof window === 'undefined') {
    return {
      hidden: false,
      side: 'right',
      top: Number.POSITIVE_INFINITY,
    };
  }

  try {
    const rawValue = window.localStorage.getItem(STORAGE_KEY);
    if (!rawValue) {
      return {
        hidden: false,
        side: 'right',
        top: Number.POSITIVE_INFINITY,
      };
    }

    const parsedValue = JSON.parse(rawValue) as Partial<StoredWidgetState>;
    return {
      hidden: Boolean(parsedValue.hidden),
      side: parsedValue.side === 'left' ? 'left' : 'right',
      top: Number.isFinite(parsedValue.top) ? Number(parsedValue.top) : Number.POSITIVE_INFINITY,
    };
  } catch {
    return {
      hidden: false,
      side: 'right',
      top: Number.POSITIVE_INFINITY,
    };
  }
}

function writeStoredWidgetState(state: StoredWidgetState) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    /* 忽略本地存储异常 */
  }
}

function writeAiDraft(value: string) {
  if (typeof window === 'undefined') {
    return;
  }

  try {
    window.sessionStorage.setItem(DRAFT_STORAGE_KEY, JSON.stringify(value));
  } catch {
    /* 忽略本地存储异常 */
  }
}

function shouldHideByPath(pathname: string) {
  if (HIDDEN_EXACT_PATHS.has(pathname)) {
    return true;
  }

  return HIDDEN_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

function isEditableTarget(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) {
    return false;
  }

  const tagName = target.tagName.toLowerCase();
  if (tagName === 'input' || tagName === 'textarea' || tagName === 'select') {
    return true;
  }

  return target.isContentEditable || Boolean(target.closest('[contenteditable="true"]'));
}

function MascotAvatar({ compact = false }: { compact?: boolean }) {
  const shellClassName = compact ? 'h-11 w-11 rounded-[16px]' : 'h-14 w-14 rounded-[20px]';
  const faceClassName = compact
    ? 'left-1/2 top-[7px] h-[16px] w-[16px]'
    : 'left-1/2 top-[9px] h-[22px] w-[22px]';
  const eyeClassName = compact ? 'h-[3px] w-[3px]' : 'h-[4px] w-[4px]';
  const badgeClassName = compact
    ? 'bottom-[5px] px-1.5 py-[2px] text-[7px]'
    : 'bottom-[7px] px-2 py-[3px] text-[8px]';

  return (
    <div className={`relative ${compact ? 'h-11 w-11' : 'h-14 w-14'}`}>
      <div className={`absolute inset-0 rotate-[8deg] bg-[linear-gradient(155deg,#ffad7d_0%,#ff775d_44%,#ff5d57_100%)] shadow-[0_12px_24px_rgba(255,99,71,0.24)] ${shellClassName}`} />
      <div className={`absolute inset-0 overflow-hidden border border-white/55 bg-[radial-gradient(circle_at_28%_22%,rgba(255,255,255,0.95),rgba(255,255,255,0.26)_28%,transparent_29%),linear-gradient(165deg,rgba(255,255,255,0.28),rgba(255,255,255,0.06)_48%,rgba(115,36,18,0.14)_100%)] shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] ${shellClassName}`}>
        <div className="absolute inset-x-[6px] top-[4px] h-[10px] rounded-full bg-white/20 blur-[1px]" />
        <div className={`absolute -translate-x-1/2 rounded-full border border-white/60 bg-[#fff9f5] shadow-[0_4px_10px_rgba(255,255,255,0.35)] ${faceClassName}`}>
          <div className={`absolute left-[28%] top-[38%] rounded-full bg-[#ff705b] ${eyeClassName}`} />
          <div className={`absolute right-[28%] top-[38%] rounded-full bg-[#ff705b] ${eyeClassName}`} />
          <div className={`absolute left-1/2 top-[60%] -translate-x-1/2 rounded-full border border-[#ff8d73] border-t-0 bg-[#fff0e8] ${compact ? 'h-[4px] w-[8px]' : 'h-[5px] w-[10px]'}`} />
        </div>
        <div className={`absolute left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full border border-white/70 bg-white/88 font-semibold tracking-[0.12em] text-[#ff6a57] shadow-[0_4px_10px_rgba(255,255,255,0.26)] ${badgeClassName}`}>
          <Sparkles size={compact ? 7 : 8} />
          <span>AI</span>
        </div>
      </div>
      <div className={`absolute flex items-center justify-center rounded-full border border-white/70 bg-[#fff5ef] text-[#ff6b57] shadow-sm ${compact ? '-right-1 -top-1 h-4 w-4' : '-right-1 -top-1 h-5 w-5'}`}>
        <div className={`rounded-full bg-[#ff8e74] ${compact ? 'h-[4px] w-[4px]' : 'h-[5px] w-[5px]'}`} />
      </div>
    </div>
  );
}

export const AiAssistantFloatingWidget = ({
  containerRef,
  pathname,
}: AiAssistantFloatingWidgetProps) => {
  const { goTo } = useAppNavigate();
  const { isAuthenticated } = useAuthSession();
  const [panelOpen, setPanelOpen] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [position, setPosition] = useState<WidgetPosition | null>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [containerHeight, setContainerHeight] = useState(0);
  const [panelSize, setPanelSize] = useState({ width: PANEL_MAX_WIDTH, height: 320 });
  const [keyboardActive, setKeyboardActive] = useState(false);
  const panelRef = useRef<HTMLDivElement | null>(null);
  const dragStateRef = useRef<DragState>({
    active: false,
    startX: 0,
    startY: 0,
    originLeft: 0,
    originTop: 0,
    moved: false,
  });
  const suppressClickRef = useRef(false);
  const initializedRef = useRef(false);

  const configRequest = useRequest((signal) => aiChatApi.getConfig(signal), {
    cacheKey: 'ai-chat:config',
  });

  const config = configRequest.data as AiChatConfig | undefined;
  const quickPrompts = useMemo(
    () => config?.suggestionPrompts.slice(0, 3) ?? [],
    [config?.suggestionPrompts],
  );

  const statusText = useMemo(() => {
    if (configRequest.loading && !config) {
      return '加载中';
    }

    if (configRequest.error && !config) {
      return '待重试';
    }

    if (!config?.enabled) {
      return '未启用';
    }

    if (!config.configured) {
      return '待配置';
    }

    return isAuthenticated ? '可使用' : '需登录';
  }, [config, configRequest.error, configRequest.loading, isAuthenticated]);

  const usageHint = useMemo(() => {
    if (configRequest.loading && !config) {
      return '正在准备 AI 助手能力...';
    }

    if (configRequest.error && !config) {
      return '当前无法读取 AI 配置，点击后仍可进入 AI 页面重试。';
    }

    if (!config?.enabled) {
      return 'AI 助手当前未启用。';
    }

    if (!config.configured) {
      return 'AI 助手暂时不可用，请稍后再试。';
    }

    return config.description || '支持快捷提问、常见问题咨询与连续对话。';
  }, [config, configRequest.error, configRequest.loading]);

  const updatePositionFromContainer = useCallback((storedState?: StoredWidgetState) => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    const nextStoredState = storedState ?? readStoredWidgetState();
    const width = container.clientWidth;
    const height = container.clientHeight;
    const maxLeft = Math.max(EDGE_MARGIN, width - ICON_SIZE - EDGE_MARGIN);
    const maxTop = Math.max(TOP_MARGIN, height - BOTTOM_MARGIN - ICON_SIZE);
    const top = clamp(nextStoredState.top, TOP_MARGIN, maxTop);

    setContainerWidth(width);
    setContainerHeight(height);
    setPosition({
      left: nextStoredState.side === 'left' ? EDGE_MARGIN : maxLeft,
      top,
      side: nextStoredState.side,
    });

    if (!initializedRef.current) {
      setHidden(nextStoredState.hidden);
      initializedRef.current = true;
    }
  }, [containerRef]);

  useEffect(() => {
    const measure = () => {
      window.requestAnimationFrame(() => {
        updatePositionFromContainer();
      });
    };

    measure();

    const container = containerRef.current;
    if (!container) {
      return undefined;
    }

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(() => {
        measure();
      });
      observer.observe(container);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [containerRef, updatePositionFromContainer]);

  useEffect(() => {
    if (!position) {
      return;
    }

    writeStoredWidgetState({
      hidden,
      side: position.side,
      top: position.top,
    });
  }, [hidden, position]);

  useEffect(() => {
    setPanelOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!panelOpen) {
      return;
    }

    if (shouldHideByPath(pathname) || keyboardActive) {
      setPanelOpen(false);
    }
  }, [keyboardActive, panelOpen, pathname]);

  useEffect(() => {
    if (!panelOpen || !panelRef.current) {
      return undefined;
    }

    const element = panelRef.current;
    const measure = () => {
      setPanelSize({
        width: element.offsetWidth || PANEL_MAX_WIDTH,
        height: element.offsetHeight || 320,
      });
    };

    measure();

    if (typeof ResizeObserver === 'function') {
      const observer = new ResizeObserver(measure);
      observer.observe(element);
      return () => observer.disconnect();
    }

    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [panelOpen]);

  useEffect(() => {
    let blurTimer = 0;

    const handleFocusIn = (event: FocusEvent) => {
      if (isEditableTarget(event.target)) {
        setKeyboardActive(true);
      }
    };

    const handleFocusOut = (event: FocusEvent) => {
      if (!isEditableTarget(event.target)) {
        return;
      }

      window.clearTimeout(blurTimer);
      blurTimer = window.setTimeout(() => {
        setKeyboardActive(false);
      }, 120);
    };

    document.addEventListener('focusin', handleFocusIn);
    document.addEventListener('focusout', handleFocusOut);

    return () => {
      document.removeEventListener('focusin', handleFocusIn);
      document.removeEventListener('focusout', handleFocusOut);
      window.clearTimeout(blurTimer);
    };
  }, []);

  const finishDrag = useCallback(() => {
    const container = containerRef.current;
    const currentPosition = position;
    if (!container || !currentPosition) {
      dragStateRef.current.active = false;
      return;
    }

    const width = container.clientWidth;
    const maxLeft = Math.max(EDGE_MARGIN, width - ICON_SIZE - EDGE_MARGIN);
    const nextSide: WidgetSide =
      currentPosition.left + ICON_SIZE / 2 <= width / 2 ? 'left' : 'right';

    setPosition({
      left: nextSide === 'left' ? EDGE_MARGIN : maxLeft,
      top: currentPosition.top,
      side: nextSide,
    });

    if (dragStateRef.current.moved) {
      suppressClickRef.current = true;
      window.setTimeout(() => {
        suppressClickRef.current = false;
      }, 0);
    }

    dragStateRef.current.active = false;
  }, [containerRef, position]);

  useEffect(() => {
    const handleMouseMove = (event: MouseEvent) => {
      if (!dragStateRef.current.active) {
        return;
      }

      const container = containerRef.current;
      if (!container) {
        return;
      }

      const width = container.clientWidth;
      const height = container.clientHeight;
      const maxLeft = Math.max(EDGE_MARGIN, width - ICON_SIZE - EDGE_MARGIN);
      const maxTop = Math.max(TOP_MARGIN, height - BOTTOM_MARGIN - ICON_SIZE);
      const nextLeft = clamp(
        dragStateRef.current.originLeft + (event.clientX - dragStateRef.current.startX),
        EDGE_MARGIN,
        maxLeft,
      );
      const nextTop = clamp(
        dragStateRef.current.originTop + (event.clientY - dragStateRef.current.startY),
        TOP_MARGIN,
        maxTop,
      );

      if (
        Math.abs(event.clientX - dragStateRef.current.startX) > 4
        || Math.abs(event.clientY - dragStateRef.current.startY) > 4
      ) {
        dragStateRef.current.moved = true;
      }

      setPosition({
        left: nextLeft,
        top: nextTop,
        side: nextLeft + ICON_SIZE / 2 <= width / 2 ? 'left' : 'right',
      });
    };

    const handleTouchMove = (event: TouchEvent) => {
      if (!dragStateRef.current.active) {
        return;
      }

      const touch = event.touches[0];
      if (!touch) {
        return;
      }

      event.preventDefault();
      const container = containerRef.current;
      if (!container) {
        return;
      }

      const width = container.clientWidth;
      const height = container.clientHeight;
      const maxLeft = Math.max(EDGE_MARGIN, width - ICON_SIZE - EDGE_MARGIN);
      const maxTop = Math.max(TOP_MARGIN, height - BOTTOM_MARGIN - ICON_SIZE);
      const nextLeft = clamp(
        dragStateRef.current.originLeft + (touch.clientX - dragStateRef.current.startX),
        EDGE_MARGIN,
        maxLeft,
      );
      const nextTop = clamp(
        dragStateRef.current.originTop + (touch.clientY - dragStateRef.current.startY),
        TOP_MARGIN,
        maxTop,
      );

      if (
        Math.abs(touch.clientX - dragStateRef.current.startX) > 4
        || Math.abs(touch.clientY - dragStateRef.current.startY) > 4
      ) {
        dragStateRef.current.moved = true;
      }

      setPosition({
        left: nextLeft,
        top: nextTop,
        side: nextLeft + ICON_SIZE / 2 <= width / 2 ? 'left' : 'right',
      });
    };

    const handleMouseUp = () => {
      finishDrag();
    };

    const handleTouchEnd = () => {
      finishDrag();
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
  }, [containerRef, finishDrag]);

  const handleDragStart = useCallback((clientX: number, clientY: number) => {
    if (!position) {
      return;
    }

    setPanelOpen(false);
    dragStateRef.current = {
      active: true,
      startX: clientX,
      startY: clientY,
      originLeft: position.left,
      originTop: position.top,
      moved: false,
    };
  }, [position]);

  const handleMouseDown = useCallback((event: ReactMouseEvent<HTMLButtonElement>) => {
    if (event.button !== 0) {
      return;
    }

    handleDragStart(event.clientX, event.clientY);
  }, [handleDragStart]);

  const handleTouchStart = useCallback((event: ReactTouchEvent<HTMLButtonElement>) => {
    const touch = event.touches[0];
    if (!touch) {
      return;
    }

    handleDragStart(touch.clientX, touch.clientY);
  }, [handleDragStart]);

  const handleTogglePanel = useCallback(() => {
    if (suppressClickRef.current) {
      return;
    }

    setPanelOpen((current) => !current);
  }, []);

  const handleOpenAiAssistant = useCallback((prompt?: string) => {
    if (prompt) {
      writeAiDraft(prompt);
    }

    setPanelOpen(false);
    goTo('ai_assistant');
  }, [goTo]);

  const handleHide = useCallback(() => {
    setPanelOpen(false);
    setHidden(true);
  }, []);

  const handleRestore = useCallback(() => {
    setHidden(false);
  }, []);

  const hiddenByPath = shouldHideByPath(pathname);
  if (!position || hiddenByPath || keyboardActive) {
    return null;
  }

  const panelWidth = clamp(containerWidth - EDGE_MARGIN * 2, PANEL_MIN_WIDTH, PANEL_MAX_WIDTH);
  const iconCenterY = position.top + ICON_SIZE / 2;
  const availableRight = containerWidth - (position.left + ICON_SIZE) - EDGE_MARGIN;
  const availableLeft = position.left - EDGE_MARGIN;
  const openDirection = availableRight >= availableLeft ? 'right' : 'left';
  const desiredPanelLeft =
    openDirection === 'right'
      ? position.left + ICON_SIZE + PANEL_GAP
      : position.left - panelWidth - PANEL_GAP;
  const panelLeft = clamp(
    desiredPanelLeft,
    EDGE_MARGIN,
    Math.max(EDGE_MARGIN, containerWidth - panelWidth - EDGE_MARGIN),
  );
  const panelMaxTop = Math.max(
    TOP_MARGIN,
    containerHeight - EDGE_MARGIN - BOTTOM_MARGIN + 28 - panelSize.height,
  );
  const panelTop = clamp(
    iconCenterY - panelSize.height / 2,
    TOP_MARGIN,
    panelMaxTop,
  );
  const pointerTop = clamp(
    iconCenterY - panelTop - 9,
    22,
    Math.max(22, panelSize.height - 22),
  );
  const panelStyle = {
    left: panelLeft,
    top: panelTop,
    width: panelWidth,
    transformOrigin: `${openDirection === 'right' ? 'left' : 'right'} ${Math.round(pointerTop)}px`,
  };

  const hiddenPillStyle =
    position.side === 'left'
      ? { left: 0, top: clamp(position.top + 2, TOP_MARGIN, Math.max(TOP_MARGIN, containerHeight - HIDDEN_PILL_HEIGHT - EDGE_MARGIN)) }
      : { right: 0, top: clamp(position.top + 2, TOP_MARGIN, Math.max(TOP_MARGIN, containerHeight - HIDDEN_PILL_HEIGHT - EDGE_MARGIN)) };

  if (hidden) {
    return (
      <button
        type="button"
        aria-label="展开 AI 工具图标"
        onClick={handleRestore}
        className={`absolute z-[60] flex items-center justify-center border border-[#f0d7c8] bg-[#fffaf6] text-primary-start shadow-[0_14px_34px_rgba(153,27,27,0.12)] ${
          position.side === 'left'
            ? 'rounded-r-2xl border-l-0'
            : 'rounded-l-2xl border-r-0'
        }`}
        style={{
          ...hiddenPillStyle,
          width: HIDDEN_PILL_WIDTH,
          height: HIDDEN_PILL_HEIGHT,
        }}
      >
        <Sparkles size={14} />
      </button>
    );
  }

  return (
    <>
      {panelOpen ? (
        <button
          type="button"
          aria-label="关闭 AI 工具面板"
          onClick={() => setPanelOpen(false)}
          className="absolute inset-0 z-[55] bg-black/10"
        />
      ) : null}

      {panelOpen ? (
        <div
          ref={panelRef}
          className="absolute z-[60] w-[min(320px,calc(100%-24px))] overflow-hidden rounded-[28px] border border-[#f3d8c6] bg-[#fffaf6] shadow-[0_22px_54px_rgba(153,27,27,0.14)]"
          style={panelStyle}
        >
          <div
            className={`absolute h-[18px] w-[18px] rotate-45 border-[#f3d8c6] bg-[#fff7f1] ${
              openDirection === 'right'
                ? '-left-[9px] border-b border-l'
                : '-right-[9px] border-r border-t'
            }`}
            style={{ top: pointerTop }}
          />
          <div className="bg-[linear-gradient(90deg,#fff1e8_0%,#fff6f1_52%,#fffaf6_100%)] px-4 py-4">
            <div className="flex items-start justify-between gap-3">
              <div className="flex min-w-0 items-center gap-3">
                <MascotAvatar compact />
                <div className="min-w-0">
                  <div className="truncate text-sm font-semibold text-text-main">
                    {config?.title || 'AI 助手'}
                  </div>
                  <div className="mt-1 text-xs text-text-aux">全局悬浮入口</div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setPanelOpen(false)}
                className="inline-flex h-8 shrink-0 items-center justify-center rounded-full border border-[#f1d7c6] bg-white px-3 text-xs text-text-sub active:scale-[0.98]"
              >
                收起
              </button>
            </div>

            <div className="mt-3 rounded-2xl border border-[#f5dfd1] bg-white/90 px-3 py-3">
              <div className="flex items-center justify-between gap-3">
                <div className="text-xs font-medium text-text-aux">当前状态</div>
                <div className="rounded-full bg-[#fff3ea] px-2.5 py-1 text-[11px] font-medium text-primary-start">
                  {statusText}
                </div>
              </div>
              <div className="mt-2 text-sm font-medium text-text-main">
                {isAuthenticated ? '跨页面保留入口，随时发起 AI 问答' : '登录后可使用完整 AI 助手能力'}
              </div>
              <div className="mt-1 text-xs leading-5 text-text-sub">{usageHint}</div>
            </div>
          </div>

          <div className="space-y-4 px-4 py-4">
            <div>
              <div className="mb-2 text-xs font-medium uppercase tracking-wide text-text-aux">快捷提问</div>
              {quickPrompts.length > 0 ? (
                <div className="flex flex-wrap gap-2">
                  {quickPrompts.map((prompt) => (
                    <button
                      key={prompt}
                      type="button"
                      onClick={() => handleOpenAiAssistant(prompt)}
                      className="rounded-full border border-[#f1d7c6] bg-[#fff4eb] px-3 py-2 text-xs leading-5 text-text-sub active:bg-[#ffeadd]"
                    >
                      {prompt}
                    </button>
                  ))}
                </div>
              ) : (
                <div className="rounded-2xl border border-dashed border-border-light bg-white px-3 py-3 text-xs leading-5 text-text-sub">
                  暂无快捷提问，进入 AI 助手后可以直接输入问题。
                </div>
              )}
            </div>

            <button
              type="button"
              onClick={() => handleOpenAiAssistant()}
              className="inline-flex min-h-[42px] w-full items-center justify-center rounded-[18px] bg-gradient-to-r from-[#ff6b57] to-[#ff8a4d] px-4 py-2 text-sm font-medium text-white shadow-sm active:opacity-90"
            >
              进入 AI 助手
            </button>
          </div>
        </div>
      ) : null}

      <div
        className="absolute z-[60] flex flex-col items-end gap-2"
        style={{ left: position.left, top: position.top }}
      >
        <button
          type="button"
          aria-label="隐藏 AI 图标"
          onClick={handleHide}
          className="ml-auto flex h-6 w-6 items-center justify-center rounded-full border border-white/75 bg-white/92 text-gray-500 shadow-[0_8px_18px_rgba(15,23,42,0.12)] backdrop-blur active:scale-95"
        >
          <X size={12} />
        </button>

        <button
          type="button"
          aria-label="打开 AI 工具面板"
          onClick={handleTogglePanel}
          onMouseDown={handleMouseDown}
          onTouchStart={handleTouchStart}
          className={`inline-flex items-center gap-2 rounded-[24px] border border-[#f0d7c8] bg-[#fffaf6] px-2 py-2 shadow-[0_14px_34px_rgba(153,27,27,0.12)] active:scale-[0.98] ${
            panelOpen ? 'ring-2 ring-[#ffd7bf]' : ''
          }`}
        >
          <MascotAvatar />
        </button>
      </div>
    </>
  );
};
