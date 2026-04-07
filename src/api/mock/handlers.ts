import type { MockHandler, MockHandlerMap } from '../core/client';
import type { MessageCategory, MessageScope, MessageSummary } from '../modules/message';

/**
 * Mock 请求处理器映射表
 * 所有接口返回空数据或最小化结构，不包含硬编码业务数据。
 */

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function readValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function isMockEnvelope(payload: unknown): payload is Record<string, unknown> & { code: number | string; data: unknown } {
  return Boolean(payload) && typeof payload === 'object' && 'code' in payload && 'data' in payload;
}

function normalizeMockEnvelope(payload: unknown) {
  if (!isMockEnvelope(payload)) {
    return payload;
  }

  const message =
    typeof payload.message === 'string'
      ? payload.message
      : typeof payload.msg === 'string'
        ? payload.msg
        : '';

  return {
    ...payload,
    message,
    msg: typeof payload.msg === 'string' ? payload.msg : message,
    time: typeof payload.time === 'number' ? payload.time : Math.floor(Date.now() / 1000),
  };
}

function wrapMockHandlers(handlers: MockHandlerMap): MockHandlerMap {
  return Object.fromEntries(
    Object.entries(handlers).map(([key, handler]) => [
      key,
      (async (context) => normalizeMockEnvelope(await handler(context))) as MockHandler,
    ]),
  );
}

const mockAnnouncements = [
  {
    id: 101,
    title: '平台系统升级通知',
    content:
      '<p>为了提升稳定性，平台将于今晚 23:30 至次日 01:00 进行服务升级。</p><p>升级期间部分页面可能短暂不可用，请提前做好安排。</p>',
    type: 'normal',
    type_text: '平台公告',
    sort: 99,
    createtime: '2026-03-12 10:00:00',
    is_read: false,
  },
  {
    id: 102,
    title: '提货与发货时效说明',
    content:
      '<p>工作日 17:00 前完成支付的订单，将优先安排当日发货。</p><p>节假日期间时效可能顺延，具体以物流信息为准。</p>',
    type: 'normal',
    type_text: '平台公告',
    sort: 0,
    createtime: '2026-03-10 15:20:00',
    is_read: true,
  },
];

const mockHotVideos = [
  {
    id: 1001,
    title: '新品发布直播预告',
    summary: '本周五晚 20:00，带你快速了解新品亮点与玩法。',
    video_url: 'https://example.com/live/new-release',
    cover_image: 'https://picsum.photos/seed/hot-video-1/320/180',
    status: 'published',
    publish_time: 1773260400,
    sort: 90,
    view_count: 23800,
    create_time: 1773256800,
    like_count: 128,
    is_liked: false,
  },
  {
    id: 1002,
    title: '权益规则讲解专场',
    summary: '官方讲解权益升级路径、常见问题与操作注意事项。',
    video_url: 'https://example.com/live/rights-guide',
    cover_image: 'https://picsum.photos/seed/hot-video-2/320/180',
    status: 'published',
    publish_time: 1773174000,
    sort: 80,
    view_count: 15420,
    create_time: 1773170400,
    like_count: 56,
    is_liked: false,
  },
  {
    id: 1003,
    title: '平台活动精彩回放',
    summary: '错过直播也能快速回看活动重点，掌握报名与参与方式。',
    video_url: 'https://example.com/live/activity-highlights',
    cover_image: 'https://picsum.photos/seed/hot-video-3/320/180',
    status: 'published',
    publish_time: 1773087600,
    sort: 70,
    view_count: 9800,
    create_time: 1773084000,
    like_count: 33,
    is_liked: false,
  },
];

