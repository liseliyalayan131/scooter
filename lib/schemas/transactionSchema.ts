import { z } from 'zod';

// Transaction Schema
export const transactionSchema = z.object({
  type: z.enum(['gelir', 'gider', 'satis'], {
    required_error: 'İşlem türü seçilmelidir',
    invalid_type_error: 'Geçersiz işlem türü',
  }),
  
  amount: z
    .number()
    .min(0.01, 'Tutar 0\'dan büyük olmalıdır')
    .max(10000000, 'Tutar çok yüksek'),
  
  description: z
    .string()
    .min(3, 'Açıklama en az 3 karakter olmalıdır')
    .max(500, 'Açıklama en fazla 500 karakter olabilir')
    .trim(),
  
  category: z
    .string()
    .min(1, 'Kategori seçilmelidir'),
  
  // Optional fields for sales
  customerName: z
    .string()
    .min(2, 'Müşteri adı en az 2 karakter olmalıdır')
    .max(50, 'Müşteri adı en fazla 50 karakter olabilir')
    .trim()
    .optional(),
  
  customerSurname: z
    .string()
    .min(2, 'Müşteri soyadı en az 2 karakter olmalıdır')
    .max(50, 'Müşteri soyadı en fazla 50 karakter olabilir')
    .trim()
    .optional(),
  
  customerPhone: z
    .string()
    .regex(/^[0-9+\s()-]+$/, 'Geçerli bir telefon numarası giriniz')
    .min(10, 'Telefon numarası en az 10 karakter olmalıdır')
    .max(20, 'Telefon numarası en fazla 20 karakter olabilir')
    .optional(),
  
  // Product related fields
  productId: z
    .string()
    .optional(),
  
  quantity: z
    .number()
    .int('Adet tam sayı olmalıdır')
    .min(1, 'Adet en az 1 olmalıdır')
    .max(10000, 'Adet çok yüksek')
    .optional()
    .default(1),
  
  // Discount fields
  discount: z
    .number()
    .min(0, 'İndirim negatif olamaz')
    .max(100000, 'İndirim tutarı çok yüksek')
    .optional()
    .default(0),
  
  discountType: z
    .enum(['tutar', 'yuzde'])
    .optional()
    .default('tutar'),
  
  originalAmount: z
    .number()
    .min(0, 'Orijinal tutar negatif olamaz')
    .optional(),
  
  // Payment type for sales
  paymentType: z
    .enum(['cash', 'credit', 'installment'])
    .optional()
    .default('cash'),
  
}).superRefine((data, ctx) => {
  // Sales transactions must have customer info
  if (data.type === 'satis') {
    if (!data.customerName || data.customerName.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Satış işlemi için müşteri adı gereklidir',
        path: ['customerName'],
      });
    }
    
    if (!data.customerSurname || data.customerSurname.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Satış işlemi için müşteri soyadı gereklidir',
        path: ['customerSurname'],
      });
    }
    
    if (!data.customerPhone || data.customerPhone.trim() === '') {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Satış işlemi için müşteri telefonu gereklidir',
        path: ['customerPhone'],
      });
    }
  }
  
  // Percentage discount validation
  if (data.discountType === 'yuzde' && data.discount > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Yüzde indirimi 100\'den fazla olamaz',
      path: ['discount'],
    });
  }
  
  // Original amount should be greater than or equal to final amount
  if (data.originalAmount && data.originalAmount < data.amount) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Orijinal tutar final tutardan küçük olamaz',
      path: ['originalAmount'],
    });
  }
});

export type TransactionFormData = z.infer<typeof transactionSchema>;

// Multi-product transaction schema (for complex sales)
export const multiProductTransactionSchema = z.object({
  type: z.literal('satis'),
  
  customerName: z
    .string()
    .min(2, 'Müşteri adı en az 2 karakter olmalıdır')
    .max(50, 'Müşteri adı en fazla 50 karakter olabilir')
    .trim(),
  
  customerSurname: z
    .string()
    .min(2, 'Müşteri soyadı en az 2 karakter olmalıdır')
    .max(50, 'Müşteri soyadı en fazla 50 karakter olabilir')
    .trim(),
  
  customerPhone: z
    .string()
    .regex(/^[0-9+\s()-]+$/, 'Geçerli bir telefon numarası giriniz')
    .min(10, 'Telefon numarası en az 10 karakter olmalıdır')
    .max(20, 'Telefon numarası en fazla 20 karakter olabilir'),
  
  products: z
    .array(
      z.object({
        productId: z.string().min(1, 'Ürün ID gereklidir'),
        quantity: z
          .number()
          .int('Adet tam sayı olmalıdır')
          .min(1, 'Adet en az 1 olmalıdır')
          .max(10000, 'Adet çok yüksek'),
        unitPrice: z
          .number()
          .min(0.01, 'Birim fiyat 0\'dan büyük olmalıdır')
          .max(1000000, 'Birim fiyat çok yüksek'),
      })
    )
    .min(1, 'En az bir ürün seçilmelidir')
    .max(50, 'En fazla 50 ürün seçilebilir'),
  
  discount: z
    .number()
    .min(0, 'İndirim negatif olamaz')
    .max(100000, 'İndirim tutarı çok yüksek')
    .optional()
    .default(0),
  
  discountType: z
    .enum(['tutar', 'yuzde'])
    .optional()
    .default('tutar'),
  
  paymentType: z
    .enum(['cash', 'credit', 'installment'])
    .optional()
    .default('cash'),
  
  category: z
    .string()
    .min(1, 'Kategori seçilmelidir')
    .optional()
    .default('Satış'),
  
}).superRefine((data, ctx) => {
  // Percentage discount validation
  if (data.discountType === 'yuzde' && data.discount > 100) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Yüzde indirimi 100\'den fazla olamaz',
      path: ['discount'],
    });
  }
});

export type MultiProductTransactionFormData = z.infer<typeof multiProductTransactionSchema>;
