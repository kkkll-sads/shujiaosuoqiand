/**
 * @file Settings/index.tsx
 * @description 应用设置页面，包括缓存清理、账户安全、注销与退出登录。
 */

import { useState } from 'react';
import { AlertTriangle, Info, LogOut, Shield, Trash2, UserX } from 'lucide-react';
import { accountApi } from '../../api';
import { getErrorMessage } from '../../api/core/errors';
import { AuthPasswordToggle } from '../../components/biz/auth';
import {
  SettingsActionItem,
  SettingsNotice,
  SettingsSection,
} from '../../components/biz/settings/SettingsSection';
import { PageHeader } from '../../components/layout/PageHeader';
import { Button } from '../../components/ui/Button';
import { useFeedback } from '../../components/ui/FeedbackProvider';
import { Input } from '../../components/ui/Input';
import { clearAuthSession, PASSWORD_PATTERN } from '../../lib/auth';
import { CURRENT_APP_VERSION, formatVersionLabel } from '../../lib/appVersion';
import { useAppNavigate } from '../../lib/navigation';

function readCacheSizeLabel() {
  try {
    let total = 0;
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key) {
        total += (localStorage.getItem(key) ?? '').length;
      }
    }

    return total > 1024 * 1024 ? `${(total / (1024 * 1024)).toFixed(1)}MB` : `${(total / 1024).toFixed(1)}KB`;
  } catch {
    return '0KB';
  }
}

