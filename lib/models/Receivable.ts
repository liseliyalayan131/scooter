import mongoose from 'mongoose';

const ReceivableSchema = new mongoose.Schema({
  // Müşteri ilişkisi (YENİ - ENTEGRASYON)
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: false
  },
  
  // Müşteri bilgileri (geri uyumluluk için)
  firstName: {
    type: String,
    required: true,
    trim: true
  },
  lastName: {
    type: String,
    required: true,
    trim: true
  },
  phone: {
    type: String,
    required: true,
    trim: true
  },
  
  // Kayıtlı müşteri mi?
  isRegisteredCustomer: {
    type: Boolean,
    default: false
  },
  
  amount: {
    type: Number,
    required: true,
    min: 0
  },
  description: {
    type: String,
    default: ''
  },
  type: {
    type: String,
    enum: ['alacak', 'verecek'],
    required: true
  },
  status: {
    type: String,
    enum: ['odenmedi', 'odendi', 'kismi'],
    default: 'odenmedi'
  },
  
  // Ödeme planı (YENİ)
  paymentPlan: {
    type: String,
    enum: ['single', 'installment'],
    default: 'single'
  },
  
  // Taksit bilgileri (YENİ)
  installments: [{
    amount: {
      type: Number,
      required: true
    },
    dueDate: {
      type: Date,
      required: true
    },
    paidDate: {
      type: Date,
      default: null
    },
    status: {
      type: String,
      enum: ['odenmedi', 'odendi'],
      default: 'odenmedi'
    }
  }],
  
  // İşlem referansı (eğer satıştan kaynaklanıyorsa)
  transactionId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Transaction',
    required: false
  },
  
  // Servis referansı (eğer servisten kaynaklanıyorsa)
  serviceId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Service',
    required: false
  },
  
  dueDate: {
    type: Date,
    default: null
  },
  paidDate: {
    type: Date,
    default: null
  },
  
  // Ödenen miktar (kısmi ödemeler için)
  paidAmount: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Kalan miktar
  remainingAmount: {
    type: Number,
    default: 0
  },
  
  notes: {
    type: String,
    default: ''
  },
  
  // Öncelik seviyesi
  priority: {
    type: String,
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal'
  }
}, {
  timestamps: true
});

// Kalan miktar hesaplama middleware
ReceivableSchema.pre('save', function(next) {
  this.remainingAmount = this.amount - this.paidAmount;
  
  // Durum güncelleme
  if (this.paidAmount === 0) {
    this.status = 'odenmedi';
  } else if (this.paidAmount >= this.amount) {
    this.status = 'odendi';
    this.paidDate = this.paidDate || new Date();
  } else {
    this.status = 'kismi';
  }
  
  next();
});

// Ödeme sonrası müşteri istatistiklerini güncelle
ReceivableSchema.post('save', async function(doc) {
  if (doc.isRegisteredCustomer && doc.customerId && doc.status === 'odendi') {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      // Müşteri güvenilirlik puanını güncelle
      await db.collection('customers').updateOne(
        { _id: doc.customerId },
        { 
          $inc: { 
            loyaltyPoints: 5 // Ödeme yaptığı için bonus puan
          },
          $set: { 
            updatedAt: new Date().toISOString()
          }
        }
      );
      
      console.log('✅ Müşteri güvenilirlik puanı güncellendi (Receivable):', doc.customerId);
    } catch (error) {
      console.error('❌ Müşteri puanı güncellenirken hata (Receivable):', error);
    }
  }
});

export default mongoose.models.Receivable || mongoose.model('Receivable', ReceivableSchema);