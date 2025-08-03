import React from 'react';
import { useForm, UseFormProps, FieldValues, Path, PathValue } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useUiStore } from '../stores/uiStore';
import { useUserStore } from '../stores/userStore';
import { productSchema } from '../schemas/productSchema';
import { transactionSchema, multiProductTransactionSchema } from '../schemas/transactionSchema';
import { customerSchema, serviceSchema, receivableSchema } from '../schemas';

// Enhanced form hook with auto-save and error handling
export function useEnhancedForm<TFieldValues extends FieldValues = FieldValues>(
  props: UseFormProps<TFieldValues> & {
    schema?: z.ZodSchema<TFieldValues>;
    autoSave?: boolean;
    autoSaveKey?: string;
    resetOnSubmitSuccess?: boolean;
    showSuccessMessage?: boolean;
  }
) {
  const { schema, autoSave, autoSaveKey, resetOnSubmitSuccess, showSuccessMessage, ...formProps } = props;
  const { setSuccessMessage, setError, clearError } = useUiStore();
  const { preferences } = useUserStore();
  
  // Create form with Zod resolver if schema provided
  const form = useForm<TFieldValues>({
    ...formProps,
    resolver: schema ? zodResolver(schema) : formProps.resolver,
  });

  const { 
    handleSubmit, 
    formState: { errors, isSubmitting, isValid, isDirty },
    reset,
    watch,
    setValue,
    clearErrors
  } = form;

  // Auto-save functionality
  const watchedValues = watch();
  
  React.useEffect(() => {
    if (autoSave && autoSaveKey && preferences.rememberFormData && isDirty) {
      const timeoutId = setTimeout(() => {
        localStorage.setItem(`form-autosave-${autoSaveKey}`, JSON.stringify(watchedValues));
      }, preferences.autoSaveInterval * 1000);

      return () => clearTimeout(timeoutId);
    }
  }, [watchedValues, autoSave, autoSaveKey, preferences.autoSaveInterval, preferences.rememberFormData, isDirty]);

  // Load auto-saved data on mount
  React.useEffect(() => {
    if (autoSave && autoSaveKey && preferences.rememberFormData) {
      const savedData = localStorage.getItem(`form-autosave-${autoSaveKey}`);
      if (savedData) {
        try {
          const parsedData = JSON.parse(savedData);
          Object.keys(parsedData).forEach(key => {
            setValue(key as Path<TFieldValues>, parsedData[key] as PathValue<TFieldValues, Path<TFieldValues>>);
          });
        } catch (error) {
          console.warn('Failed to load auto-saved form data:', error);
        }
      }
    }
  }, [autoSave, autoSaveKey, setValue, preferences.rememberFormData]);

  // Enhanced submit handler
  const onSubmit = React.useCallback((
    onValid: (data: TFieldValues) => void | Promise<void>,
    onInvalid?: (errors: any) => void
  ) => {
    return handleSubmit(
      async (data) => {
        try {
          clearError('form');
          await onValid(data);
          
          if (resetOnSubmitSuccess) {
            reset();
          }
          
          if (showSuccessMessage) {
            setSuccessMessage('form', 'Form başarıyla gönderildi! 🎉');
          }
          
          // Clear auto-saved data on successful submit
          if (autoSave && autoSaveKey) {
            localStorage.removeItem(`form-autosave-${autoSaveKey}`);
          }
        } catch (error) {
          const errorMessage = error instanceof Error ? error.message : 'Form gönderilemedi';
          setError('form', errorMessage);
          throw error;
        }
      },
      (errors) => {
        console.warn('Form validation errors:', errors);
        onInvalid?.(errors);
      }
    );
  }, [handleSubmit, clearError, setSuccessMessage, setError, reset, resetOnSubmitSuccess, showSuccessMessage, autoSave, autoSaveKey]);

  // Clear auto-saved data
  const clearAutoSavedData = React.useCallback(() => {
    if (autoSave && autoSaveKey) {
      localStorage.removeItem(`form-autosave-${autoSaveKey}`);
    }
  }, [autoSave, autoSaveKey]);

  // Enhanced reset with auto-save cleanup
  const enhancedReset = React.useCallback((values?: TFieldValues) => {
    reset(values);
    clearErrors();
    clearError('form');
    clearAutoSavedData();
  }, [reset, clearErrors, clearError, clearAutoSavedData]);

  // Get field error message
  const getFieldError = React.useCallback((fieldName: Path<TFieldValues>) => {
    return errors[fieldName]?.message as string | undefined;
  }, [errors]);

  // Check if field has error
  const hasFieldError = React.useCallback((fieldName: Path<TFieldValues>) => {
    return !!errors[fieldName];
  }, [errors]);

  // Form state helpers
  const isFormReady = isValid && !isSubmitting;
  const hasErrors = Object.keys(errors).length > 0;
  const isAutoSaveEnabled = autoSave && autoSaveKey && preferences.rememberFormData;

  return {
    ...form,
    onSubmit,
    reset: enhancedReset,
    getFieldError,
    hasFieldError,
    clearAutoSavedData,
    // Enhanced state
    isFormReady,
    hasErrors,
    isAutoSaveEnabled,
    isDirty,
    isSubmitting,
    isValid,
  };
}

// Specific form hooks for different entities
export function useProductForm(initialData?: any) {
  return useEnhancedForm({
    schema: productSchema,
    defaultValues: {
      name: '',
      buyPrice: 0,
      sellPrice: 0,
      category: 'Scooter',
      stock: 0,
      minStock: 5,
      description: '',
      barcode: '',
      ...initialData,
    },
    autoSave: true,
    autoSaveKey: 'product-form',
    resetOnSubmitSuccess: true,
    showSuccessMessage: true,
  });
}

