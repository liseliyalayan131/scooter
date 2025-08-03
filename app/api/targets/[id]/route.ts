import { NextRequest, NextResponse } from 'next/server';
import { ObjectId } from 'mongodb';
import dbConnect from '@/lib/mongodb';

// Dönem başlangıç ve bitiş tarihlerini hesapla
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
      throw new Error('Geçersiz dönem');
  }

  return { startDate, endDate };
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🎯 Hedef güncelleniyor:', params.id);
    const data = await request.json();
    
    // Validation
    if (!data.title || !data.targetAmount || !data.period) {
      return NextResponse.json({ error: 'Başlık, hedef tutar ve dönem zorunludur' }, { status: 400 });
    }

    if (data.targetAmount <= 0) {
      return NextResponse.json({ error: 'Hedef tutar 0\'dan büyük olmalıdır' }, { status: 400 });
    }

    const validPeriods = ['daily', 'weekly', 'monthly', 'yearly'];
    if (!validPeriods.includes(data.period)) {
      return NextResponse.json({ error: 'Geçersiz dönem' }, { status: 400 });
    }

    await dbConnect();
    const mongoose = require('mongoose');
    const targetsCollection = mongoose.connection.db.collection('targets');

    const { startDate, endDate } = calculatePeriodDates(data.period);

    const updateData = {
      title: data.title.trim(),
      targetAmount: parseFloat(data.targetAmount),
      period: data.period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      description: data.description?.trim() || '',
      updatedAt: new Date().toISOString()
    };

    const result = await targetsCollection.updateOne(
      { _id: new ObjectId(params.id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Hedef bulunamadı' }, { status: 404 });
    }

    console.log('✅ Hedef güncellendi:', params.id);
    return NextResponse.json({ message: 'Hedef başarıyla güncellendi' });
  } catch (error) {
    console.error('❌ Target update error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Hedef güncellenemedi: ' + errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    console.log('🗑️ Hedef siliniyor:', params.id);
    await dbConnect();
    const mongoose = require('mongoose');
    const targetsCollection = mongoose.connection.db.collection('targets');
    
    const result = await targetsCollection.deleteOne({ _id: new ObjectId(params.id) });
    
    if (result.deletedCount === 0) {
      return NextResponse.json({ error: 'Hedef bulunamadı' }, { status: 404 });
    }

    console.log('✅ Hedef silindi:', params.id);
    return NextResponse.json({ message: 'Hedef başarıyla silindi' });
  } catch (error) {
    console.error('❌ Target deletion error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Hedef silinemedi: ' + errorMessage }, { status: 500 });
  }
}