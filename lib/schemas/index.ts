import { z } from 'zod';

// Customer Schema
export const customerSchema = z.object({
  firstName: z
    .string()
    .min(2, 'Ad en az 2 karakter olmalıdır')
    .max(50, 'Ad en fazla 50 karakter olabilir')
    .trim(),
  
  lastName: z
    .string()
    .min(2, 'Soyad en az 2 karakter olmalıdır')
    .max(50, 'Soyad en fazla 50 karakter olabilir')
    .trim(),
  
  phone: z
    .string()
    .regex(/^[0-9+\s()-]+$/, 'Geçerli bir telefon numarası giriniz')
    .min(10, 'Telefon numarası en az 10 karakter olmalıdır')
    .max(20, 'Telefon numarası en fazla 20 karakter olabilir'),
  
  email: z
    .string()
    .email('Geçerli bir e-posta adresi giriniz')
    .max(100, 'E-posta adresi en fazla 100 karakter olabilir')
    .optional()
    .or(z.literal('')),
  
  address: z
    .string()
    .max(200, 'Adres en fazla 200 karakter olabilir')
    .optional()
    .default(''),
  
  birthDate: z
    .date()
    .max(new Date(), 'Doğum tarihi gelecekte olamaz')
    .optional(),
  
  notes: z
    .string()
    .max(500, 'Notlar en fazla 500 karakter olabilir')
    .optional()
    .default(''),
  
  // Discount card info
  discountCard: z
    .object({
      cardNumber: z
        .string()
        .min(5, 'Kart numarası en az 5 karakter olmalıdır')
        .max(20, 'Kart numarası en fazla 20 karakter olabilir'),
      
      discountPercentage: z
        .number()
        .min(0, 'İndirim oranı negatif olamaz')
        .max(100, 'İndirim oranı 100\'den fazla olamaz'),
      
      expiryDate: z
        .date()
        .min(new Date(), 'Son kullanma tarihi geçmiş olamaz'),
      
      isActive: z
        .boolean()
        .default(true),
    })
    .optional(),
});

export type CustomerFormData = z.infer<typeof customerSchema>;

// Service Schema
export const serviceSchema = z.object({
  customerName: z
    .string()
    .min(2, 'Müşteri adı en az 2 karakter olmalıdır')
    .max(50, 'Müşteri adı en fazla 50 karakter olabilir')
    .trim(),
  
  customerPhone: z
    .string()
    .regex(/^[0-9+\s()-]+$/, 'Geçerli bir telefon numarası giriniz')
    .min(10, 'Telefon numarası en az 10 karakter olmalıdır')
    .max(20, 'Telefon numarası en fazla 20 karakter olabilir'),
  
  customerAddress: z
    .string()
    .max(200, 'Adres en fazla 200 karakter olabilir')
    .optional()
    .default(''),
  
  scooterBrand: z
    .string()
    .min(2, 'Scooter markası en az 2 karakter olmalıdır')
    .max(50, 'Scooter markası en fazla 50 karakter olabilir')
    .trim(),
  
  scooterModel: z
    .string()
    .min(2, 'Scooter modeli en az 2 karakter olmalıdır')
    .max(50, 'Scooter modeli en fazla 50 karakter olabilir')
    .trim(),
  
  serialNumber: z
    .string()
    .max(50, 'Seri numarası en fazla 50 karakter olabilir')
    .optional()
    .default(''),
  
  problem: z
    .string()
    .min(10, 'Problem açıklaması en az 10 karakter olmalıdır')
    .max(1000, 'Problem açıklaması en fazla 1000 karakter olabilir')
    .trim(),
  
  solution: z
    .string()
    .max(1000, 'Çözüm açıklaması en fazla 1000 karakter olabilir')
    .optional()
    .default(''),
  
  cost: z
    .number()
    .min(0, 'Maliyet negatif olamaz')
    .max(100000, 'Maliyet çok yüksek'),
  
  laborCost: z
    .number()
    .min(0, 'İşçilik maliyeti negatif olamaz')
    .max(100000, 'İşçilik maliyeti çok yüksek')
    .optional()
    .default(0),
  
  partsCost: z
    .number()
    .min(0, 'Parça maliyeti negatif olamaz')
    .max(100000, 'Parça maliyeti çok yüksek')
    .optional()
    .default(0),
  
  status: z
    .enum(['beklemede', 'devam-ediyor', 'tamamlandi', 'iptal'], {
      required_error: 'Durum seçilmelidir',
      invalid_type_error: 'Geçersiz durum',
    })
    .default('beklemede'),
  
  receivedDate: z
    .date()
    .max(new Date(), 'Teslim alma tarihi gelecekte olamaz')
    .optional()
    .default(() => new Date()),
  
  completedDate: z
    .date()
    .optional(),
  
  notes: z
    .string()
    .max(500, 'Notlar en fazla 500 karakter olabilir')
    .optional()
    .default(''),
  
  warrantyDays: z
    .number()
    .int('Garanti süresi tam sayı olmalıdır')
    .min(0, 'Garanti süresi negatif olamaz')
    .max(365, 'Garanti süresi en fazla 365 gün olabilir')
    .optional()
    .default(30),
  
}).superRefine((data, ctx) => {
  // Total cost should equal labor + parts cost if both are provided
  if (data.laborCost && data.partsCost) {
    const totalCalculated = data.laborCost + data.partsCost;
    if (Math.abs(data.cost - totalCalculated) > 0.01) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Toplam maliyet işçilik ve parça maliyetinin toplamına eşit olmalıdır',
        path: ['cost'],
      });
    }
  }
  
  // Completed date must be after received date
  if (data.completedDate && data.receivedDate && data.completedDate < data.receivedDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Tamamlanma tarihi teslim alma tarihinden önce olamaz',
      path: ['completedDate'],
    });
  }
  
  // If status is completed, completed date must be provided
  if (data.status === 'tamamlandi' && !data.completedDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Tamamlanan servisler için tamamlanma tarihi gereklidir',
      path: ['completedDate'],
    });
  }
  
  // If status is completed, solution should be provided
  if (data.status === 'tamamlandi' && (!data.solution || data.solution.trim() === '')) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Tamamlanan servisler için çözüm açıklaması gereklidir',
      path: ['solution'],
    });
  }
});

