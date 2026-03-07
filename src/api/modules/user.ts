import { createApiHeaders, type ApiAuthOptions } from '../core/headers';
import { http } from '../http';
import { resolveUploadUrl } from './upload';

export interface UserRequestOptions extends ApiAuthOptions {
  signal?: AbortSignal;
}

interface RealNameStatusRaw {
  audit_reason?: string;
  audit_time?: string;
  id_card: string;
  id_card_back?: string;
  id_card_front?: string;
  real_name: string;
  real_name_status: number;
}

interface H5AuthTokenRaw {
  authToken: string;
  authUrl: string;
}

interface SubmitRealNameRaw {
  real_name_status: number;
}

interface PaymentAccountRaw {
  account_name?: string;
  account_number?: string;
  account_number_display?: string;
  bank_branch?: string;
  bank_name?: string;
  icon?: string;
  id: number | string;
  remark?: string;
  type?: string;
  type_text?: string;
}

interface PaymentAccountListRaw {
  list?: PaymentAccountRaw[];
}

export interface RealNameStatus {
  auditReason?: string;
  auditTime?: string;
  idCard: string;
  idCardBack?: string;
  idCardFront?: string;
  realName: string;
  realNameStatus: number;
}

export interface H5AuthTokenInfo {
  authToken: string;
  authUrl: string;
}

export interface GetH5AuthTokenPayload {
  idCard: string;
  realName: string;
  redirectUrl: string;
}

export interface SubmitRealNamePayload {
  authToken: string;
  idCard: string;
  idCardBack?: string;
  idCardFront?: string;
  realName: string;
}

export interface SubmitRealNameResult {
  realNameStatus: number;
}

export interface PaymentAccount {
  accountName?: string;
  accountNumber?: string;
  bankBranch?: string;
  bankName?: string;
  icon?: string;
  id: number;
  remark?: string;
  type: string;
  typeText?: string;
}

function readOptionalString(value: string | undefined) {
  if (typeof value !== 'string') {
    return undefined;
  }

  const nextValue = value.trim();
  return nextValue || undefined;
}

function normalizeRealNameStatus(payload: RealNameStatusRaw): RealNameStatus {
  return {
    auditReason: payload.audit_reason || undefined,
    auditTime: payload.audit_time || undefined,
    idCard: payload.id_card,
    idCardBack: payload.id_card_back ? resolveUploadUrl(payload.id_card_back) : undefined,
    idCardFront: payload.id_card_front ? resolveUploadUrl(payload.id_card_front) : undefined,
    realName: payload.real_name,
    realNameStatus: payload.real_name_status,
  };
}

function normalizePaymentAccount(payload: PaymentAccountRaw): PaymentAccount {
  return {
    accountName: readOptionalString(payload.account_name),
    accountNumber: readOptionalString(payload.account_number_display ?? payload.account_number),
    bankBranch: readOptionalString(payload.bank_branch),
    bankName: readOptionalString(payload.bank_name),
    icon: payload.icon ? resolveUploadUrl(payload.icon) : undefined,
    id: Number(payload.id),
    remark: readOptionalString(payload.remark),
    type: readOptionalString(payload.type) || 'bank_card',
    typeText: readOptionalString(payload.type_text),
  };
}

export const userApi = {
  async getRealNameStatus(options: UserRequestOptions = {}): Promise<RealNameStatus> {
    const payload = await http.get<RealNameStatusRaw>('/api/User/realNameStatus', {
      headers: createApiHeaders(options),
      signal: options.signal,
    });

    return normalizeRealNameStatus(payload);
  },

  async getH5AuthToken(
    payload: GetH5AuthTokenPayload,
    options: UserRequestOptions = {},
  ): Promise<H5AuthTokenInfo> {
    const response = await http.post<H5AuthTokenRaw, Record<string, string>>(
      '/api/User/getH5AuthToken',
      {
        id_card: payload.idCard,
        real_name: payload.realName,
        redirect_url: payload.redirectUrl,
      },
      {
        headers: createApiHeaders(options),
        signal: options.signal,
      },
    );

    return {
      authToken: response.authToken,
      authUrl: response.authUrl,
    };
  },

  async submitRealName(
    payload: SubmitRealNamePayload,
    options: UserRequestOptions = {},
  ): Promise<SubmitRealNameResult> {
    const response = await http.post<SubmitRealNameRaw, Record<string, string>>(
      '/api/User/submitRealName',
      {
        auth_token: payload.authToken,
        id_card: payload.idCard,
        id_card_back: payload.idCardBack ?? '',
        id_card_front: payload.idCardFront ?? '',
        real_name: payload.realName,
      },
      {
        headers: createApiHeaders(options),
        signal: options.signal,
      },
    );

    return {
      realNameStatus: response.real_name_status,
    };
  },

  async getPaymentAccountList(options: UserRequestOptions = {}): Promise<PaymentAccount[]> {
    const payload = await http.get<PaymentAccountListRaw>('/api/User/getPaymentAccountList', {
      headers: createApiHeaders(options),
      signal: options.signal,
    });

    return (payload.list ?? []).map(normalizePaymentAccount);
  },

  async setDefaultPaymentAccount(id: number, options: UserRequestOptions = {}) {
    await http.post<unknown, { id: number }>(
      '/api/User/setDefaultPaymentAccount',
      { id },
      {
        headers: createApiHeaders(options),
        signal: options.signal,
      },
    );
  },
};
