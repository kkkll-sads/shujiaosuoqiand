import React, { useState, useEffect } from 'react';
import { ChevronLeft, Headset, WifiOff, RefreshCcw, FileX, ArrowRight, Clock, Image as ImageIcon } from 'lucide-react';

interface Session {
  id: string;
  theme_image: string;
  pool_tag: string;
  title: string;
  time_slot: string;
  return_rate: string;
  quota: string;
  status: 'upcoming' | 'active' | 'ended';
  countdown: string; // e.g. "01:44:25"
}

export const TradingZonePage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [offline, setOffline] = useState(false);
  const [empty, setEmpty] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  const mockSessions: Session[] = [
    {
      id: '1',
      theme_image: 'https://picsum.photos/seed/trade1/800/400',
      pool_tag: 'Pool-A',
      title: '优质数据资产确权首发',
      time_slot: '09:00-12:00',
      return_rate: '8.5%',
      quota: '500万',
      status: 'active',
      countdown: '00:12:09',
    },
    {
      id: '2',
      theme_image: 'https://picsum.photos/seed/trade2/800/400',
      pool_tag: 'Pool-B',
      title: '高频交易数据包专场',
      time_slot: '14:00-16:00',
      return_rate: '12.0%',
      quota: '200万',
      status: 'upcoming',
      countdown: '01:44:25',
    },
    {
      id: '3',
      theme_image: 'https://picsum.photos/seed/trade3/800/400',
      pool_tag: 'Pool-C',
      title: '基础用户画像数据集',
      time_slot: '昨天 10:00-12:00',
      return_rate: '6.0%',
      quota: '1000万',
      status: 'ended',
      countdown: '00:00:00',
    }
  ];

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = () => {
    setLoading(true);
    setError(false);
    setTimeout(() => {
      setLoading(false);
    }, 1000);
  };

  const handleRefresh = () => {
    setRefreshing(true);
    setTimeout(() => {
      setRefreshing(false);
    }, 1000);
  };

  const handleBack = () => {
    const event = new CustomEvent('go-back');
    window.dispatchEvent(event);
  };

  const handleCardClick = (session: Session) => {
    const event = new CustomEvent('change-view', { detail: 'trading_detail' });
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
        <div className="flex items-center w-1/4">
          <button onClick={handleBack} className="p-1 -ml-1 text-gray-900 dark:text-gray-100 active:opacity-70">
            <ChevronLeft size={24} />
          </button>
        </div>
        <h1 className="text-[17px] font-bold text-gray-900 dark:text-gray-100 text-center flex-1">资产交易</h1>
        <div className="w-1/4 flex justify-end">
          <div className="flex items-center bg-green-50 dark:bg-green-900/20 px-2 py-1 rounded-full border border-green-100 dark:border-green-800/50">
            <div className="w-1.5 h-1.5 rounded-full bg-[#07C160] mr-1.5 animate-pulse"></div>
            <span className="text-[10px] text-[#07C160] font-medium">实时交易</span>
          </div>
        </div>
      </div>
    </div>
  );

  const renderSkeleton = () => (
    <div className="p-4 space-y-4">
      {[1, 2].map(i => (
        <div key={i} className="w-full bg-white dark:bg-gray-900 rounded-[16px] overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800">
          <div className="w-full h-32 bg-gray-100 dark:bg-gray-800 animate-pulse"></div>
          <div className="p-4 space-y-3">
            <div className="w-2/3 h-5 bg-gray-100 dark:bg-gray-800 animate-pulse rounded"></div>
            <div className="flex space-x-4">
              <div className="w-1/3 h-10 bg-gray-100 dark:bg-gray-800 animate-pulse rounded"></div>
              <div className="w-1/3 h-10 bg-gray-100 dark:bg-gray-800 animate-pulse rounded"></div>
            </div>
            <div className="w-full h-12 bg-gray-100 dark:bg-gray-800 animate-pulse rounded-[24px]"></div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderError = () => (
    <div className="flex flex-col items-center justify-center pt-32 px-4">
      <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500">
        <RefreshCcw size={32} />
      </div>
      <p className="text-[14px] text-gray-500 dark:text-gray-400 mb-6">加载失败，请检查网络后重试</p>
      <button 
        onClick={fetchData}
        className="px-6 py-2 rounded-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 text-[14px] font-medium active:bg-gray-50 dark:active:bg-gray-700 shadow-sm transition-colors"
      >
        重新加载
      </button>
    </div>
  );

  const renderEmpty = () => (
    <div className="flex flex-col items-center justify-center pt-32 px-4">
      <div className="w-20 h-20 bg-gray-50 dark:bg-gray-800 rounded-full flex items-center justify-center mb-4 text-gray-400 dark:text-gray-500">
        <FileX size={32} />
      </div>
      <p className="text-[15px] font-medium text-gray-900 dark:text-gray-100 mb-1">暂无可参与场次</p>
      <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">当前没有正在进行或即将开始的交易</p>
      <button 
        onClick={() => {
          const event = new CustomEvent('change-view', { detail: 'store' });
          window.dispatchEvent(event);
        }}
        className="px-6 py-2 rounded-full bg-gradient-to-r from-[#FF4142] to-[#FF4B2B] text-white text-[14px] font-medium shadow-sm active:opacity-80 transition-opacity"
      >
        返回商城
      </button>
    </div>
  );

  const renderContent = () => {
    if (loading) return renderSkeleton();
    if (error) return renderError();
    if (empty) return renderEmpty();

    return (
      <div className="p-4 space-y-4 pb-24">
        {mockSessions.map((session) => {
          const isActive = session.status === 'active';
          const isUpcoming = session.status === 'upcoming';
          const isEnded = session.status === 'ended';

          return (
            <div 
              key={session.id}
              className="bg-white dark:bg-gray-900 rounded-[16px] overflow-hidden shadow-sm border border-gray-100 dark:border-gray-800 cursor-pointer active:opacity-95 transition-opacity"
              onClick={() => handleCardClick(session)}
            >
              {/* Top Banner / Theme Image */}
              <div className="relative w-full h-32 bg-gray-100 dark:bg-gray-800 flex items-center justify-center overflow-hidden">
                {/* Fallback icon behind the image */}
                <div className="absolute inset-0 flex items-center justify-center text-gray-300 dark:text-gray-700 dark:text-gray-400">
                  <ImageIcon size={32} />
                </div>
                <img 
                  src={session.theme_image} 
                  alt={session.title}
                  className="w-full h-full object-cover relative z-10"
                  referrerPolicy="no-referrer"
                  onError={(e) => {
                    (e.target as HTMLImageElement).style.display = 'none';
                  }}
                />
                
                {/* Overlay Gradients for text readability */}
                <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-transparent to-black/60 z-10"></div>
                
                {/* Top Left Badge */}
                <div className="absolute top-3 left-3 z-20 bg-black/40 text-white text-[11px] px-2 py-0.5 rounded-full border border-white/20 backdrop-blur-sm">
                  {session.pool_tag}
                </div>
                
                {/* Top Right Status Badge */}
                <div className={`absolute top-3 right-3 z-20 text-[11px] px-2 py-0.5 rounded-full font-medium border ${
                  isActive ? 'bg-[#FF4142] text-white border-[#FF4142]' : 
                  isUpcoming ? 'bg-[#FF9900] text-white border-[#FF9900]' : 
                  'bg-black/40 text-white border-white/20'
                }`}>
                  {isActive ? '正在抢购' : isUpcoming ? '即将开始' : '已结束'}
                </div>

                {/* Bottom Info in Banner */}
                <div className="absolute bottom-3 left-3 right-3 z-20">
                  <h2 className="text-white text-[16px] font-bold leading-tight mb-1 drop-shadow-md">{session.title}</h2>
                  <div className="flex items-center text-white/90 text-[12px]">
                    <Clock size={12} className="mr-1" />
                    {session.time_slot}
                  </div>
                </div>
              </div>

              {/* Card Body */}
              <div className="p-4">
                {/* Metrics */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex-1">
                    <div className="text-[12px] text-gray-500 dark:text-gray-400 mb-1">预期收益率</div>
                    <div className={`text-[20px] font-bold ${isEnded ? 'text-gray-400 dark:text-gray-400' : 'text-[#FF4142]'}`}>
                      {session.return_rate}
                    </div>
                  </div>
                  <div className="w-px h-8 bg-gray-100 dark:bg-gray-800 mx-4"></div>
                  <div className="flex-1">
                    <div className="text-[12px] text-gray-500 dark:text-gray-400 mb-1">本期额度</div>
                    <div className={`text-[16px] font-bold ${isEnded ? 'text-gray-400 dark:text-gray-400' : 'text-gray-900 dark:text-gray-100'}`}>
                      {session.quota}
                    </div>
                  </div>
                </div>

                {/* Countdown & Action */}
                <div className="bg-gray-50 dark:bg-gray-800/50 rounded-[12px] p-3 flex flex-col items-center border border-gray-100 dark:border-gray-800">
                  <div className="text-[12px] text-gray-500 dark:text-gray-400 mb-1">
                    {isActive ? '距结束仅剩' : isUpcoming ? '距开始仅剩' : '本场结束 · CLOSED'}
                  </div>
                  {!isEnded && (
                    <div className={`text-[24px] font-bold tracking-wider mb-3 font-mono ${isActive ? 'text-[#FF4142]' : 'text-gray-900 dark:text-gray-100'}`}>
                      {session.countdown}
                    </div>
                  )}
                  
                  <button 
                    className={`w-full h-10 rounded-full text-[14px] font-medium flex items-center justify-center transition-all ${
                      isActive ? 'bg-gradient-to-r from-[#FF4142] to-[#FF4B2B] text-white shadow-sm active:opacity-80' : 
                      isUpcoming ? 'bg-white dark:bg-gray-800 border border-[#FF4142] text-[#FF4142] active:bg-red-50 dark:active:bg-red-900/20' : 
                      'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-400 cursor-not-allowed'
                    }`}
                    disabled={isEnded}
                  >
                    {isActive ? (
                      <>立即抢购 / ACCESS <ArrowRight size={16} className="ml-1" /></>
                    ) : isUpcoming ? (
                      '即将开始'
                    ) : (
                      '本场结束'
                    )}
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-[#F7F8FA] dark:bg-gray-950 relative h-full overflow-hidden">
      {/* Demo Controls */}
      <div className="px-4 py-2 flex space-x-2 overflow-x-auto no-scrollbar bg-white dark:bg-gray-900 border-b border-gray-100 dark:border-gray-800 text-[10px] absolute top-12 left-0 right-0 z-50 opacity-50 hover:opacity-100 transition-opacity">
        <span className="text-gray-500 dark:text-gray-400 flex items-center shrink-0">Demo:</span>
        <button onClick={() => setLoading(!loading)} className={`px-2 py-1 rounded border ${loading ? 'bg-[#FF4142] text-white border-[#FF4142]' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>Loading</button>
        <button onClick={() => setOffline(!offline)} className={`px-2 py-1 rounded border ${offline ? 'bg-[#FF4142] text-white border-[#FF4142]' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>Offline</button>
        <button onClick={() => setError(!error)} className={`px-2 py-1 rounded border ${error ? 'bg-[#FF4142] text-white border-[#FF4142]' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>Error</button>
        <button onClick={() => setEmpty(!empty)} className={`px-2 py-1 rounded border ${empty ? 'bg-[#FF4142] text-white border-[#FF4142]' : 'border-gray-200 dark:border-gray-700 text-gray-600 dark:text-gray-400'}`}>Empty</button>
      </div>

      {renderHeader()}
      
      <div 
        className="flex-1 overflow-y-auto no-scrollbar relative"
        onScroll={(e) => {
          if (e.currentTarget.scrollTop < -50 && !refreshing && !loading) {
            handleRefresh();
          }
        }}
      >
        {refreshing && (
          <div className="flex justify-center items-center py-4 text-gray-400 dark:text-gray-500">
            <RefreshCcw size={20} className="animate-spin" />
          </div>
        )}
        {renderContent()}
      </div>

      {/* Floating Customer Service Button */}
      {!loading && !error && !empty && (
        <button 
          className="absolute right-4 bottom-8 w-12 h-12 bg-white dark:bg-gray-800 rounded-full shadow-lg border border-gray-100 dark:border-gray-700 flex items-center justify-center text-gray-900 dark:text-gray-100 active:scale-95 transition-transform z-40"
          onClick={() => {
            const event = new CustomEvent('change-view', { detail: 'help_center' });
            window.dispatchEvent(event);
          }}
        >
          <Headset size={24} />
        </button>
      )}
    </div>
  );
};
