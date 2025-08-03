import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/lib/models/Transaction';
import Product from '@/lib/models/Product';

export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    await dbConnect();

    const { searchParams } = new URL(request.url);
    const days = parseInt(searchParams.get('days') || '30');
    
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);
    startDate.setHours(0, 0, 0, 0);

    const dailyStats = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m-%d', date: '$date' }
          },
          gelir: {
            $sum: {
              $cond: [{ $in: ['$type', ['gelir', 'satis']] }, '$amount', 0]
            }
          },
          gider: {
            $sum: {
              $cond: [{ $eq: ['$type', 'gider'] }, '$amount', 0]
            }
          }
        }
      },
      {
        $addFields: {
          kar: { $subtract: ['$gelir', '$gider'] }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          date: '$_id',
          gelir: 1,
          gider: 1,
          kar: 1,
          _id: 0
        }
      }
    ]);

    const monthlyStats = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            $dateToString: { format: '%Y-%m', date: '$date' }
          },
          gelir: {
            $sum: {
              $cond: [{ $in: ['$type', ['gelir', 'satis']] }, '$amount', 0]
            }
          },
          gider: {
            $sum: {
              $cond: [{ $eq: ['$type', 'gider'] }, '$amount', 0]
            }
          }
        }
      },
      {
        $addFields: {
          kar: { $subtract: ['$gelir', '$gider'] }
        }
      },
      {
        $sort: { _id: 1 }
      },
      {
        $project: {
          month: '$_id',
          gelir: 1,
          gider: 1,
          kar: 1,
          _id: 0
        }
      }
    ]);

    const categoryBreakdown = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: {
            category: '$category',
            type: '$type'
          },
          amount: { $sum: '$amount' }
        }
      },
      {
        $project: {
          category: '$_id.category',
          type: '$_id.type',
          amount: 1,
          _id: 0
        }
      }
    ]);

    const topProducts = await Transaction.aggregate([
      {
        $match: {
          type: 'satis',
          date: { $gte: startDate },
          productId: { $exists: true }
        }
      },
      {
        $group: {
          _id: '$productId',
          sales: { $sum: '$quantity' },
          revenue: { $sum: '$amount' }
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
        $project: {
          name: '$product.name',
          sales: 1,
          revenue: 1,
          _id: 0
        }
      },
      {
        $sort: { sales: -1 }
      },
      {
        $limit: 5
      }
    ]);

    const summary = await Transaction.aggregate([
      {
        $match: {
          date: { $gte: startDate }
        }
      },
      {
        $group: {
          _id: null,
          totalRevenue: {
            $sum: {
              $cond: [{ $in: ['$type', ['gelir', 'satis']] }, '$amount', 0]
            }
          },
          totalExpenses: {
            $sum: {
              $cond: [{ $eq: ['$type', 'gider'] }, '$amount', 0]
            }
          },
          totalSales: {
            $sum: {
              $cond: [{ $eq: ['$type', 'satis'] }, '$quantity', 0]
            }
          }
        }
      },
      {
        $addFields: {
          totalProfit: { $subtract: ['$totalRevenue', '$totalExpenses'] }
        }
      }
    ]);

    // Ürün bazlı karlılık analizi
    const productProfitability = await Transaction.aggregate([
      {
        $match: {
          type: 'satis',
          date: { $gte: startDate },
          productId: { $exists: true }
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
        $addFields: {
          totalCost: { $multiply: ['$totalSold', '$product.buyPrice'] },
          profit: {
            $subtract: [
              '$totalRevenue',
              { $multiply: ['$totalSold', '$product.buyPrice'] }
            ]
          },
          profitPerUnit: {
            $subtract: ['$product.sellPrice', '$product.buyPrice']
          },
          profitMargin: {
            $cond: [
              { $gt: ['$totalRevenue', 0] },
              {
                $multiply: [
                  {
                    $divide: [
                      {
                        $subtract: [
                          '$totalRevenue',
                          { $multiply: ['$totalSold', '$product.buyPrice'] }
                        ]
                      },
                      '$totalRevenue'
                    ]
                  },
                  100
                ]
              },
              0
            ]
          }
        }
      },
      {
        $project: {
          name: '$product.name',
          category: '$product.category',
          totalSold: 1,
          totalRevenue: 1,
          totalCost: 1,
          profit: 1,
          profitPerUnit: 1,
          profitMargin: 1,
          sellPrice: '$product.sellPrice',
          buyPrice: '$product.buyPrice',
          _id: 0
        }
      },
      {
        $sort: { profit: -1 }
      }
    ]);

    const summaryData = summary[0] || {
      totalRevenue: 0,
      totalExpenses: 0,
      totalProfit: 0,
      totalSales: 0
    };

    return NextResponse.json({
      dailyStats,
      monthlyStats,
      categoryBreakdown,
      topProducts,
      productProfitability,
      summary: summaryData
    });
  } catch (error) {
    console.error('Reports GET error:', error);
    return NextResponse.json({ error: 'Rapor verileri alınamadı' }, { status: 500 });
  }
}