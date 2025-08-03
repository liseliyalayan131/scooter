import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Receivable from '@/lib/models/Receivable';

export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    const body = await request.json();
    
    const updateData: any = {
      firstName: body.firstName,
      lastName: body.lastName,
      phone: body.phone,
      amount: body.amount,
      description: body.description,
      type: body.type,
      status: body.status,
      dueDate: body.dueDate || null,
      notes: body.notes || ''
    };

    // Eğer ödendi olarak işaretleniyorsa paidDate'i set et
    if (body.status === 'odendi' && body.markAsPaid) {
      updateData.paidDate = new Date();
    } else if (body.status === 'odenmedi') {
      updateData.paidDate = null;
    }

    const receivable = await Receivable.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    );

    if (!receivable) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(receivable);
  } catch (error) {
    console.error('Receivables PUT error:', error);
    return NextResponse.json({ error: 'Kayıt güncellenemedi' }, { status: 500 });
  }
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    await dbConnect();
    
    const receivable = await Receivable.findByIdAndDelete(params.id);
    
    if (!receivable) {
      return NextResponse.json({ error: 'Kayıt bulunamadı' }, { status: 404 });
    }

    return NextResponse.json({ message: 'Kayıt silindi' });
  } catch (error) {
    console.error('Receivables DELETE error:', error);
    return NextResponse.json({ error: 'Kayıt silinemedi' }, { status: 500 });
  }
}
