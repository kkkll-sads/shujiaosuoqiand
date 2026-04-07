/**
 * @file AboutUs/index.tsx - 关于我们页面
 * @description 展示应用基本信息（名称、版本、渠道、构建号），
 *              提供检查更新、用户协议、隐私政策入口以及联系电话复制功能。
 */

// ======================== 依赖导入 ========================

import { useMemo, useState } from 'react';
import { ChevronRight, Copy } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { appVersionApi } from '../../api';
import type { AppVersionInfo } from '../../api/modules/appVersion';
import { getErrorMessage } from '../../api/core/errors';
import { PageHeader } from '../../components/layout/PageHeader';
import { UpdateModal, type UpdateModalMode, dismissUpdate, dismissDownload } from '../../components/biz/UpdateModal';
import { copyToClipboard } from '../../lib/clipboard';
import { useFeedback } from '../../components/ui/FeedbackProvider';
import { useNetworkStatus } from '../../hooks/useNetworkStatus';
import { useRequest } from '../../hooks/useRequest';
import { useDisplayVersion } from '../../hooks/useLatestAppVersion';
import {
  APP_BUILD_NUMBER,
  APP_CHANNEL,
  APP_PLATFORM,
  CURRENT_APP_VERSION,
  compareAppVersions,
  formatVersionLabel,
  isNativeApp,
} from '../../lib/appVersion';

// ======================== 常量 ========================

/** 从环境变量中读取客服联系电话，未配置时为空字符串 */
const CONTACT_PHONE = import.meta.env.VITE_CONTACT_PHONE?.trim() ?? '';

// ======================== 工具函数 ========================

// ======================== 页面组件 ========================

/**
 * AboutUsPage - "关于我们"页面组件
 *
 * 功能概览：
 * 1. 显示应用 Logo、名称、当前版本号
 * 2. 检查更新：请求后端获取最新版本，若有新版则提示并打开下载链接
 * 3. 展示最新版本号
 * 4. 跳转用户协议 / 隐私政策页面
 * 5. 显示客服电话并支持一键复制
 * 6. 底部展示版权信息、渠道号、构建号
 */
