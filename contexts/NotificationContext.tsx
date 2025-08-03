'use client';

import React from 'react';
import { useNotificationStore } from '@/lib/stores/notificationStore';

export const NotificationProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { addNotification } = useNotificationStore();

  const checkStockNotifications = React.useCallback(async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const products = await response.json();
        const lowStockProducts = products.filter((p: any) => p.stock <= p.minStock);
        
        lowStockProducts.forEach((product: any) => {
          addNotification({
            type: 'warning',
            title: `⚠️ Stok Uyarısı: ${product.name}`,
            message: `Stok seviyesi kritik: ${product.stock} adet kaldı (Min: ${product.minStock})`,
            icon: '📦'
          });
        });
      }
    } catch (error) {
      console.error('Stok bildirimleri alınamadı:', error);
    }
  }, [addNotification]);

  const checkReceivableNotifications = React.useCallback(async () => {
    try {
      const response = await fetch('/api/receivables');
      if (response.ok) {
        const receivables = await response.json();
        const today = new Date();
        const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
        
        const upcomingDueReceivables = receivables.filter((r: any) => {
          if (r.status === 'odendi' || !r.dueDate) return false;
          const dueDate = new Date(r.dueDate);
          return dueDate <= threeDaysFromNow && dueDate >= today;
        });
        
        upcomingDueReceivables.forEach((receivable: any) => {
          const dueDate = new Date(receivable.dueDate);
          const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          
          addNotification({
            type: 'info',
            title: `💰 Vade Yaklaşıyor: ${receivable.firstName} ${receivable.lastName}`,
            message: `${daysDiff} gün sonra vadesi doluyor. Tutar: ${new Intl.NumberFormat('tr-TR', {
              style: 'currency',
              currency: 'TRY'
            }).format(receivable.amount)}`,
            icon: '⏰'
          });
        });
      }
    } catch (error) {
      console.error('Alacak bildirimleri alınamadı:', error);
    }
  }, [addNotification]);

  const checkTargetNotifications = React.useCallback(async () => {
    try {
      const response = await fetch('/api/targets');
      if (response.ok) {
        const targets = await response.json();
        const activeTargets = targets.filter((t: any) => t.status === 'active');
        
        activeTargets.forEach((target: any) => {
          const progress = (target.currentAmount / target.targetAmount) * 100;
          
          // Hedef %90 tamamlandıysa bildirim
          if (progress >= 90 && progress < 100) {
            addNotification({
              type: 'success',
              title: `🎯 Hedefe Yaklaşıyor: ${target.title}`,
              message: `%${progress.toFixed(1)} tamamlandı! Sadece ${new Intl.NumberFormat('tr-TR', {
                style: 'currency',
                currency: 'TRY'
              }).format(target.targetAmount - target.currentAmount)} kaldı.`,
              icon: '🚀'
            });
          }
          
          // Hedef %100 tamamlandıysa kutlama
          if (progress >= 100) {
            addNotification({
              type: 'success',
              title: `🎉 Hedef Tamamlandı: ${target.title}`,
              message: `Tebrikler! %${progress.toFixed(1)} ile hedefi aştınız!`,
              icon: '🏆'
            });
          }
        });
      }
    } catch (error) {
      console.error('Hedef bildirimleri alınamadı:', error);
    }
  }, [addNotification]);

  const checkServiceNotifications = React.useCallback(async () => {
    try {
      const response = await fetch('/api/services');
      if (response.ok) {
        const services = await response.json();
        const today = new Date();
        
        const warrantyExpiring = services.filter((s: any) => {
          if (s.status !== 'tamamlandi' || !s.completedDate) return false;
          const completedDate = new Date(s.completedDate);
          const warrantyEndDate = new Date(completedDate.getTime() + s.warrantyDays * 24 * 60 * 60 * 1000);
          const daysDiff = Math.ceil((warrantyEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysDiff <= 7 && daysDiff >= 0;
        });
        
        warrantyExpiring.forEach((service: any) => {
          const completedDate = new Date(service.completedDate);
          const warrantyEndDate = new Date(completedDate.getTime() + service.warrantyDays * 24 * 60 * 60 * 1000);
          const daysDiff = Math.ceil((warrantyEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 1000));
          
          addNotification({
            type: 'warning',
            title: `🛠️ Garanti Bitiyor: ${service.customerName}`,
            message: `${service.scooterBrand} ${service.scooterModel} garantisi ${daysDiff} gün sonra bitiyor.`,
            icon: '⚠️'
          });
        });
      }
    } catch (error) {
      console.error('Servis bildirimleri alınamadı:', error);
    }
  }, [addNotification]);

  const refreshNotifications = React.useCallback(async () => {
    await Promise.all([
      checkStockNotifications(),
      checkReceivableNotifications(),
      checkTargetNotifications(),
      checkServiceNotifications(),
    ]);
  }, [checkStockNotifications, checkReceivableNotifications, checkTargetNotifications, checkServiceNotifications]);

  React.useEffect(() => {
    refreshNotifications();
    
    // Her 5 dakikada bir bildirimleri kontrol et
    const interval = setInterval(refreshNotifications, 5 * 60 * 1000);
    
    return () => clearInterval(interval);
  }, [refreshNotifications]);

  return <>{children}</>;
};

export const useNotifications = () => {
  const store = useNotificationStore();
  
  return {
    notifications: store.notifications,
    unreadCount: store.unreadCount,
    markAsRead: store.markAsRead,
    markAllAsRead: store.markAllAsRead,
    addNotification: store.addNotification,
    removeNotification: store.removeNotification,
    refreshNotifications: async () => {
      // This would be handled by the NotificationProvider
    },
  };
};
