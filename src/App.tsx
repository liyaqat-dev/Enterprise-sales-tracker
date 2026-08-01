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

interface DisbursementItem {
  product_id: string;
  quantity: number;
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
  // --- AUTH & SYSTEM STATES ---
  const [isLibLoaded, setIsLibLoaded] = useState<boolean>(false);
  const [isXlsxLoaded, setIsXlsxLoaded] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  
  const [session, setSession] = useState<any>(null);
  const [authMode, setAuthMode] = useState<'login' | 'signup'>('login');
  
  // Custom Name-based Auth
  const [authName, setAuthName] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState('');

  // --- UI LAYOUT STATES ---
  const [isMenuOpen, setIsMenuOpen] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'home' | 'log' | 'config' | 'ledger'>('home');
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);

  // --- DATA STATES ---
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [productList, setProductList] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  // New Transaction Form State
  const [newTxDate, setNewTxDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newTxStaff, setNewTxStaff] = useState<string>('');
  const [newTxItems, setNewTxItems] = useState<DisbursementItem[]>([]);
  const [currentSelectedProduct, setCurrentSelectedProduct] = useState<string>('');
  const [currentSelectedQuantity, setCurrentSelectedQuantity] = useState<string>('');

  // Searchable Dropdown States for Log Disbursement Tab
  const [staffSearchQuery, setStaffSearchQuery] = useState('');
  const [isStaffDropdownOpen, setIsStaffDropdownOpen] = useState(false);
  const [productSearchQuery, setProductSearchQuery] = useState('');
  const [isProductDropdownOpen, setIsProductDropdownOpen] = useState(false);

  // Config States
  const [newStaffName, setNewStaffName] = useState<string>('');
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductRate, setNewProductRate] = useState<string>('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingRateValue, setEditingRateValue] = useState<string>('');

  // Filtering logs
  const [filterStaff, setFilterStaff] = useState<string>('All');
  const [filterProduct, setFilterProduct] = useState<string>('All');
  const [datePreset, setDatePreset] = useState<string>('All'); 
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  // --- SCRIPT INJECTOR FOR SUPABASE & SHEETJS ---
  useEffect(() => {
    // 1. Load Supabase
    // @ts-ignore
    if (typeof window !== 'undefined' && window.supabase) {
      setIsLibLoaded(true);
    } else {
      const supabaseScript = document.createElement('script');
      supabaseScript.src = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.43.4/dist/umd/supabase.js';
      supabaseScript.async = true;
      supabaseScript.onload = () => { setIsLibLoaded(true); };
      document.head.appendChild(supabaseScript);
    }

    // 2. Load SheetJS (XLSX)
    // @ts-ignore
    if (typeof window !== 'undefined' && window.XLSX) {
      setIsXlsxLoaded(true);
    } else {
      const xlsxScript = document.createElement('script');
      xlsxScript.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
      xlsxScript.async = true;
      xlsxScript.onload = () => { setIsXlsxLoaded(true); };
      document.head.appendChild(xlsxScript);
    }
  }, []);

  // --- DATABASE-BACKED SESSION RESTORATION ---
  useEffect(() => {
    if (!isLibLoaded) return;
    const savedSession = localStorage.getItem('safa_session');
    if (savedSession) {
      setSession(JSON.parse(savedSession));
    }
    setIsLoading(false);
  }, [isLibLoaded]);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!authName.trim()) {
      setAuthError('Please enter your name.');
      return;
    }

    setAuthLoading(true);
    setAuthError('');
    const client = getSupabaseClient();
    if (!client) {
      setAuthError('Database services are still starting. Please try again.');
      setAuthLoading(false);
      return;
    }

    const generatedEmail = `${authName.trim().replace(/\s+/g, '').toLowerCase()}@safa.com`;
    const userRole = authPassword === '786786' ? 'admin' : 'staff';

    try {
      if (authMode === 'signup') {
        const { data: existingUser, error: checkError } = await client
          .from('users')
          .select('*')
          .eq('email', generatedEmail)
          .maybeSingle();

        if (checkError) throw checkError;
        if (existingUser) {
          throw new Error('This operator name is already registered.');
        }

        const { error: insertError } = await client
          .from('users')
          .insert([{ email: generatedEmail, password: authPassword, role: userRole }]);

        if (insertError) throw insertError;

        alert('Registration successful! You can now log in.');
        setAuthMode('login');
      } else {
        const { data: user, error: loginError } = await client
          .from('users')
          .select('*')
          .eq('email', generatedEmail)
          .eq('password', authPassword)
          .maybeSingle();

        if (loginError) throw loginError;
        if (!user) {
          throw new Error('Invalid operator name or password.');
        }

        const sessionData = {
          user: {
            email: user.email,
            user_metadata: {
              full_name: authName.trim(),
              role: user.role
            }
          }
        };

        setSession(sessionData);
        localStorage.setItem('safa_session', JSON.stringify(sessionData));
      }
    } catch (err: any) {
      setAuthError(err.message || 'Authentication failed. Please verify credentials.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    setSession(null);
    localStorage.removeItem('safa_session');
    setAuthName('');
    setAuthPassword('');
  };

  const isAdmin = session?.user?.user_metadata?.role === 'admin';

  useEffect(() => {
    if (session && !isAdmin && activeTab === 'ledger') {
      setActiveTab('home');
    }
  }, [isAdmin, activeTab, session]);

  // --- DATA FETCHING ---
  const fetchEnterpriseData = async (showLoader = false) => {
    const client = getSupabaseClient();
    if (!client || !session) return;

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
    if (!isLibLoaded || !session) return;

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
  }, [isLibLoaded, session]);

  // --- HANDLERS & LOGIC ---
  const handleAddStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStaffName.trim()) return;
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { data, error } = await client.from('staff').insert([{ name: newStaffName.trim() }]).select();
      if (error) throw error;
      if (data && data.length > 0) {
        setStaffList(prev => [...prev, data[0]]);
        setNewStaffName('');
      }
    } catch (error: any) { console.error("Error:", error.message); }
  };

  const handleRemoveStaff = async (id: string) => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { error } = await client.from('staff').delete().eq('id', id);
      if (error) throw error;
      setStaffList(prev => prev.filter(s => s.id !== id));
    } catch (error: any) { console.error("Error:", error.message); }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProductName.trim() || !newProductRate) return;
    const rateVal = parseFloat(newProductRate);
    if (isNaN(rateVal) || rateVal < 0) return;
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { data, error } = await client.from('products').insert([{ name: newProductName.trim(), rate: rateVal }]).select();
      if (error) throw error;
      if (data && data.length > 0) {
        setProductList(prev => [...prev, data[0]]);
        setNewProductName('');
        setNewProductRate('');
      }
    } catch (error: any) { console.error("Error:", error.message); }
  };

  const handleUpdateProductRate = async (id: string, newRate: string) => {
    const parsed = parseFloat(newRate);
    if (isNaN(parsed) || parsed < 0) return;
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { data, error } = await client.from('products').update({ rate: parsed }).eq('id', id).select();
      if (error) throw error;
      if (data && data.length > 0) {
        setProductList(prev => prev.map(p => p.id === id ? data[0] : p));
        setEditingProductId(null);
      }
    } catch (error: any) { console.error("Error:", error.message); }
  };

  const handleRemoveProduct = async (id: string) => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { error } = await client.from('products').delete().eq('id', id);
      if (error) throw error;
      setProductList(prev => prev.filter(p => p.id !== id));
    } catch (error: any) { console.error("Error:", error.message); }
  };

  const handleAddItemToTxList = () => {
    if (!currentSelectedProduct || !currentSelectedQuantity) return;
    const qty = parseInt(currentSelectedQuantity);
    if (isNaN(qty) || qty <= 0) return;
    const existingIndex = newTxItems.findIndex(item => item.product_id === currentSelectedProduct);
    if (existingIndex > -1) {
      const updated = [...newTxItems];
      updated[existingIndex].quantity += qty;
      setNewTxItems(updated);
    } else {
      setNewTxItems([...newTxItems, { product_id: currentSelectedProduct, quantity: qty }]);
    }
    setCurrentSelectedProduct('');
    setCurrentSelectedQuantity('');
    setProductSearchQuery('');
  };

  const handleRemoveItemFromTxList = (productId: string) => {
    setNewTxItems(newTxItems.filter(item => item.product_id !== productId));
  };

  const modalGrandTotal = useMemo(() => {
    return newTxItems.reduce((sum, item) => {
      const prod = productList.find(p => p.id === item.product_id);
      return sum + (prod ? prod.rate * item.quantity : 0);
    }, 0);
  }, [newTxItems, productList]);

  const handleLogDisbursement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTxStaff || newTxItems.length === 0 || !newTxDate) return;

    const client = getSupabaseClient();
    if (!client) return;

    const [year, month, day] = newTxDate.split('-');
    const txDateObj = new Date(Number(year), Number(month) - 1, Number(day));
    const now = new Date();
    txDateObj.setHours(now.getHours(), now.getMinutes(), now.getSeconds());

    const timestampStr = `${txDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${txDateObj.toLocaleDateString()}`;
    const createdAtIso = txDateObj.toISOString();

    const inserts = newTxItems.map(item => {
      const prod = productList.find(p => p.id === item.product_id)!;
      return {
        staff_id: newTxStaff,
        product_id: item.product_id,
        quantity: item.quantity,
        rate: prod.rate,
        total: item.quantity * prod.rate,
        timestamp: timestampStr,
        created_at: createdAtIso
      };
    });

    try {
      const { data, error } = await client.from('transactions').insert(inserts).select();
      if (error) throw error;
      if (data && data.length > 0) {
        setTransactions(prev => [...data, ...prev]);
        setNewTxStaff('');
        setNewTxItems([]);
        setCurrentSelectedProduct('');
        setCurrentSelectedQuantity('');
        setNewTxDate(new Date().toISOString().split('T')[0]);
        setActiveTab(isAdmin ? 'ledger' : 'home');
      }
    } catch (error: any) { console.error("Error:", error.message); }
  };

  const handleDeleteTransaction = async (txId: string) => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { error } = await client.from('transactions').delete().eq('id', txId);
      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== txId));
    } catch (error: any) { console.error("Error:", error.message); }
  };

  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchStaff = filterStaff === 'All' || t.staff_id === filterStaff;
      const matchProduct = filterProduct === 'All' || t.product_id === filterProduct;
      if (!matchStaff || !matchProduct) return false;

      if (datePreset === 'All') return true;

      const txDate = t.created_at ? new Date(t.created_at) : new Date();
      const now = new Date();
      const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

      if (datePreset === 'Today') return txDate >= startOfToday && txDate <= endOfToday;
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

  const generateExcelReport = (type: 'minimal' | 'detailed') => {
    // @ts-ignore
    if (!window.XLSX) {
      alert("SheetJS utility is still loading. Please try again in a moment.");
      return;
    }

    let aoa: any[][] = [];

    if (type === 'minimal') {
      aoa.push(['Timestamp / Date', 'Staff Member', 'Overall Total (Rs)']);
      const staffTotals: { [key: string]: number } = {};
      filteredTransactions.forEach(tx => {
        const staffName = staffList.find(s => s.id === tx.staff_id)?.name || 'Deleted Staff';
        if (!staffTotals[staffName]) staffTotals[staffName] = 0;
        staffTotals[staffName] += Number(tx.total);
      });
      const reportDate = new Date().toLocaleDateString();
      Object.keys(staffTotals).forEach(staffName => {
        aoa.push([reportDate, staffName, staffTotals[staffName].toFixed(2)]);
      });
    } else if (type === 'detailed') {
      aoa.push(['Timestamp / Date', 'Staff Member', 'Product Disbursed', 'Total Price Formula']);
      const groupedTx: { [key: string]: typeof filteredTransactions } = {};
      filteredTransactions.forEach(tx => {
        const staffName = staffList.find(s => s.id === tx.staff_id)?.name || 'Deleted Staff';
        if (!groupedTx[staffName]) groupedTx[staffName] = [];
        groupedTx[staffName].push(tx);
      });
      Object.keys(groupedTx).forEach(staffName => {
        let staffTotal = 0;
        groupedTx[staffName].forEach((tx, index) => {
          const prodName = productList.find(p => p.id === tx.product_id)?.name || 'Deleted Product';
          const formula = `${tx.rate} \u00D7 ${tx.quantity} \u20B9${tx.total}`;
          staffTotal += Number(tx.total);
          aoa.push([tx.timestamp, index === 0 ? staffName : '', prodName, formula]);
        });
        aoa.push(['', '', '', staffTotal.toFixed(2)]);
        aoa.push([]);
      });
    }

    // @ts-ignore
    const worksheet = window.XLSX.utils.aoa_to_sheet(aoa);
    // @ts-ignore
    const workbook = window.XLSX.utils.book_new();
    // @ts-ignore
    window.XLSX.utils.book_append_sheet(workbook, worksheet, "Ledger");
    const dateStr = new Date().toISOString().split('T')[0];
    const fileName = `SAFA_${type === 'detailed' ? 'Detailed' : 'Minimal'}_Ledger_${dateStr}.xlsx`;
    // @ts-ignore
    window.XLSX.writeFile(workbook, fileName);
    setIsExportModalOpen(false);
  };

  if (!isLibLoaded || !isXlsxLoaded) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#D5C9B7] border-t-[#5C4033] rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- AUTH VIEW ---
  if (!session) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4 selection:bg-[#EEDFCC]">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#F3ECE0] rounded-full blur-3xl opacity-60 -z-10 pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[#E8DFD0] rounded-full blur-3xl opacity-40 -z-10 pointer-events-none" />

        <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl border border-[#EBE3D5] rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <img src="https://github.com/liyaqat-dev/Enterprise-sales-tracker/blob/main/20260526_182400.png?raw=true" alt="Logo 1" className="w-14 h-14 object-contain drop-shadow-sm" />
              <img src="https://github.com/liyaqat-dev/Enterprise-sales-tracker/blob/main/20260526_182503.png?raw=true" alt="Logo 2" className="w-14 h-14 object-contain" />
            </div>
            <h1 className="text-2xl font-extrabold tracking-tight text-[#2C211A] text-center leading-snug">SAFA</h1>
            <h2 className="text-sm font-medium tracking-widest uppercase text-amber-900/60 mt-1">Dealer of Taste</h2>
            <p className="text-center text-xs text-amber-900/50 mt-4">
              {authMode === 'login' ? 'Authorized Access Portal' : 'Register Operator Account'}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-3">
            <input
              type="text"
              placeholder="Your Name"
              required
              value={authName}
              onChange={(e) => setAuthName(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-4 py-3.5 text-sm text-[#2C211A] focus:ring-1 focus:ring-[#5C4033] focus:outline-none transition-all placeholder-amber-900/40"
            />
            <input
              type="password"
              placeholder="Password (786786 for Admin)"
              required
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-4 py-3.5 text-sm text-[#2C211A] focus:ring-1 focus:ring-[#5C4033] focus:outline-none transition-all placeholder-amber-900/40"
            />
            
            {authError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-100 text-rose-600 text-[11px] font-medium text-center">
                {authError}
              </div>
            )}

            <button
              type="submit"
              disabled={authLoading}
              className="w-full py-3.5 mt-2 rounded-xl bg-[#5C4033] hover:bg-[#4E3629] text-white font-bold text-sm shadow-md transition-all active:scale-95 disabled:opacity-70 flex items-center justify-center"
            >
              {authLoading ? 'Processing...' : (authMode === 'login' ? 'Log In' : 'Sign Up')}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-[#EBE3D5] pt-5">
            <span className="text-xs text-amber-900/60">
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => { setAuthMode(authMode === 'login' ? 'signup' : 'login'); setAuthError(''); }}
              className="text-xs font-bold text-[#5C4033] hover:underline"
            >
              {authMode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (isLoading && staffList.length === 0) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-[#D5C9B7] border-t-[#5C4033] rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-[#5C4033] font-semibold text-sm">Syncing SAFA Enterprise Vault...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF8F5] text-[#2C211A] font-sans antialiased selection:bg-[#EEDFCC] selection:text-[#5C4033] flex flex-col">
      
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#FAF8F5]/85 border-b border-[#EBE3D5] px-4 md:px-6 py-4 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3 md:gap-5">
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 -ml-2 rounded-xl text-[#5C4033] hover:bg-[#F3EFE7] transition-colors focus:outline-none"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>

            <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setActiveTab('home')}>
              <div className="flex items-center space-x-1">
                <img src="https://github.com/liyaqat-dev/Enterprise-sales-tracker/blob/main/20260526_182400.png?raw=true" alt="Logo 1" className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-sm" />
                <img src="https://github.com/liyaqat-dev/Enterprise-sales-tracker/blob/main/20260526_182503.png?raw=true" alt="Logo 2" className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-sm" />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-[#2C211A] leading-tight">SAFA</h1>
                <h2 className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-amber-900/60">Dealer of Taste</h2>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-3 pl-3 md:pl-5 border-l border-[#EBE3D5]">
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] font-bold text-[#5C4033] uppercase">{isAdmin ? 'Admin Supervisor' : 'Staff Operator'}</span>
                <span className="text-xs font-medium text-amber-900/60 truncate max-w-[120px]">
                  {session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="w-10 h-10 rounded-full bg-[#F3EFE7] border border-[#D5C9B7] text-[#5C4033] flex items-center justify-center hover:bg-[#EBE3D5] hover:text-rose-600 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" /></svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- HAMBURGER DRAWER --- */}
      <div className={`fixed inset-0 bg-[#2C211A]/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`} onClick={() => setIsMenuOpen(false)} />
      <div className={`fixed inset-y-0 left-0 w-72 bg-white/95 backdrop-blur-2xl shadow-2xl z-50 border-r border-[#EBE3D5] transform transition-transform duration-300 ease-in-out flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-[#EBE3D5] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="https://github.com/liyaqat-dev/Enterprise-sales-tracker/blob/main/20260526_182400.png?raw=true" alt="Logo" className="w-8 h-8 object-contain" />
            <div>
              <span className="block text-sm font-extrabold text-[#2C211A] leading-tight">SAFA Vault</span>
              <span className="block text-[9px] uppercase tracking-wider text-[#5C4033] font-semibold">{isAdmin ? 'HQ Dashboard' : 'Operator Mode'}</span>
            </div>
          </div>
          <button onClick={() => setIsMenuOpen(false)} className="p-1.5 rounded-full text-amber-900/40 hover:bg-[#FAF5EE] hover:text-[#5C4033] transition-colors">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <button onClick={() => { setActiveTab('home'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${activeTab === 'home' ? 'bg-[#5C4033] text-white shadow-md' : 'text-[#2C211A] hover:bg-[#FAF5EE]'}`}>
            Home Overview
          </button>
          <button onClick={() => { setActiveTab('log'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${activeTab === 'log' ? 'bg-[#5C4033] text-white shadow-md' : 'text-[#2C211A] hover:bg-[#FAF5EE]'}`}>
            Log Disbursement
          </button>
          <button onClick={() => { setActiveTab('config'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${activeTab === 'config' ? 'bg-[#5C4033] text-white shadow-md' : 'text-[#2C211A] hover:bg-[#FAF5EE]'}`}>
            Rates & Staff
          </button>
          {isAdmin && (
            <button onClick={() => { setActiveTab('ledger'); setIsMenuOpen(false); }} className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${activeTab === 'ledger' ? 'bg-[#5C4033] text-white shadow-md' : 'text-[#2C211A] hover:bg-[#FAF5EE]'}`}>
              Ledger Summary
            </button>
          )}
        </div>
      </div>

      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8">
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in duration-300">
            <div className="bg-white/60 backdrop-blur-lg border border-[#EBE3D5] rounded-3xl p-6 md:p-10 shadow-sm relative overflow-hidden">
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#2C211A] mb-2 tracking-tight">
                Welcome back, {session?.user?.user_metadata?.full_name?.split(' ')[0] || 'Supervisor'}!
              </h2>
              <p className="text-sm md:text-base text-amber-900/60 max-w-2xl">
                You are currently viewing the central command dashboard for SAFA. Monitor live disbursements, manage staff authorizations, and oversee catalog metrics.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-[#EBE3D5] shadow-sm">
                <span className="text-xs font-semibold text-amber-900/60 uppercase">Total Disbursement Amount</span>
                <div className="text-3xl font-extrabold text-[#2C211A] mt-4">₹ {totalDisbursedAmount.toLocaleString('en-IN')}</div>
              </div>
              <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-[#EBE3D5] shadow-sm">
                <span className="text-xs font-semibold text-amber-900/60 uppercase">Total Quantity Out</span>
                <div className="text-3xl font-extrabold text-[#2C211A] mt-4">{totalDisbursedQuantity.toLocaleString('en-IN')} Nos</div>
              </div>
              <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-[#EBE3D5] shadow-sm cursor-pointer" onClick={() => setActiveTab('config')}>
                <span className="text-xs font-semibold text-amber-900/60 uppercase">Authorized Staff</span>
                <div className="text-3xl font-extrabold text-[#2C211A] mt-4">{staffList.length}</div>
              </div>
              <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-[#EBE3D5] shadow-sm cursor-pointer" onClick={() => setActiveTab('config')}>
                <span className="text-xs font-semibold text-amber-900/60 uppercase">Configured Catalogs</span>
                <div className="text-3xl font-extrabold text-[#2C211A] mt-4">{productList.length}</div>
              </div>
            </div>
          </div>
        )}

        {/* LOG DISBURSEMENT TAB WITH SEARCHABLE DROPDOWNS */}
        {activeTab === 'log' && (
          <div className="max-w-2xl mx-auto animate-in fade-in duration-300">
            <div className="bg-white/80 backdrop-blur-xl border border-[#EBE3D5] rounded-[32px] p-6 md:p-10 shadow-xl">
              <h2 className="text-xl font-extrabold text-[#2C211A] mb-6">Record Disbursement</h2>

              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#5C4033] uppercase tracking-widest pl-1">1. Date</label>
                    <input
                      type="date"
                      required
                      value={newTxDate}
                      onChange={(e) => setNewTxDate(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#D5C9B7] rounded-2xl px-4 py-3.5 text-sm text-[#2C211A] outline-none shadow-sm cursor-pointer"
                    />
                  </div>
                  
                  {/* SEARCHABLE STAFF DROPDOWN */}
                  <div className="space-y-1.5 relative">
                    <label className="text-[11px] font-bold text-[#5C4033] uppercase tracking-widest pl-1">2. Assign Staff</label>
                    <div
                      className="w-full bg-[#FAF9F6] border border-[#D5C9B7] rounded-2xl px-4 py-3 text-sm text-[#2C211A] cursor-text flex items-center justify-between shadow-sm"
                      onClick={() => setIsStaffDropdownOpen(true)}
                    >
                      <input
                        type="text"
                        value={isStaffDropdownOpen ? staffSearchQuery : (staffList.find(s => s.id === newTxStaff)?.name || '')}
                        onChange={(e) => {
                          setStaffSearchQuery(e.target.value);
                          setIsStaffDropdownOpen(true);
                          if (!e.target.value) setNewTxStaff('');
                        }}
                        placeholder="Search & Select Staff..."
                        className="w-full bg-transparent outline-none placeholder-amber-900/40 font-medium"
                      />
                      <svg className="w-4 h-4 text-amber-900/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                    </div>

                    {isStaffDropdownOpen && (
                      <>
                        <div className="fixed inset-0 z-40" onClick={() => { setIsStaffDropdownOpen(false); setStaffSearchQuery(''); }}></div>
                        <div className="absolute z-50 w-full mt-2 bg-white border border-[#D5C9B7] rounded-2xl shadow-xl max-h-48 overflow-y-auto py-2">
                          {staffList.filter(s => s.name.toLowerCase().includes(staffSearchQuery.toLowerCase())).length === 0 ? (
                            <div className="px-4 py-3 text-sm text-amber-900/50 italic">No staff found.</div>
                          ) : (
                            staffList.filter(s => s.name.toLowerCase().includes(staffSearchQuery.toLowerCase())).map(s => (
                              <div
                                key={s.id}
                                onClick={() => {
                                  setNewTxStaff(s.id);
                                  setStaffSearchQuery('');
                                  setIsStaffDropdownOpen(false);
                                }}
                                className={`px-4 py-3 text-sm cursor-pointer hover:bg-[#FAF5EE] transition-colors ${newTxStaff === s.id ? 'bg-[#FAF5EE] font-bold text-[#5C4033]' : 'text-[#2C211A] font-medium'}`}
                              >
                                {s.name}
                              </div>
                            ))
                          )}
                        </div>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-5 bg-[#FAF8F5] border border-[#EBE3D5] rounded-3xl space-y-4">
                  <h4 className="text-[11px] font-bold text-[#5C4033] uppercase tracking-widest pl-1">3. Add Disbursement Items</h4>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    {/* SEARCHABLE PRODUCT DROPDOWN */}
                    <div className="relative flex-1">
                      <div
                        className="w-full bg-white border border-[#D5C9B7] rounded-xl px-4 py-3 text-sm text-[#2C211A] cursor-text flex items-center justify-between"
                        onClick={() => setIsProductDropdownOpen(true)}
                      >
                        <input
                          type="text"
                          value={isProductDropdownOpen ? productSearchQuery : (productList.find(p => p.id === currentSelectedProduct)?.name || '')}
                          onChange={(e) => {
                            setProductSearchQuery(e.target.value);
                            setIsProductDropdownOpen(true);
                            if (!e.target.value) setCurrentSelectedProduct('');
                          }}
                          placeholder="Search Catalog SKU..."
                          className="w-full bg-transparent outline-none placeholder-amber-900/40 font-medium"
                        />
                        <svg className="w-4 h-4 text-amber-900/50" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" /></svg>
                      </div>

                      {isProductDropdownOpen && (
                        <>
                          <div className="fixed inset-0 z-40" onClick={() => { setIsProductDropdownOpen(false); setProductSearchQuery(''); }}></div>
                          <div className="absolute z-50 w-full mt-2 bg-white border border-[#D5C9B7] rounded-xl shadow-xl max-h-48 overflow-y-auto py-2">
                            {productList.filter(p => p.name.toLowerCase().includes(productSearchQuery.toLowerCase())).length === 0 ? (
                              <div className="px-4 py-3 text-sm text-amber-900/50 italic">No products found.</div>
                            ) : (
                              productList.filter(p => p.name.toLowerCase().includes(productSearchQuery.toLowerCase())).map(p => (
                                <div
                                  key={p.id}
                                  onClick={() => {
                                    setCurrentSelectedProduct(p.id);
                                    setProductSearchQuery('');
                                    setIsProductDropdownOpen(false);
                                  }}
                                  className={`px-4 py-3 text-sm cursor-pointer hover:bg-[#FAF5EE] transition-colors flex justify-between items-center ${currentSelectedProduct === p.id ? 'bg-[#FAF5EE] font-bold text-[#5C4033]' : 'text-[#2C211A] font-medium'}`}
                                >
                                  <span>{p.name}</span>
                                  <span className="text-xs text-amber-900/60 font-bold">₹{p.rate}</span>
                                </div>
                              ))
                            )}
                          </div>
                        </>
                      )}
                    </div>
                    <div className="w-full sm:w-32">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={currentSelectedQuantity}
                        onChange={(e) => setCurrentSelectedQuantity(e.target.value)}
                        className="w-full bg-white border border-[#D5C9B7] rounded-xl px-4 py-3 text-sm text-[#2C211A] outline-none"
                      />
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleAddItemToTxList}
                    disabled={!currentSelectedProduct || !currentSelectedQuantity}
                    className="w-full py-3 bg-white text-sm font-bold text-[#5C4033] rounded-xl border border-[#D5C9B7] hover:bg-[#FAF0E6] transition-all disabled:opacity-50"
                  >
                    + Add Item to Disbursement List
                  </button>
                </div>

                {newTxItems.length > 0 && (
                  <div className="space-y-2">
                    <span className="block text-[11px] font-bold text-[#5C4033] uppercase tracking-widest pl-1">Active Cart</span>
                    <div className="overflow-hidden border border-[#D5C9B7] rounded-2xl bg-white shadow-sm">
                      <div className="max-h-48 overflow-y-auto divide-y divide-[#F3ECE0]">
                        {newTxItems.map((item) => {
                          const prod = productList.find(p => p.id === item.product_id);
                          if (!prod) return null;
                          return (
                            <div key={item.product_id} className="flex items-center justify-between p-4 text-sm">
                              <div>
                                <span className="font-bold text-[#2C211A]">{prod.name}</span>
                                <span className="text-amber-900/60 ml-2 font-mono text-xs">{item.quantity} nos @ ₹{prod.rate}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-extrabold text-[#5C4033]">₹{item.quantity * prod.rate}</span>
                                <button type="button" onClick={() => handleRemoveItemFromTxList(item.product_id)} className="text-rose-500 hover:text-rose-700">Remove</button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="bg-[#FAF5EE] p-4 border-t border-[#D5C9B7] flex justify-between items-center">
                        <span className="text-xs font-bold text-amber-900/60 uppercase tracking-widest">Grand Total</span>
                        <span className="text-2xl font-black text-[#5C4033]">₹ {modalGrandTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                )}

                <button
                  type="button"
                  onClick={handleLogDisbursement}
                  disabled={!newTxStaff || newTxItems.length === 0 || !newTxDate}
                  className="w-full py-4 rounded-2xl bg-[#5C4033] hover:bg-[#4E3629] text-white font-extrabold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50"
                >
                  Confirm & Store in Vault
                </button>
              </form>
            </div>
          </div>
        )}

        {/* RATES & STAFF CONFIG TAB */}
        {activeTab === 'config' && (
          <div className="max-w-5xl mx-auto animate-in fade-in duration-300 grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-white/80 backdrop-blur-xl border border-[#EBE3D5] rounded-3xl p-6 shadow-sm flex flex-col h-[500px]">
              <h3 className="text-lg font-bold text-[#2C211A] mb-4">Staff Management</h3>
              <form onSubmit={handleAddStaff} className="flex gap-2 mb-4">
                <input
                  type="text"
                  placeholder="Enter Staff Name"
                  value={newStaffName}
                  onChange={(e) => setNewStaffName(e.target.value)}
                  className="flex-1 bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-3 py-2 text-xs outline-none"
                />
                <button type="submit" className="px-4 bg-[#5C4033] text-white text-xs font-semibold rounded-xl">Add</button>
              </form>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {staffList.map(s => (
                  <div key={s.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-[#EBE3D5]">
                    <span className="text-xs font-semibold">{s.name}</span>
                    <button onClick={() => handleRemoveStaff(s.id)} className="text-rose-500 text-xs">Delete</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-white/80 backdrop-blur-xl border border-[#EBE3D5] rounded-3xl p-6 shadow-sm flex flex-col h-[500px]">
              <h3 className="text-lg font-bold text-[#2C211A] mb-4">Product Rates Engine</h3>
              <form onSubmit={handleAddProduct} className="space-y-2 mb-4">
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="text"
                    placeholder="Product SKU Name"
                    value={newProductName}
                    onChange={(e) => setNewProductName(e.target.value)}
                    className="bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-3 py-2 text-xs outline-none"
                  />
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="Rate (₹)"
                    value={newProductRate}
                    onChange={(e) => setNewProductRate(e.target.value)}
                    className="bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-3 py-2 text-xs outline-none"
                  />
                </div>
                <button type="submit" className="w-full py-2 bg-[#5C4033] text-white text-xs font-semibold rounded-xl">Add Product & Rate</button>
              </form>
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {productList.map(p => (
                  <div key={p.id} className="flex justify-between items-center p-3 bg-white rounded-xl border border-[#EBE3D5]">
                    <span className="text-xs font-bold">{p.name}</span>
                    <div className="flex items-center gap-3">
                      <span className="text-xs font-semibold text-[#5C4033]">₹{p.rate}</span>
                      <button onClick={() => handleRemoveProduct(p.id)} className="text-rose-500 text-xs">Delete</button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* LEDGER SUMMARY TAB (ADMIN ONLY) */}
        {activeTab === 'ledger' && isAdmin && (
          <div className="animate-in fade-in duration-300">
            <div className="bg-white/80 backdrop-blur-xl rounded-[32px] border border-[#EBE3D5] p-6 shadow-sm mb-6 flex justify-between items-center flex-wrap gap-4">
              <div>
                <h2 className="text-base font-extrabold text-[#2C211A]">Ledger Console</h2>
                <p className="text-xs text-amber-900/60">Filter and export operational ledger records.</p>
              </div>
              <button
                onClick={() => setIsExportModalOpen(true)}
                className="px-5 py-2.5 bg-[#107C41] text-xs text-white rounded-full font-bold shadow-md hover:bg-[#0E6C38] transition-all"
              >
                Export Excel
              </button>
            </div>

            <div className="bg-white rounded-[32px] border border-[#EBE3D5] overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table id="disbursement-ledger-table" className="w-full text-left border-collapse min-w-[800px]">
                  <thead>
                    <tr className="bg-[#FAF8F5] border-b border-[#EBE3D5] text-[10px] font-extrabold uppercase tracking-widest text-[#5C4033]">
                      <th className="py-4 px-6">Timestamp / Date</th>
                      <th className="py-4 px-6">Assigned Staff</th>
                      <th className="py-4 px-6">Product SKU</th>
                      <th className="py-4 px-6 text-right">Fixed Rate</th>
                      <th className="py-4 px-6 text-right">Qty</th>
                      <th className="py-4 px-6 text-right">Pricing Formula</th>
                      <th className="py-4 px-6 text-right" data-exclude="true">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#F3ECE0]">
                    {filteredTransactions.map((tx) => {
                      const staff = staffList.find(s => s.id === tx.staff_id);
                      const prod = productList.find(p => p.id === tx.product_id);
                      return (
                        <tr key={tx.id} className="text-sm">
                          <td className="py-4 px-6 text-xs text-amber-900/60 font-mono">{tx.timestamp}</td>
                          <td className="py-4 px-6 font-bold">{staff?.name || 'Deleted'}</td>
                          <td className="py-4 px-6">{prod?.name || 'Deleted'}</td>
                          <td className="py-4 px-6 text-right">₹{tx.rate}</td>
                          <td className="py-4 px-6 text-right font-black">{tx.quantity} nos</td>
                          <td className="py-4 px-6 text-right font-black text-[#5C4033]">₹{tx.total}</td>
                          <td className="py-4 px-6 text-right" data-exclude="true">
                            <button onClick={() => handleDeleteTransaction(tx.id)} className="text-rose-500 text-xs">Delete</button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}
      </main>

      {/* EXPORT MODAL */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div onClick={() => setIsExportModalOpen(false)} className="fixed inset-0 bg-[#2C211A]/40 backdrop-blur-md" />
          <div className="relative bg-white rounded-[32px] w-full max-w-md overflow-hidden border border-[#D5C9B7] shadow-2xl p-6 z-10 space-y-4">
            <h3 className="font-extrabold text-base">Select Excel Format</h3>
            <button onClick={() => generateExcelReport('minimal')} className="w-full p-4 rounded-2xl border text-left hover:bg-emerald-50">
              <span className="font-bold block">Minimal Summary</span>
              <span className="text-xs text-gray-500">Staff totals summary report.</span>
            </button>
            <button onClick={() => generateExcelReport('detailed')} className="w-full p-4 rounded-2xl border text-left hover:bg-emerald-50">
              <span className="font-bold block">Detailed Ledger</span>
              <span className="text-xs text-gray-500">Grouped layout with sub-totals.</span>
            </button>
            <button onClick={() => setIsExportModalOpen(false)} className="w-full py-3 border rounded-xl text-sm font-medium">Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
