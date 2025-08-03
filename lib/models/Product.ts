import mongoose from 'mongoose';

const ProductSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true
  },
  buyPrice: {
    type: Number,
    required: true,
    min: 0
  },
  sellPrice: {
    type: Number,
    required: true,
    min: 0
  },
  category: {
    type: String,
    default: 'Genel'
  },
  stock: {
    type: Number,
    default: 0,
    min: 0
  },
  minStock: {
    type: Number,
    default: 5,
    min: 0
  },
  description: {
    type: String,
    default: ''
  },
  barcode: {
    type: String,
    index: {
      unique: true,
      sparse: true
    }
  },
  


  totalSold: {
    type: Number,
    default: 0,
    min: 0
  },
  

  lastSaleDate: {
    type: Date,
    default: null
  },
  

  status: {
    type: String,
    enum: ['active', 'inactive', 'discontinued'],
    default: 'active'
  },
  

  supplier: {
    name: {
      type: String,
      default: ''
    },
    phone: {
      type: String,
      default: ''
    },
    email: {
      type: String,
      default: ''
    }
  },
  

  imageUrl: {
    type: String,
    default: ''
  },
  

  warrantyMonths: {
    type: Number,
    default: 0,
    min: 0
  },
  

  unit: {
    type: String,
    enum: ['adet', 'kg', 'lt', 'mt', 'm2', 'm3'],
    default: 'adet'
  },
  

  tags: [{
    type: String,
    trim: true
  }],
  

  priceHistory: [{
    sellPrice: {
      type: Number,
      required: true
    },
    buyPrice: {
      type: Number,
      required: true
    },
    changedAt: {
      type: Date,
      default: Date.now
    },
    reason: {
      type: String,
      default: ''
    }
  }]
}, {
  timestamps: true
});


ProductSchema.pre('save', function(next) {
  if (this.isModified('sellPrice') || this.isModified('buyPrice')) {

    this.priceHistory.push({
      sellPrice: this.sellPrice,
      buyPrice: this.buyPrice,
      changedAt: new Date(),
      reason: 'Manuel güncelleme'
    });
    

    if (this.priceHistory.length > 5) {
      this.priceHistory.splice(0, this.priceHistory.length - 5);
    }
  }
  next();
});


ProductSchema.pre('save', function(next) {
  if (this.barcode === '' || this.barcode === null) {
    this.barcode = undefined;
  }
  next();
});


ProductSchema.pre(['findOneAndUpdate', 'updateOne', 'updateMany'], function(next) {
  const update = this.getUpdate() as any;
  if (update.barcode === '' || update.barcode === null) {
    if (update.$set) {
      delete update.$set.barcode;
    } else {
      delete update.barcode;
    }
    update.$unset = update.$unset || {};
    update.$unset.barcode = 1;
  }
  next();
});


ProductSchema.virtual('profitMargin').get(function() {
  if (this.buyPrice === 0) return 0;
  return ((this.sellPrice - this.buyPrice) / this.buyPrice * 100).toFixed(2);
});


ProductSchema.virtual('stockStatus').get(function() {
  if (this.stock === 0) return 'out_of_stock';
  if (this.stock <= this.minStock) return 'low_stock';
  return 'in_stock';
});


ProductSchema.set('toJSON', { virtuals: true });
ProductSchema.set('toObject', { virtuals: true });

export default mongoose.models.Product || mongoose.model('Product', ProductSchema);