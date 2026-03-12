import {
  Wallet,
  CalendarCheck,
  Receipt,
  FileText,
  ShieldCheck,
  Box,
  ClipboardList,
  Coins,
  Package,
  Truck,
  CheckCircle,
  UserCheck,
  CreditCard,
  MapPin,
  Users,
  HelpCircle,
  HeadphonesIcon,
  Newspaper,
  Gift,
  Layers,
} from 'lucide-react';
import type { NavigateFunction } from 'react-router-dom';
import CoinsIcon from './components/CoinsIcon';
import type { ProfileSectionItem } from './components/ProfileSectionGrid';

interface BuildConvenientServicesParams {
  navigate: NavigateFunction;
  hasSignedToday: boolean;
}

interface BuildServiceManagementParams {
  navigate: NavigateFunction;
  openSupport: () => void;
}

export const buildConvenientServices = ({
  navigate,
  hasSignedToday,
}: BuildConvenientServicesParams): ProfileSectionItem[] => {
  return [
    {
      label: '专项金充值',
      icon: Wallet,
      iconColorClass: 'text-red-600',
      iconBgClass: 'bg-red-50',
      action: () => navigate('/recharge'),
    },
    {
      label: '姣忔棩绛惧埌',
      icon: CalendarCheck,
      iconColorClass: 'text-red-500',
      iconBgClass: 'bg-red-50',
      action: () => navigate('/sign-in'),
      showDot: !hasSignedToday,
    },
    {
      label: '鏀剁泭鎻愮幇',
      icon: Receipt,
      iconColorClass: 'text-red-500',
      iconBgClass: 'bg-red-50',
      action: () => navigate('/withdraw'),
    },
    {
      label: '消费金兑换',
      icon: CoinsIcon,
      iconColorClass: 'text-yellow-600',
      iconBgClass: 'bg-yellow-50',
      action: () => navigate('/store'),
    },
  ];
};

export const buildRightsManagement = (navigate: NavigateFunction): ProfileSectionItem[] => {
  return [
    {
      label: '璧勪骇鏄庣粏',
      icon: FileText,
      iconColorClass: 'text-purple-600',
      iconBgClass: 'bg-purple-50',
      action: () => navigate('/billing'),
    },
    {
      label: '绱鏉冪泭',
      icon: ShieldCheck,
      iconColorClass: 'text-green-600',
      iconBgClass: 'bg-green-50',
      action: () => navigate('/accumulated-rights'),
    },
    {
      label: '寄售券',
      icon: Receipt,
      iconColorClass: 'text-pink-600',
      iconBgClass: 'bg-pink-50',
      action: () => navigate('/consignment-voucher'),
    },
    {
      label: '鎴戠殑钘忓搧',
      icon: Box,
      iconColorClass: 'text-indigo-600',
      iconBgClass: 'bg-indigo-50',
      action: () => navigate('/my-collection'),
    },
    {
      label: '鎴戠殑鍗″寘',
      icon: Layers,
      iconColorClass: 'text-orange-600',
      iconBgClass: 'bg-orange-50',
      action: () => navigate('/my-card-packs'),
    },
    {
      label: '藏品预约券',
      icon: ClipboardList,
      iconColorClass: 'text-blue-600',
      iconBgClass: 'bg-blue-50',
      action: () => navigate('/reservations'),
    },
  ];
};

export const buildPointsOrder = (
  navigate: NavigateFunction,
  orderStats: any
): ProfileSectionItem[] => {
  return [
    {
      label: '待付款',
      icon: Coins,
      iconColorClass: 'text-red-500',
      iconBgClass: 'bg-red-50',
      action: () => navigate('/order?tab=unpaid'),
      badge: orderStats?.pending_count || 0,
    },
    {
      label: '待发货',
      icon: Package,
      iconColorClass: 'text-blue-500',
      iconBgClass: 'bg-blue-50',
      action: () => navigate('/order?tab=toship'),
      badge: orderStats?.paid_count || 0,
    },
    {
      label: '待收货',
      icon: Truck,
      iconColorClass: 'text-purple-500',
      iconBgClass: 'bg-purple-50',
      action: () => navigate('/order?tab=toreceive'),
      badge: orderStats?.shipped_count || 0,
    },
    {
      label: '已完成',
      icon: CheckCircle,
      iconColorClass: 'text-green-500',
      iconBgClass: 'bg-green-50',
      action: () => navigate('/order?tab=completed'),
      badge: orderStats?.completed_count || 0,
    },
  ];
};

export const buildServiceManagement = ({
  navigate,
  openSupport,
}: BuildServiceManagementParams): ProfileSectionItem[] => {
  return [
    { label: '瀹炲悕璁よ瘉', icon: UserCheck, action: () => navigate('/auth/real-name') },
    { label: '鍗″彿绠＄悊', icon: CreditCard, action: () => navigate('/payment-accounts') },
    { label: '鏀惰揣鍦板潃', icon: MapPin, action: () => navigate('/address') },
    { label: '鎴戠殑濂藉弸', icon: Users, action: () => navigate('/friends') },
    { label: '甯姪涓績', icon: HelpCircle, action: () => navigate('/help_center') },
    { label: '瑙勫垯鍗忚', icon: FileText, action: () => navigate('/user_agreement') },
    { label: '闅愮鏀跨瓥', icon: ShieldCheck, action: () => navigate('/privacy_policy') },
    { label: '娲诲姩涓績', icon: Gift, action: () => navigate('/activity-center') },
    { label: '鍦ㄧ嚎瀹㈡湇', icon: HeadphonesIcon, action: openSupport },
    { label: '骞冲彴璧勮', icon: Newspaper, action: () => navigate('/announcement') },
  ].map((item) => ({
    ...item,
    iconBgClass: 'bg-gray-50',
    iconColorClass: 'text-gray-600',
    iconStrokeWidth: 1.5,
    labelClassName: 'text-xs text-gray-500 dark:text-gray-400',
  }));
};
