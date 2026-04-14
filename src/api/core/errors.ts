export interface ApiErrorOptions {
  status?: number;
  code?: number | string;
  details?: unknown;
}

const GENERIC_ERROR_MESSAGE = '服务暂时不可用，请稍后重试。';

const SENSITIVE_ERROR_PATTERNS = [
  /sqlstate\[/i,
  /\bstack trace\b/i,
  /\b(?:pdo|runtime|type|reference|syntax|parse|fatal)\s*error\b/i,
  /\buncaught\b/i,
  /\bexception\b/i,
  /\bundefined\b/i,
  /\bcall to\b/i,
  /\btoo few arguments\b/i,
  /\btoo many arguments\b/i,
  /\battempt to\b/i,
  /\bclass\s+["'][^"']+["']/i,
  /(^|[\s(])#\d+\s+/,
  /\sin\s+\/[^:\s]+\.(php|ts|tsx|js|jsx)(?::\d+)?/i,
  /<[^>]+>/,
];

export class ApiError extends Error {
  readonly status?: number;
  readonly code?: number | string;
  readonly details?: unknown;

  constructor(message: string, options: ApiErrorOptions = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = options.status;
    this.code = options.code;
    this.details = options.details;
  }
}

export function isAbortError(error: unknown): boolean {
  return error instanceof Error && error.name === 'AbortError';
}

export function sanitizeUserFacingMessage(message: unknown, fallback = GENERIC_ERROR_MESSAGE): string {
  if (typeof message !== 'string') {
    return fallback;
  }

  const normalized = message.replace(/\s+/g, ' ').trim();
  if (!normalized) {
    return fallback;
  }

  const isSensitive = SENSITIVE_ERROR_PATTERNS.some((pattern) => pattern.test(normalized));
  if (!isSensitive) {
    return normalized;
  }

  const prefixMatch = normalized.match(/^(.{1,20}?(?:失败|错误|异常))(?:[:：].*)?$/u);
  if (prefixMatch?.[1]) {
    return `${prefixMatch[1]}，请稍后重试。`;
  }

  if (/网络|超时|timeout|network/i.test(normalized)) {
    return '网络异常，请检查网络后重试。';
  }

  return fallback;
}

export function getErrorMessage(error: unknown): string {
  if (error instanceof ApiError) {
    return sanitizeUserFacingMessage(error.message);
  }

  if (error instanceof Error && error.message) {
    return sanitizeUserFacingMessage(error.message);
  }

  return GENERIC_ERROR_MESSAGE;
}
