import React, { useState, useEffect } from 'react';
import { ChevronLeft, WifiOff, AlertCircle, ShoppingCart, CheckCircle2, Circle, Trash2, HeartOff, RefreshCcw } from 'lucide-react';

export const FavoritesPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [offline, setOffline] = useState(!navigator.onLine);
  const [empty, setEmpty] = useState(false);
  
  const [isEditing, setIsEditing] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  // Mock Data
  const [products, setProducts] = useState([
    { id: 'p1', title: 'Apple iPhone 15 Pro (A3104) 256GB 蓝色钛金属 支持移动联通电信5G 双卡双待手机', price: '7999.00', isSelfOperated: true, image: 'https://picsum.photos/seed/fav_p1/200/200' },
    { id: 'p2', title: '索尼（SONY）WH-1000XM5 头戴式无线降噪耳机 蓝牙5.2 铂金银', price: '2499.00', isSelfOperated: true, image: 'https://picsum.photos/seed/fav_p2/200/200' },
    { id: 'p3', title: '任天堂（Nintendo）Switch OLED版 掌上游戏机 白色 日版', price: '2199.00', isSelfOperated: false, image: 'https://picsum.photos/seed/fav_p3/200/200' },
    { id: 'p4', title: '大疆 DJI Mini 4 Pro 迷你航拍机 航拍无人机 智能跟随 避障 遥控飞机', price: '4788.00', isSelfOperated: true, image: 'https://picsum.photos/seed/fav_p4/200/200' },
  ]);

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
  }, []);

  const fetchData = () => {
    setLoading(true);
    setError(false);
    setIsEditing(false);
    setSelectedIds([]);
    setTimeout(() => {
      setLoading(false);
      // Randomly simulate error for demo purposes if needed, but we'll keep it simple here
    }, 1000);
  };

  const handleBack = () => {
    const event = new CustomEvent('change-view', { detail: 'profile' });
    window.dispatchEvent(event);
  };

  const toggleEdit = () => {
    setIsEditing(!isEditing);
    setSelectedIds([]);
  };

  const toggleSelect = (id: string) => {
    if (selectedIds.includes(id)) {
      setSelectedIds(selectedIds.filter(itemId => itemId !== id));
    } else {
      setSelectedIds([...selectedIds, id]);
    }
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === products.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(products.map(item => item.id));
    }
  };

  const handleDelete = () => {
    if (selectedIds.length === 0) return;
    const newProducts = products.filter(p => !selectedIds.includes(p.id));
    setProducts(newProducts);
    setSelectedIds([]);
    setIsEditing(false);
    if (newProducts.length === 0) {
      setEmpty(true);
    }
  };

  const isAllSelected = products.length > 0 && selectedIds.length === products.length;

  const renderHeader = () => (
    <div className="bg-white dark:bg-gray-900 z-40 relative shrink-0 border-b border-gray-100 dark:border-gray-800">
      <div className="h-11 flex items-center justify-between px-3">
        <div className="flex items-center w-1/3">
          <button onClick={handleBack} className="p-1 -ml-1 text-gray-900 dark:text-gray-100 active:opacity-70">
            <ChevronLeft size={24} />
          </button>
        </div>
        <h1 className="text-[17px] font-medium text-gray-900 dark:text-gray-100 text-center w-1/3">我的收藏</h1>
        <div className="w-1/3 flex justify-end">
          {(!empty && !loading && !error) && (
            <button onClick={toggleEdit} className="text-[14px] text-gray-600 dark:text-gray-400 px-2 py-1 active:opacity-70">
              {isEditing ? '完成' : '编辑'}
            </button>
          )}
        </div>
      </div>
    </div>
  );

  const renderSkeleton = () => (
    <div className="p-3 space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div key={i} className="bg-white dark:bg-gray-900 rounded-xl p-3 flex animate-pulse">
          <div className="w-28 h-28 bg-gray-200 dark:bg-gray-800 rounded-lg shrink-0 mr-3"></div>
          <div className="flex-1 flex flex-col py-1 justify-between">
            <div className="space-y-2">
              <div className="w-full h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
              <div className="w-3/4 h-4 bg-gray-200 dark:bg-gray-800 rounded"></div>
            </div>
            <div className="flex justify-between items-end">
              <div className="w-16 h-5 bg-gray-200 dark:bg-gray-800 rounded"></div>
              <div className="w-7 h-7 bg-gray-200 dark:bg-gray-800 rounded-full"></div>
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
        <HeartOff className="w-full h-full" strokeWidth={1.5} />
      </div>
      <h3 className="text-[16px] font-medium text-gray-900 dark:text-gray-100 mb-2">暂无收藏</h3>
      <p className="text-[13px] text-gray-500 dark:text-gray-400 mb-6">您还没有收藏任何商品哦</p>
      <button 
        className="px-8 py-2 rounded-full border border-[#f2270c] text-[#f2270c] text-[14px] font-medium active:bg-red-50"
        onClick={() => {
          const event = new CustomEvent('change-view', { detail: 'home' });
          window.dispatchEvent(event);
        }}
      >
        去逛逛
      </button>
    </div>
  );

  const renderContent = () => {
    if (loading) return renderSkeleton();
    if (error) return renderError();
    if (empty) return renderEmpty();

    return (
      <div className="p-3 space-y-3 pb-24">
        {products.map((item) => (
          <div 
            key={item.id} 
            className="bg-white dark:bg-gray-900 rounded-xl p-3 flex items-center relative overflow-hidden"
            onClick={() => isEditing && toggleSelect(item.id)}
          >
            {/* Edit Checkbox */}
            {isEditing && (
              <div className="pr-3 shrink-0">
                {selectedIds.includes(item.id) ? (
                  <CheckCircle2 size={20} className="text-[#f2270c] fill-current text-white bg-[#f2270c] rounded-full" />
                ) : (
                  <Circle size={20} className="text-gray-300 dark:text-gray-600" />
                )}
              </div>
            )}

            {/* Image */}
            <div className="w-28 h-28 bg-gray-50 dark:bg-gray-800 rounded-lg shrink-0 mr-3 overflow-hidden relative">
              <img src={item.image} alt={item.title} className="w-full h-full object-cover" referrerPolicy="no-referrer" />
            </div>

            {/* Details */}
            <div className="flex-1 flex flex-col h-28 py-0.5 justify-between min-w-0">
              <div className="text-[14px] text-gray-900 dark:text-gray-100 line-clamp-2 leading-snug font-medium">
                {item.isSelfOperated && (
                  <span className="inline-block bg-[#f2270c] text-white text-[10px] px-1 rounded-sm mr-1.5 align-middle leading-tight font-normal">自营</span>
                )}
                <span className="align-middle">{item.title}</span>
              </div>
              
              <div className="flex justify-between items-end mt-2">
                <div className="text-[18px] font-bold text-[#f2270c] leading-none">
                  <span className="text-[12px] mr-0.5">¥</span>{item.price.split('.')[0]}
                  <span className="text-[12px]">.{item.price.split('.')[1]}</span>
                </div>
                
                {!isEditing && (
                  <button 
                    className="w-7 h-7 rounded-full bg-[#f2270c] flex items-center justify-center text-white active:opacity-80 shrink-0"
                    onClick={(e) => {
                      e.stopPropagation();
                      alert('已加入购物车');
                    }}
                  >
                    <ShoppingCart size={14} />
                  </button>
                )}
              </div>
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
      
      <div className="flex-1 overflow-y-auto no-scrollbar relative">
        {renderContent()}
      </div>

      {/* Edit Bottom Bar */}
      {isEditing && !loading && !error && !empty && (
        <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-gray-900 border-t border-gray-100 dark:border-gray-800 px-4 py-3 pb-safe flex justify-between items-center z-40">
          <div 
            className="flex items-center cursor-pointer active:opacity-70"
            onClick={toggleSelectAll}
          >
            {isAllSelected ? (
              <CheckCircle2 size={20} className="text-[#f2270c] fill-current text-white bg-[#f2270c] rounded-full mr-2" />
            ) : (
              <Circle size={20} className="text-gray-300 dark:text-gray-600 mr-2" />
            )}
            <span className="text-[14px] text-gray-900 dark:text-gray-100">全选</span>
          </div>
          <button 
            className={`h-[36px] px-6 rounded-full text-[14px] font-medium transition-all flex items-center ${
              selectedIds.length > 0 
                ? 'bg-gradient-to-r from-[#f2270c] to-[#ff4f18] text-white active:opacity-80' 
                : 'bg-gray-200 dark:bg-gray-800 text-gray-400 dark:text-gray-500 cursor-not-allowed'
            }`}
            disabled={selectedIds.length === 0}
            onClick={handleDelete}
          >
            取消收藏 {selectedIds.length > 0 ? `(${selectedIds.length})` : ''}
          </button>
        </div>
      )}
    </div>
  );
};
