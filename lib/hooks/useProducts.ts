import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '../stores/uiStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useUserStore } from '../stores/userStore';
import type { ProductFormData, BulkProductFormData } from '../schemas/productSchema';

// Types
interface Product {
  _id: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  category: string;
  stock: number;
  minStock: number;
  description: string;
  barcode?: string;
  createdAt: string;
  updatedAt: string;
}

interface ProductsResponse {
  products: Product[];
  total: number;
  page: number;
  hasNext: boolean;
}

// API Functions
const productApi = {
  getAll: async (params?: { page?: number; limit?: number; search?: string }): Promise<Product[]> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    
    const response = await fetch(`/api/products?${query}`);
    if (!response.ok) throw new Error('Ürünler alınamadı');
    return response.json();
  },

  getById: async (id: string): Promise<Product> => {
    const response = await fetch(`/api/products/${id}`);
    if (!response.ok) throw new Error('Ürün bulunamadı');
    return response.json();
  },

  create: async (data: ProductFormData): Promise<Product> => {
    const response = await fetch('/api/products', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ürün oluşturulamadı');
    }
    return response.json();
  },

  update: async ({ id, data }: { id: string; data: Partial<ProductFormData> }): Promise<Product> => {
    const response = await fetch(`/api/products/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ürün güncellenemedi');
    }
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`/api/products/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Ürün silinemedi');
    }
  },

  bulkCreate: async (data: BulkProductFormData): Promise<{ successful: number; failed: number }> => {
    const response = await fetch('/api/products/bulk-upload', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ products: data }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Toplu yükleme başarısız');
    }
    return response.json();
  },

  bulkDelete: async (ids: string[]): Promise<{ deleted: number }> => {
    const response = await fetch('/api/products/bulk-delete', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ids }),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Toplu silme başarısız');
    }
    return response.json();
  },
};

// Query Keys
export const productKeys = {
  all: ['products'] as const,
  lists: () => [...productKeys.all, 'list'] as const,
  list: (params?: any) => [...productKeys.lists(), params] as const,
  details: () => [...productKeys.all, 'detail'] as const,
  detail: (id: string) => [...productKeys.details(), id] as const,
  lowStock: () => [...productKeys.all, 'lowStock'] as const,
};

// Hooks
export const useProducts = (params?: { page?: number; limit?: number; search?: string }) => {
  const { itemsPerPage } = useUserStore((state) => state.preferences);
  const finalParams = { limit: itemsPerPage, ...params };

  return useQuery({
    queryKey: productKeys.list(finalParams),
    queryFn: () => productApi.getAll(finalParams),
    staleTime: 5 * 60 * 1000, // 5 minutes
    gcTime: 10 * 60 * 1000, // 10 minutes
  });
};

export const useProduct = (id: string) => {
  return useQuery({
    queryKey: productKeys.detail(id),
    queryFn: () => productApi.getById(id),
    enabled: !!id,
  });
};

export const useLowStockProducts = () => {
  return useQuery({
    queryKey: productKeys.lowStock(),
    queryFn: async () => {
      const products = await productApi.getAll();
      return products.filter(product => product.stock <= product.minStock);
    },
    staleTime: 2 * 60 * 1000, // 2 minutes
  });
};

export const useCreateProduct = () => {
  const queryClient = useQueryClient();
  const { setLoading, setSuccessMessage, setError } = useUiStore();
  const { addNotification } = useNotificationStore();
  const { addRecentProduct } = useUserStore();

  return useMutation({
    mutationFn: productApi.create,
    onMutate: () => {
      setLoading('createProduct', true);
      setError('createProduct', null);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      setSuccessMessage('createProduct', `${data.name} başarıyla oluşturuldu! 🎉`);
      
      addNotification({
        type: 'success',
        title: '✅ Ürün Eklendi',
        message: `${data.name} başarıyla eklendi`,
        icon: '📦',
      });

      addRecentProduct({
        id: data._id,
        name: data.name,
        lastSold: new Date().toISOString(),
      });
    },
    onError: (error: Error) => {
      setError('createProduct', error.message);
      addNotification({
        type: 'error',
        title: '❌ Ürün Eklenemedi',
        message: error.message,
        icon: '⚠️',
      });
    },
    onSettled: () => {
      setLoading('createProduct', false);
    },
  });
};

