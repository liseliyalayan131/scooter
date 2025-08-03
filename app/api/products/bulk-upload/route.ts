import { NextRequest, NextResponse } from 'next/server';
import { MongoClient } from 'mongodb';

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

export async function POST(request: NextRequest) {
  try {
    const { products } = await request.json();
    
    if (!products || !Array.isArray(products) || products.length === 0) {
      return NextResponse.json({ error: 'Geçerli ürün verisi gönderilmedi' }, { status: 400 });
    }

    const db = await connectToDatabase();
    const validCategories = ['Scooter', 'Yedek Parça', 'Aksesuar', 'Lastik', 'Batarya', 'Diğer'];
    
    let successful = 0;
    let failed = 0;
    const errors: string[] = [];

    // Her ürünü tek tek işle
    for (let i = 0; i < products.length; i++) {
      try {
        const product = products[i];
        
        // Veri doğrulama
        if (!product.name || product.name.trim() === '') {
          errors.push(`Satır ${i + 2}: Ürün adı boş olamaz`);
          failed++;
          continue;
        }

        const buyPrice = parseFloat(product.buyprice) || 0;
        const sellPrice = parseFloat(product.sellprice) || 0;
        
        if (buyPrice <= 0) {
          errors.push(`Satır ${i + 2}: Geçerli bir alış fiyatı giriniz`);
          failed++;
          continue;
        }

        if (sellPrice <= 0) {
          errors.push(`Satır ${i + 2}: Geçerli bir satış fiyatı giriniz`);
          failed++;
          continue;
        }

        // Ürün nesnesini oluştur
        const productData = {
          name: product.name.trim(),
          buyPrice: buyPrice,
          sellPrice: sellPrice,
          category: validCategories.includes(product.category) ? product.category : 'Scooter',
          stock: parseInt(product.stock) || 0,
          minStock: parseInt(product.minstock) || 5,
          description: product.description?.trim() || '',
          barcode: product.barcode?.trim() || null,
          createdAt: new Date().toISOString()
        };

        // Eğer barcode varsa, benzersizliğini kontrol et
        if (productData.barcode) {
          const existingProduct = await db.collection('products').findOne({ 
            barcode: productData.barcode 
          });
          
          if (existingProduct) {
            errors.push(`Satır ${i + 2}: Barkod "${productData.barcode}" zaten mevcut`);
            failed++;
            continue;
          }
        }

        // Aynı isimde ürün var mı kontrol et
        const duplicateName = await db.collection('products').findOne({ 
          name: { $regex: new RegExp(`^${productData.name}$`, 'i') }
        });
        
        if (duplicateName) {
          errors.push(`Satır ${i + 2}: "${productData.name}" isimli ürün zaten mevcut`);
          failed++;
          continue;
        }

        // Ürünü ekle
        await db.collection('products').insertOne(productData);
        successful++;

      } catch (error) {
        console.error(`Ürün ${i + 1} işlenirken hata:`, error);
        errors.push(`Satır ${i + 2}: İşleme hatası`);
        failed++;
      }
    }

    return NextResponse.json({ 
      successful, 
      failed, 
      errors: errors.slice(0, 10), // İlk 10 hatayı döndür
      totalErrors: errors.length,
      message: `${successful} ürün başarıyla yüklendi, ${failed} ürün başarısız`
    });

  } catch (error) {
    console.error('Bulk upload error:', error);
    return NextResponse.json({ error: 'Toplu yükleme işlemi başarısız' }, { status: 500 });
  }
}
