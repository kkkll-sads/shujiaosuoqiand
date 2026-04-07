import { createApiHeaders, type ApiAuthOptions } from '../core/headers';
import { http } from '../http';
import type { AppPlatform } from '../../lib/appVersion';

export interface AppVersionRequestOptions extends ApiAuthOptions {
  signal?: AbortSignal;
}

export interface CheckUpdateParams {
  currentVersion: string;
  platform: AppPlatform;
}

export interface GetLatestVersionParams {
  platform: AppPlatform;
}

interface AppVersionInfoRaw {
  app_name: string;
  download_url: string;
  version_code: string;
  title: string;
  description: string;
  enabled_web: number;
  enabled_android: number;
}

interface CheckUpdateResultRaw {
  data?: AppVersionInfoRaw;
  message: string;
  need_update: boolean;
}

export interface AppVersionInfo {
  appName: string;
  downloadUrl: string;
  versionCode: string;
  title: string;
  description: string;
  enabledWeb: boolean;
  enabledAndroid: boolean;
}

export interface CheckUpdateResult {
  data?: AppVersionInfo;
  message: string;
  needUpdate: boolean;
}

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/+$/, '');

function resolveDownloadUrl(raw: string): string {
  if (!raw) return '';
  if (/^https?:\/\//i.test(raw)) return raw;
  if (raw.startsWith('//')) {
    const path = raw.replace(/^\/\/[^/]+/, '');
    return API_BASE + path;
  }
  if (raw.startsWith('/')) return API_BASE + raw;
  return API_BASE + '/' + raw;
}

function normalizeVersionInfo(payload: AppVersionInfoRaw): AppVersionInfo {
  return {
    appName: payload.app_name,
    downloadUrl: resolveDownloadUrl(payload.download_url),
    versionCode: payload.version_code,
    title: payload.title || '',
    description: payload.description || '',
    enabledWeb: payload.enabled_web === 1,
    enabledAndroid: payload.enabled_android === 1,
  };
}

export const appVersionApi = {
  async checkUpdate(
    params: CheckUpdateParams,
    options: AppVersionRequestOptions = {},
  ): Promise<CheckUpdateResult> {
    const payload = await http.get<CheckUpdateResultRaw>('/api/AppVersion/checkUpdate', {
      headers: createApiHeaders(options),
      query: {
        current_version: params.currentVersion,
        platform: params.platform,
      },
      signal: options.signal,
    });

    return {
      data: payload.data ? normalizeVersionInfo(payload.data) : undefined,
      message: payload.message,
      needUpdate: payload.need_update,
    };
  },

  async getLatestVersion(
    params: GetLatestVersionParams,
    options: AppVersionRequestOptions = {},
  ): Promise<AppVersionInfo> {
    const payload = await http.get<AppVersionInfoRaw>('/api/AppVersion/getLatestVersion', {
      headers: createApiHeaders(options),
      query: {
        platform: params.platform,
      },
      signal: options.signal,
    });

    return normalizeVersionInfo(payload);
  },
};
