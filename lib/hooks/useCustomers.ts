import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '../stores/uiStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useUserStore } from '../stores/userStore';

// Types
interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  birthDate?: string;
  notes?: string;
  discountCard?: {
    cardNumber: string;
    discountPercentage: number;
    expiryDate: string;
    isActive: boolean;
  };
  totalSales?: number;
  lastPurchase?: string;
  createdAt: string;
  updatedAt: string;
}

interface CustomerStats {
  totalCustomers: number;
  newCustomersThisMonth: number;
  topCustomers: Array<{
    _id: string;
    firstName: string;
    lastName: string;
    totalSales: number;
    lastPurchase: string;
  }>;
  averageOrderValue: number;
  customerRetentionRate: number;
}

// API Functions
const customerApi = {
  getAll: async (params?: { 
    page?: number; 
    limit?: number; 
    search?: string;
    sortBy?: string;
    sortOrder?: 'asc' | 'desc';
  }): Promise<Customer[]> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.search) query.append('search', params.search);
    if (params?.sortBy) query.append('sortBy', params.sortBy);
    if (params?.sortOrder) query.append('sortOrder', params.sortOrder);
    
    const response = await fetch(`/api/customers?${query}`);
    if (!response.ok) throw new Error('Müşteriler alınamadı');
    return response.json();
  },

  getById: async (id: string): Promise<Customer> => {
    const response = await fetch(`/api/customers/${id}`);
    if (!response.ok) throw new Error('Müşteri bulunamadı');
    return response.json();
  },

  getStats: async (): Promise<CustomerStats> => {
    const response = await fetch('/api/customers/stats');
    if (!response.ok) throw new Error('Müşteri istatistikleri alınamadı');
    return response.json();
  },

  create: async (data: Omit<Customer, '_id' | 'createdAt' | 'updatedAt'>): Promise<Customer> => {
    const response = await fetch('/api/customers', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Müşteri oluşturulamadı');
    }
    return response.json();
  },

  update: async ({ id, data }: { id: string; data: Partial<Customer> }): Promise<Customer> => {
    const response = await fetch(`/api/customers/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Müşteri güncellenemedi');
    }
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`/api/customers/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Müşteri silinemedi');
    }
  },

  upsert: async (data: { firstName: string; lastName: string; phone: string; saleAmount?: number }): Promise<Customer> => {
    const response = await fetch('/api/customers/upsert', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Müşteri kaydedilemedi');
    }
    return response.json();
  },
};

// Query Keys
export const customerKeys = {
  all: ['customers'] as const,
  lists: () => [...customerKeys.all, 'list'] as const,
  list: (params?: any) => [...customerKeys.lists(), params] as const,
  details: () => [...customerKeys.all, 'detail'] as const,
  detail: (id: string) => [...customerKeys.details(), id] as const,
  stats: () => [...customerKeys.all, 'stats'] as const,
  search: (term: string) => [...customerKeys.all, 'search', term] as const,
};

