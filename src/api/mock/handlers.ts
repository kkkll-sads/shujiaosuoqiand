import type { MockHandlerMap } from '../core/client';
import type { AnnouncementItem } from '../modules/announcement';
import type { MessageItem, MessageTab } from '../modules/message';

const announcements: AnnouncementItem[] = [
  {
    id: '1',
    title: '关于防范冒充客服诈骗的风险提示',
    time: '2026-03-05 10:00',
    summary: '请勿点击陌生链接，也不要向非官方渠道转账或泄露验证码。',
    content:
      '近期发现有不法分子冒充平台客服，通过电话、短信或社交软件诱导用户转账或提供验证码。官方不会索要密码、验证码，也不会要求下载第三方远控软件。',
    isPinned: true,
  },
  {
    id: '2',
    title: '平台系统升级维护公告',
    time: '2026-03-03 14:30',
    summary: '系统将于本周日凌晨维护，部分功能可能短时不可用。',
    content:
      '平台计划于 2026-03-08 02:00 至 06:00 进行系统维护，期间商品浏览、下单支付和权益确认等功能可能短时不可用。',
    isPinned: false,
  },
  {
    id: '3',
    title: '春季活动规则说明',
    time: '2026-03-01 09:00',
    summary: '春季促销活动已开启，限时优惠和平台补贴同步上线。',
    content: '活动包含跨店满减、限时秒杀和专项补贴，具体规则请以前端活动页展示为准。',
    isPinned: false,
  },
];

const messagesByType: Record<MessageTab, MessageItem[]> = {
  system: [
    {
      id: 's1',
      title: '系统升级通知',
      summary: '今晚 02:00 至 04:00 将进行升级维护，部分功能短时不可用。',
      time: '2026-03-05 10:00',
      isRead: false,
    },
    {
      id: 's2',
      title: '实名认证审核通过',
      summary: '您的实名认证信息已审核通过，平台核心功能已开放。',
      time: '2026-03-04 15:30',
      isRead: true,
    },
  ],
  order: [
    {
      id: 'o1',
      title: '订单已发货',
      summary: '订单 1234567890 已发货，请注意查收。',
      time: '2小时前',
      isRead: false,
    },
    {
      id: 'o2',
      title: '退款处理完成',
      summary: '订单 0987654321 的退款已原路退回，预计 1 至 3 个工作日到账。',
      time: '昨天 14:20',
      isRead: true,
    },
  ],
  activity: [
    {
      id: 'a1',
      title: '春季预售开启',
      summary: '年度春季活动已上线，多类商品限时补贴。',
      time: '2026-03-01 00:00',
      isRead: false,
    },
  ],
};

interface MockAuthUser {
  id: string;
  mobile: string;
  password: string;
  payPassword: string;
  username: string;
}

const mockAuthUsers: MockAuthUser[] = [
  {
    id: '10001',
    mobile: '13800138000',
    password: 'abc12345',
    payPassword: 'pay12345',
    username: 'demo',
  },
];

function asRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' ? (value as Record<string, unknown>) : {};
}

function readValue(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function buildMockSession(user: MockAuthUser) {
  return {
    baToken: `mock-ba-token-${user.id}`,
    baUserToken: `mock-ba-user-token-${user.id}`,
    routePath: '/user',
    userInfo: {
      id: user.id,
      uid: user.id,
      username: user.username,
      nickname: `会员${user.mobile.slice(-4)}`,
      mobile: user.mobile,
    },
  };
}

export const mockHandlers: MockHandlerMap = {
  'GET /announcements': () => ({
    code: 1,
    message: 'ok',
    data: announcements,
  }),
  'GET /messages': ({ url }) => {
    const type = (url.searchParams.get('type') ?? 'system') as MessageTab;
    return {
      code: 1,
      message: 'ok',
      data: messagesByType[type] ?? [],
    };
  },
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
  'POST /api/User/checkIn': ({ body }) => {
    const payload = asRecord(body);
    const tab = readValue(payload.tab);

    if (tab === 'login') {
      const username = readValue(payload.username);
      const password = readValue(payload.password);

      if (!username || !password) {
        return {
          code: 0,
          message: '请输入用户名和密码',
          data: null,
        };
      }

      const user = mockAuthUsers.find(
        (item) => item.username === username || item.mobile === username,
      );

      if (!user) {
        return {
          code: 0,
          message: '帐户不存在',
          data: null,
        };
      }

      if (user.password !== password) {
        return {
          code: 0,
          message: '密码错误',
          data: null,
        };
      }

      return {
        code: 1,
        message: '登录成功',
        data: buildMockSession(user),
      };
    }

    if (tab === 'register') {
      const mobile = readValue(payload.mobile);
      const password = readValue(payload.password);
      const payPassword = readValue(payload.pay_password);
      const captcha = readValue(payload.captcha);

      if (!mobile || !password || !payPassword || !captcha) {
        return {
          code: 0,
          message: '请完整填写注册信息',
          data: null,
        };
      }

      const duplicated = mockAuthUsers.some(
        (item) => item.mobile === mobile || item.username === mobile,
      );

      if (duplicated) {
        return {
          code: 0,
          message: '手机号已注册',
          data: null,
        };
      }

      const nextUser: MockAuthUser = {
        id: String(10000 + mockAuthUsers.length + 1),
        mobile,
        password,
        payPassword,
        username: mobile,
      };

      mockAuthUsers.push(nextUser);

      return {
        code: 1,
        message: '注册成功',
        data: buildMockSession(nextUser),
      };
    }

    if (tab === 'sms_login') {
      const mobile = readValue(payload.mobile);
      const captcha = readValue(payload.captcha);

      if (!mobile || !captcha) {
        return {
          code: 0,
          message: '请输入手机号和验证码',
          data: null,
        };
      }

      const user = mockAuthUsers.find((item) => item.mobile === mobile);

      if (!user) {
        return {
          code: 0,
          message: '该手机号未注册',
          data: null,
        };
      }

      return {
        code: 1,
        message: '登录成功',
        data: buildMockSession(user),
      };
    }

    return {
      code: 0,
      message: '未知操作',
      data: null,
    };
  },
  'POST /api/Sms/send': ({ body }) => {
    const payload = asRecord(body);
    const mobile = readValue(payload.mobile);
    const event = readValue(payload.event);

    if (!mobile) {
      return {
        code: 0,
        message: '请输入手机号',
        data: null,
      };
    }

    const user = mockAuthUsers.find((item) => item.mobile === mobile);

    if (!event) {
      return {
        code: 0,
        message: '缺少短信事件类型',
        data: null,
      };
    }

    if (event === 'user_register' && user) {
      return {
        code: 0,
        message: '手机号已注册，请直接登录',
        data: null,
      };
    }

    if (['user_retrieve_pwd', 'user_mobile_verify', 'user_login'].includes(event) && !user) {
      return {
        code: 0,
        message: '手机号未注册',
        data: null,
      };
    }

    return {
      code: 1,
      message: '发送成功',
      data: null,
    };
  },
};
