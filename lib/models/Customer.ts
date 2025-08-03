import mongoose from 'mongoose';

const CustomerSchema = new mongoose.Schema({
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
    unique: true,
    trim: true
  },
  email: {
    type: String,
    default: null,
    trim: true,
    lowercase: true
  },
  address: {
    street: {
      type: String,
      default: ''
    },
    city: {
      type: String,
      default: ''
    },
    district: {
      type: String,
      default: ''
    },
    postalCode: {
      type: String,
      default: ''
    }
  },
  birthDate: {
    type: Date,
    default: null
  },
  notes: {
    type: String,
    default: null
  },
  
  // Müşteri sadakat sistemi (GELİŞTİRİLDİ)
  loyaltyPoints: {
    type: Number,
    default: 0,
    min: 0
  },
  totalSpent: {
    type: Number,
    default: 0,
    min: 0
  },
  visitCount: {
    type: Number,
    default: 0,
    min: 0
  },
  lastVisit: {
    type: Date,
    default: null
  },
  
  // İndirim kartı (GELİŞTİRİLDİ)
  discountCard: {
    cardNumber: {
      type: String,
      default: null
    },
    discountPercentage: {
      type: Number,
      default: 0,
      min: 0,
      max: 100
    },
    expiryDate: {
      type: Date,
      default: null
    },
    isActive: {
      type: Boolean,
      default: false
    }
  },
  
  // Müşteri tipi (OTOMATIK HESAPLAMA)
  customerType: {
    type: String,
    enum: ['normal', 'vip', 'premium', 'gold'],
    default: 'normal'
  },
  
  // Müşteri durumu
  status: {
    type: String,
    enum: ['active', 'inactive', 'blocked'],
    default: 'active'
  },
  
  // Tercihler (GELİŞTİRİLDİ)
  preferences: {
    emailNotifications: {
      type: Boolean,
      default: true
    },
    smsNotifications: {
      type: Boolean,
      default: true
    },
    promotionalEmails: {
      type: Boolean,
      default: false
    },
    preferredContactMethod: {
      type: String,
      enum: ['phone', 'email', 'sms'],
      default: 'phone'
    }
  },
  
  // Müşteri puanı (1-5) - ortalama memnuniyet
  customerRating: {
    type: Number,
    min: 1,
    max: 5,
    default: null
  },
  
  // Finansal bilgiler (YENİ)
  creditLimit: {
    type: Number,
    default: 0,
    min: 0
  },
  currentDebt: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Müşteri segmentasyonu (YENİ)
  segment: {
    type: String,
    enum: ['new', 'regular', 'loyal', 'champion', 'at_risk', 'lost'],
    default: 'new'
  },
  
  // Son satın alma tarihi
  lastPurchaseDate: {
    type: Date,
    default: null
  },
  
  // Favori kategoriler (en çok satın aldığı)
  favoriteCategories: [{
    category: {
      type: String,
      required: true
    },
    purchaseCount: {
      type: Number,
      default: 1
    },
    totalSpent: {
      type: Number,
      default: 0
    }
  }],
  
  // İletişim geçmişi
  communicationLog: [{
    type: {
      type: String,
      enum: ['phone', 'email', 'sms', 'visit', 'complaint', 'feedback'],
      required: true
    },
    subject: {
      type: String,
      required: true
    },
    notes: {
      type: String,
      default: ''
    },
    date: {
      type: Date,
      default: Date.now
    },
    staff: {
      type: String,
      default: ''
    }
  }],
  
  // Referans sistemi
  referredBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Customer',
    default: null
  },
  referralCount: {
    type: Number,
    default: 0
  },
  
  // GDPR ve Pazarlama İzinleri
  consents: {
    dataProcessing: {
      type: Boolean,
      default: true
    },
    marketing: {
      type: Boolean,
      default: false
    },
    dataSharing: {
      type: Boolean,
      default: false
    },
    consentDate: {
      type: Date,
      default: Date.now
    }
  }
}, {
  timestamps: true
});

// Müşteri tipi otomatik güncelleme (GELİŞTİRİLDİ)
CustomerSchema.pre('save', function(next) {
  // Müşteri tipi hesaplama
  const totalSpent = this.totalSpent || 0;
  const visitCount = this.visitCount || 0;
  const loyaltyPoints = this.loyaltyPoints || 0;
  
  if (totalSpent >= 15000 && visitCount >= 20 && loyaltyPoints >= 1000) {
    this.customerType = 'gold';
  } else if (totalSpent >= 10000 && visitCount >= 15) {
    this.customerType = 'premium';
  } else if (totalSpent >= 5000 && visitCount >= 10) {
    this.customerType = 'vip';
  } else {
    this.customerType = 'normal';
  }
  
  // Müşteri segmentasyonu
  const daysSinceLastPurchase = this.lastPurchaseDate 
    ? Math.floor((Date.now() - this.lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24))
    : 999;
  
  if (!this.lastPurchaseDate) {
    this.segment = 'new';
  } else if (daysSinceLastPurchase <= 30 && visitCount >= 10) {
    this.segment = 'champion';
  } else if (daysSinceLastPurchase <= 60 && visitCount >= 5) {
    this.segment = 'loyal';
  } else if (daysSinceLastPurchase <= 90) {
    this.segment = 'regular';
  } else if (daysSinceLastPurchase <= 180) {
    this.segment = 'at_risk';
  } else {
    this.segment = 'lost';
  }
  
  // Aktif indirim kartı kontrolü
  if (this.discountCard && this.discountCard.expiryDate) {
    this.discountCard.isActive = this.discountCard.expiryDate > new Date();
  }
  
  next();
});

// Müşteri tam adı virtual field
CustomerSchema.virtual('fullName').get(function() {
  return `${this.firstName} ${this.lastName}`;
});

// Tam adres virtual field  
CustomerSchema.virtual('fullAddress').get(function() {
  if (!this.address) return '';
  const parts = [
    this.address.street,
    this.address.district,
    this.address.city,
    this.address.postalCode
  ].filter(Boolean);
  return parts.join(', ');
});

// Müşteri değeri hesaplama
CustomerSchema.virtual('customerValue').get(function() {
  const monetary = this.totalSpent || 0;
  const frequency = this.visitCount || 0;
  const recency = this.lastPurchaseDate 
    ? Math.max(0, 365 - Math.floor((Date.now() - this.lastPurchaseDate.getTime()) / (1000 * 60 * 60 * 24)))
    : 0;
  
  // RFM analizi benzeri basit skoring
  return Math.round((monetary / 100) + (frequency * 10) + (recency / 10));
});

// JSON output'ta virtual field'ları dahil et
CustomerSchema.set('toJSON', { virtuals: true });
CustomerSchema.set('toObject', { virtuals: true });

// İndeksler
// CustomerSchema.index({ phone: 1 }); // Kaldırıldı - unique: true zaten index oluşturuyor
CustomerSchema.index({ email: 1 });
CustomerSchema.index({ customerType: 1 });
CustomerSchema.index({ segment: 1 });
CustomerSchema.index({ totalSpent: -1 });
CustomerSchema.index({ lastPurchaseDate: -1 });

export default mongoose.models.Customer || mongoose.model('Customer', CustomerSchema);