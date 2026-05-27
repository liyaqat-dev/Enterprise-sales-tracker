import React, { useState, useMemo, useEffect } from 'react';

// --- TYPE DEFINITIONS ---
interface Staff {
  id: string;
  name: string;
}

interface Product {
  id: string;
  name: string;
  rate: number;
}

interface Transaction {
  id: string;
  staff_id: string;
  product_id: string;
  quantity: number;
  rate: number;
  total: number;
  timestamp: string;
  created_at?: string;
}

// --- CLIENT LAZY LOADER FOR LIVE PREVIEW SUPPORT ---
const supabaseUrl = 'https://aormlfkegnheawtqrtvx.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFvcm1sZmtlZ25oZWF3dHFydHZ4Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzk4MDEwMDYsImV4cCI6MjA5NTM3NzAwNn0.pf4YCh2E4g5L_K6bM1WZZ5byiAWEp_2LzUbMke9OqNM';

let supabaseClientInstance: any = null;

function getSupabaseClient() {
  if (supabaseClientInstance) return supabaseClientInstance;
  // @ts-ignore
  if (typeof window !== 'undefined' && window.supabase) {
    // @ts-ignore
    supabaseClientInstance = window.supabase.createClient(supabaseUrl, supabaseKey);
  }
  return supabaseClientInstance;
}

