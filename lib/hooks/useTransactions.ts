import React from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useUiStore } from '../stores/uiStore';
import { useNotificationStore } from '../stores/notificationStore';
import { useUserStore } from '../stores/userStore';
import type { TransactionFormData, MultiProductTransactionFormData } from '../schemas/transactionSchema';

// Types
interface Transaction {
  _id: string;
  type: 'gelir' | 'gider' | 'satis';
  amount: number;
  description: string;
  category: string;
  productId?: string;
  quantity: number;
  customerName?: string;
  customerSurname?: string;
  customerPhone?: string;
  discount: number;
  discountType: 'tutar' | 'yuzde';
  originalAmount: number;
  createdAt: string;
  updatedAt: string;
}

interface TransactionStats {
  todayRevenue: number;
  monthlyRevenue: number;
  totalProfit: number;
  totalExpenses: number;
  serviceRevenue: number;
  netProfit: number;
  profitMargin: number;
}

// API Functions
const transactionApi = {
  getAll: async (params?: { 
    page?: number; 
    limit?: number; 
    type?: string;
    startDate?: string;
    endDate?: string;
    search?: string;
  }): Promise<Transaction[]> => {
    const query = new URLSearchParams();
    if (params?.page) query.append('page', params.page.toString());
    if (params?.limit) query.append('limit', params.limit.toString());
    if (params?.type) query.append('type', params.type);
    if (params?.startDate) query.append('startDate', params.startDate);
    if (params?.endDate) query.append('endDate', params.endDate);
    if (params?.search) query.append('search', params.search);
    
    const response = await fetch(`/api/transactions?${query}`);
    if (!response.ok) throw new Error('İşlemler alınamadı');
    return response.json();
  },

  getById: async (id: string): Promise<Transaction> => {
    const response = await fetch(`/api/transactions/${id}`);
    if (!response.ok) throw new Error('İşlem bulunamadı');
    return response.json();
  },

  getStats: async (): Promise<TransactionStats> => {
    const response = await fetch('/api/transactions/stats');
    if (!response.ok) throw new Error('İstatistikler alınamadı');
    return response.json();
  },

  create: async (data: TransactionFormData): Promise<Transaction> => {
    const response = await fetch('/api/transactions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'İşlem oluşturulamadı');
    }
    return response.json();
  },

  createMultiProduct: async (data: MultiProductTransactionFormData): Promise<Transaction> => {
    const response = await fetch('/api/transactions/multi-product', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'Çoklu ürün satışı oluşturulamadı');
    }
    return response.json();
  },

  update: async ({ id, data }: { id: string; data: Partial<TransactionFormData> }): Promise<Transaction> => {
    const response = await fetch(`/api/transactions/${id}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'İşlem güncellenemedi');
    }
    return response.json();
  },

  delete: async (id: string): Promise<void> => {
    const response = await fetch(`/api/transactions/${id}`, {
      method: 'DELETE',
    });
    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error || 'İşlem silinemedi');
    }
  },
};

// Query Keys
export const transactionKeys = {
  all: ['transactions'] as const,
  lists: () => [...transactionKeys.all, 'list'] as const,
  list: (params?: any) => [...transactionKeys.lists(), params] as const,
  details: () => [...transactionKeys.all, 'detail'] as const,
  detail: (id: string) => [...transactionKeys.details(), id] as const,
  stats: () => [...transactionKeys.all, 'stats'] as const,
  recent: () => [...transactionKeys.all, 'recent'] as const,
};

// Hooks
export const useTransactions = (params?: { 
  page?: number; 
  limit?: number; 
  type?: string;
  startDate?: string;
  endDate?: string;
  search?: string;
}) => {
  const { itemsPerPage } = useUserStore((state) => state.preferences);
  const finalParams = { limit: itemsPerPage, ...params };

  return useQuery({
    queryKey: transactionKeys.list(finalParams),
    queryFn: () => transactionApi.getAll(finalParams),
    staleTime: 2 * 60 * 1000, // 2 minutes
    gcTime: 5 * 60 * 1000, // 5 minutes
  });
};

export const useTransaction = (id: string) => {
  return useQuery({
    queryKey: transactionKeys.detail(id),
    queryFn: () => transactionApi.getById(id),
    enabled: !!id,
  });
};

export const useTransactionStats = () => {
  return useQuery({
    queryKey: transactionKeys.stats(),
    queryFn: transactionApi.getStats,
    staleTime: 30 * 1000, // 30 seconds
    refetchInterval: 60 * 1000, // Refetch every minute
  });
};

export const useRecentTransactions = (limit = 10) => {
  return useQuery({
    queryKey: [...transactionKeys.recent(), limit],
    queryFn: () => transactionApi.getAll({ limit }),
    staleTime: 60 * 1000, // 1 minute
  });
};

export const useCreateTransaction = () => {
  const queryClient = useQueryClient();
  const { setLoading, setSuccessMessage, setError } = useUiStore();
  const { addNotification } = useNotificationStore();
  const { addRecentCustomer } = useUserStore();

  return useMutation({
    mutationFn: transactionApi.create,
    onMutate: async (data) => {
      setLoading('createTransaction', true);
      setError('createTransaction', null);

      // Optimistic update for stats
      await queryClient.cancelQueries({ queryKey: transactionKeys.stats() });
      const previousStats = queryClient.getQueryData(transactionKeys.stats()) as TransactionStats | undefined;
      
      if (previousStats) {
        const updatedStats = { ...previousStats };
        if (data.type === 'gelir' || data.type === 'satis') {
          updatedStats.totalProfit += data.amount;
        } else {
          updatedStats.totalExpenses += data.amount;
        }
        updatedStats.netProfit = updatedStats.totalProfit - updatedStats.totalExpenses;
        
        queryClient.setQueryData(transactionKeys.stats(), updatedStats);
      }

      return { previousStats };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      const typeLabels = {
        gelir: 'Gelir',
        gider: 'Gider',
        satis: 'Satış',
      };
      
      setSuccessMessage('createTransaction', `${typeLabels[data.type]} başarıyla kaydedildi! 🎉`);
      
      addNotification({
        type: 'success',
        title: `✅ ${typeLabels[data.type]} Eklendi`,
        message: `${data.description} - ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(data.amount)}`,
        icon: data.type === 'gelir' ? '💰' : data.type === 'satis' ? '🛒' : '💸',
      });

      // Add customer to recent if it's a sale
      if (data.type === 'satis' && data.customerName && data.customerSurname) {
        addRecentCustomer({
          id: data._id,
          name: `${data.customerName} ${data.customerSurname}`,
          phone: data.customerPhone || '',
          lastTransaction: new Date().toISOString(),
        });
      }
    },
    onError: (error: Error, data, context) => {
      // Revert optimistic update
      if (context?.previousStats) {
        queryClient.setQueryData(transactionKeys.stats(), context.previousStats);
      }
      
      setError('createTransaction', error.message);
      addNotification({
        type: 'error',
        title: '❌ İşlem Eklenemedi',
        message: error.message,
        icon: '⚠️',
      });
    },
    onSettled: () => {
      setLoading('createTransaction', false);
    },
  });
};

export const useCreateMultiProductTransaction = () => {
  const queryClient = useQueryClient();
  const { setLoading, setSuccessMessage, setError } = useUiStore();
  const { addNotification } = useNotificationStore();
  const { addRecentCustomer } = useUserStore();

  return useMutation({
    mutationFn: transactionApi.createMultiProduct,
    onMutate: () => {
      setLoading('createMultiProductTransaction', true);
      setError('createMultiProductTransaction', null);
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      queryClient.invalidateQueries({ queryKey: ['products'] });
      
      setSuccessMessage('createMultiProductTransaction', 'Çoklu ürün satışı başarıyla kaydedildi! 🛒');
      
      addNotification({
        type: 'success',
        title: '✅ Çoklu Ürün Satışı',
        message: `${data.description} - ${new Intl.NumberFormat('tr-TR', { style: 'currency', currency: 'TRY' }).format(data.amount)}`,
        icon: '🛍️',
      });

      if (data.customerName && data.customerSurname) {
        addRecentCustomer({
          id: data._id,
          name: `${data.customerName} ${data.customerSurname}`,
          phone: data.customerPhone || '',
          lastTransaction: new Date().toISOString(),
        });
      }
    },
    onError: (error: Error) => {
      setError('createMultiProductTransaction', error.message);
      addNotification({
        type: 'error',
        title: '❌ Çoklu Ürün Satışı Başarısız',
        message: error.message,
        icon: '⚠️',
      });
    },
    onSettled: () => {
      setLoading('createMultiProductTransaction', false);
    },
  });
};

export const useUpdateTransaction = () => {
  const queryClient = useQueryClient();
  const { setLoading, setSuccessMessage, setError } = useUiStore();
  const { addNotification } = useNotificationStore();

  return useMutation({
    mutationFn: transactionApi.update,
    onMutate: async ({ id, data }) => {
      setLoading('updateTransaction', true);
      setError('updateTransaction', null);

      // Optimistic update
      await queryClient.cancelQueries({ queryKey: transactionKeys.detail(id) });
      const previousTransaction = queryClient.getQueryData(transactionKeys.detail(id));
      
      if (previousTransaction) {
        queryClient.setQueryData(transactionKeys.detail(id), { ...previousTransaction, ...data });
      }

      return { previousTransaction };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      setSuccessMessage('updateTransaction', 'İşlem başarıyla güncellendi! 🎉');
      
      addNotification({
        type: 'success',
        title: '✅ İşlem Güncellendi',
        message: data.description,
        icon: '📝',
      });
    },
    onError: (error: Error, { id }, context) => {
      // Revert optimistic update
      if (context?.previousTransaction) {
        queryClient.setQueryData(transactionKeys.detail(id), context.previousTransaction);
      }
      
      setError('updateTransaction', error.message);
      addNotification({
        type: 'error',
        title: '❌ İşlem Güncellenemedi',
        message: error.message,
        icon: '⚠️',
      });
    },
    onSettled: () => {
      setLoading('updateTransaction', false);
    },
  });
};

export const useDeleteTransaction = () => {
  const queryClient = useQueryClient();
  const { setLoading, setSuccessMessage, setError } = useUiStore();
  const { addNotification } = useNotificationStore();

  return useMutation({
    mutationFn: transactionApi.delete,
    onMutate: () => {
      setLoading('deleteTransaction', true);
      setError('deleteTransaction', null);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: transactionKeys.all });
      queryClient.invalidateQueries({ queryKey: ['dashboard'] });
      
      setSuccessMessage('deleteTransaction', 'İşlem başarıyla silindi! 🗑️');
      
      addNotification({
        type: 'info',
        title: '🗑️ İşlem Silindi',
        message: 'İşlem başarıyla silindi',
        icon: '💼',
      });
    },
    onError: (error: Error) => {
      setError('deleteTransaction', error.message);
      addNotification({
        type: 'error',
        title: '❌ İşlem Silinemedi',
        message: error.message,
        icon: '⚠️',
      });
    },
    onSettled: () => {
      setLoading('deleteTransaction', false);
    },
  });
};

// Utility hooks
export const useTransactionFilters = () => {
  const [filters, setFilters] = React.useState({
    type: '',
    startDate: '',
    endDate: '',
    search: '',
  });

  const updateFilter = React.useCallback((key: string, value: string) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  }, []);

  const clearFilters = React.useCallback(() => {
    setFilters({ type: '', startDate: '', endDate: '', search: '' });
  }, []);

  return { filters, updateFilter, clearFilters };
};

export const useTransactionSummary = (transactions?: Transaction[]) => {
  return React.useMemo(() => {
    if (!transactions) return null;

    const summary = transactions.reduce(
      (acc, transaction) => {
        if (transaction.type === 'gelir' || transaction.type === 'satis') {
          acc.totalIncome += transaction.amount;
          acc.incomeCount++;
        } else {
          acc.totalExpense += transaction.amount;
          acc.expenseCount++;
        }
        return acc;
      },
      { totalIncome: 0, totalExpense: 0, incomeCount: 0, expenseCount: 0 }
    );

    return {
      ...summary,
      netIncome: summary.totalIncome - summary.totalExpense,
      totalTransactions: transactions.length,
    };
  }, [transactions]);
};

export const useTransactionsByType = (transactions?: Transaction[]) => {
  return React.useMemo(() => {
    if (!transactions) return { gelir: [], gider: [], satis: [] };

    return transactions.reduce(
      (acc, transaction) => {
        acc[transaction.type].push(transaction);
        return acc;
      },
      { gelir: [] as Transaction[], gider: [] as Transaction[], satis: [] as Transaction[] }
    );
  }, [transactions]);
};
