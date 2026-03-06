import { apiConfig } from '../config';
import { createApiHeaders, type ApiAuthOptions } from '../core/headers';
import { http } from '../http';

export type UploadDriver = 'local' | 'aliyun';

export interface UploadFilePayload {
  file: File;
  driver?: UploadDriver;
  topic?: string;
}

export interface UploadFileOptions extends ApiAuthOptions {
  signal?: AbortSignal;
}

export interface UploadedFile {
  id: number;
  url: string;
  name: string;
  size: number;
  mimetype: string;
  width?: number;
  height?: number;
  sha1: string;
  storage: string;
}

export function resolveUploadUrl(url: string): string {
  if (!url) {
    return url;
  }

  if (/^https?:\/\//i.test(url)) {
    return url;
  }

  return new URL(url.startsWith('/') ? url : `/${url}`, apiConfig.baseURL).toString();
}

export const uploadApi = {
  async upload(payload: UploadFilePayload, options: UploadFileOptions = {}) {
    const formData = new FormData();

    formData.append('file', payload.file);

    if (payload.driver) {
      formData.append('driver', payload.driver);
    }

    if (payload.topic) {
      formData.append('topic', payload.topic);
    }

    const response = await http.post<UploadedFile, FormData>('/api/ajax/upload', formData, {
      headers: createApiHeaders(options),
      signal: options.signal,
    });

    return {
      ...response,
      url: resolveUploadUrl(response.url),
    };
  },
};
