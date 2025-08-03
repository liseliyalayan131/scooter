import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();
    
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    const { searchParams } = new URL(request.url);
    const period = searchParams.get('period') || 'month';
    const category = searchParams.get('category') || 'all';
    
    const today = new Date();
    let startDate: Date;
    let endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59);
    
    switch (period) {
      case 'today':
        startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
        break;
      case 'week':
        startDate = new Date(today);
        startDate.setDate(today.getDate() - today.getDay());
        startDate.setHours(0, 0, 0, 0);
        break;
      case 'month':
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
        break;
      case 'year':
        startDate = new Date(today.getFullYear(), 0, 1);
        break;
      default:
        startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    }
    
    console.log(`📊 Hasılat analizi: ${period} (${startDate.toISOString()} - ${endDate.toISOString()})`);
    
    const matchFilter: any = {
      createdAt: { $gte: startDate, $lte: endDate }
    };
    
    if (category !== 'all') {
      matchFilter.category = category;
    }
    
    const [transactions, categoryStats, dailyBreakdown] = await Promise.all([
      db.collection('transactions').aggregate([
        { $match: matchFilter },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $lookup: {
            from: 'customers',
            localField: 'customerId',
            foreignField: '_id',
            as: 'customer'
          }
        },
        {
          $addFields: {
            productName: { $arrayElemAt: ['$product.name', 0] },
            customerName: {
              $concat: [
                { $arrayElemAt: ['$customer.firstName', 0] },
                ' ',
                { $arrayElemAt: ['$customer.lastName', 0] }
              ]
            },
            profit: {
              $cond: {
                if: { $eq: ['$type', 'satis'] },
                then: {
                  $subtract: [
                    '$amount',
                    { $multiply: [{ $ifNull: ['$quantity', 1] }, { $arrayElemAt: ['$product.costPrice', 0] }] }
                  ]
                },
                else: {
                  $cond: {
                    if: { $eq: ['$type', 'gelir'] },
                    then: '$amount',
                    else: { $multiply: ['$amount', -1] }
                  }
                }
              }
            }
          }
        },
        { $sort: { createdAt: -1 } },
        { $limit: 1000 }
      ]).toArray(),
      
      db.collection('transactions').aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: '$category',
            revenue: {
              $sum: {
                $cond: [
                  { $in: ['$type', ['gelir', 'satis']] },
                  '$amount',
                  0
                ]
              }
            },
            expense: {
              $sum: {
                $cond: [
                  { $eq: ['$type', 'gider'] },
                  '$amount',
                  0
                ]
              }
            },
            count: { $sum: 1 }
          }
        },
        {
          $addFields: {
            profit: { $subtract: ['$revenue', '$expense'] }
          }
        },
        { $sort: { revenue: -1 } }
      ]).toArray(),
      
      db.collection('transactions').aggregate([
        { $match: matchFilter },
        {
          $group: {
            _id: {
              $dateToString: {
                format: '%Y-%m-%d',
                date: '$createdAt'
              }
            },
            revenue: {
              $sum: {
                $cond: [
                  { $in: ['$type', ['gelir', 'satis']] },
                  '$amount',
                  0
                ]
              }
            },
            expenses: {
              $sum: {
                $cond: [
                  { $eq: ['$type', 'gider'] },
                  '$amount',
                  0
                ]
              }
            },
            transactions: { $sum: 1 }
          }
        },
        {
          $addFields: {
            profit: { $subtract: ['$revenue', '$expenses'] }
          }
        },
        { $sort: { _id: 1 } }
      ]).toArray()
    ]);
    
    const totalRevenue = (transactions as any[])
      .filter((t: any) => t.type === 'gelir' || t.type === 'satis')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    
    const salesRevenue = (transactions as any[])
      .filter((t: any) => t.type === 'satis')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    
    const otherRevenue = (transactions as any[])
      .filter((t: any) => t.type === 'gelir')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    
    const totalExpenses = (transactions as any[])
      .filter((t: any) => t.type === 'gider')
      .reduce((sum: number, t: any) => sum + t.amount, 0);
    
    const netProfit = totalRevenue - totalExpenses;
    const profitMargin = totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0;
    
    const salesCount = (transactions as any[]).filter((t: any) => t.type === 'satis').length;
    const averageTransaction = salesCount > 0 ? salesRevenue / salesCount : 0;
    
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    const response = {
      transactions: (transactions as any[]).map((t: any) => ({
        _id: t._id,
        type: t.type,
        amount: t.amount,
        description: t.description || '',
        category: t.category || 'Genel',
        productId: t.productId,
        productName: t.productName || '',
        quantity: t.quantity,
        unitPrice: t.unitPrice,
        customerName: t.customerName && t.customerName !== ' ' ? t.customerName : '',
        createdAt: t.createdAt,
        profit: t.profit || 0
      })),
      summary: {
        totalRevenue,
        totalExpenses,
        netProfit,
        profitMargin,
        salesRevenue,
        otherRevenue,
        operatingExpenses: totalExpenses,
        salesCount,
        averageTransaction,
        topCategories: (categoryStats as any[]).map((cat: any) => ({
          category: cat._id || 'Belirtilmemiş',
          revenue: cat.revenue,
          expense: cat.expense,
          profit: cat.profit,
          count: cat.count
        })),
        dailyBreakdown: (dailyBreakdown as any[]).map((day: any) => ({
          date: day._id,
          revenue: day.revenue,
          expenses: day.expenses,
          profit: day.profit,
          transactions: day.transactions
        }))
      },
      period: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        days
      }
    };
    
    console.log(`✅ Hasılat analizi tamamlandı: ${transactions.length} işlem analiz edildi`);
    
    return NextResponse.json(response);
  } catch (error) {
    console.error('❌ Revenue analysis error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Hasılat analizi yapılamadı: ' + errorMessage }, { status: 500 });
  }
}