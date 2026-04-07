import { Component, type ErrorInfo, type ReactNode } from 'react';
import { LineProbeOverlay } from './ui/LineProbeOverlay';

interface Props {
  children: ReactNode;
}

interface State {
  hasError: boolean;
  errorMessage: string;
}

export class AppErrorBoundary extends Component<Props, State> {
  declare props: Props;
  state: State = { hasError: false, errorMessage: '' };

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, errorMessage: error?.message || '未知错误' };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error('[AppErrorBoundary]', error, info);

    const isHookError =
      error.message?.includes('queue') ||
      error.message?.includes('Hooks') ||
      error.message?.includes('rendered fewer hooks') ||
      error.message?.includes('rendered more hooks');

    if (isHookError) {
      console.warn('[AppErrorBoundary] detected a hot-reload hook mismatch and will refresh the page.');
      window.location.reload();
    }
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="app-min-viewport-height flex flex-col items-center justify-center bg-bg-base px-6 text-center">
          <LineProbeOverlay />
          <div className="mb-4 text-5xl leading-none">⚠️</div>
          <h2 className="mb-2 text-lg font-semibold text-text-main">页面出了点问题</h2>
          <p className="mb-6 text-sm text-text-sub">请刷新页面重试</p>
          <p className="text-xs text-text-aux mb-6 break-all max-w-full">{this.state.errorMessage}</p>
          <button
            onClick={() => window.location.reload()}
            className="rounded-full gradient-primary-r px-6 py-2.5 text-base font-medium text-white shadow-sm active:opacity-90"
          >
            刷新页面
          </button>
        </div>
      );
    }

    return this.props.children;
  }
}
