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

const formatDisplayTimestamp = (ts: string, createdAt?: string) => {
  if (createdAt) {
    const d = new Date(createdAt);
    if (!isNaN(d.getTime())) {
      return `${d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${d.toLocaleDateString('en-GB')}`;
    }
  }
  return ts;
};

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

const SearchableSelect = ({
  options,
  value,
  onChange,
  placeholder,
  searchPlaceholder
}: {
  options: { id: string; label: string }[];
  value: string;
  onChange: (val: string) => void;
  placeholder: string;
  searchPlaceholder?: string;
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOptions = options.filter(opt => 
    opt.label.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const selectedOption = options.find(opt => opt.id === value);

  return (
    <div className="relative w-full">
      <div className="relative w-full">
        <input
          type="text"
          placeholder={isOpen ? (searchPlaceholder || "Search...") : placeholder}
          value={isOpen ? searchTerm : (selectedOption ? selectedOption.label : '')}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setIsOpen(true);
          }}
          onFocus={() => {
            setIsOpen(true);
            setSearchTerm('');
          }}
          onBlur={() => {
            setTimeout(() => {
              setIsOpen(false);
              setSearchTerm('');
            }, 150);
          }}
          className="w-full bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-4 py-3.5 pr-10 text-sm text-[#2C211A] focus:ring-2 focus:ring-[#5C4033]/20 focus:border-[#5C4033] outline-none transition-all shadow-sm cursor-pointer"
        />
        <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-[#5C4033] opacity-60 text-xs">
          ▼
        </div>
      </div>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-[#D5C9B7] rounded-xl shadow-lg max-h-32 overflow-y-auto">
          {filteredOptions.length > 0 ? (
            filteredOptions.map(opt => (
              <div 
                key={opt.id}
                className={`px-4 py-3 hover:bg-[#F0EBE1] cursor-pointer text-sm transition-colors ${value === opt.id ? 'bg-[#F0EBE1] font-medium text-[#5C4033]' : 'text-[#2C211A]'}`}
                onMouseDown={(e) => {
                  e.preventDefault(); // Prevents input blur before click registers
                  onChange(opt.id);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
              >
                {opt.label}
              </div>
            ))
          ) : (
            <div className="px-4 py-3 text-sm text-gray-500 italic text-center">No matches found</div>
          )}
        </div>
      )}
    </div>
  );
};

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
  // Declared variables to fix all reference crash issues
  const [isExportModalOpen, setIsExportModalOpen] = useState<boolean>(false);
  const [confirmDialog, setConfirmDialog] = useState<{isOpen: boolean; message: string; onConfirm: () => void} | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // --- DATA STATES ---
  const [staffList, setStaffList] = useState<Staff[]>([]);
  const [productList, setProductList] = useState<Product[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);

  // PWA Install Prompt State
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isInstallable, setIsInstallable] = useState<boolean>(false);

  // New Transaction Form State - Fixed to ensure it is initialized as a string
  const [newTxDate, setNewTxDate] = useState<string>(() => new Date().toISOString().split('T')[0]);
  const [newTxStaff, setNewTxStaff] = useState<string>('');
  const [newTxItems, setNewTxItems] = useState<DisbursementItem[]>([]);
  const [loginFinancialYear, setLoginFinancialYear] = useState<string>('2026');
  const [tableMissingError, setTableMissingError] = useState<string | null>(null);
  const [currentSelectedProduct, setCurrentSelectedProduct] = useState<string>('');
  const [currentSelectedQuantity, setCurrentSelectedQuantity] = useState<string>('');
  
  // Config States
  const [newStaffName, setNewStaffName] = useState<string>('');
  const [newProductName, setNewProductName] = useState<string>('');
  const [newProductRate, setNewProductRate] = useState<string>('');
  const [editingProductId, setEditingProductId] = useState<string | null>(null);
  const [editingProductName, setEditingProductName] = useState<string>('');
  const [editingRateValue, setEditingRateValue] = useState<string>('');
  const [editingStaffId, setEditingStaffId] = useState<string | null>(null);
  const [editingStaffName, setEditingStaffName] = useState<string>('');

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
    
    // Check if there is an active local storage session from our custom database logins
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

    // Convert name directly to a secure email address format behind the scenes
    const generatedEmail = `${authName.trim().replace(/\s+/g, '').toLowerCase()}@safa.com`;
    // Master Role Definition: password "786786" is flagged as Admin, any other password is standard staff
    const userRole = authPassword === '786786' ? 'admin' : 'staff';

    try {
      if (authMode === 'signup') {
        // 1. Verify if user email/name combination already exists in public table using standard .eq filter
        const { data: existingUser, error: checkError } = await client
          .from('users')
          .select('*')
          .eq('email', generatedEmail)
          .maybeSingle();

        if (checkError) throw checkError;
        if (existingUser) {
          throw new Error('This operator name is already registered.');
        }

        // 2. Insert user directly into Supabase custom database table
        const { error: insertError } = await client
          .from('users')
          .insert([{ email: generatedEmail, password: authPassword, role: userRole }]);

        if (insertError) throw insertError;

        alert('Registration successful! You can now log in.');
        setAuthMode('login');
      } else {
        // Login: Validate Name (email format) and Password directly from PostgreSQL
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

        // Construct session data in identical structure to support existing header/avatar views
        const sessionData = {
          user: {
            email: user.email,
            user_metadata: {
              full_name: authName.trim(),
              role: user.role,
              financial_year: loginFinancialYear
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
    setTableMissingError(null);
    setTransactions([]);
    setLoginFinancialYear('2026');
  };

  // Extract precise role assignment from the persistent database metadata
  const isAdmin = session?.user?.user_metadata?.role === 'admin';
  const activeFinancialYear = session?.user?.user_metadata?.financial_year || loginFinancialYear || '2026';

  // Protect Ledger Tab navigation from state leaks
  useEffect(() => {
    if (session && !isAdmin && activeTab === 'ledger') {
      setActiveTab('home');
    }
  }, [isAdmin, activeTab, session]);

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

  // --- DATA FETCHING (Only if authenticated) ---
  const fetchEnterpriseData = async (showLoader = false) => {
    const client = getSupabaseClient();
    if (!client || !session) return;

    if (showLoader) setIsLoading(true);
    try {
      const fyTable = `transaction_${activeFinancialYear}`;
      const [staffRes, productsRes, txRes] = await Promise.all([
        client.from('staff').select('*'),
        client.from('products').select('*'),
        client.from(fyTable).select('*').order('created_at', { ascending: false })
      ]);

      if (staffRes.data) setStaffList(staffRes.data);
      if (productsRes.data) setProductList(productsRes.data);
      if (txRes.data) {
        setTransactions(txRes.data);
        setTableMissingError(null);
      } else if (txRes.error) {
        // Fallback to plural transactions_${activeFinancialYear} in case user created it with plural name
        const altRes = await client.from(`transactions_${activeFinancialYear}`).select('*').order('created_at', { ascending: false });
        if (altRes.data) {
          setTransactions(altRes.data);
          setTableMissingError(null);
        } else {
          setTransactions([]);
          if (txRes.error.code === '42P01' || altRes.error?.code === '42P01') {
            setTableMissingError(activeFinancialYear);
          }
        }
      }
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

    const fyTable = `transaction_${activeFinancialYear}`;

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
      .channel(`${fyTable}-db-changes`)
      .on('postgres_changes', { event: '*', schema: 'public', table: fyTable }, () => {
        client.from(fyTable).select('*').order('created_at', { ascending: false }).then(({ data }: any) => {
          if (data) setTransactions(data);
        });
      })
      .subscribe();

    return () => {
      client.removeChannel(staffSubscription);
      client.removeChannel(productsSubscription);
      client.removeChannel(txSubscription);
      clearInterval(intervalId);
    };
  }, [isLibLoaded, session, activeFinancialYear]);

  const handleInstallApp = async () => {
    if (!deferredPrompt) return;
    deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    console.log(`User installation choice outcome: ${outcome}`);
    setDeferredPrompt(null);
    setIsInstallable(false);
  };

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
        // Unpack flat row object (data) instead of storing the data array directly
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
        // Unpack flat row object (data) instead of storing the data array directly
        setProductList(prev => [...prev, data[0]]);
        setNewProductName('');
        setNewProductRate('');
      }
    } catch (error: any) { console.error("Error:", error.message); }
  };

  const handleUpdateProduct = async (id: string, newName: string, newRate: string) => {
    const parsed = parseFloat(newRate);
    if (isNaN(parsed) || parsed < 0 || !newName.trim()) return;
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { data, error } = await client.from('products').update({ name: newName.trim(), rate: parsed }).eq('id', id).select();
      if (error) throw error;
      if (data && data.length > 0) {
        setProductList(prev => prev.map(p => p.id === id ? data[0] : p));
        setEditingProductId(null);
      }
    } catch (error: any) { console.error("Error:", error.message); }
  };

  const handleUpdateStaff = async (id: string, newName: string) => {
    if (!newName.trim()) return;
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const { data, error } = await client.from('staff').update({ name: newName.trim() }).eq('id', id).select();
      if (error) throw error;
      if (data && data.length > 0) {
        setStaffList(prev => prev.map(s => s.id === id ? data[0] : s));
        setEditingStaffId(null);
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

    const timestampStr = `${txDateObj.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} ${txDateObj.toLocaleDateString('en-GB')}`;
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
      const fyTable = `transaction_${activeFinancialYear}`;
      let { data, error } = await client.from(fyTable).insert(inserts).select();
      if (error && error.code === '42P01') {
        const fallback = await client.from(`transactions_${activeFinancialYear}`).insert(inserts).select();
        data = fallback.data;
        error = fallback.error;
      }
      if (error) {
        if (error.code === '42P01') {
          setTableMissingError(activeFinancialYear);
          alert(`Table transaction_${activeFinancialYear} does not exist yet in Supabase. Please copy and run the creation SQL in your Supabase SQL Editor.`);
          return;
        }
        throw error;
      }
      if (data && data.length > 0) {
        setTransactions(prev => [...data, ...prev]);
        setNewTxStaff('');
        setNewTxItems([]);
        setCurrentSelectedProduct('');
        setCurrentSelectedQuantity('');
        setNewTxDate(new Date().toISOString().split('T')[0]);
        // Show success popup instead of switching tabs
        setSuccessMessage('Disbursement successfully recorded and stored in the vault.');
      }
    } catch (error: any) {
      console.error("Error:", error.message);
      alert(error.message || "Failed to record disbursement");
    }
  };

  const handleDeleteTransaction = async (txId: string) => {
    const client = getSupabaseClient();
    if (!client) return;
    try {
      const fyTable = `transaction_${activeFinancialYear}`;
      let { error } = await client.from(fyTable).delete().eq('id', txId);
      if (error && error.code === '42P01') {
        const fallback = await client.from(`transactions_${activeFinancialYear}`).delete().eq('id', txId);
        error = fallback.error;
      }
      if (error) throw error;
      setTransactions(prev => prev.filter(t => t.id !== txId));
    } catch (error: any) { console.error("Error:", error.message); }
  };

  // --- ADVANCED DATE FILTER RESOLVER ---
  const filteredTransactions = useMemo(() => {
    return transactions.filter(t => {
      const matchStaff = filterStaff === 'All' || t.staff_id === filterStaff;
      const matchProduct = filterProduct === 'All' || t.product_id === filterProduct;
      if (!matchStaff || !matchProduct ) return false;

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

  // --- SHEETJS EXPORT FUNCTIONALITY ---
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
      const reportDate = new Date().toLocaleDateString('en-GB');
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
          aoa.push([formatDisplayTimestamp(tx.timestamp, tx.created_at), index === 0 ? staffName : '', prodName, formula]);
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
    const dateStr = new Date().toISOString().split('T');
    const fileName = `SAFA_${type === 'detailed' ? 'Detailed' : 'Minimal'}_Ledger_${dateStr}.xlsx`;
    // @ts-ignore
    window.XLSX.writeFile(workbook, fileName);
    setIsExportModalOpen(false);
  };


  // ================= RENDER BLOCKS =================

  if (!isLibLoaded || !isXlsxLoaded) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center">
        <div className="w-10 h-10 border-4 border-[#D5C9B7] border-t-[#5C4033] rounded-full animate-spin"></div>
      </div>
    );
  }

  // --- 1. INSTAGRAM STYLE AUTHENTICATION VIEW ---
  if (!session) {
    return (
      <div className="min-h-screen bg-[#FAF8F5] flex items-center justify-center p-4 selection:bg-[#EEDFCC]">
        {/* Decorative Orbs */}
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#F3ECE0] rounded-full blur-3xl opacity-60 -z-10 pointer-events-none" />
        <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[#E8DFD0] rounded-full blur-3xl opacity-40 -z-10 pointer-events-none" />

        <div className="w-full max-w-sm bg-white/80 backdrop-blur-xl border border-[#EBE3D5] rounded-[32px] p-8 shadow-2xl relative overflow-hidden">
          
          <div className="flex flex-col items-center mb-8">
            <div className="flex items-center space-x-2 mb-4">
              <img 
                src="https://github.com/liyaqat-dev/Enterprise-sales-tracker/blob/main/20260526_182400.png?raw=true" 
                alt="Brand Logo 1" 
                className="w-14 h-14 object-contain drop-shadow-sm"
              />
              <img 
                src="https://github.com/liyaqat-dev/Enterprise-sales-tracker/blob/main/20260526_182503.png?raw=true" 
                alt="Brand Logo 2" 
                className="w-14 h-14 object-contain"
              />
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
              placeholder="Enter your password"
              required
              value={authPassword}
              onChange={(e) => setAuthPassword(e.target.value)}
              className="w-full bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-4 py-3.5 text-sm text-[#2C211A] focus:ring-1 focus:ring-[#5C4033] focus:outline-none transition-all placeholder-amber-900/40"
            />
            
            {authMode === 'login' && (
              <div className="space-y-1 pt-0.5">
                <label className="text-[10px] font-extrabold text-[#5C4033] uppercase tracking-widest pl-1 block">
                  Financial Year
                </label>
                <div className="relative">
                  <select
                    value={loginFinancialYear}
                    onChange={(e) => setLoginFinancialYear(e.target.value)}
                    className="w-full bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-4 py-3.5 pr-10 text-sm font-semibold text-[#2C211A] focus:ring-1 focus:ring-[#5C4033] focus:border-[#5C4033] focus:outline-none transition-all cursor-pointer shadow-sm appearance-none"
                  >
                    <option value="2026">FY 2026</option>
                    <option value="2027">FY 2027</option>
                    <option value="2028">FY 2028</option>
                    <option value="2029">FY 2029</option>
                    <option value="2030">FY 2030</option>
                  </select>
                  <div className="absolute inset-y-0 right-0 flex items-center pr-3.5 pointer-events-none text-[#5C4033]">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            )}
            
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
              {authLoading ? (
                <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              ) : (
                authMode === 'login' ? 'Log In' : 'Sign Up'
              )}
            </button>
          </form>

          <div className="mt-8 text-center border-t border-[#EBE3D5] pt-5">
            <span className="text-xs text-amber-900/60">
              {authMode === 'login' ? "Don't have an account? " : "Already have an account? "}
            </span>
            <button
              onClick={() => {
                setAuthMode(authMode === 'login' ? 'signup' : 'login');
                setAuthError('');
              }}
              className="text-xs font-bold text-[#5C4033] hover:underline"
            >
              {authMode === 'login' ? 'Sign up' : 'Log in'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // --- 2. MAIN APP SHELL WITH TABS & HAMBURGER ---

  // Loading overlay after auth but before initial data fetch
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
      
      {/* Decorative Orbs */}
      <div className="absolute top-0 left-1/4 w-96 h-96 bg-[#F3ECE0] rounded-full blur-3xl opacity-60 -z-10 pointer-events-none" />
      <div className="absolute top-1/3 right-1/4 w-80 h-80 bg-[#E8DFD0] rounded-full blur-3xl opacity-40 -z-10 pointer-events-none" />

      {/* --- STICKY HEADER --- */}
      <header className="sticky top-0 z-40 backdrop-blur-xl bg-[#FAF8F5]/85 border-b border-[#EBE3D5] px-4 md:px-6 py-4 transition-all duration-300">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          
          <div className="flex items-center gap-3 md:gap-5">
            {/* Hamburger Toggle */}
            <button 
              onClick={() => setIsMenuOpen(true)}
              className="p-2 -ml-2 rounded-xl text-[#5C4033] hover:bg-[#F3EFE7] transition-colors focus:outline-none focus:ring-2 focus:ring-[#5C4033]/20"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>

            {/* Brand Logo & Name */}
            <div className="flex items-center gap-3 cursor-pointer select-none" onClick={() => setActiveTab('home')}>
              <div className="flex items-center space-x-1">
                <img 
                  src="https://github.com/liyaqat-dev/Enterprise-sales-tracker/blob/main/20260526_182400.png?raw=true" 
                  alt="SAFA Logo 1" 
                  className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
                <img 
                  src="https://github.com/liyaqat-dev/Enterprise-sales-tracker/blob/main/20260526_182503.png?raw=true" 
                  alt="SAFA Logo 2" 
                  className="w-10 h-10 md:w-12 md:h-12 object-contain drop-shadow-sm"
                  onError={(e) => { (e.target as HTMLImageElement).style.display = 'none'; }}
                />
              </div>
              <div className="hidden sm:block">
                <h1 className="text-lg md:text-xl font-extrabold tracking-tight text-[#2C211A] leading-tight">SAFA</h1>
                <h2 className="text-[9px] md:text-[10px] font-bold tracking-widest uppercase text-amber-900/60">Dealer of Taste</h2>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isInstallable && (
              <button
                onClick={handleInstallApp}
                className="hidden sm:flex items-center justify-center gap-2 px-4 py-2 rounded-full bg-emerald-700 hover:bg-emerald-800 text-white font-semibold text-xs transition-all active:scale-95 shadow-sm animate-bounce"
              >
                <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                Install
              </button>
            )}

            {/* Profile / Logout */}
            <div className="flex items-center gap-2 md:gap-3 pl-3 md:pl-5 border-l border-[#EBE3D5]">
              <span className="px-2.5 py-1 rounded-full bg-[#5C4033]/10 border border-[#5C4033]/20 text-[10px] font-extrabold text-[#5C4033] tracking-widest uppercase shadow-sm">
                FY {activeFinancialYear}
              </span>
              <div className="hidden md:flex flex-col items-end">
                <span className="text-[10px] font-bold text-[#5C4033] uppercase">
                  {isAdmin ? 'Admin Supervisor' : 'Staff Operator'}
                </span>
                <span className="text-xs font-medium text-amber-900/60 truncate max-w-[120px]">
                  {session?.user?.user_metadata?.full_name || session?.user?.email?.split('@')[0]}
                </span>
              </div>
              <button
                onClick={handleLogout}
                title="Log Out"
                className="w-10 h-10 rounded-full bg-[#F3EFE7] border border-[#D5C9B7] text-[#5C4033] flex items-center justify-center hover:bg-[#EBE3D5] hover:text-rose-600 transition-colors shadow-sm"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* --- HAMBURGER DRAWER --- */}
      {/* Backdrop */}
      <div 
        className={`fixed inset-0 bg-[#2C211A]/40 backdrop-blur-sm z-50 transition-opacity duration-300 ${isMenuOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'}`}
        onClick={() => setIsMenuOpen(false)}
      />
      
      {/* Drawer */}
      <div className={`fixed inset-y-0 left-0 w-72 bg-white/95 backdrop-blur-2xl shadow-2xl z-50 border-r border-[#EBE3D5] transform transition-transform duration-300 ease-in-out flex flex-col ${isMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="p-6 border-b border-[#EBE3D5] flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <img src="https://github.com/liyaqat-dev/Enterprise-sales-tracker/blob/main/20260526_182400.png?raw=true" alt="Logo" className="w-8 h-8 object-contain" />
            <div>
              <span className="block text-sm font-extrabold text-[#2C211A] leading-tight">SAFA PAYROLL</span>
              <span className="block text-[9px] uppercase tracking-wider text-[#5C4033] font-semibold">
                {isAdmin ? 'HQ Dashboard' : 'Operator Mode'}
              </span>
            </div>
          </div>
          <button 
            onClick={() => setIsMenuOpen(false)}
            className="p-1.5 rounded-full text-amber-900/40 hover:bg-[#FAF5EE] hover:text-[#5C4033] transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1">
          <button
            onClick={() => { setActiveTab('home'); setIsMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${activeTab === 'home' ? 'bg-[#5C4033] text-white shadow-md' : 'text-[#2C211A] hover:bg-[#FAF5EE]'}`}
          >
            <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" /></svg>
            Home Overview
          </button>
          
          <button
            onClick={() => { setActiveTab('log'); setIsMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${activeTab === 'log' ? 'bg-[#5C4033] text-white shadow-md' : 'text-[#2C211A] hover:bg-[#FAF5EE]'}`}
          >
            <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" /></svg>
            Log Disbursement
          </button>
          
          <button
            onClick={() => { setActiveTab('config'); setIsMenuOpen(false); }}
            className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${activeTab === 'config' ? 'bg-[#5C4033] text-white shadow-md' : 'text-[#2C211A] hover:bg-[#FAF5EE]'}`}
          >
            <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
            Rates & Staff
          </button>
          
          {/* RBAC: Only Admin can see the Ledger Summary route */}
          {isAdmin && (
            <button
              onClick={() => { setActiveTab('ledger'); setIsMenuOpen(false); }}
              className={`w-full flex items-center gap-3 px-4 py-3.5 rounded-2xl text-sm font-semibold transition-all ${activeTab === 'ledger' ? 'bg-[#5C4033] text-white shadow-md' : 'text-[#2C211A] hover:bg-[#FAF5EE]'}`}
            >
              <svg className="w-5 h-5 opacity-80" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
              Ledger Summary
            </button>
          )}
        </div>

        <div className="p-6 border-t border-[#EBE3D5] bg-[#FAF5EE]/30">
          <p className="text-[10px] text-amber-900/40 text-center uppercase tracking-widest font-semibold">SAFA Vault Platform &copy; 2026</p>
        </div>
      </div>

      {/* --- CONTENT AREA (ROUTING) --- */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 md:px-6 py-8">
        
        {/* VIEW: HOME OVERVIEW */}
        {activeTab === 'home' && (
          <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/60 backdrop-blur-lg border border-[#EBE3D5] rounded-3xl p-6 md:p-10 shadow-sm relative overflow-hidden">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-amber-100 rounded-full mix-blend-multiply filter blur-3xl opacity-50"></div>
              <h2 className="text-2xl md:text-3xl font-extrabold text-[#2C211A] mb-2 tracking-tight">
                Welcome back, {session?.user?.user_metadata?.full_name?.split(' ') || session?.user?.email?.split('@') || 'Supervisor'}!
              </h2>
              <p className="text-sm md:text-base text-amber-900/60 max-w-2xl">
                You are currently viewing the central command dashboard for SAFA. Monitor live disbursements, manage staff authorizations, and oversee catalog metrics across the enterprise network.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-[#EBE3D5] shadow-sm flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-300">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold tracking-wide text-amber-900/60 uppercase">Total Disbursement Amount</span>
                  <div className="p-2.5 bg-[#FAF5EE] rounded-xl border border-[#F3ECE0]">
                    <svg className="w-5 h-5 text-[#8B6E53]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="text-3xl md:text-4xl font-extrabold text-[#2C211A] tracking-tight">₹ {totalDisbursedAmount.toLocaleString('en-IN')}</div>
                  <p className="text-xs text-amber-900/60 mt-2">Calculated globally across all logs</p>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-[#EBE3D5] shadow-sm flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-300">
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold tracking-wide text-amber-900/60 uppercase">Total Quantity Out</span>
                  <div className="p-2.5 bg-[#FAF5EE] rounded-xl border border-[#F3ECE0]">
                    <svg className="w-5 h-5 text-[#8B6E53]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="text-3xl md:text-4xl font-extrabold text-[#2C211A] tracking-tight">{totalDisbursedQuantity.toLocaleString('en-IN')} <span className="text-sm font-normal text-amber-900/60">Nos</span></div>
                  <p className="text-xs text-amber-900/60 mt-2">Cumulative units dispersed</p>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-[#EBE3D5] shadow-sm flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-300 cursor-pointer" onClick={() => setActiveTab('config')}>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold tracking-wide text-amber-900/60 uppercase">Authorized Staff</span>
                  <div className="p-2.5 bg-[#FAF5EE] rounded-xl border border-[#F3ECE0]">
                    <svg className="w-5 h-5 text-[#8B6E53]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" /></svg>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="text-3xl md:text-4xl font-extrabold text-[#2C211A] tracking-tight">{staffList.length}</div>
                  <p className="text-xs text-[#5C4033] font-semibold mt-2 flex items-center gap-1 group-hover:underline">Manage personnel &rarr;</p>
                </div>
              </div>

              <div className="bg-white/70 backdrop-blur-md rounded-3xl p-6 md:p-8 border border-[#EBE3D5] shadow-sm flex flex-col justify-between hover:translate-y-[-2px] transition-transform duration-300 cursor-pointer" onClick={() => setActiveTab('config')}>
                <div className="flex justify-between items-start">
                  <span className="text-xs font-semibold tracking-wide text-amber-900/60 uppercase">Configured Catalogs</span>
                  <div className="p-2.5 bg-[#FAF5EE] rounded-xl border border-[#F3ECE0]">
                    <svg className="w-5 h-5 text-[#8B6E53]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01" /></svg>
                  </div>
                </div>
                <div className="mt-6">
                  <div className="text-3xl md:text-4xl font-extrabold text-[#2C211A] tracking-tight">{productList.length}</div>
                  <p className="text-xs text-[#5C4033] font-semibold mt-2 flex items-center gap-1 group-hover:underline">Manage products &rarr;</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* VIEW: LOG DISBURSEMENT */}
        {activeTab === 'log' && (
          <div className="max-w-2xl mx-auto animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="bg-white/80 backdrop-blur-xl border border-[#EBE3D5] rounded-[32px] p-6 md:p-10 shadow-xl relative overflow-hidden">
              <div className="mb-8 border-b border-[#EBE3D5] pb-5">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#5C4033] rounded-xl text-white shadow-sm">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 13h6m-3-3v6m5 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-xl font-extrabold text-[#2C211A] tracking-tight">Record Disbursement</h2>
                    <p className="text-sm text-amber-900/60 mt-0.5">Secure multi-item logging directly to the SAFA Vault.</p>
                  </div>
                </div>
              </div>

              <form className="space-y-6" onSubmit={(e) => e.preventDefault()}>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#5C4033] uppercase tracking-widest pl-1">1. Disperse Date</label>
                    <input
                      type="date"
                      required
                      value={newTxDate}
                      onChange={(e) => setNewTxDate(e.target.value)}
                      className="w-full bg-[#FAF9F6] border border-[#D5C9B7] rounded-2xl px-4 py-3.5 text-sm text-[#2C211A] focus:ring-2 focus:ring-[#5C4033]/20 focus:border-[#5C4033] outline-none transition-all cursor-pointer shadow-sm"
                    />
                  </div>
                  
                  <div className="space-y-1.5">
                    <label className="text-[11px] font-bold text-[#5C4033] uppercase tracking-widest pl-1">2. Assign Staff</label>
                    <SearchableSelect
                      options={staffList.map(s => ({ id: s.id, label: s.name }))}
                      value={newTxStaff}
                      onChange={setNewTxStaff}
                      placeholder="-- Select Authorized Staff --"
                      searchPlaceholder="Search Staff..."
                    />
                  </div>
                </div>

                <div className="p-5 md:p-6 bg-[#FAF8F5] border border-[#EBE3D5] rounded-3xl space-y-4 shadow-inner">
                  <h4 className="text-[11px] font-bold text-[#5C4033] uppercase tracking-widest pl-1">4. Build Item List</h4>
                  
                  <div className="flex flex-col sm:flex-row gap-3">
                    <div className="flex-1">
                      <SearchableSelect
                        options={productList.map(p => ({ id: p.id, label: `${p.name} (₹${p.rate})` }))}
                        value={currentSelectedProduct}
                        onChange={setCurrentSelectedProduct}
                        placeholder="-- Choose Catalog SKU --"
                        searchPlaceholder="Search Product..."
                      />
                    </div>
                    <div className="w-full sm:w-32">
                      <input
                        type="number"
                        min="1"
                        placeholder="Qty"
                        value={currentSelectedQuantity}
                        onChange={(e) => setCurrentSelectedQuantity(e.target.value)}
                        className="w-full bg-white border border-[#D5C9B7] rounded-xl px-4 py-3 text-sm text-[#2C211A] focus:ring-2 focus:ring-[#5C4033]/20 focus:border-[#5C4033] outline-none"
                      />
                    </div>
                  </div>
                  
                  <button
                    type="button"
                    onClick={handleAddItemToTxList}
                    disabled={!currentSelectedProduct || !currentSelectedQuantity}
                    className="w-full py-3 bg-white text-sm font-bold text-[#5C4033] rounded-xl border border-[#D5C9B7] hover:bg-[#FAF0E6] hover:border-[#5C4033] transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-sm"
                  >
                    + Add To Disbursement List
                  </button>
                </div>

                {newTxItems.length > 0 && (
                  <div className="space-y-2 animate-in fade-in">
                    <span className="block text-[11px] font-bold text-[#5C4033] uppercase tracking-widest pl-1">Active Cart</span>
                    <div className="overflow-hidden border border-[#D5C9B7] rounded-2xl bg-white shadow-sm">
                      <div className="max-h-48 overflow-y-auto divide-y divide-[#F3ECE0]">
                        {newTxItems.map((item) => {
                          const prod = productList.find(p => p.id === item.product_id);
                          if (!prod) return null;
                          return (
                            <div key={item.product_id} className="flex items-center justify-between p-4 text-sm hover:bg-[#FAF8F5] transition-colors">
                              <div>
                                <span className="font-bold text-[#2C211A]">{prod.name}</span>
                                <span className="text-amber-900/60 ml-2 font-mono text-xs bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-100">{item.quantity} nos @ ₹{prod.rate}</span>
                              </div>
                              <div className="flex items-center gap-4">
                                <span className="font-extrabold text-[#5C4033]">₹{(item.quantity * prod.rate).toLocaleString('en-IN')}</span>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setConfirmDialog({
                                      isOpen: true,
                                      message: `Are you sure you want to remove ${prod?.name || 'this item'} from the list?`,
                                      onConfirm: () => handleRemoveItemFromTxList(item.product_id)
                                    });
                                  }}
                                  className="text-rose-400 hover:text-white hover:bg-rose-500 p-1.5 rounded-lg transition-colors border border-transparent hover:border-rose-600"
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                                </button>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="bg-[#FAF5EE] p-4 border-t border-[#D5C9B7] flex justify-between items-center">
                        <span className="text-xs font-bold text-amber-900/60 uppercase tracking-widest">Grand Total</span>
                        <span className="text-2xl font-black text-[#5C4033] tracking-tight">₹ {modalGrandTotal.toLocaleString('en-IN')}</span>
                      </div>
                    </div>
                  </div>
                )}

                <div className="pt-6 border-t border-[#EBE3D5]">
                  <button
                    type="button"
                    onClick={handleLogDisbursement}
                    disabled={!newTxStaff || newTxItems.length === 0 || !newTxDate}
                    className="w-full py-4 rounded-2xl bg-[#5C4033] hover:bg-[#4E3629] text-white font-extrabold text-base shadow-lg transition-all active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    Confirm & Store in Vault
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* VIEW: RATES & STAFF CONFIG */}
        {activeTab === 'config' && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500 max-w-5xl mx-auto space-y-6">
            
            <div className="bg-white/80 backdrop-blur-xl border border-[#EBE3D5] rounded-3xl p-6 md:p-8 shadow-sm flex items-center gap-4">
              <div className="p-3 bg-[#5C4033] rounded-2xl text-white shadow-md">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
              </div>
              <div>
                <h2 className="text-xl font-extrabold text-[#2C211A] tracking-tight">Master Configuration</h2>
                <p className="text-sm text-amber-900/60 mt-0.5">Manage personnel authorizations and the global product pricing engine.</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              
              {/* STAFF PANEL */}
              <div className="bg-white/80 backdrop-blur-xl border border-[#EBE3D5] rounded-3xl p-6 md:p-8 shadow-sm flex flex-col h-[600px]">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-[#2C211A] tracking-tight">Staff Network</h3>
                  <p className="text-xs text-amber-900/60 mt-1">Supervisors registered for operational logging.</p>
                </div>

                <div className="flex gap-2 mb-6">
                  <input
                    type="text"
                    placeholder="E.g. John Doe"
                    value={newStaffName}
                    onChange={(e) => setNewStaffName(e.target.value)}
                    onKeyDown={(e) => { if (e.key === 'Enter') { e.preventDefault(); if (newStaffName.trim()) handleAddStaff(e as any); } }}
                    className="flex-1 bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-4 py-3 text-sm text-[#2C211A] focus:ring-2 focus:ring-[#5C4033]/20 focus:border-[#5C4033] outline-none"
                  />
                  <button
                    type="button"
                    onClick={(e) => { if (newStaffName.trim()) handleAddStaff(e as any); }}
                    className="px-5 bg-[#5C4033] hover:bg-[#4E3629] text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    Add
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-2.5">
                  {staffList.map((staff) => (
                    <div key={staff.id} className="flex items-center justify-between p-3.5 bg-white rounded-2xl border border-[#EBE3D5] shadow-sm hover:border-[#D5C9B7] transition-all">
                      <div className="flex items-center gap-3 w-full mr-2">
                        <div className="w-8 h-8 rounded-full bg-[#FAF5EE] border border-[#EBE3D5] flex items-center justify-center text-xs font-bold text-[#5C4033] shrink-0">
                          {staff.name.charAt(0).toUpperCase()}
                        </div>
                        {editingStaffId === staff.id ? (
                          <input
                            type="text"
                            className="bg-[#FAF9F6] border border-[#D5C9B7] rounded-lg px-2 py-1.5 text-sm font-semibold text-[#2C211A] focus:outline-none focus:ring-1 focus:ring-[#5C4033] w-full"
                            value={editingStaffName}
                            onChange={(e) => setEditingStaffName(e.target.value)}
                          />
                        ) : (
                          <span className="text-sm font-semibold text-[#2C211A] truncate">{staff.name}</span>
                        )}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {editingStaffId === staff.id ? (
                          <>
                            <button onClick={() => handleUpdateStaff(staff.id, editingStaffName)} className="p-1.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                            </button>
                            <button onClick={() => setEditingStaffId(null)} className="p-1.5 text-amber-900/60 hover:bg-[#FAF5EE] rounded-lg border border-[#EBE3D5]">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                            </button>
                          </>
                        ) : (
                          <>
                            <button onClick={() => { setEditingStaffId(staff.id); setEditingStaffName(staff.name); }} className="p-2 text-amber-900/40 hover:text-[#5C4033] hover:bg-[#FAF5EE] rounded-lg transition-colors border border-transparent hover:border-[#D5C9B7]" title="Edit Staff">
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                setConfirmDialog({
                                  isOpen: true,
                                  message: `Are you sure you want to remove ${staff.name}? This action cannot be undone.`,
                                  onConfirm: () => handleRemoveStaff(staff.id)
                                });
                              }}
                              className="p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-lg transition-colors border border-transparent hover:border-rose-600"
                              title="Remove Staff"
                            >
                              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                            </button>
                          </>
                        )}
                      </div>
                    </div>
                  ))}
                  {staffList.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-sm text-amber-900/40 italic">No staff configured.</p>
                    </div>
                  )}
                </div>
              </div>

              {/* PRODUCTS PANEL */}
              <div className="bg-white/80 backdrop-blur-xl border border-[#EBE3D5] rounded-3xl p-6 md:p-8 shadow-sm flex flex-col h-[600px]">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-[#2C211A] tracking-tight">Catalog Rates Engine</h3>
                  <p className="text-xs text-amber-900/60 mt-1">Global SKU definitions and their flat pricing rules.</p>
                </div>

                <div className="space-y-3 mb-6">
                  <div className="flex gap-2">
                    <input
                      type="text"
                      placeholder="SKU Name"
                      value={newProductName}
                      onChange={(e) => setNewProductName(e.target.value)}
                      className="bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-4 py-3 text-sm text-[#2C211A] focus:ring-2 focus:ring-[#5C4033]/20 focus:border-[#5C4033] outline-none"
                    />
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      placeholder="₹ Rate"
                      value={newProductRate}
                      onChange={(e) => setNewProductRate(e.target.value)}
                      className="bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-4 py-3 text-sm text-[#2C211A] focus:ring-2 focus:ring-[#5C4033]/20 focus:border-[#5C4033] outline-none"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={(e) => { if (newProductName.trim() && newProductRate) handleAddProduct(e as any); }}
                    className="w-full py-3 bg-[#5C4033] hover:bg-[#4E3629] text-white text-sm font-bold rounded-xl transition-all shadow-sm active:scale-95"
                  >
                    Inject New Product Rule
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto pr-2 space-y-2.5">
                  {productList.map((product) => (
                    <div key={product.id} className="p-3.5 bg-white rounded-2xl border border-[#EBE3D5] shadow-sm hover:border-[#D5C9B7] transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                      <div className="flex items-center gap-3 w-full mr-2">
                        <span className="w-2.5 h-2.5 rounded-full bg-[#8B6E53] shrink-0"></span>
                        {editingProductId === product.id ? (
                          <input
                            type="text"
                            className="bg-[#FAF9F6] border border-[#D5C9B7] rounded-lg px-2 py-1.5 text-sm font-semibold text-[#2C211A] focus:outline-none focus:ring-1 focus:ring-[#5C4033] w-full"
                            value={editingProductName}
                            onChange={(e) => setEditingProductName(e.target.value)}
                          />
                        ) : (
                          <span className="text-sm font-semibold text-[#2C211A] truncate">{product.name}</span>
                        )}
                      </div>
                      
                      {editingProductId === product.id ? (
                        <div className="flex items-center gap-2 shrink-0">
                          <input
                            type="number"
                            step="0.01"
                            className="w-20 bg-[#FAF9F6] border border-[#D5C9B7] rounded-lg px-2 py-1.5 text-sm text-right font-bold text-[#5C4033] focus:outline-none focus:ring-1 focus:ring-[#5C4033]"
                            value={editingRateValue}
                            onChange={(e) => setEditingRateValue(e.target.value)}
                          />
                          <button onClick={() => handleUpdateProduct(product.id, editingProductName, editingRateValue)} className="p-1.5 text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-sm">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                          </button>
                          <button onClick={() => setEditingProductId(null)} className="p-1.5 text-amber-900/60 hover:bg-[#FAF5EE] rounded-lg border border-[#EBE3D5]">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M6 18L18 6M6 6l12 12" /></svg>
                          </button>
                        </div>
                      ) : (
                        <div className="flex items-center gap-2 shrink-0">
                          <span className="text-sm font-black text-[#5C4033] bg-[#FAF5EE] px-3 py-1 rounded-lg border border-[#F3ECE0]">
                            ₹{product.rate.toFixed(2)}
                          </span>
                          <button onClick={() => { setEditingProductId(product.id); setEditingProductName(product.name); setEditingRateValue(product.rate.toString()); }} className="p-2 text-amber-900/40 hover:text-[#5C4033] hover:bg-[#FAF5EE] rounded-lg transition-colors border border-transparent hover:border-[#D5C9B7]" title="Edit Product">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                          </button>
                          <button 
                            onClick={() => {
                              setConfirmDialog({
                                isOpen: true,
                                message: `Are you sure you want to remove ${product.name}? This action cannot be undone.`,
                                onConfirm: () => handleRemoveProduct(product.id)
                              });
                            }} 
                            className="p-2 text-rose-400 hover:text-white hover:bg-rose-500 rounded-lg transition-colors border border-transparent hover:border-rose-600" title="Remove Product"
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                  {productList.length === 0 && (
                    <div className="h-full flex items-center justify-center">
                      <p className="text-sm text-amber-900/40 italic">No products configured.</p>
                    </div>
                  )}
                </div>
              </div>

            </div>
          </div>
        )}

        {/* VIEW: LEDGER SUMMARY (ADMIN ONLY) */}
        {activeTab === 'ledger' && isAdmin && (
          <div className="animate-in fade-in slide-in-from-bottom-4 duration-500">
            {/* PRIMARY CONTROLS PANEL (FILTER BAR WITH DYNAMIC DATES) */}
            <div className="bg-white/80 backdrop-blur-xl rounded-[32px] border border-[#EBE3D5] p-6 shadow-sm mb-8 space-y-5">
              
              <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-[#EBE3D5]">
                <div className="flex items-center gap-3">
                  <div className="p-2.5 bg-[#5C4033] rounded-xl text-white shadow-sm">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 17v-2m3 2v-4m3 4v-6m2 10H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                  </div>
                  <div>
                    <h2 className="text-base font-extrabold text-[#2C211A] tracking-tight">Ledger Filtering Console</h2>
                    <p className="text-xs text-amber-900/60 mt-0.5">Isolate records by personnel, SKU, and operational periods.</p>
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 self-start md:self-auto">
                  {(filterStaff !== 'All' || filterProduct !== 'All' || datePreset !== 'All' || startDate || endDate) && (
                    <button
                      onClick={() => { setFilterStaff('All'); setFilterProduct('All'); setDatePreset('All'); setStartDate(''); setEndDate(''); }}
                      className="px-4 py-2 bg-white text-xs font-bold text-[#5C4033] hover:bg-[#FAF5EE] rounded-full border border-[#D5C9B7] flex items-center gap-2 transition-all shadow-sm"
                    >
                      Clear Filters
                      <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
                    </button>
                  )}

                  <button
                    onClick={() => setIsExportModalOpen(true)}
                    disabled={filteredTransactions.length === 0}
                    className="px-5 py-2.5 bg-[#107C41] text-xs text-white hover:bg-[#0E6C38] rounded-full font-bold flex items-center gap-2 transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed shadow-md shadow-[#107C41]/20 active:scale-95"
                    title="Download Filtered Ledger as Excel Workbook (.xlsx)"
                  >
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                    Export Excel
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="flex flex-col">
                  <label className="text-[10px] font-extrabold text-[#5C4033] uppercase mb-1.5 px-1 tracking-widest">Staff Target</label>
                  <select value={filterStaff} onChange={(e) => setFilterStaff(e.target.value)} className="bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-[#5C4033]/20 focus:border-[#5C4033] outline-none transition-colors cursor-pointer text-[#2C211A]">
                    <option value="All">Enterprise (All)</option>
                    {staffList.map(s => <option key={s.id} value={s.id}>{s.name}</option>)}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-extrabold text-[#5C4033] uppercase mb-1.5 px-1 tracking-widest">Product SKU</label>
                  <select value={filterProduct} onChange={(e) => setFilterProduct(e.target.value)} className="bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-[#5C4033]/20 focus:border-[#5C4033] outline-none transition-colors cursor-pointer text-[#2C211A]">
                    <option value="All">Full Catalog (All)</option>
                    {productList.map(p => <option key={p.id} value={p.id}>{p.name} (₹{p.rate})</option>)}
                  </select>
                </div>

                <div className="flex flex-col">
                  <label className="text-[10px] font-extrabold text-[#5C4033] uppercase mb-1.5 px-1 tracking-widest">Time Period</label>
                  <select value={datePreset} onChange={(e) => setDatePreset(e.target.value)} className="bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-4 py-3 text-sm font-semibold focus:ring-2 focus:ring-[#5C4033]/20 focus:border-[#5C4033] outline-none transition-colors cursor-pointer text-[#2C211A]">
                    <option value="All">All Time</option>
                    <option value="Today">Today Only</option>
                    <option value="Yesterday">Yesterday</option>
                    <option value="Month">This Month</option>
                    <option value="Custom">Custom Range...</option>
                  </select>
                </div>

                {datePreset === 'Custom' && (
                  <div className="flex flex-col lg:col-span-1">
                    <label className="text-[10px] font-extrabold text-[#5C4033] uppercase mb-1.5 px-1 tracking-widest">Custom Range</label>
                    <div className="grid grid-cols-2 gap-2">
                      <input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} className="bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-3 py-3 text-[11px] font-bold text-[#2C211A] focus:ring-2 focus:ring-[#5C4033]/20 focus:border-[#5C4033] outline-none" />
                      <input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} className="bg-[#FAF9F6] border border-[#D5C9B7] rounded-xl px-3 py-3 text-[11px] font-bold text-[#2C211A] focus:ring-2 focus:ring-[#5C4033]/20 focus:border-[#5C4033] outline-none" />
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* FILTER CHECKSUM BAR */}
            {filteredTransactions.length > 0 && (
              <div className="bg-white rounded-[32px] border border-[#EBE3D5] px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-5 shadow-sm">
                <span className="text-xs font-black text-[#5C4033] uppercase tracking-widest flex items-center gap-2">
                  <span className="w-2 h-2 rounded-full bg-[#5C4033]"></span>
                  Filter Checksum
                </span>
                <div className="flex items-center gap-8">
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-amber-900/50 font-bold tracking-widest block mb-0.5">Volume Output</span>
                    <span className="font-black text-[#2C211A] text-lg">{totalDisbursedQuantity} <span className="text-xs text-amber-900/50 ml-0.5 font-bold">Nos</span></span>
                  </div>
                  <div className="w-px h-8 bg-[#D5C9B7]"></div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase text-amber-900/50 font-bold tracking-widest block mb-0.5">Financial Output</span>
                    <span className="text-xl font-black text-[#107C41]">₹ {totalDisbursedAmount.toLocaleString('en-IN')}</span>
                  </div>
                </div>
              </div>
            )}

            {/* LEDGER & LIVE CALCULATION SUMMARY TABLE */}
            <div className="bg-white rounded-[32px] border border-[#EBE3D5] overflow-hidden shadow-sm">
              <div className="px-6 py-5 border-b border-[#EBE3D5] flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#FDFBF7]">
                <div>
                  <h3 className="text-base font-bold text-[#2C211A] flex items-center gap-2">
                    Live Ledger Engine
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200 flex items-center gap-1.5 uppercase tracking-widest shadow-sm">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span> Live
                    </span>
                  </h3>
                  <p className="text-xs text-amber-900/50 mt-1">Immutable record of filtered enterprise disbursements.</p>
                </div>
                <div className="text-xs text-[#5C4033] font-medium bg-[#FAF5EE] px-4 py-2 rounded-full border border-[#D5C9B7]">
                  Showing <span className="font-extrabold">{filteredTransactions.length}</span> of <span className="font-extrabold">{transactions.length}</span> records
                </div>
              </div>

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
                    {filteredTransactions.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-16 text-center">
                          <div className="max-w-xs mx-auto flex flex-col items-center">
                            <div className="w-16 h-16 bg-[#FAF5EE] rounded-full flex items-center justify-center mb-4 border border-[#EBE3D5]">
                              <svg className="w-8 h-8 text-amber-900/30" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                            </div>
                            <p className="font-extrabold text-[#5C4033] text-sm">No records found</p>
                            <p className="text-xs text-amber-900/50 mt-1 leading-relaxed">Adjust your operational filters or log a new disbursement to populate the ledger.</p>
                          </div>
                        </td>
                      </tr>
                    ) : (
                      filteredTransactions.map((tx) => {
                        const staff = staffList.find(s => s.id === tx.staff_id);
                        const prod = productList.find(p => p.id === tx.product_id);
                        return (
                          <tr key={tx.id} className="text-sm hover:bg-[#FAF9F6]/80 transition-colors duration-150 group">
                            <td className="py-4 px-6 text-xs text-amber-900/60 font-mono font-medium">{formatDisplayTimestamp(tx.timestamp, tx.created_at)}</td>
                            <td className="py-4 px-6 font-bold text-[#2C211A]">{staff ? staff.name : <span className="italic text-rose-500">Deleted Staff</span>}</td>
                            <td className="py-4 px-6">
                              <span className="inline-flex items-center px-3 py-1.5 rounded-lg bg-[#FAF5EE] border border-[#EBE3D5] text-[11px] font-bold text-[#5C4033] tracking-wide shadow-sm">
                                {prod ? prod.name : <span className="italic text-rose-500">Deleted Product</span>}
                              </span>
                            </td>
                            <td className="py-4 px-6 text-right font-semibold text-amber-900/70">₹{Number(tx.rate).toFixed(2)}</td>
                            <td className="py-4 px-6 text-right font-black text-[#2C211A] text-base">{tx.quantity} <span className="text-[10px] font-semibold text-amber-900/50 ml-0.5">nos</span></td>
                            <td className="py-4 px-6 text-right">
                              <div className="flex flex-col items-end">
                                <span className="text-[11px] text-amber-900/50 font-mono font-semibold tracking-wider">{Number(tx.rate)} × {Number(tx.quantity)}</span>
                                <span className="font-black text-[#5C4033] text-sm mt-0.5">₹{Number(tx.total).toLocaleString('en-IN')}</span>
                              </div>
                            </td>
                            <td className="py-4 px-6 text-right" data-exclude="true">
                              <button 
                                onClick={() => {
                                  setConfirmDialog({
                                    isOpen: true,
                                    message: 'Are you sure you want to delete this ledger entry? This action cannot be undone.',
                                    onConfirm: () => handleDeleteTransaction(tx.id)
                                  });
                                }} 
                                className="p-2 text-rose-300 hover:text-white hover:bg-rose-500 rounded-xl transition-all border border-transparent hover:border-rose-600 hover:shadow-md opacity-0 group-hover:opacity-100 focus:opacity-100" title="Delete Ledger Entry"
                              >
                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

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


      {/* --- EXPORT OPTIONS MODAL --- */}
      {isExportModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setIsExportModalOpen(false)} className="fixed inset-0 bg-[#2C211A]/40 backdrop-blur-md transition-opacity" />
          <div className="relative bg-white/95 backdrop-blur-2xl rounded-[32px] w-full max-w-md overflow-hidden border border-[#D5C9B7] shadow-2xl transition-all duration-300 animate-in zoom-in-95">
            <div className="px-6 py-5 border-b border-[#EBE3D5] flex justify-between items-center bg-gradient-to-r from-[#107C41]/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-[#107C41] rounded-xl text-white shadow-md shadow-[#107C41]/20">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-[#2C211A] text-base tracking-tight">Excel Compiler</h3>
                  <p className="text-xs font-semibold text-[#107C41]">Select layout structure</p>
                </div>
              </div>
              <button onClick={() => setIsExportModalOpen(false)} className="p-2 rounded-full text-amber-900/40 hover:bg-white hover:text-[#5C4033] hover:shadow-sm transition-all border border-transparent hover:border-[#D5C9B7]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-6 space-y-4 bg-[#FAF8F5]">
              <button onClick={() => generateExcelReport('minimal')} className="w-full text-left p-4 rounded-2xl bg-white border border-[#EBE3D5] hover:border-[#107C41] hover:shadow-md transition-all group flex items-start gap-4 active:scale-[0.98]">
                <div className="p-2.5 bg-[#FAF5EE] rounded-xl border border-[#EBE3D5] group-hover:bg-[#107C41]/10 group-hover:border-[#107C41]/30 transition-colors">
                  <svg className="w-5 h-5 text-[#5C4033] group-hover:text-[#107C41]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 10h16M4 14h16M4 18h16" /></svg>
                </div>
                <div>
                  <span className="block text-sm font-extrabold text-[#2C211A] group-hover:text-[#107C41] tracking-tight">Minimal Summary</span>
                  <span className="block text-[11px] font-medium text-amber-900/60 mt-1 leading-relaxed">Summary of overall totals per staff member.</span>
                </div>
              </button>

              <button onClick={() => generateExcelReport('detailed')} className="w-full text-left p-4 rounded-2xl bg-white border border-[#EBE3D5] hover:border-[#107C41] hover:shadow-md transition-all group flex items-start gap-4 active:scale-[0.98]">
                <div className="p-2.5 bg-[#FAF5EE] rounded-xl border border-[#EBE3D5] group-hover:bg-[#107C41]/10 group-hover:border-[#107C41]/30 transition-colors">
                  <svg className="w-5 h-5 text-[#5C4033] group-hover:text-[#107C41]" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" /></svg>
                </div>
                <div>
                  <span className="block text-sm font-extrabold text-[#2C211A] group-hover:text-[#107C41] tracking-tight">Detailed Ledger</span>
                  <span className="block text-[11px] font-medium text-amber-900/60 mt-1 leading-relaxed">Deep-dive structural layout grouped visually by staff utilizing embedded sub-totals.</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* --- CONFIRMATION DIALOG --- */}
      {confirmDialog && confirmDialog.isOpen && (
        <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setConfirmDialog(null)} className="fixed inset-0 bg-[#2C211A]/40 backdrop-blur-md transition-opacity" />
          <div className="relative bg-white/95 backdrop-blur-2xl rounded-[32px] w-full max-w-sm overflow-hidden border border-[#D5C9B7] shadow-2xl transition-all duration-300 animate-in zoom-in-95">
            <div className="px-6 py-5 border-b border-[#EBE3D5] flex justify-between items-center bg-gradient-to-r from-red-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-red-100 rounded-xl text-red-600 shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" /></svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-[#2C211A] text-base tracking-tight">Confirm Action</h3>
                  <p className="text-xs font-semibold text-red-500">Warning</p>
                </div>
              </div>
              <button onClick={() => setConfirmDialog(null)} className="p-2 rounded-full text-amber-900/40 hover:bg-white hover:text-[#5C4033] hover:shadow-sm transition-all border border-transparent hover:border-[#D5C9B7]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6 bg-[#FAF8F5]">
              <p className="text-[14px] text-amber-900/80 font-medium leading-relaxed">{confirmDialog.message}</p>
              
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setConfirmDialog(null)}
                  className="flex-1 px-4 py-3 rounded-2xl bg-white border border-[#D5C9B7] text-[#5C4033] font-bold text-sm hover:border-[#5C4033] hover:shadow-sm transition-all active:scale-[0.98]"
                >
                  Cancel
                </button>
                <button 
                  onClick={() => {
                    confirmDialog.onConfirm();
                    setConfirmDialog(null);
                  }}
                  className="flex-1 px-4 py-3 rounded-2xl text-white font-bold text-sm shadow-md transition-all active:scale-[0.98] hover:opacity-90"
                  style={{ backgroundColor: '#ef4444' }}
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* --- SUCCESS MESSAGE DIALOG --- */}
      {successMessage && (
        <div className="fixed inset-0 z-[100] overflow-y-auto flex items-center justify-center p-4">
          <div onClick={() => setSuccessMessage(null)} className="fixed inset-0 bg-[#2C211A]/40 backdrop-blur-md transition-opacity" />
          <div className="relative bg-white/95 backdrop-blur-2xl rounded-[32px] w-full max-w-sm overflow-hidden border border-[#D5C9B7] shadow-2xl transition-all duration-300 animate-in zoom-in-95">
            <div className="px-6 py-5 border-b border-[#EBE3D5] flex justify-between items-center bg-gradient-to-r from-emerald-500/10 to-transparent">
              <div className="flex items-center gap-3">
                <div className="p-2.5 bg-emerald-100 rounded-xl text-emerald-600 shadow-sm">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                </div>
                <div>
                  <h3 className="font-extrabold text-[#2C211A] text-base tracking-tight">Success</h3>
                  <p className="text-xs font-semibold text-emerald-600">Action Completed</p>
                </div>
              </div>
              <button onClick={() => setSuccessMessage(null)} className="p-2 rounded-full text-amber-900/40 hover:bg-white hover:text-[#5C4033] hover:shadow-sm transition-all border border-transparent hover:border-[#D5C9B7]">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>
            
            <div className="p-6 space-y-6 bg-[#FAF8F5]">
              <p className="text-[14px] text-amber-900/80 font-medium leading-relaxed">{successMessage}</p>
              
              <div className="flex pt-2">
                <button 
                  onClick={() => setSuccessMessage(null)}
                  className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md transition-all active:scale-[0.98]"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" /></svg>
                  Okay
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
