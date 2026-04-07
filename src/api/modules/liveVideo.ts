import { createApiHeaders } from '../core/headers';
import { http } from '../http';

interface LiveVideoConfigRaw {
  description?: string;
  title?: string;
  video_url?: string;
}

interface HotVideoItemRaw {
  id?: number | string;
  title?: string;
  summary?: string;
  video_url?: string;
  cover_image?: string;
  status?: string;
  publish_time?: number | string;
  sort?: number | string;
  view_count?: number | string;
  create_time?: number | string;
  update_time?: number | string;
  like_count?: number | string;
  is_liked?: number | string | boolean;
}

interface HotVideoListRaw {
  list?: HotVideoItemRaw[];
  total?: number | string;
  current_page?: number | string;
  last_page?: number | string;
}

interface HotVideoDetailRaw {
  video?: HotVideoItemRaw;
}

interface HotVideoCommentItemRaw {
  id?: number | string;
  user_id?: number | string;
  nickname?: string;
  avatar?: string;
  content?: string;
  create_time?: number | string;
  user_level?: number | string;
  user_level_text?: string;
  agent_level?: number | string;
  agent_level_text?: string;
  like_count?: number | string;
  is_liked?: number | string | boolean;
}

interface HotVideoCommentListRaw {
  list?: HotVideoCommentItemRaw[];
  total?: number | string;
  current_page?: number | string;
  last_page?: number | string;
}

export interface LiveVideoConfig {
  description: string;
  title: string;
  videoUrl: string;
}

export interface HotVideoItem {
  id: number;
  title: string;
  summary: string;
  videoUrl: string;
  coverImage: string;
  status: string;
  publishTime: number;
  sort: number;
  viewCount: number;
  createTime: number;
  updateTime: number;
  /** 点赞数 */
  likeCount: number;
  /** 当前用户是否已点赞（需登录且带 token） */
  isLiked: boolean;
}

export interface HotVideoListResult {
  list: HotVideoItem[];
  total: number;
  currentPage: number;
  lastPage: number;
}

export interface GetHotVideoListParams {
  page?: number;
  limit?: number;
  title?: string;
}

export interface HotVideoDetailResult {
  video: HotVideoItem;
}

export interface HotVideoCommentItem {
  id: number;
  userId: number;
  nickname: string;
  avatar: string;
  content: string;
  createTime: number;
  userLevel: number;
  userLevelText: string;
  agentLevel: number;
  agentLevelText: string;
  likeCount: number;
  isLiked: boolean;
}

export interface HotVideoCommentListResult {
  list: HotVideoCommentItem[];
  total: number;
  currentPage: number;
  lastPage: number;
}

export interface GetHotVideoCommentListParams {
  id: number;
  page?: number;
  limit?: number;
}

export interface SubmitHotVideoCommentParams {
  id: number;
  content: string;
}

export interface SubmitHotVideoCommentResult {
  commentId: number;
}

export interface LikeHotVideoParams {
  id: number;
  action: 'like' | 'unlike';
}

export interface LikeHotVideoCommentParams {
  commentId: number;
  action: 'like' | 'unlike';
}

export interface LikeHotVideoResult {
  likeCount: number;
  isLiked: boolean;
}

function readString(value: string | undefined): string {
  return typeof value === 'string' ? value.trim() : '';
}

function readNumber(value: number | string | undefined, fallback = 0): number {
  const nextValue = typeof value === 'string' ? Number(value) : value;
  return typeof nextValue === 'number' && Number.isFinite(nextValue) ? nextValue : fallback;
}

/** 接口 is_liked：boolean / 0/1 / 字符串 */
function readBooleanLiked(value: unknown, fallback = false): boolean {
  if (value === true || value === 1 || value === '1') {
    return true;
  }
  if (value === false || value === 0 || value === '0' || value === '') {
    return false;
  }
  if (typeof value === 'string') {
    const lower = value.trim().toLowerCase();
    if (lower === 'true' || lower === 'yes') {
      return true;
    }
    if (lower === 'false' || lower === 'no') {
      return false;
    }
  }
  return fallback;
}

interface LikeActionResponseRaw {
  like_count?: number | string;
  is_liked?: number | string | boolean;
  likeCount?: number | string;
  isLiked?: number | string | boolean;
}

function normalizeLikeActionResult(payload: LikeActionResponseRaw | null | undefined): LikeHotVideoResult {
  return {
    likeCount: readNumber(payload?.like_count ?? payload?.likeCount),
    isLiked: readBooleanLiked(payload?.is_liked ?? payload?.isLiked),
  };
}

function normalizeConfig(payload: LiveVideoConfigRaw | null | undefined): LiveVideoConfig {
  return {
    description: readString(payload?.description),
    title: readString(payload?.title),
    videoUrl: readString(payload?.video_url),
  };
}

