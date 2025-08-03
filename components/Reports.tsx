'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from 'recharts';
import { Calendar, TrendingUp, TrendingDown, DollarSign } from 'lucide-react';

interface ReportData {
  dailyStats: Array<{
    date: string;
    gelir: number;
    gider: number;
    kar: number;
  }>;
  monthlyStats: Array<{
    month: string;
    gelir: number;
    gider: number;
    kar: number;
  }>;
  categoryBreakdown: Array<{
    category: string;
    amount: number;
    type: string;
  }>;
  topProducts: Array<{
    name: string;
    sales: number;
    revenue: number;
  }>;
  productProfitability: Array<{
    name: string;
    category: string;
    totalSold: number;
    totalRevenue: number;
    totalCost: number;
    profit: number;
    profitPerUnit: number;
    profitMargin: number;
    sellPrice: number;
    buyPrice: number;
  }>;
  summary: {
    totalRevenue: number;
    totalExpenses: number;
    totalProfit: number;
    totalSales: number;
  };
}

export default function Reports() {
  const [reportData, setReportData] = useState<ReportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [dateRange, setDateRange] = useState('30');

  const COLORS = ['#3B82F6', '#10B981', '#F59E0B', '#EF4444', '#8B5CF6', '#06B6D4'];

  const fetchReportData = useCallback(async () => {
    try {
      const response = await fetch(`/api/reports?days=${dateRange}`);
      if (response.ok) {
        const data = await response.json();
        setReportData(data);
      }
    } catch (error) {
      console.error('Rapor verileri alınamadı:', error);
    } finally {
      setLoading(false);
    }
  }, [dateRange]);

  useEffect(() => {
    fetchReportData();
  }, [fetchReportData]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-400">Rapor hazırlanıyor...</div>
      </div>
    );
  }

  if (!reportData) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-400">Rapor verileri yüklenemedi</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Raporlar</h1>
          <p className="text-gray-400">İşletmenizin detaylı analizini görüntüleyin</p>
        </div>
        
        <div className="flex items-center space-x-4">
          <label className="text-gray-400">Zaman Aralığı:</label>
          <select
            value={dateRange}
            onChange={(e) => setDateRange(e.target.value)}
            className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white transition-all duration-300 hover:border-blue-500 focus:border-blue-500 focus:ring-2 focus:ring-blue-500/50"
          >
            <option value="7">Son 7 Gün</option>
            <option value="30">Son 30 Gün</option>
            <option value="90">Son 3 Ay</option>
            <option value="365">Son 1 Yıl</option>
          </select>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="group bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/25 cursor-pointer card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Toplam Gelir</p>
              <p className="text-2xl font-bold text-green-400 group-hover:text-green-300 transition-all duration-300">
                {formatCurrency(reportData.summary.totalRevenue)}
              </p>
            </div>
            <div className="transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
              <TrendingUp className="h-8 w-8 text-green-400 drop-shadow-lg" />
            </div>
          </div>
        </div>

        <div className="group bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-red-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/25 cursor-pointer card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Toplam Gider</p>
              <p className="text-2xl font-bold text-red-400 group-hover:text-red-300 transition-all duration-300">
                {formatCurrency(reportData.summary.totalExpenses)}
              </p>
            </div>
            <div className="transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
              <TrendingDown className="h-8 w-8 text-red-400 drop-shadow-lg" />
            </div>
          </div>
        </div>

        <div className="group bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-emerald-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-emerald-500/25 cursor-pointer card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Net Kar</p>
              <p className={`text-2xl font-bold transition-all duration-300 ${reportData.summary.totalProfit >= 0 ? 'text-green-400 group-hover:text-green-300' : 'text-red-400 group-hover:text-red-300'}`}>
                {formatCurrency(reportData.summary.totalProfit)}
              </p>
            </div>
            <div className="transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
              <DollarSign className="h-8 w-8 text-blue-400 drop-shadow-lg" />
            </div>
          </div>
        </div>

        <div className="group bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25 cursor-pointer card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400 group-hover:text-gray-300 transition-colors duration-300">Toplam Satış</p>
              <p className="text-2xl font-bold text-blue-400 group-hover:text-blue-300 transition-all duration-300">
                {reportData.summary.totalSales} adet
              </p>
            </div>
            <div className="transform group-hover:scale-110 group-hover:rotate-12 transition-all duration-300">
              <Calendar className="h-8 w-8 text-blue-400 drop-shadow-lg" />
            </div>
          </div>
        </div>
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Trend Chart */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 card-hover animate-slideInUp">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-3 animate-pulse"></div>
            Günlük Trend
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <LineChart data={reportData.dailyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="date" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `₺${value.toLocaleString()}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#FFFFFF'
                }}
                formatter={(value: any) => [formatCurrency(Number(value)), '']}
              />
              <Line type="monotone" dataKey="gelir" stroke="#10B981" strokeWidth={2} name="Gelir" />
              <Line type="monotone" dataKey="gider" stroke="#EF4444" strokeWidth={2} name="Gider" />
              <Line type="monotone" dataKey="kar" stroke="#3B82F6" strokeWidth={2} name="Kar" />
            </LineChart>
          </ResponsiveContainer>
        </div>

        {/* Category Breakdown */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 card-hover animate-slideInUp">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></div>
            Kategori Dağılımı
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={reportData.categoryBreakdown}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="amount"
              >
                {reportData.categoryBreakdown.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#FFFFFF'
                }}
                formatter={(value: any) => [formatCurrency(Number(value)), 'Tutar']}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Monthly Comparison */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 card-hover animate-slideInUp">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <div className="w-2 h-2 bg-purple-400 rounded-full mr-3 animate-pulse"></div>
            Aylık Karşılaştırma
          </h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={reportData.monthlyStats}>
              <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <XAxis 
                dataKey="month" 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <YAxis 
                stroke="#9CA3AF"
                fontSize={12}
                tickFormatter={(value) => `₺${value.toLocaleString()}`}
              />
              <Tooltip 
                contentStyle={{ 
                  backgroundColor: '#1F2937', 
                  border: '1px solid #374151',
                  borderRadius: '8px',
                  color: '#FFFFFF'
                }}
                formatter={(value: any) => [formatCurrency(Number(value)), '']}
              />
              <Bar dataKey="gelir" fill="#10B981" name="Gelir" />
              <Bar dataKey="gider" fill="#EF4444" name="Gider" />
              <Bar dataKey="kar" fill="#3B82F6" name="Kar" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Top Products */}
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 card-hover animate-slideInUp">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <div className="w-2 h-2 bg-yellow-400 rounded-full mr-3 animate-pulse"></div>
            En Çok Satan Ürünler
          </h3>
          <div className="space-y-4">
            {reportData.topProducts.length > 0 ? (
              reportData.topProducts.map((product, index) => (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-700/50 rounded-lg hover:bg-gray-700 transition-all duration-300 hover:shadow-lg hover:shadow-blue-500/20 cursor-pointer">
                  <div>
                    <div className="font-medium text-white">{product.name}</div>
                    <div className="text-sm text-gray-400">{product.sales} adet satış</div>
                  </div>
                  <div className="text-right">
                    <div className="font-medium text-green-400">
                      {formatCurrency(product.revenue)}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8">
                <div className="text-gray-400">Henüz satış verisi yok</div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Detailed Table */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white">Detaylı Günlük Rapor</h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Gelir
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Gider
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Net Kar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Kar Marjı
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {reportData.dailyStats.map((day, index) => {
                const profitMargin = day.gelir > 0 ? ((day.kar / day.gelir) * 100) : 0;
                return (
                  <tr key={index} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {new Date(day.date).toLocaleDateString('tr-TR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">
                      {formatCurrency(day.gelir)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400">
                      {formatCurrency(day.gider)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${day.kar >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        {formatCurrency(day.kar)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        %{profitMargin.toFixed(1)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Kar/Zarar Analizi */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <div className="w-2 h-2 bg-green-400 rounded-full mr-3 animate-pulse"></div>
            📊 Ürün Bazlı Kar/Zarar Analizi
          </h3>
          <p className="text-gray-400 text-sm mt-2">Hangi ürünlerden ne kadar kazandığınızı görün</p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ürün
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Satılan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Alış/Satış
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Toplam Maliyet
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Toplam Hasılat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Net Kar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Birim Kar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Kar Marjı
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {reportData.productProfitability.length > 0 ? (
                reportData.productProfitability.map((product, index) => (
                  <tr key={index} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-white">{product.name}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {product.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <span className="bg-blue-900 text-blue-400 px-2 py-1 rounded-full text-xs">
                        {product.totalSold} adet
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="space-y-1">
                        <div>{formatCurrency(product.buyPrice)}</div>
                        <div className="text-green-400">{formatCurrency(product.sellPrice)}</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-red-400">
                      {formatCurrency(product.totalCost)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-green-400">
                      {formatCurrency(product.totalRevenue)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        product.profit >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(product.profit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <span className={`font-medium ${
                        product.profitPerUnit >= 0 ? 'text-green-400' : 'text-red-400'
                      }`}>
                        {formatCurrency(product.profitPerUnit)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <div className="flex items-center space-x-2">
                        <span className={`font-medium ${
                          product.profitMargin >= 0 ? 'text-green-400' : 'text-red-400'
                        }`}>
                          %{product.profitMargin.toFixed(1)}
                        </span>
                        <div className="w-16 h-2 bg-gray-600 rounded-full overflow-hidden">
                          <div 
                            className={`h-full rounded-full transition-all duration-500 ${
                              product.profitMargin >= 0 ? 'bg-green-500' : 'bg-red-500'
                            }`}
                            style={{ width: `${Math.min(100, Math.abs(product.profitMargin))}%` }}
                          ></div>
                        </div>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={9} className="px-6 py-12 text-center">
                    <div className="text-gray-400">
                      <div className="text-lg mb-2">📊</div>
                      <div>Henüz satış verisi bulunmuyor</div>
                      <div className="text-sm mt-1">Satış yaptıktan sonra kar/zarar analizi burada görünecek</div>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Özetler */}
        {reportData.productProfitability.length > 0 && (
          <div className="p-6 border-t border-gray-700 bg-gray-900/50">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="text-center">
                <div className="text-sm text-gray-400">En Karlı Ürün</div>
                <div className="text-lg font-bold text-green-400">
                  {reportData.productProfitability[0]?.name || '-'}
                </div>
                <div className="text-sm text-gray-300">
                  {reportData.productProfitability[0] ? formatCurrency(reportData.productProfitability[0].profit) : '-'}
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-400">En Yüksek Marjlı</div>
                <div className="text-lg font-bold text-blue-400">
                  {reportData.productProfitability.reduce((max, product) => 
                    product.profitMargin > max.profitMargin ? product : max, 
                    reportData.productProfitability[0] || { profitMargin: 0, name: '-' }
                  )?.name || '-'}
                </div>
                <div className="text-sm text-gray-300">
                  {reportData.productProfitability.length > 0 ? 
                    `%${Math.max(...reportData.productProfitability.map(p => p.profitMargin)).toFixed(1)}` : '-'
                  }
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-400">En Çok Satan</div>
                <div className="text-lg font-bold text-purple-400">
                  {reportData.productProfitability.reduce((max, product) => 
                    product.totalSold > max.totalSold ? product : max, 
                    reportData.productProfitability[0] || { totalSold: 0, name: '-' }
                  )?.name || '-'}
                </div>
                <div className="text-sm text-gray-300">
                  {reportData.productProfitability.length > 0 ? 
                    `${Math.max(...reportData.productProfitability.map(p => p.totalSold))} adet` : '-'
                  }
                </div>
              </div>
              
              <div className="text-center">
                <div className="text-sm text-gray-400">Toplam Ürün Karlılığı</div>
                <div className="text-lg font-bold text-green-400">
                  {formatCurrency(reportData.productProfitability.reduce((sum, product) => sum + product.profit, 0))}
                </div>
                <div className="text-sm text-gray-300">
                  Ortalama Marj: %{reportData.productProfitability.length > 0 ? 
                    (reportData.productProfitability.reduce((sum, product) => sum + product.profitMargin, 0) / reportData.productProfitability.length).toFixed(1) 
                    : '0'
                  }
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}