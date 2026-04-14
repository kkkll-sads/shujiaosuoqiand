import { createApiHeaders, type ApiAuthOptions } from '../core/headers';
import { http } from '../http';

export interface BalanceTreasureRequestOptions extends ApiAuthOptions {
  signal?: AbortSignal;
}

export type BalanceTreasureDirection = 'in' | 'out';

interface BalanceTreasureAccountRaw {
  account_type?: string;
  account_name?: string;
  product_name?: string;
  description?: string;
  source_balance?: number | string;
  principal?: number | string;
  profit?: number | string;
  total_balance?: number | string;
  total_in_amount?: number | string;
  total_out_amount?: number | string;
  total_profit_amount?: number | string;
  daily_rate?: number | string;
  estimated_daily_profit?: number | string;
  allow_transfer_in?: boolean | number | string;
  allow_transfer_out?: boolean | number | string;
  min_transfer_in?: number | string;
  min_transfer_out?: number | string;
  daily_in_limit?: number | string;
  daily_out_limit?: number | string;
  daily_in_count_limit?: number | string;
  daily_out_count_limit?: number | string;
  remaining_in_count?: number | string | null;
  remaining_out_count?: number | string | null;
  today_in_amount?: number | string;
  today_out_amount?: number | string;
}

interface BalanceTreasureSummaryRaw {
  title?: string;
  description?: string;
  total_balance?: number | string;
  total_principal?: number | string;
  total_profit?: number | string;
  total_estimated_daily_profit?: number | string;
  accounts?: BalanceTreasureAccountRaw[];
}

interface BalanceTreasureSubmitRaw {
  account_type?: string;
  account_name?: string;
  direction?: string;
  amount?: number | string;
  source_balance?: number | string;
  treasure_balance?: number | string;
  principal?: number | string;
  profit?: number | string;
}

export interface BalanceTreasureAccount {
  accountType: string;
  accountName: string;
  productName: string;
  description: string;
  sourceBalance: number;
  principal: number;
  profit: number;
  totalBalance: number;
  totalInAmount: number;
  totalOutAmount: number;
  totalProfitAmount: number;
  dailyRate: number;
  estimatedDailyProfit: number;
  allowTransferIn: boolean;
  allowTransferOut: boolean;
  minTransferIn: number;
  minTransferOut: number;
  dailyInLimit: number;
  dailyOutLimit: number;
  dailyInCountLimit: number;
  dailyOutCountLimit: number;
  remainingInCount?: number | null;
  remainingOutCount?: number | null;
  todayInAmount: number;
  todayOutAmount: number;
}

export interface BalanceTreasureSummary {
  title: string;
  description: string;
  totalBalance: number;
  totalPrincipal: number;
  totalProfit: number;
  totalEstimatedDailyProfit: number;
  accounts: BalanceTreasureAccount[];
}

export interface BalanceTreasureSubmitResult {
  accountType: string;
  accountName: string;
  direction: BalanceTreasureDirection;
  amount: number;
  sourceBalance: number;
  treasureBalance: number;
  principal: number;
  profit: number;
}

function readNumber(value: number | string | undefined, fallback = 0) {
  const nextValue = typeof value === 'string' ? Number(value) : value;
  return typeof nextValue === 'number' && Number.isFinite(nextValue) ? nextValue : fallback;
}

function readOptionalNumber(value: number | string | null | undefined) {
  if (value == null) {
    return null;
  }
  const nextValue = typeof value === 'string' ? Number(value) : value;
  return typeof nextValue === 'number' && Number.isFinite(nextValue) ? nextValue : null;
}

function readString(value: string | undefined, fallback = '') {
  if (typeof value !== 'string') {
    return fallback;
  }

  const nextValue = value.trim();
  return nextValue || fallback;
}

function readBoolean(value: boolean | number | string | undefined, fallback = false) {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'number') {
    return value === 1;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (normalized === '1' || normalized === 'true') {
      return true;
    }
    if (normalized === '0' || normalized === 'false') {
      return false;
    }
  }

  return fallback;
}

