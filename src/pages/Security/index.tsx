import React, { useState, useEffect } from 'react';
import { ChevronLeft, WifiOff, AlertCircle, RefreshCcw, ShieldCheck, ShieldAlert, Smartphone, Lock, MonitorSmartphone, History, Fingerprint, ChevronRight } from 'lucide-react';

export const SecurityPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [offline, setOffline] = useState(false);
  
  const securityLevel = '高';
  const phone = '138****8888';
  const lastLogin = '02-28 深圳 IP:113.116.*.*';

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    setError(false);
    setTimeout(() => {
      setLoading(false);
    }, 800);
  };

  const handleBack = () => {
    const event = new CustomEvent('go-back');
    window.dispatchEvent(event);
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
        <h1 className="text-[17px] font-bold text-gray-900 dark:text-gray-100 text-center w-1/3">账号与安全</h1>
        <div className="w-1/3"></div>
      </div>
    </div>
  );

  const renderSkeleton = () => (
    <div className="p-4 space-y-4">
      <div className="bg-white dark:bg-gray-900 rounded-[16px] p-4 shadow-sm animate-pulse">
        <div className="flex items-center mb-3">
          <div className="w-6 h-6 bg-gray-200 dark:bg-gray-800 rounded-full mr-2"></div>
          <div className="w-32 h-5 bg-gray-200 dark:bg-gray-800 rounded"></div>
        </div>
        <div className="w-full h-10 bg-gray-100 dark:bg-gray-800 rounded-[8px]"></div>
      </div>
      
      <div className="bg-white dark:bg-gray-900 rounded-[16px] shadow-sm animate-pulse overflow-hidden">
        {[1, 2, 3, 4, 5].map((i) => (
          <div key={i} className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex justify-between items-center">
            <div className="flex items-center">
              <div className="w-5 h-5 bg-gray-200 dark:bg-gray-800 rounded mr-3"></div>
              <div className="w-24 h-5 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </div>
            <div className="w-16 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
        ))}
      </div>
      
      <div className="w-full h-[48px] bg-gray-200 dark:bg-gray-800 rounded-full animate-pulse mt-6"></div>
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center pt-32 px-4">
      <div className="w-24 h-24 bg-red-50 dark:bg-red-900/20 rounded-full flex items-center justify-center mb-4 text-[#FF4142]">
        <AlertCircle size={48} />
      </div>
      <p className="text-[15px] text-gray-500 dark:text-gray-400 dark:text-gray-500 mb-6">加载失败，请重试</p>
      <button 
        onClick={fetchData}
        className="px-6 py-2 rounded-full bg-gradient-to-r from-[#FF4142] to-[#FF4B2B] text-white text-[14px] font-medium active:opacity-80 shadow-sm"
      >
        重新加载
      </button>
    </div>
  );

  const renderContent = () => {
    if (loading) return renderSkeleton();
    if (error) return renderError();

    return (
      <div className="p-4 pb-10">
        {/* Security Status Card */}
        <div className="bg-white dark:bg-gray-900 rounded-[16px] p-4 mb-4 shadow-sm dark:shadow-none border border-transparent dark:border-gray-800">
          <div className="flex items-center mb-3">
            {securityLevel === '高' ? (
              <ShieldCheck size={24} className="text-green-500 mr-2" />
            ) : (
              <ShieldAlert size={24} className="text-orange-500 mr-2" />
            )}
            <span className="text-[16px] font-bold text-gray-900 dark:text-gray-100">
              账号安全评级：{securityLevel}
            </span>
          </div>
          <div className="bg-gray-50 dark:bg-gray-800 rounded-[8px] p-3 text-[12px] text-gray-500 dark:text-gray-400 dark:text-gray-500 leading-relaxed">
            建议定期修改密码，并开启多重身份验证，以保障账号资产安全。
          </div>
        </div>

        {/* List Group Card */}
        <div className="bg-white dark:bg-gray-900 rounded-[16px] shadow-sm dark:shadow-none border border-transparent dark:border-gray-800 overflow-hidden mb-6">
          <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-800 transition-colors cursor-pointer">
            <div className="flex items-center">
              <Lock size={20} className="text-gray-600 dark:text-gray-300 dark:text-gray-600 mr-3" />
              <span className="text-[15px] text-gray-900 dark:text-gray-100">登录密码</span>
            </div>
            <div className="flex items-center">
              <span className="text-[13px] text-gray-400 dark:text-gray-500 mr-1">修改</span>
              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
            </div>
          </div>

          <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-800 transition-colors cursor-pointer">
            <div className="flex items-center">
              <Smartphone size={20} className="text-gray-600 dark:text-gray-300 dark:text-gray-600 mr-3" />
              <span className="text-[15px] text-gray-900 dark:text-gray-100">绑定手机</span>
            </div>
            <div className="flex items-center">
              <span className="text-[13px] text-gray-400 dark:text-gray-500 mr-1">{phone}</span>
              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
            </div>
          </div>

          <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-800 transition-colors cursor-pointer">
            <div className="flex items-center">
              <MonitorSmartphone size={20} className="text-gray-600 dark:text-gray-300 dark:text-gray-600 mr-3" />
              <span className="text-[15px] text-gray-900 dark:text-gray-100">登录设备管理</span>
            </div>
            <div className="flex items-center">
              <span className="text-[13px] text-gray-400 dark:text-gray-500 mr-1">查看与下线</span>
              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
            </div>
          </div>

          <div className="px-4 py-4 border-b border-gray-100 dark:border-gray-800 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-800 transition-colors cursor-pointer">
            <div className="flex items-center">
              <History size={20} className="text-gray-600 dark:text-gray-300 dark:text-gray-600 mr-3" />
              <span className="text-[15px] text-gray-900 dark:text-gray-100">登录记录</span>
            </div>
            <div className="flex items-center">
              <span className="text-[13px] text-gray-400 dark:text-gray-500 mr-1 truncate max-w-[120px]">{lastLogin}</span>
              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
            </div>
          </div>

          <div className="px-4 py-4 flex items-center justify-between active:bg-gray-50 dark:active:bg-gray-800 transition-colors cursor-pointer">
            <div className="flex items-center">
              <Fingerprint size={20} className="text-gray-600 dark:text-gray-300 dark:text-gray-600 mr-3" />
              <span className="text-[15px] text-gray-900 dark:text-gray-100">支付安全</span>
            </div>
            <div className="flex items-center">
              <span className="text-[13px] text-gray-400 dark:text-gray-500 mr-1">密码/指纹/面容</span>
              <ChevronRight size={16} className="text-gray-300 dark:text-gray-600" />
            </div>
          </div>
        </div>

        {/* Key Action Button */}
        <button className="w-full h-[48px] rounded-full bg-gradient-to-r from-[#FF4142] to-[#FF4B2B] text-white text-[16px] font-medium shadow-sm active:opacity-80 transition-opacity flex items-center justify-center">
          修改登录密码
        </button>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#FFF8F8] dark:bg-gray-950 relative h-full overflow-hidden">
      {/* Demo Controls */}
      <div className="px-4 py-2 flex space-x-2 overflow-x-auto no-scrollbar bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 text-[10px] absolute top-12 left-0 right-0 z-50 opacity-50 hover:opacity-100 transition-opacity">
        <span className="text-gray-500 dark:text-gray-400 dark:text-gray-500 flex items-center shrink-0">Demo:</span>
        <button onClick={() => setLoading(!loading)} className={`px-2 py-1 rounded border ${loading ? 'bg-[#FF4142] text-white border-[#FF4142]' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 dark:text-gray-600'}`}>Loading</button>
        <button onClick={() => setOffline(!offline)} className={`px-2 py-1 rounded border ${offline ? 'bg-[#FF4142] text-white border-[#FF4142]' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 dark:text-gray-600'}`}>Offline</button>
        <button onClick={() => setError(!error)} className={`px-2 py-1 rounded border ${error ? 'bg-[#FF4142] text-white border-[#FF4142]' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-300 dark:text-gray-600'}`}>Error</button>
      </div>

      {renderHeader()}
      
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {renderContent()}
      </div>
    </div>
  );
};
