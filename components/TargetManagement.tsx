'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Target, 
  X, 
  Calendar, 
  TrendingUp, 
  Award, 
  Clock,
  CheckCircle,
  AlertCircle,
  BarChart3
} from 'lucide-react';

interface SalesTarget {
  _id: string;
  title: string;
  targetAmount: number;
  currentAmount: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  startDate: string;
  endDate: string;
  status: 'active' | 'completed' | 'expired';
  description?: string;
  createdAt: string;
}

interface TargetForm {
  title: string;
  targetAmount: number;
  period: 'daily' | 'weekly' | 'monthly' | 'yearly';
  description: string;
}

export default function TargetManagement() {
  const [targets, setTargets] = useState<SalesTarget[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTarget, setEditingTarget] = useState<SalesTarget | null>(null);
  const [formData, setFormData] = useState<TargetForm>({
    title: '',
    targetAmount: 0,
    period: 'monthly',
    description: ''
  });

  const periods = [
    { value: 'daily', label: 'Günlük', icon: Clock },
    { value: 'weekly', label: 'Haftalık', icon: Calendar },
    { value: 'monthly', label: 'Aylık', icon: BarChart3 },
    { value: 'yearly', label: 'Yıllık', icon: TrendingUp }
  ];

  useEffect(() => {
    fetchTargets();
  }, []);

  const fetchTargets = async () => {
    try {
      const response = await fetch('/api/targets');
      if (response.ok) {
        const data = await response.json();
        setTargets(data);
      }
    } catch (error) {
      console.error('Hedefler alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingTarget ? `/api/targets/${editingTarget._id}` : '/api/targets';
      const method = editingTarget ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchTargets();
        resetForm();
        alert('Hedef başarıyla kaydedildi!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Hedef kaydedilemedi');
      }
    } catch (error) {
      console.error('Hedef kaydedilemedi:', error);
      alert(error instanceof Error ? error.message : 'Hedef kaydedilemedi!');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu hedefi silmek istediğinizden emin misiniz?')) {
      try {
        const response = await fetch(`/api/targets/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          await fetchTargets();
        }
      } catch (error) {
        console.error('Hedef silinemedi:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      title: '',
      targetAmount: 0,
      period: 'monthly',
      description: ''
    });
    setEditingTarget(null);
    setShowForm(false);
  };

  const startEdit = (target: SalesTarget) => {
    setFormData({
      title: target.title,
      targetAmount: target.targetAmount,
      period: target.period,
      description: target.description || ''
    });
    setEditingTarget(target);
    setShowForm(true);
  };

  const getProgressPercentage = (target: SalesTarget) => {
    return Math.min(100, (target.currentAmount / target.targetAmount) * 100);
  };

  const getStatusColor = (target: SalesTarget) => {
    const progress = getProgressPercentage(target);
    if (target.status === 'completed' || progress >= 100) return 'text-green-400';
    if (target.status === 'expired') return 'text-red-400';
    if (progress >= 75) return 'text-yellow-400';
    return 'text-blue-400';
  };

  const getStatusIcon = (target: SalesTarget) => {
    const progress = getProgressPercentage(target);
    if (target.status === 'completed' || progress >= 100) return CheckCircle;
    if (target.status === 'expired') return AlertCircle;
    return Target;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const getActiveTargets = () => targets.filter(t => t.status === 'active');
  const getCompletedTargets = () => targets.filter(t => t.status === 'completed' || getProgressPercentage(t) >= 100);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-lg text-gray-400">Yükleniyor...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Hedef Takibi</h1>
          <p className="text-gray-400">Satış hedeflerinizi belirleyin ve takip edin</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5" />
          <span>Yeni Hedef</span>
        </button>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <Target className="h-8 w-8 text-blue-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Aktif Hedefler</p>
              <p className="text-2xl font-bold text-white">{getActiveTargets().length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <CheckCircle className="h-8 w-8 text-green-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Tamamlanan</p>
              <p className="text-2xl font-bold text-white">{getCompletedTargets().length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-purple-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Toplam Hedef</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(getActiveTargets().reduce((sum, t) => sum + t.targetAmount, 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <Award className="h-8 w-8 text-yellow-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Gerçekleşen</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(getActiveTargets().reduce((sum, t) => sum + t.currentAmount, 0))}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Hedef Formu */}
      {showForm && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 card-hover animate-slideInDown">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-3 animate-pulse"></div>
            {editingTarget ? 'Hedef Düzenle' : 'Yeni Hedef Ekle'}
          </h3>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Hedef Başlığı
              </label>
              <input
                type="text"
                required
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="Örn: Aylık Satış Hedefi"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Hedef Tutar (₺)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.targetAmount || ''}
                onChange={(e) => setFormData({ ...formData, targetAmount: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Dönem
              </label>
              <select
                value={formData.period}
                onChange={(e) => setFormData({ ...formData, period: e.target.value as any })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {periods.map((period) => (
                  <option key={period.value} value={period.value}>
                    {period.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Açıklama
              </label>
              <textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="Hedef hakkında açıklama..."
              />
            </div>

            <div className="md:col-span-2 flex justify-end space-x-3">
              <button
                type="button"
                onClick={resetForm}
                className="btn btn-secondary"
              >
                İptal
              </button>
              <button
                type="submit"
                className="btn btn-primary"
              >
                {editingTarget ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Hedefler Listesi */}
      <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
        {targets.map((target) => {
          const progress = getProgressPercentage(target);
          const StatusIcon = getStatusIcon(target);
          const periodLabel = periods.find(p => p.value === target.period)?.label;
          
          return (
            <div 
              key={target._id} 
              className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-gray-600 transition-all duration-300"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <StatusIcon className={`h-6 w-6 ${getStatusColor(target)}`} />
                  <div>
                    <h3 className="text-white font-semibold">{target.title}</h3>
                    <p className="text-gray-400 text-sm">{periodLabel}</p>
                  </div>
                </div>
                
                <div className="flex items-center space-x-2">
                  <button
                    onClick={() => startEdit(target)}
                    className="text-blue-400 hover:text-blue-300 p-1 rounded"
                    title="Düzenle"
                  >
                    <Edit className="h-4 w-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(target._id)}
                    className="text-red-400 hover:text-red-300 p-1 rounded"
                    title="Sil"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>

              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Hedef:</span>
                  <span className="text-white font-medium">{formatCurrency(target.targetAmount)}</span>
                </div>
                
                <div className="flex justify-between items-center">
                  <span className="text-gray-400 text-sm">Gerçekleşen:</span>
                  <span className="text-green-400 font-medium">{formatCurrency(target.currentAmount)}</span>
                </div>

                <div className="space-y-2">
                  <div className="flex justify-between items-center">
                    <span className="text-gray-400 text-sm">İlerleme:</span>
                    <span className={`font-medium ${getStatusColor(target)}`}>
                      %{progress.toFixed(1)}
                    </span>
                  </div>
                  
                  <div className="w-full bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div 
                      className={`h-full transition-all duration-500 ${
                        progress >= 100 ? 'bg-green-500' :
                        progress >= 75 ? 'bg-yellow-500' :
                        'bg-blue-500'
                      }`}
                      style={{ width: `${Math.min(100, progress)}%` }}
                    ></div>
                  </div>
                </div>

                <div className="pt-2 border-t border-gray-700">
                  <div className="flex justify-between items-center text-xs text-gray-500">
                    <span>{formatDate(target.startDate)}</span>
                    <span>{formatDate(target.endDate)}</span>
                  </div>
                </div>

                {target.description && (
                  <p className="text-gray-400 text-sm mt-2">{target.description}</p>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {targets.length === 0 && (
        <div className="text-center py-12">
          <Target className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <p className="text-gray-400">Henüz hedef eklenmemiş</p>
          <button
            onClick={() => setShowForm(true)}
            className="mt-4 text-blue-400 hover:text-blue-300 transition-colors"
          >
            İlk hedefi oluştur
          </button>
        </div>
      )}
    </div>
  );
}
