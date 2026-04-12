import { createApiHeaders } from '../core/headers';
import { ApiError, isAbortError } from '../core/errors';
import { http } from '../http';
import { getAuthHeaders } from '../../lib/auth';

export type AiChatRole = 'user' | 'assistant';

export interface AiChatHistoryMessage {
  role: AiChatRole;
  content: string;
}

export interface AiChatRetrievalHit {
  documentId: number;
  chunkId: number;
  chunkNo: number;
  rankNo: number;
  documentTitle: string;
  chunkTitle: string;
  categoryName: string;
  snippet: string;
  score: number;
}

export interface AiChatConfig {
  enabled: boolean;
  configured: boolean;
  title: string;
  description: string;
  placeholder: string;
  welcomeMessage: string;
  scopeSummary: string;
  boundaryNotice: string;
  suggestionPrompts: string[];
  model: string;
  transport: 'websocket' | 'sse';
  websocketUrl: string;
}

export interface AiChatSendResult {
  message: string;
  model: string;
  sessionId: number;
  retrievalHits: AiChatRetrievalHit[];
  usage: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
  };
}

export interface AiChatSessionSummary {
  id: number;
  title: string;
  preview: string;
  lastMessageAt: number;
  lastMessageTimeText: string;
  messageCount: number;
  totalTokens: number;
  createdAt: number;
  createdTimeText: string;
}

export interface AiChatSessionMessage {
  id: string;
  role: AiChatRole;
  content: string;
  model: string;
  totalTokens: number;
  createdAt: number;
}

export interface AiChatSessionDetail {
  session: AiChatSessionSummary;
  messages: AiChatSessionMessage[];
}

const AI_CHAT_SEND_TIMEOUT = 30000;
const AI_CHAT_STREAM_TIMEOUT = 45000;

interface AiChatConfigRaw {
  enabled?: boolean | number | string;
  configured?: boolean | number | string;
  title?: string;
  description?: string;
  placeholder?: string;
  welcome_message?: string;
  scope_summary?: string;
  boundary_notice?: string;
  suggestion_prompts?: string[] | null;
  model?: string;
  transport?: string;
  websocket_url?: string;
}

interface AiChatRetrievalHitRaw {
  document_id?: number | string;
  chunk_id?: number | string;
  chunk_no?: number | string;
  rank_no?: number | string;
  document_title?: string;
  chunk_title?: string;
  category_name?: string;
  snippet?: string;
  score?: number | string;
}

interface AiChatSendRaw {
  message?: string;
  model?: string;
  session_id?: number | string;
  retrieval_hits?: AiChatRetrievalHitRaw[] | null;
  usage?: {
    prompt_tokens?: number | string;
    completion_tokens?: number | string;
    total_tokens?: number | string;
  };
}

interface AiChatSessionSummaryRaw {
  id?: number | string;
  title?: string;
  last_message_preview?: string;
  last_message_at?: number | string;
  last_message_time_text?: string;
  message_count?: number | string;
  total_tokens?: number | string;
  create_time?: number | string;
  create_time_text?: string;
}

interface AiChatSessionMessageRaw {
  id?: number | string;
  role?: string;
  content?: string;
  model?: string;
  total_tokens?: number | string;
  create_time?: number | string;
}

interface AiChatSessionDetailRaw {
  session?: AiChatSessionSummaryRaw | null;
  messages?: AiChatSessionMessageRaw[] | null;
}

interface AiChatSendPayload {
  message: string;
  history?: AiChatHistoryMessage[];
  sessionId?: number;
}

interface AiChatStreamEventRaw {
  event?: string;
  content?: string;
  message?: string;
  model?: string;
  session_id?: number | string;
  stopped?: boolean | number | string;
  retrieval_hits?: AiChatRetrievalHitRaw[] | null;
  usage?: {
    prompt_tokens?: number | string;
    completion_tokens?: number | string;
    total_tokens?: number | string;
  };
}

