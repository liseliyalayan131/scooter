'use client';

import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Package, X, CheckSquare, Square, Search, Upload, Download, FileText } from 'lucide-react';

interface Product {
  _id: string;
  name: string;
  buyPrice: number;
  sellPrice: number;
  category: string;
  stock: number;
  minStock: number;
  description: string;
  barcode?: string;
}

interface ProductForm {
  name: string;
  buyPrice: number;
  sellPrice: number;
  category: string;
  stock: number;
  minStock: number;
  description: string;
  barcode?: string;  // Optional yap
}

export default function ProductManagement() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);
  const [showBulkUpload, setShowBulkUpload] = useState(false);
  const [uploadFile, setUploadFile] = useState<File | null>(null);
  const [previewData, setPreviewData] = useState<any[]>([]);
  const [uploadLoading, setUploadLoading] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<string | null>(null);
  const [bulkDeleteConfirm, setBulkDeleteConfirm] = useState(false);
  const [fixBarcodeConfirm, setFixBarcodeConfirm] = useState(false);
  const [formData, setFormData] = useState<ProductForm>({
    name: '',
    buyPrice: 0,
    sellPrice: 0,
    category: 'Scooter',
    stock: 0,
    minStock: 5,
    description: '',
    barcode: ''
  });

  const categories = ['Scooter', 'Yedek Parça', 'Aksesuar', 'Lastik', 'Batarya', 'Diğer'];

  useEffect(() => {
    fetchProducts();
  }, []);

  // Arama fonksiyonu
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredProducts(products);
    } else {
      const filtered = products.filter(product =>
        product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
        product.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (product.barcode && product.barcode.toLowerCase().includes(searchTerm.toLowerCase()))
      );
      setFilteredProducts(filtered);
    }
  }, [products, searchTerm]);

  const fetchProducts = async () => {
    try {
      const response = await fetch('/api/products');
      if (response.ok) {
        const data = await response.json();
        setProducts(data);
      }
    } catch (error) {
      console.error('Ürünler alınamadı:', error);
    } finally {
      setLoading(false);
    }
  };

  // Bulk Operations
  const toggleProductSelection = (productId: string) => {
    setSelectedProducts(prev => 
      prev.includes(productId)
        ? prev.filter(id => id !== productId)
        : [...prev, productId]
    );
  };

  const toggleSelectAll = () => {
    if (selectedProducts.length === filteredProducts.length) {
      setSelectedProducts([]);
    } else {
      setSelectedProducts(filteredProducts.map(product => product._id));
    }
  };

  const clearSelection = () => {
    setSelectedProducts([]);
    setShowBulkActions(false);
  };

  const handleBulkDelete = async () => {
    if (selectedProducts.length === 0) return;
    setBulkDeleteConfirm(true);
  };

  const confirmBulkDelete = async () => {
    try {
      // Seçili ürünleri tek tek sil
      const deletePromises = selectedProducts.map(id => 
        fetch(`/api/products/${id}`, { method: 'DELETE' })
      );
      
      await Promise.all(deletePromises);
      await fetchProducts();
      clearSelection();
      setBulkDeleteConfirm(false);
      alert(`${selectedProducts.length} ürün başarıyla silindi!`);
    } catch (error) {
      console.error('Toplu silme hatası:', error);
      alert('Bazı ürünler silinemedi!');
    }
  };

  // Seçili ürünlerin durumunu kontrol et
  React.useEffect(() => {
    setShowBulkActions(selectedProducts.length > 0);
  }, [selectedProducts]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const url = editingProduct ? `/api/products/${editingProduct._id}` : '/api/products';
      const method = editingProduct ? 'PUT' : 'POST';
      
      // Barcode boş ise gönderme (undefined olarak bırak)
      const dataToSend: any = { ...formData };
      if (!dataToSend.barcode || dataToSend.barcode.trim() === '') {
        delete dataToSend.barcode;
      }
      
      console.log('Gönderilecek data:', dataToSend);
      
      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(dataToSend),
      });

      if (response.ok) {
        await fetchProducts();
        resetForm();
        alert('Ürün başarıyla kaydedildi!');
      } else {
        const errorData = await response.json();
        console.log('Hata response:', errorData);
        
        // Barcode index hatası için otomatik düzeltme
        if (errorData.code === 'BARCODE_INDEX_ERROR' || 
            (errorData.error && errorData.error.includes('E11000') && errorData.error.includes('barcode'))) {
          
          console.log('Barcode index sorunu tespit edildi, otomatik düzeltiliyor...');
          alert('Barcode index sorunu tespit edildi. Otomatik olarak düzeltiliyor...');
          
          // Fix-db API'’yi çağır
          const fixResponse = await fetch('/api/fix-db', {
            method: 'POST',
          });
          
          if (fixResponse.ok) {
            console.log('Index sorunu düzeltildi, tekrar deneniyor...');
            
            // Düzeltme işleminden sonra tekrar dene
            const retryResponse = await fetch(url, {
              method,
              headers: {
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(dataToSend),
            });
            
            if (retryResponse.ok) {
              await fetchProducts();
              resetForm();
              alert('Ürün başarıyla kaydedildi! (Index sorunu otomatik düzeltildi)');
            } else {
              const retryErrorData = await retryResponse.json();
              throw new Error(`Tekrar deneme başarısız: ${retryErrorData.error}`);
            }
          } else {
            const fixErrorData = await fixResponse.json();
            throw new Error(`Veritabanı düzeltme başarısız: ${fixErrorData.error}`);
          }
        } else {
          throw new Error(errorData.error || 'Ürün kaydedilemedi');
        }
      }
    } catch (error) {
      console.error('Ürün kaydedilemedi:', error);
      alert(error instanceof Error ? error.message : 'Ürün kaydedilemedi!');
    }
  };

  const handleDelete = async (id: string) => {
    try {
      const response = await fetch(`/api/products/${id}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        await fetchProducts();
        setDeleteConfirm(null);
      }
    } catch (error) {
      console.error('Ürün silinemedi:', error);
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      buyPrice: 0,
      sellPrice: 0,
      category: 'Scooter',
      stock: 0,
      minStock: 5,
      description: '',
      barcode: ''
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  const startEdit = (product: Product) => {
    setFormData({
      name: product.name,
      buyPrice: product.buyPrice,
      sellPrice: product.sellPrice,
      category: product.category,
      stock: product.stock,
      minStock: product.minStock || 5,
      description: product.description,
      barcode: product.barcode || ''
    });
    setEditingProduct(product);
    setShowForm(true);
  };

  const handleFixBarcode = () => {
    setFixBarcodeConfirm(true);
  };

  const confirmFixBarcode = async () => {
    try {
      const response = await fetch('/api/fix-db', {
        method: 'POST',
      });
      
      if (response.ok) {
        const data = await response.json();
        alert(data.message || 'Barcode sorunları başarıyla düzeltildi!');
        await fetchProducts(); // Ürünleri yeniden yükle
      } else {
        const errorData = await response.json();
        alert('Hata: ' + (errorData.error || 'Bilinmeyen hata'));
      }
    } catch (error) {
      console.error('Fix barcode error:', error);
      alert('Barcode düzeltme işlemi başarısız!');
    } finally {
      setFixBarcodeConfirm(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('tr-TR', {
      style: 'currency',
      currency: 'TRY'
    }).format(amount);
  };

  // Toplu yükleme fonksiyonları
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    const validTypes = [
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    if (!validTypes.includes(file.type)) {
      alert('Lütfen sadece CSV veya Excel dosyası yükleyin!');
      return;
    }

    setUploadFile(file);
    parseFile(file);
  };

  const parseFile = async (file: File) => {
    setUploadLoading(true);
    try {
      if (file.type === 'text/csv') {
        await parseCSV(file);
      } else {
        await parseExcel(file);
      }
    } catch (error) {
      console.error('Dosya işleme hatası:', error);
      alert('Dosya işlenirken hata oluştu!');
    } finally {
      setUploadLoading(false);
    }
  };

  const parseCSV = async (file: File) => {
    const text = await file.text();
    const lines = text.split('\n').filter(line => line.trim());
    const headers = lines[0].split(',').map(h => h.trim().replace(/"/g, ''));
    
    const data = lines.slice(1).map((line, index) => {
      const values = line.split(',').map(v => v.trim().replace(/"/g, ''));
      const row: any = { id: index + 1 };
      
      headers.forEach((header, i) => {
        row[header.toLowerCase()] = values[i] || '';
      });
      
      return row;
    });

    setPreviewData(data.slice(0, 50)); // İlk 50 satırı göster
  };

  const parseExcel = async (file: File) => {
    // Excel parsing için basic implementation
    // Gerçek projede SheetJS kullanılabilir
    alert('Excel desteği için CSV formatını kullanın. Excel dosyasını CSV olarak kaydedin.');
  };

  const downloadTemplate = () => {
    const csvContent = 'name,buyPrice,sellPrice,category,stock,minStock,description,barcode\n' +
                      'Örnek Ürün,1000,1500,Scooter,10,5,Örnek açıklama,ORN001\n' +
                      'Başka Ürün,500,750,Yedek Parça,20,3,Başka açıklama,BSK002';
    
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', 'urun_sablonu.csv');
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const validateUploadData = (data: any[]) => {
    const errors: string[] = [];
    const validCategories = ['Scooter', 'Yedek Parça', 'Aksesuar', 'Lastik', 'Batarya', 'Diğer'];

    data.forEach((row, index) => {
      if (!row.name || row.name.trim() === '') {
        errors.push(`Satır ${index + 2}: Ürün adı boş olamaz`);
      }
      
      if (!row.buyprice || isNaN(parseFloat(row.buyprice))) {
        errors.push(`Satır ${index + 2}: Geçerli bir alış fiyatı giriniz`);
      }
      
      if (!row.sellprice || isNaN(parseFloat(row.sellprice))) {
        errors.push(`Satır ${index + 2}: Geçerli bir satış fiyatı giriniz`);
      }
      
      if (row.category && !validCategories.includes(row.category)) {
        errors.push(`Satır ${index + 2}: Geçersiz kategori (${validCategories.join(', ')})`);
      }
    });

    return errors;
  };

  const handleBulkUpload = async () => {
    if (!previewData.length) {
      alert('Önce bir dosya yükleyin!');
      return;
    }

    const errors = validateUploadData(previewData);
    if (errors.length > 0) {
      alert('Hata(lar) bulundu:\n' + errors.slice(0, 5).join('\n') + 
            (errors.length > 5 ? `\n... ve ${errors.length - 5} hata daha` : ''));
      return;
    }

    setUploadLoading(true);
    try {
      const response = await fetch('/api/products/bulk-upload', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ products: previewData }),
      });

      if (response.ok) {
        const result = await response.json();
        alert(`${result.successful} ürün başarıyla yüklendi!${result.failed > 0 ? ` ${result.failed} ürün başarısız.` : ''}`);
        await fetchProducts();
        resetBulkUpload();
      } else {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Toplu yükleme başarısız');
      }
    } catch (error) {
      console.error('Toplu yükleme hatası:', error);
      alert(error instanceof Error ? error.message : 'Toplu yükleme başarısız!');
    } finally {
      setUploadLoading(false);
    }
  };

  const resetBulkUpload = () => {
    setShowBulkUpload(false);
    setUploadFile(null);
    setPreviewData([]);
    setUploadLoading(false);
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
          <h1 className="text-3xl font-bold text-white mb-2">Ürün Yönetimi</h1>
          <p className="text-gray-400">Dükkanınızdaki ürünleri yönetin</p>
        </div>
        <div className="btn-group">
          <button
            onClick={downloadTemplate}
            className="btn btn-secondary"
            title="Şablon dosyasını indir"
          >
            <Download className="h-5 w-5" />
            <span>Şablon İndir</span>
          </button>
          
          <button
            onClick={() => setShowBulkUpload(true)}
            className="btn btn-primary"
            title="Excel/CSV dosyasından toplu ürün yükle"
          >
            <Upload className="h-5 w-5" />
            <span>Toplu Yükle</span>
          </button>
          
          <button
            onClick={handleFixBarcode}
            className="btn btn-secondary"
            title="Barcode index sorunlarını düzelt"
          >
            <Package className="h-5 w-5" />
            <span>Barcode Düzelt</span>
          </button>
          
          <button
            onClick={() => setShowForm(true)}
            className="btn btn-primary"
          >
            <Plus className="h-5 w-5" />
            <span>Yeni Ürün</span>
          </button>
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
            placeholder="Ürün adı, kategori, açıklama veya barkoda göre ara..."
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
            <span className="text-blue-400 font-medium">{filteredProducts.length}</span> ürün bulundu
            {searchTerm && ` &quot;${searchTerm}&quot; için`}
          </div>
        )}
      </div>

      {/* Bulk Actions Bar */}
      {showBulkActions && (
        <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4 animate-slideInDown">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2">
                <CheckSquare className="h-5 w-5 text-blue-400" />
                <span className="text-blue-400 font-medium">
                  {selectedProducts.length} ürün seçildi
                </span>
              </div>
              
              <button
                onClick={toggleSelectAll}
                className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
              >
                {selectedProducts.length === filteredProducts.length ? 'Hiçbirini seçme' : 'Hepsini seç'}
              </button>
            </div>
            
            <div className="flex items-center space-x-3">
              <button
                onClick={handleBulkDelete}
                className="btn btn-danger"
              >
                <Trash2 className="h-4 w-4" />
                <span>Seçili Ürünleri Sil</span>
              </button>
              
              <button
                onClick={clearSelection}
                className="text-gray-400 hover:text-gray-300 p-2 rounded-lg transition-colors"
                title="Seçimi temizle"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toplu Yükleme Modal */}
      {showBulkUpload && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center" style={{zIndex: 99999}}>
          <div className="bg-gray-800 rounded-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-700 transform transition-all duration-200 scale-100 mx-4 p-6">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center space-x-3">
                <Upload className="h-6 w-6 text-purple-400" />
                <h2 className="text-xl font-bold text-white">Toplu Ürün Yükleme</h2>
              </div>
              <button
                onClick={resetBulkUpload}
                className="text-gray-400 hover:text-gray-300"
              >
                <X className="h-6 w-6" />
              </button>
            </div>

            {!uploadFile ? (
              /* Dosya Seçim Alanı */
              <div className="space-y-6">
                <div className="text-center">
                  <div className="border-2 border-dashed border-gray-600 rounded-lg p-8 hover:border-purple-500 transition-colors">
                    <Upload className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-300 mb-2">CSV veya Excel dosyasını sürükleyin veya seçin</p>
                    <p className="text-gray-500 text-sm mb-4">Maksimum dosya boyutu: 5MB</p>
                    
                    <input
                      type="file"
                      accept=".csv,.xlsx,.xls"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="bulk-upload-input"
                    />
                    <label
                      htmlFor="bulk-upload-input"
                      className="btn btn-primary cursor-pointer"
                    >
                      Dosya Seç
                    </label>
                  </div>
                </div>

                <div className="bg-gray-700 rounded-lg p-4">
                  <h3 className="text-white font-semibold mb-3 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-blue-400" />
                    Dosya Formatı
                  </h3>
                  <div className="text-sm text-gray-300 space-y-2">
                    <p><strong>CSV Sütun Başlıkları:</strong></p>
                    <p className="font-mono bg-gray-800 p-2 rounded text-blue-400">
                      name,buyPrice,sellPrice,category,stock,minStock,description,barcode
                    </p>
                    <div className="grid grid-cols-2 gap-4 mt-4">
                      <div>
                        <p><strong>Zorunlu Alanlar:</strong></p>
                        <ul className="list-disc list-inside text-gray-400">
                          <li>name (Ürün Adı)</li>
                          <li>buyPrice (Alış Fiyatı)</li>
                          <li>sellPrice (Satış Fiyatı)</li>
                        </ul>
                      </div>
                      <div>
                        <p><strong>Opsiyonel Alanlar:</strong></p>
                        <ul className="list-disc list-inside text-gray-400">
                          <li>category (Kategori)</li>
                          <li>stock (Stok Adedi)</li>
                          <li>minStock (Min. Stok)</li>
                          <li>description (Açıklama)</li>
                          <li>barcode (Barkod)</li>
                        </ul>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              /* Önizleme ve Yükleme Alanı */
              <div className="space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <FileText className="h-5 w-5 text-green-400" />
                    <div>
                      <div className="text-white font-medium">{uploadFile.name}</div>
                      <div className="text-gray-400 text-sm">{previewData.length} ürün bulundu</div>
                    </div>
                  </div>
                  
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={resetBulkUpload}
                      className="text-gray-400 hover:text-gray-300 text-sm"
                    >
                      Dosya Değiştir
                    </button>
                    <button
                      onClick={handleBulkUpload}
                      disabled={uploadLoading || previewData.length === 0}
                      className="btn btn-success"
                    >
                      {uploadLoading ? 'Yükleniyor...' : `${previewData.length} Ürünü Yükle`}
                    </button>
                  </div>
                </div>

                {/* Önizleme Tablosu */}
                {previewData.length > 0 && (
                  <div className="bg-gray-700 rounded-lg p-4">
                    <h3 className="text-white font-semibold mb-3">Önizleme (İlk 10 Ürün)</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-600">
                          <tr>
                            <th className="px-3 py-2 text-left text-gray-300">Ürün Adı</th>
                            <th className="px-3 py-2 text-left text-gray-300">Alış Fiyatı</th>
                            <th className="px-3 py-2 text-left text-gray-300">Satış Fiyatı</th>
                            <th className="px-3 py-2 text-left text-gray-300">Kategori</th>
                            <th className="px-3 py-2 text-left text-gray-300">Stok</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-600">
                          {previewData.slice(0, 10).map((row, index) => (
                            <tr key={index} className="hover:bg-gray-600">
                              <td className="px-3 py-2 text-white">{row.name || '❌ Eksik'}</td>
                              <td className="px-3 py-2 text-white">{row.buyprice || '❌ Eksik'}</td>
                              <td className="px-3 py-2 text-white">{row.sellprice || '❌ Eksik'}</td>
                              <td className="px-3 py-2 text-white">{row.category || 'Scooter'}</td>
                              <td className="px-3 py-2 text-white">{row.stock || '0'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {previewData.length > 10 && (
                      <p className="text-gray-400 text-sm mt-2">
                        ...ve {previewData.length - 10} ürün daha
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Product Form */}
      {showForm && (
        <div className="bg-gray-800 rounded-lg p-6 border border-gray-700 card-hover animate-slideInDown">
          <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
            <div className="w-2 h-2 bg-blue-400 rounded-full mr-3 animate-pulse"></div>
            {editingProduct ? 'Ürün Düzenle' : 'Yeni Ürün Ekle'}
          </h3>
          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Ürün Adı
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Kategori
              </label>
              <select
                value={formData.category}
                onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              >
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Alış Fiyatı (₺)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.buyPrice || ''}
                onChange={(e) => setFormData({ ...formData, buyPrice: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Satış Fiyatı (₺)
              </label>
              <input
                type="number"
                required
                min="0"
                step="0.01"
                value={formData.sellPrice || ''}
                onChange={(e) => setFormData({ ...formData, sellPrice: parseFloat(e.target.value) || 0 })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Stok Adedi
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.stock || ''}
                onChange={(e) => setFormData({ ...formData, stock: parseInt(e.target.value) || 0 })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Minimum Stok 🔔
              </label>
              <input
                type="number"
                required
                min="0"
                value={formData.minStock || ''}
                onChange={(e) => setFormData({ ...formData, minStock: parseInt(e.target.value) || 5 })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="Bu seviyeye düştüğünde uyarı ver"
              />
              <p className="text-xs text-gray-500 mt-1">
                Stok bu seviyeye düştüğünde dashboardda uyarı görürsünüz
              </p>
            </div>

            <div>
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

            <div>
              <label className="block text-sm font-medium text-gray-400 mb-2">
                Barkod (Opsiyonel)
              </label>
              <input
                type="text"
                value={formData.barcode}
                onChange={(e) => setFormData({ ...formData, barcode: e.target.value })}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-blue-500"
                placeholder="Ürün barkodunu girin"
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
                {editingProduct ? 'Güncelle' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Products List */}
      <div className="bg-gray-800 rounded-lg border border-gray-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-700">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider w-12">
                  <button
                    onClick={toggleSelectAll}
                    className="flex items-center justify-center w-5 h-5 rounded border-2 border-gray-400 hover:border-blue-400 transition-colors"
                  >
                    {selectedProducts.length === filteredProducts.length && filteredProducts.length > 0 ? (
                      <CheckSquare className="h-4 w-4 text-blue-400" />
                    ) : selectedProducts.length > 0 ? (
                      <div className="w-2 h-2 bg-blue-400 rounded"></div>
                    ) : (
                      <Square className="h-4 w-4 text-gray-400" />
                    )}
                  </button>
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Ürün
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Kategori
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Alış Fiyatı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Satış Fiyatı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Kar Marjı
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  Stok
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-400 uppercase tracking-wider">
                  İşlemler
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-700">
              {filteredProducts.map((product) => (
                <tr key={product._id} className={`hover:bg-gray-700 transition-colors ${
                  selectedProducts.includes(product._id) ? 'bg-blue-900/20 border-blue-500/30' : ''
                }`}>
                  {/* Checkbox */}
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => toggleProductSelection(product._id)}
                      className="flex items-center justify-center w-5 h-5 rounded border-2 border-gray-400 hover:border-blue-400 transition-colors"
                    >
                      {selectedProducts.includes(product._id) ? (
                        <CheckSquare className="h-4 w-4 text-blue-400" />
                      ) : (
                        <Square className="h-4 w-4 text-gray-400" />
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center">
                      <Package className="h-5 w-5 text-gray-400 mr-3" />
                      <div>
                        <div className="text-sm font-medium text-white">
                          {product.name}
                        </div>
                        {product.description && (
                          <div className="text-sm text-gray-400">
                            {product.description}
                          </div>
                        )}
                        {product.barcode && (
                          <div className="text-sm text-blue-400">
                            Barkod: {product.barcode}
                          </div>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {product.category}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatCurrency(product.buyPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    {formatCurrency(product.sellPrice)}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <span className={`${product.sellPrice > product.buyPrice ? 'text-green-400' : 'text-red-400'}`}>
                      {formatCurrency(product.sellPrice - product.buyPrice)}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-300">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs ${
                        product.stock > product.minStock ? 'bg-green-900 text-green-400' : 
                        product.stock > 0 ? 'bg-orange-900 text-orange-400' : 
                        'bg-red-900 text-red-400'
                      }`}>
                        {product.stock} adet
                      </span>
                      {product.stock <= product.minStock && (
                        <span className="text-orange-400 text-xs">
                          ⚠️ Min: {product.minStock}
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex space-x-2">
                      <button
                        onClick={() => startEdit(product)}
                        className="text-blue-400 hover:text-blue-300"
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(product._id)}
                        className="text-red-400 hover:text-red-300"
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
        
        {filteredProducts.length === 0 && (
          <div className="text-center py-12">
            <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            {searchTerm ? (
              <div>
                <p className="text-gray-400 mb-2">&quot;{searchTerm}&quot; için sonuç bulunamadı</p>
                <button 
                  onClick={() => setSearchTerm('')}
                  className="text-blue-400 hover:text-blue-300 text-sm transition-colors"
                >
                  Tüm ürünleri göster
                </button>
              </div>
            ) : (
              <p className="text-gray-400">Henüz ürün eklenmemiş</p>
            )}
          </div>
        )}
      </div>

      {/* Tek Ürün Silme Onay Modal */}
      {deleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <Trash2 className="h-6 w-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Ürünü Sil</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Bu ürünü silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteConfirm(null)}
                className="btn btn-secondary"
              >
                İptal
              </button>
              <button
                onClick={() => handleDelete(deleteConfirm)}
                className="btn btn-danger"
              >
                Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toplu Silme Onay Modal */}
      {bulkDeleteConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <Trash2 className="h-6 w-6 text-red-400" />
              <h3 className="text-lg font-semibold text-white">Toplu Silme</h3>
            </div>
            <p className="text-gray-300 mb-6">
              Seçili <span className="font-bold text-red-400">{selectedProducts.length} ürünü</span> silmek istediğinizden emin misiniz? Bu işlem geri alınamaz.
            </p>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setBulkDeleteConfirm(false)}
                className="btn btn-secondary"
              >
                İptal
              </button>
              <button
                onClick={confirmBulkDelete}
                className="btn btn-danger"
              >
                {selectedProducts.length} Ürünü Sil
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Barcode Düzeltme Onay Modal */}
      {fixBarcodeConfirm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-md flex items-center justify-center z-50">
          <div className="bg-gray-800 rounded-xl p-6 w-full max-w-md mx-4 shadow-2xl border border-gray-700">
            <div className="flex items-center space-x-3 mb-4">
              <Package className="h-6 w-6 text-orange-400" />
              <h3 className="text-lg font-semibold text-white">Barcode Düzelt</h3>
            </div>
            <div className="text-gray-300 mb-6 space-y-2">
              <p>Bu işlem veritabanındaki barcode index sorunlarını düzeltecek:</p>
              <ul className="list-disc list-inside text-sm space-y-1 ml-2">
                <li>Duplicate barcode index&apos;lerini temizler</li>
                <li>Boş barcode değerlerini kaldırır</li>
                <li>Index&apos;i yeniden oluşturur</li>
              </ul>
              <p className="text-orange-400 text-sm font-semibold mt-3">
                ⚠️ Bu işlem birkaç saniye sürebilir.
              </p>
            </div>
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setFixBarcodeConfirm(false)}
                className="btn btn-secondary"
              >
                İptal
              </button>
              <button
                onClick={confirmFixBarcode}
                className="btn btn-warning"
              >
                Düzelt
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}