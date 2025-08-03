'use client';

import { useState, useEffect } from 'react';
import LoginPage from '@/components/LoginPage';
import { NotificationProvider } from '@/contexts/NotificationContext';
import EnhancedDashboard from '@/components/EnhancedDashboard';
import ProductManagement from '@/components/ProductManagement';
import TransactionManagement from '@/components/TransactionManagement';
import ServiceManagement from '@/components/ServiceManagement';
import Reports from '@/components/Reports';
import StockAnalysis from '@/components/StockAnalysis';
import Calculator from '@/components/Calculator';
import ReceivableManagement from '@/components/ReceivableManagement';
import CustomerManagement from '@/components/CustomerManagement';
import TargetManagement from '@/components/TargetManagement';
import NotificationCenter from '@/components/NotificationCenter';
import RevenueAnalysis from '@/components/RevenueAnalysis';
import { useNotificationStore } from '@/lib/stores/notificationStore';
import { useUiStore, useIsLoading } from '@/lib/stores/uiStore';
import { useUserStore } from '@/lib/stores/userStore';
import { 
  Home, 
  Package, 
  DollarSign, 
  BarChart3,
  Wrench,
  Zap,
  RotateCcw,
  AlertTriangle,
  Calculator as CalculatorIcon,
  CreditCard,
  Users,
  Target,
  Bell,
  X,
  ChevronLeft,
  ChevronRight,
  LogOut
} from 'lucide-react';


function NotificationButton() {
  const [isOpen, setIsOpen] = useState(false);
  const { notifications, unreadCount } = useNotificationStore();
  const { setModal } = useUiStore();

  const handleToggle = () => {
    setIsOpen(!isOpen);
    setModal('notifications', !isOpen);
  };

  return (
    <>

      <button
        onClick={handleToggle}
        className="fixed top-6 right-6 z-40 glass p-3 rounded-full text-white hover:scale-110 transition-all duration-300 shadow-2xl border border-white/10 interactive-hover"
        title="Bildirimler"
      >
        <Bell className="h-4 w-4" />
        

        {unreadCount > 0 && (
          <>
            <span className="absolute -top-2 -right-2 bg-red-500 text-white text-xs rounded-full h-6 w-6 flex items-center justify-center animate-pulse font-bold notification-counter">
              {unreadCount > 9 ? '9+' : unreadCount}
            </span>
            

            <span className="absolute -top-2 -right-2 h-6 w-6 bg-red-500 rounded-full animate-ping opacity-75"></span>
          </>
        )}
      </button>


      {isOpen && (
        <div className="fixed inset-0 z-50 animate-fade-in">

          <div 
            className="fixed inset-0 bg-black/30 backdrop-blur-sm"
            onClick={() => setIsOpen(false)}
          ></div>
          

          <div className="absolute top-20 right-6 w-[450px] max-w-[calc(100vw-2rem)]">
            <NotificationCenter onClose={() => setIsOpen(false)} />
          </div>
        </div>
      )}
    </>
  );
}

