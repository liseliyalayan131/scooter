'use client';

import { useState, useEffect, useCallback } from 'react';
import { 
  Calculator, 
  Trash2, 
  RotateCcw, 
  Percent,
  DollarSign,
  History,
  Copy,
  Check
} from 'lucide-react';

interface HistoryItem {
  id: string;
  expression: string;
  result: string;
  timestamp: Date;
}

export default function CalculatorPage() {
  const [display, setDisplay] = useState('0');
  const [previousValue, setPreviousValue] = useState<number | null>(null);
  const [operation, setOperation] = useState<string | null>(null);
  const [waitingForNewValue, setWaitingForNewValue] = useState(false);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [copied, setCopied] = useState(false);

  // KDV ve kar marjı hesaplama için
  const [kdvRate, setKdvRate] = useState(20);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const addToHistory = useCallback((expression: string, result: string) => {
    const newItem: HistoryItem = {
      id: Date.now().toString(),
      expression,
      result,
      timestamp: new Date()
    };
    setHistory(prev => [newItem, ...prev.slice(0, 9)]); // Son 10 işlemi tut
  }, []);

  const inputNumber = useCallback((num: string) => {
    if (waitingForNewValue) {
      setDisplay(num);
      setWaitingForNewValue(false);
    } else {
      setDisplay(display === '0' ? num : display + num);
    }
  }, [display, waitingForNewValue]);

  const inputDecimal = useCallback(() => {
    if (waitingForNewValue) {
      setDisplay('0.');
      setWaitingForNewValue(false);
    } else if (display.indexOf('.') === -1) {
      setDisplay(display + '.');
    }
  }, [display, waitingForNewValue]);

  const clear = useCallback(() => {
    setDisplay('0');
    setPreviousValue(null);
    setOperation(null);
    setWaitingForNewValue(false);
  }, []);

  const deleteLast = useCallback(() => {
    if (display.length > 1) {
      setDisplay(display.slice(0, -1));
    } else {
      setDisplay('0');
    }
  }, [display]);

  const calculate = useCallback((firstValue?: number, secondValue?: number, operation?: string) => {
    const prev = firstValue ?? previousValue;
    const current = secondValue ?? parseFloat(display);
    const op = operation ?? (() => operation);

    if (prev === null || !op) return current;

    let result: number;
    switch (op) {
      case '+':
        result = prev + current;
        break;
      case '-':
        result = prev - current;
        break;
      case '*':
        result = prev * current;
        break;
      case '/':
        result = current !== 0 ? prev / current : 0;
        break;
      default:
        return current;
    }

    // Geçmişe ekle
    addToHistory(`${prev} ${op} ${current}`, result.toString());

    setDisplay(String(result));
    setPreviousValue(result);
    setOperation(null);
    setWaitingForNewValue(true);

    return result;
  }, [previousValue, display, addToHistory]);

  const inputOperation = useCallback((nextOperation: string) => {
    const inputValue = parseFloat(display);

    if (previousValue === null) {
      setPreviousValue(inputValue);
    } else if (operation) {
      const currentValue = previousValue || 0;
      const newValue = calculate(currentValue, inputValue, operation);

      setDisplay(String(newValue));
      setPreviousValue(newValue);
    }

    setWaitingForNewValue(true);
    setOperation(nextOperation);
  }, [display, previousValue, operation, calculate]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const { key } = event;
      
      if (key >= '0' && key <= '9') {
        inputNumber(key);
      } else if (['+', '-', '*', '/'].includes(key)) {
        inputOperation(key);
      } else if (key === 'Enter' || key === '=') {
        calculate();
      } else if (key === 'Escape' || key === 'c' || key === 'C') {
        clear();
      } else if (key === 'Backspace') {
        deleteLast();
      } else if (key === '.') {
        inputDecimal();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inputNumber, inputOperation, calculate, clear, deleteLast, inputDecimal]);

  const percentage = () => {
    const value = parseFloat(display) / 100;
    setDisplay(String(value));
    addToHistory(`${display}%`, value.toString());
  };

  const clearHistory = () => {
    setHistory([]);
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // KDV Hesaplama
  const calculateKDV = (type: 'add' | 'remove') => {
    const value = parseFloat(display);
    if (isNaN(value)) return;

    let result: number;
    let expression: string;

    if (type === 'add') {
      result = value + (value * kdvRate / 100);
      expression = `${value} + %${kdvRate} KDV`;
    } else {
      result = value / (1 + kdvRate / 100);
      expression = `${value} - %${kdvRate} KDV`;
    }

    setDisplay(result.toFixed(2));
    addToHistory(expression, result.toFixed(2));
  };

  // Kar Marjı Hesaplama
  const calculateMargin = () => {
    const cost = parseFloat(display);
    if (isNaN(cost)) return;
    
    const marginPercent = 30; // %30 kar marjı
    const sellPrice = cost / (1 - marginPercent / 100);
    const profit = sellPrice - cost;
    
    setDisplay(sellPrice.toFixed(2));
    addToHistory(`${cost} + %${marginPercent} kar`, sellPrice.toFixed(2));
  };

  const buttons = [
    [
      { text: 'C', action: clear, className: 'bg-red-600 hover:bg-red-500 text-white col-span-2' },
      { text: '⌫', action: deleteLast, className: 'bg-gray-600 hover:bg-gray-500 text-white' },
      { text: '÷', action: () => inputOperation('/'), className: 'bg-blue-600 hover:bg-blue-500 text-white' }
    ],
    [
      { text: '7', action: () => inputNumber('7'), className: 'bg-gray-700 hover:bg-gray-600 text-white' },
      { text: '8', action: () => inputNumber('8'), className: 'bg-gray-700 hover:bg-gray-600 text-white' },
      { text: '9', action: () => inputNumber('9'), className: 'bg-gray-700 hover:bg-gray-600 text-white' },
      { text: '×', action: () => inputOperation('*'), className: 'bg-blue-600 hover:bg-blue-500 text-white' }
    ],
    [
      { text: '4', action: () => inputNumber('4'), className: 'bg-gray-700 hover:bg-gray-600 text-white' },
      { text: '5', action: () => inputNumber('5'), className: 'bg-gray-700 hover:bg-gray-600 text-white' },
      { text: '6', action: () => inputNumber('6'), className: 'bg-gray-700 hover:bg-gray-600 text-white' },
      { text: '−', action: () => inputOperation('-'), className: 'bg-blue-600 hover:bg-blue-500 text-white' }
    ],
    [
      { text: '1', action: () => inputNumber('1'), className: 'bg-gray-700 hover:bg-gray-600 text-white' },
      { text: '2', action: () => inputNumber('2'), className: 'bg-gray-700 hover:bg-gray-600 text-white' },
      { text: '3', action: () => inputNumber('3'), className: 'bg-gray-700 hover:bg-gray-600 text-white' },
      { text: '+', action: () => inputOperation('+'), className: 'bg-blue-600 hover:bg-blue-500 text-white' }
    ],
    [
      { text: '0', action: () => inputNumber('0'), className: 'bg-gray-700 hover:bg-gray-600 text-white col-span-2' },
      { text: '.', action: inputDecimal, className: 'bg-gray-700 hover:bg-gray-600 text-white' },
      { text: '=', action: () => calculate(), className: 'bg-green-600 hover:bg-green-500 text-white' }
    ]
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">Hesap Makinesi</h1>
        <p className="text-gray-400">Akıllı hesap makinesi ve işletme hesaplamaları</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Ana Hesap Makinesi */}
        <div className="lg:col-span-2 bg-gray-800 rounded-lg p-6 border border-gray-700">
          {/* Ekran */}
          <div className="bg-gray-900 rounded-lg p-4 mb-6 border-2 border-gray-600">
            <div className="text-right">
              {operation && previousValue !== null && (
                <div className="text-gray-400 text-sm mb-1">
                  {previousValue} {operation}
                </div>
              )}
              <div className="text-white text-3xl font-mono break-all">
                {display}
              </div>
              <button
                onClick={() => copyToClipboard(display)}
                className="mt-2 text-xs text-gray-500 hover:text-gray-300 flex items-center justify-end space-x-1"
              >
                {copied ? <Check className="h-3 w-3" /> : <Copy className="h-3 w-3" />}
                <span>{copied ? 'Kopyalandı!' : 'Kopyala'}</span>
              </button>
            </div>
          </div>

          {/* Tuş Takımı */}
          <div className="grid grid-cols-4 gap-3">
            {buttons.map((row, rowIndex) => (
              row.map((button, colIndex) => (
                <button
                  key={`${rowIndex}-${colIndex}`}
                  onClick={button.action}
                  className={`
                    h-16 rounded-lg font-semibold text-lg transition-all duration-200 
                    transform active:scale-95 hover:shadow-lg hover:shadow-blue-500/25
                    ${button.className}
                  `}
                >
                  {button.text}
                </button>
              ))
            ))}
          </div>

          {/* Ekstra İşlemler */}
          <div className="grid grid-cols-2 gap-3 mt-4">
            <button
              onClick={percentage}
              className="h-12 bg-orange-600 hover:bg-orange-500 text-white rounded-lg font-semibold transition-all duration-200 transform active:scale-95 flex items-center justify-center space-x-2"
            >
              <Percent className="h-4 w-4" />
              <span>Yüzde</span>
            </button>
            <button
              onClick={() => setShowAdvanced(!showAdvanced)}
              className="h-12 bg-purple-600 hover:bg-purple-500 text-white rounded-lg font-semibold transition-all duration-200 transform active:scale-95 flex items-center justify-center space-x-2"
            >
              <Calculator className="h-4 w-4" />
              <span>Gelişmiş</span>
            </button>
          </div>
        </div>

        {/* Yan Panel */}
        <div className="space-y-6">
          {/* Geçmiş */}
          <div className="bg-gray-800 rounded-lg border border-gray-700">
            <div className="p-4 border-b border-gray-700 flex items-center justify-between">
              <h3 className="text-lg font-semibold text-white flex items-center">
                <History className="h-5 w-5 mr-2 text-blue-400" />
                Geçmiş
              </h3>
              <button
                onClick={clearHistory}
                className="text-red-400 hover:text-red-300 p-1 rounded transition-colors"
                title="Geçmişi Temizle"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
            <div className="p-4 max-h-64 overflow-y-auto">
              {history.length === 0 ? (
                <p className="text-gray-500 text-center text-sm">Henüz işlem yapılmadı</p>
              ) : (
                <div className="space-y-2">
                  {history.map((item) => (
                    <div 
                      key={item.id} 
                      className="p-2 bg-gray-700 rounded cursor-pointer hover:bg-gray-600 transition-colors"
                      onClick={() => setDisplay(item.result)}
                    >
                      <div className="text-xs text-gray-400">{item.expression}</div>
                      <div className="text-sm text-white font-mono">= {item.result}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Gelişmiş İşlemler */}
          {showAdvanced && (
            <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
              <h3 className="text-lg font-semibold text-white mb-4 flex items-center">
                <DollarSign className="h-5 w-5 mr-2 text-green-400" />
                İşletme Hesaplamaları
              </h3>
              
              {/* KDV Hesaplama */}
              <div className="space-y-3">
                <div>
                  <label className="block text-sm text-gray-400 mb-2">KDV Oranı (%)</label>
                  <input
                    type="number"
                    value={kdvRate}
                    onChange={(e) => setKdvRate(Number(e.target.value))}
                    className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded text-white text-sm"
                  />
                </div>
                
                <div className="grid grid-cols-2 gap-2">
                  <button
                    onClick={() => calculateKDV('add')}
                    className="px-3 py-2 bg-green-600 hover:bg-green-500 text-white rounded text-sm transition-colors"
                  >
                    +KDV
                  </button>
                  <button
                    onClick={() => calculateKDV('remove')}
                    className="px-3 py-2 bg-red-600 hover:bg-red-500 text-white rounded text-sm transition-colors"
                  >
                    -KDV
                  </button>
                </div>

                <button
                  onClick={calculateMargin}
                  className="w-full px-3 py-2 bg-yellow-600 hover:bg-yellow-500 text-white rounded text-sm transition-colors"
                >
                  %30 Kar Marjı Ekle
                </button>
              </div>
            </div>
          )}

          {/* Kısayollar */}
          <div className="bg-gray-800 rounded-lg p-4 border border-gray-700">
            <h3 className="text-lg font-semibold text-white mb-3">⌨️ Kısayollar</h3>
            <div className="space-y-2 text-xs text-gray-400">
              <div className="flex justify-between">
                <span>Sayılar:</span>
                <span>0-9</span>
              </div>
              <div className="flex justify-between">
                <span>İşlemler:</span>
                <span>+ - * /</span>
              </div>
              <div className="flex justify-between">
                <span>Eşittir:</span>
                <span>Enter</span>
              </div>
              <div className="flex justify-between">
                <span>Temizle:</span>
                <span>Esc</span>
              </div>
              <div className="flex justify-between">
                <span>Sil:</span>
                <span>Backspace</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}