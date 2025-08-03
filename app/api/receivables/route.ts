import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Receivable from '@/lib/models/Receivable';

export async function GET() {
  try {
    await dbConnect();
    const receivables = await Receivable.find({})
      .populate('customerId', 'firstName lastName phone email customerType loyaltyPoints totalSpent')
      .populate('transactionId', 'description amount type createdAt')
      .populate('serviceId', 'customerName scooterBrand scooterModel problem cost')
      .sort({ createdAt: -1 });
    return NextResponse.json(receivables);
  } catch (error) {
    console.error('Receivables GET error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Alacak-Verecek kayıtları alınamadı: ' + errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    
    console.log('📝 Yeni alacak-verecek kaydı oluşturuluyor...');
    
    // Kayıtlı müşteri bilgilerini al
    let customerData = {
      customerId: null,
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
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
          firstName: customer.firstName,
          lastName: customer.lastName,
          phone: customer.phone,
          isRegisteredCustomer: true
        };
        
        console.log('👑 Kayıtlı müşteri alacak/verecek kaydı:', customer.firstName, customer.lastName);
      }
    } else {
      // Manuel girilen müşterinin zaten kayıtlı olup olmadığını kontrol et
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      const existingCustomer = await db.collection('customers').findOne({ 
        phone: body.phone 
      });
      
      if (existingCustomer) {
        customerData = {
          customerId: existingCustomer._id,
          firstName: existingCustomer.firstName,
          lastName: existingCustomer.lastName,
          phone: existingCustomer.phone,
          isRegisteredCustomer: true
        };
        
        console.log('👑 Telefon numarasından müşteri bulundu:', existingCustomer.firstName, existingCustomer.lastName);
      }
    }
    
    const receivable = new Receivable({
      ...customerData,
      amount: body.amount,
      description: body.description || '',
      type: body.type,
      status: body.status || 'odenmedi',
      paymentPlan: body.paymentPlan || 'single',
      transactionId: body.transactionId || null,
      serviceId: body.serviceId || null,
      dueDate: body.dueDate || null,
      paidDate: body.markAsPaid ? new Date() : null,
      paidAmount: body.markAsPaid ? body.amount : 0,
      notes: body.notes || '',
      priority: body.priority || 'normal'
    });

    await receivable.save();
    console.log('✅ Alacak-Verecek kaydı oluşturuldu:', receivable._id);
    
    // Eğer kayıtlı müşteriyse ve alacak ise, müşteri borcunu güncelle
    if (customerData.isRegisteredCustomer && customerData.customerId && body.type === 'alacak') {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      await db.collection('customers').updateOne(
        { _id: customerData.customerId },
        { 
          $inc: { 
            currentDebt: receivable.status === 'odenmedi' ? body.amount : 0
          },
          $set: { 
            updatedAt: new Date().toISOString()
          }
        }
      );
      
      console.log('💰 Müşteri borç durumu güncellendi');
    }

    // Response için populate et
    const populatedReceivable = await Receivable.findById(receivable._id)
      .populate('customerId', 'firstName lastName phone email customerType loyaltyPoints totalSpent')
      .populate('transactionId', 'description amount type createdAt')
      .populate('serviceId', 'customerName scooterBrand scooterModel problem cost');

    return NextResponse.json(populatedReceivable, { status: 201 });
  } catch (error) {
    console.error('Receivables POST error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Alacak-Verecek kaydı eklenemedi: ' + errorMessage }, { status: 500 });
  }
}

// Müşteri hesap güncelleme (vadeli ödemeler için)
export async function PUT(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    
    if (body.action === 'updateCustomerAccount') {
      console.log('💳 Müşteri hesabı güncelleniyor...');
      
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      // Müşteri kayıt et/güncelle
      const customerData = {
        firstName: body.customerName,
        lastName: body.customerSurname,
        phone: body.customerPhone
      };
      
      const existingCustomer = await db.collection('customers').findOne({ 
        phone: body.customerPhone 
      });
      
      if (existingCustomer) {
        // Mevcut müşteri - harcama güncelle
        await db.collection('customers').updateOne(
          { _id: existingCustomer._id },
          { 
            $inc: { 
              totalSpent: body.saleAmount,
              visitCount: 1,
              loyaltyPoints: Math.floor(body.saleAmount / 10),
              currentDebt: body.paymentType !== 'cash' ? body.saleAmount : 0
            },
            $set: { 
              lastVisit: new Date(),
              lastPurchaseDate: new Date(),
              updatedAt: new Date().toISOString()
            }
          }
        );
        
        console.log('✅ Mevcut müşteri güncellendi:', existingCustomer.firstName, existingCustomer.lastName);
      } else {
        // Yeni müşteri oluştur
        const newCustomer = {
          ...customerData,
          email: null,
          address: {},
          loyaltyPoints: Math.floor(body.saleAmount / 10),
          totalSpent: body.saleAmount,
          visitCount: 1,
          lastVisit: new Date(),
          lastPurchaseDate: new Date(),
          currentDebt: body.paymentType !== 'cash' ? body.saleAmount : 0,
          customerType: 'normal',
          status: 'active',
          preferences: {
            emailNotifications: true,
            smsNotifications: true,
            promotionalEmails: false
          },
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        };
        
        await db.collection('customers').insertOne(newCustomer);
        console.log('✅ Yeni müşteri oluşturuldu:', customerData.firstName, customerData.lastName);
      }
      
      return NextResponse.json({ success: true, message: 'Müşteri hesabı güncellendi' });
    }
    
    return NextResponse.json({ error: 'Geçersiz işlem' }, { status: 400 });
  } catch (error) {
    console.error('Customer account update error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Müşteri hesabı güncellenemedi: ' + errorMessage }, { status: 500 });
  }
}