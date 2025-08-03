'use client';

import React, { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit, 
  Trash2, 
  Users, 
  X, 
  Search, 
  Phone, 
  Mail, 
  MapPin, 
  Calendar, 
  Gift, 
  ShoppingBag, 
  CreditCard,
  Star,
  Award,
  Eye,
  TrendingUp
} from 'lucide-react';

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  birthDate?: string;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
  lastVisit?: string;
  notes?: string;
  discountCard?: {
    cardNumber: string;
    discountPercentage: number;
    expiryDate: string;
    isActive: boolean;
  };
  createdAt: string;
}

interface CustomerForm {
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address: string;
  birthDate: string;
  notes: string;
  discountCard?: {
    cardNumber: string;
    discountPercentage: number;
    expiryDate: string;
    isActive: boolean;
  };
}

interface Transaction {
  _id: string;
  type: string;
  amount: number;
  description: string;
  customerName?: string;
  customerSurname?: string;
  customerPhone?: string;
  date: string;
}

export default function CustomerManagement() {
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<Customer | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [showCustomerDetails, setShowCustomerDetails] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [formData, setFormData] = useState<CustomerForm>({
    firstName: '',
    lastName: '',
    phone: '',
    email: '',
    address: '',
    birthDate: '',
    notes: '',
    discountCard: undefined
  });

  useEffect(() => {
    fetchCustomers();
    fetchTransactions();
  }, []);

  // Arama fonksiyonu
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.firstName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.lastName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        customer.phone.includes(searchTerm) ||
        (customer.email && customer.email.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredCustomers(filtered);
    }
  }, [customers, searchTerm]);

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Müşteriler alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchTransactions = async () => {
    try {
      const response = await fetch('/api/transactions');
      if (response.ok) {
        const data = await response.json();
        setTransactions(data);
      }
    } catch (error) {
      console.error('İşlemler alınamadı:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingCustomer ? `/api/customers/${editingCustomer._id}` : '/api/customers';
      const method = editingCustomer ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(formData),
      });

      if (response.ok) {
        await fetchCustomers();
        resetForm();
        alert('Müşteri başarıyla kaydedildi!');
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Müşteri kaydedilemedi');
      }
    } catch (error) {
      console.error('Müşteri kaydedilemedi:', error);
      alert(error instanceof Error ? error.message : 'Müşteri kaydedilemedi!');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/customers/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchCustomers();
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Müşteri silinemedi:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      phone: '',
      email: '',
      address: '',
      birthDate: '',
      notes: '',
      discountCard: undefined
    });
    setEditingCustomer(null);
    setShowForm(false);
  };

  const startEdit = (customer: Customer) => {
    setFormData({
      firstName: customer.firstName,
      lastName: customer.lastName,
      phone: customer.phone,
      email: customer.email || '',
      address: customer.address || '',
      birthDate: customer.birthDate || '',
      notes: customer.notes || '',
      discountCard: customer.discountCard
    });
    setEditingCustomer(customer);
    setShowForm(true);
  };

  const addLoyaltyPoints = async (customerId: string, points: number) => {
    try {
      const response = await fetch(`/api/customers/${customerId}/loyalty`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ points }),
      });

      if (response.ok) {
        await fetchCustomers();
        alert(`${points} sadakat puanı eklendi!`);
      }
    } catch (error) {
      console.error('Sadakat puanı eklenemedi:', error);
    }
  };

  const viewCustomerDetails = (customer: Customer) => {
    setSelectedCustomer(customer);
    setShowCustomerDetails(true);
  };

  const getCustomerTransactions = (customer: Customer) => {
    return transactions.filter(transaction => 
      transaction.customerPhone === customer.phone ||
      (transaction.customerName === customer.firstName && transaction.customerSurname === customer.lastName)
    );
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

  const generateCardNumber = () => {
    return 'CRD' + Math.random().toString(36).substr(2, 9).toUpperCase();
  };

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
          <h1 className="text-3xl font-bold text-white mb-2">Müşteri Yönetimi</h1>
          <p className="text-gray-400">Müşteri bilgilerini ve sadakat programını yönetin</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5" />
          <span>Yeni Müşteri</span>
        </button>
      </div>

      {/* İstatistikler */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <Users className="h-8 w-8 text-blue-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Toplam Müşteri</p>
              <p className="text-2xl font-bold text-white">{customers.length}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <TrendingUp className="h-8 w-8 text-green-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Toplam Harcama</p>
              <p className="text-2xl font-bold text-white">
                {formatCurrency(customers.reduce((sum, customer) => sum + customer.totalSpent, 0))}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <Star className="h-8 w-8 text-yellow-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Aktif Kartlar</p>
              <p className="text-2xl font-bold text-white">
                {customers.filter(c => c.discountCard?.isActive).length}
              </p>
            </div>
          </div>
        </div>
        
        <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
          <div className="flex items-center">
            <Award className="h-8 w-8 text-purple-400" />
            <div className="ml-4">
              <p className="text-sm font-medium text-gray-400">Toplam Puan</p>
              <p className="text-2xl font-bold text-white">
                {customers.reduce((sum, customer) => sum + customer.loyaltyPoints, 0)}
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Arama Kutusu */}
      <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
        <div className="relative">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Search className="h-5 w-5 text-gray-400" />
          </div>
          <input
            type="text"
            placeholder="Müşteri adı, soyadı, telefon veya e-posta ile ara..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
          />
          {searchTerm && (
            <button
              onClick={() => setSearchTerm('')}
              className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300 transition-colors"
            >
              <X className="h-5 w-5" />
            </button>
          )}          
        </div>
        {searchTerm && (
          <div className="mt-3 text-sm text-gray-400">
            <span className="text-blue-400 font-medium">{filteredCustomers.length}</span> müşteri bulundu
            {searchTerm && ` &quot;${searchTerm}&quot; için`}
          </div>
        )}
      </div>

      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center" style={{zIndex: 99999}}>
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md shadow-2xl border border-gray-700 transform transition-all duration-200 scale-100 mx-4">
            <div className="flex items-center space-x-3 mb-4">
              <div className="p-2 bg-red-500/20 rounded-lg">
                <Trash2 className="h-6 w-6 text-red-400" />
              </div>
              <h2 className="text-xl font-bold text-white">Müşteriyi Sil</h2>
            </div>
            
            <p className="text-gray-300 mb-6 leading-relaxed">
              Bu müşteriyi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            
            <div className="flex space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="flex-1 px-4 py-3 bg-gray-600 text-white rounded-lg hover:bg-gray-500 transition-colors font-medium"
              >
                İptal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="flex-1 px-4 py-3 bg-red-600 text-white rounded-lg hover:bg-red-500 transition-colors font-medium"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Müşteri Formu */}
      {showForm && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 card-hover animate-slideInDown">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-3 animate-pulse"></div>
            {editingCustomer ? 'Müşteri Düzenle' : 'Yeni Müşteri Ekle'}
          </h3>
          
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Ad *
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
                Soyad *
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
                Telefon *
              </label>
              <input
                type="tel"
                required
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="05XX XXX XX XX"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                E-posta
              </label>
              <input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Doğum Tarihi
              </label>
              <input
                type="date"
                value={formData.birthDate}
                onChange={(e) => setFormData({ ...formData, birthDate: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Adres
              </label>
              <textarea
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Notlar
              </label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows={2}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="Müşteri hakkında özel notlar..."
              />
            </div>

            {/* İndirim Kartı */}
            <div className="md:col-span-2">
              <div className="border border-gray-600 rounded-lg p-4">
                <div className="flex items-center justify-between mb-3">
                  <label className="block text-sm font-medium text-gray-400">
                    İndirim Kartı
                  </label>
                  <button
                    type="button"
                    onClick={() => {
                      if (formData.discountCard) {
                        setFormData({ ...formData, discountCard: undefined });
                      } else {
                        setFormData({
                          ...formData,
                          discountCard: {
                            cardNumber: generateCardNumber(),
                            discountPercentage: 5,
                            expiryDate: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
                            isActive: true
                          }
                        });
                      }
                    }}
                    className="text-blue-400 hover:text-blue-300 text-sm"
                  >
                    {formData.discountCard ? 'Kaldır' : 'Ekle'}
                  </button>
                </div>

                {formData.discountCard && (
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Kart Numarası</label>
                      <input
                        type="text"
                        value={formData.discountCard.cardNumber}
                        onChange={(e) => setFormData({
                          ...formData,
                          discountCard: { ...formData.discountCard!, cardNumber: e.target.value }
                        })}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">İndirim Oranı (%)</label>
                      <input
                        type="number"
                        min="1"
                        max="50"
                        value={formData.discountCard.discountPercentage}
                        onChange={(e) => setFormData({
                          ...formData,
                          discountCard: { ...formData.discountCard!, discountPercentage: parseInt(e.target.value) }
                        })}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-400 mb-1">Son Geçerlilik</label>
                      <input
                        type="date"
                        value={formData.discountCard.expiryDate}
                        onChange={(e) => setFormData({
                          ...formData,
                          discountCard: { ...formData.discountCard!, expiryDate: e.target.value }
                        })}
                        className="w-full bg-gray-600 border border-gray-500 rounded px-3 py-2 text-white text-sm"
                      />
                    </div>
                  </div>
                )}
              </div>
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
                {editingCustomer ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Müşteri Listesi */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Müşteri
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  İletişim
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Sadakat
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Harcama
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Kart
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredCustomers.map((customer) => (
                <tr key={customer._id} className="hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <div className="flex-shrink-0 h-10 w-10">
                        <div className="h-10 w-10 rounded-full bg-blue-600 flex items-center justify-center">
                          <span className="text-white font-medium">
                            {customer.firstName?.[0] || '?'}{customer.lastName?.[0] || '?'}
                          </span>
                        </div>
                      </div>
                      <div className="ml-4">
                        <div className="text-sm font-medium text-white">
                          {customer.firstName} {customer.lastName}
                        </div>
                        <div className="text-sm text-gray-400">
                          {customer.visitCount} ziyaret
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div className="space-y-1">
                      <div className="flex items-center">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        {customer.phone}
                      </div>
                      {customer.email && (
                        <div className="flex items-center">
                          <Mail className="h-4 w-4 mr-2 text-gray-400" />
                          {customer.email}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center space-x-3">
                      <div className="flex items-center">
                        <Star className="h-4 w-4 text-yellow-400 mr-1" />
                        <span className="text-yellow-400 font-medium">{customer.loyaltyPoints}</span>
                      </div>
                      <button
                        onClick={() => {
                          const points = prompt('Eklenecek puan miktarı:');
                          if (points && parseInt(points) > 0) {
                            addLoyaltyPoints(customer._id, parseInt(points));
                          }
                        }}
                        className="text-blue-400 hover:text-blue-300 text-xs"
                        title="Puan Ekle"
                      >
                        <Gift className="h-4 w-4" />
                      </button>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div className="space-y-1">
                      <div className="text-green-400 font-medium">
                        {formatCurrency(customer.totalSpent)}
                      </div>
                      {customer.lastVisit && (
                        <div className="text-xs text-gray-400">
                          Son: {formatDate(customer.lastVisit)}
                        </div>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {customer.discountCard?.isActive ? (
                      <div className="space-y-1">
                        <span className="px-2 py-1 rounded-full text-xs bg-green-900 text-green-400">
                          %{customer.discountCard.discountPercentage} İndirim
                        </span>
                        <div className="text-xs text-gray-400">
                          {customer.discountCard.cardNumber}
                        </div>
                      </div>
                    ) : (
                      <span className="text-gray-500 italic">-</span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => window.open(`/customers/${customer._id}/profile`, '_blank')}
                        className="text-purple-400 hover:text-purple-300"
                        title="Detaylı Profil"
                      >
                        <TrendingUp className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => viewCustomerDetails(customer)}
                        className="text-blue-400 hover:text-blue-300"
                        title="Detayları Görüntüle"
                      >
                        <Eye className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => startEdit(customer)}
                        className="text-yellow-400 hover:text-yellow-300"
                        title="Düzenle"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(customer._id)}
                        className="text-red-400 hover:text-red-300"
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
        
        {filteredCustomers.length === 0 && (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {searchTerm ? (
              <div>
                <p className="text-gray-400 mb-2">&quot;{searchTerm}&quot; için sonuç bulunamadı</p>
                <button 
                  onClick={() => setSearchTerm('')}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  Tüm müşterileri göster
                </button>
              </div>
            ) : (
              <p className="text-gray-400">Henüz müşteri eklenmemiş</p>
            )}
          </div>
        )}
      </div>

      {/* Müşteri Detay Modal */}
      {showCustomerDetails && selectedCustomer && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center" style={{zIndex: 99999}}>
          <div className="bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700 transform transition-all duration-200 scale-100 mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <div className="h-12 w-12 rounded-full bg-blue-600 flex items-center justify-center">
                  <span className="text-white font-bold text-lg">
                    {selectedCustomer.firstName?.[0] || '?'}{selectedCustomer.lastName?.[0] || '?'}
                  </span>
                </div>
                <div>
                  <h2 className="text-2xl font-bold text-white">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </h2>
                  <p className="text-gray-400">Müşteri Detayları</p>
                </div>
              </div>
              <button
                onClick={() => setShowCustomerDetails(false)}
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Sol Sütun - Müşteri Bilgileri */}
              <div className="space-y-6">
                {/* İletişim Bilgileri */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <Phone className="h-5 w-5 mr-2 text-blue-400" />
                    İletişim Bilgileri
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center">
                      <Phone className="h-4 w-4 mr-2 text-gray-400" />
                      <span className="text-gray-300">{selectedCustomer.phone}</span>
                    </div>
                    {selectedCustomer.email && (
                      <div className="flex items-center">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-gray-300">{selectedCustomer.email}</span>
                      </div>
                    )}
                    {selectedCustomer.address && (
                      <div className="flex items-start">
                        <MapPin className="h-4 w-4 mr-2 text-gray-400 mt-0.5" />
                        <span className="text-gray-300">{selectedCustomer.address}</span>
                      </div>
                    )}
                    {selectedCustomer.birthDate && (
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        <span className="text-gray-300">{formatDate(selectedCustomer.birthDate)}</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Sadakat Programı */}
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <Star className="h-5 w-5 mr-2 text-yellow-400" />
                    Sadakat Programı
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center">
                      <div className="text-2xl font-bold text-yellow-400">{selectedCustomer.loyaltyPoints}</div>
                      <div className="text-xs text-gray-400">Sadakat Puanı</div>
                    </div>
                    <div className="text-center">
                      <div className="text-2xl font-bold text-blue-400">{selectedCustomer.visitCount}</div>
                      <div className="text-xs text-gray-400">Toplam Ziyaret</div>
                    </div>
                  </div>
                </div>

                {/* İndirim Kartı */}
                {selectedCustomer.discountCard && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                      <CreditCard className="h-5 w-5 mr-2 text-green-400" />
                      İndirim Kartı
                    </h3>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-gray-400">Kart No:</span>
                        <span className="text-white font-mono">{selectedCustomer.discountCard.cardNumber}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">İndirim:</span>
                        <span className="text-green-400 font-bold">%{selectedCustomer.discountCard.discountPercentage}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Geçerlilik:</span>
                        <span className="text-white">{formatDate(selectedCustomer.discountCard.expiryDate)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-400">Durum:</span>
                        <span className={`px-2 py-1 rounded text-xs ${
                          selectedCustomer.discountCard.isActive 
                            ? 'bg-green-900 text-green-400' 
                            : 'bg-red-900 text-red-400'
                        }`}>
                          {selectedCustomer.discountCard.isActive ? 'Aktif' : 'Pasif'}
                        </span>
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Sağ Sütun - Alışveriş Geçmişi */}
              <div className="space-y-6">
                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-lg font-semibold text-white mb-3 flex items-center">
                    <ShoppingBag className="h-5 w-5 mr-2 text-green-400" />
                    Alışveriş Geçmişi
                  </h3>
                  
                  <div className="mb-4 text-center">
                    <div className="text-2xl font-bold text-green-400">
                      {formatCurrency(selectedCustomer.totalSpent)}
                    </div>
                    <div className="text-xs text-gray-400">Toplam Harcama</div>
                  </div>

                  <div className="space-y-3 max-h-60 overflow-y-auto">
                    {getCustomerTransactions(selectedCustomer).map((transaction) => (
                      <div key={transaction._id} className="bg-gray-600 rounded p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <div className="text-sm text-white font-medium">
                              {transaction.description}
                            </div>
                            <div className="text-xs text-gray-400">
                              {formatDate(transaction.date)}
                            </div>
                          </div>
                          <div className="text-sm font-bold text-green-400">
                            {formatCurrency(transaction.amount)}
                          </div>
                        </div>
                      </div>
                    ))}
                    
                    {getCustomerTransactions(selectedCustomer).length === 0 && (
                      <div className="text-center py-8 text-gray-400">
                        Henüz alışveriş geçmişi bulunmuyor
                      </div>
                    )}
                  </div>
                </div>

                {/* Notlar */}
                {selectedCustomer.notes && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-white mb-3">Notlar</h3>
                    <p className="text-gray-300 text-sm">{selectedCustomer.notes}</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
