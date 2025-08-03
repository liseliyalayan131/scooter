import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/lib/models/Product';

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const product = await Product.findById(params.id);
    
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }
    
    return NextResponse.json(product);
  } catch (error) {
    console.error('Product GET error:', error);
    return NextResponse.json({ error: 'Ürün alınamadı' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const body = await request.json();
    
    // Eğer sadece stok azaltma işlemi ise
    if (body.decreaseStock) {
      const product = await Product.findByIdAndUpdate(
        params.id,
        { $inc: { stock: -body.decreaseStock } },
        { new: true }
      );
      
      if (!product) {
        return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
      }
      
      return NextResponse.json(product);
    }
    
    // Normal güncelleme işlemi
    // Barcode boş ise çıkar
    if (body.barcode === '' || body.barcode === null || body.barcode === undefined) {
      delete body.barcode;
    }
    
    const updateData: any = {
      name: body.name,
      buyPrice: body.buyPrice,
      sellPrice: body.sellPrice,
      category: body.category,
      stock: body.stock,
      minStock: body.minStock || 5,
      description: body.description
    };
    
    // Sadece barcode varsa ekle
    if (body.barcode && body.barcode.trim() !== '') {
      updateData.barcode = body.barcode.trim();
    }
    
    const product = await Product.findByIdAndUpdate(
      params.id,
      updateData,
      { new: true }
    );

    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }

    return NextResponse.json(product);
  } catch (error) {
    console.error('Product PUT error:', error);
    return NextResponse.json({ error: 'Ürün güncellenemedi', details: error instanceof Error ? error.message : 'Bilinmeyen hata' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    await dbConnect();
    const product = await Product.findByIdAndDelete(params.id);
    
    if (!product) {
      return NextResponse.json({ error: 'Ürün bulunamadı' }, { status: 404 });
    }
    
    return NextResponse.json({ message: 'Ürün silindi' });
  } catch (error) {
    console.error('Product DELETE error:', error);
    return NextResponse.json({ error: 'Ürün silinemedi' }, { status: 500 });
  }
}