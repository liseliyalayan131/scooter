import { create } from 'zustand';
import { persist } from 'zustand/middleware';

interface UserPreferences {
  // Dashboard preferences
  dashboardRefreshInterval: number; // milliseconds
  defaultTransactionType: 'gelir' | 'gider' | 'satis';
  defaultCurrency: 'TRY' | 'USD' | 'EUR';
  
  // Notification preferences
  enableNotifications: boolean;
  enableSound: boolean;
  notificationFrequency: number; // minutes
  
  // Display preferences
  itemsPerPage: number;
  dateFormat: 'tr-TR' | 'en-US' | 'en-GB';
  numberFormat: 'tr-TR' | 'en-US' | 'en-GB';
  
  // Business settings
  defaultKdvRate: number;
  defaultProfitMargin: number;
  lowStockThreshold: number;
  
  // Form preferences
  autoSaveInterval: number; // seconds
  rememberFormData: boolean;
}

interface UserState {
  preferences: UserPreferences;
  
  // User info (if authentication is added)
  user: {
    name?: string;
    email?: string;
    role?: 'admin' | 'user';
  } | null;
  
  // Recent activities for quick access
  recentCustomers: Array<{
    id: string;
    name: string;
    phone: string;
    lastTransaction: string;
  }>;
  
  recentProducts: Array<{
    id: string;
    name: string;
    lastSold: string;
  }>;
  
  // Actions
  updatePreferences: (preferences: Partial<UserPreferences>) => void;
  resetPreferences: () => void;
  setUser: (user: UserState['user']) => void;
  addRecentCustomer: (customer: UserState['recentCustomers'][0]) => void;
  addRecentProduct: (product: UserState['recentProducts'][0]) => void;
  clearRecentActivities: () => void;
}

const defaultPreferences: UserPreferences = {
  dashboardRefreshInterval: 30000, // 30 seconds
  defaultTransactionType: 'gelir',
  defaultCurrency: 'TRY',
  
  enableNotifications: true,
  enableSound: false,
  notificationFrequency: 5, // 5 minutes
  
  itemsPerPage: 20,
  dateFormat: 'tr-TR',
  numberFormat: 'tr-TR',
  
  defaultKdvRate: 20,
  defaultProfitMargin: 30,
  lowStockThreshold: 5,
  
  autoSaveInterval: 30, // 30 seconds
  rememberFormData: true,
};

export const useUserStore = create<UserState>()(
  persist(
    (set, get) => ({
      preferences: defaultPreferences,
      user: null,
      recentCustomers: [],
      recentProducts: [],

      updatePreferences: (newPreferences) => {
        set((state) => ({
          preferences: { ...state.preferences, ...newPreferences },
        }));
      },

      resetPreferences: () => {
        set({ preferences: defaultPreferences });
      },

      setUser: (user) => {
        set({ user });
      },

      addRecentCustomer: (customer) => {
        set((state) => {
          const filtered = state.recentCustomers.filter(c => c.id !== customer.id);
          return {
            recentCustomers: [customer, ...filtered].slice(0, 10), // Keep last 10
          };
        });
      },

      addRecentProduct: (product) => {
        set((state) => {
          const filtered = state.recentProducts.filter(p => p.id !== product.id);
          return {
            recentProducts: [product, ...filtered].slice(0, 10), // Keep last 10
          };
        });
      },

      clearRecentActivities: () => {
        set({ recentCustomers: [], recentProducts: [] });
      },
    }),
    {
      name: 'user-storage',
    }
  )
);

// Preference selectors for easy access
export const useUserPreferences = () => useUserStore((state) => state.preferences);
export const useCurrencyFormat = () => {
  const { defaultCurrency, numberFormat } = useUserStore((state) => state.preferences);
  
  return (amount: number) => {
    return new Intl.NumberFormat(numberFormat, {
      style: 'currency',
      currency: defaultCurrency,
    }).format(amount);
  };
};

export const useDateFormat = () => {
  const { dateFormat } = useUserStore((state) => state.preferences);
  
  return (date: Date | string) => {
    const dateObj = typeof date === 'string' ? new Date(date) : date;
    return new Intl.DateTimeFormat(dateFormat, {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(dateObj);
  };
};