export const useUpdateProduct = () => {
  const queryClient = useQueryClient();
  const { setLoading, setSuccessMessage, setError } = useUiStore();
  const { addNotification } = useNotificationStore();

  return useMutation({
    mutationFn: productApi.update,
    onMutate: async ({ id, data }) => {
      setLoading('updateProduct', true);
      setError('updateProduct', null);

      // Optimistic update
      await queryClient.cancelQueries({ queryKey: productKeys.detail(id) });
      const previousProduct = queryClient.getQueryData(productKeys.detail(id));
      
      if (previousProduct) {
        queryClient.setQueryData(productKeys.detail(id), { ...previousProduct, ...data });
      }

      return { previousProduct };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      setSuccessMessage('updateProduct', `${data.name} başarıyla güncellendi! 🎉`);
      
      addNotification({
        type: 'success',
        title: '✅ Ürün Güncellendi',
        message: `${data.name} başarıyla güncellendi`,
        icon: '📝',
      });
    },
    onError: (error: Error, { id }, context) => {
      // Revert optimistic update
      if (context?.previousProduct) {
        queryClient.setQueryData(productKeys.detail(id), context.previousProduct);
      }
      
      setError('updateProduct', error.message);
      addNotification({
        type: 'error',
        title: '❌ Ürün Güncellenemedi',
        message: error.message,
        icon: '⚠️',
      });
    },
    onSettled: () => {
      setLoading('updateProduct', false);
    },
  });
};

export const useDeleteProduct = () => {
  const queryClient = useQueryClient();
  const { setLoading, setSuccessMessage, setError } = useUiStore();
  const { addNotification } = useNotificationStore();

  return useMutation({
    mutationFn: productApi.delete,
    onMutate: () => {
      setLoading('deleteProduct', true);
      setError('deleteProduct', null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      setSuccessMessage('deleteProduct', 'Ürün başarıyla silindi! 🗑️');
      
      addNotification({
        type: 'info',
        title: '🗑️ Ürün Silindi',
        message: 'Ürün başarıyla silindi',
        icon: '📦',
      });
    },
    onError: (error: Error) => {
      setError('deleteProduct', error.message);
      addNotification({
        type: 'error',
        title: '❌ Ürün Silinemedi',
        message: error.message,
        icon: '⚠️',
      });
    },
    onSettled: () => {
      setLoading('deleteProduct', false);
    },
  });
};

export const useBulkCreateProducts = () => {
  const queryClient = useQueryClient();
  const { setLoading, setSuccessMessage, setError } = useUiStore();
  const { addNotification } = useNotificationStore();

  return useMutation({
    mutationFn: productApi.bulkCreate,
    onMutate: () => {
      setLoading('bulkCreateProducts', true);
      setError('bulkCreateProducts', null);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      setSuccessMessage('bulkCreateProducts', 
        `${result.successful} ürün başarıyla yüklendi! ${result.failed > 0 ? `${result.failed} ürün başarısız.` : ''} 📦`
      );
      
      addNotification({
        type: result.failed > 0 ? 'warning' : 'success',
        title: '📦 Toplu Yükleme Tamamlandı',
        message: `${result.successful} başarılı, ${result.failed} başarısız`,
        icon: '📊',
      });
    },
    onError: (error: Error) => {
      setError('bulkCreateProducts', error.message);
      addNotification({
        type: 'error',
        title: '❌ Toplu Yükleme Başarısız',
        message: error.message,
        icon: '⚠️',
      });
    },
    onSettled: () => {
      setLoading('bulkCreateProducts', false);
    },
  });
};

export const useBulkDeleteProducts = () => {
  const queryClient = useQueryClient();
  const { setLoading, setSuccessMessage, setError } = useUiStore();
  const { addNotification } = useNotificationStore();

  return useMutation({
    mutationFn: productApi.bulkDelete,
    onMutate: () => {
      setLoading('bulkDeleteProducts', true);
      setError('bulkDeleteProducts', null);
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: productKeys.all });
      setSuccessMessage('bulkDeleteProducts', `${result.deleted} ürün başarıyla silindi! 🗑️`);
      
      addNotification({
        type: 'info',
        title: '🗑️ Toplu Silme Tamamlandı',
        message: `${result.deleted} ürün silindi`,
        icon: '📊',
      });
    },
    onError: (error: Error) => {
      setError('bulkDeleteProducts', error.message);
      addNotification({
        type: 'error',
        title: '❌ Toplu Silme Başarısız',
        message: error.message,
        icon: '⚠️',
      });
    },
    onSettled: () => {
      setLoading('bulkDeleteProducts', false);
    },
  });
};

// Utility hooks
export const useProductSearch = (searchTerm: string) => {
  return useQuery({
    queryKey: [...productKeys.lists(), 'search', searchTerm],
    queryFn: () => productApi.getAll({ search: searchTerm }),
    enabled: searchTerm.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useProductCategories = () => {
  const { data: products } = useProducts();
  
  return React.useMemo(() => {
    if (!products) return [];
    const categories = new Set(products.map(product => product.category));
    return Array.from(categories).sort();
  }, [products]);
};
