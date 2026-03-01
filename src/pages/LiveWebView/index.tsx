import React, { useState, useEffect, useRef } from 'react';
import { ChevronLeft, MoreHorizontal, X, RefreshCcw, Copy, ExternalLink, MessageSquare, AlertCircle, WifiOff, ShieldAlert } from 'lucide-react';

export const LiveWebViewPage = () => {
  const [loading, setLoading] = useState(true);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [showSecurityPrompt, setShowSecurityPrompt] = useState(true);
  const [showActionSheet, setShowActionSheet] = useState(false);
  const [showToast, setShowToast] = useState('');
  
  const domain = 'live.jd.com';
  const url = `https://${domain}/room/12345`;

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const simulateLoad = () => {
    if (offline) return;
    setLoading(true);
    setError(false);
    setProgress(0);
    
    // Simulate progress bar
    const interval = setInterval(() => {
      setProgress(prev => {
        if (prev >= 90) {
          clearInterval(interval);
          return 90;
        }
        return prev + Math.random() * 30;
      });
    }, 200);

    setTimeout(() => {
      clearInterval(interval);
      // Randomly fail for demonstration purposes (10% chance)
      if (Math.random() > 0.9) {
        setError(true);
        setLoading(false);
      } else {
        setProgress(100);
        setTimeout(() => {
          setLoading(false);
        }, 300);
      }
    }, 1500);
  };

  useEffect(() => {
    simulateLoad();
  }, [offline]);

  const handleBack = () => {
    window.dispatchEvent(new CustomEvent('go-back'));
  };

  const handleRefresh = () => {
    setShowActionSheet(false);
    simulateLoad();
  };

  const handleCopyLink = () => {
    setShowActionSheet(false);
    // In a real app, use navigator.clipboard.writeText
    showToastMessage('链接已复制');
  };

  const handleOpenBrowser = () => {
    setShowActionSheet(false);
    showToastMessage('正在打开默认浏览器');
  };

  const handleContactCS = () => {
    setShowActionSheet(false);
    window.dispatchEvent(new CustomEvent('change-view', { detail: 'help_center' }));
  };

  const showToastMessage = (msg: string) => {
    setShowToast(msg);
    setTimeout(() => setShowToast(''), 2000);
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F5F5F5] dark:bg-[#121212] h-full overflow-hidden relative">
      {/* Header */}
      <div className="flex items-center justify-between px-4 h-12 bg-white dark:bg-[#1E1E1E] relative z-20">
        <button onClick={handleBack} className="p-2 -ml-2 text-[#1A1A1A] dark:text-[#E5E5E5] active:opacity-70">
          <ChevronLeft size={24} />
        </button>
        <span className="text-[17px] font-medium text-[#1A1A1A] dark:text-[#E5E5E5]">直播</span>
        <button 
          onClick={() => setShowActionSheet(true)}
          className="p-2 -mr-2 text-[#1A1A1A] dark:text-[#E5E5E5] active:opacity-70"
        >
          <MoreHorizontal size={24} />
        </button>
        
        {/* Progress Bar */}
        {loading && !offline && (
          <div className="absolute bottom-0 left-0 right-0 h-[2px] bg-transparent">
            <div 
              className="h-full bg-[#E2231A] transition-all duration-200 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
        )}
      </div>

      {/* Offline Banner */}
      {offline && (
        <div className="bg-[#FFF3F3] dark:bg-[#3A1E1E] px-4 py-2 flex items-center justify-between z-10">
          <div className="flex items-center text-[#E2231A] dark:text-[#FF6B6B]">
            <WifiOff size={16} className="mr-2" />
            <span className="text-[13px]">网络不稳定，请检查网络设置</span>
          </div>
          <button 
            onClick={simulateLoad}
            className="text-[13px] text-[#E2231A] dark:text-[#FF6B6B] px-2 py-1 active:opacity-70"
          >
            刷新
          </button>
        </div>
      )}

      {/* Security Prompt */}
      {showSecurityPrompt && !error && !offline && (
        <div className="bg-[#FFF9E6] dark:bg-[#2A2415] px-4 py-2 flex items-center justify-between z-10 border-b border-[#FFE5B4] dark:border-[#4A3B1C]">
          <div className="flex items-center text-[#B27B00] dark:text-[#D4A347] flex-1 mr-2">
            <ShieldAlert size={14} className="mr-1.5 shrink-0" />
            <span className="text-[12px] line-clamp-1">当前内容来自第三方网页：{domain}</span>
          </div>
          <button 
            onClick={() => setShowSecurityPrompt(false)}
            className="text-[#B27B00] dark:text-[#D4A347] p-1 -mr-1 active:opacity-70 shrink-0"
          >
            <X size={14} />
          </button>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 relative overflow-hidden bg-white dark:bg-[#1E1E1E]">
        {error ? (
          // Error Fallback
          <div className="absolute inset-0 flex flex-col items-center justify-center px-6 bg-[#F5F5F5] dark:bg-[#121212]">
            <AlertCircle size={64} className="text-[#CCCCCC] dark:text-[#666666] mb-4" />
            <h3 className="text-[18px] font-medium text-[#1A1A1A] dark:text-[#E5E5E5] mb-2">页面加载失败</h3>
            <p className="text-[14px] text-[#666666] dark:text-[#999999] text-center mb-8">
              网络不稳定或链接已失效，请稍后再试
            </p>
            <div className="w-full space-y-3 max-w-[240px]">
              <button 
                onClick={simulateLoad}
                className="w-full h-[44px] rounded-[22px] bg-gradient-to-r from-[#E2231A] to-[#F93A3A] text-white font-medium text-[15px] active:opacity-80"
              >
                刷新重试
              </button>
              <button 
                onClick={handleCopyLink}
                className="w-full h-[44px] rounded-[22px] border border-[#E2231A] dark:border-[#FF6B6B] text-[#E2231A] dark:text-[#FF6B6B] font-medium text-[15px] active:bg-[#FFF3F3] dark:active:bg-[#3A1E1E]"
              >
                复制链接
              </button>
            </div>
            <div className="mt-8 flex items-center space-x-4 text-[13px] text-[#999999] dark:text-[#666666]">
              <span onClick={simulateLoad} className="active:underline cursor-pointer">检查网络</span>
              <span>|</span>
              <span onClick={handleContactCS} className="active:underline cursor-pointer">联系客服</span>
            </div>
          </div>
        ) : loading ? (
          // Loading Skeleton
          <div className="absolute inset-0 p-4 space-y-4 bg-white dark:bg-[#1E1E1E]">
            <div className="w-full aspect-video bg-[#F5F5F5] dark:bg-[#2A2A2A] rounded-[8px] animate-pulse" />
            <div className="space-y-3 mt-6">
              <div className="h-6 bg-[#F5F5F5] dark:bg-[#2A2A2A] rounded w-3/4 animate-pulse" />
              <div className="h-4 bg-[#F5F5F5] dark:bg-[#2A2A2A] rounded w-1/2 animate-pulse" />
              <div className="h-4 bg-[#F5F5F5] dark:bg-[#2A2A2A] rounded w-5/6 animate-pulse mt-4" />
              <div className="h-4 bg-[#F5F5F5] dark:bg-[#2A2A2A] rounded w-full animate-pulse" />
              <div className="h-4 bg-[#F5F5F5] dark:bg-[#2A2A2A] rounded w-4/5 animate-pulse" />
            </div>
          </div>
        ) : (
          // Mock WebView Content
          <div className="absolute inset-0 overflow-y-auto">
            <div className="w-full aspect-video bg-black relative flex items-center justify-center">
              <img 
                src="https://picsum.photos/seed/jd1/800/450" 
                alt="Live Stream" 
                className="w-full h-full object-cover opacity-80"
                referrerPolicy="no-referrer"
              />
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-16 h-16 rounded-full bg-black/50 border-2 border-white/50 flex items-center justify-center backdrop-blur-sm">
                  <div className="w-0 h-0 border-t-8 border-t-transparent border-l-[14px] border-l-white border-b-8 border-b-transparent ml-1" />
                </div>
              </div>
              <div className="absolute top-4 left-4 flex items-center space-x-2">
                <div className="bg-black/40 rounded-full px-2 py-1 flex items-center">
                  <div className="w-6 h-6 rounded-full bg-[#E2231A] mr-2 overflow-hidden">
                    <img src="https://picsum.photos/seed/avatar/100/100" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                  </div>
                  <span className="text-white text-[12px] mr-2">京东家电官方旗舰店</span>
                  <button className="bg-[#E2231A] text-white text-[10px] px-2 py-0.5 rounded-full">关注</button>
                </div>
              </div>
              <div className="absolute top-4 right-4 bg-black/40 rounded-full px-2 py-1">
                <span className="text-white text-[10px]">12.5w 观看</span>
              </div>
            </div>
            <div className="p-4">
              <h1 className="text-[18px] font-medium text-[#1A1A1A] dark:text-[#E5E5E5] mb-2">京东家电超级品牌日，全场5折起！</h1>
              <p className="text-[14px] text-[#666666] dark:text-[#999999] mb-6">看直播抽免单，更有万元红包雨等你来抢！</p>
              
              <div className="space-y-4">
                <h3 className="text-[16px] font-medium text-[#1A1A1A] dark:text-[#E5E5E5]">直播商品</h3>
                {[1, 2, 3, 4].map(i => (
                  <div key={i} className="flex bg-[#F9F9F9] dark:bg-[#2A2A2A] rounded-[12px] p-2">
                    <div className="w-20 h-20 bg-white dark:bg-[#1E1E1E] rounded-[8px] shrink-0 overflow-hidden">
                      <img src={`https://picsum.photos/seed/prod${i}/200/200`} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
                    </div>
                    <div className="ml-3 flex-1 flex flex-col justify-between py-1">
                      <div className="text-[14px] text-[#1A1A1A] dark:text-[#E5E5E5] line-clamp-2">海尔（Haier）513升十字对开门冰箱 一级能效</div>
                      <div className="flex items-end justify-between">
                        <div className="text-[#E2231A] dark:text-[#FF6B6B] font-medium">
                          <span className="text-[12px]">¥</span>
                          <span className="text-[16px]">3299</span>
                        </div>
                        <button className="bg-[#E2231A] text-white text-[12px] px-3 py-1 rounded-full">抢购</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
            {/* Bottom Safe Area Padding */}
            <div className="h-safe-bottom pb-8" />
          </div>
        )}
      </div>

      {/* Action Sheet */}
      {showActionSheet && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end">
          <div 
            className="absolute inset-0 bg-black/40 transition-opacity"
            onClick={() => setShowActionSheet(false)}
          />
          <div className="relative bg-[#F5F5F5] dark:bg-[#121212] rounded-t-[16px] overflow-hidden pb-safe">
            <div className="p-4 grid grid-cols-4 gap-4">
              <div className="flex flex-col items-center" onClick={handleRefresh}>
                <div className="w-14 h-14 bg-white dark:bg-[#1E1E1E] rounded-[16px] flex items-center justify-center mb-2 active:bg-[#F0F0F0] dark:active:bg-[#2A2A2A]">
                  <RefreshCcw size={24} className="text-[#1A1A1A] dark:text-[#E5E5E5]" />
                </div>
                <span className="text-[12px] text-[#666666] dark:text-[#999999]">刷新页面</span>
              </div>
              <div className="flex flex-col items-center" onClick={handleCopyLink}>
                <div className="w-14 h-14 bg-white dark:bg-[#1E1E1E] rounded-[16px] flex items-center justify-center mb-2 active:bg-[#F0F0F0] dark:active:bg-[#2A2A2A]">
                  <Copy size={24} className="text-[#1A1A1A] dark:text-[#E5E5E5]" />
                </div>
                <span className="text-[12px] text-[#666666] dark:text-[#999999]">复制链接</span>
              </div>
              <div className="flex flex-col items-center" onClick={handleOpenBrowser}>
                <div className="w-14 h-14 bg-white dark:bg-[#1E1E1E] rounded-[16px] flex items-center justify-center mb-2 active:bg-[#F0F0F0] dark:active:bg-[#2A2A2A]">
                  <ExternalLink size={24} className="text-[#1A1A1A] dark:text-[#E5E5E5]" />
                </div>
                <span className="text-[12px] text-[#666666] dark:text-[#999999]">默认浏览器</span>
              </div>
              <div className="flex flex-col items-center" onClick={handleContactCS}>
                <div className="w-14 h-14 bg-white dark:bg-[#1E1E1E] rounded-[16px] flex items-center justify-center mb-2 active:bg-[#F0F0F0] dark:active:bg-[#2A2A2A]">
                  <MessageSquare size={24} className="text-[#1A1A1A] dark:text-[#E5E5E5]" />
                </div>
                <span className="text-[12px] text-[#666666] dark:text-[#999999]">问题反馈</span>
              </div>
            </div>
            <div className="h-2 bg-[#EFEFEF] dark:bg-[#0A0A0A]" />
            <button 
              className="w-full h-[56px] bg-white dark:bg-[#1E1E1E] text-[16px] text-[#1A1A1A] dark:text-[#E5E5E5] font-medium active:bg-[#F5F5F5] dark:active:bg-[#2A2A2A]"
              onClick={() => setShowActionSheet(false)}
            >
              取消
            </button>
          </div>
        </div>
      )}

      {/* Toast */}
      {showToast && (
        <div className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-black/70 text-white px-4 py-2 rounded-[8px] text-[14px] z-50">
          {showToast}
        </div>
      )}
    </div>
  );
};
