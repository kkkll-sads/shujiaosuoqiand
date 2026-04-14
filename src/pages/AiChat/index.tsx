import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Bot, Loader2, RotateCcw, SendHorizonal, Sparkles } from 'lucide-react';
import {
  aiChatApi,
  type AiChatConfig,
  type AiChatHistoryMessage,
  type AiChatSessionMessage,
  type AiChatSessionSummary,
} from '../../api';
import { getErrorMessage, isAbortError } from '../../api/core/errors';
import { OfflineBanner } from '../../components/layout/OfflineBanner';
import { PageHeader } from '../../components/layout/PageHeader';
import { Card } from '../../components/ui/Card';
import { EmptyState } from '../../components/ui/EmptyState';
import { ErrorState } from '../../components/ui/ErrorState';
import { useFeedback } from '../../components/ui/FeedbackProvider';
import { Skeleton } from '../../components/ui/Skeleton';
import { useAuthSession } from '../../hooks/useAuthSession';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useRequest } from '../../hooks/useRequest';
import { useSessionState } from '../../hooks/useSessionState';
import { useAppNavigate } from '../../lib/navigation';

type ConversationRole = 'user' | 'assistant';
type AiChatViewMode = 'home' | 'conversation';

interface ConversationMessage {
  id: string;
  role: ConversationRole;
  content: string;
  createdAt: number;
}

const DRAFT_STORAGE_KEY = 'ai-chat:draft';
const MAX_INPUT_LENGTH = 1000;
const MAX_HISTORY_MESSAGES = 20;

function createMessageId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function trimConversation(messages: ConversationMessage[]) {
  return messages.slice(-MAX_HISTORY_MESSAGES);
}

function toHistoryPayload(messages: ConversationMessage[]): AiChatHistoryMessage[] {
  return messages.map((item) => ({
    role: item.role,
    content: item.content,
  }));
}

function toConversationMessages(messages: AiChatSessionMessage[]): ConversationMessage[] {
  return trimConversation(messages.map((item) => ({
    id: item.id || createMessageId(),
    role: item.role,
    content: item.content,
    createdAt: item.createdAt,
  })));
}

function AiChatSkeleton() {
  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-bg-base">
      <PageHeader title="AI 助手" />
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        <Card className="p-5 shadow-sm">
          <Skeleton className="mb-3 h-5 w-24" />
          <Skeleton className="mb-2 h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </Card>
        <div className="space-y-3">
          <div className="flex justify-start">
            <Skeleton className="h-20 w-[78%] rounded-3xl" />
          </div>
          <div className="flex justify-end">
            <Skeleton className="h-16 w-[64%] rounded-3xl" />
          </div>
          <div className="flex justify-start">
            <Skeleton className="h-24 w-[82%] rounded-3xl" />
          </div>
        </div>
      </div>
      <div className="shrink-0 border-t border-border-light bg-bg-card p-4 pb-[calc(env(safe-area-inset-bottom)+16px)]">
        <Skeleton className="h-24 rounded-[24px]" />
      </div>
    </div>
  );
}

function MessageBubble({
  role,
  content,
  isStreaming = false,
}: {
  role: ConversationRole;
  content: string;
  isStreaming?: boolean;
}) {
  const isUser = role === 'user';
  const showStreamingPlaceholder = !isUser && isStreaming && !content.trim();

  return (
    <div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div
        className={`max-w-[84%] rounded-[24px] px-4 py-3 text-sm leading-6 shadow-sm ${
          isUser
            ? 'bg-primary-start text-white'
            : 'border border-border-light bg-bg-card text-text-main'
        }`}
      >
        {showStreamingPlaceholder ? (
          <div className="flex items-center text-sm text-text-sub">
            <Loader2 size={16} className="mr-2 animate-spin" />
            AI 正在输入...
          </div>
        ) : (
          <div className="whitespace-pre-wrap break-words">
            {content}
            {!isUser && isStreaming ? (
              <span className="ml-1 inline-block h-4 w-1 animate-pulse rounded-full bg-current align-middle opacity-60" />
            ) : null}
          </div>
        )}
      </div>
    </div>
  );
}

function InfoCard({
  title,
  content,
}: {
  title: string;
  content: string;
}) {
  if (!content.trim()) {
    return null;
  }

  return (
    <Card className="border border-border-light bg-bg-card p-4 shadow-sm">
      <div className="mb-2 text-sm font-medium text-text-main">{title}</div>
      <div className="rounded-2xl bg-bg-base px-4 py-3 text-sm leading-6 text-text-sub">
        {content}
      </div>
    </Card>
  );
}

