import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Transaction from '@/lib/models/Transaction';
import Product from '@/lib/models/Product';

interface RouteParams {
  params: {
    id: string;
  };
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = params;
    const body = await request.json();
    
    // Eski transaction'ı al
    const oldTransaction = await Transaction.findById(id);
    if (!oldTransaction) {
      return NextResponse.json({ error: 'İşlem bulunamadı' }, { status: 404 });
    }
    
    // Eğer eski işlem satış ise ve ürün varsa stok geri ekle
    if (oldTransaction.type === 'satis' && oldTransaction.productId) {
      await Product.findByIdAndUpdate(
        oldTransaction.productId,
        { $inc: { stock: oldTransaction.quantity } }
      );
    }
    
    // İşlemi güncelle
    const updatedTransaction = await Transaction.findByIdAndUpdate(
      id,
      {
        type: body.type,
        amount: body.amount,
        description: body.description,
        category: body.category,
        productId: body.productId || null,
        quantity: body.quantity || 1,
        customerName: body.customerName || null,
        customerSurname: body.customerSurname || null,
        customerPhone: body.customerPhone || null,
      },
      { new: true }
    ).populate('productId');
    
    // Eğer yeni işlem satış ise ve ürün varsa stok düş
    if (body.type === 'satis' && body.productId) {
      await Product.findByIdAndUpdate(
        body.productId,
        { $inc: { stock: -body.quantity } }
      );
    }
    
    return NextResponse.json(updatedTransaction);
  } catch (error) {
    console.error('Transaction PUT error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'İşlem güncellenemedi: ' + errorMessage }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    await dbConnect();
    const { id } = params;
    
    // Silinecek transaction'ı al
    const transaction = await Transaction.findById(id);
    if (!transaction) {
      return NextResponse.json({ error: 'İşlem bulunamadı' }, { status: 404 });
    }
    
    // Eğer satış işlemi ise ve ürün varsa stok geri ekle
    if (transaction.type === 'satis' && transaction.productId) {
      await Product.findByIdAndUpdate(
        transaction.productId,
        { $inc: { stock: transaction.quantity } }
      );
    }
    
    // İşlemi sil
    await Transaction.findByIdAndDelete(id);
    
    return NextResponse.json({ message: 'İşlem başarıyla silindi' });
  } catch (error) {
    console.error('Transaction DELETE error:', error);
    const errorMessage = error instanceof Error ? error.message : 'Bilinmeyen hata';
    return NextResponse.json({ error: 'İşlem silinemedi: ' + errorMessage }, { status: 500 });
  }
}