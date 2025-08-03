import mongoose from 'mongoose';

const TransactionSchema = new mongoose.Schema({
  type: {
    type: String,
    required: true,
    enum: ['gelir', 'gider', 'satis']
  },
  amount: {
    type: Number,
    required: true
  },
  description: {
    type: String,
    required: true
  },
  category: {
    type: String,
    default: 'Genel'
  },
  
  // Ürün ilişkisi
  productId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Product',
    required: false
  },
  quantity: {
    type: Number,
    default: 1
  },
  
  // Müşteri ilişkisi (YENİ - ENTEGRASYON)
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: false
  },
  
  // Müşteri bilgileri (geri uyumluluk için)
  customerName: {
    type: String,
    required: false
  },
  customerSurname: {
    type: String,
    required: false
  },
  customerPhone: {
    type: String,
    required: false
  },
  
  // Kayıtlı müşteri mi?
  isRegisteredCustomer: {
    type: Boolean,
    default: false
  },
  
  // İndirim bilgileri
  discount: {
    type: Number,
    default: 0,
    min: 0
  },
  discountType: {
    type: String,
    enum: ['tutar', 'yuzde'],
    default: 'tutar'
  },
  originalAmount: {
    type: Number,
    default: 0
  },
  
  // Ödeme bilgileri
  paymentType: {
    type: String,
    enum: ['cash', 'credit', 'installment'],
    default: 'cash'
  },
  
  // Servis ilişkisi (eğer servis geliriyse)
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: false
  }
}, {
  timestamps: true
});

// Transaction sonrası müşteri istatistiklerini güncelle
TransactionSchema.post('save', async function(doc) {
  if (doc.isRegisteredCustomer && doc.customerId && doc.type === 'satis') {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      // Müşteri istatistiklerini güncelle
      await db.collection('customers').updateOne(
        { _id: doc.customerId },
        { 
          $inc: { 
            totalSpent: doc.amount,
            visitCount: 1,
            loyaltyPoints: Math.floor(doc.amount / 10) // Her 10 TL'ye 1 puan
          },
          $set: { 
            lastVisit: new Date(),
            updatedAt: new Date().toISOString()
          }
        }
      );
      
      console.log('✅ Müşteri istatistikleri güncellendi (Transaction):', doc.customerId);
    } catch (error) {
      console.error('❌ Müşteri istatistikleri güncellenirken hata (Transaction):', error);
    }
  }
});

export default mongoose.models.Transaction || mongoose.model('Transaction', TransactionSchema);