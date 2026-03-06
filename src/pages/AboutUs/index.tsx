import React, { useState, useEffect } from 'react';
import { ChevronLeft, WifiOff, AlertCircle, ChevronRight, Copy } from 'lucide-react';

export const AboutUsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [offline, setOffline] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    setError(false);
    setTimeout(() => {
      setLoading(false);
    }, 500);
  };

  const handleBack = () => {
    const event = new CustomEvent('go-back');
    window.dispatchEvent(event);
  };

  const handleCopy = (text: string) => {
    alert(`已复制: ${text}`);
  };

  const renderHeader = () => (
    <div className="bg-white dark:bg-gray-900 z-40 relative shrink-0 border-b border-gray-100 dark:border-gray-800">
      {offline && (
        <div className="bg-red-50 dark:bg-red-900/30 text-[#FF4142] dark:text-red-400 px-4 py-2 flex items-center justify-between text-[12px]">
          <div className="flex items-center">
            <WifiOff size={14} className="mr-2" />
            <span>网络不稳定，请检查网络设置</span>
          </div>
          <button onClick={() => setOffline(false)} className="font-medium px-2 py-1 bg-white dark:bg-gray-800 rounded shadow-sm">刷新</button>
        </div>
      )}
      <div className="h-12 flex items-center justify-between px-3 pt-safe">
        <div className="flex items-center w-1/3">
          <button onClick={handleBack} className="p-1 -ml-1 text-gray-900 dark:text-gray-100 active:opacity-70">
            <ChevronLeft size={24} />
          </button>
        </div>
        <h1 className="text-[17px] font-bold text-gray-900 dark:text-gray-100 text-center w-1/3">关于我们</h1>
        <div className="w-1/3"></div>
      </div>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center pt-32 px-4">
      <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 text-[#FF4142]">
        <AlertCircle size={48} />
      </div>
      <p className="text-[15px] text-gray-500 dark:text-gray-400 mb-6">加载失败，请重试</p>
      <button 
        onClick={fetchData}
        className="px-6 py-2 rounded-full bg-gradient-to-r from-[#FF4142] to-[#FF4B2B] text-white text-[14px] font-medium active:opacity-80 shadow-sm"
      >
        重新加载
      </button>
    </div>
  );

  const renderContent = () => {
    if (error) return renderError();

    return (
      <div className="p-4 flex flex-col items-center pb-10">
        
        {/* Logo & Brand */}
        <div className="mt-12 mb-10 flex flex-col items-center">
          <div className="w-20 h-20 bg-gradient-to-br from-[#FF4142] to-[#FF4B2B] rounded-[20px] flex items-center justify-center shadow-lg mb-4">
            <span className="text-white text-[32px] font-bold italic">树</span>
          </div>
          <h2 className="text-[20px] font-bold text-gray-900 dark:text-gray-100 mb-1">树交所</h2>
          <p className="text-[13px] text-gray-500 dark:text-gray-400">Version 1.0.0</p>
        </div>

        {/* Function List */}
        <div className="w-full bg-white dark:bg-gray-900 rounded-[16px] shadow-sm dark:shadow-none border border-transparent dark:border-gray-800 overflow-hidden mb-8">
          <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
            <span className="text-[15px] text-gray-900 dark:text-gray-100">检查更新</span>
            <div className="flex items-center">
              <span className="text-[13px] text-gray-500 dark:text-gray-400 mr-2">已是最新版本</span>
              <ChevronRight size={16} className="text-gray-400 dark:text-gray-500" />
            </div>
          </div>
          <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
            <span className="text-[15px] text-gray-900 dark:text-gray-100">用户协议</span>
            <ChevronRight size={16} className="text-gray-400 dark:text-gray-500" />
          </div>
          <div className="px-4 py-3.5 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
            <span className="text-[15px] text-gray-900 dark:text-gray-100">隐私政策</span>
            <ChevronRight size={16} className="text-gray-400 dark:text-gray-500" />
          </div>
          <div className="px-4 py-3.5 flex items-center justify-between cursor-pointer active:bg-gray-50 dark:active:bg-gray-800 transition-colors">
            <span className="text-[15px] text-gray-900 dark:text-gray-100">联系我们</span>
            <div className="flex items-center">
              <span className="text-[13px] text-gray-500 dark:text-gray-400 mr-2">400-123-4567</span>
              <ChevronRight size={16} className="text-gray-400 dark:text-gray-500" />
            </div>
          </div>
        </div>

        {/* Footer Info */}
        <div className="mt-auto flex flex-col items-center text-[11px] text-gray-400 dark:text-gray-400">
          <p className="mb-1">Copyright © 2023 树交所 All Rights Reserved.</p>
          <div className="flex items-center">
            <span>Channel: AppStore</span>
            <span className="mx-2">|</span>
            <span>Build: 20231025.1</span>
            <button 
              onClick={() => handleCopy('20231025.1')}
              className="ml-1 p-0.5 active:text-gray-600 dark:active:text-gray-300 dark:text-gray-600"
            >
              <Copy size={10} />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#FFF8F8] dark:bg-gray-950 relative h-full overflow-hidden">
      {/* Demo Controls */}
      <div className="px-4 py-2 flex space-x-2 overflow-x-auto no-scrollbar bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 text-[10px] absolute top-12 left-0 right-0 z-50 opacity-50 hover:opacity-100 transition-opacity">
        <span className="text-gray-500 dark:text-gray-400 flex items-center shrink-0">Demo:</span>
        <button onClick={() => setOffline(!offline)} className={`px-2 py-1 rounded border ${offline ? 'bg-[#FF4142] text-white border-[#FF4142]' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>Offline</button>
        <button onClick={() => setError(!error)} className={`px-2 py-1 rounded border ${error ? 'bg-[#FF4142] text-white border-[#FF4142]' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>Error</button>
      </div>

      {renderHeader()}
      
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {renderContent()}
      </div>
    </div>
  );
};
