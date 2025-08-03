'use client';

import { useState, useEffect } from 'react';
import { 
  Calculator, 
  TrendingUp, 
  Package, 
  DollarSign, 
  BarChart3, 
  PieChart,
  ArrowUp,
  ArrowDown,
  Percent
} from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  category: string;
  stock: number;
  description: string;
  barcode?: string;
}

interface CategoryAnalysis {
  category: string;
  totalProducts: number;
  totalStock: number;
  totalBuyValue: number;
  totalSellValue: number;
  potentialProfit: number;
  profitMargin: number;
}

export default function StockAnalysis() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Ürünler alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  // Toplam hesaplamalar
  const totalBuyValue = products.reduce((sum, product) => sum + (product.buyPrice * product.stock), 0);
  const totalSellValue = products.reduce((sum, product) => sum + (product.sellPrice * product.stock), 0);
  const potentialProfit = totalSellValue - totalBuyValue;
  const profitMargin = totalBuyValue > 0 ? (potentialProfit / totalBuyValue) * 100 : 0;
  const totalProducts = products.length;
  const totalStock = products.reduce((sum, product) => sum + product.stock, 0);

  // Kategori bazında analiz
  const categoryAnalysis: CategoryAnalysis[] = products.reduce((acc, product) => {
    const existingCategory = acc.find(item => item.category === product.category);
    const buyValue = product.buyPrice * product.stock;
    const sellValue = product.sellPrice * product.stock;
    const profit = sellValue - buyValue;
    
    if (existingCategory) {
      existingCategory.totalProducts += 1;
      existingCategory.totalStock += product.stock;
      existingCategory.totalBuyValue += buyValue;
      existingCategory.totalSellValue += sellValue;
      existingCategory.potentialProfit += profit;
      existingCategory.profitMargin = existingCategory.totalBuyValue > 0 
        ? (existingCategory.potentialProfit / existingCategory.totalBuyValue) * 100 
        : 0;
    } else {
      acc.push({
        category: product.category,
        totalProducts: 1,
        totalStock: product.stock,
        totalBuyValue: buyValue,
        totalSellValue: sellValue,
        potentialProfit: profit,
        profitMargin: buyValue > 0 ? (profit / buyValue) * 100 : 0
      });
    }
    
    return acc;
  }, [] as CategoryAnalysis[]);

  // En karlı ve en zararlı ürünler
  const productProfitability = products.map(product => ({
    ...product,
    totalBuyValue: product.buyPrice * product.stock,
    totalSellValue: product.sellPrice * product.stock,
    profit: (product.sellPrice - product.buyPrice) * product.stock,
    profitMargin: product.buyPrice > 0 ? ((product.sellPrice - product.buyPrice) / product.buyPrice) * 100 : 0
  })).sort((a, b) => b.profit - a.profit);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Stok Değer Analizi</h1>
        <p className="text-gray-400">Envanterinizin toplam değeri ve karlılık analizi</p>
      </div>

      {/* Özet Kartları */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Toplam Alış Değeri</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalBuyValue)}</p>
            </div>
            <div className="p-3 bg-red-900/20 rounded-lg">
              <DollarSign className="h-6 w-6 text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Toplam Satış Değeri</p>
              <p className="text-2xl font-bold text-white">{formatCurrency(totalSellValue)}</p>
            </div>
            <div className="p-3 bg-green-900/20 rounded-lg">
              <TrendingUp className="h-6 w-6 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Potansiyel Kar</p>
              <p className={`text-2xl font-bold ${potentialProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(potentialProfit)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${potentialProfit >= 0 ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
              {potentialProfit >= 0 ? 
                <ArrowUp className="h-6 w-6 text-green-400" /> : 
                <ArrowDown className="h-6 w-6 text-red-400" />
              }
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 card-hover">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400 text-sm">Kar Marjı</p>
              <p className={`text-2xl font-bold ${profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                %{profitMargin.toFixed(1)}
              </p>
            </div>
            <div className={`p-3 rounded-lg ${profitMargin >= 0 ? 'bg-green-900/20' : 'bg-red-900/20'}`}>
              <Percent className="h-6 w-6 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Genel Bilgiler */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Package className="h-5 w-5 mr-2 text-blue-400" />
            Envanter Özeti
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Toplam Ürün Çeşidi:</span>
              <span className="text-white font-medium">{totalProducts}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Toplam Stok Adedi:</span>
              <span className="text-white font-medium">{totalStock}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ortalama Alış Fiyatı:</span>
              <span className="text-white font-medium">
                {totalStock > 0 ? formatCurrency(totalBuyValue / totalStock) : '₺0'}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Ortalama Satış Fiyatı:</span>
              <span className="text-white font-medium">
                {totalStock > 0 ? formatCurrency(totalSellValue / totalStock) : '₺0'}
              </span>
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <Calculator className="h-5 w-5 mr-2 text-green-400" />
            Karlılık Analizi
          </h3>
          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-400">Yatırım Tutarı:</span>
              <span className="text-white font-medium">{formatCurrency(totalBuyValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Potansiyel Gelir:</span>
              <span className="text-white font-medium">{formatCurrency(totalSellValue)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">Net Kar:</span>
              <span className={`font-medium ${potentialProfit >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(potentialProfit)}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-400">ROI (Yatırım Getirisi):</span>
              <span className={`font-medium ${profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                %{profitMargin.toFixed(2)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Kategori Analizi */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <PieChart className="h-5 w-5 mr-2 text-purple-400" />
            Kategori Bazında Analiz
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ürün Sayısı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Toplam Stok
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Alış Değeri
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Satış Değeri
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Potansiyel Kar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Kar Marjı
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {categoryAnalysis.map((category) => (
                <tr key={category.category} className="hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-white">
                    {category.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {category.totalProducts}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {category.totalStock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatCurrency(category.totalBuyValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatCurrency(category.totalSellValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={category.potentialProfit >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {formatCurrency(category.potentialProfit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={category.profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}>
                      %{category.profitMargin.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* En Karlı Ürünler */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="p-6 border-b border-gray-700">
          <h3 className="text-lg font-semibold text-white flex items-center">
            <BarChart3 className="h-5 w-5 mr-2 text-yellow-400" />
            Ürün Karlılık Sıralaması
          </h3>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ürün
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Stok
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Alış Değeri
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Satış Değeri
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Kar
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Kar Marjı
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {productProfitability.slice(0, 10).map((product, index) => (
                <tr key={product._id} className="hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold mr-3 ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-400 text-black' :
                        index === 2 ? 'bg-amber-600 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        {index + 1}
                      </div>
                      <div>
                        <div className="text-sm font-medium text-white">{product.name}</div>
                        <div className="text-sm text-gray-400">{product.category}</div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {product.stock}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatCurrency(product.totalBuyValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatCurrency(product.totalSellValue)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={product.profit >= 0 ? 'text-green-400' : 'text-red-400'}>
                      {formatCurrency(product.profit)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={product.profitMargin >= 0 ? 'text-green-400' : 'text-red-400'}>
                      %{product.profitMargin.toFixed(1)}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Boş Ürün Uyarısı */}
      {products.length === 0 && (
        <div className="text-center py-12 bg-gray-800 rounded-lg border border-gray-700">
          <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">Henüz ürün eklenmemiş</p>
          <p className="text-gray-500 text-sm">Analiz için önce ürün ekleyin</p>
        </div>
      )}
    </div>
  );
}