'use client';

import { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Wrench, Calendar, Phone, User, Users, Crown, Star, ChevronDown } from 'lucide-react';

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  address?: string;
  loyaltyPoints: number;
  totalSpent: number;
  visitCount: number;
  lastVisit?: string;
}

interface Service {
  _id: string;
  customerId?: string | {
    _id: string;
    firstName: string;
    lastName: string;
    phone: string;
    email: string;
    loyaltyPoints: number;
    totalSpent: number;
    visitCount: number;
  };
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  customerEmail?: string;
  isRegisteredCustomer?: boolean;
  scooterBrand: string;
  scooterModel: string;
  serialNumber?: string;
  problem: string;
  solution?: string;
  cost: number;
  laborCost?: number;
  partsCost?: number;
  status: 'beklemede' | 'devam-ediyor' | 'tamamlandi' | 'iptal';
  receivedDate: string;
  completedDate?: string;
  notes?: string;
  warrantyDays?: number;
  customerRating?: number;
  customerFeedback?: string;
  createdAt: string;
}

interface ServiceForm {
  customerId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  customerEmail: string;
  isRegisteredCustomer: boolean;
  scooterBrand: string;
  scooterModel: string;
  serialNumber: string;
  problem: string;
  solution: string;
  cost: number;
  laborCost: number;
  partsCost: number;
  status: 'beklemede' | 'devam-ediyor' | 'tamamlandi' | 'iptal';
  receivedDate: string;
  completedDate: string;
  notes: string;
  warrantyDays: number;
  customerRating: number;
  customerFeedback: string;
}

