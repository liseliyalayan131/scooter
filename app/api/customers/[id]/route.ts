import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import dbConnect from '@/lib/mongodb';

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const data = await request.json();
    
    // Validation
    if (!data.firstName || !data.lastName || !data.phone) {
      return NextResponse.json({ error: 'Ad, soyad ve telefon zorunludur' }, { status: 400 });
    }

    await dbConnect();
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    // Aynı telefon numarasına sahip başka müşteri var mı kontrol et (kendisi hariç)
    const existingCustomer = await db.collection('customers').findOne({ 
      phone: data.phone,
      _id: { $ne: new ObjectId(params.id) }
    });
    
    if (existingCustomer) {
      return NextResponse.json({ error: 'Bu telefon numarası başka bir müşteri tarafından kullanılıyor' }, { status: 400 });
    }

    const updateData = {
      firstName: data.firstName.trim(),
      lastName: data.lastName.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || null,
      address: data.address?.trim() || null,
      birthDate: data.birthDate || null,
      notes: data.notes?.trim() || null,
      discountCard: data.discountCard || null,
      updatedAt: new Date().toISOString()
    };

    const result = await db.collection('customers').updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Müşteri bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Müşteri başarıyla güncellendi' });
  } catch (error) {
    console.error('❌ Customer update error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Müşteri güncellenemedi: ' + errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    const result = await db.collection('customers').deleteOne({ _id: new ObjectId(params.id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Müşteri bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Müşteri başarıyla silindi' });
  } catch (error) {
    console.error('❌ Customer deletion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Müşteri silinemedi: ' + errorMessage }, { status: 500 });
  }
}