export const AboutUsPage = () => {
  const navigate = useNavigate();
  const { isOffline } = useNetworkStatus();
  const { showToast } = useFeedback();
  const [isCheckingUpdate, setIsCheckingUpdate] = useState(false);
  const [showUpdate, setShowUpdate] = useState(false);
  const [updateInfo, setUpdateInfo] = useState<AppVersionInfo | null>(null);
  const [updateMode, setUpdateMode] = useState<UpdateModalMode>('update');
  const native = isNativeApp();
  const { versionLabel: displayVersionLabel } = useDisplayVersion();

  const {
    data: latestVersion,
    error: latestVersionError,
    loading: latestVersionLoading,
    reload: reloadLatestVersion,
    setData: setLatestVersion,
  } = useRequest((signal) => appVersionApi.getLatestVersion({ platform: APP_PLATFORM }, { signal }));

  const appName = latestVersion?.appName ?? '树交所';

  const versionSummary = useMemo(() => {
    if (!native) {
      return '已是最新版本';
    }
    if (isCheckingUpdate) {
      return '检查中...';
    }
    if (latestVersionLoading && !latestVersion) {
      return '获取中...';
    }
    if (latestVersionError) {
      return '获取失败';
    }
    if (!latestVersion) {
      return formatVersionLabel(CURRENT_APP_VERSION);
    }
    return compareAppVersions(latestVersion.versionCode, CURRENT_APP_VERSION) > 0
      ? `发现新版本 ${formatVersionLabel(latestVersion.versionCode)}`
      : '已是最新版本';
  }, [native, isCheckingUpdate, latestVersion, latestVersionError, latestVersionLoading]);

  // ---------- 事件处理函数 ----------

  /**
   * 复制文本到剪贴板，并通过 Toast 提示结果
   * @param text - 要复制的文本内容
   */
  const handleCopy = async (text: string) => {
    const ok = await copyToClipboard(text);
    showToast({ message: ok ? `已复制 ${text}` : '复制失败，请稍后重试', type: ok ? 'success' : 'error' });
  };

  /**
   * 手动检查更新
   * 流程：调用 checkUpdate 接口 → 更新本地版本数据 → 根据结果给出提示或打开下载链接
   */
  const handleCheckUpdate = async () => {
    if (!native) {
      showToast({ message: '当前已是最新版本', type: 'success' });
      return;
    }

    setIsCheckingUpdate(true);

    try {
      const result = await appVersionApi.checkUpdate({
        currentVersion: CURRENT_APP_VERSION,
        platform: APP_PLATFORM,
      });

      if (result.data) {
        setLatestVersion(result.data);
      }

      if (!result.needUpdate) {
        showToast({ message: result.message || '当前已是最新版本', type: 'success' });
        return;
      }

      if (!result.data?.downloadUrl) {
        showToast({ message: result.message || '检测到新版本，但未返回下载地址', type: 'warning' });
        return;
      }

      setUpdateMode('update');
      setUpdateInfo(result.data);
      setShowUpdate(true);
    } catch (error) {
      showToast({ message: getErrorMessage(error), type: 'error' });
    } finally {
      setIsCheckingUpdate(false);
    }
  };

  // ======================== JSX 渲染 ========================
  return (
    // 页面最外层容器：全屏布局，浅粉色背景 / 暗黑模式深色背景
    <div className="relative flex h-full flex-1 flex-col overflow-hidden bg-[#FFF8F8] dark:bg-gray-950">

      {/* -------- 顶部导航栏 -------- */}
      <PageHeader
        title="关于我们"
        offline={isOffline}
        onRefresh={() => {
          void reloadLatestVersion().catch(() => undefined);
        }}
        className="border-b border-gray-100 bg-white dark:border-gray-800 dark:bg-gray-900"
        contentClassName="h-12 px-3"
        titleClassName="text-2xl font-bold text-gray-900 dark:text-gray-100"
        backButtonClassName="text-gray-900 dark:text-gray-100"
      />

      {/* -------- 可滚动内容区域 -------- */}
      <div className="flex-1 overflow-y-auto px-4 pb-10 no-scrollbar">

        {/* ======== 应用信息区：Logo + 名称 + 版本号 ======== */}
        <div className="mb-10 mt-12 flex flex-col items-center">
          {/* 应用 Logo：品牌渐变背景 + "树"字 */}
          <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-2xl bg-gradient-to-br from-brand-start to-brand-end shadow-lg">
            <span className="text-4xl font-bold text-white">树</span>
          </div>
          {/* 应用名称 */}
          <h2 className="mb-1 text-4xl font-bold text-gray-900 dark:text-gray-100">{appName}</h2>
          {/* 当前版本号 */}
          <p className="text-base text-gray-500 dark:text-gray-400">
            Version {displayVersionLabel}
          </p>
        </div>

        {/* ======== 功能列表卡片 ======== */}
        <div className="mb-8 overflow-hidden rounded-2xl border border-transparent bg-white shadow-sm dark:border-gray-800 dark:bg-gray-900 dark:shadow-none">

          {/* --- 检查更新 --- */}
          <button
            type="button"
            className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3.5 text-left transition-colors active:bg-gray-50 dark:border-gray-800 dark:active:bg-gray-800"
            onClick={() => {
              void handleCheckUpdate();
            }}
          >
            <span className="text-lg text-gray-900 dark:text-gray-100">检查更新</span>
            <div className="flex items-center">
              {/* 右侧显示版本摘要文案 */}
              <span className="mr-2 text-base text-gray-500 dark:text-gray-400">{versionSummary}</span>
              <ChevronRight size={16} className="text-gray-400 dark:text-gray-500" />
            </div>
          </button>

          {/* --- 最新版本（纯展示，不可点击） --- */}
          <div className="flex items-center justify-between border-b border-gray-100 px-4 py-3.5 dark:border-gray-800">
            <span className="text-lg text-gray-900 dark:text-gray-100">最新版本</span>
            <span className="text-base text-gray-500 dark:text-gray-400">
              {latestVersion ? formatVersionLabel(latestVersion.versionCode) : '--'}
            </span>
          </div>

          {/* --- 用户协议（跳转 /user_agreement） --- */}
          <button
            type="button"
            className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3.5 text-left transition-colors active:bg-gray-50 dark:border-gray-800 dark:active:bg-gray-800"
            onClick={() => navigate('/user_agreement')}
          >
            <span className="text-lg text-gray-900 dark:text-gray-100">用户协议</span>
            <ChevronRight size={16} className="text-gray-400 dark:text-gray-500" />
          </button>

          {/* --- 隐私政策（跳转 /privacy_policy） --- */}
          <button
            type="button"
            className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3.5 text-left transition-colors active:bg-gray-50 dark:border-gray-800 dark:active:bg-gray-800"
            onClick={() => navigate('/privacy_policy')}
          >
            <span className="text-lg text-gray-900 dark:text-gray-100">隐私政策</span>
            <ChevronRight size={16} className="text-gray-400 dark:text-gray-500" />
          </button>

          {/* --- 公司注册证明 --- */}
          <button
            type="button"
            className="flex w-full items-center justify-between border-b border-gray-100 px-4 py-3.5 text-left transition-colors active:bg-gray-50 dark:border-gray-800 dark:active:bg-gray-800"
            onClick={() => navigate('/company_cert')}
          >
            <span className="text-lg text-gray-900 dark:text-gray-100">公司注册证明</span>
            <ChevronRight size={16} className="text-gray-400 dark:text-gray-500" />
          </button>

        
          
        </div>

        {/* ======== 页面底部：版权 & 构建信息 ======== */}
        <div className="mt-auto flex flex-col items-center text-sm text-gray-400 dark:text-gray-500">
          {/* 版权声明 */}
          <p className="mb-1">Copyright © {new Date().getFullYear()} {appName} All Rights Reserved.</p>
          {/* 渠道号 & 构建号（构建号支持一键复制） */}
          <div className="flex items-center">
            <span>Channel: {APP_CHANNEL}</span>
            <span className="mx-2">|</span>
            <span>Build: {APP_BUILD_NUMBER}</span>
            <button
              type="button"
              onClick={() => {
                void handleCopy(APP_BUILD_NUMBER);
              }}
              className="ml-1 p-0.5 text-gray-500 transition-colors active:text-gray-700 dark:text-gray-600 dark:active:text-gray-300"
            >
              <Copy size={10} />
            </button>
          </div>
        </div>
      </div>

      {updateInfo && (
        <UpdateModal
          isOpen={showUpdate}
          mode={updateMode}
          onClose={() => setShowUpdate(false)}
          onDismiss={() => {
            setShowUpdate(false);
            if (updateMode === 'download') {
              dismissDownload();
            } else {
              dismissUpdate(updateInfo.versionCode);
            }
          }}
          versionCode={updateInfo.versionCode}
          appName={updateInfo.appName}
          title={updateInfo.title}
          description={updateInfo.description}
          downloadUrl={updateInfo.downloadUrl}
        />
      )}
    </div>
  );
};