function normalizeAccount(payload: BalanceTreasureAccountRaw): BalanceTreasureAccount {
  return {
    accountType: readString(payload.account_type),
    accountName: readString(payload.account_name),
    productName: readString(payload.product_name, '余额宝'),
    description: readString(payload.description),
    sourceBalance: readNumber(payload.source_balance),
    principal: readNumber(payload.principal),
    profit: readNumber(payload.profit),
    totalBalance: readNumber(payload.total_balance),
    totalInAmount: readNumber(payload.total_in_amount),
    totalOutAmount: readNumber(payload.total_out_amount),
    totalProfitAmount: readNumber(payload.total_profit_amount),
    dailyRate: readNumber(payload.daily_rate),
    estimatedDailyProfit: readNumber(payload.estimated_daily_profit),
    allowTransferIn: readBoolean(payload.allow_transfer_in),
    allowTransferOut: readBoolean(payload.allow_transfer_out),
    minTransferIn: readNumber(payload.min_transfer_in),
    minTransferOut: readNumber(payload.min_transfer_out),
    dailyInLimit: readNumber(payload.daily_in_limit),
    dailyOutLimit: readNumber(payload.daily_out_limit),
    dailyInCountLimit: readNumber(payload.daily_in_count_limit),
    dailyOutCountLimit: readNumber(payload.daily_out_count_limit),
    remainingInCount: readOptionalNumber(payload.remaining_in_count),
    remainingOutCount: readOptionalNumber(payload.remaining_out_count),
    todayInAmount: readNumber(payload.today_in_amount),
    todayOutAmount: readNumber(payload.today_out_amount),
  };
}

function normalizeSummary(payload: BalanceTreasureSummaryRaw): BalanceTreasureSummary {
  return {
    title: readString(payload.title, '余额宝'),
    description: readString(payload.description),
    totalBalance: readNumber(payload.total_balance),
    totalPrincipal: readNumber(payload.total_principal),
    totalProfit: readNumber(payload.total_profit),
    totalEstimatedDailyProfit: readNumber(payload.total_estimated_daily_profit),
    accounts: (payload.accounts ?? []).map(normalizeAccount),
  };
}

function normalizeSubmitResult(payload: BalanceTreasureSubmitRaw): BalanceTreasureSubmitResult {
  return {
    accountType: readString(payload.account_type),
    accountName: readString(payload.account_name),
    direction: (readString(payload.direction, 'in') as BalanceTreasureDirection),
    amount: readNumber(payload.amount),
    sourceBalance: readNumber(payload.source_balance),
    treasureBalance: readNumber(payload.treasure_balance),
    principal: readNumber(payload.principal),
    profit: readNumber(payload.profit),
  };
}

export const balanceTreasureApi = {
  async summary(options: BalanceTreasureRequestOptions = {}): Promise<BalanceTreasureSummary> {
    const payload = await http.get<BalanceTreasureSummaryRaw>('/api/BalanceTreasure/summary', {
      headers: createApiHeaders(options),
      isSuccessCode: (code) => code === 1 || code === '1',
      signal: options.signal,
    });

    return normalizeSummary(payload);
  },

  async submit(
    payload: { accountType: string; direction: BalanceTreasureDirection; amount: number },
    options: BalanceTreasureRequestOptions = {},
  ): Promise<BalanceTreasureSubmitResult> {
    const response = await http.post<
      BalanceTreasureSubmitRaw,
      { account_type: string; direction: BalanceTreasureDirection; amount: number }
    >(
      '/api/BalanceTreasure/submit',
      {
        account_type: payload.accountType,
        direction: payload.direction,
        amount: payload.amount,
      },
      {
        headers: createApiHeaders(options),
        isSuccessCode: (code) => code === 1 || code === '1',
        signal: options.signal,
      },
    );

    return normalizeSubmitResult(response);
  },
};