interface AiChatStreamOptions {
  signal?: AbortSignal;
  onStart?: (sessionId: number) => void;
  onDelta?: (delta: string, fullMessage: string) => void;
  websocketUrl?: string;
}

function normalizeAiChatConfig(raw: AiChatConfigRaw | null | undefined): AiChatConfig {
  return {
    enabled: raw?.enabled === true || raw?.enabled === 1 || raw?.enabled === '1',
    configured: raw?.configured === true || raw?.configured === 1 || raw?.configured === '1',
    title: String(raw?.title ?? '').trim() || 'AI 助手',
    description: String(raw?.description ?? '').trim(),
    placeholder: String(raw?.placeholder ?? '').trim() || '请输入你想咨询的问题',
    welcomeMessage: String(raw?.welcome_message ?? '').trim(),
    scopeSummary: String(raw?.scope_summary ?? '').trim(),
    boundaryNotice: String(raw?.boundary_notice ?? '').trim(),
    suggestionPrompts: Array.isArray(raw?.suggestion_prompts)
      ? raw!.suggestion_prompts.map((item) => String(item ?? '').trim()).filter(Boolean)
      : [],
    model: String(raw?.model ?? '').trim(),
    transport: raw?.transport === 'websocket' ? 'websocket' : 'sse',
    websocketUrl: normalizeWebsocketUrl(String(raw?.websocket_url ?? '')),
  };
}

function normalizeRetrievalHits(raw: AiChatRetrievalHitRaw[] | null | undefined): AiChatRetrievalHit[] {
  if (!Array.isArray(raw)) {
    return [];
  }

  return raw.map((item) => ({
    documentId: Number(item?.document_id ?? 0),
    chunkId: Number(item?.chunk_id ?? 0),
    chunkNo: Number(item?.chunk_no ?? 0),
    rankNo: Number(item?.rank_no ?? 0),
    documentTitle: String(item?.document_title ?? '').trim(),
    chunkTitle: String(item?.chunk_title ?? '').trim(),
    categoryName: String(item?.category_name ?? '').trim(),
    snippet: String(item?.snippet ?? '').trim(),
    score: Number(item?.score ?? 0),
  }));
}

function normalizeAiChatSendResult(raw: AiChatSendRaw | null | undefined): AiChatSendResult {
  return {
    message: String(raw?.message ?? '').trim(),
    model: String(raw?.model ?? '').trim(),
    sessionId: Number(raw?.session_id ?? 0),
    retrievalHits: normalizeRetrievalHits(raw?.retrieval_hits),
    usage: {
      promptTokens: Number(raw?.usage?.prompt_tokens ?? 0),
      completionTokens: Number(raw?.usage?.completion_tokens ?? 0),
      totalTokens: Number(raw?.usage?.total_tokens ?? 0),
    },
  };
}

function normalizeSessionSummary(raw: AiChatSessionSummaryRaw | null | undefined): AiChatSessionSummary {
  return {
    id: Number(raw?.id ?? 0),
    title: String(raw?.title ?? '').trim() || '未命名会话',
    preview: String(raw?.last_message_preview ?? '').trim(),
    lastMessageAt: Number(raw?.last_message_at ?? 0),
    lastMessageTimeText: String(raw?.last_message_time_text ?? '').trim(),
    messageCount: Number(raw?.message_count ?? 0),
    totalTokens: Number(raw?.total_tokens ?? 0),
    createdAt: Number(raw?.create_time ?? 0),
    createdTimeText: String(raw?.create_time_text ?? '').trim(),
  };
}

function normalizeSessionMessage(raw: AiChatSessionMessageRaw | null | undefined): AiChatSessionMessage {
  return {
    id: String(raw?.id ?? ''),
    role: raw?.role === 'assistant' ? 'assistant' : 'user',
    content: String(raw?.content ?? ''),
    model: String(raw?.model ?? '').trim(),
    totalTokens: Number(raw?.total_tokens ?? 0),
    createdAt: Number(raw?.create_time ?? 0),
  };
}

