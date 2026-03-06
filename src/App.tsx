/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { Moon, Sun } from 'lucide-react';
import { useTheme } from './contexts/ThemeContext';

import { HomePage } from './pages/Home';
import { StorePage } from './pages/Store';
import { OrderPage } from './pages/Order';
import { LoginPage } from './pages/Login';
import { RegisterPage } from './pages/Register';
import { DesignSystemPage } from './pages/DesignSystem';
import { UserPage } from './pages/User';
import { ProductDetailPage } from './pages/ProductDetail';
import { CategoryPage } from './pages/Category';
import { SearchPage } from './pages/Search';
import { SearchResultPage } from './pages/SearchResult';
import { CartPage } from './pages/Cart';
import { CheckoutPage } from './pages/Checkout';
import { CashierPage } from './pages/Cashier';
import { PaymentResultPage } from './pages/PaymentResult';
import { LogisticsPage } from './pages/Logistics';
import { CouponPage } from './pages/Coupon';
import { AddressPage } from './pages/Address';
import { AfterSalesPage } from './pages/AfterSales';
import { SecurityPage } from './pages/Security';
import { InvitePage } from './pages/Invite';
import { FavoritesPage } from './pages/Favorites';
import { MessageCenterPage } from './pages/MessageCenter';
import { HelpCenterPage } from './pages/HelpCenter';
import { AnnouncementPage } from './pages/Announcement';
import { SettingsPage } from './pages/Settings';
import { AboutUsPage } from './pages/AboutUs';
import { BillingPage } from './pages/Billing';
import { RealNameAuthPage } from './pages/RealNameAuth';
import { TradingZonePage } from './pages/TradingZone';
import { TradingDetailPage } from './pages/TradingDetail';
import { PreOrderPage } from './pages/PreOrder';
import { RightsPage } from './pages/Rights';
import { RightsHistoryPage } from './pages/RightsHistory';
import { RechargePage } from './pages/Recharge';
import { TransferPage } from './pages/Transfer';
import { RightsTransferPage } from './pages/RightsTransfer';
import { WithdrawPage } from './pages/Withdraw';
import { FriendsPage } from './pages/Friends';
import { LivePage } from './pages/Live';
import { LiveWebViewPage } from './pages/LiveWebView';
import { ServiceDescriptionPage } from './pages/ServiceDescription';
import { ReviewsPage } from './pages/Reviews';
import AddReviewPage from './pages/AddReview';
import { ProductQAPage } from './pages/ProductQA';
import { OrderDetailPage } from './pages/OrderDetail';
import { BottomTab } from './components/layout/BottomTab';
import { FeedbackProvider } from './components/ui/FeedbackProvider';

export default function App() {
  const [history, setHistory] = useState<string[]>(['home']);
  const view = history[history.length - 1];
  const { theme, setTheme, isDark } = useTheme();

  useEffect(() => {
    const handleViewChange = (e: any) => {
      const targetView = typeof e.detail === 'string' ? e.detail : e.detail?.view;
      if (!targetView) return;
      
      setHistory(prev => {
        const bottomTabs = ['home', 'store', 'shield', 'order', 'user'];
        if (bottomTabs.includes(targetView)) {
          return [targetView];
        }
        if (prev[prev.length - 1] === targetView) {
          return prev;
        }
        return [...prev, targetView];
      });
    };

    const handleGoBack = () => {
      setHistory(prev => {
        if (prev.length > 1) {
          return prev.slice(0, -1);
        }
        return ['home'];
      });
    };

    window.addEventListener('change-view', handleViewChange);
    window.addEventListener('go-back', handleGoBack);
    return () => {
      window.removeEventListener('change-view', handleViewChange);
      window.removeEventListener('go-back', handleGoBack);
    };
  }, []);

  // Dark mode is now managed by ThemeContext

  const showBottomTab = ['home', 'store', 'shield', 'order', 'user'].includes(view);

  return (
    <FeedbackProvider>
      <div className="h-[100dvh] w-full bg-bg-base flex flex-col overflow-hidden">
        {/* Floating Dark Mode Toggle */}
        <button
          className={`fixed ${showBottomTab ? 'bottom-24' : 'bottom-6'} right-4 z-50 p-3 rounded-full bg-bg-card shadow-lg border border-border-light text-text-main transition-all`}
          onClick={() => setTheme(isDark ? 'light' : 'dark')}
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>

        {/* Main Content Area */}
        <div className="flex-1 w-full max-w-[390px] mx-auto bg-bg-base relative flex flex-col shadow-2xl overflow-hidden">
          <div className="flex-1 relative flex flex-col overflow-hidden">
            {view === 'home' && <HomePage />}
            {view === 'store' && <StorePage />}
            {view === 'order' && <OrderPage />}
            {view === 'user' && <UserPage />}
            {view === 'product_detail' && <ProductDetailPage />}
            {view === 'category' && <CategoryPage />}
            {view === 'search' && <SearchPage />}
            {view === 'search_result' && <SearchResultPage />}
            {view === 'cart' && <CartPage />}
            {view === 'checkout' && <CheckoutPage />}
            {view === 'cashier' && <CashierPage />}
            {view === 'payment_result' && <PaymentResultPage />}
            {view === 'logistics' && <LogisticsPage />}
            {view === 'coupon' && <CouponPage />}
            {view === 'address' && <AddressPage />}
            {view === 'after_sales' && <AfterSalesPage />}
            {view === 'security' && <SecurityPage />}
            {view === 'invite' && <InvitePage />}
            {view === 'favorites' && <FavoritesPage />}
            {view === 'message_center' && <MessageCenterPage />}
            {view === 'help_center' && <HelpCenterPage />}
            {view === 'announcement' && <AnnouncementPage />}
            {view === 'settings' && <SettingsPage />}
            {view === 'about' && <AboutUsPage />}
            {view === 'billing' && <BillingPage />}
            {view === 'real_name_auth' && <RealNameAuthPage />}
            {view === 'trading_zone' && <TradingZonePage />}
            {view === 'trading_detail' && <TradingDetailPage />}
            {view === 'pre_order' && <PreOrderPage />}
            {view === 'login' && <LoginPage />}
            {view === 'register' && <RegisterPage />}
            {view === 'design' && <DesignSystemPage />}
            {view === 'shield' && <RightsPage />}
            {view === 'rights_history' && <RightsHistoryPage />}
            {view === 'recharge' && <RechargePage />}
            {view === 'transfer' && <TransferPage />}
            {view === 'rights_transfer' && <RightsTransferPage />}
            {view === 'withdraw' && <WithdrawPage />}
            {view === 'friends' && <FriendsPage />}
            {view === 'live' && <LivePage />}
            {view === 'live_webview' && <LiveWebViewPage />}
            {view === 'service_description' && <ServiceDescriptionPage />}
            {view === 'reviews' && <ReviewsPage />}
            {view === 'add_review' && <AddReviewPage />}
            {view === 'product_qa' && <ProductQAPage />}
            {view === 'order_detail' && <OrderDetailPage />}
            
            {/* Placeholders for unbuilt pages */}
          </div>
          
          {showBottomTab && <BottomTab active={view} />}
        </div>
      </div>
    </FeedbackProvider>
  );
}