function RecentSessionsCard({
  sessions,
  loading,
  error,
  loadingSessionId,
  onOpen,
  onRetry,
}: {
  sessions: AiChatSessionSummary[];
  loading: boolean;
  error: Error | null;
  loadingSessionId: number | null;
  onOpen: (sessionId: number) => void;
  onRetry: () => void;
}) {
  return (
    <Card className="border border-border-light bg-bg-card p-4 shadow-sm">
      <div className="mb-3 text-sm font-medium text-text-main">最近会话</div>

      {loading ? (
        <div className="space-y-2">
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
          <Skeleton className="h-14 rounded-2xl" />
        </div>
      ) : null}

      {!loading && error ? (
        <div className="rounded-2xl bg-bg-base px-4 py-3 text-sm text-text-sub">
          <div>{getErrorMessage(error)}</div>
          <button
            type="button"
            onClick={onRetry}
            className="mt-2 text-xs font-medium text-primary-start"
          >
            重新加载
          </button>
        </div>
      ) : null}

      {!loading && !error && sessions.length === 0 ? (
        <div className="rounded-2xl bg-bg-base px-4 py-3 text-sm text-text-sub">
          暂无服务端会话记录，发起一次提问后会自动保存。
        </div>
      ) : null}

      {!loading && !error && sessions.length > 0 ? (
        <div className="space-y-2">
          {sessions.map((session) => (
            <button
              key={session.id}
              type="button"
              onClick={() => onOpen(session.id)}
              disabled={loadingSessionId === session.id}
              className="w-full rounded-2xl border border-border-light bg-bg-base px-4 py-3 text-left active:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-60"
            >
              <div className="flex items-center justify-between gap-3">
                <div className="truncate text-sm font-medium text-text-main">{session.title}</div>
                <div className="shrink-0 text-[11px] text-text-aux">
                  {loadingSessionId === session.id ? '加载中...' : (session.lastMessageTimeText || session.createdTimeText || '')}
                </div>
              </div>
              <div className="mt-1 text-xs leading-5 text-text-sub break-words">
                {session.preview || '暂无摘要'}
              </div>
            </button>
          ))}
        </div>
      ) : null}
    </Card>
  );
}

