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
  product: string;
  qty: string;
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
  const [form, setForm] = useState({ staff: '', products: [] as string[], qty: '' });

  // Calculation logic for multi-select
  const total = useMemo(() => {
    const combinedRate = form.products.reduce((acc, productName) => {
      const productData = PRODUCTS[productName];
      return acc + (productData ? productData.rate : 0);
    }, 0);
    return combinedRate * (parseInt(form.qty) || 0);
  }, [form]);

  // Handler for logging disbursement
  const addEntry = (e: FormEvent) => {
    e.preventDefault();
    if (!form.staff || form.products.length === 0 || !form.qty) return;
    
    const newEntry: SaleEntry = { 
      id: Date.now(),
      staff: form.staff,
      qty: form.qty,
      product: form.products.join(', '), 
      total: total
    };
    
    setEntries([newEntry, ...entries]);
    setForm({ staff: '', products: [], qty: '' });
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-300 p-4 md:p-8 font-sans">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-[#d4af37] tracking-tight">Enterprise Sales</h1>
        <p className="text-slate-500 uppercase tracking-[0.2em] text-xs mt-1">Supervisor Portal v1.0</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Update Panel */}
        <section className="bg-[#161920] p-6 rounded-2xl border border-white/5 shadow-2xl">
          <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
            <LayoutGrid size={20} className="text-[#d4af37]" /> Log Disbursement
          </h2>
          <form onSubmit={addEntry} className="space-y-5">
            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Staff Member</label>
              <select 
                value={form.staff} 
                onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({...form, staff: e.target.value})}
                className="w-full bg-[#1c212c] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#d4af37] appearance-none"
              >
                <option value="">Select Staff</option>
                {STAFF_MEMBERS.map(member => (
                  <option key={member} value={member}>{member}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Product Selection (Multi)</label>
              <select 
                multiple
                value={form.products} 
                onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                  const values = Array.from(e.target.selectedOptions, option => option.value);
                  setForm({...form, products: values});
                }}
                className="w-full bg-[#1c212c] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#d4af37] min-h-[140px] scrollbar-thin scrollbar-thumb-white/10"
              >
                {Object.keys(PRODUCTS).map(p => (
                  <option key={p} value={p} className="py-1 px-1">{p} — ₹{PRODUCTS[p].rate}</option>
                ))}
              </select>
              <p className="text-[10px] text-slate-600 mt-2 italic">Hold Ctrl/Cmd to select multiple products</p>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-2">Quantity</label>
              <input 
                type="number" 
                value={form.qty}
                onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({...form, qty: e.target.value})}
                className="w-full bg-[#1c212c] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#d4af37]"
                placeholder="Enter quantity"
              />
            </div>

            <div className="pt-6 border-t border-white/5 text-center">
              <p className="text-xs text-slate-500 uppercase tracking-widest mb-1">Calculated Total</p>
              <p className="text-[#d4af37] font-bold text-4xl mb-4">₹{total.toLocaleString()}</p>
              <button type="submit" className="w-full bg-[#d4af37] hover:bg-[#c4a030] text-black font-black py-4 rounded-xl transition-all shadow-lg shadow-yellow-900/10 active:scale-[0.98]">
                LOG TRANSACTION
              </button>
            </div>
          </form>
        </section>

        {/* Records Panel */}
        <section className="lg:col-span-2 bg-[#161920] rounded-2xl border border-white/5 overflow-hidden flex flex-col">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
              <TrendingUp size={18} className="text-emerald-500" /> Recent Activity
            </h2>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full font-bold">LIVE</span>
          </div>
          <div className="overflow-x-auto flex-1">
            <table className="w-full text-left">
              <thead className="bg-white/[0.03] text-slate-500 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="p-4 font-bold">Staff</th>
                  <th className="p-4 font-bold">Products</th>
                  <th className="p-4 text-right font-bold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors group">
                    <td className="p-4 text-white font-medium">{item.staff}</td>
                    <td className="p-4">
                      <div className="text-slate-300 text-sm">{item.product}</div>
                      <div className="text-[10px] text-slate-500">Quantity: {item.qty} units</div>
                    </td>
                    <td className="p-4 text-right">
                      <span className="text-[#d4af37] font-bold font-mono">₹{item.total.toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-20 text-center text-slate-600">
                      <div className="text-sm">No transaction records found</div>
                      <div className="text-[10px] uppercase mt-2 tracking-widest">Awaiting supervisor input</div>
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
