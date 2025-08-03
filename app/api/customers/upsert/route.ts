import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export async function POST(request: NextRequest) {
  try {
    const data = await request.json();
    
    // Validation
    if (!data.firstName || !data.lastName || !data.phone) {
      return NextResponse.json({ error: 'Ad, soyad ve telefon zorunludur' }, { status: 400 });
    }

    await dbConnect();
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    // Telefon numarasına göre müşteri ara
    const existingCustomer = await db.collection('customers').findOne({ phone: data.phone.trim() });
    
    if (existingCustomer) {
      // Müşteri varsa, sadece istatistikleri güncelle
      const updateData: any = {
        $inc: { 
          totalSpent: data.saleAmount || 0,
          visitCount: 1,
          loyaltyPoints: Math.floor((data.saleAmount || 0) / 100) // Her 100 TL için 1 puan
        },
        $set: { 
          lastVisit: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      };

      // Eğer ad/soyad farklıysa güncelle
      if (existingCustomer.firstName !== data.firstName.trim() || 
          existingCustomer.lastName !== data.lastName.trim()) {
        updateData.$set = {
          ...updateData.$set,
          firstName: data.firstName.trim(),
          lastName: data.lastName.trim()
        };
      }

      await db.collection('customers').updateOne(
        { phone: data.phone.trim() },
        updateData
      );
      
      return NextResponse.json({ 
        message: 'Müşteri bilgileri güncellendi',
        existing: true 
      });
    } else {
      // Yeni müşteri oluştur
      const customerData = {
        firstName: data.firstName.trim(),
        lastName: data.lastName.trim(),
        phone: data.phone.trim(),
        email: null,
        address: null,
        birthDate: null,
        notes: null,
        loyaltyPoints: Math.floor((data.saleAmount || 0) / 100), // Her 100 TL için 1 puan
        totalSpent: data.saleAmount || 0,
        visitCount: 1,
        lastVisit: new Date().toISOString(),
        discountCard: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };

      const result = await db.collection('customers').insertOne(customerData);
      
      return NextResponse.json({ 
        message: 'Yeni müşteri oluşturuldu',
        _id: result.insertedId,
        existing: false 
      }, { status: 201 });
    }
  } catch (error) {
    console.error('❌ Customer upsert error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Müşteri işlemi başarısız: ' + errorMessage }, { status: 500 });
  }
}