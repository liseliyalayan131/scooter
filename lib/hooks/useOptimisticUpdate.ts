import React from 'react';
import { useQueryClient, useMutation } from '@tanstack/react-query';
import { useUiStore } from '../stores/uiStore';
import { useNotificationStore } from '../stores/notificationStore';

// Generic optimistic update hook
export function useOptimisticUpdate<TData, TError = Error>() {
  const queryClient = useQueryClient();
  const { setLoading, setError, setSuccessMessage } = useUiStore();
  const { addNotification } = useNotificationStore();

  const optimisticUpdate = React.useCallback(
    async <TVariables>(
      config: {
        queryKey: readonly unknown[];
        mutationFn: (variables: TVariables) => Promise<TData>;
        updateFn: (oldData: TData | undefined, variables: TVariables) => TData;
        onSuccess?: (data: TData, variables: TVariables) => void;
        onError?: (error: TError, variables: TVariables) => void;
        loadingKey?: string;
        successMessage?: string;
        errorMessage?: string;
        notificationConfig?: {
          success?: { title: string; icon: string };
          error?: { title: string; icon: string };
        };
      }
    ) => {
      return async (variables: TVariables) => {
        const { 
          queryKey, 
          mutationFn, 
          updateFn, 
          onSuccess, 
          onError, 
          loadingKey,
          successMessage,
          errorMessage,
          notificationConfig
        } = config;
        
        if (loadingKey) {
          setLoading(loadingKey, true);
          setError(loadingKey, null);
        }

        // Cancel any outgoing refetches
        await queryClient.cancelQueries({ queryKey });

        // Snapshot the previous value
        const previousData = queryClient.getQueryData<TData>(queryKey);

        // Optimistically update to the new value
        queryClient.setQueryData<TData>(queryKey, (oldData) => 
          updateFn(oldData, variables)
        );

        try {
          // Perform the mutation
          const result = await mutationFn(variables);
          
          // Call success callback
          onSuccess?.(result, variables);
          
          // Show success message and notification
          if (successMessage && loadingKey) {
            setSuccessMessage(loadingKey, successMessage);
          }
          
          if (notificationConfig?.success) {
            addNotification({
              type: 'success',
              title: notificationConfig.success.title,
              message: successMessage || 'İşlem başarılı',
              icon: notificationConfig.success.icon,
            });
          }
          
          return result;
        } catch (error) {
          // Revert to previous data on error
          queryClient.setQueryData(queryKey, previousData);
          
          const errorObj = error as TError;
          
          // Call error callback
          onError?.(errorObj, variables);
          
          // Show error message and notification
          const finalErrorMessage = errorMessage || (error instanceof Error ? error.message : 'Bir hata oluştu');
          
          if (loadingKey) {
            setError(loadingKey, finalErrorMessage);
          }
          
          if (notificationConfig?.error) {
            addNotification({
              type: 'error',
              title: notificationConfig.error.title,
              message: finalErrorMessage,
              icon: notificationConfig.error.icon,
            });
          }
          
          throw error;
        } finally {
          if (loadingKey) {
            setLoading(loadingKey, false);
          }
        }
      };
    },
    [queryClient, setLoading, setError, setSuccessMessage, addNotification]
  );

  return optimisticUpdate;
}

