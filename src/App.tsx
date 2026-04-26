```react
import React, { useState, useMemo, ChangeEvent, FormEvent } from 'react';
import { LayoutGrid, TrendingUp } from 'lucide-react';

// --- Interfaces ---
interface ProductInfo {
  rate: number;
}

interface ProductMap {
  [key: string]: ProductInfo;
}

interface SaleEntry {
  id: number;
  staff: string;
  productDetails: string; // Updated to store detailed breakdown
  total: number;
}

// --- Constants ---
const PRODUCTS: ProductMap = {
  'Product 1': { rate: 5 },
  'Product 2': { rate: 10 },
  'Product 3': { rate: 15 },
  'Product 4': { rate: 30 },
};

const STAFF_MEMBERS = ['Staff A', 'Staff B', 'Staff C', 'Staff D'];

export default function App() {
  // State initialization
  const [entries, setEntries] = useState<SaleEntry[]>([]);
  // quantities stores { "Product 1": 2, "Product 2": 5 }
  const [form, setForm] = useState({ 
    staff: '', 
    quantities: {} as Record<string, number> 
  });

  // Calculation logic for individual product quantities
  const total = useMemo(() => {
    return Object.entries(form.quantities).reduce((acc, [productName, qty]) => {
      const rate = PRODUCTS[productName]?.rate || 0;
      return acc + (rate * qty);
    }, 0);
  }, [form.quantities]);

  // Handler for individual quantity changes
  const handleQtyChange = (productName: string, value: string) => {
    const numValue = parseInt(value) || 0;
    const newQuantities = { ...form.quantities };
    
    if (numValue <= 0) {
      delete newQuantities[productName];
    } else {
      newQuantities[productName] = numValue;
    }
    
    setForm({ ...form, quantities: newQuantities });
  };

  const addEntry = (e: FormEvent) => {
    e.preventDefault();
    const activeProducts = Object.entries(form.quantities);
    if (!form.staff || activeProducts.length === 0) return;
    
    // Create a readable string: "Product 1 (x2), Product 2 (x5)"
    const productDetails = activeProducts
      .map(([name, qty]) => `${name} (x${qty})`)
      .join(', ');

    const newEntry: SaleEntry = { 
      id: Date.now(),
      staff: form.staff,
      productDetails: productDetails,
      total: total
    };
    
    setEntries([newEntry, ...entries]);
    setForm({ staff: '', quantities: {} });
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-300 p-4 md:p-8 font-sans">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-[#d4af37] tracking-tight">Enterprise Sales</h1>
        <p className="text-slate-500 uppercase tracking-[0.2em] text-xs mt-1">Supervisor Portal v1.0</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Input Panel */}
        <section className="bg-[#161920] p-6 rounded-2xl border border-white/5 shadow-2xl">
          <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
            <LayoutGrid size={20} className="text-[#d4af37]" /> Log Disbursement
          </h2>
          <form onSubmit={addEntry} className="space-y-6">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Staff Member</label>
              <select 
                value={form.staff} 
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({...form, staff: e.target.value})}
                className="w-full bg-[#1c212c] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#d4af37]"
              >
                <option value="">Select Staff</option>
                {STAFF_MEMBERS.map(member => <option key={member} value={member}>{member}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-3">Product Quantities</label>
              <div className="space-y-3">
                {Object.keys(PRODUCTS).map(productName => (
                  <div key={productName} className="flex items-center justify-between bg-[#1c212c] p-3 rounded-lg border border-white/5">
                    <div>
                      <div className="text-sm text-white font-medium">{productName}</div>
                      <div className="text-[10px] text-[#d4af37]">₹{PRODUCTS[productName].rate} / unit</div>
                    </div>
                    <input 
                      type="number" 
                      min="0"
                      value={form.quantities[productName] || ''}
                      onChange={(e) => handleQtyChange(productName, e.target.value)}
                      className="w-20 bg-[#0f1115] border border-white/10 rounded p-2 text-right text-white text-sm outline-none focus:border-[#d4af37]"
                      placeholder="0"
                    />
                  </div>
                ))}
              </div>
            </div>

            <div className="pt-6 border-t border-white/5 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Combined Total</p>
              <p className="text-[#d4af37] font-bold text-4xl mb-4">₹{total.toLocaleString()}</p>
              <button type="submit" className="w-full bg-[#d4af37] hover:bg-[#c4a030] text-black font-black py-4 rounded-xl transition-all shadow-lg shadow-yellow-900/10 active:scale-[0.98]">
                LOG TRANSACTION
              </button>
            </div>
          </form>
        </section>

        {/* Records Panel */}
        <section className="lg:col-span-2 bg-[#161920] rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-2xl">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" /> Recent Activity
            </h2>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full font-bold uppercase">Live Log</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/[0.03] text-slate-500 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="p-4 font-bold">Staff</th>
                  <th className="p-4 font-bold">Disbursement Details</th>
                  <th className="p-4 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-white font-medium">{item.staff}</td>
                    <td className="p-4 text-slate-400 text-xs leading-relaxed">{item.productDetails}</td>
                    <td className="p-4 text-right">
                      <span className="text-[#d4af37] font-bold font-mono text-lg">₹{item.total.toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-20 text-center text-slate-600">
                      <div className="text-sm">No transaction records found</div>
                      <div className="text-[10px] uppercase mt-2 tracking-widest italic">Awaiting supervisor entry</div>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}

```