export type ServiceFormData = z.infer<typeof serviceSchema>;

// Receivable Schema
export const receivableSchema = z.object({
  firstName: z
    .string()
    .min(2, 'Ad en az 2 karakter olmalıdır')
    .max(50, 'Ad en fazla 50 karakter olabilir')
    .trim(),
  
  lastName: z
    .string()
    .min(2, 'Soyad en az 2 karakter olmalıdır')
    .max(50, 'Soyad en fazla 50 karakter olabilir')
    .trim(),
  
  phone: z
    .string()
    .regex(/^[0-9+\s()-]+$/, 'Geçerli bir telefon numarası giriniz')
    .min(10, 'Telefon numarası en az 10 karakter olmalıdır')
    .max(20, 'Telefon numarası en fazla 20 karakter olabilir'),
  
  amount: z
    .number()
    .min(0.01, 'Tutar 0\'dan büyük olmalıdır')
    .max(10000000, 'Tutar çok yüksek'),
  
  description: z
    .string()
    .min(3, 'Açıklama en az 3 karakter olmalıdır')
    .max(500, 'Açıklama en fazla 500 karakter olabilir')
    .trim(),
  
  type: z
    .enum(['alacak', 'verecek'], {
      required_error: 'Tür seçilmelidir',
      invalid_type_error: 'Geçersiz tür',
    }),
  
  status: z
    .enum(['odenmedi', 'odendi'])
    .default('odenmedi'),
  
  dueDate: z
    .date()
    .min(new Date(), 'Vade tarihi geçmiş olamaz')
    .optional(),
  
  paidDate: z
    .date()
    .optional(),
  
  notes: z
    .string()
    .max(500, 'Notlar en fazla 500 karakter olabilir')
    .optional()
    .default(''),
  
}).superRefine((data, ctx) => {
  // If status is paid, paid date must be provided
  if (data.status === 'odendi' && !data.paidDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ödenen hesaplar için ödeme tarihi gereklidir',
      path: ['paidDate'],
    });
  }
  
  // Paid date cannot be in the future
  if (data.paidDate && data.paidDate > new Date()) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: 'Ödeme tarihi gelecekte olamaz',
      path: ['paidDate'],
    });
  }
});

export type ReceivableFormData = z.infer<typeof receivableSchema>;