export default function ServiceManagement() {
  const [services, setServices] = useState<Service[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [showCustomerSelector, setShowCustomerSelector] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [formData, setFormData] = useState<ServiceForm>({
    customerId: '',
    customerName: '',
    customerPhone: '',
    customerAddress: '',
    customerEmail: '',
    isRegisteredCustomer: false,
    scooterBrand: '',
    scooterModel: '',
    serialNumber: '',
    problem: '',
    solution: '',
    cost: 0,
    laborCost: 0,
    partsCost: 0,
    status: 'beklemede',
    receivedDate: new Date().toISOString().split('T')[0],
    completedDate: '',
    notes: '',
    warrantyDays: 30,
    customerRating: 0,
    customerFeedback: ''
  });

  const statusColors = {
    'beklemede': 'bg-yellow-900 text-yellow-400',
    'devam-ediyor': 'bg-blue-900 text-blue-400',
    'tamamlandi': 'bg-green-900 text-green-400',
    'iptal': 'bg-red-900 text-red-400'
  };

  const statusLabels = {
    'beklemede': 'Beklemede',
    'devam-ediyor': 'Devam Ediyor',
    'tamamlandi': 'Tamamlandı',
    'iptal': 'İptal'
  };

  useEffect(() => {
    fetchServices();
    fetchCustomers();
  }, []);

  const fetchServices = async () => {
    try {
      const response = await fetch('/api/services');
      if (response.ok) {
        const data = await response.json();
        setServices(data);
      }
    } catch (error) {
      console.error('Servis kayıtları alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/services/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Müşteriler alınamadı:', error);
    }
  };

  const handleCustomerSelect = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData({
      ...formData,
      customerId: customer._id,
      customerName: `${customer.firstName} ${customer.lastName}`,
      customerPhone: customer.phone,
      customerAddress: customer.address || '',
      customerEmail: customer.email || '',
      isRegisteredCustomer: true
    });
    setShowCustomerSelector(false);
  };

  const handleManualCustomer = () => {
    setSelectedCustomer(null);
    setFormData({
      ...formData,
      customerId: '',
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      customerEmail: '',
      isRegisteredCustomer: false
    });
    setShowCustomerSelector(false);
  };

  // Telefon numarası değiştiğinde otomatik müşteri eşleşmesi kontrolü
  const handlePhoneChange = async (phone: string) => {
    setFormData({ ...formData, customerPhone: phone });
    
    // Telefon numarası 10 haneli olduğunda kontrol et
    if (phone.length >= 10) {
      try {
        const response = await fetch(`/api/customers/findByPhone?phone=${encodeURIComponent(phone)}`);
        if (response.ok) {
          const customer = await response.json();
          if (customer) {
            // Müşteri bulundu, otomatik eşleştir
            setSelectedCustomer(customer);
            setFormData({
              ...formData,
              customerId: customer._id,
              customerName: `${customer.firstName} ${customer.lastName}`,
              customerPhone: customer.phone,
              customerAddress: customer.address || '',
              customerEmail: customer.email || '',
              isRegisteredCustomer: true
            });
            alert(`🎉 Müşteri bulundu ve otomatik eşleştirildi: ${customer.firstName} ${customer.lastName}`);
          }
        }
      } catch (error) {
        console.error('Müşteri arama hatası:', error);
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      // Eğer manuel müşteri girişi yapılmışsa ve müşteri kayıtlı değilse, önce müşteriyi kaydet
      let finalFormData = { ...formData };
      
      if (!formData.isRegisteredCustomer && formData.customerName && formData.customerPhone) {
        try {
          // Önce telefon numarasıyla müşteri kontrolü yap
          const checkResponse = await fetch(`/api/customers/findByPhone?phone=${encodeURIComponent(formData.customerPhone)}`);
          
          if (checkResponse.ok) {
            const existingCustomer = await checkResponse.json();
            
            if (existingCustomer) {
              // Müşteri zaten var, sadece bilgileri güncelle
              finalFormData = {
                ...formData,
                customerId: existingCustomer._id,
                isRegisteredCustomer: true
              };
              console.log('✅ Mevcut müşteri bulundu:', existingCustomer.firstName, existingCustomer.lastName);
            } else {
              // Müşteri yok, yeni müşteri oluştur
              const [firstName, ...lastNameParts] = formData.customerName.split(' ');
              const lastName = lastNameParts.join(' ') || '';
              
              const customerData = {
                firstName: firstName,
                lastName: lastName,
                phone: formData.customerPhone,
                email: formData.customerEmail || '',
                address: formData.customerAddress || ''
              };
              
              const customerResponse = await fetch('/api/customers', {
                method: 'POST',
                headers: {
                  'Content-Type': 'application/json',
                },
                body: JSON.stringify(customerData),
              });
              
              if (customerResponse.ok) {
                const newCustomer = await customerResponse.json();
                finalFormData = {
                  ...formData,
                  customerId: newCustomer._id,
                  isRegisteredCustomer: true
                };
                console.log('✅ Yeni müşteri oluşturuldu:', newCustomer.firstName, newCustomer.lastName);
                alert(`🎉 Yeni müşteri kaydı oluşturuldu: ${newCustomer.firstName} ${newCustomer.lastName}`);
              }
            }
          }
        } catch (customerError) {
          console.error('Müşteri kaydı sırasında hata:', customerError);
          // Müşteri kaydı başarısız olsa bile servis kaydına devam et
        }
      }
      
      const url = editingService ? `/api/services/${editingService._id}` : '/api/services';
      const method = editingService ? 'PUT' : 'POST';
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(finalFormData),
      });

      if (response.ok) {
        await fetchServices();
        await fetchCustomers(); // Müşteri listesini de güncelle
        resetForm();
        
        // Eğer servis tamamlandı ise başarı mesajı göster
        if (finalFormData.status === 'tamamlandi') {
          alert('✅ Servis tamamlandı! Gelir işlemi otomatik olarak kaydedildi ve hedefler güncellendi.');
        } else {
          alert('✅ Servis kaydı başarıyla kaydedildi!');
        }
      }
    } catch (error) {
      console.error('Servis kaydı kaydedilemedi:', error);
      alert('❌ Servis kaydı kaydedilemedi!');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Bu servis kaydını silmek istediğinizden emin misiniz?')) {
      try {
        const response = await fetch(`/api/services/${id}`, {
          method: 'DELETE',
        });

        if (response.ok) {
          await fetchServices();
        }
      } catch (error) {
        console.error('Servis kaydı silinemedi:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      customerId: '',
      customerName: '',
      customerPhone: '',
      customerAddress: '',
      customerEmail: '',
      isRegisteredCustomer: false,
      scooterBrand: '',
      scooterModel: '',
      serialNumber: '',
      problem: '',
      solution: '',
      cost: 0,
      laborCost: 0,
      partsCost: 0,
      status: 'beklemede',
      receivedDate: new Date().toISOString().split('T')[0],
      completedDate: '',
      notes: '',
      warrantyDays: 30,
      customerRating: 0,
      customerFeedback: ''
    });
    setEditingService(null);
    setShowForm(false);
    setSelectedCustomer(null);
    setShowCustomerSelector(false);
  };

  const startEdit = (service: Service) => {
    // customerId alanını güvenli şekilde handle et
    let customerIdValue = '';
    if (service.customerId) {
      if (typeof service.customerId === 'string') {
        customerIdValue = service.customerId;
      } else if (typeof service.customerId === 'object' && service.customerId._id) {
        customerIdValue = service.customerId._id;
      }
    }
    
    setFormData({
      customerId: customerIdValue,
      customerName: service.customerName,
      customerPhone: service.customerPhone,
      customerAddress: service.customerAddress || '',
      customerEmail: service.customerEmail || '',
      isRegisteredCustomer: service.isRegisteredCustomer || false,
      scooterBrand: service.scooterBrand,
      scooterModel: service.scooterModel,
      serialNumber: service.serialNumber || '',
      problem: service.problem,
      solution: service.solution || '',
      cost: service.cost,
      laborCost: service.laborCost || 0,
      partsCost: service.partsCost || 0,
      status: service.status,
      receivedDate: service.receivedDate.split('T')[0],
      completedDate: service.completedDate ? service.completedDate.split('T')[0] : '',
      notes: service.notes || '',
      warrantyDays: service.warrantyDays || 30,
      customerRating: service.customerRating || 0,
      customerFeedback: service.customerFeedback || ''
    });
    
    // Eğer kayıtlı müşteriyse, customer bilgilerini ayarla
    if (service.isRegisteredCustomer && service.customerId) {
      // service.customerId artık populate edilmiş customer objesi veya string olabilir
      if (typeof service.customerId === 'object' && service.customerId !== null) {
        setSelectedCustomer(service.customerId as any);
      } else if (typeof service.customerId === 'string') {
        const customer = customers.find(c => c._id === service.customerId);
        if (customer) {
          setSelectedCustomer(customer);
        }
      }
    }
    
    setEditingService(service);
    setShowForm(true);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR');
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`h-4 w-4 ${i < rating ? 'text-yellow-400 fill-current' : 'text-gray-400'}`}
      />
    ));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="flex flex-col items-center space-y-4">
          <div className="w-16 h-16 border-4 border-gray-600 border-t-blue-500 rounded-full animate-spin"></div>
          <div className="text-lg text-gray-400 animate-pulse">🔧 Servis kayıtları yükleniyor...</div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fadeInScale">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2 flex items-center">
            <Wrench className="h-8 w-8 mr-3 text-blue-400" />
            Servis Yönetimi
          </h1>
          <p className="text-gray-400">Tamir ve servis işlemlerini takip edin</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5" />
          <span>Yeni Servis</span>
        </button>
      </div>

      {/* Service Form */}
      {showForm && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 card-hover animate-slideInDown">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-3 animate-pulse"></div>
            {editingService ? 'Servis Düzenle' : 'Yeni Servis Ekle'}
          </h3>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Müşteri Seçimi */}
            <div className="bg-gray-700 rounded-lg p-4 border border-gray-600">
              <h4 className="text-white font-medium mb-3 flex items-center">
                <Users className="h-4 w-4 mr-2 text-green-400" />
                Müşteri Seçimi
              </h4>
              
              <div className="flex gap-3 mb-4">
                <button
                  type="button"
                  onClick={() => setShowCustomerSelector(true)}
                  className="flex-1 btn btn-secondary flex items-center justify-center"
                >
                  <Crown className="h-4 w-4 mr-2" />
                  Kayıtlı Müşteri Seç
                </button>
                <button
                  type="button"
                  onClick={handleManualCustomer}
                  className="flex-1 btn btn-outline flex items-center justify-center"
                >
                  <User className="h-4 w-4 mr-2" />
                  Manuel Giriş
                </button>
              </div>

              {/* Müşteri Seçici Dropdown */}
              {showCustomerSelector && (
                <div className="bg-gray-600 rounded-lg p-4 max-h-60 overflow-y-auto">
                  <div className="space-y-2">
                    {customers.map((customer) => (
                      <div
                        key={customer._id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="p-3 bg-gray-700 rounded-lg cursor-pointer hover:bg-gray-600 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium text-white">
                              {customer.firstName} {customer.lastName}
                            </div>
                            <div className="text-sm text-gray-400">
                              📞 {customer.phone}
                            </div>
                          </div>
                          <div className="text-right">
                            <div className="text-sm text-yellow-400">
                              ⭐ {customer.loyaltyPoints} puan
                            </div>
                            <div className="text-sm text-green-400">
                              💰 {formatCurrency(customer.totalSpent)}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Seçilen Müşteri Bilgisi */}
              {selectedCustomer && (
                <div className="bg-green-900 bg-opacity-20 border border-green-400 rounded-lg p-4 mt-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium text-green-400 flex items-center">
                        <Crown className="h-4 w-4 mr-2" />
                        {selectedCustomer.firstName} {selectedCustomer.lastName}
                      </div>
                      <div className="text-sm text-gray-300">
                        📞 {selectedCustomer.phone} | 💰 {formatCurrency(selectedCustomer.totalSpent)}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm text-yellow-400">
                        ⭐ {selectedCustomer.loyaltyPoints} puan
                      </div>
                      <div className="text-sm text-blue-400">
                        🔄 {selectedCustomer.visitCount} ziyaret
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* Müşteri Bilgileri Form */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="lg:col-span-3 mb-4">
                <h4 className="text-white font-medium mb-3 flex items-center">
                  <User className="h-4 w-4 mr-2 text-green-400" />
                  Müşteri Bilgileri
                </h4>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Müşteri Adı
                </label>
                <input
                  type="text"
                  required
                  value={formData.customerName}
                  onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                  disabled={formData.isRegisteredCustomer}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Telefon
                  {!formData.isRegisteredCustomer && (
                    <span className="text-xs text-blue-400 ml-2">
                      (Otomatik müşteri eşleşmesi)
                    </span>
                  )}
                </label>
                <input
                  type="tel"
                  required
                  value={formData.customerPhone}
                  onChange={(e) => handlePhoneChange(e.target.value)}
                  disabled={formData.isRegisteredCustomer}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                  placeholder="05XX XXX XX XX"
                />
                {!formData.isRegisteredCustomer && formData.customerPhone.length > 0 && (
                  <p className="text-xs text-gray-500 mt-1">
                    🔍 Telefon numarası girerken otomatik müşteri aranıyor...
                  </p>
                )}
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  E-posta
                </label>
                <input
                  type="email"
                  value={formData.customerEmail}
                  onChange={(e) => setFormData({ ...formData, customerEmail: e.target.value })}
                  disabled={formData.isRegisteredCustomer}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Adres
                </label>
                <input
                  type="text"
                  value={formData.customerAddress}
                  onChange={(e) => setFormData({ ...formData, customerAddress: e.target.value })}
                  disabled={formData.isRegisteredCustomer}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                />
              </div>

              {/* Scooter Bilgileri */}
              <div className="lg:col-span-3 mb-4 mt-4">
                <h4 className="text-white font-medium mb-3 flex items-center">
                  <Wrench className="h-4 w-4 mr-2 text-blue-400" />
                  Scooter Bilgileri
                </h4>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Marka
                </label>
                <input
                  type="text"
                  required
                  value={formData.scooterBrand}
                  onChange={(e) => setFormData({ ...formData, scooterBrand: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Model
                </label>
                <input
                  type="text"
                  required
                  value={formData.scooterModel}
                  onChange={(e) => setFormData({ ...formData, scooterModel: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Seri No
                </label>
                <input
                  type="text"
                  value={formData.serialNumber}
                  onChange={(e) => setFormData({ ...formData, serialNumber: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Servis Detayları */}
              <div className="lg:col-span-3 mb-4 mt-4">
                <h4 className="text-white font-medium mb-3 flex items-center">
                  <Calendar className="h-4 w-4 mr-2 text-yellow-400" />
                  Servis Detayları
                </h4>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Arıza/Problem
                </label>
                <textarea
                  required
                  rows={3}
                  value={formData.problem}
                  onChange={(e) => setFormData({ ...formData, problem: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
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
                  <option value="beklemede">Beklemede</option>
                  <option value="devam-ediyor">Devam Ediyor</option>
                  <option value="tamamlandi">Tamamlandı</option>
                  <option value="iptal">İptal</option>
                </select>
              </div>

              <div className="lg:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Yapılan İşlem/Çözüm
                </label>
                <textarea
                  rows={3}
                  value={formData.solution}
                  onChange={(e) => setFormData({ ...formData, solution: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  İşçilik Ücreti (₺)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.laborCost || ''}
                  onChange={(e) => {
                    const laborCost = parseFloat(e.target.value) || 0;
                    setFormData({ 
                      ...formData, 
                      laborCost,
                      cost: laborCost + formData.partsCost
                    });
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Parça Ücreti (₺)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.partsCost || ''}
                  onChange={(e) => {
                    const partsCost = parseFloat(e.target.value) || 0;
                    setFormData({ 
                      ...formData, 
                      partsCost,
                      cost: formData.laborCost + partsCost
                    });
                  }}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Toplam Ücret (₺)
                </label>
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={formData.cost || ''}
                  onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Teslim Alış Tarihi
                </label>
                <input
                  type="date"
                  required
                  value={formData.receivedDate}
                  onChange={(e) => setFormData({ ...formData, receivedDate: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Teslim Tarihi
                </label>
                <input
                  type="date"
                  value={formData.completedDate}
                  onChange={(e) => setFormData({ ...formData, completedDate: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Garanti (Gün)
                </label>
                <input
                  type="number"
                  min="0"
                  value={formData.warrantyDays || ''}
                  onChange={(e) => setFormData({ ...formData, warrantyDays: parseInt(e.target.value) || 30 })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                />
              </div>

              {/* Müşteri Memnuniyeti */}
              {formData.status === 'tamamlandi' && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Müşteri Memnuniyeti (1-5)
                    </label>
                    <div className="flex items-center space-x-2">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <button
                          key={star}
                          type="button"
                          onClick={() => setFormData({ ...formData, customerRating: star })}
                          className="focus:outline-none"
                        >
                          <Star
                            className={`h-6 w-6 ${
                              star <= formData.customerRating 
                                ? 'text-yellow-400 fill-current' 
                                : 'text-gray-400'
                            }`}
                          />
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="lg:col-span-2">
                    <label className="block text-sm font-medium text-gray-400 mb-2">
                      Müşteri Yorumu
                    </label>
                    <textarea
                      rows={2}
                      value={formData.customerFeedback}
                      onChange={(e) => setFormData({ ...formData, customerFeedback: e.target.value })}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                      placeholder="Müşteri yorumu..."
                    />
                  </div>
                </>
              )}

              <div className="lg:col-span-3">
                <label className="block text-sm font-medium text-gray-400 mb-2">
                  Notlar
                </label>
                <textarea
                  rows={2}
                  value={formData.notes}
                  onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                  className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                  placeholder="Ek notlar..."
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
                  {editingService ? 'Güncelle' : 'Kaydet'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {/* Services List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden card-hover">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Müşteri & Cihaz
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Problem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Durum
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ücret
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tarih
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {services.map((service) => (
                <tr key={service._id} className="hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      {service.isRegisteredCustomer ? (
                        <Crown className="h-5 w-5 text-yellow-400 mr-3" />
                      ) : (
                        <User className="h-5 w-5 text-gray-400 mr-3" />
                      )}
                      <div>
                        <div className="text-sm font-medium text-white flex items-center">
                          {service.customerName}
                          {service.isRegisteredCustomer && (
                            <span className="ml-2 text-xs bg-yellow-900 text-yellow-300 px-2 py-1 rounded">
                              VIP
                            </span>
                          )}
                        </div>
                        <div className="text-sm text-gray-400">
                          <Phone className="h-3 w-3 inline mr-1" />
                          {service.customerPhone}
                        </div>
                        <div className="text-sm text-blue-400">
                          {service.scooterBrand} {service.scooterModel}
                        </div>
                        {service.customerId && typeof service.customerId === 'object' && service.customerId !== null && (
                          <div className="text-xs text-green-400">
                            🎯 {service.customerId.loyaltyPoints || 0} puan | 
                            💰 {formatCurrency(service.customerId.totalSpent || 0)}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <div className="text-sm text-white max-w-xs">
                      {service.problem}
                    </div>
                    {service.solution && (
                      <div className="text-sm text-green-400 mt-1">
                        ✓ {service.solution.substring(0, 50)}...
                      </div>
                    )}
                    {service.customerRating && service.customerRating > 0 && (
                      <div className="flex items-center mt-1">
                        {renderStars(service.customerRating)}
                        <span className="text-xs text-gray-400 ml-2">({service.customerRating}/5)</span>
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusColors[service.status]}`}>
                      {statusLabels[service.status]}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-green-400">
                      {formatCurrency(service.cost)}
                    </div>
                    {(service.laborCost ?? 0) > 0 && (
                      <div className="text-xs text-gray-400">
                        İşçilik: {formatCurrency(service.laborCost ?? 0)}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                      <div>
                        <div>Alış: {formatDate(service.receivedDate)}</div>
                        {service.completedDate && (
                          <div className="text-green-400">Teslim: {formatDate(service.completedDate)}</div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEdit(service)}
                        className="text-blue-400 hover:text-blue-300 transition-colors"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(service._id)}
                        className="text-red-400 hover:text-red-300 transition-colors"
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
        
        {services.length === 0 && (
          <div className="text-center py-12">
            <Wrench className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">Henüz servis kaydı eklenmemiş</p>
          </div>
        )}
      </div>
    </div>
  );
}