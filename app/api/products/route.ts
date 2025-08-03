import { NextRequest, NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';
import Product from '@/lib/models/Product';

export async function GET() {
  try {
    await dbConnect();
    const products = await Product.find({}).sort({ createdAt: -1 });
    return NextResponse.json(products);
  } catch (error) {
    console.error('Products GET error:', error);
    return NextResponse.json({ error: 'Ürünler alınamadı' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    await dbConnect();
    const body = await request.json();
    
    console.log('Gelen product data:', body);
    
    // Barcode işleme - boş, null veya undefined ise çıkar
    if (!body.barcode || body.barcode.trim() === '' || body.barcode === 'null' || body.barcode === 'undefined') {
      delete body.barcode;
      console.log('Barcode silindi çünkü boş/null');
    } else {
      body.barcode = body.barcode.trim();
      console.log('Barcode temizlendi:', body.barcode);
    }
    
    const productData: any = {
      name: body.name,
      buyPrice: body.buyPrice,
      sellPrice: body.sellPrice,
      category: body.category,
      stock: body.stock,
      minStock: body.minStock || 5,
      description: body.description
    };
    
    // Sadece barcode varsa ve dolu ise ekle
    if (body.barcode) {
      productData.barcode = body.barcode;
      console.log('Barcode eklendi:', body.barcode);
    }
    
    console.log('Kaydedilecek product data:', productData);
    
    const product = new Product(productData);
    await product.save();
    
    console.log('Product başarıyla kaydedildi:', product);
    
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    console.error('Products POST error:', error);
    
    // E11000 hatası için özel işlem
    if (error instanceof Error && error.message.includes('E11000') && error.message.includes('barcode')) {
      console.log('Barcode duplicate key hatası tespit edildi');
      return NextResponse.json({ 
        error: 'Barcode unique key hatası - lütfen sayfayı yenileyin ve tekrar deneyin',
        code: 'BARCODE_INDEX_ERROR',
        details: error.message 
      }, { status: 409 });
    }
    
    return NextResponse.json({ 
      error: 'Ürün kaydedilemedi', 
      details: error instanceof Error ? error.message : 'Bilinmeyen hata' 
    }, { status: 500 });
  }
}