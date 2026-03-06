import React, { useState, useEffect } from 'react';
import { 
  Settings, MessageSquare, Copy, ShieldCheck, ShieldAlert, 
  Wallet, Award, CheckSquare, ChevronRight, 
  CreditCard, Package, Truck, HeadphonesIcon, 
  MapPin, Ticket, Headset, Lock, HelpCircle, 
  Bell, Trash2, Info, WifiOff, RefreshCcw, LogOut, Heart, ShoppingCart, Users, Landmark,
  Coins, Banknote, ShoppingBag, Zap, Clock
} from 'lucide-react';
import { Card } from '../../components/ui/Card';
import { BottomTab } from '../../components/layout/BottomTab';
import { Skeleton } from '../../components/ui/Skeleton';
import { ActionSheet } from '../../components/ui/ActionSheet';

const Button = ({ children, variant = 'primary', className = '', ...props }: any) => {
  const baseStyle = "h-[48px] rounded-[16px] font-medium text-[15px] flex items-center justify-center transition-opacity active:opacity-80 w-full";
  const variants: any = {
    primary: "bg-gradient-to-r from-primary-start to-primary-end text-white shadow-soft",
    secondary: "bg-bg-card text-text-main border border-border-light shadow-soft",
    outline: "bg-transparent border border-primary-start text-primary-start",
    ghost: "bg-transparent text-text-sub",
  };
  return (
    <button className={`${baseStyle} ${variants[variant]} ${className}`} {...props}>
      {children}
    </button>
  );
};

