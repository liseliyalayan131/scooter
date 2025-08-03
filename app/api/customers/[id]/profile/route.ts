import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

// Tip tanımları
interface Customer {
  _id: any;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  fullAddress?: string;
  customerType?: string;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
  lastVisit?: string;
  lastPurchaseDate?: string;
  createdAt: Date;
}

interface Transaction {
  _id?: any;
  type: 'gelir' | 'gider' | 'satis';
  amount: number;
  description: string;
  category: string;
  productId?: any;
  quantity: number;
  customerId?: any;
  customerName?: string;
  customerSurname?: string;
  customerPhone?: string;
  isRegisteredCustomer: boolean;
  discount: number;
  discountType: 'tutar' | 'yuzde';
  originalAmount: number;
  paymentType: 'cash' | 'credit' | 'installment';
  serviceId?: any;
  createdAt: Date;
  updatedAt: Date;
}

interface Service {
  _id?: any;
  customerId?: any;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerEmail: string;
  isRegisteredCustomer: boolean;
  scooterBrand: string;
  scooterModel: string;
  serialNumber: string;
  problem: string;
  solution: string;
  cost: number;
  laborCost: number;
  partsCost: number;
  status: 'beklemede' | 'devam-ediyor' | 'tamamlandi' | 'iptal';
  receivedDate: Date;
  completedDate?: Date;
  notes: string;
  warrantyDays: number;
  customerRating?: number;
  customerFeedback: string;
  createdAt: Date;
  updatedAt: Date;
}

