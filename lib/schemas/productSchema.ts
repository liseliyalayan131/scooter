import { z } from 'zod';

// Product Schema
export const productSchema = z.object({
  name: z
    .string()
    .min(2, 'Ürün adı en az 2 karakter olmalıdır')
    .max(100, 'Ürün adı en fazla 100 karakter olabilir')
    .trim(),
  
  buyPrice: z
    .number()
    .min(0, 'Alış fiyatı 0 veya pozitif olmalıdır')
    .max(1000000, 'Alış fiyatı çok yüksek'),
  
  sellPrice: z
    .number()
    .min(0, 'Satış fiyatı 0 veya pozitif olmalıdır')
    .max(1000000, 'Satış fiyatı çok yüksek'),
  
  category: z
    .string()
    .min(1, 'Kategori seçilmelidir'),
  
  stock: z
    .number()
    .int('Stok adedi tam sayı olmalıdır')
    .min(0, 'Stok adedi negatif olamaz')
    .max(100000, 'Stok adedi çok yüksek'),
  
  minStock: z
    .number()
    .int('Minimum stok tam sayı olmalıdır')
    .min(0, 'Minimum stok negatif olamaz')
    .max(1000, 'Minimum stok çok yüksek')
    .default(5),
  
  description: z
    .string()
    .max(500, 'Açıklama en fazla 500 karakter olabilir')
    .optional()
    .default(''),
  
  barcode: z
    .string()
    .max(50, 'Barkod en fazla 50 karakter olabilir')
    .optional()
    .or(z.literal(''))
}).refine(
  (data) => data.sellPrice >= data.buyPrice,
  {
    message: 'Satış fiyatı alış fiyatından düşük olamaz',
    path: ['sellPrice'],
  }
).refine(
  (data) => data.minStock <= data.stock,
  {
    message: 'Minimum stok mevcut stoktan fazla olamaz',
    path: ['minStock'],
  }
);

export type ProductFormData = z.infer<typeof productSchema>;

// Bulk Product Schema (CSV upload için)
export const bulkProductSchema = z.array(
  z.object({
    name: z.string().min(1, 'Ürün adı gereklidir'),
    buyPrice: z.number().min(0, 'Alış fiyatı geçersiz'),
    sellPrice: z.number().min(0, 'Satış fiyatı geçersiz'),
    category: z.string().optional().default('Genel'),
    stock: z.number().int().min(0).optional().default(0),
    minStock: z.number().int().min(0).optional().default(5),
    description: z.string().optional().default(''),
    barcode: z.string().optional(),
  })
).max(1000, 'Tek seferde en fazla 1000 ürün yüklenebilir');

export type BulkProductFormData = z.infer<typeof bulkProductSchema>;
