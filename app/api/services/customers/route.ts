import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export async function GET() {
  try {
    await dbConnect();
    
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    // Aktif müşterileri getir ve sadece ihtiyaç duyulan alanları seç
    const customers = await db.collection('customers')
      .find({ status: { $ne: 'blocked' } })
      .sort({ firstName: 1, lastName: 1 })
      .project({
        firstName: 1,
        lastName: 1,
        phone: 1,
        email: 1,
        address: 1,
        loyaltyPoints: 1,
        totalSpent: 1,
        visitCount: 1,
        lastVisit: 1,
        customerType: 1,
        createdAt: 1
      })
      .toArray();
    
    return NextResponse.json(customers);
  } catch (error) {
    console.error('❌ Registered customers fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Kayıtlı müşteriler alınamadı: ' + errorMessage }, { status: 500 });
  }
}