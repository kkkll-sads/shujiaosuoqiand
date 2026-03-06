import React, { useState, useEffect } from 'react';
import { ChevronLeft, MessageCircleQuestion, RefreshCcw, WifiOff } from 'lucide-react';

export const ProductQAPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [empty, setEmpty] = useState(false);
  
  const [activeFilter, setActiveFilter] = useState<'latest' | 'hottest'>('hottest');

  const mockData = [
    {
      id: '1',
      question: '请问这款手机玩原神会发热严重吗？',
      answer: '您好，这款手机搭载了最新的散热系统，日常玩原神等大型游戏时会有轻微发热，属于正常现象，不会严重影响游戏体验和握持手感。',
      time: '2023-10-25',
      answerCount: 12
    },
    {
      id: '2',
      question: '电池续航怎么样？能用一天吗？',
      answer: '正常中度使用情况下，满电可以满足一整天的使用需求。如果重度游戏或长时间亮屏，建议随身携带充电宝。',
      time: '2023-10-24',
      answerCount: 5
    },
    {
      id: '3',
      question: '支持无线充电吗？',
      answer: '这款机型不支持无线充电，但支持120W有线快充，充电速度非常快。',
      time: '2023-10-20',
      answerCount: 2
    },
    {
      id: '4',
      question: '拍照效果好不好？夜景清晰吗？',
      answer: '拍照非常清晰！主摄是5000万像素大底传感器，夜景模式下噪点控制得很好，出片率很高。',
      time: '2023-10-18',
      answerCount: 8
    }
  ];

  useEffect(() => {
    const handleOnline = () => setOffline(false);
    const handleOffline = () => setOffline(true);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    fetchData();

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [activeFilter]);

  const fetchData = () => {
    setLoading(true);
    setError(false);
    setTimeout(() => {
      setLoading(false);
    }, 800);
  };

  const handleBack = () => {
    const event = new CustomEvent('change-view', { detail: 'product_detail' });
    window.dispatchEvent(event);
  };

  const renderHeader = () => (
    <div className="bg-white dark:bg-gray-900 z-40 relative shrink-0 border-b border-gray-100 dark:border-gray-800">
      <div className="h-11 flex items-center justify-between px-3">
        <div className="flex items-center w-1/3">
          <button onClick={handleBack} className="p-1 -ml-1 text-gray-900 dark:text-gray-100 active:opacity-70">
            <ChevronLeft size={24} />
          </button>
        </div>
        <h1 className="text-[17px] font-medium text-gray-900 dark:text-gray-100 text-center w-1/3">问大家</h1>
        <div className="w-1/3"></div>
      </div>
    </div>
  );

  const renderFilters = () => (
    <div className="bg-white dark:bg-gray-900 px-4 py-3 flex items-center space-x-6 border-b border-gray-100 dark:border-gray-800 shrink-0">
      <button 
        className={`text-[14px] font-medium transition-colors relative pb-1 ${activeFilter === 'hottest' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}
        onClick={() => setActiveFilter('hottest')}
      >
        最热
        {activeFilter === 'hottest' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#f2270c] rounded-full"></div>}
      </button>
      <button 
        className={`text-[14px] font-medium transition-colors relative pb-1 ${activeFilter === 'latest' ? 'text-gray-900 dark:text-gray-100' : 'text-gray-500 dark:text-gray-400'}`}
        onClick={() => setActiveFilter('latest')}
      >
        最新
        {activeFilter === 'latest' && <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-4 h-1 bg-[#f2270c] rounded-full"></div>}
      </button>
    </div>
  );

  const renderSkeleton = () => (
    <div className="p-3 space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-4 animate-pulse">
          <div className="flex items-start mb-3">
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-800 rounded mr-2 shrink-0"></div>
            <div className="w-3/4 h-5 bg-gray-200 dark:bg-gray-800 rounded"></div>
          </div>
          <div className="flex items-start">
            <div className="w-5 h-5 bg-gray-200 dark:bg-gray-800 rounded mr-2 shrink-0"></div>
            <div className="flex-1 space-y-2">
              <div className="w-full h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
              <div className="w-2/3 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderError = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 mb-4 text-gray-300 dark:text-gray-600">
        <WifiOff className="w-full h-full" />
      </div>
      <h3 className="text-[16px] font-medium text-gray-900 dark:text-gray-100 mb-2">网络请求失败</h3>
      <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">请检查您的网络设置后重试</p>
      <button 
        onClick={fetchData}
        className="px-6 py-2 border border-gray-300 dark:border-gray-600 rounded-full text-[14px] text-gray-700 dark:text-gray-400 flex items-center active:bg-gray-50 dark:bg-gray-800"
      >
        <RefreshCcw size={16} className="mr-2" />
        重新加载
      </button>
    </div>
  );

  const renderEmpty = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <div className="w-24 h-24 mb-4 text-gray-300 dark:text-gray-600">
        <MessageCircleQuestion className="w-full h-full" strokeWidth={1.5} />
      </div>
      <h3 className="text-[16px] font-medium text-gray-900 dark:text-gray-100 mb-2">暂无问答</h3>
      <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">还没有人提问，快来做第一个提问的人吧</p>
    </div>
  );

  const renderContent = () => {
    if (loading) return renderSkeleton();
    if (error) return renderError();
    if (empty || mockData.length === 0) return renderEmpty();

    return (
      <div className="p-3 space-y-3 pb-24">
        {mockData.map((item) => (
          <div key={item.id} className="bg-white dark:bg-gray-900 rounded-xl p-4">
            <div className="flex items-start mb-3">
              <span className="bg-[#ff9600] text-white text-[12px] font-bold w-5 h-5 flex items-center justify-center rounded-sm mr-2 shrink-0 mt-0.5">问</span>
              <h3 className="text-[15px] font-medium text-gray-900 dark:text-gray-100 leading-snug">
                {item.question}
              </h3>
            </div>
            <div className="flex items-start mb-3">
              <span className="bg-[#25b513] text-white text-[12px] font-bold w-5 h-5 flex items-center justify-center rounded-sm mr-2 shrink-0 mt-0.5">答</span>
              <p className="text-[14px] text-gray-600 dark:text-gray-400 leading-relaxed line-clamp-3">
                {item.answer}
              </p>
            </div>
            <div className="flex justify-between items-center text-[12px] text-gray-400 dark:text-gray-500 mt-2 pt-3 border-t border-gray-50 dark:border-gray-800">
              <span>{item.time}</span>
              <span>共 {item.answerCount} 个回答</span>
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#f5f5f5] dark:bg-gray-950 relative h-full overflow-hidden">
      {/* Offline Banner */}
      {offline && (
        <div className="bg-[#ffe4e4] text-[#f2270c] text-[12px] py-2 px-4 flex items-center justify-center sticky top-0 z-50">
          <WifiOff size={14} className="mr-2" />
          网络连接已断开，请检查网络设置
        </div>
      )}

      {/* Demo Controls */}
      <div className="px-4 py-2 flex space-x-2 overflow-x-auto no-scrollbar bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 text-[10px] absolute top-11 left-0 right-0 z-50 opacity-30 hover:opacity-100 transition-opacity">
        <span className="text-gray-500 dark:text-gray-400 flex items-center shrink-0">状态切换:</span>
        <button onClick={() => {setLoading(false); setError(false); setEmpty(false);}} className={`px-2 py-1 rounded border ${!loading && !error && !empty ? 'bg-[#f2270c] text-white border-[#f2270c]' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>正常</button>
        <button onClick={() => {setLoading(true); setError(false); setEmpty(false);}} className={`px-2 py-1 rounded border ${loading ? 'bg-[#f2270c] text-white border-[#f2270c]' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>加载中</button>
        <button onClick={() => {setLoading(false); setError(true); setEmpty(false);}} className={`px-2 py-1 rounded border ${error ? 'bg-[#f2270c] text-white border-[#f2270c]' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>错误</button>
        <button onClick={() => {setLoading(false); setError(false); setEmpty(true);}} className={`px-2 py-1 rounded border ${empty ? 'bg-[#f2270c] text-white border-[#f2270c]' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>空态</button>
      </div>

      {renderHeader()}
      {renderFilters()}
      
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {renderContent()}
      </div>

      {/* Bottom Action Bar */}
      {!loading && !error && (
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 py-3 pb-safe z-40">
          <button 
            className="w-full h-[40px] rounded-full bg-gradient-to-r from-[#f2270c] to-[#ff4f18] text-white text-[15px] font-medium active:opacity-80 transition-opacity shadow-sm"
            onClick={() => alert('提问功能开发中')}
          >
            向已买过的人提问
          </button>
        </div>
      )}
    </div>
  );
};