function normalizeSessionDetail(raw: AiChatSessionDetailRaw | null | undefined): AiChatSessionDetail {
  return {
    session: normalizeSessionSummary(raw?.session),
    messages: Array.isArray(raw?.messages) ? raw!.messages.map(normalizeSessionMessage) : [],
  };
}

function supportsStreamingResponse() {
  return typeof window !== 'undefined' && typeof TextDecoder !== 'undefined';
}

function supportsWebSocketTransport() {
  return typeof window !== 'undefined' && typeof WebSocket !== 'undefined';
}

function normalizeStreamEvent(raw: AiChatStreamEventRaw | null | undefined) {
  return {
    event: String(raw?.event ?? '').trim(),
    content: String(raw?.content ?? ''),
    message: String(raw?.message ?? ''),
    model: String(raw?.model ?? '').trim(),
    sessionId: Number(raw?.session_id ?? 0),
    stopped: raw?.stopped === true || raw?.stopped === 1 || raw?.stopped === '1',
    retrievalHits: normalizeRetrievalHits(raw?.retrieval_hits),
    usage: {
      promptTokens: Number(raw?.usage?.prompt_tokens ?? 0),
      completionTokens: Number(raw?.usage?.completion_tokens ?? 0),
      totalTokens: Number(raw?.usage?.total_tokens ?? 0),
    },
  };
}

function createStreamError(message: string, details?: unknown) {
  return new ApiError(message || 'AI 服务暂时不可用，请稍后重试', {
    details,
  });
}

function createAbortLikeError() {
  try {
    return new DOMException('Aborted', 'AbortError');
  } catch {
    const error = new Error('Aborted');
    error.name = 'AbortError';
    return error;
  }
}

function normalizeWebsocketUrl(raw: string) {
  const value = raw.trim();
  if (!value) {
    return '';
  }

  if (value.startsWith('http://')) {
    return `ws://${value.slice('http://'.length)}`;
  }

  if (value.startsWith('https://')) {
    return `wss://${value.slice('https://'.length)}`;
  }

  return value;
}

function shouldFallbackToSse(error: unknown) {
  return error instanceof ApiError && (
    error.code === 'WS_UNAVAILABLE'
    || error.code === 'WS_TRANSPORT_ERROR'
    || error.code === 'WS_HANDSHAKE_FAILED'
  );
}

function parseEnvelopeError(raw: string, status?: number) {
  try {
    const payload = JSON.parse(raw) as {
      code?: number | string;
      biz_code?: number | string;
      message?: string;
      msg?: string;
    };
    const message = String(payload?.message ?? payload?.msg ?? '').trim() || 'AI 服务暂时不可用，请稍后重试';

    return new ApiError(message, {
      status,
      code: payload?.biz_code ?? payload?.code,
      details: payload,
    });
  } catch {
    return new ApiError(raw.trim() || 'AI 服务暂时不可用，请稍后重试', { status });
  }
}

function flushStreamBuffer(
  buffer: string,
  handleEvent: (rawChunk: string) => void,
  flushRemaining = false,
) {
  let nextBuffer = buffer;

  while (true) {
    const delimiterIndex = nextBuffer.indexOf('\n\n');
    if (delimiterIndex === -1) {
      break;
    }

    const chunk = nextBuffer.slice(0, delimiterIndex);
    nextBuffer = nextBuffer.slice(delimiterIndex + 2);
    handleEvent(chunk);
  }

  if (flushRemaining && nextBuffer.trim()) {
    handleEvent(nextBuffer);
    return '';
  }

  return nextBuffer;
}

function buildSendPayload(payload: AiChatSendPayload) {
  return {
    message: payload.message,
    history: payload.history,
    session_id: payload.sessionId ?? 0,
  };
}

