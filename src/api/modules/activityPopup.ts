import { createApiHeaders } from '../core/headers';
import { http } from '../http';

export type ShowFrequency = 'once' | 'daily' | 'every_time';

export interface ActivityPopupItem {
  id: number;
  title: string;
  content: string;
  image: string;
  showFrequency: ShowFrequency;
  linkUrl: string;
  linkText: string;
  popupDelay: number;
}

interface ActivityPopupRaw {
  id?: number | string;
  title?: string;
  content?: string;
  image?: string;
  show_frequency?: string;
  link_url?: string;
  link_text?: string;
  popup_delay?: number | string;
}

function normalizeItem(raw: ActivityPopupRaw): ActivityPopupItem {
  const freq = String(raw.show_frequency ?? 'once').trim();
  return {
    id: Number(raw.id) || 0,
    title: String(raw.title ?? '').trim(),
    content: String(raw.content ?? ''),
    image: String(raw.image ?? '').trim(),
    showFrequency: (freq === 'daily' || freq === 'every_time' ? freq : 'once') as ShowFrequency,
    linkUrl: String(raw.link_url ?? '').trim(),
    linkText: String(raw.link_text ?? '').trim(),
    popupDelay: Math.max(0, Number(raw.popup_delay) || 0),
  };
}

export const activityPopupApi = {
  async getPopupList(signal?: AbortSignal): Promise<ActivityPopupItem[]> {
    const response = await http.get<{ list?: ActivityPopupRaw[] }>('/api/ActivityPopup/popup', {
      headers: createApiHeaders(),
      signal,
    });
    return Array.isArray(response?.list) ? response.list.map(normalizeItem) : [];
  },
};
