import React, { useCallback, useEffect, useRef, useState } from 'react';
import { X, Download, Smartphone } from 'lucide-react';
import { formatVersionLabel } from '../../lib/appVersion';

export type UpdateModalMode = 'update' | 'download';

export interface UpdateModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDismiss?: () => void;
  mode?: UpdateModalMode;
  versionCode: string;
  appName?: string;
  title?: string;
  description?: string;
  downloadUrl: string;
}

const STORAGE_PREFIX = 'update-dismissed:';
const DOWNLOAD_DISMISSED_KEY = 'download-app-dismissed';

export function getUpdateDismissedKey(version: string) {
  return STORAGE_PREFIX + version;
}

export function isUpdateDismissed(version: string): boolean {
  try {
    return window.localStorage.getItem(getUpdateDismissedKey(version)) === '1';
  } catch {
    return false;
  }
}

export function dismissUpdate(version: string) {
  try {
    window.localStorage.setItem(getUpdateDismissedKey(version), '1');
  } catch {
    /* ignore */
  }
}

export function isDownloadDismissed(): boolean {
  try {
    return window.localStorage.getItem(DOWNLOAD_DISMISSED_KEY) === '1';
  } catch {
    return false;
  }
}

export function dismissDownload() {
  try {
    window.localStorage.setItem(DOWNLOAD_DISMISSED_KEY, '1');
  } catch {
    /* ignore */
  }
}

function isNativeBridgeAvailable(): boolean {
  try {
    const bridge = (window as any).NativeBridge;
    if (!bridge) return false;
    return bridge.isDownloadApkSupported() === true;
  } catch {
    return false;
  }
}

const DEFAULT_DESC_DOWNLOAD = '推荐下载 APP 安装包，获得更流畅稳定的使用体验。';

type DownloadState = 'idle' | 'downloading' | 'completed' | 'failed';

export const UpdateModal: React.FC<UpdateModalProps> = ({
  isOpen,
  onClose,
  onDismiss,
  mode = 'update',
  versionCode,
  appName,
  title,
  description,
  downloadUrl,
}) => {
  const [dlState, setDlState] = useState<DownloadState>('idle');
  const [progress, setProgress] = useState(0);
  const [errorMsg, setErrorMsg] = useState('');
  const cleanedUp = useRef(false);

  const resetState = useCallback(() => {
    setDlState('idle');
    setProgress(0);
    setErrorMsg('');
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetState();
      return;
    }

    cleanedUp.current = false;

    const onProgress = (percent: number) => {
      if (cleanedUp.current) return;
      setProgress(Math.min(percent, 100));
      setDlState('downloading');
    };
    const onComplete = () => {
      if (cleanedUp.current) return;
      setProgress(100);
      setDlState('completed');
    };
    const onFailed = (msg: string) => {
      if (cleanedUp.current) return;
      setErrorMsg(msg || '下载失败');
      setDlState('failed');
    };

    (window as any).__onApkDownloadProgress = onProgress;
    (window as any).__onApkDownloadComplete = onComplete;
    (window as any).__onApkDownloadFailed = onFailed;

    return () => {
      cleanedUp.current = true;
      delete (window as any).__onApkDownloadProgress;
      delete (window as any).__onApkDownloadComplete;
      delete (window as any).__onApkDownloadFailed;
    };
  }, [isOpen, resetState]);

  if (!isOpen) return null;

  const isDownload = mode === 'download';

  const displayTitle =
    title ||
    (isDownload ? '下载 APP 体验更佳' : '发现新版本');

  const displayDesc =
    description ||
    (isDownload
      ? DEFAULT_DESC_DOWNLOAD
      : `发现新版本 ${formatVersionLabel(versionCode)}，推荐立即更新获得更好的使用体验。`);

  const handleDownload = () => {
    if (dlState === 'downloading') return;

    if (isNativeBridgeAvailable()) {
      setDlState('downloading');
      setProgress(0);
      setErrorMsg('');
      try {
        (window as any).NativeBridge.downloadApk(downloadUrl);
      } catch {
        setDlState('failed');
        setErrorMsg('调用原生下载失败');
      }
    } else {
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = '';
      link.click();
      onClose();
    }
  };

  const buttonLabel = (() => {
    switch (dlState) {
      case 'downloading':
        return `下载中 ${progress}%`;
      case 'completed':
        return '安装中...';
      case 'failed':
        return '重新下载';
      default:
        return isDownload ? '下载 APP' : '立即更新';
    }
  })();

  const isDownloading = dlState === 'downloading';

  return (
    <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50">
      <div className="relative mx-6 w-full max-w-sm overflow-hidden rounded-3xl bg-white shadow-2xl dark:bg-gray-900">
        <div className="bg-gradient-to-r from-[#E93B3B] to-[#FF5C5C] px-6 pb-5 pt-8 text-center text-white">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-full bg-white/20">
            {isDownload ? <Smartphone size={28} /> : <Download size={28} />}
          </div>
          <h2 className="text-xl font-bold">{displayTitle}</h2>
          <p className="mt-1 text-sm text-white/80">
            {appName ? `${appName} ` : ''}
            {formatVersionLabel(versionCode)}
          </p>
        </div>

        {!isDownloading && (
          <button
            type="button"
            onClick={onClose}
            className="absolute right-3 top-3 flex h-8 w-8 items-center justify-center rounded-full bg-white/20 text-white active:bg-white/30"
          >
            <X size={18} />
          </button>
        )}

        <div className="px-6 py-5">
          {dlState === 'failed' ? (
            <p className="mb-5 text-center text-sm leading-6 text-red-500">
              {errorMsg}
            </p>
          ) : (
            <p className="mb-5 whitespace-pre-line text-center text-sm leading-6 text-gray-600 dark:text-gray-300">
              {displayDesc}
            </p>
          )}

          {isDownloading && (
            <div className="mb-4">
              <div className="h-2 w-full overflow-hidden rounded-full bg-gray-200 dark:bg-gray-700">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-[#E93B3B] to-[#FF5C5C] transition-all duration-300"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="button"
            onClick={handleDownload}
            disabled={isDownloading || dlState === 'completed'}
            className="mb-3 flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#E93B3B] to-[#FF5C5C] px-4 py-3 text-base font-bold text-white shadow-lg active:opacity-90 disabled:opacity-70"
          >
            <Download size={18} />
            {buttonLabel}
          </button>

          {onDismiss && !isDownloading && dlState !== 'completed' && (
            <button
              type="button"
              onClick={onDismiss}
              className="w-full py-2 text-center text-sm text-gray-400 active:text-gray-600 dark:text-gray-500 dark:active:text-gray-300"
            >
              不再提醒
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
