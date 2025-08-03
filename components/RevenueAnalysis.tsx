'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  TrendingUp, TrendingDown, DollarSign, BarChart3, PieChart,
  Calendar, ArrowUp, ArrowDown, Eye, Filter, Download,
  Target, AlertCircle, CheckCircle, Clock, Zap
} from 'lucide-react';

interface RevenueData {
  transactions: {
    _id: string;
    type: 'gelir' | 'gider' | 'satis';
    amount: number;
    description: string;
    category: string;
    productId?: string;
    productName?: string;
    quantity?: number;
    unitPrice?: number;
    customerName?: string;
    createdAt: string;
    profit?: number;
  }[];
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    netProfit: number;
    profitMargin: number;
    salesRevenue: number;
    otherRevenue: number;
    operatingExpenses: number;
    salesCount: number;
    averageTransaction: number;
    topCategories: {
      category: string;
      revenue: number;
      expense: number;
      profit: number;
      count: number;
    }[];
    dailyBreakdown: {
      date: string;
      revenue: number;
      expenses: number;
      profit: number;
      transactions: number;
    }[];
  };
  period: {
    startDate: string;
    endDate: string;
    days: number;
  };
}

interface RevenueAnalysisProps {
  setActiveTab?: (tab: string) => void;
}

export default function RevenueAnalysis({ setActiveTab }: RevenueAnalysisProps) {
  const [data, setData] = useState<RevenueData | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'year'>('month');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [showTransactions, setShowTransactions] = useState(false);
  const [transactionFilter, setTransactionFilter] = useState<'all' | 'gelir' | 'gider' | 'satis'>('all');

  const fetchRevenueData = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams({
        period: selectedPeriod,
        category: selectedCategory
      });
      const response = await fetch(`/api/reports/revenue?${params}`);
      if (response.ok) {
        const result = await response.json();
        setData(result);
      }
    } catch (error) {
      console.error('Hasılat verileri alınamadı:', error);
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod, selectedCategory]);

  useEffect(() => {
    fetchRevenueData();
  }, [fetchRevenueData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTypeIcon = (type: string) => {
    switch (type) {
      case 'gelir': return <TrendingUp className="h-4 w-4 text-green-400" />;
      case 'gider': return <TrendingDown className="h-4 w-4 text-red-400" />;
      case 'satis': return <DollarSign className="h-4 w-4 text-blue-400" />;
      default: return <div className="h-4 w-4" />;
    }
  };

  const getTypeColor = (type: string) => {
    switch (type) {
      case 'gelir': return 'text-green-400 bg-green-900/20 border-green-500/30';
      case 'gider': return 'text-red-400 bg-red-900/20 border-red-500/30';
      case 'satis': return 'text-blue-400 bg-blue-900/20 border-blue-500/30';
      default: return 'text-gray-400 bg-gray-900/20 border-gray-500/30';
    }
  };

  const filteredTransactions = data?.transactions.filter(t => 
    transactionFilter === 'all' || t.type === transactionFilter
  ) || [];

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-green-500 rounded-full animate-spin"></div>
          <div className="text-lg text-gray-400 animate-pulse">💰 Hasılat analizi yükleniyor...</div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="text-center py-12">
        <AlertCircle className="h-12 w-12 text-red-400 mx-auto mb-4" />
        <p className="text-gray-400">Hasılat verileri yüklenemedi</p>
        <button
          onClick={fetchRevenueData}
          className="mt-4 btn btn-primary"
        >
          Yeniden Dene
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between">
        <div>
          <h1 className="text-4xl font-bold text-white mb-2 bg-gradient-to-r from-green-400 via-blue-400 to-purple-400 bg-clip-text text-transparent">
            💰 Hasılat Analizi
          </h1>
          <p className="text-gray-400 text-lg">Detaylı Gelir-Gider Takibi ve Karlılık Analizi</p>
          <p className="text-xs text-gray-500 mt-1">
            Dönem: {new Date(data.period.startDate).toLocaleDateString('tr-TR')} - {new Date(data.period.endDate).toLocaleDateString('tr-TR')} ({data.period.days} gün)
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 mt-4 lg:mt-0">
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
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              {period.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="stat-card bg-gradient-to-br from-green-900/50 to-green-800/30 border-green-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-green-300">Toplam Gelir</p>
              <p className="text-2xl font-bold text-green-400">{formatCurrency(data.summary.totalRevenue)}</p>
              <div className="flex items-center mt-1">
                <TrendingUp className="h-4 w-4 text-green-400 mr-1" />
                <span className="text-xs text-green-300">
                  Satış: {formatCurrency(data.summary.salesRevenue)}
                </span>
              </div>
            </div>
            <DollarSign className="h-8 w-8 text-green-400" />
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-red-900/50 to-red-800/30 border-red-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-red-300">Toplam Gider</p>
              <p className="text-2xl font-bold text-red-400">{formatCurrency(data.summary.totalExpenses)}</p>
              <div className="flex items-center mt-1">
                <TrendingDown className="h-4 w-4 text-red-400 mr-1" />
                <span className="text-xs text-red-300">
                  İşletme giderleri
                </span>
              </div>
            </div>
            <TrendingDown className="h-8 w-8 text-red-400" />
          </div>
        </div>

        <div className={`stat-card ${data.summary.netProfit >= 0 
          ? 'bg-gradient-to-br from-blue-900/50 to-blue-800/30 border-blue-500/30' 
          : 'bg-gradient-to-br from-red-900/50 to-red-800/30 border-red-500/30'}`}>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-300">Net Kar</p>
              <p className={`text-2xl font-bold ${data.summary.netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                {formatCurrency(data.summary.netProfit)}
              </p>
              <div className="flex items-center mt-1">
                {data.summary.netProfit >= 0 ? (
                  <ArrowUp className="h-4 w-4 text-blue-400 mr-1" />
                ) : (
                  <ArrowDown className="h-4 w-4 text-red-400 mr-1" />
                )}
                <span className={`text-xs ${data.summary.netProfit >= 0 ? 'text-blue-300' : 'text-red-300'}`}>
                  Kar Marjı: %{data.summary.profitMargin.toFixed(1)}
                </span>
              </div>
            </div>
            <Target className={`h-8 w-8 ${data.summary.netProfit >= 0 ? 'text-blue-400' : 'text-red-400'}`} />
          </div>
        </div>

        <div className="stat-card bg-gradient-to-br from-purple-900/50 to-purple-800/30 border-purple-500/30">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-purple-300">Ortalama İşlem</p>
              <p className="text-2xl font-bold text-purple-400">{formatCurrency(data.summary.averageTransaction)}</p>
              <div className="flex items-center mt-1">
                <BarChart3 className="h-4 w-4 text-purple-400 mr-1" />
                <span className="text-xs text-purple-300">
                  {data.summary.salesCount} satış
                </span>
              </div>
            </div>
            <BarChart3 className="h-8 w-8 text-purple-400" />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-blue-400" />
            Kategori Bazlı Analiz
          </h3>
          <div className="space-y-3">
            {data.summary.topCategories.slice(0, 8).map((category, index) => (
              <div key={category.category} className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-start mb-2">
                  <div className="flex items-center">
                    <div className={`w-3 h-3 rounded-full mr-3 ${
                      index === 0 ? 'bg-blue-400' :
                      index === 1 ? 'bg-green-400' :
                      index === 2 ? 'bg-yellow-400' :
                      index === 3 ? 'bg-purple-400' :
                      index === 4 ? 'bg-red-400' :
                      index === 5 ? 'bg-cyan-400' :
                      index === 6 ? 'bg-pink-400' : 'bg-orange-400'
                    }`}></div>
                    <span className="text-white font-medium">{category.category}</span>
                  </div>
                  <span className="text-xs text-gray-400">{category.count} işlem</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-green-400 font-medium">{formatCurrency(category.revenue)}</div>
                    <div className="text-xs text-gray-400">Gelir</div>
                  </div>
                  <div>
                    <div className="text-red-400 font-medium">{formatCurrency(category.expense)}</div>
                    <div className="text-xs text-gray-400">Gider</div>
                  </div>
                  <div>
                    <div className={`font-medium ${category.profit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {formatCurrency(category.profit)}
                    </div>
                    <div className="text-xs text-gray-400">Kar</div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Calendar className="h-5 w-5 mr-2 text-green-400" />
            Günlük Karlılık Trendi
          </h3>
          <div className="space-y-3">
            {data.summary.dailyBreakdown.slice(-7).map((day, index) => (
              <div key={day.date} className="bg-gray-700 rounded-lg p-4">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-white font-medium">
                    {new Date(day.date).toLocaleDateString('tr-TR', { 
                      weekday: 'short', 
                      day: 'numeric', 
                      month: 'short' 
                    })}
                  </span>
                  <span className="text-xs text-gray-400">{day.transactions} işlem</span>
                </div>
                <div className="grid grid-cols-3 gap-2 text-sm">
                  <div>
                    <div className="text-green-400 font-medium">{formatCurrency(day.revenue)}</div>
                    <div className="text-xs text-gray-400">Gelir</div>
                  </div>
                  <div>
                    <div className="text-red-400 font-medium">{formatCurrency(day.expenses)}</div>
                    <div className="text-xs text-gray-400">Gider</div>
                  </div>
                  <div>
                    <div className={`font-medium ${day.profit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                      {formatCurrency(day.profit)}
                    </div>
                    <div className="text-xs text-gray-400">Kar</div>
                  </div>
                </div>
                <div className="mt-2">
                  <div className="w-full bg-gray-600 rounded-full h-2">
                    <div 
                      className={`h-2 rounded-full transition-all duration-1000 ${
                        day.profit >= 0 ? 'bg-gradient-to-r from-green-500 to-blue-500' : 'bg-gradient-to-r from-red-500 to-red-400'
                      }`}
                      style={{ 
                        width: `${Math.min(100, Math.abs(day.profit) / Math.max(...data.summary.dailyBreakdown.map(d => Math.abs(d.profit))) * 100)}%` 
                      }}
                    ></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-gray-800 rounded-lg border border-gray-700">
        <div className="p-6 border-b border-gray-700">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between">
            <h3 className="text-lg font-semibold text-white flex items-center mb-4 lg:mb-0">
              <Eye className="h-5 w-5 mr-2 text-yellow-400" />
              Detaylı İşlem Listesi ({filteredTransactions.length} işlem)
            </h3>
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-gray-400 text-sm">Filtre:</span>
              {[
                { key: 'all', label: 'Tümü', color: 'bg-gray-700' },
                { key: 'gelir', label: 'Gelir', color: 'bg-green-700' },
                { key: 'gider', label: 'Gider', color: 'bg-red-700' },
                { key: 'satis', label: 'Satış', color: 'bg-blue-700' }
              ].map((filter) => (
                <button
                  key={filter.key}
                  onClick={() => setTransactionFilter(filter.key as any)}
                  className={`px-3 py-1 rounded-lg text-sm transition-colors ${
                    transactionFilter === filter.key
                      ? `${filter.color} text-white`
                      : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                  }`}
                >
                  {filter.label}
                </button>
              ))}
              <button
                onClick={() => setShowTransactions(!showTransactions)}
                className="btn btn-secondary btn-sm ml-2"
              >
                {showTransactions ? 'Gizle' : 'Göster'}
              </button>
            </div>
          </div>
        </div>
        
        {showTransactions && (
          <div className="p-6">
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {filteredTransactions.map((transaction) => (
                <div key={transaction._id} className={`p-4 rounded-lg border ${getTypeColor(transaction.type)}`}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-start space-x-3 flex-1">
                      <div className="mt-1">
                        {getTypeIcon(transaction.type)}
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex flex-wrap items-center gap-2 mb-1">
                          <span className="text-white font-medium">
                            {transaction.productName || transaction.description}
                          </span>
                          <span className={`px-2 py-1 rounded text-xs font-medium ${getTypeColor(transaction.type)}`}>
                            {transaction.type.toUpperCase()}
                          </span>
                          <span className="px-2 py-1 bg-gray-700 text-gray-300 rounded text-xs">
                            {transaction.category}
                          </span>
                        </div>
                        <div className="text-sm text-gray-400">
                          {transaction.customerName && (
                            <span className="mr-4">👤 {transaction.customerName}</span>
                          )}
                          {transaction.quantity && (
                            <span className="mr-4">📦 {transaction.quantity} adet</span>
                          )}
                          {transaction.unitPrice && (
                            <span className="mr-4">💵 {formatCurrency(transaction.unitPrice)}/adet</span>
                          )}
                          <span>🕒 {formatDate(transaction.createdAt)}</span>
                        </div>
                      </div>
                    </div>
                    <div className="text-right ml-4">
                      <div className={`text-lg font-bold ${
                        transaction.type === 'gelir' || transaction.type === 'satis' ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {transaction.type === 'gider' ? '-' : '+'}{formatCurrency(Math.abs(transaction.amount))}
                      </div>
                      {transaction.profit !== undefined && (
                        <div className={`text-sm ${transaction.profit >= 0 ? 'text-blue-400' : 'text-red-400'}`}>
                          Kar: {formatCurrency(transaction.profit)}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {filteredTransactions.length === 0 && (
                <div className="text-center py-8 text-gray-400">
                  <AlertCircle className="h-8 w-8 mx-auto mb-2" />
                  <p>Bu filtrede işlem bulunamadı</p>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-center">
        <button
          onClick={() => setActiveTab?.('dashboard')}
          className="btn btn-secondary"
        >
          🏠 Dashboard&apos;a Dön
        </button>
      </div>
    </div>
  );
}