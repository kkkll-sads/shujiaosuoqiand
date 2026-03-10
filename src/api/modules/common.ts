import { createApiHeaders } from '../core/headers';
import { http } from '../http';

export type CommonPageType = 'user_agreement' | 'privacy_policy' | 'about_us';

export interface CommonPageData {
  title?: string;
  content?: unknown;
  update_time?: string;
}

export const commonApi = {
  async getPage(
    params: { type: CommonPageType },
    signal?: AbortSignal,
  ): Promise<CommonPageData> {
    return http.get<CommonPageData>('/api/Common/page', {
      headers: createApiHeaders(),
      query: params,
      signal,
      useMock: false,
    });
  },
};
