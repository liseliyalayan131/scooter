import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

// Dönem başlangıç ve bitiş tarihlerini hesapla - düzeltildi
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

// Hedef ilerlemesini hesapla - mongoose connection kullanarak
async function calculateTargetProgress(target: any) {
  const { startDate, endDate } = calculatePeriodDates(target.period);
  
  try {
    const mongoose = require('mongoose');
    const transactionsCollection = mongoose.connection.db.collection('transactions');
    
    const result = await transactionsCollection.aggregate([
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
          total: { $sum: '$amount' },
          count: { $sum: 1 }
        }
      }
    ]).toArray();

    const currentAmount = result[0]?.total || 0;
    const transactionCount = result[0]?.count || 0;
    
    console.log(`📊 Hedef: ${target.title} - ${transactionCount} işlem, Toplam: ${currentAmount}₺`);
    
    return currentAmount;
  } catch (error) {
    console.error('Hedef ilerleme hesaplama hatası:', error);
    return 0;
  }
}

export async function GET() {
  try {
    console.log('🎯 Hedefler listeleniyor...');
    await dbConnect();
    
    const mongoose = require('mongoose');
    const targetsCollection = mongoose.connection.db.collection('targets');
    
    const targets = await targetsCollection.find({}).sort({ createdAt: -1 }).toArray();
    console.log(`📋 ${targets.length} hedef bulundu`);
    
    // Her hedef için ilerlemeyi hesapla
    const targetsWithProgress = await Promise.all(
      targets.map(async (target: any) => {
        const currentAmount = await calculateTargetProgress(target);
        const { startDate, endDate } = calculatePeriodDates(target.period);
        
        // Durum güncelle
        let status = 'active';
        if (currentAmount >= target.targetAmount) {
          status = 'completed';
          console.log(`🎉 Hedef tamamlandı: ${target.title}`);
        } else if (new Date() > endDate) {
          status = 'expired';
          console.log(`⏰ Hedef süresi doldu: ${target.title}`);
        }

        // Hedef durumunu güncelle
        await targetsCollection.updateOne(
          { _id: target._id },
          { 
            $set: { 
              currentAmount,
              status,
              startDate: startDate.toISOString(),
              endDate: endDate.toISOString(),
              updatedAt: new Date().toISOString()
            }
          }
        );

        console.log(`✅ Hedef güncellendi: ${target.title} - ${currentAmount}/${target.targetAmount}₺ (%${((currentAmount/target.targetAmount)*100).toFixed(1)})`);

        return {
          ...target,
          currentAmount,
          status,
          startDate: startDate.toISOString(),
          endDate: endDate.toISOString()
        };
      })
    );
    
    console.log('🎯 Tüm hedefler başarıyla güncellendi!');
    return NextResponse.json(targetsWithProgress);
  } catch (error) {
    console.error('❌ Targets fetch error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Hedefler alınamadı: ' + errorMessage }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    console.log('🎯 Yeni hedef oluşturuluyor...');
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
    
    const targetData = {
      title: data.title.trim(),
      targetAmount: parseFloat(data.targetAmount),
      currentAmount: 0,
      period: data.period,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      status: 'active',
      description: data.description?.trim() || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const result = await targetsCollection.insertOne(targetData);
    
    console.log('✅ Hedef oluşturuldu:', result.insertedId);
    console.log('📅 Dönem:', startDate.toISOString(), 'dan', endDate.toISOString(), 'a kadar');
    
    return NextResponse.json({ 
      _id: result.insertedId, 
      ...targetData 
    }, { status: 201 });
  } catch (error) {
    console.error('❌ Target creation error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'Hedef oluşturulamadı: ' + errorMessage }, { status: 500 });
  }
}