export const AiChatPage = () => {
  const { goBackOr, goTo } = useAppNavigate();
  const { showConfirm, showToast } = useFeedback();
  const { isAuthenticated, session } = useAuthSession();
  const { isOffline, refreshStatus } = useNetworkStatus();
  const [messages, setMessages] = useState<ConversationMessage[]>([]);
  const [draft, setDraft] = useSessionState<string>(DRAFT_STORAGE_KEY, '');
  const [currentSessionId, setCurrentSessionId] = useState<number>(0);
  const [viewMode, setViewMode] = useState<AiChatViewMode>('home');
  const [sending, setSending] = useState(false);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const [loadingSessionId, setLoadingSessionId] = useState<number | null>(null);
  const [sessionLoadError, setSessionLoadError] = useState<Error | null>(null);
  const scrollContainerRef = useRef<HTMLDivElement | null>(null);
  const messagesEndRef = useRef<HTMLDivElement | null>(null);
  const abortRef = useRef<AbortController | null>(null);
  const sessionAbortRef = useRef<AbortController | null>(null);
  const streamBufferRef = useRef('');
  const streamAppliedRef = useRef('');
  const streamTargetIdRef = useRef<string | null>(null);
  const streamFlushTimerRef = useRef<number | null>(null);
  const autoLoadedSessionIdRef = useRef<number>(0);
  const pendingScrollModeRef = useRef<'top' | 'bottom'>('bottom');

  const configRequest = useRequest((signal) => aiChatApi.getConfig(signal), {
    cacheKey: 'ai-chat:config',
  });

  const sessionsRequest = useRequest((signal) => aiChatApi.getSessions(12, signal), {
    cacheKey: `ai-chat:sessions:${session?.userInfo?.id ?? session?.baUserToken ?? session?.accessToken ?? 0}`,
    manual: !isAuthenticated,
    deps: [isAuthenticated, session?.userInfo?.id, session?.baUserToken, session?.accessToken],
    initialData: [],
  });

  const config = configRequest.data as AiChatConfig | undefined;
  const recentSessions = sessionsRequest.data ?? [];
  const showConversationView = viewMode === 'conversation';
  const canSend = (
    isAuthenticated
    && !sending
    && !isOffline
    && !loadingSessionId
    && Boolean(config?.enabled)
    && Boolean(config?.configured)
  );
  const usageHint = useMemo(() => {
    if (!config?.description) {
      return '仅支持文字对话，AI 回复仅供参考。';
    }

    return config.description;
  }, [config?.description]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      if (pendingScrollModeRef.current === 'top') {
        scrollContainerRef.current?.scrollTo({
          top: 0,
          behavior: 'auto',
        });
        pendingScrollModeRef.current = 'bottom';
        return;
      }

      messagesEndRef.current?.scrollIntoView({
        behavior: sending ? 'auto' : (messages.length > 0 ? 'smooth' : 'auto'),
      });
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [messages, sending]);

  useEffect(() => () => {
    abortRef.current?.abort();
    sessionAbortRef.current?.abort();
    if (streamFlushTimerRef.current !== null) {
      window.clearTimeout(streamFlushTimerRef.current);
    }
  }, []);

  const flushStreamingMessage = useCallback((immediate = false) => {
    const apply = () => {
      const targetId = streamTargetIdRef.current;
      const nextContent = streamBufferRef.current;
      if (!targetId || nextContent === streamAppliedRef.current) {
        return;
      }

      streamAppliedRef.current = nextContent;
      setMessages((current) => trimConversation(current.map((item) => (
        item.id === targetId
          ? {
              ...item,
              content: nextContent,
            }
          : item
      ))));
    };

    if (immediate) {
      if (streamFlushTimerRef.current !== null) {
        window.clearTimeout(streamFlushTimerRef.current);
        streamFlushTimerRef.current = null;
      }
      apply();
      return;
    }

    if (streamFlushTimerRef.current !== null) {
      return;
    }

    streamFlushTimerRef.current = window.setTimeout(() => {
      streamFlushTimerRef.current = null;
      apply();
    }, 60);
  }, []);

  const resetStreamingBuffer = useCallback(() => {
    if (streamFlushTimerRef.current !== null) {
      window.clearTimeout(streamFlushTimerRef.current);
      streamFlushTimerRef.current = null;
    }

    streamBufferRef.current = '';
    streamAppliedRef.current = '';
    streamTargetIdRef.current = null;
  }, []);

  const handleBack = useCallback(() => {
    if (showConversationView || currentSessionId > 0 || messages.length > 0 || loadingSessionId !== null || sessionLoadError) {
      abortRef.current?.abort();
      sessionAbortRef.current?.abort();
      resetStreamingBuffer();
      setSending(false);
      setStreamingMessageId(null);
      setLoadingSessionId(null);
      setSessionLoadError(null);
      setMessages([]);
      setCurrentSessionId(0);
      setViewMode('home');
      return;
    }

    goBackOr('help_center');
  }, [
    currentSessionId,
    goBackOr,
    loadingSessionId,
    messages.length,
    resetStreamingBuffer,
    sessionLoadError,
    showConversationView,
  ]);

  const loadSession = useCallback(async (sessionId: number) => {
    if (!isAuthenticated || sessionId <= 0) {
      return;
    }

    sessionAbortRef.current?.abort();
    const controller = new AbortController();
    sessionAbortRef.current = controller;
    setLoadingSessionId(sessionId);
    setSessionLoadError(null);

    try {
      const detail = await aiChatApi.getSessionDetail(sessionId, controller.signal);
      setCurrentSessionId(detail.session.id);
      resetStreamingBuffer();
      setMessages(toConversationMessages(detail.messages));
    } catch (error) {
      if (isAbortError(error)) {
        return;
      }

      const normalizedError = error instanceof Error ? error : new Error('会话加载失败');
      setSessionLoadError(normalizedError);
      showToast({
        message: getErrorMessage(normalizedError),
        type: 'error',
        duration: 3000,
      });
    } finally {
      if (sessionAbortRef.current === controller) {
        sessionAbortRef.current = null;
      }
      setLoadingSessionId((current) => (current === sessionId ? null : current));
    }
  }, [isAuthenticated, resetStreamingBuffer, setCurrentSessionId, showToast]);

  useEffect(() => {
    if (!isAuthenticated) {
      autoLoadedSessionIdRef.current = 0;
      setViewMode('home');
      setLoadingSessionId(null);
      setSessionLoadError(null);
      setMessages([]);
      return;
    }

    if (sending) {
      return;
    }

    if (currentSessionId <= 0) {
      autoLoadedSessionIdRef.current = 0;
      setSessionLoadError(null);
      return;
    }

    if (messages.length > 0 || loadingSessionId) {
      return;
    }

    if (autoLoadedSessionIdRef.current === currentSessionId) {
      return;
    }

    autoLoadedSessionIdRef.current = currentSessionId;
    void loadSession(currentSessionId);
  }, [currentSessionId, isAuthenticated, loadSession, loadingSessionId, messages.length, sending]);

  const handleStartNewConversation = useCallback(async () => {
    if (sending || (messages.length === 0 && currentSessionId <= 0)) {
      return;
    }

    const confirmed = await showConfirm({
      title: '开始新会话',
      message: currentSessionId > 0
        ? '确认切换到新会话吗？当前会话仍会保留在“最近会话”里。'
        : '确认开始新会话吗？当前临时对话内容将被清空。',
      confirmText: '继续',
    });

    if (!confirmed) {
      return;
    }

    abortRef.current?.abort();
    setCurrentSessionId(0);
    setViewMode('home');
    setLoadingSessionId(null);
    resetStreamingBuffer();
    setSessionLoadError(null);
    setMessages([]);
    setStreamingMessageId(null);
    showToast({ message: '已切换到新会话', type: 'success' });
  }, [currentSessionId, messages.length, resetStreamingBuffer, sending, setCurrentSessionId, showConfirm, showToast]);

  const handleOpenSession = useCallback((sessionId: number) => {
    abortRef.current?.abort();
    resetStreamingBuffer();
    setStreamingMessageId(null);
    pendingScrollModeRef.current = 'top';
    scrollContainerRef.current?.scrollTo({ top: 0, behavior: 'auto' });
    setViewMode('conversation');
    setMessages([]);
    setSessionLoadError(null);
    autoLoadedSessionIdRef.current = sessionId;
    setCurrentSessionId(sessionId);
    void loadSession(sessionId);
  }, [loadSession, resetStreamingBuffer, setCurrentSessionId]);

  const sendMessage = useCallback(async (nextContent?: string) => {
    const content = (nextContent ?? draft).trim();
    if (!isAuthenticated) {
      goTo('login');
      return;
    }

    if (!content || sending || !config?.enabled || !config?.configured || loadingSessionId) {
      return;
    }

    const history = toHistoryPayload(messages);
    const userMessage: ConversationMessage = {
      id: createMessageId(),
      role: 'user',
      content,
      createdAt: Date.now(),
    };
    const assistantMessageId = createMessageId();
    const assistantMessage: ConversationMessage = {
      id: assistantMessageId,
      role: 'assistant',
      content: '',
      createdAt: Date.now(),
    };
    const nextHistory = trimConversation([...messages, userMessage, assistantMessage]);
    let streamedContent = '';
    let activeSessionId = currentSessionId > 0 ? currentSessionId : 0;

    abortRef.current?.abort();
    const controller = new AbortController();
    abortRef.current = controller;
    resetStreamingBuffer();
    streamTargetIdRef.current = assistantMessageId;
    pendingScrollModeRef.current = 'bottom';
    setSessionLoadError(null);
    setViewMode('conversation');

    setMessages(nextHistory);
    setStreamingMessageId(assistantMessageId);
    setDraft('');
    setSending(true);

    try {
      const result = await aiChatApi.stream(
        {
          message: content,
          history,
          sessionId: currentSessionId > 0 ? currentSessionId : undefined,
        },
        {
          signal: controller.signal,
          websocketUrl: config.websocketUrl,
          onStart: (sessionId) => {
            if (sessionId <= 0) {
              return;
            }

            activeSessionId = sessionId;
            if (sessionId !== currentSessionId) {
              setCurrentSessionId(sessionId);
            }
          },
          onDelta: (_delta, fullMessage) => {
            streamedContent = fullMessage;
            streamBufferRef.current = fullMessage;
            flushStreamingMessage();
          },
        },
      );

      if (result.sessionId > 0) {
        activeSessionId = result.sessionId;
      }

      if (result.sessionId > 0 && result.sessionId !== currentSessionId) {
        setCurrentSessionId(result.sessionId);
      }

      streamBufferRef.current = result.message || streamedContent || 'AI 暂未返回内容，请稍后再试。';
      flushStreamingMessage(true);
    } catch (error) {
      if (isAbortError(error)) {
        if (!streamedContent) {
          setMessages((current) => current.filter((item) => item.id !== assistantMessageId));
        } else {
          flushStreamingMessage(true);
        }
        return;
      }

      if (!streamedContent) {
        setMessages((current) => current.filter((item) => item.id !== assistantMessageId));
      } else {
        flushStreamingMessage(true);
      }

      showToast({
        message: getErrorMessage(error),
        type: 'error',
        duration: 3000,
      });
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
      }
      setStreamingMessageId(null);
      setSending(false);
      resetStreamingBuffer();
      if (activeSessionId > 0) {
        void sessionsRequest.reload().catch(() => undefined);
      }
    }
  }, [
    config?.configured,
    config?.enabled,
    config?.websocketUrl,
    currentSessionId,
    draft,
    flushStreamingMessage,
    goTo,
    isAuthenticated,
    loadingSessionId,
    messages,
    resetStreamingBuffer,
    sending,
    setCurrentSessionId,
    setDraft,
    showToast,
    sessionsRequest,
  ]);

  if (configRequest.loading && !config) {
    return <AiChatSkeleton />;
  }

  if (configRequest.error && !config) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-bg-base">
        <PageHeader title="AI 助手" onBack={handleBack} />
        <div className="flex-1 overflow-y-auto">
          <ErrorState
            message={getErrorMessage(configRequest.error)}
            onRetry={() => void configRequest.reload()}
          />
        </div>
      </div>
    );
  }

  if (!config?.enabled) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-bg-base">
        <PageHeader title={config?.title || 'AI 助手'} onBack={handleBack} />
        <div className="flex-1 overflow-y-auto">
          <EmptyState
            icon={<Bot size={40} />}
            message="AI 助手暂未启用，请联系管理员配置 DeepSeek。"
            actionText="重新加载"
            onAction={() => void configRequest.reload()}
          />
        </div>
      </div>
    );
  }

  if (!config.configured) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-bg-base">
        <PageHeader title={config.title} onBack={handleBack} />
        <div className="flex-1 overflow-y-auto">
          <EmptyState
            icon={<Bot size={40} />}
            message="AI 助手暂时不可用，请稍后重试。"
            actionText="重新加载"
            onAction={() => void configRequest.reload()}
          />
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return (
      <div className="flex flex-1 flex-col overflow-hidden bg-bg-base">
        {isOffline && <OfflineBanner onAction={refreshStatus} />}

        <PageHeader
          title={config.title}
          onBack={handleBack}
          className="border-b border-border-light bg-bg-card"
          contentClassName="h-11 px-4"
          titleClassName="text-base font-semibold"
          backButtonClassName="rounded-full p-1.5 active:bg-black/5"
        />

        <div className="flex-1 overflow-y-auto">
          <EmptyState
            icon={<Sparkles size={40} />}
            message="登录后即可使用 AI 助手进行文字问答。"
            actionText="去登录"
            actionVariant="primary"
            onAction={() => goTo('login')}
          />
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-1 flex-col overflow-hidden bg-bg-base">
      {isOffline && <OfflineBanner onAction={refreshStatus} />}

      <PageHeader
        title={config.title}
        onBack={handleBack}
        rightAction={(messages.length > 0 || currentSessionId > 0) ? (
          <button
            type="button"
            onClick={() => void handleStartNewConversation()}
            disabled={sending}
            className="inline-flex h-8 items-center justify-center rounded-full border border-border-light bg-bg-card px-3 text-xs font-medium text-text-sub active:scale-[0.98] disabled:cursor-not-allowed disabled:opacity-40"
          >
            <RotateCcw size={13} className="mr-1.5" />
            新会话
          </button>
        ) : null}
        className="border-b border-border-light bg-bg-card"
        contentClassName="h-11 px-4"
        titleClassName="text-base font-semibold"
        backButtonClassName="rounded-full p-1.5 active:bg-black/5"
        rightClassName="items-center"
      />

      <div className="flex min-h-0 flex-1 flex-col">
        <div ref={scrollContainerRef} className="flex-1 overflow-y-auto px-4 py-4">
          {!showConversationView ? (
            <div className="space-y-4">
              <Card className="overflow-hidden border border-border-light bg-bg-card p-5 shadow-sm">
                <div className="mb-3 flex items-center">
                  <div className="mr-3 flex h-11 w-11 items-center justify-center rounded-full bg-red-50 text-primary-start">
                    <Sparkles size={22} />
                  </div>
                  <div>
                    <div className="text-base font-semibold text-text-main">{config.title}</div>
                    <div className="mt-1 text-xs text-text-aux">{usageHint}</div>
                  </div>
                </div>
                <div className="rounded-2xl bg-bg-base px-4 py-3 text-sm leading-6 text-text-sub">
                  {config.welcomeMessage || '你好，我是 AI 助手，你可以直接输入问题开始对话。'}
                </div>
              </Card>

              <InfoCard title="可咨询范围" content={config.scopeSummary} />
              <InfoCard title="边界提醒" content={config.boundaryNotice} />

              {config.suggestionPrompts.length > 0 ? (
                <Card className="border border-border-light bg-bg-card p-4 shadow-sm">
                  <div className="mb-3 text-sm font-medium text-text-main">试试这样问</div>
                  <div className="flex flex-wrap gap-2">
                    {config.suggestionPrompts.map((prompt) => (
                      <button
                        key={prompt}
                        type="button"
                        onClick={() => void sendMessage(prompt)}
                        disabled={!canSend}
                        className="rounded-full border border-border-light bg-bg-base px-3 py-2 text-xs text-text-sub active:bg-bg-hover disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {prompt}
                      </button>
                    ))}
                  </div>
                </Card>
              ) : null}

              <RecentSessionsCard
                sessions={recentSessions}
                loading={sessionsRequest.loading}
                error={sessionsRequest.error}
                loadingSessionId={loadingSessionId}
                onOpen={handleOpenSession}
                onRetry={() => void sessionsRequest.reload()}
              />
            </div>
          ) : (
            <div className="space-y-3 pb-2">
              {(loadingSessionId !== null || (currentSessionId > 0 && messages.length === 0 && !sessionLoadError)) ? (
                <Card className="border border-border-light bg-bg-card p-4 shadow-sm">
                  <div className="flex items-center text-sm text-text-sub">
                    <Loader2 size={16} className="mr-2 animate-spin" />
                    正在加载会话内容...
                  </div>
                </Card>
              ) : null}

              {loadingSessionId === null && messages.length === 0 && sessionLoadError ? (
                <Card className="border border-border-light bg-bg-card p-4 shadow-sm">
                  <div className="text-sm text-text-sub">{getErrorMessage(sessionLoadError)}</div>
                  <button
                    type="button"
                    onClick={() => {
                      if (currentSessionId > 0) {
                        void loadSession(currentSessionId);
                      }
                    }}
                    className="mt-3 text-xs font-medium text-primary-start"
                  >
                    重新加载会话
                  </button>
                </Card>
              ) : null}

              {messages.map((item) => (
                <div key={item.id}>
                  <MessageBubble
                    role={item.role}
                    content={item.content}
                    isStreaming={item.id === streamingMessageId}
                  />
                </div>
              ))}
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="shrink-0 border-t border-border-light bg-bg-card px-4 pb-[calc(env(safe-area-inset-bottom)+16px)] pt-3">
          <div className="rounded-[26px] border border-border-light bg-bg-base px-3 py-3 shadow-sm">
            <textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder={config.placeholder}
              maxLength={MAX_INPUT_LENGTH}
              rows={3}
              disabled={!canSend && !draft}
              className="min-h-[72px] w-full resize-none border-0 bg-transparent text-sm leading-6 text-text-main outline-none placeholder:text-text-aux disabled:cursor-not-allowed"
            />

            <div className="mt-3 flex items-center justify-between">
              <div className="pr-3 text-xs text-text-aux">
                {draft.length}/{MAX_INPUT_LENGTH} 字
              </div>

              <button
                type="button"
                onClick={() => {
                  if (sending) {
                    abortRef.current?.abort();
                    return;
                  }

                  void sendMessage();
                }}
                disabled={sending ? false : (!draft.trim() || !canSend)}
                className="inline-flex h-10 items-center justify-center rounded-full gradient-primary-r px-4 text-sm font-medium text-white shadow-sm active:opacity-85 disabled:cursor-not-allowed disabled:opacity-45"
              >
                {sending ? (
                  <>
                    <Loader2 size={16} className="mr-1.5 animate-spin" />
                    停止
                  </>
                ) : (
                  <>
                    <SendHorizonal size={15} className="mr-1.5" />
                    发送
                  </>
                )}
              </button>
            </div>
          </div>

          <div className="mt-2 px-1 text-xs leading-5 text-text-aux">
            {usageHint}
            {config.boundaryNotice ? (
              <div className="mt-1">{config.boundaryNotice}</div>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
};
