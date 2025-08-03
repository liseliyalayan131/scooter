import { NextRequest, NextResponse } from 'next/server';
import { MongoClient, ObjectId } from 'mongodb';

const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017';
const client = new MongoClient(uri);

async function connectToDatabase() {
  try {
    await client.connect();
    return client.db('scooter_management');
  } catch (error) {
    console.error('Database connection error:', error);
    throw error;
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { points } = await request.json();
    
    if (!points || points <= 0) {
      return NextResponse.json({ error: 'Geçerli bir puan miktarı giriniz' }, { status: 400 });
    }

    const db = await connectToDatabase();
    
    const result = await db.collection('customers').updateOne(
      { _id: new ObjectId(params.id) },
      { 
        $inc: { loyaltyPoints: points },
        $set: { updatedAt: new Date().toISOString() }
      }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json({ error: 'Müşteri bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ message: `${points} sadakat puanı eklendi` });
  } catch (error) {
    console.error('Loyalty points update error:', error);
    return NextResponse.json({ error: 'Sadakat puanı güncellenemedi' }, { status: 500 });
  }
}
