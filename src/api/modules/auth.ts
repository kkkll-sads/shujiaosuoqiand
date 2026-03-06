import { http } from '../http';

export type LoginTab = 'login' | 'sms_login';
export type CheckInTab = LoginTab | 'register';

export interface UserInfo {
  id?: number | string;
  uid?: number | string;
  username?: string;
  nickname?: string;
  mobile?: string;
  avatar?: string;
  [key: string]: unknown;
}

export interface CheckInConfig {
  userLoginCaptchaSwitch: boolean;
  accountVerificationType: string[] | string | null;
  loginTabs?: LoginTab[] | string[] | string | null;
  defaultTab?: LoginTab | string | null;
}

export interface CheckInResponseData {
  userInfo?: UserInfo;
  routePath?: string;
  token?: string;
  accessToken?: string;
  userToken?: string;
  baToken?: string;
  baUserToken?: string;
  [key: string]: unknown;
}

export interface AccountLoginPayload {
  tab: 'login';
  username: string;
  password: string;
  captchaId?: string;
  captchaInfo?: string;
  keep?: 0 | 1;
}

export interface SmsLoginPayload {
  tab: 'sms_login';
  mobile: string;
  captcha: string;
  keep?: 0 | 1;
}

export interface RegisterPayload {
  tab: 'register';
  mobile: string;
  password: string;
  pay_password: string;
  captcha: string;
  invite_code?: string;
}

export const authApi = {
  getCheckInConfig(signal?: AbortSignal) {
    return http.get<CheckInConfig>('/api/User/checkIn', {
      signal,
    });
  },

  login(payload: Omit<AccountLoginPayload, 'tab'>, signal?: AbortSignal) {
    return http.post<CheckInResponseData, AccountLoginPayload>(
      '/api/User/checkIn',
      {
        tab: 'login',
        ...payload,
      },
      {
        signal,
      },
    );
  },

  smsLogin(payload: Omit<SmsLoginPayload, 'tab'>, signal?: AbortSignal) {
    return http.post<CheckInResponseData, SmsLoginPayload>(
      '/api/User/checkIn',
      {
        tab: 'sms_login',
        ...payload,
      },
      {
        signal,
      },
    );
  },

  register(payload: Omit<RegisterPayload, 'tab'>, signal?: AbortSignal) {
    return http.post<CheckInResponseData, RegisterPayload>(
      '/api/User/checkIn',
      {
        tab: 'register',
        ...payload,
      },
      {
        signal,
      },
    );
  },
};