const mockHotVideoComments: Record<number, Array<{
  id: number;
  user_id: number;
  nickname: string;
  avatar: string;
  content: string;
  create_time: number;
  user_level: number;
  user_level_text: string;
  agent_level: number;
  agent_level_text: string;
  like_count: number;
  is_liked: boolean;
}>> = {
  1001: [
    {
      id: 5001,
      user_id: 2001,
      nickname: '小北',
      avatar: 'https://picsum.photos/seed/comment-5001/64/64',
      content: '讲得很清楚，期待下一场直播。',
      create_time: 1773264000,
      user_level: 2,
      user_level_text: '交易用户',
      agent_level: 3,
      agent_level_text: 'L3核心节点',
      like_count: 12,
      is_liked: false,
    },
    {
      id: 5002,
      user_id: 2002,
      nickname: '晴天',
      avatar: 'https://picsum.photos/seed/comment-5002/64/64',
      content: '这个内容对新手很友好。',
      create_time: 1773265800,
      user_level: 1,
      user_level_text: '普通用户',
      agent_level: 0,
      agent_level_text: '普通用户',
      like_count: 5,
      is_liked: false,
    },
  ],
  1002: [
    {
      id: 5003,
      user_id: 2003,
      nickname: '阿泽',
      avatar: 'https://picsum.photos/seed/comment-5003/64/64',
      content: '希望再详细讲讲配资规则。',
      create_time: 1773177600,
      user_level: 2,
      user_level_text: '交易用户',
      agent_level: 1,
      agent_level_text: 'L1代理',
      like_count: 2,
      is_liked: false,
    },
  ],
  1003: [],
};
let mockHotVideoCommentSeq = 9000;

/** Mock：点赞状态内存（与列表/详情/评论列表合并返回） */
const mockHotVideoLikeById: Record<number, { count: number; liked: boolean }> = {};
const mockHotVideoCommentLikeById: Record<number, { count: number; liked: boolean }> = {};

function readMockInt(value: unknown, fallback: number): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const n = Number(value);
    return Number.isFinite(n) ? n : fallback;
  }
  return fallback;
}

function mergeVideoLikeFields(video: (typeof mockHotVideos)[0]) {
  const id = video.id;
  const stored = mockHotVideoLikeById[id];
  const baseCount = readMockInt(video.like_count, 0);
  const baseLiked = Boolean(video.is_liked);
  return {
    like_count: stored ? stored.count : baseCount,
    is_liked: stored ? stored.liked : baseLiked,
  };
}

function mergeCommentLikeFields(comment: {
  id: number;
  like_count: number;
  is_liked: boolean;
}) {
  const stored = mockHotVideoCommentLikeById[comment.id];
  return {
    like_count: stored ? stored.count : comment.like_count,
    is_liked: stored ? stored.liked : comment.is_liked,
  };
}

function findMockCommentById(commentId: number) {
  for (const list of Object.values(mockHotVideoComments)) {
    const row = list.find((c) => c.id === commentId);
    if (row) {
      return row;
    }
  }
  return null;
}

type MockMessageType =
  | 'system'
  | 'order'
  | 'activity'
  | 'notice'
  | 'recharge'
  | 'withdraw'
  | 'shop_order';

interface MockMessageItem {
  id: string;
  message_key: string;
  source_type: string;
  source_id: number;
  category: MessageCategory;
  type: MockMessageType;
  scene: string;
  title: string;
  content: string;
  action_path: string;
  biz_type: string;
  biz_id: number;
  is_broadcast: 0 | 1;
  create_time: number;
  create_time_text: string;
}