export const UserPage = () => {
  // States for demonstration
  const [loading, setLoading] = useState(true);
  const [offline, setOffline] = useState(false);
  const [moduleError, setModuleError] = useState(false);
  const [emptyOrders, setEmptyOrders] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(true);
  const [showLogoutSheet, setShowLogoutSheet] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  useEffect(() => {
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 1000);
    return () => clearTimeout(timer);
  }, [isLoggedIn]);

  const handleCopy = (text: string) => {
    // In a real app, use navigator.clipboard.writeText
    alert(`已复制: ${text}`);
  };

  const handleLogout = () => {
    setIsLoggingOut(true);
    setTimeout(() => {
      setIsLoggingOut(false);
      setIsLoggedIn(false);
      setShowLogoutSheet(false);
      window.dispatchEvent(new CustomEvent('change-view', { detail: 'login' }));
    }, 800);
  };

  const renderHeader = () => {
    if (loading) {
      return (
        <div className="px-4 pt-12 pb-6 bg-gradient-to-b from-red-50 to-bg-base dark:from-bg-base dark:to-bg-base relative">
          <div className="absolute top-4 right-4 flex space-x-4">
            <Skeleton className="w-[22px] h-[22px] rounded-full" />
            <Skeleton className="w-[22px] h-[22px] rounded-full" />
          </div>
          <div className="flex items-center space-x-4 mb-6 mt-4">
            <Skeleton className="w-16 h-16 rounded-full shrink-0" />
            <div className="flex flex-col flex-1 space-y-2">
              <Skeleton className="w-32 h-6" />
              <Skeleton className="w-24 h-4" />
              <Skeleton className="w-16 h-4 rounded-full" />
            </div>
          </div>
          <div className="flex justify-around bg-bg-card rounded-[16px] p-4 shadow-soft border border-border-light">
            {[1, 2, 3].map((i, index) => (
              <React.Fragment key={i}>
                <div className="flex flex-col items-center space-y-1.5">
                  <Skeleton className="w-12 h-5" />
                  <Skeleton className="w-10 h-3" />
                </div>
                {index < 2 && <div className="w-px bg-border-light my-1"></div>}
              </React.Fragment>
            ))}
          </div>
        </div>
      );
    }

    if (!isLoggedIn) {
      return (
        <div className="px-4 pt-12 pb-6 bg-gradient-to-b from-red-50 to-bg-base dark:from-bg-base dark:to-bg-base relative">
          <div className="absolute top-4 right-4 flex space-x-4 text-text-main">
            <Settings size={22} />
            <MessageSquare size={22} />
          </div>
          <div className="flex items-center space-x-4 mb-6 mt-4">
            <div className="w-16 h-16 rounded-full bg-border-light flex items-center justify-center overflow-hidden border-2 border-white shadow-sm">
              <div className="w-full h-full bg-gray-200 dark:bg-gray-800 flex items-center justify-center text-gray-400 dark:text-gray-500">
                <HeadphonesIcon size={32} />
              </div>
            </div>
            <div className="flex flex-col items-start">
              <h2 className="text-[20px] font-bold text-text-main mb-2">未登录</h2>
              <p className="text-[12px] text-text-sub mb-3">登录后查看资产与确权进度</p>
              <button 
                onClick={() => {
                  const event = new CustomEvent('change-view', { detail: 'login' });
                  window.dispatchEvent(event);
                }}
                className="bg-gradient-to-r from-primary-start to-primary-end text-white text-[13px] font-medium px-5 py-1.5 rounded-full shadow-sm"
              >
                登录 / 注册
              </button>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="px-4 pt-12 pb-6 bg-gradient-to-b from-red-50 to-bg-base dark:from-bg-base dark:to-bg-base relative">
        <div className="absolute top-4 right-4 flex space-x-4 text-text-main">
          <button 
            className="active:opacity-70 transition-opacity"
            onClick={() => {
              const event = new CustomEvent('change-view', { detail: 'settings' });
              window.dispatchEvent(event);
            }}
          >
            <Settings size={22} />
          </button>
          <button 
            className="active:opacity-70 transition-opacity"
            onClick={() => {
              const event = new CustomEvent('change-view', { detail: 'cart' });
              window.dispatchEvent(event);
            }}
          >
            <ShoppingCart size={22} />
          </button>
          <button 
            className="relative active:opacity-70 transition-opacity"
            onClick={() => {
              const event = new CustomEvent('change-view', { detail: 'message_center' });
              window.dispatchEvent(event);
            }}
          >
            <MessageSquare size={22} />
            <span className="absolute -top-1 -right-1 w-2 h-2 bg-primary-start rounded-full border border-bg-base"></span>
          </button>
        </div>
        
        <div className="flex items-center space-x-4 mb-6 mt-4">
          <div className="w-16 h-16 rounded-full bg-bg-card flex items-center justify-center overflow-hidden border-2 border-white shadow-sm shrink-0">
            <img src="https://picsum.photos/seed/avatar/150/150" alt="Avatar" className="w-full h-full object-cover" referrerPolicy="no-referrer" />
          </div>
          <div className="flex flex-col flex-1">
            <h2 className="text-[20px] font-bold text-text-main leading-tight mb-1">树交所用户_8a7b</h2>
            <div className="flex items-center text-[12px] text-text-sub mb-1.5">
              <span>UID: 88492018</span>
              <button onClick={() => handleCopy('88492018')} className="ml-1 p-0.5 text-text-aux active:text-text-main">
                <Copy size={12} />
              </button>
            </div>
            <div className="flex items-center">
              <span 
                className="bg-green-100 text-green-700 text-[10px] px-1.5 py-0.5 rounded-full flex items-center font-medium cursor-pointer active:opacity-80"
                onClick={() => {
                  const event = new CustomEvent('change-view', { detail: 'real_name_auth' });
                  window.dispatchEvent(event);
                }}
              >
                <ShieldCheck size={10} className="mr-0.5" /> 已实名
              </span>
              {/* Example of other states:
              <span className="bg-orange-100 text-orange-700 text-[10px] px-1.5 py-0.5 rounded-full flex items-center font-medium ml-2">
                <ShieldAlert size={10} className="mr-0.5" /> 审核中
              </span>
              */}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-3 gap-y-5 gap-x-2 bg-bg-card rounded-[16px] p-5 shadow-soft border border-border-light">
          <div 
            className="flex flex-col items-center cursor-pointer active:opacity-70 transition-opacity"
            onClick={() => {
              const event = new CustomEvent('change-view', { detail: 'billing' });
              window.dispatchEvent(event);
            }}
          >
            <span className="text-[16px] font-bold text-text-main mb-1">2,840.00</span>
            <span className="text-[11px] text-text-sub flex items-center"><Coins size={12} className="mr-1" /> 专项金余额</span>
          </div>
          <div 
            className="flex flex-col items-center cursor-pointer active:opacity-70 transition-opacity"
            onClick={() => {
              const event = new CustomEvent('change-view', { detail: 'billing' });
              window.dispatchEvent(event);
            }}
          >
            <span className="text-[16px] font-bold text-text-main mb-1">1,500.00</span>
            <span className="text-[11px] text-text-sub flex items-center"><Banknote size={12} className="mr-1" /> 可提现余额</span>
          </div>
          <div 
            className="flex flex-col items-center cursor-pointer active:opacity-70 transition-opacity"
            onClick={() => {
              const event = new CustomEvent('change-view', { detail: 'billing' });
              window.dispatchEvent(event);
            }}
          >
            <span className="text-[16px] font-bold text-text-main mb-1">300.00</span>
            <span className="text-[11px] text-text-sub flex items-center"><ShoppingBag size={12} className="mr-1" /> 消费金</span>
          </div>
          
          <div 
            className="flex flex-col items-center cursor-pointer active:opacity-70 transition-opacity"
            onClick={() => {
              const event = new CustomEvent('change-view', { detail: 'billing' });
              window.dispatchEvent(event);
            }}
          >
            <span className="text-[16px] font-bold text-text-main mb-1">128</span>
            <span className="text-[11px] text-text-sub flex items-center"><Zap size={12} className="mr-1" /> 算力</span>
          </div>
          <div 
            className="flex flex-col items-center cursor-pointer active:opacity-70 transition-opacity"
            onClick={() => {
              const event = new CustomEvent('change-view', { detail: 'billing' });
              window.dispatchEvent(event);
            }}
          >
            <span className="text-[16px] font-bold text-text-main mb-1">5,000.00</span>
            <span className="text-[11px] text-text-sub flex items-center"><ShieldCheck size={12} className="mr-1" /> 确权金</span>
          </div>
          <div 
            className="flex flex-col items-center cursor-pointer active:opacity-70 transition-opacity"
            onClick={() => {
              const event = new CustomEvent('change-view', { detail: 'billing' });
              window.dispatchEvent(event);
            }}
          >
            <span className="text-[16px] font-bold text-text-main mb-1">1,200.00</span>
            <span className="text-[11px] text-text-sub flex items-center"><Clock size={12} className="mr-1" /> 待激活确权金</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col bg-bg-base relative overflow-hidden">
      {/* Offline Banner */}
      {offline && (
        <div className="bg-red-50 text-primary-start px-4 py-2 flex items-center justify-between text-[12px] z-50 absolute top-0 left-0 right-0">
          <div className="flex items-center">
            <WifiOff size={14} className="mr-2" />
            <span>网络不稳定，请检查网络设置</span>
          </div>
          <button onClick={() => setOffline(false)} className="font-medium px-2 py-1 bg-white dark:bg-gray-800 rounded shadow-sm">刷新</button>
        </div>
      )}

      

      <div className="flex-1 overflow-y-auto no-scrollbar pb-4">
        {renderHeader()}

        <div className="px-4 space-y-4 -mt-2 relative z-10">
          
          {/* Quick Entry 4-Grid */}
          <Card className="p-4 flex justify-around">
            {loading ? (
              [1, 2, 3, 4].map(i => (
                <div key={i} className="flex flex-col items-center space-y-1.5">
                  <Skeleton className="w-10 h-10 rounded-full" />
                  <Skeleton className="w-10 h-3" />
                </div>
              ))
            ) : (
              <>
                <div 
                  className="flex flex-col items-center cursor-pointer active:opacity-70 transition-opacity"
                  onClick={() => {
                    const event = new CustomEvent('change-view', { detail: 'order' });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="w-10 h-10 mb-1 flex items-center justify-center text-text-main"><CreditCard size={24} strokeWidth={1.5} /></div>
                  <span className="text-[12px] text-text-main">待付款</span>
                </div>
                <div 
                  className="flex flex-col items-center cursor-pointer active:opacity-70 transition-opacity"
                  onClick={() => {
                    const event = new CustomEvent('change-view', { detail: 'address' });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="w-10 h-10 mb-1 flex items-center justify-center text-text-main"><MapPin size={24} strokeWidth={1.5} /></div>
                  <span className="text-[12px] text-text-main">收货地址</span>
                </div>
                <div 
                  className="flex flex-col items-center cursor-pointer active:opacity-70 transition-opacity"
                  onClick={() => {
                    const event = new CustomEvent('change-view', { detail: 'coupon' });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="w-10 h-10 mb-1 flex items-center justify-center text-text-main"><Ticket size={24} strokeWidth={1.5} /></div>
                  <span className="text-[12px] text-text-main">优惠券</span>
                </div>
                <div 
                  className="flex flex-col items-center cursor-pointer active:opacity-70 transition-opacity"
                  onClick={() => {
                    const event = new CustomEvent('change-view', { detail: 'help_center' });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="w-10 h-10 mb-1 flex items-center justify-center text-text-main"><Headset size={24} strokeWidth={1.5} /></div>
                  <span className="text-[12px] text-text-main">联系客服</span>
                </div>
              </>
            )}
          </Card>

          {/* My Orders */}
          <Card className="p-0 overflow-hidden">
            <div 
              className="px-4 py-3 border-b border-border-light flex justify-between items-center cursor-pointer active:bg-bg-base transition-colors"
              onClick={() => {
                const event = new CustomEvent('change-view', { detail: 'order' });
                window.dispatchEvent(event);
              }}
            >
              <h3 className="text-[15px] font-bold text-text-main">我的订单</h3>
              <span className="text-[12px] text-text-aux flex items-center">查看全部 <ChevronRight size={14} /></span>
            </div>
            <div className="p-4 flex justify-around">
              {loading ? (
                [1, 2, 3, 4].map(i => (
                  <div key={i} className="flex flex-col items-center space-y-1.5">
                    <Skeleton className="w-8 h-8 rounded-full" />
                    <Skeleton className="w-10 h-3" />
                  </div>
                ))
              ) : emptyOrders ? (
                <div className="flex flex-col items-center justify-center py-2 w-full">
                  <Package size={32} className="text-text-aux mb-2 opacity-30" strokeWidth={1.5} />
                  <p className="text-[13px] text-text-sub mb-3">您还没有任何订单</p>
                  <button 
                    className="px-5 py-1.5 border border-primary-start text-primary-start rounded-full text-[12px] font-medium active:bg-red-50 transition-colors"
                    onClick={() => {
                      const event = new CustomEvent('change-view', { detail: 'store' });
                      window.dispatchEvent(event);
                    }}
                  >
                    去逛逛
                  </button>
                </div>
              ) : (
                <>
                  <div 
                    className="flex flex-col items-center cursor-pointer active:opacity-70 transition-opacity relative"
                    onClick={() => {
                      const event = new CustomEvent('change-view', { detail: 'order' });
                      window.dispatchEvent(event);
                    }}
                  >
                    <div className="w-8 h-8 mb-1 flex items-center justify-center text-text-main"><CreditCard size={24} strokeWidth={1.5} /></div>
                    <span className="text-[12px] text-text-main">待付款</span>
                    {isLoggedIn && <span className="absolute -top-1 -right-1 bg-primary-start text-white text-[10px] px-1.5 rounded-full border border-white">1</span>}
                  </div>
                  <div 
                    className="flex flex-col items-center cursor-pointer active:opacity-70 transition-opacity"
                    onClick={() => {
                      const event = new CustomEvent('change-view', { detail: 'order' });
                      window.dispatchEvent(event);
                    }}
                  >
                    <div className="w-8 h-8 mb-1 flex items-center justify-center text-text-main"><Package size={24} strokeWidth={1.5} /></div>
                    <span className="text-[12px] text-text-main">待发货</span>
                  </div>
                  <div 
                    className="flex flex-col items-center cursor-pointer active:opacity-70 transition-opacity relative"
                    onClick={() => {
                      const event = new CustomEvent('change-view', { detail: 'order' });
                      window.dispatchEvent(event);
                    }}
                  >
                    <div className="w-8 h-8 mb-1 flex items-center justify-center text-text-main"><Truck size={24} strokeWidth={1.5} /></div>
                    <span className="text-[12px] text-text-main">待收货</span>
                    {isLoggedIn && <span className="absolute -top-1 -right-1 bg-primary-start text-white text-[10px] px-1.5 rounded-full border border-white">2</span>}
                  </div>
                  <div 
                    className="flex flex-col items-center cursor-pointer active:opacity-70 transition-opacity"
                    onClick={() => {
                      const event = new CustomEvent('change-view', { detail: 'after_sales' });
                      window.dispatchEvent(event);
                    }}
                  >
                    <div className="w-8 h-8 mb-1 flex items-center justify-center text-text-main"><HeadphonesIcon size={24} strokeWidth={1.5} /></div>
                    <span className="text-[12px] text-text-main">售后</span>
                  </div>
                </>
              )}
            </div>
          </Card>

          {/* Confirmation Center (Business Focus) */}
          <Card className="p-0 overflow-hidden border border-primary-start/20">
            <div 
              className="px-4 py-3 border-b border-border-light flex justify-between items-center bg-gradient-to-r from-red-50 to-white dark:from-bg-box dark:to-bg-box cursor-pointer active:bg-red-50/80 dark:active:bg-gray-800 transition-colors"
              onClick={() => {
                const event = new CustomEvent('change-view', { detail: 'shield' });
                window.dispatchEvent(event);
              }}
            >
              <h3 className="text-[15px] font-bold text-text-main flex items-center">
                <ShieldCheck size={18} className="text-primary-start mr-1.5" /> 确权中心
              </h3>
              <span className="text-[12px] text-text-aux flex items-center">查看详情 <ChevronRight size={14} /></span>
            </div>
            <div className="p-4">
              {moduleError ? (
                <div className="flex flex-col items-center justify-center py-4">
                  <RefreshCcw size={24} className="text-text-aux mb-2" />
                  <p className="text-[12px] text-text-sub mb-3">确权数据加载失败</p>
                  <button onClick={() => setModuleError(false)} className="px-4 py-1 border border-border-light rounded-full text-[12px] text-text-main">重试</button>
                </div>
              ) : loading ? (
                <div className="flex justify-between items-center">
                  <div className="space-y-2 flex-1 mr-4">
                    <Skeleton className="w-3/4 h-4" />
                    <Skeleton className="w-1/2 h-3" />
                  </div>
                  <Skeleton className="w-16 h-7 rounded-full shrink-0" />
                </div>
              ) : !isLoggedIn ? (
                <div className="flex justify-between items-center">
                  <div className="text-[13px] text-text-sub">暂无确权记录</div>
                  <button 
                    className="px-4 py-1.5 border border-primary-start text-primary-start rounded-full text-[12px] font-medium"
                    onClick={() => {
                      const event = new CustomEvent('change-view', { detail: 'shield' });
                      window.dispatchEvent(event);
                    }}
                  >
                    去确权中心
                  </button>
                </div>
              ) : (
                <div className="flex justify-between items-center">
                  <div>
                    <div className="text-[13px] text-text-main mb-1">
                      确权中 <span className="font-bold text-primary-start mx-1">3</span> 项 <span className="text-border-light mx-1">|</span> 已确权 <span className="font-bold text-text-main mx-1">12</span> 项
                    </div>
                    <div className="text-[11px] text-text-sub">您有 1 项资产待提交确权资料</div>
                  </div>
                  <button 
                    className="bg-gradient-to-r from-primary-start to-primary-end text-white px-4 py-1.5 rounded-full text-[12px] font-medium shadow-sm active:opacity-80"
                    onClick={() => {
                      const event = new CustomEvent('change-view', { detail: 'shield' });
                      window.dispatchEvent(event);
                    }}
                  >
                    去确权
                  </button>
                </div>
              )}
            </div>
          </Card>

          {/* Tools & Services List */}
          <Card className="p-0 overflow-hidden">
            {loading ? (
              <div className="flex flex-col">
                {[1, 2, 3, 4, 5, 6, 7].map((i, index) => (
                  <div key={i} className={`px-4 py-3.5 flex items-center justify-between ${index < 6 ? 'border-b border-border-light' : ''}`}>
                    <div className="flex items-center space-x-3">
                      <Skeleton className="w-[18px] h-[18px] rounded" />
                      <Skeleton className="w-20 h-4" />
                    </div>
                    <Skeleton className="w-4 h-4" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="flex flex-col">
                <div 
                  className="px-4 py-3.5 border-b border-border-light flex items-center justify-between cursor-pointer active:bg-bg-base transition-colors"
                  onClick={() => {
                    const event = new CustomEvent('change-view', { detail: 'security' });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="flex items-center text-text-main">
                    <Lock size={18} className="mr-3 text-text-sub" />
                    <span className="text-[14px]">账号与安全</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-[11px] text-text-aux mr-1">密码/支付安全</span>
                    <ChevronRight size={16} className="text-text-aux" />
                  </div>
                </div>
                <div 
                  className="px-4 py-3.5 border-b border-border-light flex items-center justify-between cursor-pointer active:bg-bg-base transition-colors"
                  onClick={() => {
                    const event = new CustomEvent('change-view', { detail: 'friends' });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="flex items-center text-text-main">
                    <Users size={18} className="mr-3 text-text-sub" />
                    <span className="text-[14px]">我的好友</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-[11px] text-text-aux mr-1">邀好友得奖励</span>
                    <ChevronRight size={16} className="text-text-aux" />
                  </div>
                </div>
                <div 
                  className="px-4 py-3.5 border-b border-border-light flex items-center justify-between cursor-pointer active:bg-bg-base transition-colors"
                  onClick={() => {
                    const event = new CustomEvent('change-view', { detail: 'favorites' });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="flex items-center text-text-main">
                    <Heart size={18} className="mr-3 text-text-sub" />
                    <span className="text-[14px]">收藏与足迹</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-[11px] text-text-aux mr-1">商品/藏品</span>
                    <ChevronRight size={16} className="text-text-aux" />
                  </div>
                </div>
                <div 
                  className="px-4 py-3.5 border-b border-border-light flex items-center justify-between cursor-pointer active:bg-bg-base transition-colors"
                  onClick={() => {
                    const event = new CustomEvent('change-view', { detail: 'address' });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="flex items-center text-text-main">
                    <MapPin size={18} className="mr-3 text-text-sub" />
                    <span className="text-[14px]">地址管理</span>
                  </div>
                  <ChevronRight size={16} className="text-text-aux" />
                </div>
                <div 
                  className="px-4 py-3.5 border-b border-border-light flex items-center justify-between cursor-pointer active:bg-bg-base transition-colors"
                  onClick={() => {
                    const event = new CustomEvent('change-view', { detail: 'coupon' });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="flex items-center text-text-main">
                    <Wallet size={18} className="mr-3 text-text-sub" />
                    <span className="text-[14px]">资产明细</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-[11px] text-text-aux mr-1">券/积分/余额</span>
                    <ChevronRight size={16} className="text-text-aux" />
                  </div>
                </div>
                <div 
                  className="px-4 py-3.5 border-b border-border-light flex items-center justify-between cursor-pointer active:bg-bg-base transition-colors"
                  onClick={() => {
                    const event = new CustomEvent('change-view', { detail: 'recharge' });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="flex items-center text-text-main">
                    <CreditCard size={18} className="mr-3 text-text-sub" />
                    <span className="text-[14px]">专项金充值</span>
                  </div>
                  <ChevronRight size={16} className="text-text-aux" />
                </div>
                <div 
                  className="px-4 py-3.5 border-b border-border-light flex items-center justify-between cursor-pointer active:bg-bg-base transition-colors"
                  onClick={() => {
                    const event = new CustomEvent('change-view', { detail: 'transfer' });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="flex items-center text-text-main">
                    <Wallet size={18} className="mr-3 text-text-sub" />
                    <span className="text-[14px]">专项金划转</span>
                  </div>
                  <ChevronRight size={16} className="text-text-aux" />
                </div>
                <div 
                  className="px-4 py-3.5 border-b border-border-light flex items-center justify-between cursor-pointer active:bg-bg-base transition-colors"
                  onClick={() => {
                    const event = new CustomEvent('change-view', { detail: 'rights_transfer' });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="flex items-center text-text-main">
                    <ShieldCheck size={18} className="mr-3 text-text-sub" />
                    <span className="text-[14px]">确权金划转</span>
                  </div>
                  <ChevronRight size={16} className="text-text-aux" />
                </div>
                <div 
                  className="px-4 py-3.5 border-b border-border-light flex items-center justify-between cursor-pointer active:bg-bg-base transition-colors"
                  onClick={() => {
                    const event = new CustomEvent('change-view', { detail: 'withdraw' });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="flex items-center text-text-main">
                    <Landmark size={18} className="mr-3 text-text-sub" />
                    <span className="text-[14px]">收益提现</span>
                  </div>
                  <ChevronRight size={16} className="text-text-aux" />
                </div>
                <div 
                  className="px-4 py-3.5 border-b border-border-light flex items-center justify-between cursor-pointer active:bg-bg-base transition-colors"
                  onClick={() => {
                    const event = new CustomEvent('change-view', { detail: 'help_center' });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="flex items-center text-text-main">
                    <HelpCircle size={18} className="mr-3 text-text-sub" />
                    <span className="text-[14px]">售后与帮助</span>
                  </div>
                  <ChevronRight size={16} className="text-text-aux" />
                </div>
                <div 
                  className="px-4 py-3.5 border-b border-border-light flex items-center justify-between cursor-pointer active:bg-bg-base transition-colors"
                  onClick={() => {
                    const event = new CustomEvent('change-view', { detail: 'announcement' });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="flex items-center text-text-main">
                    <Bell size={18} className="mr-3 text-text-sub" />
                    <span className="text-[14px]">公告中心</span>
                  </div>
                  <div className="flex items-center">
                    <span className="w-2 h-2 bg-primary-start rounded-full mr-2"></span>
                    <ChevronRight size={16} className="text-text-aux" />
                  </div>
                </div>
                <div 
                  className="px-4 py-3.5 border-b border-border-light flex items-center justify-between cursor-pointer active:bg-bg-base transition-colors"
                  onClick={() => alert('缓存清理成功')}
                >
                  <div className="flex items-center text-text-main">
                    <Trash2 size={18} className="mr-3 text-text-sub" />
                    <span className="text-[14px]">清理缓存</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-[12px] text-text-aux mr-1">12.5MB</span>
                    <ChevronRight size={16} className="text-text-aux" />
                  </div>
                </div>
                <div 
                  className="px-4 py-3.5 flex items-center justify-between cursor-pointer active:bg-bg-base transition-colors"
                  onClick={() => {
                    const event = new CustomEvent('change-view', { detail: 'about' });
                    window.dispatchEvent(event);
                  }}
                >
                  <div className="flex items-center text-text-main">
                    <Info size={18} className="mr-3 text-text-sub" />
                    <span className="text-[14px]">关于我们</span>
                  </div>
                  <div className="flex items-center">
                    <span className="text-[12px] text-text-aux mr-1">v1.0.0</span>
                    <ChevronRight size={16} className="text-text-aux" />
                  </div>
                </div>
              </div>
            )}
          </Card>

          {/* Logout Button */}
          {isLoggedIn && !loading && (
            <div className="pt-4 pb-8">
              <button 
                onClick={() => setShowLogoutSheet(true)}
                className="w-full h-[48px] bg-bg-card border border-border-light text-text-main rounded-[16px] text-[15px] font-medium flex items-center justify-center active:bg-bg-base transition-colors shadow-sm"
              >
                <LogOut size={18} className="mr-2 text-text-sub" /> 退出登录
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Logout Action Sheet */}
      <ActionSheet
        isOpen={showLogoutSheet}
        onClose={() => setShowLogoutSheet(false)}
        title="确认退出登录？"
        groups={[
          {
            options: [
              {
                label: '退出登录',
                icon: <LogOut size={18} />,
                danger: true,
                loading: isLoggingOut,
                onClick: handleLogout
              }
            ]
          }
        ]}
      />
    </div>
  );
};