async function streamViaWebSocket(
  payload: AiChatSendPayload,
  options: AiChatStreamOptions,
): Promise<AiChatSendResult> {
  const websocketUrl = normalizeWebsocketUrl(options.websocketUrl ?? '');
  if (!websocketUrl || !supportsWebSocketTransport()) {
    throw new ApiError('WebSocket unavailable.', { code: 'WS_UNAVAILABLE' });
  }

  const userToken = getAuthHeaders()['ba-user-token'];
  if (!userToken) {
    throw new ApiError('请先登录', { code: 'NEED_LOGIN' });
  }

  return new Promise<AiChatSendResult>((resolve, reject) => {
    let socket: WebSocket | null = null;
    let timeoutId = 0;
    let settled = false;
    let handshakeReady = false;
    let activeSessionId = payload.sessionId ?? 0;
    let fullMessage = '';

    const detachAbort = (() => {
      if (!options.signal) {
        return () => {};
      }

      const handleAbort = () => {
        try {
          socket?.close(1000, 'abort');
        } catch {
          // ignore websocket close failures during abort
        }
        finishError(createAbortLikeError());
      };

      options.signal.addEventListener('abort', handleAbort, { once: true });
      return () => options.signal?.removeEventListener('abort', handleAbort);
    })();

    const cleanup = () => {
      window.clearTimeout(timeoutId);
      detachAbort();
      if (socket) {
        socket.onopen = null;
        socket.onmessage = null;
        socket.onerror = null;
        socket.onclose = null;
      }
    };

    const finishError = (error: unknown) => {
      if (settled) {
        return;
      }

      settled = true;
      try {
        socket?.close(1000, 'error');
      } catch {
        // ignore websocket close failures after error
      }
      cleanup();
      reject(error);
    };

    const finishSuccess = (result: AiChatSendResult) => {
      if (settled) {
        return;
      }

      settled = true;
      cleanup();
      try {
        socket?.close(1000, 'done');
      } catch {
        // ignore websocket close failures after success
      }
      resolve(result);
    };

    timeoutId = window.setTimeout(() => {
      finishError(new ApiError('Request timed out.', { code: 'REQUEST_TIMEOUT' }));
    }, AI_CHAT_STREAM_TIMEOUT);

    try {
      socket = new WebSocket(websocketUrl);
    } catch (error) {
      finishError(new ApiError('WebSocket unavailable.', { code: 'WS_UNAVAILABLE', details: error }));
      return;
    }

    socket.onopen = () => {
      try {
        socket?.send(JSON.stringify({
          type: 'chat',
          token: userToken,
          ...buildSendPayload(payload),
        }));
      } catch (error) {
        finishError(new ApiError('WebSocket unavailable.', { code: 'WS_TRANSPORT_ERROR', details: error }));
      }
    };

    socket.onmessage = (event) => {
      let raw: AiChatStreamEventRaw;
      try {
        raw = JSON.parse(String(event.data ?? '')) as AiChatStreamEventRaw;
      } catch {
        return;
      }

      const message = normalizeStreamEvent(raw);
      if (message.event === 'ready') {
        handshakeReady = true;
        return;
      }

      if (message.event === 'start') {
        handshakeReady = true;
        activeSessionId = message.sessionId || activeSessionId;
        if (activeSessionId > 0) {
          options.onStart?.(activeSessionId);
        }
        return;
      }

      if (message.event === 'delta') {
        if (!message.content) {
          return;
        }

        fullMessage += message.content;
        options.onDelta?.(message.content, fullMessage);
        return;
      }

      if (message.event === 'done') {
        finishSuccess({
          message: message.message || fullMessage,
          model: message.model,
          sessionId: message.sessionId || activeSessionId,
          retrievalHits: message.retrievalHits,
          usage: message.usage,
        });
        return;
      }

      if (message.event === 'error') {
        finishError(createStreamError(message.message, message));
      }
    };

    socket.onerror = (event) => {
      if (settled) {
        return;
      }

      finishError(new ApiError('WebSocket unavailable.', {
        code: handshakeReady ? 'WS_TRANSPORT_ERROR' : 'WS_UNAVAILABLE',
        details: event,
      }));
    };

    socket.onclose = (event) => {
      if (settled) {
        return;
      }

      if (options.signal?.aborted) {
        finishError(createAbortLikeError());
        return;
      }

      if (fullMessage.trim()) {
        finishSuccess({
          message: fullMessage,
          model: '',
          sessionId: activeSessionId,
          retrievalHits: [],
          usage: {
            promptTokens: 0,
            completionTokens: 0,
            totalTokens: 0,
          },
        });
        return;
      }

      finishError(new ApiError('WebSocket connection closed.', {
        code: handshakeReady ? 'WS_TRANSPORT_ERROR' : 'WS_HANDSHAKE_FAILED',
        details: event,
      }));
    };
  });
}

