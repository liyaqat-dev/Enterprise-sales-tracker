```react
import React, { useState, useMemo, ChangeEvent, FormEvent } from 'react';
import { LayoutGrid, TrendingUp } from 'lucide-react';

// 1. Updated Product Logic with exact pricing
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

const PRODUCTS: ProductMap = {
  'Product 1': { rate: 5 },
  'Product 2': { rate: 10 },
  'Product 3': { rate: 15 },
  'Product 4': { rate: 30 },
};

export default function App() {
  const [entries, setEntries] = useState<SaleEntry[]>([]);
  // Changed products to an array to support multi-selection
  const [form, setForm] = useState({ staff: '', products: [] as string[], qty: '' });

  // Modified calculation logic to sum multiple product rates
  const total = useMemo(() => {
    const combinedRate = form.products.reduce((acc, productName) => {
      const productData = PRODUCTS[productName];
      return acc + (productData ? productData.rate : 0);
    }, 0);
    return combinedRate * (parseInt(form.qty) || 0);
  }, [form]);

  const addEntry = (e: FormEvent) => {
    e.preventDefault();
    if (!form.staff || form.products.length === 0 || !form.qty) return;
    
    const newEntry: SaleEntry = { 
      id: Date.now(),
      staff: form.staff,
      qty: form.qty,
      // Joins selected products into a single string for the display table
      product: form.products.join(', '), 
      total: total
    };
    
    setEntries([newEntry, ...entries]);
    setForm({ staff: '', products: [], qty: '' });
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-300 p-4 md:p-8">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-[#d4af37]">Enterprise Sales</h1>
        <p className="text-slate-500 uppercase tracking-widest text-sm">Supervisor Dashboard v1.0</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        <section className="bg-[#161920] p-6 rounded-2xl border border-white/5 shadow-2xl">
          <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
            <LayoutGrid size={20} className="text-[#d4af37]" /> Quick Update
          </h2>
          <form onSubmit={addEntry} className="space-y-4">
            <label className="block text-xs font-medium text-slate-500">Staff Member</label>
            <select 
              value={form.staff} 
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({...form, staff: e.target.value})}
              className="w-full bg-[#1c212c] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#d4af37]"
            >
              <option value="">Select Staff</option>
              <option value="Staff A">Staff A</option>
              <option value="Staff B">Staff B</option>
            </select>

            <label className="block text-xs font-medium text-slate-500">Products (Multi-select)</label>
            <select 
              multiple
              value={form.products} 
              onChange={(e: ChangeEvent<HTMLSelectElement>) => {
                const values = Array.from(e.target.selectedOptions, option => option.value);
                setForm({...form, products: values});
              }}
              className="w-full bg-[#1c212c] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#d4af37] min-h-[120px]"
            >
              {Object.keys(PRODUCTS).map(p => (
                <option key={p} value={p}>{p} (₹{PRODUCTS[p].rate})</option>
              ))}
            </select>
            <p className="text-[10px] text-slate-500 italic">Hold Ctrl (PC) or Cmd (Mac) to select multiple</p>

            <label className="block text-xs font-medium text-slate-500">Quantity (Nos)</label>
            <input 
              type="number" 
              value={form.qty}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({...form, qty: e.target.value})}
              className="w-full bg-[#1c212c] border border-white/10 rounded-lg p-3 text-white outline-none"
              placeholder="0"
            />

            <div className="pt-4 border-t border-white/5 text-center">
              <p className="text-sm text-slate-400">Estimated Total</p>
              <p className="text-[#d4af37] font-bold text-3xl">₹{total}</p>
              <button type="submit" className="w-full mt-4 bg-[#d4af37] hover:bg-[#b8962e] text-black font-bold py-3 rounded-lg transition-colors">
                Log Disbursement
              </button>
            </div>
          </form>
        </section>

        <section className="lg:col-span-2 bg-[#161920] rounded-2xl border border-white/5 overflow-hidden">
          <div className="p-6 border-b border-white/5 flex justify-between items-center">
            <h2 className="text-xl font-semibold text-white">Recent Activity</h2>
            <TrendingUp size={20} className="text-emerald-500" />
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/5 text-slate-500 text-xs uppercase">
                <tr>
                  <th className="p-4">Staff</th>
                  <th className="p-4">Products</th>
                  <th className="p-4 text-right">Total (INR)</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((item) => (
                  <tr key={item.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-4 text-white font-medium">{item.staff}</td>
                    <td className="p-4 text-slate-400 text-sm">{item.product} <span className="text-xs ml-1">(x{item.qty})</span></td>
                    <td className="p-4 text-right text-[#d4af37] font-bold font-mono">₹{item.total}</td>
                  </tr>
                ))}
                {entries.length === 0 && (
                  <tr>
                    <td colSpan={3} className="p-10 text-center text-slate-600 italic">No disbursements logged for this session.</td>
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