export const SettingsPage = () => {
  const { goBack, goTo } = useAppNavigate();
  const { showToast, showLoading, hideLoading } = useFeedback();

  const [cacheSize, setCacheSize] = useState(() => readCacheSizeLabel());
  const [showCancelAccountForm, setShowCancelAccountForm] = useState(false);
  const [cancelPassword, setCancelPassword] = useState('');
  const [cancelReason, setCancelReason] = useState('');
  const [showCancelPassword, setShowCancelPassword] = useState(false);
  const [cancelSubmitting, setCancelSubmitting] = useState(false);

  const clearCache = () => {
    try {
      const keysToKeep = ['member_auth_session', 'access_token', 'ba-token', 'ba-user-token', 'app-theme'];
      const keysToRemove: string[] = [];

      for (let index = 0; index < localStorage.length; index += 1) {
        const key = localStorage.key(index);
        if (key && !keysToKeep.includes(key)) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach((key) => localStorage.removeItem(key));
      sessionStorage.clear();
    } catch {
      // Ignore cache cleanup failures.
    }

    setCacheSize('0KB');
    showToast({ message: '缓存清理成功', type: 'success' });
  };

  const resetCancelAccountForm = () => {
    setShowCancelAccountForm(false);
    setCancelPassword('');
    setCancelReason('');
    setShowCancelPassword(false);
  };

  const handleLogout = () => {
    clearAuthSession();
    goTo('login');
  };

  const handleCancelAccount = async () => {
    const password = cancelPassword.trim();
    const reason = cancelReason.trim();

    if (!password) {
      showToast({ message: '请输入账户密码', type: 'warning' });
      return;
    }

    if (!PASSWORD_PATTERN.test(password)) {
      showToast({ message: '账户密码需为 6-32 位字母或数字', type: 'warning' });
      return;
    }

    setCancelSubmitting(true);
    showLoading({ message: '正在提交注销申请...', subMessage: '提交成功后当前账号将退出登录' });

    try {
      await accountApi.cancelAccount({
        password,
        reason: reason || undefined,
      });
      hideLoading();
      clearAuthSession();
      resetCancelAccountForm();
      showToast({ message: '账户已注销', type: 'success' });
      goTo('login');
    } catch (error) {
      hideLoading();
      showToast({ message: getErrorMessage(error), type: 'error' });
    } finally {
      setCancelSubmitting(false);
    }
  };

  return (
    <div className="flex h-full flex-1 flex-col overflow-hidden bg-bg-base">
      <PageHeader title="设置" onBack={goBack} />
      <div className="flex-1 overflow-y-auto p-4 pb-8">
        <div className="space-y-4">
          <SettingsSection title="账户安全" description="密码修改、验证码重置和安全入口统一放在这里。">
            <SettingsActionItem
              label="修改登录密码"
              description="校验旧密码后修改，成功后需要重新登录"
              icon={<Shield size={18} />}
              onClick={() => goTo('change_password')}
            />
            <SettingsActionItem
              label="修改支付密码"
              description="用于支付和资金验证"
              icon={<Shield size={18} />}
              onClick={() => goTo('change_pay_password')}
            />
            <SettingsActionItem
              label="验证码重置登录密码"
              description="通过短信验证码快速重置登录密码"
              icon={<Info size={18} />}
              onClick={() => goTo('reset_password')}
            />
          </SettingsSection>

          <SettingsSection>
            <SettingsActionItem
              label="账户与安全"
              description="查看绑定手机号、密码和安全说明"
              icon={<Shield size={18} />}
              onClick={() => goTo('security')}
            />
            <SettingsActionItem
              label="清理缓存"
              description="清理本地缓存，不影响登录状态"
              icon={<Trash2 size={18} />}
              value={cacheSize}
              variant="secondary"
              onClick={clearCache}
            />
            <SettingsActionItem
              label="关于我们"
              description="当前应用版本"
              value={formatVersionLabel(CURRENT_APP_VERSION)}
              onClick={() => goTo('about')}
            />
          </SettingsSection>

          <SettingsNotice title="说明">
            清理缓存仅会移除本地临时数据。修改登录密码后，系统会要求重新登录。
          </SettingsNotice>

          <SettingsNotice tone="warning" title="危险操作">
            注销账户后将退出当前登录状态。请确认账户内资产、订单和服务已处理完毕后再操作。
          </SettingsNotice>

          <SettingsSection>
            <SettingsActionItem
              label="注销账户"
              description={showCancelAccountForm ? '正在填写注销信息' : '提交账户密码进行二次确认，可填写注销原因'}
              icon={<UserX size={18} />}
              variant="danger"
              hideChevron={showCancelAccountForm}
              onClick={() => setShowCancelAccountForm((current) => !current)}
            />
            {showCancelAccountForm ? (
              <div className="space-y-3 border-b border-border-light/80 px-4 py-4">
                <Input
                  placeholder="请输入账户密码"
                  type={showCancelPassword ? 'text' : 'password'}
                  value={cancelPassword}
                  onChange={(event) => setCancelPassword(event.target.value)}
                  rightIcon={
                    <AuthPasswordToggle
                      visible={showCancelPassword}
                      onToggle={() => setShowCancelPassword((value) => !value)}
                    />
                  }
                />
                <Input
                  placeholder="请输入注销原因（选填）"
                  value={cancelReason}
                  onChange={(event) => setCancelReason(event.target.value)}
                />
                <div className="rounded-[20px] border border-red-100 bg-red-50/70 px-4 py-3 text-[12px] leading-5 text-primary-start">
                  注销成功后会立即清除当前登录状态。如后端对账户注销有额外限制，将按接口返回信息提示。
                </div>
                <div className="flex gap-3">
                  <button
                    type="button"
                    onClick={resetCancelAccountForm}
                    className="flex-1 rounded-full bg-bg-base py-3 text-[15px] font-medium text-text-main"
                    disabled={cancelSubmitting}
                  >
                    取消
                  </button>
                  <Button className="flex-1" loading={cancelSubmitting} onClick={handleCancelAccount}>
                    确认注销
                  </Button>
                </div>
              </div>
            ) : null}
            <SettingsActionItem
              label="退出登录"
              description="退出当前账户，并返回登录页"
              icon={<LogOut size={18} />}
              variant="danger"
              borderless
              onClick={handleLogout}
            />
          </SettingsSection>

          <SettingsNotice tone="warning" title="注销提醒" className="flex items-start gap-2">
            <AlertTriangle size={16} className="mt-0.5 shrink-0" />
            <span>本页已移除悬浮窗确认，危险操作会直接在当前页面内展开或执行。</span>
          </SettingsNotice>
        </div>
      </div>
    </div>
  );
};
