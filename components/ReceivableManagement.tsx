'use client';

import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  User, 
  Phone, 
  Calendar, 
  DollarSign,
  CheckCircle,
  XCircle,
  Clock,
  TrendingUp,
  TrendingDown,
  Search,
  Filter
} from 'lucide-react';

interface Receivable {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  amount: number;
  description: string;
  type: 'alacak' | 'verecek';
  status: 'odenmedi' | 'odendi';
  dueDate?: string;
  paidDate?: string;
  notes: string;
  createdAt: string;
}

interface ReceivableForm {
  firstName: string;
  lastName: string;
  phone: string;
  amount: number;
  description: string;
  type: 'alacak' | 'verecek';
  status: 'odenmedi' | 'odendi';
  dueDate: string;
  notes: string;
}

export default function ReceivableManagement() {
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingReceivable, setEditingReceivable] = useState<Receivable | null>(null);
  const [filter, setFilter] = useState<'all' | 'alacak' | 'verecek'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'odenmedi' | 'odendi'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [formData, setFormData] = useState<ReceivableForm>({
    firstName: '',
    lastName: '',
    phone: '',
    amount: 0,
    description: '',
    type: 'alacak',
    status: 'odenmedi',
    dueDate: '',
    notes: ''
  });

  useEffect(() => {
    fetchReceivables();
  }, []);

  const fetchReceivables = async () => {
    try {
      const response = await fetch('/api/receivables');
      if (response.ok) {
        const data = await response.json();
        setReceivables(data);
      }
    } catch (error) {
      console.error('Alacak-Verecek kayıtları alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingReceivable ? `/api/receivables/${editingReceivable._id}` : '/api/receivables';
      const method = editingReceivable ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...formData,
          markAsPaid: formData.status === 'odendi'
        }),
      });

      if (response.ok) {
        await fetchReceivables();
        resetForm();
        alert('Kayıt başarıyla kaydedildi!');
      }
    } catch (error) {
      console.error('Kayıt kaydedilemedi:', error);
      alert('Kayıt kaydedilemedi!');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu kaydı silmek istediğinizden emin misiniz?')) {
      try {
        const response = await fetch(`/api/receivables/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          await fetchReceivables();
        }
      } catch (error) {
        console.error('Kayıt silinemedi:', error);
      }
    }
  };

  const togglePaymentStatus = async (receivable: Receivable) => {
    const newStatus = receivable.status === 'odendi' ? 'odenmedi' : 'odendi';
    
    try {
      const response = await fetch(`/api/receivables/${receivable._id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...receivable,
          status: newStatus,
          markAsPaid: newStatus === 'odendi'
        }),
      });

      if (response.ok) {
        await fetchReceivables();
      }
    } catch (error) {
      console.error('Durum güncellenemedi:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      amount: 0,
      description: '',
      type: 'alacak',
      status: 'odenmedi',
      dueDate: '',
      notes: ''
    });
    setEditingReceivable(null);
    setShowForm(false);
  };

  const startEdit = (receivable: Receivable) => {
    setFormData({
      firstName: receivable.firstName,
      lastName: receivable.lastName,
      phone: receivable.phone,
      amount: receivable.amount,
      description: receivable.description,
      type: receivable.type,
      status: receivable.status,
      dueDate: receivable.dueDate ? receivable.dueDate.split('T')[0] : '',
      notes: receivable.notes
    });
    setEditingReceivable(receivable);
    setShowForm(true);
  };

  // Filtreleme ve arama
  const filteredReceivables = receivables.filter(receivable => {
    const matchesType = filter === 'all' || receivable.type === filter;
    const matchesStatus = statusFilter === 'all' || receivable.status === statusFilter;
    const matchesSearch = searchTerm === '' || 
      `${receivable.firstName} ${receivable.lastName}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
      receivable.phone.includes(searchTerm) ||
      receivable.description.toLowerCase().includes(searchTerm.toLowerCase());
    
    return matchesType && matchesStatus && matchesSearch;
  });

  // Hesaplamalar
  const totalAlacak = receivables
    .filter(r => r.type === 'alacak' && r.status === 'odenmedi')
    .reduce((sum, r) => sum + r.amount, 0);
  
  const totalVerecek = receivables
    .filter(r => r.type === 'verecek' && r.status === 'odenmedi')
    .reduce((sum, r) => sum + r.amount, 0);

  const netDurum = totalAlacak - totalVerecek;

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="text-lg text-gray-400 animate-pulse">💰 Alacak-Verecek kayıtları yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeInScale">
      <div className="flex flex-col md:flex-row md:items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <DollarSign className="h-8 w-8 mr-3 text-green-400" />
            Hesap Takibi
          </h1>
          <p className="text-gray-400">Borç ve alacaklarınızı takip edin</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary mt-4 md:mt-0"
        >
          <Plus className="h-5 w-5" />
          <span>Yeni Kayıt</span>
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-green-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-green-500/25">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Toplam Alacak</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-green-400 break-all">
                {formatCurrency(totalAlacak)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <TrendingUp className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-green-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-red-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-red-500/25">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Toplam Verecek</p>
              <p className="text-lg sm:text-xl lg:text-2xl font-bold text-red-400 break-all">
                {formatCurrency(totalVerecek)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <TrendingDown className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-red-400" />
            </div>
          </div>
        </div>

        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 hover:border-blue-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-blue-500/25">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-400">Net Durum</p>
              <p className={`text-lg sm:text-xl lg:text-2xl font-bold break-all ${netDurum >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                {formatCurrency(netDurum)}
              </p>
            </div>
            <div className="flex-shrink-0">
              <DollarSign className="h-6 w-6 sm:h-7 sm:w-7 lg:h-8 lg:w-8 text-blue-400" />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="flex flex-col md:flex-row md:items-center space-y-4 md:space-y-0 md:space-x-4">
          <div className="flex items-center space-x-2">
            <Search className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="İsim, telefon veya açıklama ara..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 w-full md:w-64"
            />
          </div>
          
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <select
              value={filter}
              onChange={(e) => setFilter(e.target.value as any)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">Tümü</option>
              <option value="alacak">Alacak</option>
              <option value="verecek">Verecek</option>
            </select>
          </div>
          
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4 text-gray-400" />
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as any)}
              className="bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            >
              <option value="all">Tüm Durumlar</option>
              <option value="odenmedi">Ödenmedi</option>
              <option value="odendi">Ödendi</option>
            </select>
          </div>
        </div>
      </div>

      {/* Form */}
      {showForm && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 card-hover animate-slideInDown">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-3 animate-pulse"></div>
            {editingReceivable ? 'Kayıt Düzenle' : 'Yeni Kayıt Ekle'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Ad
              </label>
              <input
                type="text"
                required
                value={formData.firstName}
                onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Soyad
              </label>
              <input
                type="text"
                required
                value={formData.lastName}
                onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Telefon
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Tutar (₺)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.amount || ''}
                onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Tür
              </label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="alacak">Alacak</option>
                <option value="verecek">Verecek</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Durum
              </label>
              <select
                value={formData.status}
                onChange={(e) => setFormData({ ...formData, status: e.target.value as any })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                <option value="odenmedi">Ödenmedi</option>
                <option value="odendi">Ödendi</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Vade Tarihi (Opsiyonel)
              </label>
              <input
                type="date"
                value={formData.dueDate}
                onChange={(e) => setFormData({ ...formData, dueDate: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="lg:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Açıklama
              </label>
              <input
                type="text"
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="lg:col-span-3">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Notlar
              </label>
              <textarea
                rows={2}
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="lg:col-span-3 flex justify-end space-x-3 pt-4">
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
                {editingReceivable ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Receivables List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden card-hover">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Kişi
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tutar
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tür
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredReceivables.map((receivable) => (
                <tr key={receivable._id} className="hover:bg-gray-700 transition-colors">
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <User className="h-5 w-5 text-gray-400 mr-3 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {receivable.firstName} {receivable.lastName}
                        </div>
                        <div className="text-sm text-gray-400 flex items-center">
                          <Phone className="h-3 w-3 mr-1 flex-shrink-0" />
                          <span className="truncate">{receivable.phone}</span>
                        </div>
                        {receivable.description && (
                          <div className="text-sm text-blue-400 truncate">
                            {receivable.description}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <div className={`text-sm font-bold ${receivable.type === 'alacak' ? 'text-green-400' : 'text-red-400'}`}>
                      {receivable.type === 'alacak' ? '+' : '-'}{formatCurrency(receivable.amount)}
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                      receivable.type === 'alacak' ? 'bg-green-900 text-green-400' : 'bg-red-900 text-red-400'
                    }`}>
                      {receivable.type === 'alacak' ? 'Alacak' : 'Verecek'}
                    </span>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap">
                    <button
                      onClick={() => togglePaymentStatus(receivable)}
                      className={`flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium transition-colors ${
                        receivable.status === 'odendi' 
                          ? 'bg-green-900 text-green-400 hover:bg-green-800' 
                          : 'bg-yellow-900 text-yellow-400 hover:bg-yellow-800'
                      }`}
                    >
                      {receivable.status === 'odendi' ? (
                        <>
                          <CheckCircle className="h-3 w-3" />
                          <span>Ödendi</span>
                        </>
                      ) : (
                        <>
                          <XCircle className="h-3 w-3" />
                          <span>Ödenmedi</span>
                        </>
                      )}
                    </button>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400 flex-shrink-0" />
                      <div className="min-w-0">
                        <div className="truncate">{formatDate(receivable.createdAt)}</div>
                        {receivable.dueDate && (
                          <div className="text-xs text-yellow-400 truncate">
                            Vade: {formatDate(receivable.dueDate)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEdit(receivable)}
                        className="text-blue-400 hover:text-blue-300 p-1 rounded transition-colors"
                        title="Düzenle"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(receivable._id)}
                        className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                        title="Sil"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {filteredReceivables.length === 0 && (
          <div className="text-center py-12">
            <DollarSign className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">
              {searchTerm || filter !== 'all' || statusFilter !== 'all' 
                ? 'Arama kriterlerinize uygun kayıt bulunamadı' 
                : 'Henüz alacak-verecek kaydı eklenmemiş'
              }
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
