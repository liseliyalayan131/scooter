'use client';

import { useState, useEffect, useCallback } from 'react';
import { Plus, TrendingUp, TrendingDown, ShoppingCart, Calendar, Edit, Trash2, X, Search, CheckCircle } from 'lucide-react';

interface Transaction {
  _id: string;
  type: 'gelir' | 'gider' | 'satis';
  amount: number;
  description: string;
  category: string;
  productId?: string;
  quantity: number;
  customerName?: string;
  customerSurname?: string;
  customerPhone?: string;
  discount: number;
  discountType: 'tutar' | 'yuzde';
  originalAmount: number;
  createdAt: string;
  updatedAt: string;
}

interface Product {
  _id: string;
  name: string;
  sellPrice: number;
  stock?: number;
}

interface Customer {
  _id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email?: string;
  discountCard?: {
    cardNumber: string;
    discountPercentage: number;
    expiryDate: string;
    isActive: boolean;
  };
}

interface TransactionForm {
  type: 'gelir' | 'gider' | 'satis';
  amount: number;
  description: string;
  category: string;
  customerName: string;
  customerSurname: string;
  customerPhone: string;
  discount: number;
  discountType: 'tutar' | 'yuzde';
  paymentType: 'cash' | 'credit' | 'installment';
  products: Array<{
    productId: string;
    quantity: number;
    unitPrice: number;
  }>;
}

interface SelectedProduct {
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
}