export default function App() {
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [productList, setProductList] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  
  const [isLibLoaded, setIsLibLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const [isLogModalOpen, setIsLogModalOpen] = useState<boolean>(false);
  const [isConfigModalOpen, setIsConfigModalOpen] = useState<boolean>(false);

  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  const [newTxStaff, setNewTxStaff] = useState<string>('');
  const [newTxProduct, setNewTxProduct] = useState<string>('');
  const [newTxQuantity, setNewTxQuantity] = useState<string>('');

  const [newStaffName, setNewStaffName] = useState<string>('');

  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductRate, setNewProductRate] = useState<string>('');

  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingRateValue, setEditingRateValue] = useState<string>('');

  const [filterStaff, setFilterStaff] = useState<string>('All');
  const [filterProduct, setFilterProduct] = useState<string>('All');

  // --- DATE/TIME FILTER STATES ---
  const [datePreset, setDatePreset] = useState<string>('All'); // 'All', 'Today', 'Yesterday', 'Month', 'Custom'
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // --- SCRIPT INJECTOR ---
  useEffect(() => {
    // @ts-ignore
    if (typeof window !== 'undefined' && window.supabase) {
      setIsLibLoaded(true);
      return;
    }

    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/dist/umd/supabase.js';
    script.async = true;
    script.onload = () => { setIsLibLoaded(true); };
    document.head.appendChild(script);

    return () => { document.head.removeChild(script); };
  }, []);

  // --- PWA ---
  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
      setIsInstallable(true);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', () => {
      setDeferredPrompt(null);
      setIsInstallable(false);
    });

    return () => { window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt); };
  }, []);

  // --- DATA FETCHING ---
  const fetchEnterpriseData = async (showLoader = false) => {
    const client = getSupabaseClient();
    if (!client) return;

    if (showLoader) setIsLoading(true);
    try {
      const [staffRes, productsRes, txRes] = await Promise.all([
        client.from('staff').select('*'),
        client.from('products').select('*'),
        client.from('transactions').select('*').order('created_at', { ascending: false })
      ]);

      if (staffRes.data) setStaffList(staffRes.data);
      if (productsRes.data) setProductList(productsRes.data);
      if (txRes.data) setTransactions(txRes.data);
    } catch (err) {
      console.error("Error fetching data from Supabase:", err);
    } finally {
      if (showLoader) setIsLoading(false);
    }
  };

  useEffect(() => {
    if (!isLibLoaded) return;

    fetchEnterpriseData(true);

    const intervalId = setInterval(() => { fetchEnterpriseData(false); }, 10000);

    const client = getSupabaseClient();
    if (!client) return;

    const staffSubscription = client
      .channel('staff-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'staff' }, () => {
        client.from('staff').select('*').then(({ data }: any) => data && setStaffList(data));
      })
      .subscribe();

    const productsSubscription = client
      .channel('products-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'products' }, () => {
        client.from('products').select('*').then(({ data }: any) => data && setProductList(data));
      })
      .subscribe();

    const txSubscription = client
      .channel('transactions-db-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'transactions' }, () => {
        client.from('transactions').select('*').order('created_at', { ascending: false }).then(({ data }: any) => data && setTransactions(data));
      })
      .subscribe();

    return () => {
      client.removeChannel(staffSubscription);
      client.removeChannel(productsSubscription);
      client.removeChannel(txSubscription);
      clearInterval(intervalId);
    };
  }, [isLibLoaded]);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation choice outcome: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('staff')
        .insert([{ name: newStaffName.trim() }])
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        // Appending the flat object (data) instead of the whole array array "data" to prevent screen crashes
        setStaffList(prev => [...prev, data]);
        setNewStaffName('');
      }
    } catch (error: any) {
      console.error("Error adding staff to Supabase:", error.message);
    }
  };

  const handleRemoveStaff = async (id: string) => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { error } = await client.from('staff').delete().eq('id', id);
      if (error) throw error;
      setStaffList(prev => prev.filter(s => s.id !== id));
    } catch (error: any) {
      console.error("Error removing staff from Supabase:", error.message);
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductRate) return;
    const rateVal = parseFloat(newProductRate);
    if (isNaN(rateVal) || rateVal < 0) return;

    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('products')
        .insert([{ name: newProductName.trim(), rate: rateVal }])
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        setProductList(prev => [...prev, data]);
        setNewProductName('');
        setNewProductRate('');
      }
    } catch (error: any) {
      console.error("Error adding product to Supabase:", error.message);
    }
  };

  const handleUpdateProductRate = async (id: string, newRate: string) => {
    const parsed = parseFloat(newRate);
    if (isNaN(parsed) || parsed < 0) return;
    
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { data, error } = await client
        .from('products')
        .update({ rate: parsed })
        .eq('id', id)
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        setProductList(prev => prev.map(p => p.id === id ? data : p));
        setEditingProductId(null);
      }
    } catch (error: any) {
      console.error("Error updating rate in Supabase:", error.message);
    }
  };

  const handleRemoveProduct = async (id: string) => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { error } = await client.from('products').delete().eq('id', id);
      if (error) throw error;
      setProductList(prev => prev.filter(p => p.id !== id));
    } catch (error: any) {
      console.error("Error removing product from Supabase:", error.message);
    }
  };

  const selectedProductObj = useMemo(() => {
    return productList.find(p => p.id === newTxProduct);
  }, [newTxProduct, productList]);

  const currentLiveRate = selectedProductObj ? selectedProductObj.rate : 0;
  
  const currentLiveTotal = useMemo(() => {
    const qty = parseInt(newTxQuantity) || 0;
    return qty * currentLiveRate;
  }, [newTxQuantity, currentLiveRate]);

  const handleLogDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTxStaff || !newTxProduct || !newTxQuantity) return;
    const qty = parseInt(newTxQuantity);
    if (isNaN(qty) || qty <= 0) return;

    const prod = productList.find(p => p.id === newTxProduct);
    if (!prod) return;

    const client = getSupabaseClient();
    if (!client) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) + ' ' + new Date().toLocaleDateString();
    const total = qty * prod.rate;

    try {
      const { data, error } = await client
        .from('transactions')
        .insert([{
          staff_id: newTxStaff,
          product_id: newTxProduct,
          quantity: qty,
          rate: prod.rate,
          total: total,
          timestamp: timestamp
        }])
        .select();

      if (error) throw error;
      if (data && data.length > 0) {
        setTransactions(prev => [data, ...prev]);
        setNewTxStaff('');
        setNewTxProduct('');
        setNewTxQuantity('');
        setIsLogModalOpen(false);
      }
    } catch (error: any) {
      console.error("Error logging disbursement to Supabase:", error.message);
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    const client = getSupabaseClient();
    if (!client) return;

    try {
      const { error } = await client.from('transactions').delete().eq('id', txId);
      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== txId));
    } catch (error: any) {
      console.error("Error deleting transaction from Supabase:", error.message);
    }
  };

  // --- ADVANCED DATE FILTER RESOLVER ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      // 1. Staff Filter
      const matchStaff = filterStaff === 'All' || t.staff_id === filterStaff;
      
      // 2. Product Filter
      const matchProduct = filterProduct === 'All' || t.product_id === filterProduct;

      if (!matchStaff || !matchProduct) return false;

      // 3. Date Range Filter
      if (datePreset === 'All') return true;

      // Fallback timestamp parse (Postgres created_at timestamp preferred, local formatted string as fallback)
      const txDate = t.created_at ? new Date(t.created_at) : new Date();

      // Normalize today to start-of-day/end-of-day for perfect calculations
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      if (datePreset === 'Today') {
        return txDate >= startOfToday && txDate <= endOfToday;
      }

      if (datePreset === 'Yesterday') {
        const startOfYesterday = new Date(startOfToday);
        startOfYesterday.setDate(startOfYesterday.getDate() - 1);
        const endOfYesterday = new Date(endOfToday);
        endOfYesterday.setDate(endOfYesterday.getDate() - 1);
        return txDate >= startOfYesterday && txDate <= endOfYesterday;
      }

      if (datePreset === 'Month') {
        const startOfThisMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return txDate >= startOfThisMonth && txDate <= endOfToday;
      }

      if (datePreset === 'Custom') {
        let isAfterStart = true;
        let isBeforeEnd = true;

        if (startDate) {
          const customStart = new Date(startDate);
          customStart.setHours(0, 0, 0, 0);
          isAfterStart = txDate >= customStart;
        }
        if (endDate) {
          const customEnd = new Date(endDate);
          customEnd.setHours(23, 59, 59, 999);
          isBeforeEnd = txDate <= customEnd;
        }
        return isAfterStart && isBeforeEnd;
      }

      return true;
    });
  }, [transactions, filterStaff, filterProduct, datePreset, startDate, endDate]);

  const totalDisbursedAmount = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + Number(t.total), 0);
  }, [filteredTransactions]);

  const totalDisbursedQuantity = useMemo(() => {
    return filteredTransactions.reduce((acc, t) => acc + Number(t.quantity), 0);
  }, [filteredTransactions]);

  // --- EXPORT TO EXCEL (CSV) ---
  const handleExportToExcel = () => {
    if (filteredTransactions.length === 0) return;

    // Define CSV Headers
    const headers = ['Timestamp / Date', 'Staff Member Name', 'Product Disbursed', 'Fixed Rate (Rs)', 'Quantity (Nos)', 'Total Price Formula', 'Total Amount (Rs)'];
    
    // Map filtered transactions into flat CSV rows
    const rows = filteredTransactions.map(tx => {
      const staffName = staffList.find(s => s.id === tx.staff_id)?.name || 'Deleted Staff';
      const prodName = productList.find(p => p.id === tx.product_id)?.name || 'Deleted Product';
      const formula = `${tx.rate} x ${tx.quantity}`;
      
      // Wrapping values in double quotes safely handles internal commas 
      return `"${tx.timestamp}","${staffName}","${prodName}","${tx.rate}","${tx.quantity}","${formula}","${tx.total}"`;
    });

    const csvContent = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    
    // Create filename based on current date
    const dateStr = new Date().toISOString().split('T');
    link.setAttribute('download', `Enterprise_Filtered_Ledger_Export_${dateStr}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Loading Screen
  if (!isLibLoaded || isLoading) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#D5C9B7] border-t-[#5C4033] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#5C4033] font-semibold text-sm">Syncing Enterprise Vault...</p>
          {!isLibLoaded && (
            <p className="text-xs text-amber-900/40 mt-1">Bootstrapping Database Services...</p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2C211A] font-sans antialiased selection:bg-[#EEDFCC] selection:text-[#5C4033]">
      
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#F3ECE0] rounded-full blur-3xl opacity-60 -z-10 pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[#E8DFD0] rounded-full blur-3xl opacity-40 -z-10 pointer-events-none" />

      <header className="sticky top-0 z-40 backdrop-blur-md bg-[#FAF8F5]/85 border-b border-[#EBE3D5] px-6 py-4 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          
          <div className="flex items-center gap-4">
            <div className="flex items-center space-x-2">
              <img 
                src="https://github.com/liyaqat-dev/Enterprise-sales-tracker/blob/main/20260526_182400.png?raw=true" 
                alt="Brand Logo Left" 
                className="w-16 h-16 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <img 
                src="https://github.com/liyaqat-dev/Enterprise-sales-tracker/blob/main/20260526_182503.png?raw=true" 
                alt="Brand Logo Right" 
                className="w-16 h-16 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[9px] tracking-widest font-semibold uppercase bg-[#5C4033] text-[#FDFBF7] px-1.5 py-0.5 rounded-full">
                  HQ Admin
                </span>
              </div>
              <h1 className="text-xl font-bold tracking-tight text-[#2C211A]">Enterprise Sales-Tracker</h1>
            </div>
          </div>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            
            {isInstallable && (
              <button
                onClick={handleInstallApp}
                className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-sm transition-all active:scale-95 shadow-md hover:shadow-lg animate-bounce"
              >
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Install App
              </button>
            )}

            <button
              onClick={() => setIsConfigModalOpen(true)}
              className="flex items-center justify-center gap-2 px-4 py-2.5 rounded-full border border-[#D5C9B7] text-[#5C4033] hover:bg-[#F3EFE7] font-medium text-sm transition-all active:scale-95 shadow-sm"
            >
              <svg className="w-4 h-4 text-[#5C4033]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Rates & Staff
            </button>
            
            <button
              onClick={() => setIsLogModalOpen(true)}
              className="flex items-center justify-center gap-2 px-5 py-2.5 rounded-full bg-[#5C4033] hover:bg-[#4E3629] text-white font-medium text-sm transition-all active:scale-95 shadow-md shadow-amber-900/10 hover:shadow-lg"
            >
              <svg className="w-4 h-4 text-[#F3ECE0]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
              Log Disbursement
            </button>
          </div>

        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          
          <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-[#EBE3D5] shadow-sm flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-300">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold tracking-wide text-amber-900/60 uppercase">Total Disbursement Amount</span>
              <div className="p-2 bg-[#FAF5EE] rounded-xl border border-[#F3ECE0]">
                <svg className="w-5 h-5 text-[#8B6E53]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-[#2C211A] tracking-tight">₹ {totalDisbursedAmount.toLocaleString('en-IN')}</div>
              <p className="text-xs text-amber-900/60 mt-1">calculated over {filteredTransactions.length} items</p>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-[#EBE3D5] shadow-sm flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-300">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold tracking-wide text-amber-900/60 uppercase">Quantity Distributed</span>
              <div className="p-2 bg-[#FAF5EE] rounded-xl border border-[#F3ECE0]">
                <svg className="w-5 h-5 text-[#8B6E53]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-[#2C211A] tracking-tight">{totalDisbursedQuantity.toLocaleString('en-IN')} <span className="text-sm font-normal text-amber-900/60">Nos</span></div>
              <p className="text-xs text-amber-900/60 mt-1">across filtered records</p>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-[#EBE3D5] shadow-sm flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-300">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold tracking-wide text-amber-900/60 uppercase">Authorized Staff</span>
              <div className="p-2 bg-[#FAF5EE] rounded-xl border border-[#F3ECE0]">
                <svg className="w-5 h-5 text-[#8B6E53]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-[#2C211A] tracking-tight">{staffList.length} <span className="text-sm font-normal text-amber-900/60">Members</span></div>
              <p className="text-xs text-amber-900/60 mt-1">Supervised dynamically</p>
            </div>
          </div>

          <div className="bg-white/70 backdrop-blur-md rounded-2xl p-6 border border-[#EBE3D5] shadow-sm flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-300">
            <div className="flex justify-between items-start">
              <span className="text-xs font-semibold tracking-wide text-amber-900/60 uppercase">Configured Products</span>
              <div className="p-2 bg-[#FAF5EE] rounded-xl border border-[#F3ECE0]">
                <svg className="w-5 h-5 text-[#8B6E53]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" />
                </svg>
              </div>
            </div>
            <div className="mt-4">
              <div className="text-3xl font-extrabold text-[#2C211A] tracking-tight">{productList.length} <span className="text-sm font-normal text-amber-900/60">SKUs</span></div>
              <p className="text-xs text-amber-900/60 mt-1">rates fully controlled</p>
            </div>
          </div>

        </div>

        {/* PRIMARY CONTROLS PANEL (FILTER BAR WITH DYNAMIC DATES) */}
        <div className="bg-white/50 backdrop-blur-md rounded-2xl border border-[#EBE3D5] p-5 mb-8 space-y-4">
          
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-3 border-b border-[#EBE3D5]/50">
            <div className="flex items-center gap-3">
              <span className="p-2 bg-[#FAF5EE] rounded-xl border border-[#F3ECE0]">
                <svg className="w-5 h-5 text-[#8B6E53]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 11.293A1 1 0 013 10.586V4z" />
                </svg>
              </span>
              <div>
                <h2 className="text-sm font-bold text-[#2C211A]">Filter Ledger Logs</h2>
                <p className="text-xs text-amber-900/50">Filter calculations by personnel, catalog SKUs, and date periods</p>
              </div>
            </div>

            {/* Action Buttons: Clear Filters & Export */}
            <div className="flex flex-wrap items-center gap-2 self-start md:self-auto">
              {/* Clear Filter Indicator */}
              {(filterStaff !== 'All' || filterProduct !== 'All' || datePreset !== 'All' || startDate || endDate) && (
                <button
                  onClick={() => { 
                    setFilterStaff('All'); 
                    setFilterProduct('All'); 
                    setDatePreset('All');
                    setStartDate('');
                    setEndDate('');
                  }}
                  className="px-3 py-1.5 bg-[#FAF5EE] text-xs text-[#5C4033] hover:bg-[#FAF0E6] rounded-xl border border-[#D5C9B7] font-medium flex items-center gap-1.5 transition-colors duration-150"
                >
                  Clear All Filters
                  <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}

              {/* Export to Excel Button */}
              <button
                onClick={handleExportToExcel}
                disabled={filteredTransactions.length === 0}
                className="px-3 py-1.5 bg-emerald-55 text-xs text-emerald-800 hover:bg-emerald-100 rounded-xl border border-emerald-200 font-bold flex items-center gap-1.5 transition-colors duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-sm active:scale-95"
                title="Download Filtered Ledger as Excel (CSV)"
              >
                Export Excel
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            
            {/* Filter by Staff */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-[#5C4033] uppercase mb-1.5 px-1 tracking-wider">Staff Member</label>
              <select
                value={filterStaff}
                onChange={(e) => setFilterStaff(e.target.value)}
                className="bg-white hover:bg-[#FAF8F5] border border-[#D5C9B7] rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-1 focus:ring-[#5C4033] focus:outline-none transition-colors cursor-pointer"
              >
                <option value="All">All Staff Members</option>
                {staffList.map(s => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>

            {/* Filter by Product */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-[#5C4033] uppercase mb-1.5 px-1 tracking-wider">Product SKU</label>
              <select
                value={filterProduct}
                onChange={(e) => setFilterProduct(e.target.value)}
                className="bg-white hover:bg-[#FAF8F5] border border-[#D5C9B7] rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-1 focus:ring-[#5C4033] focus:outline-none transition-colors cursor-pointer"
              >
                <option value="All">All Products</option>
                {productList.map(p => (
                  <option key={p.id} value={p.id}>{p.name} (₹{p.rate})</option>
                ))}
              </select>
            </div>

            {/* Filter by Date Preset */}
            <div className="flex flex-col">
              <label className="text-[10px] font-bold text-[#5C4033] uppercase mb-1.5 px-1 tracking-wider">Date Period</label>
              <select
                value={datePreset}
                onChange={(e) => setDatePreset(e.target.value)}
                className="bg-white hover:bg-[#FAF8F5] border border-[#D5C9B7] rounded-xl px-4 py-2.5 text-xs font-medium focus:ring-1 focus:ring-[#5C4033] focus:outline-none transition-colors cursor-pointer"
              >
                <option value="All">All Time</option>
                <option value="Today">Today</option>
                <option value="Yesterday">Yesterday</option>
                <option value="Month">This Month</option>
                <option value="Custom">Custom Range</option>
              </select>
            </div>

            {/* Filter by Custom Date Picker */}
            {datePreset === 'Custom' && (
              <div className="flex flex-col lg:col-span-1">
                <label className="text-[10px] font-bold text-[#5C4033] uppercase mb-1.5 px-1 tracking-wider">Custom Boundaries</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="bg-white border border-[#D5C9B7] rounded-xl px-2 py-2 text-[11px] font-medium text-[#2C211A] focus:ring-1 focus:ring-[#5C4033] focus:outline-none"
                    placeholder="Start"
                  />
                  <input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="bg-white border border-[#D5C9B7] rounded-xl px-2 py-2 text-[11px] font-medium text-[#2C211A] focus:ring-1 focus:ring-[#5C4033] focus:outline-none"
                    placeholder="End"
                  />
                </div>
              </div>
            )}

          </div>
        </div>

        {/* LEDGER & LIVE CALCULATION SUMMARY TABLE */}
        <div className="bg-white rounded-3xl border border-[#EBE3D5] overflow-hidden shadow-sm">
          
          <div className="px-6 py-5 border-b border-[#EBE3D5] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FDFBF7]">
            <div>
              <h3 className="text-base font-bold text-[#2C211A] flex items-center gap-2">
                Live Calculation Ledger Summary
                <span className="text-xs font-normal text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-100 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                  Online Live Summary (Updates every 10s)
                </span>
              </h3>
              <p className="text-xs text-amber-900/50">Auto-evaluates Rate × Quantity for total sums across distribution events</p>
            </div>

            <div className="text-xs text-[#5C4033] font-medium">
              Showing <span className="font-bold">{filteredTransactions.length}</span> of <span className="font-bold">{transactions.length}</span> entries
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-[#FAF5EE]/60 border-b border-[#EBE3D5] text-[11px] font-bold uppercase tracking-wider text-[#5C4033]">
                  <th className="py-4 px-6">Timestamp / Date</th>
                  <th className="py-4 px-6">Staff Member Name</th>
                  <th className="py-4 px-6">Product Disbursed</th>
                  <th className="py-4 px-6 text-right">Fixed Rate</th>
                  <th className="py-4 px-6 text-right">Quantity (Nos)</th>
                  <th className="py-4 px-6 text-right">Total Price Formula</th>
                  <th className="py-4 px-6 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#F3ECE0]/80">
                {filteredTransactions.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-12 text-center text-amber-900/40 text-sm">
                      <div className="max-w-xs mx-auto flex flex-col items-center">
                        <svg className="w-10 h-10 text-amber-900/20 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                        </svg>
                        <p className="font-semibold text-[#5C4033]">No distribution logged</p>
                        <p className="text-xs text-amber-900/40 mt-1">Change filters or use the "Log Disbursement" form to feed calculation summaries</p>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredTransactions.map((tx) => {
                    const staff = staffList.find(s => s.id === tx.staff_id);
                    const prod = productList.find(p => p.id === tx.product_id);
                    return (
                      <tr 
                        key={tx.id} 
                        className="text-sm hover:bg-[#FAF9F6]/80 transition-colors duration-150"
                      >
                        <td className="py-4 px-6 text-xs text-amber-900/60 font-mono">
                          {tx.timestamp}
                        </td>
                        <td className="py-4 px-6 font-semibold text-[#2C211A]">
                          {staff ? staff.name : <span className="italic text-rose-500">Deleted Staff</span>}
                        </td>
                        <td className="py-4 px-6">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-md bg-[#FAF5EE] border border-[#EBE3D5] text-xs font-medium text-[#5C4033]">
                            {prod ? prod.name : <span className="italic text-rose-500">Deleted Product</span>}
                          </span>
                        </td>
                        <td className="py-4 px-6 text-right font-medium text-amber-900/70">
                          ₹{Number(tx.rate).toFixed(2)}
                        </td>
                        <td className="py-4 px-6 text-right font-bold text-[#2C211A]">
                          {tx.quantity} <span className="text-[10px] font-normal text-amber-900/50">nos</span>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <div className="flex flex-col items-end">
                            <span className="text-xs text-amber-900/50 font-mono font-light">
                              {Number(tx.rate)} × {Number(tx.quantity)}
                            </span>
                            <span className="font-bold text-[#5C4033] text-sm">
                              ₹{Number(tx.total).toLocaleString('en-IN')}
                            </span>
                          </div>
                        </td>
                        <td className="py-4 px-6 text-right">
                          <button
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-1.5 text-amber-900/40 hover:text-rose-600 rounded-lg hover:bg-rose-50 transition-colors"
                            title="Delete Disbursement Log"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {filteredTransactions.length > 0 && (
            <div className="bg-[#FAF5EE]/40 px-6 py-4 border-t border-[#EBE3D5] flex flex-col sm:flex-row items-center justify-between gap-4">
              <span className="text-xs font-semibold text-[#5C4033] uppercase tracking-wide">
                Active Filter Subtotal
              </span>
              <div className="flex items-center gap-6">
                <div className="text-right">
                  <span className="text-[10px] uppercase text-amber-900/50 block">Cumulative Quantity</span>
                  <span className="font-bold text-[#2C211A]">{totalDisbursedQuantity} Nos</span>
                </div>
                <div className="text-right border-l border-[#EBE3D5] pl-6">
                  <span className="text-[10px] uppercase text-amber-900/50 block">Cumulative Value</span>
                  <span className="text-lg font-extrabold text-[#5C4033]">₹ {totalDisbursedAmount.toLocaleString('en-IN')}</span>
                </div>
              </div>
            </div>
          )}

        </div>

      </main>

      <footer className="max-w-7xl mx-auto px-6 py-12 mt-12 border-t border-[#EBE3D5]">
        <div className="flex flex-col md:flex-row justify-between items-center gap-4 text-xs text-amber-900/50">
          <div className="flex items-center gap-3">
            <div className="flex items-center space-x-2">
              <img 
                src="https://github.com/liyaqat-dev/Enterprise-sales-tracker/blob/main/20260526_182400.png?raw=true" 
                alt="Logo Small Left" 
                className="w-10 h-10 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
              <img 
                src="https://github.com/liyaqat-dev/Enterprise-sales-tracker/blob/main/20260526_182503.png?raw=true" 
                alt="Logo Small Right" 
                className="w-10 h-10 object-contain"
                onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
              />
            </div>
            <span>&copy; 2026 Enterprise Sales-Tracker Systems. All rights reserved.</span>
          </div>
          <div className="flex gap-4">
            <span className="hover:text-[#5C4033] cursor-pointer">Supervisor Vault Controls</span>
            <span>&bull;</span>
            <span className="hover:text-[#5C4033] cursor-pointer">Data Policy</span>
          </div>
        </div>
      </footer>


      {/* MODAL: LOG DISBURSEMENT */}
      {isLogModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          
          <div 
            onClick={() => setIsLogModalOpen(false)}
            className="fixed inset-0 bg-[#2C211A]/40 backdrop-blur-sm transition-opacity" 
          />

          <div className="relative bg-white/95 backdrop-blur-md rounded-3xl w-full max-w-lg overflow-hidden border border-[#D5C9B7] shadow-2xl transition-all duration-300">
            
            <div className="px-6 py-5 border-b border-[#EBE3D5] flex justify-between items-center bg-[#FDFBF7]">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#5C4033] rounded-xl text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-[#2C211A] text-base">New Disbursement Form</h3>
                  <p className="text-xs text-amber-900/50">Admin Quick-Action Supervisor Log</p>
                </div>
              </div>
              <button 
                onClick={() => setIsLogModalOpen(false)}
                className="p-1.5 hover:bg-[#FAF5EE] rounded-full text-amber-900/40 hover:text-[#5C4033] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="p-6 space-y-5">
              
              <div>
                <label className="block text-xs font-bold text-[#5C4033] uppercase tracking-wide mb-1.5">
                  1. Select Staff Member
                </label>
                <select
                  required
                  value={newTxStaff}
                  onChange={(e) => setNewTxStaff(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-4 py-3 text-sm text-[#2C211A] focus:ring-1 focus:ring-[#5C4033] focus:outline-none focus:bg-white transition-all cursor-pointer"
                >
                  <option value="" disabled>-- Select Authorized Staff --</option>
                  {staffList.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5C4033] uppercase tracking-wide mb-1.5">
                  2. Select Product SKU
                </label>
                <select
                  required
                  value={newTxProduct}
                  onChange={(e) => setNewTxProduct(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-4 py-3 text-sm text-[#2C211A] focus:ring-1 focus:ring-[#5C4033] focus:outline-none focus:bg-white transition-all cursor-pointer"
                >
                  <option value="" disabled>-- Select Catalog Item --</option>
                  {productList.map(p => (
                    <option key={p.id} value={p.id}>{p.name} (₹{p.rate}/nos)</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-[#5C4033] uppercase tracking-wide mb-1.5">
                  3. Quantity (Nos)
                </label>
                <input
                  required
                  type="number"
                  min="1"
                  placeholder="e.g. 10"
                  value={newTxQuantity}
                  onChange={(e) => setNewTxQuantity(e.target.value)}
                  className="w-full bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-4 py-3 text-sm text-[#2C211A] focus:ring-1 focus:ring-[#5C4033] focus:outline-none focus:bg-white transition-all"
                />
              </div>

              <div className="bg-[#FAF5EE] rounded-2xl p-4 border border-[#EBE3D5] flex flex-col justify-between">
                <span className="text-[10px] font-bold text-amber-900/50 uppercase tracking-wide">
                  Live Engine Calculation
                </span>
                <div className="flex justify-between items-end mt-2">
                  <div>
                    <span className="text-xs text-amber-900/60 font-mono block">Formula Rate × Qty:</span>
                    <span className="text-sm font-semibold text-[#5C4033] font-mono">
                      ₹{currentLiveRate} × {newTxQuantity || '0'}
                    </span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-amber-900/50 block">Expected Total Price</span>
                    <span className="text-2xl font-extrabold text-[#2C211A] tracking-tight">
                      ₹ {currentLiveTotal.toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsLogModalOpen(false)}
                  className="w-1/2 py-3 rounded-xl border border-[#D5C9B7] text-[#5C4033] font-medium text-sm hover:bg-[#FAF8F5] transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleLogDisbursement}
                  className="w-1/2 py-3 rounded-xl bg-[#5C4033] hover:bg-[#4E3629] text-white font-medium text-sm shadow-md transition-all active:scale-95"
                >
                  Confirm Log
                </button>
              </div>

            </div>

          </div>
        </div>
      )}


      {/* MODAL: RATES & STAFF CONFIGURATION */}
      {isConfigModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          
          <div 
            onClick={() => setIsConfigModalOpen(false)}
            className="fixed inset-0 bg-[#2C211A]/40 backdrop-blur-sm transition-opacity" 
          />

          <div className="relative bg-white/95 backdrop-blur-md rounded-3xl w-full max-w-4xl overflow-hidden border border-[#D5C9B7] shadow-2xl transition-all duration-300">
            
            <div className="px-6 py-5 border-b border-[#EBE3D5] flex justify-between items-center bg-[#FDFBF7]">
              <div className="flex items-center gap-2">
                <div className="p-2 bg-[#5C4033] rounded-xl text-white">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4" />
                  </svg>
                </div>
                <div>
                  <h3 className="font-bold text-[#2C211A] text-base">Master Configuration Console</h3>
                  <p className="text-xs text-amber-900/50">Manage dynamic catalog rates and authorized staff lists</p>
                </div>
              </div>
              <button 
                onClick={() => setIsConfigModalOpen(false)}
                className="p-1.5 hover:bg-[#FAF5EE] rounded-full text-amber-900/40 hover:text-[#5C4033] transition-colors"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 divide-y md:divide-y-0 md:divide-x divide-[#EBE3D5] max-h-[70vh] overflow-y-auto">
              
              {/* LEFT: STAFF */}
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="font-bold text-sm text-[#2C211A]">Staff Management</h4>
                  <p className="text-xs text-amber-900/50">Add or revoke supervisor authorizations</p>
                </div>

                <div className="flex gap-2">
                  <input
                    type="text"
                    placeholder="Enter Staff Name (e.g. Staff E)"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        if (newStaffName.trim()) handleAddStaff(e as any);
                      }
                    }}
                    className="flex-1 bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-3 py-2 text-xs text-[#2C211A] focus:ring-1 focus:ring-[#5C4033] focus:outline-none"
                  />
                  <button
                    type="button"
                    onClick={(e) => {
                      if (newStaffName.trim()) handleAddStaff(e as any);
                    }}
                    className="px-4 py-2 bg-[#5C4033] hover:bg-[#4E3629] text-white text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    Add Staff
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {staffList.map((staff) => (
                    <div 
                      key={staff.id} 
                      className="flex items-center justify-between p-3 bg-[#FAF9F6] rounded-xl border border-[#EBE3D5] hover:bg-white transition-colors"
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-6 h-6 rounded-full bg-[#EEDFCC] flex items-center justify-center text-[10px] font-bold text-[#5C4033]">
                          {staff.name.charAt(0)}
                        </div>
                        <span className="text-xs font-semibold text-[#2C211A]">{staff.name}</span>
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveStaff(staff.id)}
                        className="p-1 text-amber-900/40 hover:text-rose-600 transition-colors"
                        title="Remove Staff"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  ))}
                  {staffList.length === 0 && (
                    <p className="text-xs text-amber-900/40 text-center py-6 italic">No staff configured</p>
                  )}
                </div>

              </div>

              {/* RIGHT: PRODUCTS */}
              <div className="p-6 space-y-6">
                <div>
                  <h4 className="font-bold text-sm text-[#2C211A]">Product Rate Engine Configurator</h4>
                  <p className="text-xs text-amber-900/50">Edit current product values and prices centrally</p>
                </div>

                <div className="space-y-2">
                  <div className="grid grid-cols-2 gap-2">
                    <input
                      type="text"
                      placeholder="Product SKU Name"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      className="bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-3 py-2 text-xs text-[#2C211A] focus:ring-1 focus:ring-[#5C4033] focus:outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="Rate (₹)"
                      value={newProductRate}
                      onChange={(e) => setNewProductRate(e.target.value)}
                      className="bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-3 py-2 text-xs text-[#2C211A] focus:ring-1 focus:ring-[#5C4033] focus:outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      if (newProductName.trim() && newProductRate) handleAddProduct(e as any);
                    }}
                    className="w-full py-2 bg-[#5C4033] hover:bg-[#4E3629] text-white text-xs font-semibold rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    Add Product & Assign Rate
                  </button>
                </div>

                <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                  {productList.map((product) => (
                    <div 
                      key={product.id} 
                      className="p-3 bg-[#FAF9F6] rounded-xl border border-[#EBE3D5] hover:bg-white transition-colors space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="w-2 h-2 rounded-full bg-[#8B6E53]"></span>
                          <span className="text-xs font-bold text-[#2C211A]">{product.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          {editingProductId === product.id ? (
                            <div className="flex items-center gap-1">
                              <input
                                type="number"
                                step="0.01"
                                className="w-16 bg-white border border-[#D5C9B7] rounded-lg px-2 py-1 text-xs text-right font-semibold"
                                value={editingRateValue}
                                onChange={(e) => setEditingRateValue(e.target.value)}
                              />
                              <button
                                type="button"
                                onClick={() => handleUpdateProductRate(product.id, editingRateValue)}
                                className="p-1 text-emerald-600 hover:bg-emerald-50 rounded"
                                title="Save Rate"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => setEditingProductId(null)}
                                className="p-1 text-amber-900/40 hover:bg-gray-100 rounded"
                                title="Cancel"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                          ) : (
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-bold text-[#5C4033] bg-[#EEDFCC]/45 px-2.5 py-0.5 rounded-lg">
                                ₹ {Number(product.rate).toFixed(2)}
                              </span>
                              <button
                                type="button"
                                onClick={() => {
                                  setEditingProductId(product.id);
                                  setEditingRateValue(product.rate.toString());
                                }}
                                className="p-1 text-amber-900/40 hover:text-[#5C4033] transition-colors"
                                title="Edit Rate"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRemoveProduct(product.id)}
                                className="p-1 text-amber-900/40 hover:text-rose-600 transition-colors"
                                title="Remove Product"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                  {productList.length === 0 && (
                    <p className="text-xs text-amber-900/40 text-center py-6 italic">No products configured</p>
                  )}
                </div>

              </div>

            </div>

            <div className="p-6 border-t border-[#EBE3D5] flex justify-end bg-[#FAF5EE]/30">
              <button
                type="button"
                onClick={() => setIsConfigModalOpen(false)}
                className="px-6 py-2.5 rounded-xl bg-[#5C4033] hover:bg-[#4E3629] text-white font-semibold text-xs transition-colors shadow-sm"
              >
                Close Configuration
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
}
