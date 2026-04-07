import { appVersionApi } from '../api';
import { APP_PLATFORM, CURRENT_APP_VERSION, formatVersionLabel, isNativeApp } from '../lib/appVersion';
import { useRequest } from './useRequest';

/**
 * 获取应用显示版本号。
 * - 原生 App：使用构建时的 CURRENT_APP_VERSION（APK 自身版本）
 * - 网页端：从服务端获取最新版本号（网页始终是最新部署的）
 */
export function useDisplayVersion() {
  const native = isNativeApp();

  const { data: latestVersion, loading } = useRequest(
    (signal) => appVersionApi.getLatestVersion({ platform: APP_PLATFORM }, { signal }),
    { manual: native },
  );

  if (native) {
    return {
      version: CURRENT_APP_VERSION,
      versionLabel: formatVersionLabel(CURRENT_APP_VERSION),
      loading: false,
    };
  }

  const version = latestVersion?.versionCode || CURRENT_APP_VERSION;
  return {
    version,
    versionLabel: formatVersionLabel(version),
    loading: loading && !latestVersion,
  };
}
