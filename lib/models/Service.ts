import mongoose from 'mongoose';

const ServiceSchema = new mongoose.Schema({
  // Kayıtlı müşteri referansı (yeni) - opsiyonel
  customerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    required: false,
    default: null
  },
  
  // Müşteri bilgileri - kayıtlı müşteri seçilirse otomatik doldurulur
  customerName: {
    type: String,
    required: true,
    trim: true
  },
  customerPhone: {
    type: String,
    required: true,
    trim: true
  },
  customerAddress: {
    type: String,
    default: ''
  },
  customerEmail: {
    type: String,
    default: ''
  },
  
  // Kayıtlı müşteri mi yoksa tek seferlik mi? (eski veriler için default false)
  isRegisteredCustomer: {
    type: Boolean,
    default: false
  },
  
  scooterBrand: {
    type: String,
    required: true
  },
  scooterModel: {
    type: String,
    required: true
  },
  serialNumber: {
    type: String,
    default: ''
  },
  problem: {
    type: String,
    required: true
  },
  solution: {
    type: String,
    default: ''
  },
  cost: {
    type: Number,
    required: true,
    min: 0
  },
  laborCost: {
    type: Number,
    default: 0,
    min: 0
  },
  partsCost: {
    type: Number,
    default: 0,
    min: 0
  },
  status: {
    type: String,
    enum: ['beklemede', 'devam-ediyor', 'tamamlandi', 'iptal'],
    default: 'beklemede'
  },
  receivedDate: {
    type: Date,
    default: Date.now
  },
  completedDate: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: ''
  },
  warrantyDays: {
    type: Number,
    default: 30
  },
  
  // Müşteri memnuniyeti puanı (1-5) - opsiyonel
  customerRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  
  // Müşteri yorumu - opsiyonel
  customerFeedback: {
    type: String,
    default: ''
  }
}, {
  timestamps: true
});

// Servis tamamlandığında müşteri istatistiklerini güncelle (sadece kayıtlı müşteriler için)
ServiceSchema.post('save', async function(doc) {
  if (doc.isRegisteredCustomer && doc.customerId && doc.status === 'tamamlandi') {
    try {
      const mongoose = require('mongoose');
      const db = mongoose.connection.db;
      
      // Müşteri istatistiklerini güncelle
      await db.collection('customers').updateOne(
        { _id: doc.customerId },
        { 
          $inc: { 
            totalSpent: doc.cost,
            visitCount: 1
          },
          $set: { 
            lastVisit: new Date(),
            updatedAt: new Date().toISOString()
          }
        }
      );
      
      console.log('✅ Müşteri istatistikleri güncellendi:', doc.customerId);
    } catch (error) {
      console.error('❌ Müşteri istatistikleri güncellenirken hata:', error);
    }
  }
});

// Eski veriler için middleware - eksik alanları default değerlerle doldur
ServiceSchema.pre('find', function() {
  this.select({
    customerId: 1,
    customerName: 1,
    customerPhone: 1,
    customerAddress: 1,
    customerEmail: 1,
    isRegisteredCustomer: 1,
    scooterBrand: 1,
    scooterModel: 1,
    serialNumber: 1,
    problem: 1,
    solution: 1,
    cost: 1,
    laborCost: 1,
    partsCost: 1,
    status: 1,
    receivedDate: 1,
    completedDate: 1,
    notes: 1,
    warrantyDays: 1,
    customerRating: 1,
    customerFeedback: 1,
    createdAt: 1,
    updatedAt: 1
  });
});

export default mongoose.models.Service || mongoose.model('Service', ServiceSchema);