// Specific optimistic update hooks for common patterns
export function useOptimisticCreate<TData, TCreateData>(
  queryKey: readonly unknown[],
  createFn: (data: TCreateData) => Promise<TData>,
  config?: {
    loadingKey?: string;
    successMessage?: string;
    notificationConfig?: {
      success?: { title: string; icon: string };
      error?: { title: string; icon: string };
    };
  }
) {
  const queryClient = useQueryClient();
  const optimisticUpdate = useOptimisticUpdate<TData[]>();

  return optimisticUpdate({
    queryKey,
    mutationFn: async (variables: TCreateData) => {
      const result = await createFn(variables);
      return [result];
    },
    updateFn: (oldData: TData[] | undefined, newItem: TCreateData) => {
      // Add optimistic item at the beginning
      const optimisticItem = {
        ...newItem,
        _id: `temp-${Date.now()}`,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as unknown as TData;
      
      return oldData ? [optimisticItem, ...oldData] : [optimisticItem];
    },
    onSuccess: () => {
      // Invalidate queries to get real data
      queryClient.invalidateQueries({ queryKey });
    },
    ...config,
  });
}

export function useOptimisticUpdateItem<TData>(
  queryKey: readonly unknown[],
  updateFn: (id: string, data: Partial<TData>) => Promise<TData>,
  config?: {
    loadingKey?: string;
    successMessage?: string;
    notificationConfig?: {
      success?: { title: string; icon: string };
      error?: { title: string; icon: string };
    };
  }
) {
  const queryClient = useQueryClient();
  const optimisticUpdate = useOptimisticUpdate<TData[]>();

  return optimisticUpdate({
    queryKey,
    mutationFn: async ({ id, data }: { id: string; data: Partial<TData> }) => {
      const result = await updateFn(id, data);
      return [result];
    },
    updateFn: (oldData: TData[] | undefined, { id, data }: { id: string; data: Partial<TData> }) => {
      if (!oldData) return [];
      
      return oldData.map((item: any) => 
        item._id === id ? { ...item, ...data, updatedAt: new Date().toISOString() } : item
      );
    },
    onSuccess: () => {
      // Invalidate queries to get real data
      queryClient.invalidateQueries({ queryKey });
    },
    ...config,
  });
}

export function useOptimisticDelete<TData>(
  queryKey: readonly unknown[],
  deleteFn: (id: string) => Promise<void>,
  config?: {
    loadingKey?: string;
    successMessage?: string;
    notificationConfig?: {
      success?: { title: string; icon: string };
      error?: { title: string; icon: string };
    };
  }
) {
  const queryClient = useQueryClient();
  const optimisticUpdate = useOptimisticUpdate<TData[]>();

  return optimisticUpdate({
    queryKey,
    mutationFn: async (id: string) => {
      await deleteFn(id);
      return []; // Return an empty array as the item is deleted
    },
    updateFn: (oldData: TData[] | undefined, id: string) => {
      if (!oldData) return [];
      return oldData.filter((item: any) => item._id !== id);
    },
    onSuccess: () => {
      // Invalidate queries to get real data
      queryClient.invalidateQueries({ queryKey });
    },
    ...config,
  });
}

// React Query mutation with automatic optimistic updates
export function useOptimisticMutation<TData, TVariables, TError = Error>(
  config: {
    queryKey: readonly unknown[];
    mutationFn: (variables: TVariables) => Promise<TData>;
    updateFn: (oldData: TData | undefined, variables: TVariables) => TData;
    onSuccess?: (data: TData, variables: TVariables) => void;
    onError?: (error: TError, variables: TVariables) => void;
    invalidateQueries?: readonly unknown[][];
  }
) {
  const queryClient = useQueryClient();
  
  return useMutation({
    mutationFn: config.mutationFn,
    onMutate: async (variables) => {
      // Cancel any outgoing refetches
      await queryClient.cancelQueries({ queryKey: config.queryKey });

      // Snapshot the previous value
      const previousData = queryClient.getQueryData(config.queryKey);

      // Optimistically update to the new value
      queryClient.setQueryData(config.queryKey, (oldData: TData | undefined) => 
        config.updateFn(oldData, variables)
      );

      return { previousData };
    },
    onError: (error, variables, context) => {
      // Revert to previous data on error
      if (context?.previousData) {
        queryClient.setQueryData(config.queryKey, context.previousData);
      }
      
      config.onError?.(error as TError, variables);
    },
    onSuccess: (data, variables) => {
      config.onSuccess?.(data, variables);
      
      // Invalidate specified queries
      if (config.invalidateQueries) {
        config.invalidateQueries.forEach(queryKey => {
          queryClient.invalidateQueries({ queryKey });
        });
      }
    },
    onSettled: () => {
      // Always refetch the optimistically updated query
      queryClient.invalidateQueries({ queryKey: config.queryKey });
    },
  });
}
