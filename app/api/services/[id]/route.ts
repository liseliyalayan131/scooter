import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Service from '@/lib/models/Service';
import Transaction from '@/lib/models/Transaction';

// Tip tanımları
interface ServiceDocument {
  _id: any;
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
  toObject?: () => any;
}

interface Target {
  _id: any;
  period: string;
  targetAmount: number;
  currentAmount: number;
  status: string;
}

// Hedef sistemini güncelle - düzeltildi
async function updateTargets() {
  try {
    console.log('🎯 Hedef güncelleme başlıyor...');
    
    await dbConnect();
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    const targets = await db.collection('targets').find({ status: 'active' }).toArray() as Target[];
    
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
    
    console.log('🎯 Hedefler güncellendi!');
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

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🔍 Servis kaydı aranıyor:', params.id);
    await dbConnect();
    
    const service = await Service.findById(params.id).lean() as ServiceDocument | null;
    
    if (!service) {
      return NextResponse.json({ error: 'Servis kaydı bulunamadı' }, { status: 404 });
    }
    
    // Kayıtlı müşteri bilgilerini al
    let responseService = service;
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
      
      responseService = {
        ...service,
        customerId: customer || null
      };
    }
    
    console.log('✅ Servis kaydı bulundu:', service.customerName, '-', service.scooterBrand, service.scooterModel);
    return NextResponse.json(responseService);
  } catch (error) {
    console.error('❌ Service GET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Servis kaydı alınamadı: ' + errorMessage }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🔧 Servis kaydı güncelleniyor:', params.id);
    await dbConnect();
    const body = await request.json();
    
    // Mevcut servis durumunu kontrol et
    const currentService = await Service.findById(params.id) as ServiceDocument | null;
    if (!currentService) {
      return NextResponse.json({ error: 'Servis kaydı bulunamadı' }, { status: 404 });
    }
    
    console.log('📋 Önceki durum:', currentService.status, '→ Yeni durum:', body.status);
    
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
        
        console.log('👑 Kayıtlı müşteri güncellendi:', customerData.customerName);
      }
    }
    
    const service = await Service.findByIdAndUpdate(
      params.id,
      {
        ...customerData,
        scooterBrand: body.scooterBrand,
        scooterModel: body.scooterModel,
        serialNumber: body.serialNumber || '',
        problem: body.problem,
        solution: body.solution || '',
        cost: body.cost,
        laborCost: body.laborCost || 0,
        partsCost: body.partsCost || 0,
        status: body.status,
        receivedDate: body.receivedDate,
        completedDate: body.completedDate || null,
        notes: body.notes || '',
        warrantyDays: body.warrantyDays || 30,
        customerRating: body.customerRating || null,
        customerFeedback: body.customerFeedback || ''
      },
      { new: true }
    ) as ServiceDocument | null;

    if (!service) {
      return NextResponse.json({ error: 'Servis kaydı bulunamadı' }, { status: 404 });
    }

    // Eğer servis durumu 'tamamlandi' olarak güncellendi ve daha önce tamamlandi değilse, transaction oluştur
    if (body.status === 'tamamlandi' && currentService.status !== 'tamamlandi' && body.cost > 0) {
      console.log('💰 Servis tamamlandı - Transaction kontrol ediliyor...');
      
      // Daha önce aynı servis için gelir kaydı var mı kontrol et
      const existingTransaction = await Transaction.findOne({
        type: 'gelir',
        description: { $regex: `Servis Geliri: ${customerData.customerName}.*${body.scooterBrand}.*${body.scooterModel}` }
      });
      
      if (!existingTransaction) {
        console.log('📝 Yeni transaction oluşturuluyor...');
        const transaction = new Transaction({
          type: 'gelir',
          amount: body.cost,
          description: `Servis Geliri: ${customerData.customerName} - ${body.scooterBrand} ${body.scooterModel} (${body.problem})`,
          category: 'Servis',
          customerName: customerData.customerName,
          customerPhone: customerData.customerPhone
        });
        
        await transaction.save();
        console.log('✅ Transaction oluşturuldu:', transaction._id);
        
        // Hedef sistemini güncelle
        console.log('🎯 Hedef güncelleme tetikleniyor...');
        await updateTargets();
      } else {
        console.log('⚠️ Bu servis için zaten transaction mevcut');
      }
    }

    // Response için müşteri bilgilerini ekle
    let responseService = service.toObject ? service.toObject() : service;
    if (customerData.isRegisteredCustomer && customerData.customerId) {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      const customer = await db.collection('customers').findOne({
        _id: new mongoose.Types.ObjectId(customerData.customerId)
      });
      
      responseService.customerId = customer;
    }

    console.log('✅ Servis kaydı güncellendi:', service._id);
    return NextResponse.json(responseService);
  } catch (error) {
    console.error('❌ Service PUT error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Servis kaydı güncellenemedi: ' + errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🗑️ Servis kaydı siliniyor:', params.id);
    await dbConnect();
    const service = await Service.findByIdAndDelete(params.id) as ServiceDocument | null;
    
    if (!service) {
      return NextResponse.json({ error: 'Servis kaydı bulunamadı' }, { status: 404 });
    }
    
    console.log('✅ Servis kaydı silindi:', service._id);
    return NextResponse.json({ message: 'Servis kaydı silindi' });
  } catch (error) {
    console.error('❌ Service DELETE error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Servis kaydı silinemedi: ' + errorMessage }, { status: 500 });
  }
}