// Hooks
export const useCustomers = (params?: { 
  page?: number; 
  limit?: number; 
  search?: string;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}) => {
  const { itemsPerPage } = useUserStore((state) => state.preferences);
  const finalParams = { limit: itemsPerPage, ...params };

  return useQuery({
    queryKey: customerKeys.list(finalParams),
    queryFn: () => customerApi.getAll(finalParams),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCustomer = (id: string) => {
  return useQuery({
    queryKey: customerKeys.detail(id),
    queryFn: () => customerApi.getById(id),
    enabled: !!id,
  });
};

export const useCustomerStats = () => {
  return useQuery({
    queryKey: customerKeys.stats(),
    queryFn: customerApi.getStats,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useCustomerSearch = (searchTerm: string) => {
  return useQuery({
    queryKey: customerKeys.search(searchTerm),
    queryFn: () => customerApi.getAll({ search: searchTerm, limit: 20 }),
    enabled: searchTerm.length >= 2,
    staleTime: 30 * 1000, // 30 seconds
  });
};

export const useCreateCustomer = () => {
  const queryClient = useQueryClient();
  const { setLoading, setSuccessMessage, setError } = useUiStore();
  const { addNotification } = useNotificationStore();
  const { addRecentCustomer } = useUserStore();

  return useMutation({
    mutationFn: customerApi.create,
    onMutate: () => {
      setLoading('createCustomer', true);
      setError('createCustomer', null);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      setSuccessMessage('createCustomer', `${data.firstName} ${data.lastName} başarıyla eklendi! 🎉`);
      
      addNotification({
        type: 'success',
        title: '✅ Müşteri Eklendi',
        message: `${data.firstName} ${data.lastName} sistemde kaydedildi`,
        icon: '👤',
      });

      addRecentCustomer({
        id: data._id,
        name: `${data.firstName} ${data.lastName}`,
        phone: data.phone,
        lastTransaction: new Date().toISOString(),
      });
    },
    onError: (error: Error) => {
      setError('createCustomer', error.message);
      addNotification({
        type: 'error',
        title: '❌ Müşteri Eklenemedi',
        message: error.message,
        icon: '⚠️',
      });
    },
    onSettled: () => {
      setLoading('createCustomer', false);
    },
  });
};

export const useUpdateCustomer = () => {
  const queryClient = useQueryClient();
  const { setLoading, setSuccessMessage, setError } = useUiStore();
  const { addNotification } = useNotificationStore();

  return useMutation({
    mutationFn: customerApi.update,
    onMutate: async ({ id, data }) => {
      setLoading('updateCustomer', true);
      setError('updateCustomer', null);

      // Optimistic update
      await queryClient.cancelQueries({ queryKey: customerKeys.detail(id) });
      const previousCustomer = queryClient.getQueryData(customerKeys.detail(id));
      
      if (previousCustomer) {
        queryClient.setQueryData(customerKeys.detail(id), { ...previousCustomer, ...data });
      }

      return { previousCustomer };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      setSuccessMessage('updateCustomer', `${data.firstName} ${data.lastName} başarıyla güncellendi! 🎉`);
      
      addNotification({
        type: 'success',
        title: '✅ Müşteri Güncellendi',
        message: `${data.firstName} ${data.lastName} bilgileri güncellendi`,
        icon: '📝',
      });
    },
    onError: (error: Error, { id }, context) => {
      // Revert optimistic update
      if (context?.previousCustomer) {
        queryClient.setQueryData(customerKeys.detail(id), context.previousCustomer);
      }
      
      setError('updateCustomer', error.message);
      addNotification({
        type: 'error',
        title: '❌ Müşteri Güncellenemedi',
        message: error.message,
        icon: '⚠️',
      });
    },
    onSettled: () => {
      setLoading('updateCustomer', false);
    },
  });
};

export const useDeleteCustomer = () => {
  const queryClient = useQueryClient();
  const { setLoading, setSuccessMessage, setError } = useUiStore();
  const { addNotification } = useNotificationStore();

  return useMutation({
    mutationFn: customerApi.delete,
    onMutate: () => {
      setLoading('deleteCustomer', true);
      setError('deleteCustomer', null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      setSuccessMessage('deleteCustomer', 'Müşteri başarıyla silindi! 🗑️');
      
      addNotification({
        type: 'info',
        title: '🗑️ Müşteri Silindi',
        message: 'Müşteri sistemen kaldırıldı',
        icon: '👤',
      });
    },
    onError: (error: Error) => {
      setError('deleteCustomer', error.message);
      addNotification({
        type: 'error',
        title: '❌ Müşteri Silinemedi',
        message: error.message,
        icon: '⚠️',
      });
    },
    onSettled: () => {
      setLoading('deleteCustomer', false);
    },
  });
};

export const useUpsertCustomer = () => {
  const queryClient = useQueryClient();
  const { setLoading, setSuccessMessage, setError } = useUiStore();
  const { addNotification } = useNotificationStore();
  const { addRecentCustomer } = useUserStore();

  return useMutation({
    mutationFn: customerApi.upsert,
    onMutate: () => {
      setLoading('upsertCustomer', true);
      setError('upsertCustomer', null);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: customerKeys.all });
      setSuccessMessage('upsertCustomer', `${data.firstName} ${data.lastName} kaydedildi! 💾`);
      
      addRecentCustomer({
        id: data._id,
        name: `${data.firstName} ${data.lastName}`,
        phone: data.phone,
        lastTransaction: new Date().toISOString(),
      });
    },
    onError: (error: Error) => {
      setError('upsertCustomer', error.message);
      addNotification({
        type: 'error',
        title: '❌ Müşteri Kaydedilemedi',
        message: error.message,
        icon: '⚠️',
      });
    },
    onSettled: () => {
      setLoading('upsertCustomer', false);
    },
  });
};

// Utility hooks
export const useCustomerSorting = () => {
  const [sortBy, setSortBy] = React.useState<string>('createdAt');
  const [sortOrder, setSortOrder] = React.useState<'asc' | 'desc'>('desc');

  const toggleSort = React.useCallback((field: string) => {
    if (sortBy === field) {
      setSortOrder(prev => prev === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(field);
      setSortOrder('asc');
    }
  }, [sortBy]);

  const resetSort = React.useCallback(() => {
    setSortBy('createdAt');
    setSortOrder('desc');
  }, []);

  return { sortBy, sortOrder, toggleSort, resetSort };
};

export const useCustomerFilters = () => {
  const [filters, setFilters] = React.useState({
    search: '',
    hasDiscountCard: false,
    minTotalSales: 0,
    maxTotalSales: 0,
    lastPurchaseFrom: '',
    lastPurchaseTo: '',
  });

  const updateFilter = React.useCallback((key: string, value: any) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = React.useCallback(() => {
    setFilters({
      search: '',
      hasDiscountCard: false,
      minTotalSales: 0,
      maxTotalSales: 0,
      lastPurchaseFrom: '',
      lastPurchaseTo: '',
    });
  }, []);

  const hasActiveFilters = React.useMemo(() => {
    return Object.values(filters).some(value => {
      if (typeof value === 'string') return value.trim() !== '';
      if (typeof value === 'number') return value > 0;
      if (typeof value === 'boolean') return value;
      return false;
    });
  }, [filters]);

  return { filters, updateFilter, clearFilters, hasActiveFilters };
};

export const useTopCustomers = (limit = 10) => {
  return useQuery({
    queryKey: [...customerKeys.all, 'top', limit],
    queryFn: async () => {
      const customers = await customerApi.getAll({ 
        limit, 
        sortBy: 'totalSales', 
        sortOrder: 'desc' 
      });
      return customers.filter(customer => (customer.totalSales || 0) > 0);
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });
};