function normalizeHotVideoItem(payload: HotVideoItemRaw | undefined): HotVideoItem {
  return {
    id: readNumber(payload?.id),
    title: readString(payload?.title),
    summary: readString(payload?.summary),
    videoUrl: readString(payload?.video_url),
    coverImage: readString(payload?.cover_image),
    status: readString(payload?.status),
    publishTime: readNumber(payload?.publish_time),
    sort: readNumber(payload?.sort),
    viewCount: readNumber(payload?.view_count),
    createTime: readNumber(payload?.create_time),
    updateTime: readNumber(payload?.update_time),
    likeCount: readNumber(payload?.like_count),
    isLiked: readBooleanLiked(payload?.is_liked),
  };
}

function normalizeHotVideoCommentItem(payload: HotVideoCommentItemRaw | undefined): HotVideoCommentItem {
  const userLevel = Math.max(0, Math.min(2, readNumber(payload?.user_level)));
  const agentLevel = Math.max(0, Math.min(5, readNumber(payload?.agent_level)));

  const defaultUserLevelText = userLevel === 0 ? '新用户' : userLevel === 1 ? '普通用户' : '交易用户';
  const defaultAgentLevelText = agentLevel > 0 ? `L${agentLevel}代理` : '普通用户';
  return {
    id: readNumber(payload?.id),
    userId: readNumber(payload?.user_id),
    nickname: readString(payload?.nickname) || '匿名用户',
    avatar: readString(payload?.avatar),
    content: readString(payload?.content),
    createTime: readNumber(payload?.create_time),
    userLevel,
    userLevelText: readString(payload?.user_level_text) || defaultUserLevelText,
    agentLevel,
    agentLevelText: readString(payload?.agent_level_text) || defaultAgentLevelText,
    likeCount: readNumber(payload?.like_count),
    isLiked: readBooleanLiked(payload?.is_liked),
  };
}

export const liveVideoApi = {
  async getConfig(signal?: AbortSignal): Promise<LiveVideoConfig> {
    const response = await http.get<LiveVideoConfigRaw>('/api/liveVideo/config', {
      signal,
    });

    return normalizeConfig(response);
  },

  async getHotVideoList(
    params: GetHotVideoListParams = {},
    signal?: AbortSignal,
  ): Promise<HotVideoListResult> {
    const response = await http.get<HotVideoListRaw>('/api/ContentHotVideo/index', {
      headers: createApiHeaders(),
      query: {
        page: params.page ?? 1,
        limit: params.limit ?? 10,
        title: params.title,
      },
      signal,
    });

    return {
      list: (response?.list ?? []).map(normalizeHotVideoItem),
      total: readNumber(response?.total),
      currentPage: readNumber(response?.current_page, params.page ?? 1),
      lastPage: readNumber(response?.last_page, 1),
    };
  },

  async getHotVideoDetail(id: number, signal?: AbortSignal): Promise<HotVideoDetailResult> {
    const response = await http.get<HotVideoDetailRaw>('/api/ContentHotVideo/detail', {
      headers: createApiHeaders(),
      query: { id },
      signal,
    });

    const video = normalizeHotVideoItem(response?.video);
    if (video.id <= 0) {
      throw new Error('视频不存在或已下架');
    }

    return { video };
  },

  async getHotVideoCommentList(
    params: GetHotVideoCommentListParams,
    signal?: AbortSignal,
  ): Promise<HotVideoCommentListResult> {
    const response = await http.get<HotVideoCommentListRaw>('/api/ContentHotVideo/commentList', {
      headers: createApiHeaders(),
      query: {
        id: params.id,
        page: params.page ?? 1,
        limit: params.limit ?? 10,
      },
      signal,
    });

    return {
      list: (response?.list ?? []).map(normalizeHotVideoCommentItem),
      total: readNumber(response?.total),
      currentPage: readNumber(response?.current_page, params.page ?? 1),
      lastPage: readNumber(response?.last_page, 1),
    };
  },

  async submitHotVideoComment(
    params: SubmitHotVideoCommentParams,
    signal?: AbortSignal,
  ): Promise<SubmitHotVideoCommentResult> {
    const response = await http.post<{ comment_id?: number | string }, SubmitHotVideoCommentParams>(
      '/api/ContentHotVideo/submitComment',
      {
        id: params.id,
        content: params.content,
      },
      {
        headers: createApiHeaders(),
        signal,
      },
    );

    return {
      commentId: readNumber(response?.comment_id),
    };
  },

  async likeHotVideo(params: LikeHotVideoParams, signal?: AbortSignal): Promise<LikeHotVideoResult> {
    const response = await http.post<LikeActionResponseRaw, { id: number; action: string }>(
      '/api/ContentHotVideo/like',
      {
        id: params.id,
        action: params.action,
      },
      {
        headers: createApiHeaders(),
        signal,
      },
    );

    return normalizeLikeActionResult(response);
  },

  async likeHotVideoComment(
    params: LikeHotVideoCommentParams,
    signal?: AbortSignal,
  ): Promise<LikeHotVideoResult> {
    const response = await http.post<LikeActionResponseRaw, { comment_id: number; action: string }>(
      '/api/ContentHotVideo/likeComment',
      {
        comment_id: params.commentId,
        action: params.action,
      },
      {
        headers: createApiHeaders(),
        signal,
      },
    );

    return normalizeLikeActionResult(response);
  },
};
