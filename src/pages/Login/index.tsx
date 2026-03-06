import { useEffect, useMemo, useState } from 'react';
import { Eye, EyeOff, Headset } from 'lucide-react';
import { getErrorMessage } from '../../api/core/errors';
import { authApi, type CheckInConfig, type LoginTab } from '../../api/modules/auth';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { Checkbox } from '../../components/ui/Checkbox';
import { useFeedback } from '../../components/ui/FeedbackProvider';
import { Input } from '../../components/ui/Input';
import { useSmsCode } from '../../hooks/useSmsCode';
import {
  MOBILE_PATTERN,
  PASSWORD_PATTERN,
  createAuthSession,
  persistAuthSession,
  resolveAuthRedirectPath,
} from '../../lib/auth';
import { useAppNavigate } from '../../lib/navigation';

const TAB_LABELS: Record<LoginTab, string> = {
  login: '账号登录',
  sms_login: '验证码登录',
};

function isLoginTab(value: string): value is LoginTab {
  return value === 'login' || value === 'sms_login';
}

function resolveLoginTabs(value: CheckInConfig['loginTabs']): LoginTab[] {
  const rawTabs = Array.isArray(value)
    ? value
    : typeof value === 'string'
      ? value.split(',')
      : ['login'];

  const tabs = rawTabs
    .map((item) => item.trim())
    .filter(isLoginTab)
    .filter((item, index, items) => items.indexOf(item) === index);

  return tabs.length > 0 ? tabs : ['login'];
}

function resolveDefaultTab(value: CheckInConfig['defaultTab']): LoginTab | null {
  return typeof value === 'string' && isLoginTab(value) ? value : null;
}

