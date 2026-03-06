import { http } from '../http';

export interface AnnouncementItem {
  content: string;
  id: string;
  isPinned: boolean;
  summary: string;
  time: string;
  title: string;
}

export const announcementApi = {
  list(signal?: AbortSignal) {
    return http.get<AnnouncementItem[]>('/announcements', { signal });
  },
};
