import { NextResponse } from 'next/server';
import dbConnect from '@/lib/mongodb';

interface Notification {
  id: string;
  type: 'warning' | 'error' | 'info' | 'success';
  title: string;
  message: string;
  icon: string;
  timestamp: string;
  isRead: boolean;
}

interface Product {
  _id: string;
  name: string;
  stock: number;
  minStock: number;
}

interface Receivable {
  _id: string;
  firstName: string;
  lastName: string;
  amount: number;
  status: string;
  dueDate?: string;
}

interface Target {
  _id: string;
  title: string;
  currentAmount: number;
  targetAmount: number;
  status: string;
}

interface Service {
  _id: string;
  customerName: string;
  scooterBrand: string;
  scooterModel: string;
  status: string;
  completedDate?: string;
  warrantyDays: number;
}

export async function GET() {
  try {
    await dbConnect();
    const mongoose = require('mongoose');
    const db = mongoose.connection.db;
    
    // Bildirimler için gerekli veriler
    const notifications: Notification[] = [];
    
    // Stok uyarıları
    const products: Product[] = await db.collection('products').find({}).toArray();
    const lowStockProducts = products.filter((p: Product) => p.stock <= p.minStock);
    
    lowStockProducts.forEach((product: Product) => {
      notifications.push({
        id: `stock-${product._id}`,
        type: 'warning',
        title: `⚠️ Stok Uyarısı: ${product.name}`,
        message: `Stok seviyesi kritik: ${product.stock} adet kaldı (Min: ${product.minStock})`,
        icon: '📦',
        timestamp: new Date().toISOString(),
        isRead: false
      });
    });
    
    // Vade yaklaşan alacaklar
    const receivables: Receivable[] = await db.collection('receivables').find({}).toArray();
    const today = new Date();
    const threeDaysFromNow = new Date(today.getTime() + 3 * 24 * 60 * 60 * 1000);
    
    const upcomingDueReceivables = receivables.filter((r: Receivable) => {
      if (r.status === 'odendi' || !r.dueDate) return false;
      const dueDate = new Date(r.dueDate);
      return dueDate <= threeDaysFromNow && dueDate >= today;
    });
    
    upcomingDueReceivables.forEach((receivable: Receivable) => {
      if (!receivable.dueDate) return; // Eğer dueDate yoksa skip et
      
      const dueDate = new Date(receivable.dueDate);
      const daysDiff = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      notifications.push({
        id: `receivable-${receivable._id}`,
        type: 'info',
        title: `💰 Vade Yaklaşıyor: ${receivable.firstName} ${receivable.lastName}`,
        message: `${daysDiff} gün sonra vadesi doluyor. Tutar: ${new Intl.NumberFormat('tr-TR', {
          style: 'currency',
          currency: 'TRY'
        }).format(receivable.amount)}`,
        icon: '⏰',
        timestamp: new Date().toISOString(),
        isRead: false
      });
    });
    
    // Hedef bildirimleri
    const targets: Target[] = await db.collection('targets').find({}).toArray();
    const activeTargets = targets.filter((t: Target) => t.status === 'active');
    
    activeTargets.forEach((target: Target) => {
      const progress = (target.currentAmount / target.targetAmount) * 100;
      
      // Hedef %90 tamamlandıysa bildirim
      if (progress >= 90 && progress < 100) {
        notifications.push({
          id: `target-progress-${target._id}`,
          type: 'success',
          title: `🎯 Hedefe Yaklaşıyor: ${target.title}`,
          message: `%${progress.toFixed(1)} tamamlandı! Sadece ${new Intl.NumberFormat('tr-TR', {
            style: 'currency',
            currency: 'TRY'
          }).format(target.targetAmount - target.currentAmount)} kaldı.`,
          icon: '🚀',
          timestamp: new Date().toISOString(),
          isRead: false
        });
      }
      
      // Hedef %100 tamamlandıysa kutlama
      if (progress >= 100) {
        notifications.push({
          id: `target-complete-${target._id}`,
          type: 'success',
          title: `🎉 Hedef Tamamlandı: ${target.title}`,
          message: `Tebrikler! %${progress.toFixed(1)} ile hedefi aştınız!`,
          icon: '🏆',
          timestamp: new Date().toISOString(),
          isRead: false
        });
      }
    });
    
    // Garanti biten servisler
    const services: Service[] = await db.collection('services').find({}).toArray();
    const warrantyExpiring = services.filter((s: Service) => {
      if (s.status !== 'tamamlandi' || !s.completedDate) return false;
      const completedDate = new Date(s.completedDate);
      const warrantyEndDate = new Date(completedDate.getTime() + s.warrantyDays * 24 * 60 * 60 * 1000);
      const daysDiff = Math.ceil((warrantyEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      return daysDiff <= 7 && daysDiff >= 0;
    });
    
    warrantyExpiring.forEach((service: Service) => {
      if (!service.completedDate) return; // Eğer completedDate yoksa skip et
      
      const completedDate = new Date(service.completedDate);
      const warrantyEndDate = new Date(completedDate.getTime() + service.warrantyDays * 24 * 60 * 60 * 1000);
      const daysDiff = Math.ceil((warrantyEndDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
      
      notifications.push({
        id: `warranty-${service._id}`,
        type: 'warning',
        title: `🛠️ Garanti Bitiyor: ${service.customerName}`,
        message: `${service.scooterBrand} ${service.scooterModel} garantisi ${daysDiff} gün sonra bitiyor.`,
        icon: '⚠️',
        timestamp: new Date().toISOString(),
        isRead: false
      });
    });
    
    // Yeni bildirimleri zamana göre sırala
    notifications.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return NextResponse.json(notifications);
  } catch (error) {
    console.error('Bildirimler alınamadı:', error);
    return NextResponse.json({ error: 'Bildirimler alınamadı' }, { status: 500 });
  }
}