export default function HomePage() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showResetModal, setShowResetModal] = useState(false);
  const [resetPassword, setResetPassword] = useState('');
  const [isAuthenticated, setIsAuthenticated] = useState<boolean | null>(null);
  

  const { setModal } = useUiStore();
  const isResetting = useIsLoading('resetData');
  const { setLoading, setError, setSuccessMessage } = useUiStore();
  const { addNotification } = useNotificationStore();
  const { theme, sidebarCollapsed, toggleSidebar } = useUiStore();

  // Check authentication status on component mount
  useEffect(() => {
    checkAuthStatus();
  }, []);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth');
      const data = await response.json();
      setIsAuthenticated(data.authenticated);
    } catch (error) {
      console.error('Auth check error:', error);
      setIsAuthenticated(false);
    }
  };

  const handleLoginSuccess = () => {
    setIsAuthenticated(true);
  };

  const handleLogout = async () => {
    try {
      await fetch('/api/auth', { method: 'DELETE' });
      setIsAuthenticated(false);
      addNotification({
        type: 'info',
        title: '👋 Çıkış Yapıldı',
        message: 'Güvenli bir şekilde çıkış yaptınız',
        icon: '🔒',
      });
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  const tabs = [
    { id: 'dashboard', label: 'Anasayfa', icon: Home },
    { id: 'revenue-analysis', label: 'Hasılat Analizi', icon: Zap },
    { id: 'calculator', label: 'Hesap Makinesi', icon: CalculatorIcon },
    { id: 'receivables', label: 'Hesap Takibi', icon: CreditCard },
    { id: 'targets', label: 'Hedef Takibi', icon: Target },
    { id: 'transactions', label: 'İşlemler', icon: DollarSign },
    { id: 'customers', label: 'Müşteriler', icon: Users },
    { id: 'reports', label: 'Raporlar', icon: BarChart3 },
    { id: 'services', label: 'Servis', icon: Wrench },
    { id: 'stock-analysis', label: 'Stok Analizi', icon: CalculatorIcon },
    { id: 'products', label: 'Ürünler', icon: Package },
  ];

  const handleReset = async () => {
    if (!resetPassword) {
      addNotification({
        type: 'warning',
        title: '⚠️ Eksik Bilgi',
        message: 'Lütfen şifre girin!',
        icon: '🔐',
      });
      return;
    }

    setLoading('resetData', true);
    setError('resetData', null);
    
    try {
      const response = await fetch('/api/reset', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password: resetPassword }),
      });

      const data = await response.json();

      if (response.ok) {
        setSuccessMessage('resetData', 'Tüm veriler başarıyla sıfırlandı! 🔄');
        addNotification({
          type: 'success',
          title: '✅ Veriler Sıfırlandı',
          message: 'Tüm veriler başarıyla temizlendi',
          icon: '🗑️',
        });
        
        setShowResetModal(false);
        setResetPassword('');
        

        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {
        const errorMessage = data.error || 'Sıfırlama işlemi başarısız!';
        setError('resetData', errorMessage);
        addNotification({
          type: 'error',
          title: '❌ Sıfırlama Başarısız',
          message: errorMessage,
          icon: '⚠️',
        });
      }
    } catch (error) {
      console.error('Reset error:', error);
      const errorMessage = 'Bir hata oluştu!';
      setError('resetData', errorMessage);
      addNotification({
        type: 'error',
        title: '❌ Sistem Hatası',
        message: errorMessage,
        icon: '🔧',
      });
    } finally {
      setLoading('resetData', false);
    }
  };

  const renderContent = () => {
    switch (activeTab) {
      case 'dashboard':
        return <EnhancedDashboard setActiveTab={setActiveTab} />;
      case 'revenue-analysis':
        return <RevenueAnalysis setActiveTab={setActiveTab} />;
      case 'products':
        return <ProductManagement />;
      case 'transactions':
        return <TransactionManagement />;
      case 'customers':
        return <CustomerManagement />;
      case 'targets':
        return <TargetManagement />;
      case 'receivables':
        return <ReceivableManagement />;
      case 'services':
        return <ServiceManagement />;
      case 'stock-analysis':
        return <StockAnalysis />;
      case 'calculator':
        return <Calculator />;
      case 'reports':
        return <Reports />;
      default:
        return <EnhancedDashboard setActiveTab={setActiveTab} />;
    }
  };

  // Show loading while checking auth
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-main-gradient flex items-center justify-center">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="text-lg text-gray-400 animate-pulse">🔐 Güvenlik kontrolü...</div>
        </div>
      </div>
    );
  }

  // Show login page if not authenticated
  if (!isAuthenticated) {
    return <LoginPage onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <>
      <div className={`min-h-screen bg-main-gradient ${theme}`}>

        <div className={`fixed left-0 top-0 h-screen bg-slate-800/95 backdrop-blur-sm shadow-xl z-30 transition-all duration-300 border-r border-slate-700/50 ${
          sidebarCollapsed ? 'w-20' : 'w-72'
        }`}>
          <div className="p-4 h-full flex flex-col">
            

            <nav className="space-y-2 flex-1 mt-6">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                const isActive = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center rounded-xl text-base font-medium transition-colors duration-200 ${
                      isActive
                        ? 'bg-blue-600 text-white'
                        : 'text-slate-300 hover:bg-slate-700 hover:text-white'
                    } ${
                      sidebarCollapsed ? 'justify-center px-4 py-4' : 'justify-start space-x-4 px-4 py-4'
                    }`}
                    title={sidebarCollapsed ? tab.label : ''}
                  >
                    <Icon className={`flex-shrink-0 ${
                      sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'
                    }`} />
                    {!sidebarCollapsed && (
                      <span className="truncate">{tab.label}</span>
                    )}
                  </button>
                );
              })}
            </nav>


            <div className="border-t border-slate-700 pt-4 space-y-2">

              <button
                onClick={toggleSidebar}
                className={`w-full flex items-center rounded-xl text-base font-medium text-slate-300 hover:bg-slate-700 hover:text-white transition-colors duration-200 ${
                  sidebarCollapsed ? 'justify-center px-4 py-4' : 'justify-start space-x-4 px-4 py-4'
                }`}
                title={sidebarCollapsed ? 'Menüyü Genişlet' : 'Menüyü Daralt'}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-6 h-6" />
                ) : (
                  <>
                    <ChevronLeft className="w-5 h-5" />
                    <span className="truncate">Menüyü Daralt</span>
                  </>
                )}
              </button>


              <button
                onClick={handleLogout}
                className={`w-full flex items-center rounded-xl text-base font-medium text-orange-400 hover:bg-orange-900/20 hover:text-orange-300 transition-colors duration-200 ${
                  sidebarCollapsed ? 'justify-center px-4 py-4' : 'justify-start space-x-4 px-4 py-4'
                }`}
                title={sidebarCollapsed ? 'Çıkış Yap' : ''}
              >
                <LogOut className={`${
                  sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'
                }`} />
                {!sidebarCollapsed && (
                  <span className="truncate">Çıkış Yap</span>
                )}
              </button>


              <button
                onClick={() => setShowResetModal(true)}
                disabled={isResetting}
                className={`w-full flex items-center rounded-xl text-base font-medium text-red-400 hover:bg-red-900/20 hover:text-red-300 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
                  sidebarCollapsed ? 'justify-center px-4 py-4' : 'justify-start space-x-4 px-4 py-4'
                }`}
                title={sidebarCollapsed ? 'Verileri Sıfırla' : ''}
              >
                <RotateCcw className={`${
                  sidebarCollapsed ? 'w-6 h-6' : 'w-5 h-5'
                } ${
                  isResetting ? 'animate-spin' : ''
                }`} />
                {!sidebarCollapsed && (
                  <span className="truncate">
                    {isResetting ? 'Sıfırlanıyor...' : 'Verileri Sıfırla'}
                  </span>
                )}
              </button>
            </div>
          </div>
        </div>


        <div className={`min-h-screen backdrop-blur-glass relative transition-all duration-300 ${
          sidebarCollapsed ? 'ml-20' : 'ml-72'
        }`}>

          {activeTab === 'dashboard' && <NotificationButton />}
          
          <div className="p-8">
            <div className="animate-fade-in">
              {renderContent()}
            </div>
          </div>
        </div>
        

        {showResetModal && (
          <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center" style={{zIndex: 99999}}>
            <div className="bg-gray-800 rounded-2xl p-8 w-full max-w-md shadow-2xl border border-gray-700 transform transition-all duration-200 scale-100 mx-4">

              <div className="flex items-center space-x-3 mb-6">
                <div className="glass rounded-full p-2 border border-red-500/20">
                  <AlertTriangle className="h-6 w-6 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white">Verileri Sıfırla</h2>
              </div>
              

              <div className="glass rounded-xl p-4 mb-6 border border-red-500/20">
                <p className="text-gray-300 text-sm leading-relaxed">
                  ⚠️ Bu işlem tüm ürünleri, işlemleri ve servis kayıtlarını kalıcı olarak silecektir. 
                  <span className="text-red-400 font-medium block mt-2">⚡ Bu işlem geri alınamaz!</span>
                </p>
              </div>
              

              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-300 mb-3">
                  Sıfırlama Şifresi:
                </label>
                <input
                  type="password"
                  value={resetPassword}
                  onChange={(e) => setResetPassword(e.target.value)}
                  className="w-full glass-input px-4 py-3 rounded-xl text-white placeholder-gray-400 border border-gray-600 focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
                  placeholder="Sıfırlama şifresini girin"
                  disabled={isResetting}
                  autoFocus
                />
              </div>
              

              <div className="flex space-x-3">
                <button
                  onClick={() => {
                    setShowResetModal(false);
                    setResetPassword('');
                  }}
                  className="btn btn-secondary flex-1"
                  disabled={isResetting}
                >
                  İptal
                </button>
                <button
                  onClick={handleReset}
                  disabled={isResetting || !resetPassword}
                  className={`btn btn-danger flex-1 ${
                    isResetting ? 'btn-loading' : ''
                  } disabled:opacity-50 disabled:cursor-not-allowed`}
                >
                  {isResetting ? '' : 'Sıfırla'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}
