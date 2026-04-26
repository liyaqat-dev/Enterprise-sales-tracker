import React, { useState, useMemo, ChangeEvent, FormEvent } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

// 1. Define Interfaces for Type Safety
interface Product {
  id: number;
  rate: number;
}

interface SaleEntry {
  id: number;
  staffName: string;
  productName: string;
  quantity: string | number;
  rate: number;
  total: number;
  timestamp: string;
}

// 2. Constant Data Schema with explicit Typing
const STAFF_MEMBERS: string[] = ['A', 'B', 'C', 'D'];

const PRODUCTS: Record<string, Product> = {
  'Product 1': { id: 1, rate: 5 },
  'Product 2': { id: 2, rate: 10 },
  'Product 3': { id: 3, rate: 15 },
  'Product 4': { id: 4, rate: 30 },
};

const EnterpriseSalesTracker: React.FC = () => {
  // 3. Typed States
  const [entries, setEntries] = useState<SaleEntry[]>([]);
  const [formData, setFormData] = useState({
    staffName: '',
    productName: '',
    quantity: ''
  });

  // 4. Calculation Engine: Rate × Quantity = Total
  const currentTotal = useMemo(() => {
    // Safely access the product rate using a check
    const product = formData.productName ? PRODUCTS[formData.productName] : null;
    const rate = product ? product.rate : 0;
    return rate * (parseInt(formData.quantity) || 0);
  }, [formData]);

  // 5. Typed Event Handlers
  const handleUpdate = (e: FormEvent) => {
    e.preventDefault();
    if (!formData.staffName || !formData.productName || !formData.quantity) return;

    const selectedProduct = PRODUCTS[formData.productName];

    const newEntry: SaleEntry = {
      id: Date.now(),
      staffName: formData.staffName,
      productName: formData.productName,
      quantity: formData.quantity,
      rate: selectedProduct.rate,
      total: currentTotal,
      timestamp: new Date().toLocaleTimeString()
    };

    setEntries([newEntry, ...entries]);
    // Reset form
    setFormData({ staffName: '', productName: '', quantity: '' });
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-200 p-8 font-sans">
      {/* Header */}
      <header className="max-w-6xl mx-auto mb-12">
        <h1 className="text-3xl font-light tracking-tight text-white">
          Enterprise <span className="text-[#d4af37] font-semibold">Sales-Tracker</span>
        </h1>
        <p className="text-slate-500 text-sm uppercase tracking-widest mt-2">Supervisor Dashboard v1.0</p>
      </header>

      <main className="max-w-6xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Supervisor Update Form - Glassmorphism */}
        <section className="lg:col-span-1">
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-slate-900/50 backdrop-blur-xl border border-slate-800 p-6 rounded-2xl shadow-2xl"
          >
            <h2 className="text-lg font-medium text-white mb-6 flex items-center gap-2">
              <span className="w-2 h-2 bg-[#d4af37] rounded-full"></span>
              Quick Update
            </h2>

            <form onSubmit={handleUpdate} className="space-y-5">
              <div>
                <label className="block text-xs uppercase text-slate-500 mb-2 tracking-wide">Staff Member</label>
                <select 
                  value={formData.staffName}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({...formData, staffName: e.target.value})}
                  className="w-full bg-[#1a1d23] border border-slate-700 rounded-lg p-3 text-sm focus:border-[#d4af37] outline-none transition-all"
                >
                  <option value="">Select Staff</option>
                  {STAFF_MEMBERS.map(staff => <option key={staff} value={staff}>{staff}</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase text-slate-500 mb-2 tracking-wide">Product</label>
                <select 
                  value={formData.productName}
                  onChange={(e: ChangeEvent<HTMLSelectElement>) => setFormData({...formData, productName: e.target.value})}
                  className="w-full bg-[#1a1d23] border border-slate-700 rounded-lg p-3 text-sm focus:border-[#d4af37] outline-none transition-all"
                >
                  <option value="">Select Product</option>
                  {Object.keys(PRODUCTS).map(p => <option key={p} value={p}>{p} (₹{PRODUCTS[p].rate})</option>)}
                </select>
              </div>

              <div>
                <label className="block text-xs uppercase text-slate-500 mb-2 tracking-wide">Quantity (Nos)</label>
                <input 
                  type="number"
                  placeholder="0"
                  value={formData.quantity}
                  onChange={(e: ChangeEvent<HTMLInputElement>) => setFormData({...formData, quantity: e.target.value})}
                  className="w-full bg-[#1a1d23] border border-slate-700 rounded-lg p-3 text-sm focus:border-[#d4af37] outline-none transition-all"
                />
              </div>

              {/* Live Calculation Display */}
              <div className="pt-4 border-t border-slate-800">
                <div className="flex justify-between items-center">
                  <span className="text-xs text-slate-500 uppercase">Estimated Total</span>
                  <span className="text-xl font-semibold text-[#d4af37]">₹{currentTotal}</span>
                </div>
              </div>

              <button 
                type="submit"
                className="w-full bg-gradient-to-r from-[#d4af37] to-[#b8962e] text-black font-bold py-3 rounded-lg mt-4 hover:opacity-90 transition-opacity active:scale-[0.98]"
              >
                Log Disbursement
              </button>
            </form>
          </motion.div>
        </section>

        {/* Live Calculation Summary Table */}
        <section className="lg:col-span-2">
          <div className="bg-[#161920] border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-900/80 text-xs uppercase text-slate-500 tracking-widest">
                  <th className="p-4 font-medium">Staff</th>
                  <th className="p-4 font-medium">Product</th>
                  <th className="p-4 font-medium">Qty</th>
                  <th className="p-4 font-medium">Rate</th>
                  <th className="p-4 font-medium text-right">Total (INR)</th>
                </tr>
              </thead>
              <tbody className="text-sm">
                <AnimatePresence initial={false}>
                  {entries.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="p-12 text-center text-slate-600 italic">
                        No disbursements logged for this session.
                      </td>
                    </tr>
                  ) : (
                    entries.map((entry) => (
                      <motion.tr 
                        key={entry.id}
                        initial={{ opacity: 0, x: -10 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors"
                      >
                        <td className="p-4 font-medium text-white">{entry.staffName}</td>
                        <td className="p-4 text-slate-400">{entry.productName}</td>
                        <td className="p-4">{entry.quantity}</td>
                        <td className="p-4 text-slate-400">₹{entry.rate}</td>
                        <td className="p-4 text-right font-semibold text-[#d4af37]">₹{entry.total}</td>
                      </motion.tr>
                    ))
                  )}
                </AnimatePresence>
              </tbody>
            </table>
          </div>
        </section>

      </main>
    </div>
  );
};

export default EnterpriseSalesTracker;