const mockMessageItems: MockMessageItem[] = [
  {
    id: 'manual:301',
    message_key: 'manual:301',
    source_type: 'manual',
    source_id: 301,
    category: 'system',
    type: 'system',
    scene: 'system',
    title: '账户安全提醒',
    content: '检测到你的账户刚刚更新了支付密码，如非本人操作请立即联系客服。',
    action_path: '/security',
    biz_type: 'manual',
    biz_id: 301,
    is_broadcast: 0,
    create_time: 1773278400,
    create_time_text: '2026-03-11 20:00:00',
  },
  {
    id: 'announcement:101',
    message_key: 'announcement:101',
    source_type: 'announcement',
    source_id: 101,
    category: 'system',
    type: 'notice',
    scene: 'announcement',
    title: '平台公告',
    content: '平台系统升级通知',
    action_path: '/announcement/101',
    biz_type: 'announcement',
    biz_id: 101,
    is_broadcast: 1,
    create_time: 1773273000,
    create_time_text: '2026-03-11 18:30:00',
  },
  {
    id: 'shop_order:pending_confirm:208',
    message_key: 'shop_order:pending_confirm:208',
    source_type: 'shop_order',
    source_id: 208,
    category: 'order',
    type: 'shop_order',
    scene: 'pending_confirm',
    title: '订单已发货',
    content: '订单 SO202603120208 已发货，请及时查收并确认收货。',
    action_path: '/order/208',
    biz_type: 'shop_order',
    biz_id: 208,
    is_broadcast: 0,
    create_time: 1773267600,
    create_time_text: '2026-03-11 17:00:00',
  },
  {
    id: 'manual:401',
    message_key: 'manual:401',
    source_type: 'manual',
    source_id: 401,
    category: 'activity',
    type: 'activity',
    scene: 'dynamic',
    title: '问卷奖励已开放',
    content: '本周问卷已上线，完成后可领取积分奖励。',
    action_path: '/pages/questionnaire/index',
    biz_type: 'questionnaire',
    biz_id: 401,
    is_broadcast: 1,
    create_time: 1773262200,
    create_time_text: '2026-03-11 15:30:00',
  },
  {
    id: 'recharge:approved:55',
    message_key: 'recharge:approved:55',
    source_type: 'recharge_order',
    source_id: 55,
    category: 'finance',
    type: 'recharge',
    scene: 'approved',
    title: '充值到账',
    content: '充值订单 R202603120055 已审核通过，资金已到账。',
    action_path: '/recharge-order/55',
    biz_type: 'recharge_order',
    biz_id: 55,
    is_broadcast: 0,
    create_time: 1773256800,
    create_time_text: '2026-03-11 14:00:00',
  },
  {
    id: 'withdraw:pending_review:87',
    message_key: 'withdraw:pending_review:87',
    source_type: 'user_withdraw',
    source_id: 87,
    category: 'finance',
    type: 'withdraw',
    scene: 'pending_review',
    title: '提现审核中',
    content: '提现申请 W202603120087 正在审核，请耐心等待。',
    action_path: '/withdraw-order/87',
    biz_type: 'user_withdraw',
    biz_id: 87,
    is_broadcast: 0,
    create_time: 1773251400,
    create_time_text: '2026-03-11 12:30:00',
  },
];

const mockReadMessageKeys = new Set<string>(['announcement:101']);

function buildMessageSummary(messages: Array<{ category: MessageCategory; is_read: boolean | number }>): MessageSummary {
  const summary: MessageSummary = {
    system: 0,
    order: 0,
    activity: 0,
    finance: 0,
    total: 0,
  };

  messages.forEach((message) => {
    if (message.is_read) {
      return;
    }

    summary[message.category] += 1;
    summary.total += 1;
  });

  return summary;
}

function buildMockMessageFeed() {
  return mockMessageItems.map((item) => ({
    ...item,
    is_read: mockReadMessageKeys.has(item.message_key),
  }));
}

function filterMockMessages(
  messages: ReturnType<typeof buildMockMessageFeed>,
  scope: MessageScope,
  category: MessageCategory | '',
) {
  return messages.filter((message) => {
    if (scope === 'unread' && message.is_read) {
      return false;
    }

    if (category && message.category !== category) {
      return false;
    }

    return true;
  });
}