export function useTransactionForm(initialData?: any) {
  return useEnhancedForm({
    schema: transactionSchema,
    defaultValues: {
      type: 'gelir',
      amount: 0,
      description: '',
      category: 'Genel',
      customerName: '',
      customerSurname: '',
      customerPhone: '',
      discount: 0,
      discountType: 'tutar',
      paymentType: 'cash',
      quantity: 1,
      ...initialData,
    },
    autoSave: true,
    autoSaveKey: 'transaction-form',
    resetOnSubmitSuccess: true,
    showSuccessMessage: true,
  });
}

export function useMultiProductTransactionForm(initialData?: any) {
  return useEnhancedForm({
    schema: multiProductTransactionSchema,
    defaultValues: {
      type: 'satis',
      customerName: '',
      customerSurname: '',
      customerPhone: '',
      products: [],
      discount: 0,
      discountType: 'tutar',
      paymentType: 'cash',
      category: 'Satış',
      ...initialData,
    },
    autoSave: true,
    autoSaveKey: 'multi-product-transaction-form',
    resetOnSubmitSuccess: true,
    showSuccessMessage: true,
  });
}

export function useCustomerForm(initialData?: any) {
  return useEnhancedForm({
    schema: customerSchema,
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      address: '',
      notes: '',
      ...initialData,
    },
    autoSave: true,
    autoSaveKey: 'customer-form',
    resetOnSubmitSuccess: true,
    showSuccessMessage: true,
  });
}

export function useServiceForm(initialData?: any) {
  return useEnhancedForm({
    schema: serviceSchema,
    defaultValues: {
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      scooterBrand: '',
      scooterModel: '',
      serialNumber: '',
      problem: '',
      solution: '',
      cost: 0,
      laborCost: 0,
      partsCost: 0,
      status: 'beklemede',
      receivedDate: new Date(),
      notes: '',
      warrantyDays: 30,
      ...initialData,
    },
    autoSave: true,
    autoSaveKey: 'service-form',
    resetOnSubmitSuccess: true,
    showSuccessMessage: true,
  });
}

export function useReceivableForm(initialData?: any) {
  return useEnhancedForm({
    schema: receivableSchema,
    defaultValues: {
      firstName: '',
      lastName: '',
      phone: '',
      amount: 0,
      description: '',
      type: 'alacak',
      status: 'odenmedi',
      notes: '',
      ...initialData,
    },
    autoSave: true,
    autoSaveKey: 'receivable-form',
    resetOnSubmitSuccess: true,
    showSuccessMessage: true,
  });
}

// Utility hooks for form management
export function useFormPersistence<T extends FieldValues>(key: string) {
  const { preferences } = useUserStore();
  
  const saveFormData = React.useCallback((data: T) => {
    if (preferences.rememberFormData) {
      localStorage.setItem(`form-${key}`, JSON.stringify(data));
    }
  }, [key, preferences.rememberFormData]);

  const loadFormData = React.useCallback((): T | null => {
    if (!preferences.rememberFormData) return null;
    
    try {
      const savedData = localStorage.getItem(`form-${key}`);
      return savedData ? JSON.parse(savedData) : null;
    } catch {
      return null;
    }
  }, [key, preferences.rememberFormData]);

  const clearFormData = React.useCallback(() => {
    localStorage.removeItem(`form-${key}`);
  }, [key]);

  return { saveFormData, loadFormData, clearFormData };
}

export function useFormValidation<T extends z.ZodObject<any>>(schema: T) {
  const validateField = React.useCallback((
    fieldName: keyof z.infer<T>,
    value: any
  ) => {
    try {
      (schema as z.ZodObject<any>).shape[fieldName].parse(value);
      return null;
    } catch (error) {
      if (error instanceof z.ZodError) {
        return error.errors[0]?.message || 'Geçersiz değer';
      }
      return 'Doğrulama hatası';
    }
  }, [schema]);

  const validateForm = React.useCallback((data: z.infer<T>) => {
    try {
      schema.parse(data);
      return { isValid: true, errors: {} };
    } catch (error) {
      if (error instanceof z.ZodError) {
        const errors: Record<string, string> = {};
        error.errors.forEach(err => {
          if (err.path.length > 0) {
            errors[err.path[0] as string] = err.message;
          }
        });
        return { isValid: false, errors };
      }
      return { isValid: false, errors: { general: 'Doğrulama hatası' } };
    }
  }, [schema]);

  return { validateField, validateForm };
}

// Hook for handling form submissions with loading states
export function useFormSubmission<T extends FieldValues>(
  submitFn: (data: T) => Promise<void>,
  options?: {
    onSuccess?: () => void;
    onError?: (error: Error) => void;
    successMessage?: string;
    loadingKey?: string;
  }
) {
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { setLoading, setSuccessMessage, setError } = useUiStore();

  const handleSubmit = React.useCallback(async (data: T) => {
    setIsSubmitting(true);
    
    if (options?.loadingKey) {
      setLoading(options.loadingKey, true);
    }

    try {
      await submitFn(data);
      
      if (options?.successMessage) {
        setSuccessMessage(options.loadingKey || 'form', options.successMessage);
      }
      
      options?.onSuccess?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Bir hata oluştu';
      
      if (options?.loadingKey) {
        setError(options.loadingKey, errorMessage);
      }
      
      options?.onError?.(error as Error);
      throw error;
    } finally {
      setIsSubmitting(false);
      
      if (options?.loadingKey) {
        setLoading(options.loadingKey, false);
      }
    }
  }, [submitFn, options, setLoading, setSuccessMessage, setError]);

  return { handleSubmit, isSubmitting };
}