export default function TransactionManagement() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<Transaction | null>(null);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [productSearchTerm, setProductSearchTerm] = useState('');
  const [showProductSearch, setShowProductSearch] = useState(false);
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [showCustomerSearch, setShowCustomerSearch] = useState(false);
  const [filteredCustomers, setFilteredCustomers] = useState<Customer[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null);
  const [successMessage, setSuccessMessage] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);
  const [deletedTransactions, setDeletedTransactions] = useState<Transaction[]>([]);
  const [showUndoBar, setShowUndoBar] = useState(false);
  const [undoTimer, setUndoTimer] = useState<NodeJS.Timeout | null>(null);
  const [formData, setFormData] = useState<TransactionForm>({
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
    products: []
  });

  const transactionTypes = [
    { value: 'gelir', label: 'Gelir', icon: TrendingUp, color: 'text-green-400' },
    { value: 'gider', label: 'Gider', icon: TrendingDown, color: 'text-red-400' },
    { value: 'satis', label: 'Satış', icon: ShoppingCart, color: 'text-blue-400' }
  ];

  const categories = {
    gelir: ['Satış', 'Servis', 'Diğer'],
    gider: ['Kira', 'Elektrik', 'Su', 'İnternet', 'Yedek Parça', 'Personel', 'Diğer'],
    satis: ['Scooter', 'Yedek Parça', 'Aksesuar', 'Servis']
  };

  useEffect(() => {
    fetchTransactions();
    fetchProducts();
    fetchCustomers();
  }, []);
  
  // Component unmount'ta timer'ı temizle
  useEffect(() => {
    return () => {
      if (undoTimer) {
        clearTimeout(undoTimer);
      }
    };
  }, [undoTimer]);

  // Ürün arama filtresi
  useEffect(() => {
    if (!productSearchTerm.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(productSearchTerm.toLowerCase()) ||
        (product._id && product._id.toLowerCase().includes(productSearchTerm.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [products, productSearchTerm]);

  // Müşteri arama filtresi
  useEffect(() => {
    if (!customerSearchTerm.trim()) {
      setFilteredCustomers(customers);
    } else {
      const filtered = customers.filter(customer =>
        customer.firstName.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        customer.lastName.toLowerCase().includes(customerSearchTerm.toLowerCase()) ||
        customer.phone.includes(customerSearchTerm) ||
        (customer.email && customer.email.toLowerCase().includes(customerSearchTerm.toLowerCase()))
      );
      setFilteredCustomers(filtered);
    }
  }, [customers, customerSearchTerm]);

  // Dışarı tıklama ile arama dropdown'ını kapat
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as HTMLElement;
      if (!target.closest('.product-search-container')) {
        setShowProductSearch(false);
      }
      if (!target.closest('.customer-search-container')) {
        setShowCustomerSearch(false);
      }
    };

    if (showProductSearch || showCustomerSearch) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProductSearch, showCustomerSearch]);

  // İndirim hesaplama fonksiyonları
  const calculateFinalAmount = useCallback((subtotal: number, discount: number, discountType: 'tutar' | 'yuzde') => {
    if (discount <= 0) return subtotal;
    
    if (discountType === 'yuzde') {
      const discountAmount = (subtotal * discount) / 100;
      return Math.max(0, subtotal - discountAmount);
    } else {
      return Math.max(0, subtotal - discount);
    }
  }, []);

  const formatCurrency = useCallback((amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  }, []);

  const formatDiscount = useCallback((discount: number, discountType: 'tutar' | 'yuzde') => {
    if (discountType === 'yuzde') {
      return `%${discount}`;
    } else {
      return formatCurrency(discount);
    }
  }, [formatCurrency]);

  const getDiscountAmount = useCallback((subtotal: number, discount: number, discountType: 'tutar' | 'yuzde') => {
    if (discount <= 0) return 0;
    
    if (discountType === 'yuzde') {
      return (subtotal * discount) / 100;
    } else {
      return Math.min(discount, subtotal);
    }
  }, []);

  // Seçili ürünler değiştiğinde formData'yı güncelle
  useEffect(() => {
    if (formData.type === 'satis' && selectedProducts.length >= 0) {
      const subtotal = selectedProducts.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0);
      const finalAmount = calculateFinalAmount(subtotal, formData.discount, formData.discountType);
      const description = selectedProducts.length > 0 
        ? `${selectedProducts.map(p => `${p.name} (${p.quantity}x)`).join(', ')} satışı${formData.discount > 0 ? ` (İndirim: ${formatDiscount(formData.discount, formData.discountType)})` : ''}`
        : '';
      
      setFormData(prev => ({
        ...prev,
        amount: finalAmount,
        description: description
      }));
    }
  }, [selectedProducts, formData.type, formData.discount, formData.discountType, calculateFinalAmount, formatDiscount]);

  // Success message handler
  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message);
    setShowSuccess(true);
    
    // Auto hide after 3 seconds
    setTimeout(() => {
      setShowSuccess(false);
    }, 3000);
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
    } finally {
      setLoading(false);
    }
  };

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Ürünler alınamadı:', error);
    }
  };

  const fetchCustomers = async () => {
    try {
      const response = await fetch('/api/customers');
      if (response.ok) {
        const data = await response.json();
        setCustomers(data);
      }
    } catch (error) {
      console.error('Müşteriler alınamadı:', error);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Satış işlemi için validation
    if (formData.type === 'satis' && selectedProducts.length === 0) {
      alert('Satış işlemi için en az bir ürün seçmelisiniz!');
      return;
    }
    
    // Satış işlemi için müşteri bilgileri kontrolü
    if (formData.type === 'satis' && (!formData.customerName.trim() || !formData.customerSurname.trim() || !formData.customerPhone.trim())) {
      alert('Satış işlemi için müşteri bilgileri (Ad, Soyad, Telefon) zorunludur!');
      return;
    }
    
    try {
      // Eğer manuel müşteri girişi yapılmışsa ve müşteri kayıtlı değilse, önce müşteriyi kaydet
      let finalFormData = { ...formData };
      
      if (formData.type === 'satis' && !selectedCustomer && formData.customerName && formData.customerPhone) {
        try {
          // Önce telefon numarasıyla müşteri kontrolü yap
          const checkResponse = await fetch(`/api/customers/findByPhone?phone=${encodeURIComponent(formData.customerPhone)}`);
          
          if (checkResponse.ok) {
            const existingCustomer = await checkResponse.json();
            
            if (!existingCustomer) {
              // Müşteri yok, yeni müşteri oluştur
              const customerData = {
                firstName: formData.customerName.trim(),
                lastName: formData.customerSurname.trim(),
                phone: formData.customerPhone.trim()
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
                console.log('✅ Yeni müşteri oluşturuldu (Transaction):', newCustomer.firstName, newCustomer.lastName);
                showSuccessMessage(`🎉 Yeni müşteri kaydı oluşturuldu: ${newCustomer.firstName} ${newCustomer.lastName}`);
              }
            }
          }
        } catch (customerError) {
          console.error('Müşteri kaydı sırasında hata (Transaction):', customerError);
          // Müşteri kaydı başarısız olsa bile satış işlemine devam et
        }
      }
      if (formData.type === 'satis' && selectedProducts.length > 0) {
        // İndirim öncesi toplam tutarı hesapla
        const subtotal = selectedProducts.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0);
        
        // Müşteri bilgilerini customers collection'ına kaydet/güncelle
        const customerData = {
          firstName: formData.customerName.trim(),
          lastName: formData.customerSurname.trim(),
          phone: formData.customerPhone.trim()
        };

        // Müşteri kaydet/güncelle
        await fetch('/api/customers/upsert', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            ...customerData,
            saleAmount: formData.amount
          }),
        });
        
        // Hesap takibi için müşteri hesabını güncelle
        if (formData.paymentType !== 'cash') {
          await fetch('/api/receivables', {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              action: 'updateCustomerAccount',
              customerName: formData.customerName.trim(),
              customerSurname: formData.customerSurname.trim(),
              customerPhone: formData.customerPhone.trim(),
              saleAmount: formData.amount,
              paymentType: formData.paymentType
            }),
          });
        }
        
        // Satış işlemi için TEK bir kayıt oluştur - stok güncelleme API'de yapılacak
        const transactionData = {
          type: finalFormData.type,
          amount: finalFormData.amount, // İndirim sonrası tutar
          originalAmount: subtotal, // İndirim öncesi tutar
          discount: finalFormData.discount,
          discountType: finalFormData.discountType,
          description: finalFormData.description,
          category: finalFormData.category,
          customerName: finalFormData.customerName.trim(),
          customerSurname: finalFormData.customerSurname.trim(),
          customerPhone: finalFormData.customerPhone.trim(),
          // İlk ürünü ana ürün olarak kaydet, diğerleri açıklamada belirtilir
          productId: selectedProducts[0]?.productId || null,
          quantity: selectedProducts.reduce((sum, p) => sum + p.quantity, 0)
        };
        
        const response = await fetch('/api/transactions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transactionData),
        });
        
        if (!response.ok) throw new Error('Satış kaydı oluşturulamadı');
        
        // Tüm ürünlerin stoklarını güncelle
        for (const product of selectedProducts) {
          await fetch(`/api/products/${product.productId}`, {
            method: 'PUT',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              decreaseStock: product.quantity
            }),
          });
        }
      } else {
        // Normal tek işlem (gelir veya gider)
        const url = editingTransaction ? `/api/transactions/${editingTransaction._id}` : '/api/transactions';
        const method = editingTransaction ? 'PUT' : 'POST';
        
        const transactionData = {
          type: finalFormData.type,
          amount: finalFormData.amount,
          description: finalFormData.description,
          category: finalFormData.category,
          customerName: finalFormData.type === 'satis' ? finalFormData.customerName : null,
          customerSurname: finalFormData.type === 'satis' ? finalFormData.customerSurname : null,
          customerPhone: finalFormData.type === 'satis' ? finalFormData.customerPhone : null,
        };
        
        await fetch(url, {
          method: method,
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify(transactionData),
        });
      }

      await fetchTransactions();
      await fetchCustomers(); // Müşteri listesini de güncelle
      resetForm();
      
      // Show success message based on transaction type
      const transactionTypeLabel = transactionTypes.find(t => t.value === finalFormData.type)?.label || 'İşlem';
      const message = editingTransaction 
        ? `${transactionTypeLabel} başarıyla güncellendi! 🎉` 
        : `${transactionTypeLabel} başarıyla kaydedildi! 🎉`;
      
      showSuccessMessage(message);
    } catch (error) {
      console.error('İşlem kaydedilemedi:', error);
      alert('İşlem kaydedilemedi!');
    }
  };

  const resetForm = () => {
    setFormData({
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
      products: []
    });
    setSelectedProducts([]);
    setSelectedCustomer(null);
    setCustomerSearchTerm('');
    setShowCustomerSearch(false);
    setProductSearchTerm('');
    setShowProductSearch(false);
    setShowForm(false);
    setEditingTransaction(null);
  };

  // Telefon numarası değiştiğinde otomatik müşteri eşleşmesi kontrolü
  const handleCustomerPhoneChange = async (phone: string) => {
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
            setFormData(prev => ({
              ...prev,
              customerName: customer.firstName,
              customerSurname: customer.lastName,
              customerPhone: customer.phone,
              // Eğer müşterinin aktif indirim kartı varsa otomatik uygula
              discount: customer.discountCard?.isActive ? customer.discountCard.discountPercentage : prev.discount,
              discountType: customer.discountCard?.isActive ? 'yuzde' : prev.discountType
            }));
            showSuccessMessage(`🎉 Müşteri bulundu: ${customer.firstName} ${customer.lastName}`);
          }
        }
      } catch (error) {
        console.error('Müşteri arama hatası:', error);
      }
    }
  };

  // Müşteri bilgilerini temizle
  const clearCustomerInfo = () => {
    setSelectedCustomer(null);
    setFormData(prev => ({
      ...prev,
      customerName: '',
      customerSurname: '',
      customerPhone: '',
      discount: 0,
      discountType: 'tutar'
    }));
  };

  // Müşteri seçim fonksiyonları (arama kutusu için)
  const selectCustomer = (customer: Customer) => {
    setSelectedCustomer(customer);
    setFormData(prev => ({
      ...prev,
      customerName: customer.firstName,
      customerSurname: customer.lastName,
      customerPhone: customer.phone,
      // Eğer müşterinin aktif indirim kartı varsa otomatik uygula
      discount: customer.discountCard?.isActive ? customer.discountCard.discountPercentage : prev.discount,
      discountType: customer.discountCard?.isActive ? 'yuzde' : prev.discountType
    }));
    setCustomerSearchTerm('');
    setShowCustomerSearch(false);
  };

  const clearCustomerSelection = () => {
    clearCustomerInfo();
    setCustomerSearchTerm('');
  };

  const handleEdit = (transaction: Transaction) => {
    setEditingTransaction(transaction);
    setFormData({
      type: transaction.type,
      amount: transaction.amount,
      description: transaction.description,
      category: transaction.category,
      customerName: transaction.customerName || '',
      customerSurname: transaction.customerSurname || '',
      customerPhone: transaction.customerPhone || '',
      discount: transaction.discount || 0,
      discountType: transaction.discountType || 'tutar',
      paymentType: 'cash', // Edit işleminde varsayılan olarak nakit
      products: transaction.productId ? [{
        productId: transaction.productId,
        quantity: transaction.quantity,
        unitPrice: transaction.amount / transaction.quantity
      }] : []
    });
    
    // Eğer transaction'da product varsa selected products'a ekle
    if (transaction.productId) {
      const product = products.find(p => p._id === transaction.productId);
      if (product) {
        setSelectedProducts([{
          productId: transaction.productId,
          name: product.name,
          unitPrice: product.sellPrice,
          quantity: transaction.quantity
        }]);
      }
    }
    
    setShowForm(true);
  };

  // Ürün seçimi fonksiyonları
  const addProduct = (productId: string) => {
    const product = products.find(p => p._id === productId);
    if (!product) return;
    
    const isAlreadySelected = selectedProducts.find(sp => sp.productId === productId);
    if (isAlreadySelected) return;
    
    const newSelectedProduct: SelectedProduct = {
      productId: productId,
      name: product.name,
      unitPrice: product.sellPrice,
      quantity: 1
    };
    
    setSelectedProducts(prev => [...prev, newSelectedProduct]);
    updateFormData([...selectedProducts, newSelectedProduct]);
  };

  const removeProduct = (productId: string) => {
    const newSelectedProducts = selectedProducts.filter(sp => sp.productId !== productId);
    setSelectedProducts(newSelectedProducts);
    updateFormData(newSelectedProducts);
  };

  const updateProductQuantity = (productId: string, quantity: number) => {
    const newSelectedProducts = selectedProducts.map(sp =>
      sp.productId === productId ? { ...sp, quantity: Math.max(1, quantity) } : sp
    );
    setSelectedProducts(newSelectedProducts);
    updateFormData(newSelectedProducts);
  };

  const updateFormData = (products: SelectedProduct[]) => {
    const totalAmount = products.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0);
    const description = products.length > 0 
      ? `${products.map(p => `${p.name} (${p.quantity}x)`).join(', ')} satışı`
      : '';
    
    setFormData(prev => ({
      ...prev,
      amount: totalAmount,
      description: description,
      products: products.map(p => ({
        productId: p.productId,
        quantity: p.quantity,
        unitPrice: p.unitPrice
      }))
    }));
  };

  const handleDelete = async (id: string) => {
    try {
      // Silinen işlemi sakla
      const transactionToDelete = transactions.find(t => t._id === id);
      if (!transactionToDelete) return;

      const response = await fetch(`/api/transactions/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        // Silinen işlemi geçici olarak sakla
        setDeletedTransactions(prev => [...prev, transactionToDelete]);
        
        // Undo timer'ını temizle ve yeni timer başlat
        if (undoTimer) {
          clearTimeout(undoTimer);
        }
        
        const newTimer = setTimeout(() => {
          setShowUndoBar(false);
          setDeletedTransactions([]);
        }, 10000); // 10 saniye
        
        setUndoTimer(newTimer);
        setShowUndoBar(true);
        
        await fetchTransactions();
        setDeleteConfirm(null);
        
        showSuccessMessage(`🗑️ İşlem silindi. 10 saniye içinde geri alabilirsiniz.`);
      }
    } catch (error) {
      console.error('İşlem silinemedi:', error);
      alert('❌ İşlem silinemedi!');
    }
  };
  
  // Undo fonksiyonu
  const handleUndo = async () => {
    if (deletedTransactions.length === 0) return;
    
    try {
      // Son silinen işlemi geri getir
      const lastDeleted = deletedTransactions[deletedTransactions.length - 1];
      
      // İşlemi yeniden oluştur (id'yi çıkararak)
      const { _id, ...transactionData } = lastDeleted;
      
      const response = await fetch('/api/transactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });
      
      if (response.ok) {
        // Timer'ı temizle
        if (undoTimer) {
          clearTimeout(undoTimer);
          setUndoTimer(null);
        }
        
        // State'leri temizle
        setDeletedTransactions([]);
        setShowUndoBar(false);
        
        await fetchTransactions();
        showSuccessMessage(`✅ İşlem başarıyla geri getirildi!`);
      }
    } catch (error) {
      console.error('İşlem geri getirilemedi:', error);
      alert('❌ İşlem geri getirilemedi!');
    }
  };
  
  // Undo iptal fonksiyonu
  const cancelUndo = () => {
    if (undoTimer) {
      clearTimeout(undoTimer);
      setUndoTimer(null);
    }
    setDeletedTransactions([]);
    setShowUndoBar(false);
  };

  const handleTypeChange = (type: 'gelir' | 'gider' | 'satis') => {
    setFormData({
      ...formData,
      type,
      category: categories[type][0],
      products: type === 'satis' ? formData.products : [],
      amount: type === 'satis' ? formData.amount : 0,
      description: type === 'satis' ? formData.description : '',
      customerName: type === 'satis' ? formData.customerName : '',
      customerSurname: type === 'satis' ? formData.customerSurname : '',
      customerPhone: type === 'satis' ? formData.customerPhone : '',
      discount: type === 'satis' ? formData.discount : 0,
      discountType: type === 'satis' ? formData.discountType : 'tutar',
      paymentType: type === 'satis' ? formData.paymentType : 'cash'
    });
    
    // Eğer tür satış değilse seçili ürünleri ve müşteriyi temizle
    if (type !== 'satis') {
      setSelectedProducts([]);
      setSelectedCustomer(null);
      setCustomerSearchTerm('');
      setShowCustomerSearch(false);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('tr-TR', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  const getTransactionIcon = (type: string) => {
    const transactionType = transactionTypes.find(t => t.value === type);
    if (!transactionType) return TrendingUp;
    return transactionType.icon;
  };

  const getTransactionColor = (type: string) => {
    const transactionType = transactionTypes.find(t => t.value === type);
    return transactionType?.color || 'text-gray-400';
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
      {/* Success Notification */}
      {showSuccess && (
        <div className="fixed top-6 right-6 z-50 animate-slideInDown">
          <div className="bg-green-900/90 backdrop-blur-sm border border-green-500/50 rounded-lg p-4 shadow-2xl max-w-md">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <CheckCircle className="h-6 w-6 text-green-400 animate-pulse" />
              </div>
              <div className="flex-1">
                <p className="text-green-100 font-medium">{successMessage}</p>
              </div>
              <button
                onClick={() => setShowSuccess(false)}
                className="flex-shrink-0 text-green-400 hover:text-green-300 transition-colors"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
      
      {/* Undo Bar */}
      {showUndoBar && deletedTransactions.length > 0 && (
        <div className="fixed bottom-6 left-1/2 transform -translate-x-1/2 z-50 animate-slideInDown">
          <div className="bg-yellow-900/90 backdrop-blur-sm border border-yellow-500/50 rounded-lg p-4 shadow-2xl max-w-md">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0">
                <div className="w-6 h-6 rounded-full bg-yellow-500 flex items-center justify-center">
                  <span className="text-yellow-900 text-sm font-bold">↶</span>
                </div>
              </div>
              <div className="flex-1">
                <p className="text-yellow-100 font-medium">
                  {deletedTransactions.length} işlem silindi
                </p>
                <p className="text-yellow-200 text-sm">
                  10 saniye içinde geri alabilirsiniz
                </p>
              </div>
              <div className="flex space-x-2">
                <button
                  onClick={handleUndo}
                  className="px-3 py-1 bg-yellow-600 text-yellow-100 rounded-lg hover:bg-yellow-500 transition-colors text-sm font-medium"
                >
                  Geri Al
                </button>
                <button
                  onClick={cancelUndo}
                  className="flex-shrink-0 text-yellow-400 hover:text-yellow-300 transition-colors"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">İşlem Yönetimi</h1>
          <p className="text-gray-400">Gelir, gider ve satış işlemlerinizi takip edin</p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          className="btn btn-primary"
        >
          <Plus className="h-5 w-5" />
          <span>Yeni İşlem</span>
        </button>
      </div>

      {/* Transaction Form */}
      {showForm && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 card-hover animate-slideInDown">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-3 animate-pulse"></div>
            {editingTransaction ? 'İşlem Düzenle' : 'Yeni İşlem Ekle'}
          </h3>
          
          {/* Transaction Type Selection */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-400 mb-3">
              İşlem Türü
            </label>
            <div className="grid grid-cols-3 gap-3">
              {transactionTypes.map((type) => {
                const Icon = type.icon;
                return (
                  <button
                    key={type.value}
                    type="button"
                    onClick={() => handleTypeChange(type.value as any)}
                    className={`group p-4 rounded-lg border-2 transition-all duration-300 transform hover:shadow-lg flex flex-col items-center space-y-2 ${
                      formData.type === type.value
                        ? 'border-blue-500 bg-blue-900/20 shadow-2xl shadow-blue-500/25'
                        : 'border-gray-600 hover:border-gray-500 hover:shadow-xl hover:shadow-gray-500/20'
                    }`}
                  >
                    <Icon className={`h-6 w-6 transition-all duration-300 ${
                      formData.type === type.value
                        ? `${type.color} drop-shadow-lg animate-glow`
                        : `${type.color} group-hover:scale-110 group-hover:rotate-12`
                    }`} />
                    <span className="text-white font-medium group-hover:text-gray-200 transition-colors duration-300">{type.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Müşteri Bilgileri (Sadece Satış İşlemleri İçin) */}
            {formData.type === 'satis' && (
              <div className="md:col-span-2 mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-green-400 rounded-full mr-2 animate-pulse"></div>
                    Müşteri Bilgileri
                  </div>
                </label>
                
                {/* Müşteri Seçim Alanı */}
                <div className="mb-4 customer-search-container">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder={selectedCustomer ? `${selectedCustomer.firstName} ${selectedCustomer.lastName} - ${selectedCustomer.phone}` : "Kayıtlı müşteri ara (opsiyonel)..."}
                      value={customerSearchTerm}
                      onChange={(e) => {
                        setCustomerSearchTerm(e.target.value);
                        setShowCustomerSearch(true);
                      }}
                      onFocus={() => setShowCustomerSearch(true)}
                      disabled={!!selectedCustomer}
                      className={`w-full pl-10 pr-4 py-3 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200 ${
                        selectedCustomer 
                          ? 'bg-green-900/20 border-green-500/50 text-green-200' 
                          : 'bg-gray-700'
                      }`}
                    />
                    {selectedCustomer ? (
                      <button
                        onClick={clearCustomerSelection}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-green-400 hover:text-green-300 transition-colors"
                        title="Müşteri seçimini temizle"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    ) : customerSearchTerm && (
                      <button
                        onClick={() => {
                          setCustomerSearchTerm('');
                          setShowCustomerSearch(false);
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Müşteri Arama Sonuçları */}
                  {showCustomerSearch && !selectedCustomer && (
                    <div className="absolute z-20 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredCustomers.length > 0 ? (
                        filteredCustomers.map((customer) => (
                          <button
                            key={customer._id}
                            type="button"
                            onClick={() => selectCustomer(customer)}
                            className="w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-white font-medium">
                                  {customer.firstName} {customer.lastName}
                                </div>
                                <div className="text-gray-400 text-sm">{customer.phone}</div>
                                {customer.email && (
                                  <div className="text-gray-500 text-xs">{customer.email}</div>
                                )}
                              </div>
                              <div className="text-right">
                                {customer.discountCard?.isActive && (
                                  <div className="text-xs text-green-400 bg-green-900/30 px-2 py-1 rounded">
                                    %{customer.discountCard.discountPercentage} İndirim
                                  </div>
                                )}
                              </div>
                            </div>
                          </button>
                        ))
                      ) : (
                        <div className="px-4 py-3 text-gray-400 text-center">
                          {customerSearchTerm ? 'Müşteri bulunamadı' : 'Aramaya başlayın'}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Seçili Müşteri Bilgisi */}
                  {selectedCustomer && (
                    <div className="mt-3 p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center">
                            <span className="text-white text-sm font-medium">
                              {selectedCustomer.firstName[0]}{selectedCustomer.lastName[0]}
                            </span>
                          </div>
                          <div>
                            <div className="text-green-300 font-medium">
                              {selectedCustomer.firstName} {selectedCustomer.lastName}
                            </div>
                            <div className="text-green-400 text-sm">{selectedCustomer.phone}</div>
                          </div>
                        </div>
                        {selectedCustomer.discountCard?.isActive && (
                          <div className="text-right">
                            <div className="text-xs text-green-400 bg-green-900/50 px-2 py-1 rounded">
                              %{selectedCustomer.discountCard.discountPercentage} İndirim Kartı
                            </div>
                            <div className="text-xs text-gray-400 mt-1">
                              {selectedCustomer.discountCard.cardNumber}
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Ad *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customerName}
                      onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                      disabled={!!selectedCustomer}
                      className={`w-full px-3 py-2 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                        selectedCustomer ? 'bg-gray-600/50' : 'bg-gray-600'
                      }`}
                      placeholder="Müşteri adı"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Soyad *
                    </label>
                    <input
                      type="text"
                      required
                      value={formData.customerSurname}
                      onChange={(e) => setFormData({ ...formData, customerSurname: e.target.value })}
                      disabled={!!selectedCustomer}
                      className={`w-full px-3 py-2 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                        selectedCustomer ? 'bg-gray-600/50' : 'bg-gray-600'
                      }`}
                      placeholder="Müşteri soyadı"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-xs font-medium text-gray-400 mb-2">
                      Telefon *
                      {!selectedCustomer && (
                        <span className="text-xs text-blue-400 ml-2">
                          (Otomatik müşteri ara)
                        </span>
                      )}
                    </label>
                    <input
                      type="tel"
                      required
                      value={formData.customerPhone}
                      onChange={(e) => handleCustomerPhoneChange(e.target.value)}
                      disabled={!!selectedCustomer}
                      className={`w-full px-3 py-2 border border-gray-500 rounded-lg text-white focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 ${
                        selectedCustomer ? 'bg-gray-600/50' : 'bg-gray-600'
                      }`}
                      placeholder="05XX XXX XX XX"
                    />
                    {!selectedCustomer && formData.customerPhone.length > 0 && (
                      <p className="text-xs text-gray-500 mt-1">
                        🔍 Telefon numarası girerken otomatik müşteri aranıyor...
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Ödeme Türü Seçimi (Sadece Satış İşlemleri İçin) */}
            {formData.type === 'satis' && (
              <div className="md:col-span-2 mb-6">
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  <div className="flex items-center">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></div>
                    Ödeme Türü
                  </div>
                </label>
                
                <div className="grid grid-cols-3 gap-3">
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: 'cash' })}
                    className={`p-3 rounded-lg border-2 transition-all duration-300 flex flex-col items-center space-y-2 ${
                      formData.paymentType === 'cash'
                        ? 'border-green-500 bg-green-900/20 shadow-2xl shadow-green-500/25'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-2xl">💵</div>
                    <span className="text-sm font-medium text-white">Nakit</span>
                    {formData.paymentType === 'cash' && (
                      <div className="text-xs text-green-400">Anlık ödeme</div>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: 'credit' })}
                    className={`p-3 rounded-lg border-2 transition-all duration-300 flex flex-col items-center space-y-2 ${
                      formData.paymentType === 'credit'
                        ? 'border-yellow-500 bg-yellow-900/20 shadow-2xl shadow-yellow-500/25'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-2xl">💳</div>
                    <span className="text-sm font-medium text-white">Vadeli</span>
                    {formData.paymentType === 'credit' && (
                      <div className="text-xs text-yellow-400">Alacak kaydı</div>
                    )}
                  </button>
                  
                  <button
                    type="button"
                    onClick={() => setFormData({ ...formData, paymentType: 'installment' })}
                    className={`p-3 rounded-lg border-2 transition-all duration-300 flex flex-col items-center space-y-2 ${
                      formData.paymentType === 'installment'
                        ? 'border-blue-500 bg-blue-900/20 shadow-2xl shadow-blue-500/25'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="text-2xl">📋</div>
                    <span className="text-sm font-medium text-white">Taksitli</span>
                    {formData.paymentType === 'installment' && (
                      <div className="text-xs text-blue-400">Taksit planı</div>
                    )}
                  </button>
                </div>
                
                {/* Ödeme Türü Açıklaması */}
                {formData.paymentType !== 'cash' && (
                  <div className="mt-3 p-3 bg-yellow-900/20 border border-yellow-500/30 rounded-lg">
                    <div className="flex items-center space-x-2">
                      <div className="text-yellow-400">⚠️</div>
                      <div className="text-sm text-yellow-300">
                        {formData.paymentType === 'credit' 
                          ? 'Bu satış için müşteri hesabında alacak kaydı oluşturulacak.'
                          : 'Bu satış için müşteri hesabında taksitli alacak kaydı oluşturulacak.'
                        }
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Ürün Seçimi (Sadece Satış İşlemleri İçin) */}
            {formData.type === 'satis' && (
              <div className="md:col-span-2">
                <label className="block text-sm font-medium text-gray-400 mb-3">
                  Ürün Seçimi
                </label>
                
                {/* Ürün Arama ve Ekleme */}
                <div className="mb-4 product-search-container">
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Search className="h-5 w-5 text-gray-400" />
                    </div>
                    <input
                      type="text"
                      placeholder="Ürün ara ve seç..."
                      value={productSearchTerm}
                      onChange={(e) => {
                        setProductSearchTerm(e.target.value);
                        setShowProductSearch(true);
                      }}
                      onFocus={() => setShowProductSearch(true)}
                      className="w-full pl-10 pr-4 py-3 bg-gray-700 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:border-blue-500 focus:ring-2 focus:ring-blue-500/20 transition-all duration-200"
                    />
                    {productSearchTerm && (
                      <button
                        onClick={() => {
                          setProductSearchTerm('');
                          setShowProductSearch(false);
                        }}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-300 transition-colors"
                      >
                        <X className="h-5 w-5" />
                      </button>
                    )}
                  </div>
                  
                  {/* Ürün Arama Sonuçları */}
                  {showProductSearch && (
                    <div className="absolute z-10 w-full mt-1 bg-gray-700 border border-gray-600 rounded-lg shadow-lg max-h-60 overflow-auto">
                      {filteredProducts
                        .filter(product => !selectedProducts.find(sp => sp.productId === product._id))
                        .map((product) => (
                          <button
                            key={product._id}
                            type="button"
                            onClick={() => {
                              addProduct(product._id);
                              setProductSearchTerm('');
                              setShowProductSearch(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-gray-600 transition-colors border-b border-gray-600 last:border-b-0"
                          >
                            <div className="flex items-center justify-between">
                              <div>
                                <div className="text-white font-medium">{product.name}</div>
                                <div className="text-gray-400 text-sm">{formatCurrency(product.sellPrice)}</div>
                              </div>
                              <div className="text-xs text-blue-400">
                                Stok: {product.stock || 0}
                              </div>
                            </div>
                          </button>
                        ))
                      }
                      
                      {filteredProducts.filter(product => !selectedProducts.find(sp => sp.productId === product._id)).length === 0 && (
                        <div className="px-4 py-3 text-gray-400 text-center">
                          {productSearchTerm ? 'Ürün bulunamadı' : 'Tüm ürünler seçildi'}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* Seçili Ürünler */}
                {selectedProducts.length > 0 && (
                  <div className="space-y-3">
                    <h4 className="text-sm font-medium text-gray-300">Seçili Ürünler:</h4>
                    {selectedProducts.map((selectedProduct) => (
                      <div 
                        key={selectedProduct.productId} 
                        className="flex items-center justify-between p-3 bg-gray-700 rounded-lg border border-gray-600"
                      >
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="text-white font-medium">{selectedProduct.name}</span>
                            <span className="text-gray-400 text-sm">
                              {formatCurrency(selectedProduct.unitPrice)} x {selectedProduct.quantity} = 
                              <span className="text-green-400 font-medium ml-1">
                                {formatCurrency(selectedProduct.unitPrice * selectedProduct.quantity)}
                              </span>
                            </span>
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-3 ml-4">
                          <div className="flex items-center space-x-2">
                            <label className="text-xs text-gray-400">Adet:</label>
                            <input
                              type="number"
                              min="1"
                              value={selectedProduct.quantity}
                              onChange={(e) => updateProductQuantity(
                                selectedProduct.productId, 
                                parseInt(e.target.value) || 1
                              )}
                              className="w-16 px-2 py-1 bg-gray-600 border border-gray-500 rounded text-white text-sm focus:outline-none focus:border-blue-500"
                            />
                          </div>
                          
                          <button
                            type="button"
                            onClick={() => removeProduct(selectedProduct.productId)}
                            className="p-1 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded transition-colors"
                            title="Ürünü Çıkar"
                          >
                            <X className="h-4 w-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                    
                    {/* Ara Toplam ve İndirim */}
                    <div className="space-y-3">
                      {/* Ara Toplam */}
                      <div className="p-3 bg-gray-700/50 rounded-lg border border-gray-600">
                        <div className="flex justify-between items-center">
                          <span className="text-gray-400 font-medium">Ara Toplam:</span>
                          <span className="text-white font-bold text-lg">
                            {formatCurrency(selectedProducts.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0))}
                          </span>
                        </div>
                      </div>

                      {/* İndirim Ayarları */}
                      <div className="p-4 bg-gray-700/50 rounded-lg border border-gray-600">
                        <h5 className="text-sm font-medium text-gray-300 mb-3 flex items-center">
                          <div className="w-2 h-2 bg-yellow-400 rounded-full mr-2 animate-pulse"></div>
                          İndirim Uygula
                          {selectedCustomer?.discountCard?.isActive && (
                            <span className="ml-2 text-xs bg-green-900/50 text-green-400 px-2 py-1 rounded">
                              Müşteri kartı uygulandı
                            </span>
                          )}
                        </h5>
                        
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">
                              İndirim Türü
                            </label>
                            <select
                              value={formData.discountType}
                              onChange={(e) => setFormData({ ...formData, discountType: e.target.value as 'tutar' | 'yuzde' })}
                              className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                            >
                              <option value="tutar">Tutar (₺)</option>
                              <option value="yuzde">Yüzde (%)</option>
                            </select>
                          </div>
                          
                          <div>
                            <label className="block text-xs font-medium text-gray-400 mb-2">
                              İndirim Miktarı
                            </label>
                            <input
                              type="number"
                              min="0"
                              step={formData.discountType === 'yuzde' ? '1' : '0.01'}
                              max={formData.discountType === 'yuzde' ? '100' : undefined}
                              value={formData.discount || ''}
                              onChange={(e) => setFormData({ ...formData, discount: parseFloat(e.target.value) || 0 })}
                              className="w-full bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
                              placeholder={formData.discountType === 'yuzde' ? '0-100' : '0.00'}
                            />
                          </div>
                          
                          <div className="flex items-end">
                            <div className="w-full">
                              <label className="block text-xs font-medium text-gray-400 mb-2">
                                İndirim Tutarı
                              </label>
                              <div className="bg-gray-600 border border-gray-500 rounded-lg px-3 py-2 text-orange-400 text-sm font-medium">
                                {formatCurrency(getDiscountAmount(
                                  selectedProducts.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0),
                                  formData.discount,
                                  formData.discountType
                                ))}
                              </div>
                            </div>
                          </div>
                        </div>
                        
                        {formData.discount > 0 && (
                          <div className="mt-3 p-2 bg-orange-900/20 rounded border border-orange-500/30">
                            <div className="text-xs text-orange-400">
                              İndirim: {formatDiscount(formData.discount, formData.discountType)} = 
                              {formatCurrency(getDiscountAmount(
                                selectedProducts.reduce((sum, p) => sum + (p.unitPrice * p.quantity), 0),
                                formData.discount,
                                formData.discountType
                              ))}
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Son Toplam */}
                      <div className="p-3 bg-blue-900/20 rounded-lg border border-blue-500/30">
                        <div className="flex justify-between items-center">
                          <span className="text-blue-400 font-medium">Toplam Tutar:</span>
                          <span className="text-white font-bold text-lg">
                            {formatCurrency(formData.amount)}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {selectedProducts.length === 0 && (
                  <div className="text-center py-8 text-gray-500">
                    Satış işlemi için lütfen ürün seçin
                  </div>
                )}
              </div>
            )}

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Kategori
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {categories[formData.type].map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
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
                disabled={formData.type === 'satis'}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                placeholder={formData.type === 'satis' ? 'Otomatik hesaplanacak' : 'Tutar girin'}
              />
              {formData.type === 'satis' && (
                <p className="text-xs text-gray-500 mt-1">
                  Tutar seçili ürünlere göre otomatik hesaplanır
                </p>
              )}
            </div>

            <div className="md:col-span-2">
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Açıklama
              </label>
              <input
                type="text"
                required={formData.type !== 'satis'}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                disabled={formData.type === 'satis'}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500 disabled:opacity-50"
                placeholder={
                  formData.type === 'satis' 
                    ? 'Seçili ürünlere göre otomatik oluşturulacak'
                    : 'İşlem açıklaması...'
                }
              />
              {formData.type === 'satis' && (
                <p className="text-xs text-gray-500 mt-1">
                  Açıklama seçili ürünlere göre otomatik oluşturulur
                </p>
              )}
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
                disabled={
                  (formData.type === 'satis' && selectedProducts.length === 0) ||
                  (formData.type !== 'satis' && (!formData.description || formData.amount <= 0))
                }
                className="btn btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editingTransaction ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Transactions List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  İşlem
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tür
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Müşteri
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Tutar
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
              {transactions.map((transaction) => {
                const Icon = getTransactionIcon(transaction.type);
                return (
                  <tr key={transaction._id} className="hover:bg-gray-700 transition-colors">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <Icon className={`h-5 w-5 mr-3 ${getTransactionColor(transaction.type)}`} />
                        <div>
                          <div className="text-sm font-medium text-white">
                            {transaction.description}
                          </div>
                          {transaction.quantity > 1 && (
                            <div className="text-sm text-gray-400">
                              Toplam: {transaction.quantity} adet
                            </div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        transaction.type === 'gelir' ? 'bg-green-900 text-green-400' :
                        transaction.type === 'gider' ? 'bg-red-900 text-red-400' :
                        'bg-blue-900 text-blue-400'
                      }`}>
                        {transactionTypes.find(t => t.value === transaction.type)?.label}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {transaction.category}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      {transaction.type === 'satis' && (transaction.customerName || transaction.customerPhone) ? (
                        <div className="space-y-1">
                          <div className="text-white font-medium">
                            {transaction.customerName} {transaction.customerSurname}
                          </div>
                          <div className="text-xs text-gray-400">
                            {transaction.customerPhone}
                          </div>
                        </div>
                      ) : (
                        <span className="text-gray-500 italic">-</span>
                      )}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="space-y-1">
                        <span className={getTransactionColor(transaction.type)}>
                          {transaction.type === 'gider' ? '-' : '+'}{formatCurrency(transaction.amount)}
                        </span>
                        {transaction.type === 'satis' && transaction.discount > 0 && (
                          <div className="space-y-1">
                            <div className="text-xs text-gray-400">
                              İndirim Öncesi: {formatCurrency(transaction.originalAmount || transaction.amount)}
                            </div>
                            <div className="text-xs text-orange-400">
                              İndirim: -{formatDiscount(transaction.discount, transaction.discountType)}
                              {transaction.discountType === 'yuzde' && 
                                ` (${formatCurrency(getDiscountAmount(transaction.originalAmount || transaction.amount, transaction.discount, transaction.discountType))})`
                              }
                            </div>
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex items-center">
                        <Calendar className="h-4 w-4 mr-2 text-gray-400" />
                        {formatDate(transaction.createdAt)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => handleEdit(transaction)}
                          className="p-2 text-blue-400 hover:text-blue-300 hover:bg-blue-900/20 rounded-lg transition-all duration-200 transform hover:scale-110"
                          title="Düzenle"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => setDeleteConfirm(transaction._id)}
                          className="p-2 text-red-400 hover:text-red-300 hover:bg-red-900/20 rounded-lg transition-all duration-200 transform hover:scale-110"
                          title="Sil"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        
        {transactions.length === 0 && (
          <div className="text-center py-12">
            <TrendingUp className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-400">Henüz işlem eklenmemiş</p>
          </div>
        )}
      </div>
      
      {/* Delete Confirmation Modal */}
      {deleteConfirm && (
        <>
          <div 
            className="fixed inset-0 bg-black/70 z-[99998]" 
            onClick={() => setDeleteConfirm(null)}
          ></div>
          <div 
            className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[99999] w-full max-w-md mx-4"
          >
            <div className="bg-gray-800 rounded-xl p-6 shadow-2xl border border-gray-700">
              <div className="flex items-center space-x-3 mb-4">
                <div className="p-2 bg-red-500/20 rounded-lg">
                  <Trash2 className="h-6 w-6 text-red-400" />
                </div>
                <h2 className="text-xl font-bold text-white">İşlemi Sil</h2>
              </div>
              
              <p className="text-gray-300 mb-6 leading-relaxed">
                Bu işlemi silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
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
        </>
      )}
    </div>
  );
}