export const mockHandlers: MockHandlerMap = wrapMockHandlers({
  'GET /api/Announcement/index': ({ url }) => {
    const type = url.searchParams.get('type');
    const list = type ? mockAnnouncements.filter((item) => item.type === type) : mockAnnouncements;

    return {
      code: 1,
      message: 'ok',
      data: {
        list,
        total: list.length,
        current_page: 1,
        last_page: 1,
      },
    };
  },

  'GET /api/Announcement/detail': ({ url }) => {
    const id = Number(url.searchParams.get('id') || '0');
    const announcement = mockAnnouncements.find((item) => item.id === id);

    if (!announcement) {
      return {
        code: 0,
        message: '公告不存在',
        data: null,
      };
    }

    return {
      code: 1,
      message: 'ok',
      data: { announcement },
    };
  },

  'GET /api/Announcement/scroll': () => ({
    code: 1,
    message: 'ok',
    data: {
      list: mockAnnouncements.map((item) => ({
        id: item.id,
        title: item.title,
        type: item.type,
        is_read: item.is_read,
      })),
    },
  }),

  // ─── 公告弹窗 ───
  'GET /api/Announcement/popup': () => ({
    code: 1,
    message: 'ok',
    data: {
      list: [
        {
          id: 1,
          title: '平台公告',
          content: '<p>欢迎使用本平台，请留意官方公告。</p>',
          type: 'normal',
          popup_delay: 1,
          is_read: false,
        },
      ],
    },
  }),

  'GET /api/ContentHotVideo/index': ({ url }) => {
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || '10')));
    const title = readValue(url.searchParams.get('title')).toLowerCase();
    const filtered = title
      ? mockHotVideos.filter((item) => item.title.toLowerCase().includes(title))
      : mockHotVideos;
    const offset = (page - 1) * limit;
    const list = filtered.slice(offset, offset + limit);
    const lastPage = Math.max(1, Math.ceil(filtered.length / limit));

    return {
      code: 1,
      message: 'ok',
      data: {
        list,
        total: filtered.length,
        current_page: page,
        last_page: lastPage,
      },
    };
  },

  'GET /api/ContentHotVideo/detail': ({ url }) => {
    const id = Number(url.searchParams.get('id') || '0');
    const video = mockHotVideos.find((item) => item.id === id);
    if (!video) {
      return {
        code: 0,
        message: '视频不存在',
        data: null,
      };
    }

    const likeFields = mergeVideoLikeFields(video);

    return {
      code: 1,
      message: 'ok',
      data: {
        video: {
          ...video,
          ...likeFields,
          update_time: video.publish_time,
        },
      },
    };
  },

  'GET /api/ContentHotVideo/commentList': ({ url }) => {
    const id = Number(url.searchParams.get('id') || '0');
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || '10')));
    const allComments = mockHotVideoComments[id] ?? [];
    const offset = (page - 1) * limit;
    const list = allComments.slice(offset, offset + limit).map((row) => ({
      ...row,
      ...mergeCommentLikeFields(row),
    }));
    const lastPage = Math.max(1, Math.ceil(allComments.length / limit));

    return {
      code: 1,
      message: 'ok',
      data: {
        list,
        total: allComments.length,
        current_page: page,
        last_page: lastPage,
      },
    };
  },

  'POST /api/ContentHotVideo/like': ({ body }) => {
    const payload = asRecord(body);
    const id = readMockInt(payload.id, 0);
    const action = readValue(payload.action);
    if (!id) {
      return {
        code: 0,
        message: '缺少视频ID',
        data: null,
      };
    }
    if (action !== 'like' && action !== 'unlike') {
      return {
        code: 0,
        message: 'action 须为 like 或 unlike',
        data: null,
      };
    }
    const video = mockHotVideos.find((item) => item.id === id);
    if (!video) {
      return {
        code: 0,
        message: '视频不存在',
        data: null,
      };
    }
    const merged = mergeVideoLikeFields(video);
    let next = { count: merged.like_count, liked: merged.is_liked };
    if (action === 'like' && !next.liked) {
      next = { count: next.count + 1, liked: true };
    } else if (action === 'unlike' && next.liked) {
      next = { count: Math.max(0, next.count - 1), liked: false };
    }
    mockHotVideoLikeById[id] = next;
    return {
      code: 1,
      message: 'ok',
      data: {
        like_count: next.count,
        is_liked: next.liked,
      },
    };
  },

  'POST /api/ContentHotVideo/likeComment': ({ body }) => {
    const payload = asRecord(body);
    const commentId = readMockInt(payload.comment_id, 0);
    const action = readValue(payload.action);
    if (!commentId) {
      return {
        code: 0,
        message: '缺少 comment_id',
        data: null,
      };
    }
    if (action !== 'like' && action !== 'unlike') {
      return {
        code: 0,
        message: 'action 须为 like 或 unlike',
        data: null,
      };
    }
    const comment = findMockCommentById(commentId);
    if (!comment) {
      return {
        code: 0,
        message: '评论不存在',
        data: null,
      };
    }
    const merged = mergeCommentLikeFields(comment);
    let next = { count: merged.like_count, liked: merged.is_liked };
    if (action === 'like' && !next.liked) {
      next = { count: next.count + 1, liked: true };
    } else if (action === 'unlike' && next.liked) {
      next = { count: Math.max(0, next.count - 1), liked: false };
    }
    mockHotVideoCommentLikeById[commentId] = next;
    return {
      code: 1,
      message: 'ok',
      data: {
        like_count: next.count,
        is_liked: next.liked,
      },
    };
  },

  'POST /api/ContentHotVideo/submitComment': ({ body }) => {
    const payload = asRecord(body);
    const id = Number(payload.id || 0);
    const content = readValue(payload.content);
    if (!id) {
      return {
        code: 0,
        message: '缺少视频ID',
        data: null,
      };
    }
    if (!content) {
      return {
        code: 0,
        message: '评论内容不能为空',
        data: null,
      };
    }
    if (content.length > 300) {
      return {
        code: 0,
        message: '评论内容最多300字',
        data: null,
      };
    }

    const nextCommentId = ++mockHotVideoCommentSeq;
    const nextItem = {
      id: nextCommentId,
      user_id: 10000,
      nickname: '当前用户',
      avatar: 'https://picsum.photos/seed/comment-current-user/64/64',
      content,
      create_time: Math.floor(Date.now() / 1000),
      user_level: 1,
      user_level_text: '普通用户',
      agent_level: 0,
      agent_level_text: '普通用户',
      like_count: 0,
      is_liked: false,
    };
    if (!Array.isArray(mockHotVideoComments[id])) {
      mockHotVideoComments[id] = [];
    }
    mockHotVideoComments[id].unshift(nextItem);

    return {
      code: 1,
      message: 'ok',
      data: {
        comment_id: nextCommentId,
      },
    };
  },

  'GET /api/messageCenter/list': ({ url }) => {
    const scopeParam = url.searchParams.get('scope');
    const categoryParam = url.searchParams.get('category');
    const page = Math.max(1, Number(url.searchParams.get('page') || '1'));
    const limit = Math.min(50, Math.max(1, Number(url.searchParams.get('limit') || '20')));
    const scope: MessageScope = scopeParam === 'unread' ? 'unread' : 'all';
    const category: MessageCategory | '' =
      categoryParam === 'system' ||
      categoryParam === 'order' ||
      categoryParam === 'activity' ||
      categoryParam === 'finance'
        ? categoryParam
        : '';

    const feed = buildMockMessageFeed();
    const summary = buildMessageSummary(feed);
    const filtered = filterMockMessages(feed, scope, category);
    const offset = (page - 1) * limit;

    return {
      code: 1,
      message: 'ok',
      data: {
        list: filtered.slice(offset, offset + limit),
        total: filtered.length,
        page,
        limit,
        has_more: offset + limit < filtered.length,
        summary,
      },
    };
  },

  'GET /api/messageCenter/detail': ({ url }) => {
    const messageKey = readValue(url.searchParams.get('message_key'));
    const feed = buildMockMessageFeed();
    const message = feed.find((item) => item.message_key === messageKey);

    if (!message) {
      return {
        code: 0,
        message: '消息不存在',
        data: null,
      };
    }

    mockReadMessageKeys.add(message.message_key);

    return {
      code: 1,
      message: 'ok',
      data: {
        ...message,
        is_read: true,
      },
    };
  },

  'GET /api/messageCenter/unreadCount': () => ({
    code: 1,
    message: 'ok',
    data: buildMessageSummary(buildMockMessageFeed()),
  }),

  'POST /api/messageCenter/markRead': ({ body }) => {
    const payload = asRecord(body);
    const messageKey = readValue(payload.message_key);
    const category = readValue(payload.category);
    const feed = buildMockMessageFeed();

    let count = 0;

    if (messageKey) {
      const target = feed.find((item) => item.message_key === messageKey);
      if (target && !mockReadMessageKeys.has(target.message_key)) {
        mockReadMessageKeys.add(target.message_key);
        count = 1;
      }
    } else {
      feed.forEach((message) => {
        if (message.is_read) {
          return;
        }

        if (category && message.category !== category) {
          return;
        }

        if (!mockReadMessageKeys.has(message.message_key)) {
          mockReadMessageKeys.add(message.message_key);
          count += 1;
        }
      });
    }

    return {
      code: 1,
      message: 'ok',
      data: {
        count,
        summary: buildMessageSummary(buildMockMessageFeed()),
      },
    };
  },

  // ─── 消息列表 ───
  'GET /messages': () => ({
    code: 1,
    message: 'ok',
    data: [],
  }),

  // ─── 登录预检 ───
  'GET /api/User/checkIn': () => ({
    code: 1,
    message: 'ok',
    data: {
      userLoginCaptchaSwitch: false,
      accountVerificationType: [],
      loginTabs: ['login', 'sms_login'],
      defaultTab: 'login',
    },
  }),

  // ─── 登录 / 注册 / 短信登录 ───
  'POST /api/User/checkIn': ({ body }) => {
    const payload = asRecord(body);
    const tab = readValue(payload.tab);

    if (tab === 'login') {
      const username = readValue(payload.username);
      const password = readValue(payload.password);
      if (!username || !password) {
        return { code: 0, message: '请输入用户名和密码', data: null };
      }
      return { code: 0, message: 'Mock 模式下不支持登录，请连接后端', data: null };
    }

    if (tab === 'register') {
      const mobile = readValue(payload.mobile);
      const password = readValue(payload.password);
      const payPassword = readValue(payload.pay_password);
      const captcha = readValue(payload.captcha);
      if (!mobile || !password || !payPassword || !captcha) {
        return { code: 0, message: '请完整填写注册信息', data: null };
      }
      return { code: 0, message: 'Mock 模式下不支持注册，请连接后端', data: null };
    }

    if (tab === 'sms_login') {
      const mobile = readValue(payload.mobile);
      const captcha = readValue(payload.captcha);
      if (!mobile || !captcha) {
        return { code: 0, message: '请输入手机号和验证码', data: null };
      }
      return { code: 0, message: 'Mock 模式下不支持短信登录，请连接后端', data: null };
    }

    return { code: 0, message: '未知操作', data: null };
  },

  // ─── 短信发送 ───
  'POST /api/Sms/send': ({ body }) => {
    const payload = asRecord(body);
    const mobile = readValue(payload.mobile);
    const event = readValue(payload.event);

    if (!mobile) {
      return { code: 0, message: '请输入手机号', data: null };
    }
    if (!event) {
      return { code: 0, message: '缺少短信事件类型', data: null };
    }
    return { code: 1, message: '发送成功', data: null };
  },

  // ─── 老资产解锁状态 ───
  'GET /api/Account/checkOldAssetsUnlockStatus': () => ({
    code: 1,
    message: 'ok',
    data: {
      unlock_status: 0,
      unlock_conditions: {
        has_transaction: false,
        transaction_count: 0,
        direct_referrals_count: 0,
        qualified_referrals: 0,
        is_qualified: false,
        messages: [],
      },
      required_gold: 0,
      current_gold: 0,
      can_unlock: false,
      required_transactions: 0,
      required_referrals: 0,
      reward_value: 0,
    },
  }),

  // ─── 成长权益信息 ───
  'GET /api/Account/growthRightsInfo': () => ({
    code: 1,
    message: 'ok',
    data: {
      growth_days: 0,
      effective_trade_days: 0,
      today_trade_count: 0,
      total_trade_count: 0,
      pending_activation_gold: 0,
      growth_start_date: '',
      stage: { key: 'seedling', label: '初级阶段', rights_status: '未激活', min_days: 0 },
      stages: [],
      status: {
        can_activate: false,
        can_unlock_package: false,
        financing_enabled: false,
        is_accelerated_mode: false,
      },
      financing: { ratio: '--', rules: [] },
      cycle: {
        active_mode: 'daily_once',
        cycle_days: 0,
        completed_cycles: 0,
        next_cycle_in_days: 0,
        remaining_days_in_cycle: 0,
        unlock_amount_per_cycle: 0,
        unlockable_amount: 0,
        mode_progress: {},
      },
      daily_growth_logs: [],
    },
  }),

  // ─── 代理进度（周考核 + 烧伤收益上限）───
  'GET /api/Account/agentProgress': () => ({
    code: 1,
    message: 'ok',
    data: {
      agent: {
        user_type: 0,
        agent_level: 0,
        agent_level_text: '',
        agent_review_status: -1,
      },
      assessment: {
        enabled: 0,
        week_start: '',
        week_end: '',
        current_trades: 0,
        required_trades: 0,
        current_new_trading_users: 0,
        required_new_trading_users: 0,
        trade_progress_rate: 0,
        new_user_progress_rate: 0,
        is_currently_passed: 0,
      },
      earning_cap: {
        burn_enabled: 0,
        holding_value: '0.00',
        accumulated_commission: '0.00',
        max_claimable_total: '0.00',
        remaining_claimable: '0.00',
        claimed_rate: 0,
      },
    },
  }),

  // ─── 老资产解锁 ───
  'POST /api/Account/unlockOldAssets': () => ({
    code: 1,
    message: '解锁成功',
    data: {
      unlock_status: 1,
      consumed_gold: 0,
      reward_equity_package: 0,
      reward_consignment_coupon: 0,
    },
  }),

  // ─── 购物车 ───
  'GET /api/shopCart/count': () => ({
    code: 1,
    message: 'ok',
    data: { count: 0 },
  }),

  'GET /api/shopCart/list': () => ({
    code: 1,
    message: 'ok',
    data: { list: [] },
  }),

  // ─── 收货地址 ───
  'GET /api/shopAddress/index': () => ({
    code: 1,
    message: 'ok',
    data: { list: [] },
  }),

  'GET /api/shopAddress/getDefault': () => ({
    code: 1,
    message: 'ok',
    data: null,
  }),

  'POST /api/shopAddress/add': () => ({
    code: 1,
    message: '添加成功',
    data: { id: 0 },
  }),

  'POST /api/shopAddress/edit': () => ({
    code: 1,
    message: '修改成功',
    data: {},
  }),

  'POST /api/shopAddress/delete': () => ({
    code: 1,
    message: '删除成功',
    data: {},
  }),

  'POST /api/shopAddress/setDefault': () => ({
    code: 1,
    message: '设置成功',
    data: {},
  }),

  // ─── 购物车添加 ───
  'POST /api/shopCart/add': (ctx) => {
    const body = ctx.body as { product_id?: number; quantity?: number; sku_id?: number } | undefined;
    const quantity = typeof body?.quantity === 'number' && body.quantity > 0 ? body.quantity : 1;
    return { code: 1, message: 'ok', data: { id: 0, quantity } };
  },

  // ─── 订单创建 ───
  'POST /api/shopOrder/create': () => ({
    code: 1,
    message: 'ok',
    data: { order_id: 0, order_no: '', total_amount: 0 },
  }),

  // ─── 订单详情 ───
  'GET /api/shopOrder/detail': ({ url }) => {
    const id = url.searchParams.get('id');
    return {
      code: 1,
      message: 'ok',
      data: { id: id ? Number(id) : 0, balance_available: '0', score: '0' },
    };
  },

  // ─── 订单删除 ───
  'POST /api/shopOrder/delete': (ctx) => {
    const body = ctx.body as { order_id?: number } | undefined;
    const orderId = typeof body?.order_id === 'number' ? body.order_id : 0;
    return { code: 1, message: 'ok', data: { order_id: orderId } };
  },

  // ─── 订单取消 ───
  'POST /api/shopOrder/cancel': (ctx) => {
    const body = ctx.body as { order_id?: number; cancel_reason?: string } | undefined;
    const orderId = typeof body?.order_id === 'number' ? body.order_id : 0;
    return {
      code: 1,
      message: 'ok',
      data: { order_no: '', order_id: orderId, status: 'cancelled', need_review: false },
    };
  },

  // ─── 订单确认收货 ───
  'POST /api/shopOrder/confirm': (ctx) => {
    const body = ctx.body as { id?: number } | undefined;
    const orderId = typeof body?.id === 'number' ? body.id : 0;
    return { code: 1, message: 'ok', data: { id: orderId } };
  },

  // ─── 订单列表 ───
  'GET /api/shopOrder/myOrders': () => ({
    code: 1,
    message: 'ok',
    data: { list: [], balance_available: '0', score: '0' },
  }),
});
