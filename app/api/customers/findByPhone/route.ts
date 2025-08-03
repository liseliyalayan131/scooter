import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

// Bu route dynamic olarak çalışmalı
export const dynamic = 'force-dynamic';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const phone = searchParams.get('phone');
    
    if (!phone) {
      return NextResponse.json({ error: 'Telefon numarası gereklidir' }, { status: 400 });
    }

    await dbConnect();
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    // Telefon numarasıyla müşteri ara
    const customer = await db.collection('customers').findOne({ 
      phone: phone.trim() 
    });
    
    if (!customer) {
      return NextResponse.json(null);
    }
    
    return NextResponse.json(customer);
  } catch (error) {
    console.error('❌ Phone search error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Telefon araması başarısız: ' + errorMessage }, { status: 500 });
  }
}
