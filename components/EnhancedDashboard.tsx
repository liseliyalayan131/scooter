'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, Package, Users, Wrench, 
  Target, AlertTriangle, CheckCircle, Clock, BarChart3, PieChart,
  Calendar, Star, Award, Crown, Heart, Zap, ArrowUp, ArrowDown,
  ShoppingCart, CreditCard, Phone, Settings
} from 'lucide-react';

interface EnhancedDashboardStats {

  todayRevenue: number;
  weeklyRevenue: number;
  monthlyRevenue: number;
  yearlyRevenue: number;
  totalProfit: number;
  totalExpenses: number;
  netProfit: number;
  serviceRevenue: number;
  

  totalCustomers: number;
  vipCustomers: number;
  averageCustomerValue: number;
  totalCustomerValue: number;
  

  totalProducts: number;
  lowStockProducts: Array<{
    _id: string;
    name: string;
    stock: number;
    minStock: number;
    category: string;
  }>;
  outOfStockCount: number;
  

  totalAlacak: number;
  totalVerecek: number;
  netReceivable: number;
  

  activeTargets: number;
  targetProgress: number;
  

  topSellingProducts: Array<{
    _id: string;
    totalSold: number;
    totalRevenue: number;
    product: {
      name: string;
      category: string;
    };
  }>;
  topCustomers: Array<{
    _id: string;
    name: string;
    totalSpent: number;
    visitCount: number;
    customerType: string;
    loyaltyPoints: number;
  }>;
  dailySalesTrend: Array<{
    date: string;
    revenue: number;
    transactions: number;
  }>;
  customerSegmentation: Array<{
    _id: string;
    count: number;
    totalValue: number;
  }>;
  monthlySalesByCategory: Array<{
    _id: string;
    total: number;
    count: number;
  }>;
  serviceStatus: {
    [key: string]: number;
  };
  lastUpdated: string;
}

interface EnhancedDashboardProps {
  setActiveTab: (tab: string) => void;
}

