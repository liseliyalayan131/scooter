import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Service from '@/lib/models/Service';
import Transaction from '@/lib/models/Transaction';

// Hedef sistemini güncelle - düzeltildi
async function updateTargets() {
  try {
    await dbConnect();
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    const targets = await db.collection('targets').find({ status: 'active' }).toArray();
    
    for (const target of targets) {
      const { startDate, endDate } = calculatePeriodDates(target.period);
      
      // Sadece createdAt field'ını kullan
      const result = await db.collection('transactions').aggregate([
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
            total: { $sum: '$amount' }
          }
        }
      ]).toArray();
      
      const currentAmount = result[0]?.total || 0;
      
      // Durum güncelle
      let status = 'active';
      if (currentAmount >= target.targetAmount) {
        status = 'completed';
      } else if (new Date() > endDate) {
        status = 'expired';
      }
      
      await db.collection('targets').updateOne(
        { _id: target._id },
        { 
          $set: { 
            currentAmount,
            status,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString()
          }
        }
      );
    }
  } catch (error) {
    console.error('❌ Target update error:', error);
  }
}

// Dönem hesaplama fonksiyonu
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
    
    console.log('🔍 Servis kayıtları getiriliyor...');
    
    // Önce tüm servisleri al
    const services = await Service.find({}).sort({ receivedDate: -1 }).lean();
    
    console.log(`📋 ${services.length} servis kaydı bulundu`);
    
    // Populate işlemi için ayrı olarak müşteri bilgilerini al
    const populatedServices = await Promise.all(
      services.map(async (service) => {
        try {
          // Eğer kayıtlı müşteri varsa, bilgilerini al
          if (service.isRegisteredCustomer && service.customerId) {
            const mongoose = require('mongoose');
            const db = mongoose.connection.db;
            
            const customer = await db.collection('customers').findOne({
              _id: service.customerId
            }, {
              projection: {
                firstName: 1,
                lastName: 1,
                phone: 1,
                email: 1,
                loyaltyPoints: 1,
                totalSpent: 1,
                visitCount: 1
              }
            });
            
            return {
              ...service,
              customerId: customer || null
            };
          }
          
          return service;
        } catch (error) {
          console.error('❌ Müşteri bilgisi alınırken hata:', error);
          return service;
        }
      })
    );
    
    console.log('✅ Servis kayıtları başarıyla getirildi');
    
    return NextResponse.json(populatedServices);
  } catch (error) {
    console.error('❌ Services GET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Servis kayıtları alınamadı: ' + errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    
    console.log('📝 Yeni servis kaydı oluşturuluyor...');
    
    // Kayıtlı müşteri bilgilerini al
    let customerData = {
      customerName: body.customerName,
      customerPhone: body.customerPhone,
      customerAddress: body.customerAddress || '',
      customerEmail: body.customerEmail || '',
      isRegisteredCustomer: false,
      customerId: null
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
          customerName: `${customer.firstName} ${customer.lastName}`,
          customerPhone: customer.phone,
          customerAddress: customer.address || '',
          customerEmail: customer.email || '',
          isRegisteredCustomer: true,
          customerId: body.customerId
        };
        
        console.log('👑 Kayıtlı müşteri seçildi:', customerData.customerName);
      }
    }
    
    const service = new Service({
      ...customerData,
      scooterBrand: body.scooterBrand,
      scooterModel: body.scooterModel,
      serialNumber: body.serialNumber || '',
      problem: body.problem,
      solution: body.solution || '',
      cost: body.cost,
      laborCost: body.laborCost || 0,
      partsCost: body.partsCost || 0,
      status: body.status || 'beklemede',
      receivedDate: body.receivedDate || new Date(),
      completedDate: body.completedDate || null,
      notes: body.notes || '',
      warrantyDays: body.warrantyDays || 30,
      customerRating: body.customerRating || null,
      customerFeedback: body.customerFeedback || ''
    });

    await service.save();
    
    console.log('✅ Servis kaydı oluşturuldu:', service._id);
    
    // Eğer servis tamamlandı ise transaction oluştur
    if (body.status === 'tamamlandi' && body.cost > 0) {
      const transaction = new Transaction({
        type: 'gelir',
        amount: body.cost,
        description: `Servis Geliri: ${customerData.customerName} - ${body.scooterBrand} ${body.scooterModel} (${body.problem})`,
        category: 'Servis',
        customerName: customerData.customerName,
        customerPhone: customerData.customerPhone
      });
      
      await transaction.save();
      
      console.log('💰 Transaction oluşturuldu:', transaction._id);
      
      // Hedef sistemini güncelle
      await updateTargets();
    }
    
    // Response için müşteri bilgilerini ekle
    let responseService = service.toObject();
    if (customerData.isRegisteredCustomer && customerData.customerId) {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      const customer = await db.collection('customers').findOne({
        _id: new mongoose.Types.ObjectId(customerData.customerId)
      });
      
      responseService.customerId = customer;
    }
    
    return NextResponse.json(responseService, { status: 201 });
  } catch (error) {
    console.error('❌ Services POST error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Servis kaydı eklenemedi: ' + errorMessage }, { status: 500 });
  }
}

// Kayıtlı müşterileri getir (OPTIONS method kullanarak)
export async function OPTIONS() {
  try {
    await dbConnect();
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    const customers = await db.collection('customers')
      .find({ status: { $ne: 'blocked' } })
      .sort({ firstName: 1 })
      .toArray();
    
    return NextResponse.json(customers);
  } catch (error) {
    console.error('❌ Customers fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Müşteriler alınamadı: ' + errorMessage }, { status: 500 });
  }
}