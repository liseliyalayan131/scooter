'use client';

import React, { useState, useRef, useEffect } from 'react';
import { 
  Bell, 
  X, 
  Check, 
  CheckCheck, 
  AlertTriangle, 
  Info, 
  CheckCircle, 
  XCircle,
  Clock,
  Trash2
} from 'lucide-react';
import { useNotifications } from '@/contexts/NotificationContext';

interface NotificationCenterProps {
  onClose?: () => void;
}

export default function NotificationCenter({ onClose }: NotificationCenterProps) {
  const { notifications, unreadCount, markAsRead, markAllAsRead, removeNotification } = useNotifications();

  const getNotificationIcon = (type: string) => {
    switch (type) {
      case 'warning':
        return <AlertTriangle className="h-5 w-5 text-yellow-400" />;
      case 'error':
        return <XCircle className="h-5 w-5 text-red-400" />;
      case 'info':
        return <Info className="h-5 w-5 text-blue-400" />;
      case 'success':
        return <CheckCircle className="h-5 w-5 text-green-400" />;
      default:
        return <Bell className="h-5 w-5 text-gray-400" />;
    }
  };

  const getNotificationBgColor = (type: string) => {
    switch (type) {
      case 'warning':
        return 'bg-yellow-900/20 border-yellow-500/30';
      case 'error':
        return 'bg-red-900/20 border-red-500/30';
      case 'info':
        return 'bg-blue-900/20 border-blue-500/30';
      case 'success':
        return 'bg-green-900/20 border-green-500/30';
      default:
        return 'bg-gray-900/20 border-gray-500/30';
    }
  };

  const formatTimestamp = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMinutes = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMinutes < 1) return 'Az önce';
    if (diffMinutes < 60) return `${diffMinutes} dakika önce`;
    if (diffHours < 24) return `${diffHours} saat önce`;
    if (diffDays < 7) return `${diffDays} gün önce`;
    return date.toLocaleDateString('tr-TR');
  };

  const handleNotificationClick = (notification: any) => {
    if (!notification.isRead) {
      markAsRead(notification.id);
    }
    
    if (notification.action) {
      notification.action.onClick();
      if (onClose) onClose();
    }
  };

  return (
    <div className="glass-modal rounded-2xl shadow-2xl border border-white/10 w-full max-h-[85vh] overflow-hidden animate-slideInDown transform origin-top-right">
      {/* Header */}
      <div className="p-6 border-b border-gray-700 bg-gray-900/80 backdrop-blur-lg rounded-t-2xl">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="p-2 rounded-lg bg-blue-600/20">
              <Bell className="h-5 w-5 text-blue-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">🔔 Bildirimler</h3>
              <p className="text-gray-400 text-sm">Güncel bildirimleriniz</p>
            </div>
          </div>
          
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg text-gray-400 hover:text-white hover:bg-gray-700 transition-all duration-200"
            >
              <X className="h-5 w-5" />
            </button>
          )}
        </div>
        
        {/* Stats */}
        <div className="mt-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            {unreadCount > 0 && (
              <div className="flex items-center space-x-2">
                <span className="bg-red-500 text-white text-xs px-2 py-1 rounded-full notification-counter">
                  {unreadCount}
                </span>
                <span className="text-sm text-gray-400">okunmamış</span>
              </div>
            )}
            
            <div className="flex items-center space-x-2">
              <span className="text-blue-400 font-medium">{notifications.length}</span>
              <span className="text-sm text-gray-400">toplam</span>
            </div>
          </div>
          
          {unreadCount > 0 && (
            <button
              onClick={markAllAsRead}
              className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1 transition-colors bg-blue-900/20 hover:bg-blue-900/30 px-3 py-1 rounded-lg"
              title="Tümünü okundu işaretle"
            >
              <CheckCheck className="h-4 w-4" />
              <span>Tümünü Okundu</span>
            </button>
          )}
        </div>
      </div>

      {/* Bildirim Listesi */}
      <div className="flex-1 overflow-y-auto max-h-[420px] bg-gray-800/80 backdrop-blur-lg">
        {notifications.length === 0 ? (
          <div className="p-8 text-center">
            <div className="p-4 rounded-full bg-gray-700/50 w-16 h-16 mx-auto mb-4 flex items-center justify-center">
              <Bell className="h-8 w-8 text-gray-400" />
            </div>
            <h4 className="text-lg font-semibold text-white mb-2">Henüz bildirim yok</h4>
            <p className="text-gray-400 text-sm">Yeni bildirimler burada görünecek</p>
          </div>
        ) : (
          <div className="p-4 space-y-3">
            {notifications.map((notification, index) => (
              <div
                key={notification.id}
                className={`relative p-3 rounded-lg border-l-4 cursor-pointer transition-all duration-200 transform hover:scale-[1.02] hover:shadow-lg ${
                  getNotificationBgColor(notification.type)
                } ${
                  !notification.isRead ? 'bg-opacity-100 shadow-md' : 'bg-opacity-50'
                }`}
                onClick={() => handleNotificationClick(notification)}
                style={{ animationDelay: `${index * 0.1}s` }}
              >
                <div className="flex items-start space-x-3">
                  {/* İkon */}
                  <div className="flex-shrink-0 p-2 rounded-lg bg-gray-700/50">
                    <div className="text-base">{notification.icon}</div>
                  </div>
                  
                  {/* İçerik */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h4 className={`text-sm font-semibold mb-1 ${
                          !notification.isRead ? 'text-white' : 'text-gray-300'
                        }`}>
                          {notification.title}
                        </h4>
                        <p className="text-xs text-gray-400 mb-2 line-clamp-2">
                          {notification.message}
                        </p>
                        
                        {/* Zaman */}
                        <div className="flex items-center space-x-2 text-xs text-gray-500">
                          <Clock className="h-3 w-3" />
                          <span>{formatTimestamp(notification.timestamp)}</span>
                        </div>
                      </div>
                      
                      {/* Durum ve İşlemler */}
                      <div className="flex items-center space-x-2 ml-3">
                        {!notification.isRead && (
                          <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse"></div>
                        )}
                        
                        <div className="flex items-center space-x-1">
                          {!notification.isRead && (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                markAsRead(notification.id);
                              }}
                              className="p-1 text-blue-400 hover:text-blue-300 transition-colors rounded hover:bg-blue-900/20"
                              title="Okundu işaretle"
                            >
                              <Check className="h-3 w-3" />
                            </button>
                          )}
                          
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              removeNotification(notification.id);
                            }}
                            className="p-1 text-red-400 hover:text-red-300 transition-colors rounded hover:bg-red-900/20"
                            title="Bildirimi sil"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                    
                    {/* Aksiyon Butonu */}
                    {notification.action && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          notification.action!.onClick();
                          if (onClose) onClose();
                        }}
                        className="mt-2 text-xs bg-blue-600 hover:bg-blue-500 text-white px-3 py-1 rounded-full transition-colors"
                      >
                        {notification.action.label}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
      
      {/* Footer */}
      {notifications.length > 0 && (
        <div className="p-4 border-t border-gray-700 bg-gray-900/80 backdrop-blur-lg rounded-b-2xl">
          <div className="flex items-center justify-between text-sm">
            <div className="text-gray-400">
              {notifications.length} bildirim
            </div>
            <div className="text-gray-400">
              {unreadCount > 0 ? (
                <span className="text-red-400 font-medium">{unreadCount} okunmamış</span>
              ) : (
                <span className="text-green-400 font-medium">Hepsi okundu ✓</span>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