export default function EnhancedDashboard({ setActiveTab }: EnhancedDashboardProps) {
  const [stats, setStats] = useState<EnhancedDashboardStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  const fetchDashboardStats = useCallback(async () => {
    try {
      const response = await fetch('/api/dashboard');
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (error) {
      console.error('Dashboard verileri alınamadı:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  // eslint-disable-next-line react-hooks/exhaustive-deps
  useEffect(() => {
    fetchDashboardStats();
    
    // Yeni interval oluştur
    const interval = setInterval(() => {
      fetchDashboardStats();
    }, 30000);
    
    setRefreshInterval(interval);
    
    return () => {
      clearInterval(interval);
    };
  }, [fetchDashboardStats]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatNumber = (num: number) => {
    return new Intl.NumberFormat('tr-TR').format(num);
  };

  const getPercentageChange = (current: number, previous: number) => {
    if (previous === 0) return 0;
    return ((current - previous) / previous) * 100;
  };

  const getCustomerTypeIcon = (type: string) => {
    switch (type) {
      case 'gold': return <Crown className="h-4 w-4 text-yellow-400" />;
      case 'premium': return <Star className="h-4 w-4 text-purple-400" />;
      case 'vip': return <Award className="h-4 w-4 text-blue-400" />;
      default: return <Users className="h-4 w-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="text-lg text-gray-400 animate-pulse">📊 Dashboard yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="text-center py-12">
        <AlertTriangle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-400">Dashboard verileri yüklenemedi</p>
        <button
          onClick={() => window.location.reload()}
          className="mt-4 btn btn-primary"
        >
          Yeniden Dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-blue-400 via-purple-400 to-green-400 bg-clip-text text-transparent">
            🛴 Enhanced Dashboard
          </h1>
          <p className="text-gray-400 text-lg">Gelişmiş İş Analizi ve Raporlama</p>
          <p className="text-xs text-gray-500 mt-1">
            Son Güncelleme: {new Date(stats.lastUpdated).toLocaleString('tr-TR')}
          </p>
        </div>
        
        {/* Period Selector */}
        <div className="flex items-center space-x-2 mt-4 lg:mt-0">
          <span className="text-gray-400 text-sm">Dönem:</span>
          {[
            { key: 'today', label: 'Bugün' },
            { key: 'week', label: 'Bu Hafta' },
            { key: 'month', label: 'Bu Ay' },
            { key: 'year', label: 'Bu Yıl' }
          ].map((period) => (
            <button
              key={period.key}
              onClick={() => setSelectedPeriod(period.key as any)}
              className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                selectedPeriod === period.key
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        {/* Revenue Card */}
        <div className="stat-card group cursor-pointer transform hover:scale-105" onClick={() => setActiveTab('revenue-analysis')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">
                {selectedPeriod === 'today' ? 'Günlük Hasılat' : 
                 selectedPeriod === 'week' ? 'Haftalık Hasılat' :
                 selectedPeriod === 'month' ? 'Aylık Hasılat' : 'Yıllık Hasılat'}
              </p>
              <p className="text-xl lg:text-2xl font-bold text-green-400 group-hover:text-green-300 transition-all">
                {formatCurrency(
                  selectedPeriod === 'today' ? stats.todayRevenue :
                  selectedPeriod === 'week' ? stats.weeklyRevenue :
                  selectedPeriod === 'month' ? stats.monthlyRevenue : stats.yearlyRevenue
                )}
              </p>
              <div className="flex items-center mt-1">
                <ArrowUp className="h-4 w-4 text-green-400 mr-1" />
                <span className="text-xs text-green-400">+12.5%</span>
              </div>
            </div>
            <div className="transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
              <DollarSign className="h-8 w-8 text-green-400 drop-shadow-lg" />
            </div>
          </div>
          <div className="progress mt-3">
            <div className="progress-fill bg-gradient-to-r from-green-500 to-green-400" style={{width: '75%'}}></div>
          </div>
        </div>

        {/* Customers Card */}
        <div className="stat-card group cursor-pointer transform hover:scale-105" onClick={() => setActiveTab('customers')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">Müşteri Tabanı</p>
              <p className="text-xl lg:text-2xl font-bold text-blue-400 group-hover:text-blue-300 transition-all">
                {formatNumber(stats.totalCustomers)}
              </p>
              <div className="flex items-center mt-1">
                <Crown className="h-4 w-4 text-yellow-400 mr-1" />
                <span className="text-xs text-yellow-400">{stats.vipCustomers} VIP</span>
              </div>
            </div>
            <div className="transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
              <Users className="h-8 w-8 text-blue-400 drop-shadow-lg" />
            </div>
          </div>
          <div className="progress mt-3">
            <div className="progress-fill bg-gradient-to-r from-blue-500 to-blue-400" style={{width: '85%'}}></div>
          </div>
        </div>

        {/* Products Card */}
        <div className="stat-card group cursor-pointer transform hover:scale-105" onClick={() => setActiveTab('products')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">Ürün Yönetimi</p>
              <p className="text-xl lg:text-2xl font-bold text-purple-400 group-hover:text-purple-300 transition-all">
                {formatNumber(stats.totalProducts)}
              </p>
              <div className="flex items-center mt-1">
                <AlertTriangle className="h-4 w-4 text-red-400 mr-1" />
                <span className="text-xs text-red-400">{stats.lowStockProducts.length} düşük stok</span>
              </div>
            </div>
            <div className="transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
              <Package className="h-8 w-8 text-purple-400 drop-shadow-lg" />
            </div>
          </div>
          <div className="progress mt-3">
            <div className="progress-fill bg-gradient-to-r from-purple-500 to-purple-400" style={{width: '60%'}}></div>
          </div>
        </div>

        {/* Services Card */}
        <div className="stat-card group cursor-pointer transform hover:scale-105" onClick={() => setActiveTab('services')}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors">Servis Geliri</p>
              <p className="text-xl lg:text-2xl font-bold text-orange-400 group-hover:text-orange-300 transition-all">
                {formatCurrency(stats.serviceRevenue)}
              </p>
              <div className="flex items-center mt-1">
                <CheckCircle className="h-4 w-4 text-green-400 mr-1" />
                <span className="text-xs text-green-400">Tamamlanan</span>
              </div>
            </div>
            <div className="transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
              <Wrench className="h-8 w-8 text-orange-400 drop-shadow-lg" />
            </div>
          </div>
          <div className="progress mt-3">
            <div className="progress-fill bg-gradient-to-r from-orange-500 to-orange-400" style={{width: '70%'}}></div>
          </div>
        </div>
      </div>

      {/* Financial Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Net Profit */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500/50 transition-all">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <TrendingUp className="h-5 w-5 mr-2 text-green-400" />
            Net Kar
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Toplam Gelir:</span>
              <span className="text-green-400 font-bold">{formatCurrency(stats.totalProfit)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Toplam Gider:</span>
              <span className="text-red-400 font-bold">{formatCurrency(stats.totalExpenses)}</span>
            </div>
            <hr className="border-gray-600" />
            <div className="flex justify-between items-center">
              <span className="text-white font-medium">Net Kar:</span>
              <span className={`font-bold text-xl ${stats.netProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(stats.netProfit)}
              </span>
            </div>
          </div>
        </div>

        {/* Receivables */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-yellow-500/50 transition-all">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <CreditCard className="h-5 w-5 mr-2 text-yellow-400" />
            Alacak/Verecek
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Toplam Alacak:</span>
              <span className="text-green-400 font-bold">{formatCurrency(stats.totalAlacak)}</span>
            </div>
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Toplam Verecek:</span>
              <span className="text-red-400 font-bold">{formatCurrency(stats.totalVerecek)}</span>
            </div>
            <hr className="border-gray-600" />
            <div className="flex justify-between items-center">
              <span className="text-white font-medium">Net Durum:</span>
              <span className={`font-bold text-xl ${stats.netReceivable >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(stats.netReceivable)}
              </span>
            </div>
          </div>
        </div>

        {/* Target Progress */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-orange-500/50 transition-all" onClick={() => setActiveTab('targets')}>
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center cursor-pointer">
            <Target className="h-5 w-5 mr-2 text-orange-400" />
            Hedef İlerlemesi
          </h3>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-gray-400">Aktif Hedefler:</span>
              <span className="text-orange-400 font-bold">{stats.activeTargets}</span>
            </div>
            <div className="space-y-2">
              <div className="flex justify-between">
                <span className="text-gray-400">Ortalama İlerleme:</span>
                <span className="text-orange-400 font-bold">{stats.targetProgress.toFixed(1)}%</span>
              </div>
              <div className="w-full bg-gray-700 rounded-full h-3">
                <div 
                  className="bg-gradient-to-r from-orange-500 to-yellow-400 h-3 rounded-full transition-all duration-1000"
                  style={{ width: `${Math.min(100, stats.targetProgress)}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Charts and Analytics */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Sales Trend */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-blue-400" />
            Son 7 Gün Satış Trendi
          </h3>
          <div className="space-y-3">
            {stats.dailySalesTrend.map((day, index) => (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 text-gray-400 mr-2" />
                  <span className="text-white">
                    {new Date(day.date).toLocaleDateString('tr-TR', { weekday: 'short', day: 'numeric', month: 'short' })}
                  </span>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-medium">{formatCurrency(day.revenue)}</div>
                  <div className="text-xs text-gray-400">{day.transactions} işlem</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Top Customers */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Crown className="h-5 w-5 mr-2 text-yellow-400" />
            En Değerli Müşteriler
          </h3>
          <div className="space-y-3">
            {stats.topCustomers.slice(0, 5).map((customer, index) => (
              <div 
                key={customer._id} 
                className="flex items-center justify-between p-3 bg-gray-700 rounded-lg hover:bg-gray-600 transition-colors cursor-pointer"
                onClick={() => setActiveTab('customers')}
              >
                <div className="flex items-center">
                  <div className="flex items-center mr-3">
                    <span className="text-gray-400 text-sm mr-2">#{index + 1}</span>
                    {getCustomerTypeIcon(customer.customerType)}
                  </div>
                  <div>
                    <div className="text-white font-medium">{customer.name}</div>
                    <div className="text-xs text-gray-400">{customer.visitCount} ziyaret</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-medium">{formatCurrency(customer.totalSpent)}</div>
                  <div className="text-xs text-yellow-400">⭐ {customer.loyaltyPoints} puan</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Additional Analytics */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {/* Top Selling Products */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <ShoppingCart className="h-5 w-5 mr-2 text-green-400" />
            En Çok Satan Ürünler
          </h3>
          <div className="space-y-3">
            {stats.topSellingProducts.slice(0, 5).map((product, index) => (
              <div key={product._id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <span className="text-gray-400 text-sm mr-3">#{index + 1}</span>
                  <div>
                    <div className="text-white font-medium">{product.product.name}</div>
                    <div className="text-xs text-gray-400">{product.product.category}</div>
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-blue-400 font-medium">{product.totalSold} adet</div>
                  <div className="text-xs text-green-400">{formatCurrency(product.totalRevenue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Sales by Category */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-purple-400" />
            Kategori Bazlı Satışlar
          </h3>
          <div className="space-y-3">
            {stats.monthlySalesByCategory.slice(0, 5).map((category, index) => (
              <div key={category._id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    index === 0 ? 'bg-blue-400' :
                    index === 1 ? 'bg-green-400' :
                    index === 2 ? 'bg-yellow-400' :
                    index === 3 ? 'bg-purple-400' : 'bg-red-400'
                  }`}></div>
                  <span className="text-white">{category._id}</span>
                </div>
                <div className="text-right">
                  <div className="text-green-400 font-medium">{formatCurrency(category.total)}</div>
                  <div className="text-xs text-gray-400">{category.count} satış</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Customer Segmentation */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Users className="h-5 w-5 mr-2 text-cyan-400" />
            Müşteri Segmentasyonu
          </h3>
          <div className="space-y-3">
            {stats.customerSegmentation.map((segment, index) => (
              <div key={segment._id} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                <div className="flex items-center">
                  <div className={`w-3 h-3 rounded-full mr-3 ${
                    segment._id === 'champion' ? 'bg-yellow-400' :
                    segment._id === 'loyal' ? 'bg-blue-400' :
                    segment._id === 'regular' ? 'bg-green-400' :
                    segment._id === 'at_risk' ? 'bg-orange-400' :
                    segment._id === 'lost' ? 'bg-red-400' : 'bg-gray-400'
                  }`}></div>
                  <span className="text-white capitalize">{segment._id}</span>
                </div>
                <div className="text-right">
                  <div className="text-blue-400 font-medium">{segment.count} müşteri</div>
                  <div className="text-xs text-green-400">{formatCurrency(segment.totalValue)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Low Stock Alert */}
      {stats.lowStockProducts.length > 0 && (
        <div className="bg-red-900/20 border border-red-500/50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-400 mb-4 flex items-center">
            <AlertTriangle className="h-5 w-5 mr-2" />
            Düşük Stok Uyarısı ({stats.lowStockProducts.length} ürün)
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {stats.lowStockProducts.slice(0, 6).map((product) => (
              <div key={product._id} className="bg-red-900/30 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="text-white font-medium">{product.name}</div>
                    <div className="text-xs text-gray-400">{product.category}</div>
                  </div>
                  <div className="text-right">
                    <div className="text-red-400 font-bold">{product.stock}</div>
                    <div className="text-xs text-gray-400">Min: {product.minStock}</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
          {stats.lowStockProducts.length > 6 && (
            <div className="mt-4 text-center">
              <button
                onClick={() => setActiveTab('products')}
                className="text-red-400 hover:text-red-300 text-sm"
              >
                +{stats.lowStockProducts.length - 6} ürün daha...
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Actions */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setActiveTab('transactions')}
          className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-blue-500/50 transition-all text-center group"
        >
          <DollarSign className="h-8 w-8 text-blue-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-white font-medium">Yeni İşlem</span>
        </button>

        <button
          onClick={() => setActiveTab('customers')}
          className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-green-500/50 transition-all text-center group"
        >
          <Users className="h-8 w-8 text-green-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-white font-medium">Müşteri Ekle</span>
        </button>

        <button
          onClick={() => setActiveTab('services')}
          className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-orange-500/50 transition-all text-center group"
        >
          <Wrench className="h-8 w-8 text-orange-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-white font-medium">Yeni Servis</span>
        </button>

        <button
          onClick={() => setActiveTab('products')}
          className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-purple-500/50 transition-all text-center group"
        >
          <Package className="h-8 w-8 text-purple-400 mx-auto mb-2 group-hover:scale-110 transition-transform" />
          <span className="text-white font-medium">Ürün Ekle</span>
        </button>
      </div>
    </div>
  );
}