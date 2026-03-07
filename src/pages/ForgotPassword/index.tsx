import { useState } from 'react';
import { Eye, EyeOff, Headset } from 'lucide-react';
import { getErrorMessage } from '../../api/core/errors';
import { authApi } from '../../api/modules/auth';
import { Button } from '../../components/ui/Button';
import { useFeedback } from '../../components/ui/FeedbackProvider';
import { Input } from '../../components/ui/Input';
import { useSmsCode } from '../../hooks/useSmsCode';
import { MOBILE_PATTERN, PASSWORD_PATTERN } from '../../lib/auth';
import { useAppNavigate } from '../../lib/navigation';

export const ForgotPasswordPage = () => {
  const { goTo, goBack } = useAppNavigate();
  const { showToast } = useFeedback();

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [mobile, setMobile] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { buttonText, canSend, message, sendCode } = useSmsCode({
    event: 'user_retrieve_pwd',
  });

  const handleSendCode = async () => {
    await sendCode(mobile);
  };

  const handleSubmit = async () => {
    const normalizedMobile = mobile.trim();
    const normalizedCode = verifyCode.trim();
    const normalizedPassword = password.trim();
    const normalizedConfirmPassword = confirmPassword.trim();

    if (!MOBILE_PATTERN.test(normalizedMobile)) {
      showToast({ message: '请输入正确的手机号', type: 'warning' });
      return;
    }

    if (!normalizedCode) {
      showToast({ message: '请输入短信验证码', type: 'warning' });
      return;
    }

    if (!PASSWORD_PATTERN.test(normalizedPassword)) {
      showToast({ message: '新密码需为 6-32 位字母或数字', type: 'warning' });
      return;
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      showToast({ message: '两次输入的密码不一致', type: 'warning' });
      return;
    }

    setSubmitting(true);

    try {
      await authApi.retrievePassword({
        type: 'mobile',
        account: normalizedMobile,
        captcha: normalizedCode,
        password: normalizedPassword,
      });

      showToast({ message: '密码已重置，请使用新密码登录', type: 'success' });
      goTo('login');
    } catch (error) {
      showToast({ message: getErrorMessage(error), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-y-auto bg-[#FFF8F8] no-scrollbar">
      <div className="relative z-10 flex flex-1 flex-col overflow-y-auto px-4 pb-8 pt-12 no-scrollbar">
        <div className="absolute left-4 right-4 top-4 z-20 flex justify-between">
          <button
            type="button"
            className="-ml-2 p-2 text-text-main active:opacity-70"
            onClick={goBack}
          >
            <svg
              width="24"
              height="24"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="m15 18-6-6 6-6" />
            </svg>
          </button>
          <button
            type="button"
            className="flex items-center rounded-full border border-border-light bg-bg-card/60 px-3 py-1.5 text-[12px] text-text-main shadow-sm backdrop-blur-md"
          >
            <Headset size={14} className="mr-1" />
            客服
          </button>
        </div>

        <div className="mb-10 mt-16">
          <h1 className="mb-2 text-[28px] font-bold text-text-main">Reset!</h1>
          <p className="text-[18px] text-text-sub">通过短信验证码重置登录密码</p>
        </div>

        <div className="mb-4 space-y-4">
          <Input
            placeholder="请输入手机号"
            type="tel"
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
          />

          <div className="space-y-2">
            <div className="flex space-x-3">
              <Input
                placeholder="请输入验证码"
                className="flex-1"
                value={verifyCode}
                onChange={(event) => setVerifyCode(event.target.value)}
              />
              <button
                type="button"
                disabled={!canSend}
                onClick={handleSendCode}
                className="h-[48px] whitespace-nowrap rounded-[20px] border border-border-light bg-bg-card px-4 text-[15px] font-medium text-primary-start shadow-soft disabled:cursor-not-allowed disabled:opacity-50"
              >
                {buttonText}
              </button>
            </div>
            {message && <p className="px-1 text-[12px] text-primary-start">{message}</p>}
          </div>

          <Input
            placeholder="请输入新密码"
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

          <Input
            placeholder="请再次输入新密码"
            type={showConfirmPassword ? 'text' : 'password'}
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            rightIcon={
              <button
                type="button"
                className="focus:outline-none"
                onClick={() => setShowConfirmPassword((current) => !current)}
              >
                {showConfirmPassword ? <Eye size={18} /> : <EyeOff size={18} />}
              </button>
            }
          />
        </div>

        <Button className="mb-4" disabled={submitting} onClick={handleSubmit}>
          {submitting ? '提交中...' : '重置密码'}
        </Button>

        <div className="mb-auto rounded-[20px] bg-bg-card/70 px-4 py-3 text-[12px] leading-5 text-text-sub shadow-soft">
          找回密码会校验手机号和短信验证码，提交后立即生效。
        </div>

        <div className="mt-12 text-center">
          <button
            type="button"
            className="text-[15px] font-medium text-text-main"
            onClick={() => goTo('login')}
          >
            返回登录
          </button>
        </div>
      </div>
    </div>
  );
};
