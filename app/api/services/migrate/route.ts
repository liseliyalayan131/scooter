import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export async function POST() {
  try {
    await dbConnect();
    
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    console.log('🔄 Servis verilerini migrate ediliyor...');
    
    // Mevcut tüm servisleri al
    const services = await db.collection('services').find({}).toArray();
    
    console.log(`📋 Toplam ${services.length} servis kaydı bulundu`);
    
    let updatedCount = 0;
    
    for (const service of services) {
      const updateData: any = {};
      
      // Yeni alanları ekle (eğer yoksa)
      if (service.isRegisteredCustomer === undefined) {
        updateData.isRegisteredCustomer = false;
      }
      
      if (service.customerEmail === undefined) {
        updateData.customerEmail = '';
      }
      
      if (service.customerId === undefined) {
        updateData.customerId = null;
      }
      
      if (service.customerRating === undefined) {
        updateData.customerRating = null;
      }
      
      if (service.customerFeedback === undefined) {
        updateData.customerFeedback = '';
      }
      
      // Eğer güncelleme gerekiyorsa
      if (Object.keys(updateData).length > 0) {
        await db.collection('services').updateOne(
          { _id: service._id },
          { $set: updateData }
        );
        updatedCount++;
      }
    }
    
    console.log(`✅ ${updatedCount} servis kaydı güncellendi`);
    
    // Güncellenmiş tüm servisleri getir
    const updatedServices = await db.collection('services').find({}).sort({ receivedDate: -1 }).toArray();
    
    return NextResponse.json({
      success: true,
      message: `${updatedCount} servis kaydı başarıyla migrate edildi`,
      totalServices: services.length,
      updatedServices: updatedCount,
      services: updatedServices
    });
    
  } catch (error) {
    console.error('❌ Migration error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ 
      success: false, 
      error: 'Migration başarısız: ' + errorMessage 
    }, { status: 500 });
  }
}

export async function GET() {
  try {
    await dbConnect();
    
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    // Mevcut tüm servisleri al (debug için)
    const services = await db.collection('services').find({}).sort({ receivedDate: -1 }).toArray();
    
    return NextResponse.json({
      totalServices: services.length,
      services: services
    });
    
  } catch (error) {
    console.error('❌ Debug error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Debug başarısız: ' + errorMessage }, { status: 500 });
  }
}