import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';


interface TransactionGroup {
  _id: string;
  total: number;
  count: number;
}

interface ServiceGroup {
  _id: string;
  count: number;
  totalRevenue: number;
}

interface ReceivableGroup {
  _id: string;
  total: number;
  unpaid: number;
  count: number;
}

interface Target {
  _id: any;
  targetAmount: number;
  currentAmount: number;
  status: string;
}

interface Product {
  _id: any;
  name: string;
  stock: number;
  minStock: number;
  category: string;
  price?: number;
}

interface Customer {
  _id: any;
  firstName: string;
  lastName: string;
  totalSpent: number;
  visitCount: number;
  customerType: string;
  loyaltyPoints: number;
}

export async function GET() {
  try {
    await dbConnect();
    
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    

    const today = new Date();
    const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    const startOfYear = new Date(today.getFullYear(), 0, 1);
    
    console.log('📊 Dashboard istatistikleri hesaplanıyor...');
    

    const [
      todayTransactions,
      weeklyTransactions,
      monthlyTransactions,
      yearlyTransactions,
      allTransactions,
      products,
      customers,
      services,
      receivables,
      targets
    ] = await Promise.all([

      db.collection('transactions').aggregate([
        {
          $match: {
            createdAt: { $gte: startOfToday },
            type: { $in: ['gelir', 'satis'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]).toArray(),
      

      db.collection('transactions').aggregate([
        {
          $match: {
            createdAt: { $gte: startOfWeek },
            type: { $in: ['gelir', 'satis'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]).toArray(),
      

      db.collection('transactions').aggregate([
        {
          $match: {
            createdAt: { $gte: startOfMonth },
            type: { $in: ['gelir', 'satis'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]).toArray(),
      

      db.collection('transactions').aggregate([
        {
          $match: {
            createdAt: { $gte: startOfYear },
            type: { $in: ['gelir', 'satis'] }
          }
        },
        {
          $group: {
            _id: null,
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]).toArray(),
      

      db.collection('transactions').aggregate([
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        }
      ]).toArray(),
      

      db.collection('products').aggregate([
        {
          $group: {
            _id: null,
            totalProducts: { $sum: 1 },
            totalStock: { $sum: '$stock' },
            lowStockCount: {
              $sum: {
                $cond: [
                  { $lte: ['$stock', '$minStock'] },
                  1,
                  0
                ]
              }
            },
            outOfStockCount: {
              $sum: {
                $cond: [
                  { $eq: ['$stock', 0] },
                  1,
                  0
                ]
              }
            }
          }
        }
      ]).toArray(),
      

      db.collection('customers').aggregate([
        {
          $group: {
            _id: null,
            totalCustomers: { $sum: 1 },
            vipCustomers: {
              $sum: {
                $cond: [
                  { $in: ['$customerType', ['vip', 'premium', 'gold']] },
                  1,
                  0
                ]
              }
            },
            totalLoyaltyPoints: { $sum: '$loyaltyPoints' },
            averageSpent: { $avg: '$totalSpent' },
            totalCustomerValue: { $sum: '$totalSpent' }
          }
        }
      ]).toArray(),
      

      db.collection('services').aggregate([
        {
          $group: {
            _id: '$status',
            count: { $sum: 1 },
            totalRevenue: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'tamamlandi'] },
                  '$cost',
                  0
                ]
              }
            }
          }
        }
      ]).toArray(),
      

      db.collection('receivables').aggregate([
        {
          $group: {
            _id: '$type',
            total: { $sum: '$amount' },
            unpaid: {
              $sum: {
                $cond: [
                  { $eq: ['$status', 'odenmedi'] },
                  '$amount',
                  0
                ]
              }
            },
            count: { $sum: 1 }
          }
        }
      ]).toArray(),
      

      db.collection('targets').find({ status: 'active' }).toArray()
    ]);
    

    const lowStockProducts = await db.collection('products').find({
      $expr: { $lte: ['$stock', '$minStock'] }
    }).sort({ stock: 1 }).limit(10).toArray();
    

    const topSellingProducts = await db.collection('transactions').aggregate([
      {
        $match: {
          type: 'satis',
          productId: { $exists: true, $ne: null },
          createdAt: { $gte: startOfMonth }
        }
      },
      {
        $group: {
          _id: '$productId',
          totalSold: { $sum: '$quantity' },
          totalRevenue: { $sum: '$amount' }
        }
      },
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      {
        $unwind: '$product'
      },
      {
        $sort: { totalSold: -1 }
      },
      {
        $limit: 5
      }
    ]).toArray();
    

    const topCustomers = await db.collection('customers').find({})
      .sort({ totalSpent: -1 })
      .limit(5)
      .toArray();
    

    const last7Days = Array.from({ length: 7 }, (_, i) => {
      const date = new Date();
      date.setDate(date.getDate() - i);
      return new Date(date.getFullYear(), date.getMonth(), date.getDate());
    }).reverse();
    
    const dailySalesTrend = await Promise.all(
      last7Days.map(async (date) => {
        const nextDay = new Date(date);
        nextDay.setDate(nextDay.getDate() + 1);
        
        const result = await db.collection('transactions').aggregate([
          {
            $match: {
              type: { $in: ['gelir', 'satis'] },
              createdAt: { $gte: date, $lt: nextDay }
            }
          },
          {
            $group: {
              _id: null,
              total: { $sum: '$amount' },
              count: { $sum: 1 }
            }
          }
        ]).toArray();
        
        return {
          date: date.toISOString().split('T')[0],
          revenue: result[0]?.total || 0,
          transactions: result[0]?.count || 0
        };
      })
    );
    

    const customerSegmentation = await db.collection('customers').aggregate([
      {
        $group: {
          _id: '$segment',
          count: { $sum: 1 },
          totalValue: { $sum: '$totalSpent' }
        }
      }
    ]).toArray();
    

    const todayRevenue = todayTransactions[0]?.total || 0;
    const weeklyRevenue = weeklyTransactions[0]?.total || 0;
    const monthlyRevenue = monthlyTransactions[0]?.total || 0;
    const yearlyRevenue = yearlyTransactions[0]?.total || 0;
    
    const totalProfit = allTransactions
      .filter((t: TransactionGroup) => t._id === 'gelir' || t._id === 'satis')
      .reduce((sum: number, t: TransactionGroup) => sum + t.total, 0);
    
    const totalExpenses = allTransactions
      .filter((t: TransactionGroup) => t._id === 'gider')
      .reduce((sum: number, t: TransactionGroup) => sum + t.total, 0);
    
    const serviceRevenue = services
      .filter((s: ServiceGroup) => s._id === 'tamamlandi')
      .reduce((sum: number, s: ServiceGroup) => sum + s.totalRevenue, 0);
    
    const totalProducts = products[0]?.totalProducts || 0;
    const totalCustomers = customers[0]?.totalCustomers || 0;
    const vipCustomers = customers[0]?.vipCustomers || 0;
    
    const totalAlacak = receivables
      .filter((r: ReceivableGroup) => r._id === 'alacak')
      .reduce((sum: number, r: ReceivableGroup) => sum + r.unpaid, 0);
    
    const totalVerecek = receivables
      .filter((r: ReceivableGroup) => r._id === 'verecek')
      .reduce((sum: number, r: ReceivableGroup) => sum + r.unpaid, 0);
    

    const activeTargets = targets.length;
    const targetProgress = targets.length > 0 
      ? targets.reduce((sum: number, target: Target) => {
          const progress = target.targetAmount > 0 
            ? (target.currentAmount / target.targetAmount) * 100 
            : 0;
          return sum + progress;
        }, 0) / targets.length
      : 0;
    
    const dashboardStats = {

      todayRevenue,
      weeklyRevenue,
      monthlyRevenue,
      yearlyRevenue,
      totalProfit,
      totalExpenses,
      netProfit: totalProfit - totalExpenses,
      serviceRevenue,
      

      totalProducts,
      lowStockProducts: lowStockProducts.map((p: Product) => ({
        _id: p._id,
        name: p.name,
        stock: p.stock,
        minStock: p.minStock,
        category: p.category
      })),
      outOfStockCount: products[0]?.outOfStockCount || 0,
      

      totalCustomers,
      vipCustomers,
      averageCustomerValue: customers[0]?.averageSpent || 0,
      totalCustomerValue: customers[0]?.totalCustomerValue || 0,
      

      totalAlacak,
      totalVerecek,
      netReceivable: totalAlacak - totalVerecek,
      

      activeTargets,
      targetProgress,
      

      topSellingProducts,
      topCustomers: topCustomers.map((c: Customer) => ({
        _id: c._id,
        name: `${c.firstName} ${c.lastName}`,
        totalSpent: c.totalSpent,
        visitCount: c.visitCount,
        customerType: c.customerType,
        loyaltyPoints: c.loyaltyPoints
      })),
      dailySalesTrend,
      customerSegmentation,
      

      monthlySalesByCategory: await db.collection('transactions').aggregate([
        {
          $match: {
            type: 'satis',
            createdAt: { $gte: startOfMonth }
          }
        },
        {
          $group: {
            _id: '$category',
            total: { $sum: '$amount' },
            count: { $sum: 1 }
          }
        },
        {
          $sort: { total: -1 }
        }
      ]).toArray(),
      

      serviceStatus: services.reduce((acc: { [key: string]: number }, s: ServiceGroup) => {
        acc[s._id] = s.count;
        return acc;
      }, {}),
      

      lastUpdated: new Date().toISOString()
    };
    
    console.log('✅ Dashboard istatistikleri başarıyla hesaplandı');
    
    return NextResponse.json(dashboardStats);
  } catch (error) {
    console.error('❌ Dashboard stats error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Dashboard verileri alınamadı: ' + errorMessage }, { status: 500 });
  }
}