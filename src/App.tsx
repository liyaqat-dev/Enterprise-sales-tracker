import React, { useState, useMemo } from 'react';
import { LayoutGrid, Users, Package, TrendingUp } from 'lucide-react';

const PRODUCTS = {
  'Product 1': { rate: 500 },
  'Product 2': { rate: 1200 },
  'Product 3': { rate: 2500 },
};

export default function App() {
  const [entries, setEntries] = useState([]);
  const [form, setForm] = useState({ staff: '', product: '', qty: '' });

  const total = useMemo(() => {
    const rate = PRODUCTS[form.product]?.rate || 0;
    return rate * (parseInt(form.qty) || 0);
  }, [form]);

  const addEntry = (e) => {
    e.preventDefault();
    if (!form.staff || !form.product || !form.qty) return;
    setEntries([{ ...form, total, id: Date.now() }, ...entries]);
    setForm({ staff: '', product: '', qty: '' });
  };

  return (
    <div className="min-h-screen bg-[#0f1115] text-slate-300 p-4 md:p-8">
      <header className="mb-10">
        <h1 className="text-4xl font-bold text-[#d4af37] gold-glow">Enterprise Sales</h1>
        <p className="text-slate-500 uppercase tracking-widest text-sm">Supervisor Dashboard v1.0</p>
      </header>

      <div className="grid lg:grid-cols-3 gap-8">
        {/* Input Section */}
        <section className="bg-[#161920] p-6 rounded-2xl border border-white/5 shadow-2xl">
          <h2 className="text-xl font-semibold mb-6 text-white flex items-center gap-2">
            <LayoutGrid size={20} className="text-[#d4af37]" /> Quick Update
          </h2>
          <form onSubmit={addEntry} className="space-y-4">
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Staff Member</label>
              <select 
                value={form.staff} 
                onChange={e => setForm({...form, staff: e.target.value})}
                className="w-full bg-[#1c212c] border border-white/10 rounded-lg p-3 text-white focus:border-[#d4af37] outline-none"
              >
                <option value="">Select Staff</option>
                <option value="Staff A">Staff A</option>
                <option value="Staff B">Staff B</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Product</label>
              <select 
                value={form.product} 
                onChange={e => setForm({...form, product: e.target.value})}
                className="w-full bg-[#1c212c] border border-white/10 rounded-lg p-3 text-white focus:border-[#d4af37] outline-none"
              >
                <option value="">Select Product</option>
                {Object.keys(PRODUCTS).map(p => <option key={p} value={p}>{p}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium mb-1 text-slate-500">Quantity</label>
              <input 
                type="number" 
                value={form.qty}
                onChange={e => setForm({...form, qty: e.target.value})}
                className="w-full bg-[#1c212c] border border-white/10 rounded-lg p-3 text-white outline-none"
                placeholder="0"
              />
            </div>
            <div className="pt-4 border-t border-white/5">
              <p className="text-sm">Estimated Total: <span className="text-[#d4af37] font-bold text-lg">₹{total}</span></p>
              <button className="w-full mt-4 bg-[#d4af37] hover:bg-[#b8962e] text-black font-bold py-3 rounded-lg transition-all">
                Log Disbursement
              </button>
            </div>
          </form>
        </section>

        {/* List Section */}
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
              {entries.map(item => (
                <tr key={item.id} className="border-b border-white/5 hover:bg-white/5">
                  <td className="p-4 font-medium text-white">{item.staff}</td>
                  <td className="p-4 text-slate-400">{item.product} (x{item.qty})</td>
                  <td className="p-4 text-right text-[#d4af37] font-mono font-bold">₹{item.total}</td>
                </tr>
              ))}
              {entries.length === 0 && (
                <tr><td colSpan="3" className="p-10 text-center text-slate-600">No logs for this session.</td></tr>
              )}
            </tbody>
          </table>
        </section>
      </div>
    </div>
  );
}

