import React, { useState, useEffect, useRef } from 'react';
import { X, RefreshCcw, Ticket } from 'lucide-react';
import { Skeleton } from '../ui/Skeleton';

interface Coupon {
  id: string;
  amount: number;
  threshold: string;
  title: string;
  validity: string;
  scope: string;
  status: 'available' | 'received';
}

interface CouponBottomSheetProps {
  isOpen: boolean;
  onClose: () => void;
}

export const CouponBottomSheet: React.FC<CouponBottomSheetProps> = ({ isOpen, onClose }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [isEmpty, setIsEmpty] = useState(false);
  
  // For demo purposes
  const [demoState, setDemoState] = useState<'normal' | 'empty' | 'error'>('normal');

  useEffect(() => {
    if (isOpen) {
      fetchCoupons();
    }
  }, [isOpen, demoState]);

  const fetchCoupons = () => {
    setLoading(true);
    setError(false);
    setIsEmpty(false);

    setTimeout(() => {
      if (demoState === 'error') {
        setError(true);
      } else if (demoState === 'empty') {
        setIsEmpty(true);
        setCoupons([]);
      } else {
        setCoupons([
          {
            id: '1',
            amount: 200,
            threshold: '满3000可用',
            title: '手机数码品类券',
            validity: '2023.10.24-2023.11.11',
            scope: '仅可购买指定手机数码商品',
            status: 'available'
          },
          {
            id: '2',
            amount: 50,
            threshold: '满500可用',
            title: '全品类通用券',
            validity: '2023.10.24-2023.10.31',
            scope: '全平台自营商品可用',
            status: 'received'
          },
          {
            id: '3',
            amount: 10,
            threshold: '无门槛',
            title: '新用户专享券',
            validity: '领取后3天内有效',
            scope: '全平台商品可用',
            status: 'available'
          },
          {
            id: '4',
            amount: 100,
            threshold: '满1000可用',
            title: '家电品类券',
            validity: '2023.10.24-2023.11.11',
            scope: '仅可购买指定家电商品',
            status: 'available'
          }
        ]);
      }
      setLoading(false);
    }, 800);
  };

  const handleReceive = (id: string) => {
    setCoupons(prev => prev.map(c => c.id === id ? { ...c, status: 'received' } : c));
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col justify-end">
      <div 
        className="absolute inset-0 bg-black/50 backdrop-blur-sm transition-opacity" 
        onClick={onClose}
      />
      
      <div className="bg-[#F5F5F5] dark:bg-[#121212] rounded-t-[16px] w-full h-[75vh] flex flex-col relative z-10 animate-in slide-in-from-bottom duration-300">
        {/* Header */}
        <div className="h-14 flex items-center justify-center relative bg-white dark:bg-[#1E1E1E] rounded-t-[16px] shrink-0">
          <h3 className="text-[16px] font-bold text-[#1A1A1A] dark:text-[#E5E5E5]">领取优惠券</h3>
          <button 
            onClick={onClose}
            className="absolute right-4 p-2 text-[#999999] dark:text-[#666666] active:bg-[#F5F5F5] dark:active:bg-[#2A2A2A] rounded-full transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* Demo Controls (Hidden in production) */}
        <div className="px-4 py-2 flex space-x-2 overflow-x-auto no-scrollbar bg-white dark:bg-[#1E1E1E] border-b border-[#F5F5F5] dark:border-[#2A2A2A] text-[10px] shrink-0">
          <span className="text-[#999999] flex items-center shrink-0">Demo:</span>
          <button onClick={() => setDemoState('normal')} className={`px-2 py-1 rounded border ${demoState === 'normal' ? 'bg-[#E2231A] text-white border-[#E2231A]' : 'border-[#CCCCCC] dark:border-[#666666] text-[#1A1A1A] dark:text-[#E5E5E5]'}`}>Normal</button>
          <button onClick={() => setDemoState('empty')} className={`px-2 py-1 rounded border ${demoState === 'empty' ? 'bg-[#E2231A] text-white border-[#E2231A]' : 'border-[#CCCCCC] dark:border-[#666666] text-[#1A1A1A] dark:text-[#E5E5E5]'}`}>Empty</button>
          <button onClick={() => setDemoState('error')} className={`px-2 py-1 rounded border ${demoState === 'error' ? 'bg-[#E2231A] text-white border-[#E2231A]' : 'border-[#CCCCCC] dark:border-[#666666] text-[#1A1A1A] dark:text-[#E5E5E5]'}`}>Error</button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 relative">
          {error ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <RefreshCcw size={48} className="text-[#CCCCCC] dark:text-[#666666] mb-4" />
              <p className="text-[14px] text-[#666666] dark:text-[#999999] mb-4">加载失败，请稍后再试</p>
              <button 
                onClick={fetchCoupons}
                className="px-6 py-2 border border-[#CCCCCC] dark:border-[#666666] rounded-full text-[13px] text-[#1A1A1A] dark:text-[#E5E5E5] active:bg-[#F5F5F5] dark:active:bg-[#2A2A2A]"
              >
                重新加载
              </button>
            </div>
          ) : isEmpty ? (
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <Ticket size={64} className="text-[#CCCCCC] dark:text-[#666666] mb-4 opacity-50" strokeWidth={1.5} />
              <p className="text-[14px] text-[#666666] dark:text-[#999999]">暂无可领取的优惠券</p>
            </div>
          ) : loading ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="bg-white dark:bg-[#1E1E1E] rounded-[12px] h-[100px] flex overflow-hidden shadow-sm">
                  <div className="w-[110px] bg-[#FFF3F3] dark:bg-[#3A1E1E] flex flex-col items-center justify-center shrink-0">
                    <Skeleton className="w-16 h-8 mb-2 bg-white/50 dark:bg-black/20" />
                    <Skeleton className="w-12 h-3 bg-white/50 dark:bg-black/20" />
                  </div>
                  <div className="flex-1 p-3 flex flex-col justify-between">
                    <Skeleton className="w-3/4 h-4" />
                    <Skeleton className="w-1/2 h-3" />
                    <div className="flex justify-between items-end">
                      <Skeleton className="w-2/3 h-3" />
                      <Skeleton className="w-14 h-6 rounded-full" />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="space-y-3 pb-4">
              {coupons.map(coupon => (
                <div key={coupon.id} className="bg-white dark:bg-[#1E1E1E] rounded-[12px] flex overflow-hidden shadow-sm relative">
                  {/* Left Side: Amount & Threshold */}
                  <div className={`w-[110px] flex flex-col items-center justify-center shrink-0 relative ${coupon.status === 'received' ? 'bg-[#F5F5F5] dark:bg-[#2A2A2A]' : 'bg-[#FFF3F3] dark:bg-[#3A1E1E]'}`}>
                    <div className={`flex items-baseline ${coupon.status === 'received' ? 'text-[#999999] dark:text-[#666666]' : 'text-[#E2231A] dark:text-[#FF6B6B]'}`}>
                      <span className="text-[14px] font-bold">¥</span>
                      <span className="text-[28px] font-bold leading-none tracking-tight ml-0.5">{coupon.amount}</span>
                    </div>
                    <span className={`text-[11px] mt-1 ${coupon.status === 'received' ? 'text-[#999999] dark:text-[#666666]' : 'text-[#E2231A] dark:text-[#FF6B6B]'}`}>
                      {coupon.threshold}
                    </span>
                    
                    {/* Dashed line separator */}
                    <div className="absolute right-0 top-2 bottom-2 w-px border-r border-dashed border-[#CCCCCC] dark:border-[#666666] opacity-50"></div>
                    
                    {/* Top/Bottom cutouts */}
                    <div className="absolute -right-1.5 -top-1.5 w-3 h-3 rounded-full bg-[#F5F5F5] dark:bg-[#121212]"></div>
                    <div className="absolute -right-1.5 -bottom-1.5 w-3 h-3 rounded-full bg-[#F5F5F5] dark:bg-[#121212]"></div>
                  </div>
                  
                  {/* Right Side: Details & Action */}
                  <div className="flex-1 p-3 flex flex-col justify-between relative">
                    {coupon.status === 'received' && (
                      <div className="absolute top-0 right-0 w-12 h-12 overflow-hidden">
                        <div className="absolute top-2 -right-3 bg-[#CCCCCC] dark:bg-[#666666] text-white text-[8px] py-0.5 px-4 rotate-45">
                          已领取
                        </div>
                      </div>
                    )}
                    
                    <div>
                      <div className="flex items-start mb-1 pr-6">
                        <span className={`text-[10px] px-1 py-0.5 rounded mr-1 shrink-0 mt-0.5 ${coupon.status === 'received' ? 'bg-[#F5F5F5] text-[#999999] dark:bg-[#2A2A2A] dark:text-[#666666]' : 'bg-[#E2231A] text-white'}`}>
                          优惠券
                        </span>
                        <h4 className={`text-[14px] font-bold line-clamp-1 ${coupon.status === 'received' ? 'text-[#999999] dark:text-[#666666]' : 'text-[#1A1A1A] dark:text-[#E5E5E5]'}`}>
                          {coupon.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-[#999999] dark:text-[#666666] line-clamp-1 mb-2">
                        {coupon.scope}
                      </p>
                    </div>
                    
                    <div className="flex items-end justify-between">
                      <span className="text-[10px] text-[#999999] dark:text-[#666666]">
                        {coupon.validity}
                      </span>
                      {coupon.status === 'available' ? (
                        <button 
                          onClick={() => handleReceive(coupon.id)}
                          className="w-[60px] h-[24px] rounded-full bg-gradient-to-r from-[#E2231A] to-[#F93A3A] text-white text-[12px] font-medium active:opacity-80 flex items-center justify-center shadow-[0_2px_8px_rgba(226,35,26,0.2)]"
                        >
                          领取
                        </button>
                      ) : (
                        <button 
                          className="w-[60px] h-[24px] rounded-full bg-transparent border border-[#CCCCCC] dark:border-[#666666] text-[#999999] dark:text-[#666666] text-[12px] font-medium flex items-center justify-center"
                        >
                          去使用
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {/* Lazy Loading Indicator */}
              <div className="py-4 flex justify-center items-center text-[12px] text-[#999999] dark:text-[#666666]">
                <span className="w-4 h-4 border-2 border-[#CCCCCC] dark:border-[#666666] border-t-transparent rounded-full animate-spin mr-2"></span>
                加载更多...
              </div>
            </div>
          )}
        </div>

        {/* Bottom Action */}
        <div className="p-3 pb-safe bg-white dark:bg-[#1E1E1E] border-t border-[#F5F5F5] dark:border-[#2A2A2A] shrink-0">
          <button 
            onClick={onClose}
            className="w-full h-[44px] rounded-[22px] bg-gradient-to-r from-[#E2231A] to-[#F93A3A] text-white font-medium text-[15px] active:opacity-80 flex items-center justify-center shadow-[0_4px_12px_rgba(226,35,26,0.2)]"
          >
            完成
          </button>
        </div>
      </div>
    </div>
  );
};
