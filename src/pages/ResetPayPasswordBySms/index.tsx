import { useEffect, useState } from 'react';
import { accountApi } from '../../api';
import { getErrorMessage } from '../../api/core/errors';
import { userApi } from '../../api/modules/user';
import {
  AuthFormSection,
  AuthPasswordToggle,
  AuthSmsField,
} from '../../components/biz/auth';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { useFeedback } from '../../components/ui/FeedbackProvider';
import { Input } from '../../components/ui/Input';
import { useSmsCode } from '../../hooks/useSmsCode';
import { MOBILE_PATTERN, PASSWORD_PATTERN } from '../../lib/auth';
import { useAppNavigate } from '../../lib/navigation';

export const ResetPayPasswordBySmsPage = () => {
  const { goBackOr } = useAppNavigate();
  const { showToast } = useFeedback();
  const [mobile, setMobile] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  const { buttonText, canSend, message, sendCode, sending } = useSmsCode({
    event: 'reset_pay_password',
  });

  useEffect(() => {
    void accountApi
      .getProfile()
      .then((profile) => {
        if (profile.userInfo?.mobile) {
          setMobile(profile.userInfo.mobile);
        }
      })
      .catch(() => undefined);
  }, []);

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
      showToast({ message: '新支付密码需为 6-32 位字母或数字', type: 'warning' });
      return;
    }

    if (normalizedPassword !== normalizedConfirmPassword) {
      showToast({ message: '两次输入的新支付密码不一致', type: 'warning' });
      return;
    }

    setSubmitting(true);
    try {
      await userApi.resetPayPasswordBySms({
        mobile: normalizedMobile,
        captcha: normalizedCode,
        newPayPassword: normalizedPassword,
      });
      showToast({ message: '支付密码已重置', type: 'success' });
      goBackOr('settings');
    } catch (error) {
      showToast({ message: getErrorMessage(error), type: 'error' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-bg-base">
      <PageHeader title="验证码重置支付密码" onBack={() => goBackOr('settings')} />
      <div className="flex-1 overflow-y-auto p-4 pb-8">
        <div className="rounded-[24px] bg-bg-card px-4 pb-4 shadow-soft">
          <AuthFormSection
            actions={(
              <Button loading={submitting} onClick={handleSubmit}>
                重置支付密码
              </Button>
            )}
          >
            <Input placeholder="请输入手机号" type="tel" value={mobile} onChange={(event) => setMobile(event.target.value)} />
            <AuthSmsField
              value={verifyCode}
              onChange={(event) => setVerifyCode(event.target.value)}
              buttonText={buttonText}
              canSend={canSend}
              message={message}
              sending={sending}
              onSend={() => void sendCode(mobile)}
            />
            <Input
              placeholder="请输入新支付密码"
              type={showPassword ? 'text' : 'password'}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              rightIcon={<AuthPasswordToggle visible={showPassword} onToggle={() => setShowPassword((value) => !value)} />}
            />
            <Input
              placeholder="请再次输入新支付密码"
              type={showConfirmPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(event) => setConfirmPassword(event.target.value)}
              rightIcon={<AuthPasswordToggle visible={showConfirmPassword} onToggle={() => setShowConfirmPassword((value) => !value)} />}
            />
          </AuthFormSection>
        </div>
      </div>
    </div>
  );
};

export default ResetPayPasswordBySmsPage;

