import React, { useState, useMemo, ChangeEvent, FormEvent } from 'react';
import { LayoutGrid, TrendingUp } from 'lucide-react';

interface ProductInfo {
  rate: number;
}

interface ProductMap {
  [key: string]: ProductInfo;
}

interface SaleEntry {
  id: number;
  staff: string;
  productDetails: string;
  total: number;
}

const PRODUCTS: ProductMap = {
  'Product 1': { rate: 5 },
  'Product 2': { rate: 10 },
  'Product 3': { rate: 15 },
  'Product 4': { rate: 30 },
};

const STAFF_MEMBERS = ['Staff A', 'Staff B', 'Staff C', 'Staff D'];

export default function App() {
  const [entries, setEntries] = useState<SaleEntry[]>([]);
  const [form, setForm] = useState({ 
    staff: '', 
    quantities: {} as Record<string, number> 
  });

  const total = useMemo(() => {
    return Object.entries(form.quantities).reduce((acc, [name, qty]) => {
      const rate = PRODUCTS[name]?.rate || 0;
      return acc + (rate * qty);
    }, 0);
  }, [form.quantities]);

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
    const activeItems = Object.entries(form.quantities);
    if (!form.staff || activeItems.length === 0) return;
    
    const details = activeItems
      .map(([name, qty]) => `${name} (x${qty})`)
      .join(', ');

    const newEntry: SaleEntry = { 
      id: Date.now(),
      staff: form.staff,
      productDetails: details,
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
                {STAFF_MEMBERS.map(m => <option key={m} value={m}>{m}</option>)}
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase tracking-wider font-bold text-slate-500 mb-3">Product Quantities</label>
              <div className="space-y-3">
                {Object.keys(PRODUCTS).map((pName) => (
                  <div key={pName} className="flex items-center justify-between bg-[#1c212c] p-3 rounded-lg border border-white/5">
                    <div>
                      <div className="text-sm text-white font-medium">{pName}</div>
                      <div className="text-[10px] text-[#d4af37]">₹{PRODUCTS[pName].rate} / unit</div>
                    </div>
                    <input 
                      type="number" 
                      min="0"
                      value={form.quantities[pName] || ''}
                      onChange={(e: ChangeEvent<HTMLInputElement>) => handleQtyChange(pName, e.target.value)}
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
              <button type="submit" className="w-full bg-[#d4af37] text-black font-black py-4 rounded-xl shadow-lg active:scale-[0.98] transition-all">
                LOG TRANSACTION
              </button>
            </div>
          </form>
        </section>

        <section className="lg:col-span-2 bg-[#161920] rounded-2xl border border-white/5 overflow-hidden flex flex-col shadow-2xl">
          <div className="p-6 border-b border-white/5 flex justify-between items-center bg-white/[0.02]">
            <h2 className="text-lg font-semibold text-white">Recent Activity</h2>
            <span className="text-[10px] bg-emerald-500/10 text-emerald-500 px-2 py-1 rounded-full font-bold uppercase">Live Log</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-white/[0.03] text-slate-500 text-[10px] uppercase tracking-widest">
                <tr>
                  <th className="p-4">Staff</th>
                  <th className="p-4">Details</th>
                  <th className="p-4 text-right">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5">
                {entries.map((item) => (
                  <tr key={item.id} className="hover:bg-white/[0.02] transition-colors">
                    <td className="p-4 text-white font-medium">{item.staff}</td>
                    <td className="p-4 text-slate-400 text-xs">{item.productDetails}</td>
                    <td className="p-4 text-right">
                      <span className="text-[#d4af37] font-bold font-mono text-lg">₹{item.total.toLocaleString()}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
