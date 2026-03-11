import React, { useEffect, useRef } from 'react';
import { Outlet, useLocation, useNavigate } from 'react-router-dom';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from '../../contexts/ThemeContext';
import { BottomTab } from './BottomTab';
import { FeedbackProvider, useFeedback } from '../ui/FeedbackProvider';
import { isTabPage, PATH_TO_TAB } from '../../lib/navigation';
import { useAuthSession } from '../../hooks/useAuthSession';

const PUBLIC_EXACT_PATHS = new Set([
  '/store',
  '/category',
  '/search',
  '/search/result',
  '/service-description',
  '/flash-sale',
  '/login',
  '/register',
  '/forgot-password',
  '/reset-password',
  '/user_agreement',
  '/privacy_policy',
]);

const PUBLIC_PATH_PATTERNS = [
  /^\/product\/[^/]+$/,
  /^\/product\/[^/]+\/qa$/,
  /^\/product\/[^/]+\/reviews$/,
];

function isPublicPath(pathname: string) {
  if (PUBLIC_EXACT_PATHS.has(pathname)) {
    return true;
  }

  return PUBLIC_PATH_PATTERNS.some((pattern) => pattern.test(pathname));
}

function AppLayoutContent() {
  const { setTheme, isDark } = useTheme();
  const { isAuthenticated } = useAuthSession();
  const { showToast } = useFeedback();
  const location = useLocation();
  const navigate = useNavigate();
  const blockedPathRef = useRef<string | null>(null);

  const isBlocked = !isAuthenticated && !isPublicPath(location.pathname);
  const showBottomTab = isTabPage(location.pathname) && !isBlocked;
  const activeTab = PATH_TO_TAB[location.pathname] || 'home';

  useEffect(() => {
    if (!isBlocked) {
      blockedPathRef.current = null;
      return;
    }

    if (blockedPathRef.current === location.pathname) {
      return;
    }

    blockedPathRef.current = location.pathname;
    showToast({ message: '请先登录后再进入该页面', type: 'warning' });
    navigate('/login', { replace: true });
  }, [isBlocked, location.pathname, navigate, showToast]);

  return (
    <div className="app-viewport-height flex w-full flex-col overflow-hidden bg-bg-base">
      <button
        className={`fixed ${showBottomTab ? 'bottom-24' : 'bottom-6'} right-4 z-50 rounded-full border border-border-light bg-bg-card p-3 text-text-main shadow-lg transition-all`}
        onClick={() => setTheme(isDark ? 'light' : 'dark')}
      >
        {isDark ? <Sun size={20} /> : <Moon size={20} />}
      </button>

      <div className="relative flex w-full flex-1 flex-col overflow-hidden bg-bg-base sm:mx-auto sm:max-w-[430px] sm:shadow-2xl">
        <div className="relative flex flex-1 flex-col overflow-hidden">
          {!isBlocked ? <Outlet /> : null}
        </div>

        {showBottomTab && <BottomTab active={activeTab} />}
      </div>
    </div>
  );
}

export const AppLayout = () => {
  return (
    <FeedbackProvider>
      <AppLayoutContent />
    </FeedbackProvider>
  );
};