interface Receivable {
  _id?: any;
  customerId?: any;
  phone?: string;
  amount: number;
  description: string;
  type: 'alacak' | 'verecek';
  status: 'odendi' | 'odenmedi';
  createdAt: Date;
  dueDate?: Date;
}

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    const customerId = new mongoose.Types.ObjectId(params.id);
    
    console.log('📋 Müşteri profili getiriliyor:', params.id);
    
    // Müşteri bilgilerini al
    const customer = await db.collection('customers').findOne({ _id: customerId });
    
    if (!customer) {
      return NextResponse.json({ error: 'Müşteri bulunamadı' }, { status: 404 });
    }
    
    // Paralel işlemlerle tüm verileri al
    const [
      transactions,
      services,
      receivables,
      purchaseHistory,
      serviceHistory,
      monthlySpending,
      favoriteProducts,
      loyaltyHistory
    ] = await Promise.all([
      // Müşteri işlemleri
      db.collection('transactions').find({
        $or: [
          { customerId: customerId },
          { customerPhone: customer.phone }
        ]
      }).sort({ createdAt: -1 }).toArray(),
      
      // Müşteri servisleri
      db.collection('services').find({
        $or: [
          { customerId: customerId },
          { customerPhone: customer.phone }
        ]
      }).sort({ receivedDate: -1 }).toArray(),
      
      // Müşteri alacak/verecek kayıtları
      db.collection('receivables').find({
        $or: [
          { customerId: customerId },
          { phone: customer.phone }
        ]
      }).sort({ createdAt: -1 }).toArray(),
      
      // Satın alma geçmişi (ürün bazlı)
      db.collection('transactions').aggregate([
        {
          $match: {
            $or: [
              { customerId: customerId },
              { customerPhone: customer.phone }
            ],
            type: 'satis',
            productId: { $exists: true, $ne: null }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: '$product'
        },
        {
          $group: {
            _id: '$productId',
            productName: { $first: '$product.name' },
            category: { $first: '$product.category' },
            totalQuantity: { $sum: '$quantity' },
            totalSpent: { $sum: '$amount' },
            lastPurchase: { $max: '$createdAt' },
            averagePrice: { $avg: '$amount' }
          }
        },
        {
          $sort: { totalSpent: -1 }
        }
      ]).toArray(),
      
      // Servis geçmişi (detaylı)
      db.collection('services').aggregate([
        {
          $match: {
            $or: [
              { customerId: customerId },
              { customerPhone: customer.phone }
            ]
          }
        },
        {
          $group: {
            _id: '$scooterBrand',
            serviceCount: { $sum: 1 },
            totalCost: { $sum: '$cost' },
            lastService: { $max: '$receivedDate' },
            completedServices: {
              $sum: {
                $cond: [{ $eq: ['$status', 'tamamlandi'] }, 1, 0]
              }
            },
            averageRating: { $avg: '$customerRating' }
          }
        },
        {
          $sort: { serviceCount: -1 }
        }
      ]).toArray(),
      
      // Aylık harcama trendi (son 12 ay)
      db.collection('transactions').aggregate([
        {
          $match: {
            $or: [
              { customerId: customerId },
              { customerPhone: customer.phone }
            ],
            type: 'satis',
            createdAt: {
              $gte: new Date(new Date().setFullYear(new Date().getFullYear() - 1))
            }
          }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            totalSpent: { $sum: '$amount' },
            transactionCount: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]).toArray(),
      
      // En sevdiği ürünler
      db.collection('transactions').aggregate([
        {
          $match: {
            $or: [
              { customerId: customerId },
              { customerPhone: customer.phone }
            ],
            type: 'satis',
            productId: { $exists: true, $ne: null }
          }
        },
        {
          $lookup: {
            from: 'products',
            localField: 'productId',
            foreignField: '_id',
            as: 'product'
          }
        },
        {
          $unwind: '$product'
        },
        {
          $group: {
            _id: '$product.category',
            totalSpent: { $sum: '$amount' },
            itemCount: { $sum: '$quantity' },
            lastPurchase: { $max: '$createdAt' }
          }
        },
        {
          $sort: { totalSpent: -1 }
        }
      ]).toArray(),
      
      // Sadakat puanı geçmişi (tahmini - gerçek sistemde ayrı koleksiyon olabilir)
      db.collection('transactions').aggregate([
        {
          $match: {
            $or: [
              { customerId: customerId },
              { customerPhone: customer.phone }
            ],
            type: 'satis'
          }
        },
        {
          $sort: { createdAt: 1 }
        },
        {
          $group: {
            _id: {
              year: { $year: '$createdAt' },
              month: { $month: '$createdAt' }
            },
            pointsEarned: { $sum: { $floor: { $divide: ['$amount', 10] } } },
            transactions: { $sum: 1 }
          }
        },
        {
          $sort: { '_id.year': 1, '_id.month': 1 }
        }
      ]).toArray()
    ]);
    
    // İstatistikleri hesapla
    const totalTransactions = transactions.length;
    const totalPurchases = transactions.filter((t: Transaction) => t.type === 'satis').length;
    const totalServicesCount = services.length;
    const completedServices = services.filter((s: Service) => s.status === 'tamamlandi').length;
    const averageServiceRating = services
      .filter((s: Service) => s.customerRating && s.customerRating > 0)
      .reduce((sum: number, s: Service, _: number, arr: Service[]) => sum + (s.customerRating || 0) / arr.length, 0);
    
    // Müşteri segmentasyon analizi - Dinamik hesaplama
    // İşlemlerden son satış tarihini bul
    const lastSaleTransaction = transactions
      .filter((t: Transaction) => t.type === 'satis')
      .sort((a: Transaction, b: Transaction) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0];
    
    const actualLastPurchaseDate = lastSaleTransaction ? lastSaleTransaction.createdAt : customer.lastPurchaseDate;
    
    const daysSinceLastPurchase = actualLastPurchaseDate 
      ? Math.floor((Date.now() - new Date(actualLastPurchaseDate).getTime()) / (1000 * 60 * 60 * 24))
      : null; // Hiç alışveriş yapmamışsa null
    
    console.log('📊 Müşteri analizi:', {
      customerName: `${customer.firstName} ${customer.lastName}`,
      totalTransactions: transactions.length,
      salesTransactions: transactions.filter((t: Transaction) => t.type === 'satis').length,
      lastSaleTransaction: lastSaleTransaction ? lastSaleTransaction.createdAt : 'Yok',
      daysSinceLastPurchase,
      dbLastPurchaseDate: customer.lastPurchaseDate
    });
    
    const customerInsights = {
      // Satın alma davranışı
      purchaseFrequency: customer.visitCount > 0 && customer.lastPurchaseDate 
        ? Math.round(customer.visitCount / Math.max(1, Math.floor((Date.now() - new Date(customer.createdAt).getTime()) / (1000 * 60 * 60 * 24 * 30))))
        : 0,
      
      // Ortalama sepet tutarı
      averageBasket: totalPurchases > 0 ? customer.totalSpent / totalPurchases : 0,
      
      // Müşteri yaşam döngüsü değeri
      lifetimeValue: customer.totalSpent + (services.reduce((sum: number, s: Service) => sum + s.cost, 0)),
      
      // Risk analizi - Daha detaylı
      riskLevel: !transactions.filter((t: Transaction) => t.type === 'satis').length ? 'new' :
                 daysSinceLastPurchase === null ? 'new' : 
                 daysSinceLastPurchase > 180 ? 'high' : 
                 daysSinceLastPurchase > 90 ? 'medium' : 'low',
      
      // Sadakat seviyesi
      loyaltyLevel: customer.loyaltyPoints > 1000 ? 'champion' :
                    customer.loyaltyPoints > 500 ? 'loyal' :
                    customer.loyaltyPoints > 100 ? 'regular' : 'new',
      
      // Karlılık
      profitability: customer.totalSpent > 5000 ? 'high' :
                     customer.totalSpent > 2000 ? 'medium' : 'low'
    };
    
    // Response hazırla
    const customerProfile = {
      // Temel müşteri bilgileri
      customer: {
        ...customer,
        fullName: `${customer.firstName} ${customer.lastName}`,
        memberSince: customer.createdAt,
        daysSinceLastPurchase,
        actualLastPurchaseDate, // Gerçek son satış tarihi
        hasTransactions: transactions.filter((t: Transaction) => t.type === 'satis').length > 0
      },
      
      // İstatistikler
      stats: {
        totalTransactions,
        totalPurchases,
        totalServicesCount,
        completedServices,
        averageServiceRating: averageServiceRating || 0,
        totalSpentIncludingServices: customer.totalSpent + services.reduce((sum: number, s: Service) => sum + s.cost, 0)
      },
      
      // Detaylı geçmiş
      transactions: transactions.map((t: Transaction) => ({
        ...t,
        formattedDate: new Date(t.createdAt).toLocaleDateString('tr-TR')
      })),
      
      services: services.map((s: Service) => ({
        ...s,
        formattedReceivedDate: new Date(s.receivedDate).toLocaleDateString('tr-TR'),
        formattedCompletedDate: s.completedDate ? new Date(s.completedDate).toLocaleDateString('tr-TR') : null
      })),
      
      receivables: receivables.map((r: Receivable) => ({
        ...r,
        formattedCreatedDate: new Date(r.createdAt).toLocaleDateString('tr-TR'),
        formattedDueDate: r.dueDate ? new Date(r.dueDate).toLocaleDateString('tr-TR') : null
      })),
      
      // Analizler
      purchaseHistory,
      serviceHistory,
      monthlySpending,
      favoriteProducts,
      loyaltyHistory,
      customerInsights,
      
      // Öneriler
      recommendations: {
        // Bu müşteriye özel öneriler
        suggestedProducts: favoriteProducts.slice(0, 3),
        nextServiceReminder: services.length > 0 ? 
          new Date(Math.max(...services.map((s: Service) => new Date(s.receivedDate).getTime())) + 90 * 24 * 60 * 60 * 1000).toLocaleDateString('tr-TR')
          : null,
        loyaltyRewards: customer.loyaltyPoints >= 100 ? Math.floor(customer.loyaltyPoints / 100) * 10 : null // 0 yerine null
      }
    };
    
    console.log('✅ Müşteri profili başarıyla hazırlandı:', customer.firstName, customer.lastName);
    
    return NextResponse.json(customerProfile);
  } catch (error) {
    console.error('❌ Customer profile error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Müşteri profili alınamadı: ' + errorMessage }, { status: 500 });
  }
}