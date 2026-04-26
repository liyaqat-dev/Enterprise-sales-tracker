import React, { useState, useMemo, ChangeEvent, FormEvent } from 'react';
import { LayoutGrid, TrendingUp } from 'lucide-react';

// 1. Define the Shapes (Interfaces)
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
  'Product 1': { rate: 500 },
  'Product 2': { rate: 1200 },
  'Product 3': { rate: 2500 },
};

export default function App() {
  // 2. Add Types to State
  const [entries, setEntries] = useState<SaleEntry[]>([]);
  const [form, setForm] = useState({ staff: '', product: '', qty: '' });

  const total = useMemo(() => {
    const productData = PRODUCTS[form.product];
    const rate = productData ? productData.rate : 0;
    return rate * (parseInt(form.qty) || 0);
  }, [form]);

  // 3. Add Types to Events
  const addEntry = (e: FormEvent) => {
    e.preventDefault();
    if (!form.staff || !form.product || !form.qty) return;
    
    const newEntry: SaleEntry = { 
      ...form, 
      total, 
      id: Date.now() 
    };
    
    setEntries([newEntry, ...entries]);
    setForm({ staff: '', product: '', qty: '' });
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
            <select 
              value={form.staff} 
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({...form, staff: e.target.value})}
              className="w-full bg-[#1c212c] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#d4af37]"
            >
              <option value="">Select Staff</option>
              <option value="Staff A">Staff A</option>
              <option value="Staff B">Staff B</option>
            </select>

            <select 
              value={form.product} 
              onChange={(e: ChangeEvent<HTMLSelectElement>) => setForm({...form, product: e.target.value})}
              className="w-full bg-[#1c212c] border border-white/10 rounded-lg p-3 text-white outline-none focus:border-[#d4af37]"
            >
              <option value="">Select Product</option>
              {Object.keys(PRODUCTS).map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            <input 
              type="number" 
              value={form.qty}
              onChange={(e: ChangeEvent<HTMLInputElement>) => setForm({...form, qty: e.target.value})}
              className="w-full bg-[#1c212c] border border-white/10 rounded-lg p-3 text-white outline-none"
              placeholder="Quantity"
            />

            <div className="pt-4 border-t border-white/5 text-center">
              <p className="text-sm">Total: <span className="text-[#d4af37] font-bold text-xl">₹{total}</span></p>
              <button type="submit" className="w-full mt-4 bg-[#d4af37] text-black font-bold py-3 rounded-lg">
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
          <table className="w-full text-left">
            <thead className="bg-white/5 text-slate-500 text-xs uppercase">
              <tr>
                <th className="p-4">Staff</th>
                <th className="p-4">Product</th>
                <th className="p-4 text-right">Total</th>
              </tr>
            </thead>
            <tbody>
              {entries.map((item) => (
                <tr key={item.id} className="border-b border-white/5">
                  <td className="p-4 text-white">{item.staff}</td>
                  <td className="p-4 text-slate-400">{item.product} (x{item.qty})</td>
                  <td className="p-4 text-right text-[#d4af37] font-bold">₹{item.total}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}