async function streamViaSse(
  payload: AiChatSendPayload,
  options: AiChatStreamOptions,
): Promise<AiChatSendResult> {
  if (!supportsStreamingResponse()) {
    const fallback = await aiChatApi.send(payload, options.signal);
    options.onStart?.(fallback.sessionId);
    options.onDelta?.(fallback.message, fallback.message);
    return fallback;
  }

  const controller = new AbortController();
  const timeoutId = window.setTimeout(() => controller.abort(), AI_CHAT_STREAM_TIMEOUT);
  const detachAbort = (() => {
    const signal = options.signal;
    if (!signal) {
      return () => {};
    }

    const onAbort = () => controller.abort();
    signal.addEventListener('abort', onAbort, { once: true });
    return () => signal.removeEventListener('abort', onAbort);
  })();

  try {
    const resolved = await http.eagerResolve();
    const requestBaseURL = resolved?.baseURL ?? http.getResolvedBaseURL();
    const requestURL = requestBaseURL
      ? new URL('/api/AiChat/stream', requestBaseURL.endsWith('/') ? requestBaseURL : `${requestBaseURL}/`).toString()
      : '/api/AiChat/stream';

    const response = await fetch(requestURL, {
      method: 'POST',
      headers: {
        ...getAuthHeaders(),
        ...createApiHeaders(),
        Accept: 'text/event-stream',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(buildSendPayload(payload)),
      signal: controller.signal,
    });

    if (!response.ok) {
      throw new ApiError('Network request failed.', { status: response.status });
    }

    const contentType = (response.headers.get('content-type') ?? '').toLowerCase();
    if (contentType.includes('application/json')) {
      throw parseEnvelopeError(await response.text(), response.status);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const fallback = await aiChatApi.send(payload, options.signal);
      options.onStart?.(fallback.sessionId);
      options.onDelta?.(fallback.message, fallback.message);
      return fallback;
    }

    const decoder = new TextDecoder();
    let buffer = '';
    let fullMessage = '';
    let activeSessionId = 0;
    let finalResult: AiChatSendResult | null = null;

    const handleEvent = (rawChunk: string) => {
      const lines = rawChunk
        .trim()
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean);

      if (lines.length === 0) {
        return;
      }

      const dataLines = lines
        .filter((line) => line.startsWith('data:'))
        .map((line) => line.slice(5).trimStart());

      if (dataLines.length === 0) {
        return;
      }

      const payloadText = dataLines.join('\n').trim();
      if (!payloadText || payloadText === '[DONE]') {
        return;
      }

      let event: ReturnType<typeof normalizeStreamEvent>;
      try {
        event = normalizeStreamEvent(JSON.parse(payloadText) as AiChatStreamEventRaw);
      } catch {
        return;
      }

      if (event.event === 'start') {
        activeSessionId = event.sessionId || activeSessionId;
        if (activeSessionId > 0) {
          options.onStart?.(activeSessionId);
        }
        return;
      }

      if (event.event === 'delta') {
        if (!event.content) {
          return;
        }

        fullMessage += event.content;
        options.onDelta?.(event.content, fullMessage);
        return;
      }

      if (event.event === 'done') {
        finalResult = {
          message: event.message || fullMessage,
          model: event.model,
          sessionId: event.sessionId || activeSessionId,
          retrievalHits: event.retrievalHits,
          usage: event.usage,
        };
        return;
      }

      if (event.event === 'error') {
        throw createStreamError(event.message, event);
      }
    };

    while (true) {
      const { value, done } = await reader.read();
      if (done) {
        break;
      }

      buffer += decoder.decode(value, { stream: true }).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
      buffer = flushStreamBuffer(buffer, handleEvent);
    }

    buffer += decoder.decode();
    buffer = flushStreamBuffer(buffer, handleEvent, true);

    if (finalResult) {
      return finalResult;
    }

    if (fullMessage.trim()) {
      return {
        message: fullMessage,
        model: '',
        sessionId: activeSessionId,
        retrievalHits: [],
        usage: {
          promptTokens: 0,
          completionTokens: 0,
          totalTokens: 0,
        },
      };
    }

    throw createStreamError('AI 暂未返回内容，请稍后再试。');
  } catch (error) {
    if (isAbortError(error)) {
      if (options.signal?.aborted) {
        throw error;
      }

      throw new ApiError('Request timed out.', { code: 'REQUEST_TIMEOUT' });
    }

    if (error instanceof ApiError) {
      throw error;
    }

    throw createStreamError(
      error instanceof Error ? error.message : 'AI 服务暂时不可用，请稍后重试',
      error,
    );
  } finally {
    window.clearTimeout(timeoutId);
    detachAbort();
  }
}

