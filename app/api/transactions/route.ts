import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/lib/models/Transaction';
import Product from '@/lib/models/Product';
import Customer from '@/lib/models/Customer';
import Service from '@/lib/models/Service';

// Hedef sistemini güncelle
async function updateTargets() {
  try {
    console.log('🎯 Hedef güncelleme başlıyor...');
    
    await dbConnect();
    const mongoose = require('mongoose');
    const targetsCollection = mongoose.connection.db.collection('targets');
    const transactionsCollection = mongoose.connection.db.collection('transactions');
    
    const targets = await targetsCollection.find({ status: 'active' }).toArray();
    console.log(`🎯 ${targets.length} aktif hedef bulundu`);
    
    for (const target of targets) {
      const { startDate, endDate } = calculatePeriodDates(target.period);
      
      const result = await transactionsCollection.aggregate([
        {
          $match: {
            type: { $in: ['gelir', 'satis'] },
            createdAt: { 
              $gte: startDate,
              $lt: endDate
            }
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
      
      const currentAmount = result[0]?.total || 0;
      const transactionCount = result[0]?.count || 0;
      
      console.log(`💰 Hedef: ${target.title} - ${transactionCount} işlem, Toplam: ${currentAmount}₺`);
      
      let status = 'active';
      if (currentAmount >= target.targetAmount) {
        status = 'completed';
      } else if (new Date() > endDate) {
        status = 'expired';
      }
      
      await targetsCollection.updateOne(
        { _id: target._id },
        { 
          $set: { 
            currentAmount,
            status,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            updatedAt: new Date().toISOString()
          }
        }
      );
    }
    
    console.log('🎯 Tüm hedefler başarıyla güncellendi!');
    return { success: true, updatedCount: targets.length };
  } catch (error) {
    console.error('❌ Hedef güncelleme hatası:', error);
    return { success: false, error: error instanceof Error ? error.message : 'Bilinmeyen hata' };
  }
}

function calculatePeriodDates(period: string) {
  const now = new Date();
  let startDate: Date;
  let endDate: Date;

  switch (period) {
    case 'daily':
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
      break;
    case 'weekly':
      const dayOfWeek = now.getDay();
      startDate = new Date(now);
      startDate.setDate(now.getDate() - dayOfWeek);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(startDate);
      endDate.setDate(startDate.getDate() + 7);
      break;
    case 'monthly':
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
      break;
    case 'yearly':
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear() + 1, 0, 1, 0, 0, 0, 0);
      break;
    default:
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 1, 0, 0, 0, 0);
  }

  return { startDate, endDate };
}

export async function GET() {
  try {
    await dbConnect();
    
    // Model'lerin yüklendiğinden emin ol
    const mongoose = require('mongoose');
    if (!mongoose.models.Customer) {
      require('@/lib/models/Customer');
    }
    if (!mongoose.models.Service) {
      require('@/lib/models/Service');
    }
    if (!mongoose.models.Product) {
      require('@/lib/models/Product');
    }
    
    const transactions = await Transaction.find({})
      .populate('productId', 'name sellPrice category')
      .populate('customerId', 'firstName lastName phone email customerType loyaltyPoints totalSpent')
      .populate('serviceId', 'customerName scooterBrand scooterModel problem')
      .sort({ createdAt: -1 });
    return NextResponse.json(transactions);
  } catch (error) {
    console.error('Transactions GET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'İşlemler alınamadı: ' + errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('📝 Yeni işlem kaydı başlıyor...');
    await dbConnect();
    const body = await request.json();
    
    console.log('📋 İşlem detayları:', {
      type: body.type,
      amount: body.amount,
      description: body.description,
      customerId: body.customerId,
      isRegisteredCustomer: body.isRegisteredCustomer
    });
    
    // Kayıtlı müşteri bilgilerini al ve doğrula
    let customerData = {
      customerId: null,
      customerName: body.customerName || null,
      customerSurname: body.customerSurname || null,
      customerPhone: body.customerPhone || null,
      isRegisteredCustomer: false
    };

    // Eğer kayıtlı müşteri seçildiyse
    if (body.customerId) {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      const customer = await db.collection('customers').findOne({ 
        _id: new mongoose.Types.ObjectId(body.customerId) 
      });
      
      if (customer) {
        customerData = {
          customerId: body.customerId,
          customerName: customer.firstName,
          customerSurname: customer.lastName,
          customerPhone: customer.phone,
          isRegisteredCustomer: true
        };
        
        console.log('👑 Kayıtlı müşteri işlemi:', customerData.customerName, customerData.customerSurname);
      }
    }
    
    const transaction = new Transaction({
      type: body.type,
      amount: body.amount,
      description: body.description,
      category: body.category,
      productId: body.productId || null,
      quantity: body.quantity || 1,
      discount: body.discount || 0,
      discountType: body.discountType || 'tutar',
      originalAmount: body.originalAmount || body.amount,
      paymentType: body.paymentType || 'cash',
      serviceId: body.serviceId || null,
      ...customerData
    });

    await transaction.save();
    console.log('✅ İşlem kaydedildi:', transaction._id);

    // Stok güncelle (satış işlemleri için)
    if (body.type === 'satis' && body.productId) {
      const product = await Product.findById(body.productId);
      if (product) {
        // Stok düş
        product.stock = Math.max(0, product.stock - body.quantity);
        // Satış istatistiklerini güncelle
        product.totalSold += body.quantity;
        product.lastSaleDate = new Date();
        
        await product.save();
        console.log('📦 Stok güncellendi:', product.name, 'Kalan:', product.stock);
      }
    }

    // Vadeli/Taksitli ödemeler için alacak kaydı oluştur
    if (body.type === 'satis' && body.paymentType && body.paymentType !== 'cash') {
      console.log('💳 Vadeli/Taksitli ödeme - Alacak kaydı oluşturuluyor...');
      
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      const receivableData = {
        ...customerData,
        firstName: customerData.customerName || body.customerName,
        lastName: customerData.customerSurname || body.customerSurname,
        phone: customerData.customerPhone || body.customerPhone,
        amount: body.amount,
        description: `Satış alacağı: ${body.description}`,
        type: 'alacak',
        status: 'odenmedi',
        paymentPlan: body.paymentType === 'installment' ? 'installment' : 'single',
        transactionId: transaction._id,
        dueDate: body.paymentType === 'credit' 
          ? new Date(Date.now() + 30 * 24 * 60 * 60 * 1000) // 30 gün sonra
          : new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),  // 7 gün sonra
        priority: 'normal',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      await db.collection('receivables').insertOne(receivableData);
      console.log('📋 Alacak kaydı oluşturuldu');
    }

    // Hedef sistemini güncelle (sadece gelir ve satış işlemleri için)
    if (body.type === 'gelir' || body.type === 'satis') {
      console.log('🎯 Hedef güncelleme tetikleniyor...');
      const updateResult = await updateTargets();
      
      if (updateResult.success) {
        console.log(`🎉 ${updateResult.updatedCount} hedef başarıyla güncellendi!`);
      } else {
        console.error('❌ Hedef güncelleme başarısız:', updateResult.error);
      }
    }

    // Response için populate et
    // Model'lerin yüklendiğinden emin ol
    const mongoose = require('mongoose');
    if (!mongoose.models.Customer) {
      require('@/lib/models/Customer');
    }
    if (!mongoose.models.Service) {
      require('@/lib/models/Service');
    }
    if (!mongoose.models.Product) {
      require('@/lib/models/Product');
    }
    
    const populatedTransaction = await Transaction.findById(transaction._id)
      .populate('productId', 'name sellPrice category')
      .populate('customerId', 'firstName lastName phone email customerType loyaltyPoints totalSpent')
      .populate('serviceId', 'customerName scooterBrand scooterModel problem');

    return NextResponse.json(populatedTransaction, { status: 201 });
  } catch (error) {
    console.error('❌ Transaction POST error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'İşlem kaydedilemedi: ' + errorMessage }, { status: 500 });
  }
}