export const LoginPage = () => {
  const { goTo, goBack, navigate } = useAppNavigate();
  const { showToast } = useFeedback();

  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [agree, setAgree] = useState(false);
  const [currentTab, setCurrentTab] = useState<LoginTab>('login');
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [mobile, setMobile] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [config, setConfig] = useState<CheckInConfig | null>(null);

  const { buttonText, canSend, message, sendCode } = useSmsCode({
    event: 'user_login',
  });

  const availableTabs = useMemo(() => resolveLoginTabs(config?.loginTabs), [config?.loginTabs]);

  useEffect(() => {
    let active = true;

    const loadConfig = async () => {
      try {
        const response = await authApi.getCheckInConfig();
        if (active) {
          setConfig(response);
        }
      } catch {
        if (active) {
          setConfig(null);
        }
      }
    };

    void loadConfig();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    const defaultTab = resolveDefaultTab(config?.defaultTab);

    setCurrentTab((current) => {
      if (availableTabs.includes(current)) {
        return current;
      }

      if (defaultTab && availableTabs.includes(defaultTab)) {
        return defaultTab;
      }

      return availableTabs[0];
    });
  }, [availableTabs, config?.defaultTab]);

  const handleSendCode = async () => {
    await sendCode(mobile);
  };

  const handleSubmit = async () => {
    if (!agree) {
      showToast({ message: '请先勾选用户协议与隐私政策', type: 'warning' });
      return;
    }

    setSubmitting(true);

    try {
      let response;
      let sessionIdentity: { mobile?: string; username?: string };

      if (currentTab === 'login') {
        const normalizedUsername = username.trim();
        const normalizedPassword = password.trim();

        if (!normalizedUsername) {
          showToast({ message: '请输入用户名或手机号', type: 'warning' });
          return;
        }

        if (!PASSWORD_PATTERN.test(normalizedPassword)) {
          showToast({ message: '登录密码需为 6-32 位字母或数字', type: 'warning' });
          return;
        }

        response = await authApi.login({
          username: normalizedUsername,
          password: normalizedPassword,
          keep: remember ? 1 : 0,
        });

        sessionIdentity = {
          mobile: MOBILE_PATTERN.test(normalizedUsername) ? normalizedUsername : undefined,
          username: normalizedUsername,
        };
      } else {
        const normalizedMobile = mobile.trim();
        const normalizedCode = verifyCode.trim();

        if (!MOBILE_PATTERN.test(normalizedMobile)) {
          showToast({ message: '请输入正确的手机号', type: 'warning' });
          return;
        }

        if (!normalizedCode) {
          showToast({ message: '请输入短信验证码', type: 'warning' });
          return;
        }

        response = await authApi.smsLogin({
          mobile: normalizedMobile,
          captcha: normalizedCode,
          keep: remember ? 1 : 0,
        });

        sessionIdentity = {
          mobile: normalizedMobile,
          username: normalizedMobile,
        };
      }

      const session = createAuthSession(response, sessionIdentity);

      persistAuthSession(session, {
        persistent: remember,
      });

      showToast({ message: '登录成功', type: 'success' });
      navigate(resolveAuthRedirectPath(session.routePath), { replace: true });
    } catch (error) {
      showToast({ message: getErrorMessage(error), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex flex-1 flex-col bg-bg-base">
      <PageHeader
        title="会员登录"
        onBack={() => goBack()}
        rightAction={
          <button className="flex items-center rounded-full border border-border-light bg-bg-card/80 px-3 py-1.5 text-sm text-text-main shadow-sm backdrop-blur-md">
            <Headset size={14} className="mr-1" />
            客服
          </button>
        }
        className="bg-transparent"
        contentClassName="h-14 px-4 pt-safe"
      />

      <div className="flex-1 overflow-y-auto px-4 pb-8">
        <div className="mb-8 mt-6">
          <h1 className="mb-2 text-5xl font-bold text-text-main">Hello!</h1>
          <p className="text-base text-text-sub">
            {currentTab === 'sms_login' ? '使用手机验证码登录' : '使用会员账号登录'}
          </p>
        </div>

        {availableTabs.length > 1 && (
          <div className="mb-4 grid grid-cols-2 rounded-3xl border border-border-light bg-bg-card/70 p-1 shadow-soft">
            {availableTabs.map((tab) => (
              <button
                key={tab}
                type="button"
                onClick={() => setCurrentTab(tab)}
                className={`rounded-[20px] px-4 py-3 text-sm font-medium transition ${
                  currentTab === tab
                    ? 'bg-white text-text-main shadow-soft'
                    : 'text-text-sub'
                }`}
              >
                {TAB_LABELS[tab]}
              </button>
            ))}
          </div>
        )}

        <div className="space-y-4">
          {currentTab === 'login' ? (
            <>
              <Input
                placeholder="请输入用户名或手机号"
                value={username}
                onChange={(event) => setUsername(event.target.value)}
              />
              <Input
                placeholder="请输入登录密码"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                rightIcon={
                  <button
                    type="button"
                    className="focus:outline-none"
                    onClick={() => setShowPassword((current) => !current)}
                  >
                    {showPassword ? <Eye size={18} /> : <EyeOff size={18} />}
                  </button>
                }
              />
            </>
          ) : (
            <>
              <Input
                placeholder="请输入手机号"
                type="tel"
                value={mobile}
                onChange={(event) => setMobile(event.target.value)}
              />
              <div className="space-y-2">
                <div className="flex space-x-3">
                  <Input
                    placeholder="请输入短信验证码"
                    className="flex-1"
                    value={verifyCode}
                    onChange={(event) => setVerifyCode(event.target.value)}
                  />
                  <button
                    type="button"
                    disabled={!canSend}
                    onClick={handleSendCode}
                    className="h-[48px] whitespace-nowrap rounded-2xl border border-border-light bg-bg-card px-4 text-base font-medium text-primary-start shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    {buttonText}
                  </button>
                </div>
                {message && <p className="px-1 text-sm text-primary-start">{message}</p>}
              </div>
            </>
          )}
        </div>

        <div className="mt-4 flex items-center justify-between">
          <Checkbox checked={remember} onChange={() => setRemember((current) => !current)} label="保持登录" />
          {currentTab === 'login' ? (
            <button type="button" className="text-sm text-text-sub">
              忘记密码
            </button>
          ) : (
            <span className="text-sm text-text-sub">验证码将发送到当前手机号</span>
          )}
        </div>

        <div className="mt-4 flex items-start">
          <Checkbox checked={agree} onChange={() => setAgree((current) => !current)} className="mt-0.5" />
          <p className="ml-2 text-sm leading-6 text-text-sub">
            登录即代表你已同意
            <a href="#" className="mx-1 text-primary-start">
              用户协议
            </a>
            和
            <a href="#" className="mx-1 text-primary-start">
              隐私政策
            </a>
          </p>
        </div>

        <Button className="mt-6" disabled={submitting} onClick={handleSubmit}>
          {submitting ? '登录中...' : '登录'}
        </Button>

        <div className="mt-8 text-center">
          <button type="button" className="text-base font-medium text-text-main" onClick={() => goTo('register')}>
            没有账号？去注册
          </button>
        </div>
      </div>
    </div>
  );
};