export const aiChatApi = {
  async getConfig(signal?: AbortSignal): Promise<AiChatConfig> {
    const response = await http.get<AiChatConfigRaw>('/api/AiChat/config', {
      headers: createApiHeaders(),
      signal,
      useMock: false,
    });

    return normalizeAiChatConfig(response);
  },

  async send(payload: AiChatSendPayload, signal?: AbortSignal): Promise<AiChatSendResult> {
    const response = await http.post<AiChatSendRaw, ReturnType<typeof buildSendPayload>>(
      '/api/AiChat/send',
      buildSendPayload(payload),
      {
        headers: createApiHeaders(),
        signal,
        timeout: AI_CHAT_SEND_TIMEOUT,
        useMock: false,
      },
    );

    return normalizeAiChatSendResult(response);
  },

  async stream(
    payload: AiChatSendPayload,
    options: AiChatStreamOptions = {},
  ): Promise<AiChatSendResult> {
    if (options.websocketUrl && supportsWebSocketTransport()) {
      try {
        return await streamViaWebSocket(payload, options);
      } catch (error) {
        if (isAbortError(error) || !shouldFallbackToSse(error)) {
          throw error;
        }
      }
    }

    return streamViaSse(payload, options);
  },

  async getSessions(limit = 12, signal?: AbortSignal): Promise<AiChatSessionSummary[]> {
    const response = await http.get<{ sessions?: AiChatSessionSummaryRaw[] | null }>('/api/AiChat/sessions', {
      headers: getAuthHeaders(),
      signal,
      query: { limit },
      useMock: false,
    });

    return Array.isArray(response?.sessions) ? response.sessions.map(normalizeSessionSummary) : [];
  },

  async getSessionDetail(sessionId: number, signal?: AbortSignal): Promise<AiChatSessionDetail> {
    const response = await http.get<AiChatSessionDetailRaw>('/api/AiChat/sessionDetail', {
      headers: getAuthHeaders(),
      signal,
      query: { session_id: sessionId },
      useMock: false,
    });

    return normalizeSessionDetail(response);
  },
};
