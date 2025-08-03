import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

export async function GET() {
  try {
    await dbConnect();
    
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    const customers = await db.collection('customers').find({}).sort({ createdAt: -1 }).toArray();
    
    return NextResponse.json(customers);
  } catch (error) {
    console.error('❌ Customers fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Müşteriler alınamadı: ' + errorMessage }, { status: 500 });
  }
}

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
    
    // Telefon numarası kontrolü
    const existingCustomer = await db.collection('customers').findOne({ phone: data.phone });
    if (existingCustomer) {
      return NextResponse.json({ error: 'Bu telefon numarası zaten kayıtlı' }, { status: 400 });
    }

    const customerData = {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
      birthDate: data.birthDate || null,
      notes: data.notes?.trim() || null,
      loyaltyPoints: 0,
      totalSpent: 0,
      visitCount: 0,
      lastVisit: null,
      discountCard: data.discountCard || null,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await db.collection('customers').insertOne(customerData);
    
    return NextResponse.json({ 
      _id: result.insertedId, 
      ...customerData 
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Customer creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Müşteri oluşturulamadı: ' + errorMessage }, { status: 500 });
  }
}