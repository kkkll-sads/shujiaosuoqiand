import { http } from '../http';

export type MessageTab = 'system' | 'order' | 'activity';

export interface MessageItem {
  id: string;
  isRead: boolean;
  summary: string;
  time: string;
  title: string;
}

export const messageApi = {
  list(type: MessageTab, signal?: AbortSignal) {
    return http.get<MessageItem[]>('/messages', {
      query: { type },
      signal,
    });
  },
};
