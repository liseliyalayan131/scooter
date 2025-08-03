import { create } from 'zustand';

interface LoadingState {
  [key: string]: boolean;
}

interface ModalState {
  [key: string]: boolean;
}

interface UiState {

  loading: LoadingState;
  

  modals: ModalState;
  

  sidebarCollapsed: boolean;
  theme: 'dark' | 'light';
  

  errors: Record<string, string | null>;
  

  successMessages: Record<string, string | null>;
  

  setLoading: (key: string, loading: boolean) => void;
  setModal: (key: string, open: boolean) => void;
  toggleSidebar: () => void;
  setTheme: (theme: 'dark' | 'light') => void;
  setError: (key: string, error: string | null) => void;
  clearError: (key: string) => void;
  clearAllErrors: () => void;
  setSuccessMessage: (key: string, message: string | null) => void;
  clearSuccessMessage: (key: string) => void;
  clearAllSuccessMessages: () => void;
}

export const useUiStore = create<UiState>((set, get) => ({
  loading: {},
  modals: {},
  sidebarCollapsed: false,
  theme: 'dark',
  errors: {},
  successMessages: {},

  setLoading: (key, loading) => {
    set((state) => ({
      loading: { ...state.loading, [key]: loading },
    }));
  },

  setModal: (key, open) => {
    set((state) => ({
      modals: { ...state.modals, [key]: open },
    }));
  },

  toggleSidebar: () => {
    set((state) => ({
      sidebarCollapsed: !state.sidebarCollapsed,
    }));
  },

  setTheme: (theme) => {
    set({ theme });

    if (typeof window !== 'undefined') {
      document.documentElement.className = theme;
    }
  },

  setError: (key, error) => {
    set((state) => ({
      errors: { ...state.errors, [key]: error },
    }));
  },

  clearError: (key) => {
    set((state) => {
      const { [key]: _, ...rest } = state.errors;
      return { errors: rest };
    });
  },

  clearAllErrors: () => {
    set({ errors: {} });
  },

  setSuccessMessage: (key, message) => {
    set((state) => ({
      successMessages: { ...state.successMessages, [key]: message },
    }));
    

    if (message) {
      setTimeout(() => {
        get().clearSuccessMessage(key);
      }, 3000);
    }
  },

  clearSuccessMessage: (key) => {
    set((state) => {
      const { [key]: _, ...rest } = state.successMessages;
      return { successMessages: rest };
    });
  },

  clearAllSuccessMessages: () => {
    set({ successMessages: {} });
  },
}));


export const useIsLoading = (key: string) => useUiStore((state) => state.loading[key] || false);
export const useModalState = (key: string) => useUiStore((state) => state.modals[key] || false);
export const useError = (key: string) => useUiStore((state) => state.errors[key] || null);
export const useSuccessMessage = (key: string) => useUiStore((state) => state.successMessages[key] || null);
