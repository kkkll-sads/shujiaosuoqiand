import { useState } from 'react';
import { getErrorMessage } from '../../api/core/errors';
import { authApi } from '../../api/modules/auth';
import {
  AuthAgreement,
  AuthFooterLink,
  AuthFormSection,
  AuthPasswordToggle,
  AuthSmsField,
  AuthTopBar,
} from '../../components/biz/auth';
import { Button } from '../../components/ui/Button';
import { Input } from '../../components/ui/Input';
import { useFeedback } from '../../components/ui/FeedbackProvider';
import { useSmsCode } from '../../hooks/useSmsCode';
import {
  MOBILE_PATTERN,
  PASSWORD_PATTERN,
  createAuthSession,
  persistAuthSession,
  resolveAuthRedirectPath,
} from '../../lib/auth';
import { useAppNavigate } from '../../lib/navigation';

export const RegisterPage = () => {
  const { goTo, goBack, navigate } = useAppNavigate();
  const { showToast } = useFeedback();

  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showPayPassword, setShowPayPassword] = useState(false);
  const [agree, setAgree] = useState(false);
  const [inviteCode, setInviteCode] = useState('');
  const [mobile, setMobile] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  const [payPassword, setPayPassword] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const { buttonText, canSend, message, sendCode, sending } = useSmsCode({
    event: 'user_register',
  });

  const handleSubmit = async () => {
    const normalizedMobile = mobile.trim();
    const normalizedPassword = loginPassword.trim();
    const normalizedPayPassword = payPassword.trim();
    const normalizedCode = verifyCode.trim();
    const normalizedInviteCode = inviteCode.trim();

    if (!MOBILE_PATTERN.test(normalizedMobile)) {
      showToast({ message: '请输入正确的手机号', type: 'warning' });
      return;
    }

    if (!PASSWORD_PATTERN.test(normalizedPassword)) {
      showToast({ message: '登录密码需为 6-32 位字母或数字', type: 'warning' });
      return;
    }

    if (!PASSWORD_PATTERN.test(normalizedPayPassword)) {
      showToast({ message: '支付密码需为 6-32 位字母或数字', type: 'warning' });
      return;
    }

    if (!normalizedCode) {
      showToast({ message: '请输入短信验证码', type: 'warning' });
      return;
    }

    if (!agree) {
      showToast({ message: '请先勾选用户协议与隐私政策', type: 'warning' });
      return;
    }

    setSubmitting(true);

    try {
      const response = await authApi.register({
        mobile: normalizedMobile,
        password: normalizedPassword,
        pay_password: normalizedPayPassword,
        captcha: normalizedCode,
        invite_code: normalizedInviteCode || undefined,
      });

      const session = createAuthSession(response, {
        mobile: normalizedMobile,
        username: normalizedMobile,
      });

      persistAuthSession(session, {
        persistent: true,
      });

      showToast({ message: '注册成功', type: 'success' });
      navigate(resolveAuthRedirectPath(session.routePath), { replace: true });
    } catch (error) {
      showToast({ message: getErrorMessage(error), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative flex h-full flex-1 flex-col overflow-y-auto bg-bg-base no-scrollbar">
      <div className="relative z-10 flex flex-1 flex-col overflow-y-auto px-4 pb-8 pt-12 no-scrollbar">
        <AuthTopBar onBack={goBack} />

        <AuthFormSection
          className="mt-16"
          title="Welcome!"
          description="欢迎注册树交所"
          actions={(
            <Button loading={submitting} onClick={handleSubmit}>
              注册
            </Button>
          )}
          footer={(
            <>
              <AuthAgreement
                checked={agree}
                onChange={() => setAgree((current) => !current)}
                onOpenAgreement={() => navigate('/user_agreement')}
                onOpenPrivacy={() => navigate('/privacy_policy')}
                mode="register"
              />
              <AuthFooterLink text="已有账户？" accentText="去登录" onClick={() => goTo('login')} />
            </>
          )}
        >
          <Input
            placeholder="请输入邀请码"
            value={inviteCode}
            onChange={(event) => setInviteCode(event.target.value)}
          />
          <Input
            placeholder="请输入手机号"
            type="tel"
            value={mobile}
            onChange={(event) => setMobile(event.target.value)}
          />
          <Input
            placeholder="请设置登录密码"
            type={showLoginPassword ? 'text' : 'password'}
            value={loginPassword}
            onChange={(event) => setLoginPassword(event.target.value)}
            rightIcon={<AuthPasswordToggle visible={showLoginPassword} onToggle={() => setShowLoginPassword((current) => !current)} />}
          />
          <Input
            placeholder="请设置支付密码"
            type={showPayPassword ? 'text' : 'password'}
            value={payPassword}
            onChange={(event) => setPayPassword(event.target.value)}
            rightIcon={<AuthPasswordToggle visible={showPayPassword} onToggle={() => setShowPayPassword((current) => !current)} />}
          />
          <AuthSmsField
            value={verifyCode}
            onChange={(event) => setVerifyCode(event.target.value)}
            buttonText={buttonText}
            canSend={canSend}
            message={message}
            sending={sending}
            onSend={() => void sendCode(mobile)}
          />
        </AuthFormSection>
      </div>
    </div>
  );
};

