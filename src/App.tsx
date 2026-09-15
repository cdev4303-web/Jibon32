import React, { useState, useEffect } from 'react';
import { Shop, Invoice, CatalogItem, TailorRecord, Expense, Language, Payment } from './types';
import {
  loadShop,
  saveShop,
  loadInvoices,
  saveInvoices,
  loadCatalogItems,
  saveCatalogItems,
  loadTailorRecords,
  saveTailorRecords,
  loadExpenses,
  saveExpenses,
  exportFullBackupJson,
  importFullBackupJson,
  getStoredAdminPin,
  saveStoredAdminPin,
  getStoredPinProtectionEnabled,
  saveStoredPinProtectionEnabled,
  getStoredIsAdminLoggedIn,
  saveStoredIsAdminLoggedIn,
  getStoredLanguage,
  saveStoredLanguage,
} from './utils/storage';
import { strings } from './utils/strings';
import { Logo } from './components/Logo';
import { getHeaderTitleStyle } from './utils/headerStyle';
import { AdminLoginScreen } from './components/AdminLoginScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { OrderFormScreen } from './components/OrderFormScreen';
import { InvoiceDetailScreen } from './components/InvoiceDetailScreen';
import { CatalogScreen } from './components/CatalogScreen';
import { TailorTrackingScreen } from './components/TailorTrackingScreen';
import { ExpenseScreen } from './components/ExpenseScreen';
import { SettingsScreen } from './components/SettingsScreen';
import { CustomersScreen } from './components/CustomersScreen';
import { MeasurementsScreen } from './components/MeasurementsScreen';
import { DailyAccountsScreen } from './components/DailyAccountsScreen';
import { ReportsScreen } from './components/ReportsScreen';
import { AiBusinessManagerScreen } from './components/AiBusinessManagerScreen';
import { SidebarDrawer } from './components/SidebarDrawer';
import { LanguageSelectorModal } from './components/LanguageSelectorModal';
import { PrintInvoiceModal } from './components/PrintInvoiceModal';
import { AddPaymentModal } from './components/AddPaymentModal';
import { ConfirmDeleteModal } from './components/ConfirmDeleteModal';
import { VisualGuideModal } from './components/VisualGuideModal';
import { InstallGuideModal } from './components/InstallGuideModal';
import { ErrorBoundary } from './components/ErrorBoundary';
import {
  LayoutDashboard,
  PlusCircle,
  ShoppingBag,
  Users,
  Receipt,
  Settings,
  Globe,
  Bell,
  Lock,
  ShieldCheck,
  FolderTree,
  Smartphone,
  Menu,
  Ruler,
  DollarSign,
  Scissors,
  BarChart3,
  Sparkles,
} from 'lucide-react';

export function App() {
  // State
  const [shop, setShop] = useState<Shop>(loadShop);
  const [invoices, setInvoices] = useState<Invoice[]>(loadInvoices);
  const [catalogItems, setCatalogItems] = useState<CatalogItem[]>(loadCatalogItems);
  const [tailorRecords, setTailorRecords] = useState<TailorRecord[]>(loadTailorRecords);
  const [expenses, setExpenses] = useState<Expense[]>(loadExpenses);
  const [lang, setLang] = useState<Language>(getStoredLanguage);
  const [isLangModalOpen, setIsLangModalOpen] = useState<boolean>(false);

  // Admin Security State
  const [adminPin, setAdminPin] = useState<string>(getStoredAdminPin);
  const [pinProtectionEnabled, setPinProtectionEnabled] = useState<boolean>(getStoredPinProtectionEnabled);
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(getStoredIsAdminLoggedIn);

  // Navigation: 'dashboard' | 'new-order' | 'edit-order' | 'invoice-detail' | 'catalog' | 'tailor' | 'expense' | 'settings'
  const [currentTab, setCurrentTab] = useState<string>('dashboard');
  const [selectedInvoiceId, setSelectedInvoiceId] = useState<string | null>(null);
  const [invoiceToEdit, setInvoiceToEdit] = useState<Invoice | null>(null);
  const [orderInitialInvoice, setOrderInitialInvoice] = useState<Invoice | null>(null);
  const [orderInitialCatalogItem, setOrderInitialCatalogItem] = useState<CatalogItem | null>(null);

  // Modals & Drawers
  const [isSidebarOpen, setIsSidebarOpen] = useState<boolean>(false);
  const [printModalInvoice, setPrintModalInvoice] = useState<Invoice | null>(null);
  const [paymentModalInvoice, setPaymentModalInvoice] = useState<Invoice | null>(null);
  const [deleteModalInvoice, setDeleteModalInvoice] = useState<Invoice | null>(null);
  const [isVisualGuideOpen, setIsVisualGuideOpen] = useState<boolean>(false);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);

  // Toast / Banner alert
  const [notification, setNotification] = useState<{ message: string; type: 'success' | 'info' | 'error' } | null>(null);

  const showNotification = (message: string, type: 'success' | 'info' | 'error' = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 3500);
  };

  // Sync state changes to storage
  useEffect(() => {
    saveShop(shop);
  }, [shop]);

  useEffect(() => {
    saveInvoices(invoices);
  }, [invoices]);

  useEffect(() => {
    saveCatalogItems(catalogItems);
  }, [catalogItems]);

  useEffect(() => {
    saveTailorRecords(tailorRecords);
  }, [tailorRecords]);

  useEffect(() => {
    saveExpenses(expenses);
  }, [expenses]);

  useEffect(() => {
    saveStoredLanguage(lang);
    document.documentElement.dir = lang === 'AR' ? 'rtl' : 'ltr';
    document.documentElement.lang = lang.toLowerCase();
  }, [lang]);

  const t = strings[lang] || strings.BN;

  // Invoice Handlers
  const handleSaveInvoice = (savedInvoice: Invoice) => {
    const exists = invoices.some((i) => i.id === savedInvoice.id);
    let updated: Invoice[];
    if (exists) {
      updated = invoices.map((i) => (i.id === savedInvoice.id ? savedInvoice : i));
      showNotification(lang === 'EN' ? `Invoice #${savedInvoice.id} updated successfully!` : `ইনভয়েস #${savedInvoice.id} সফলভাবে আপডেট হয়েছে!`);
    } else {
      updated = [savedInvoice, ...invoices];
      showNotification(lang === 'EN' ? `New invoice #${savedInvoice.id} created successfully!` : `নতুন ইনভয়েস #${savedInvoice.id} সফলভাবে তৈরি হয়েছে!`);
    }
    setInvoices(updated);
    setSelectedInvoiceId(savedInvoice.id);
    setInvoiceToEdit(null);
    setOrderInitialCatalogItem(null);
    setCurrentTab('invoice-detail');
  };

  const handleDeleteInvoice = (inv: Invoice) => {
    setDeleteModalInvoice(inv);
  };

  const confirmDeleteInvoice = () => {
    if (deleteModalInvoice) {
      const updated = invoices.filter((i) => i.id !== deleteModalInvoice.id);
      setInvoices(updated);
      showNotification(lang === 'EN' ? `Invoice #${deleteModalInvoice.id} deleted!` : `ইনভয়েস #${deleteModalInvoice.id} মুছে ফেলা হয়েছে!`, 'info');
      setDeleteModalInvoice(null);
      if (currentTab === 'invoice-detail') {
        setCurrentTab('dashboard');
      }
    }
  };

  const handleUpdateStatus = (invoiceId: string, newStatus: Invoice['orderStatus']) => {
    const updated = invoices.map((inv) => {
      if (inv.id === invoiceId) {
        return {
          ...inv,
          orderStatus: newStatus,
          updatedAt: Date.now(),
        };
      }
      return inv;
    });
    setInvoices(updated);
    if (newStatus === 'Ready for Pickup') {
      showNotification(lang === 'EN' ? 'Dress is ready! Send ready notification on WhatsApp.' : `পোশাক রেডি! কাস্টমারকে WhatsApp-এ প্রস্তুত থাকার বার্তা পাঠান।`, 'success');
    } else {
      showNotification(lang === 'EN' ? `Status updated to: ${newStatus}` : `স্ট্যাটাস পরিবর্তন করা হয়েছে: ${newStatus}`);
    }
  };

  const handleAddPayment = (invoiceId: string, amount: number, paymentMethod: string, bankRef?: string, notes?: string) => {
    const updated = invoices.map((inv) => {
      if (inv.id === invoiceId) {
        const newDeposit = inv.advanceDeposit + amount;
        const newDue = Math.max(0, inv.netTotal - newDeposit);
        const newPayment: Payment = {
          id: `pay-${Date.now()}`,
          invoiceId: inv.id,
          customerPhone: inv.customerPhone,
          amount,
          paymentDate: new Date().toISOString().split('T')[0],
          paymentMethod: paymentMethod === 'Bank' ? 'Bank' : 'Cash',
          bankReference: bankRef,
          notes,
          createdAt: Date.now(),
        };
        return {
          ...inv,
          advanceDeposit: newDeposit,
          remainingDue: newDue,
          payments: [...(inv.payments || []), newPayment],
          updatedAt: Date.now(),
        };
      }
      return inv;
    });
    setInvoices(updated);
    setPaymentModalInvoice(null);
    showNotification(lang === 'EN' ? `Payment recorded successfully: ${shop.currency} ${amount.toFixed(2)}` : `পেমেন্ট সফলভাবে জমা হয়েছে: ${shop.currency} ${amount.toFixed(2)}`);
  };

  // Catalog Handlers
  const handleAddOrderFromCatalog = (item: CatalogItem) => {
    setOrderInitialCatalogItem(item);
    setInvoiceToEdit(null);
    setCurrentTab('new-order');
  };

  const handleSaveCatalogItem = (item: CatalogItem) => {
    const exists = catalogItems.some((c) => c.id === item.id);
    let updated: CatalogItem[];
    if (exists) {
      updated = catalogItems.map((c) => (c.id === item.id ? item : c));
      showNotification(lang === 'EN' ? 'Catalog item updated!' : 'ক্যাটালগ ডিজাইন আপডেট করা হয়েছে!');
    } else {
      updated = [item, ...catalogItems];
      showNotification(lang === 'EN' ? 'New catalog item added!' : 'নতুন ক্যাটালগ ডিজাইন যুক্ত করা হয়েছে!');
    }
    setCatalogItems(updated);
  };

  const handleDeleteCatalogItem = (item: CatalogItem) => {
    if (window.confirm(lang === 'EN' ? `Are you sure you want to delete "${item.name}"?` : `আপনি কি "${item.name}" ডিজাইনটি মুছে ফেলতে চান?`)) {
      setCatalogItems(catalogItems.filter((c) => c.id !== item.id));
      showNotification(lang === 'EN' ? 'Design deleted' : 'ডিজাইন মুছে ফেলা হয়েছে', 'info');
    }
  };

  // Tailor Record Handlers
  const handleSaveTailorRecord = (rec: TailorRecord) => {
    const exists = tailorRecords.some((r) => r.id === rec.id);
    let updated: TailorRecord[];
    if (exists) {
      updated = tailorRecords.map((r) => (r.id === rec.id ? rec : r));
    } else {
      updated = [rec, ...tailorRecords];
    }
    setTailorRecords(updated);
    showNotification(lang === 'EN' ? 'Tailor record saved!' : 'কারিগর রেকর্ড সংরক্ষিত হয়েছে!');
  };

  const handleDeleteTailorRecord = (rec: TailorRecord) => {
    setTailorRecords(tailorRecords.filter((r) => r.id !== rec.id));
    showNotification(lang === 'EN' ? 'Tailor record deleted' : 'কারিগর রেকর্ড মুছে ফেলা হয়েছে', 'info');
  };

  // Expense Handlers
  const handleSaveExpense = (exp: Expense) => {
    const exists = expenses.some((e) => e.id === exp.id);
    let updated: Expense[];
    if (exists) {
      updated = expenses.map((e) => (e.id === exp.id ? exp : e));
    } else {
      updated = [exp, ...expenses];
    }
    setExpenses(updated);
    showNotification(lang === 'EN' ? 'Expense entry saved!' : 'খরচ হিসাব সংরক্ষিত হয়েছে!');
  };

  const handleDeleteExpense = (exp: Expense) => {
    setExpenses(expenses.filter((e) => e.id !== exp.id));
    showNotification(lang === 'EN' ? 'Expense entry deleted' : 'খরচ এন্ট্রি মুছে ফেলা হয়েছে', 'info');
  };

  // Backup Export with Notification Notice
  const handleExportBackup = async () => {
    try {
      showNotification(
        lang === 'EN' ? 'Preparing backup file...' : 'ব্যাকআপ ফাইল প্রস্তুত করা হচ্ছে...',
        'info'
      );
      const result = await exportFullBackupJson();
      if (result && result.success) {
        showNotification(
          lang === 'EN'
            ? `Backup file "${result.filename}" exported & saved successfully!`
            : `ব্যাকআপ ফাইল "${result.filename}" সফলভাবে ডাউনলোড ও সংরক্ষিত হয়েছে!`,
          'success'
        );
      }
    } catch (err: any) {
      showNotification(
        lang === 'EN'
          ? `Backup failed: ${err?.message || err}`
          : `ব্যাকআপ তৈরিতে সমস্যা হয়েছে: ${err?.message || err}`,
        'error'
      );
    }
  };

  // Backup Import
  const handleImportBackup = (file: File) => {
    importFullBackupJson(
      file,
      (data) => {
        if (data.shop) setShop(data.shop);
        if (data.invoices) setInvoices(data.invoices);
        if (data.catalogItems) setCatalogItems(data.catalogItems);
        if (data.tailorRecords) setTailorRecords(data.tailorRecords);
        if (data.expenses) setExpenses(data.expenses);
        showNotification(lang === 'EN' ? 'Backup file restored successfully!' : 'ব্যাকআপ ফাইল সফলভাবে রিস্টোর হয়েছে!');
      },
      (err) => {
        showNotification(lang === 'EN' ? `Restore failed: ${err}` : `রিস্টোর ব্যর্থ হয়েছে: ${err}`, 'error');
      }
    );
  };

  const activeInvoice = invoices.find((i) => i.id === selectedInvoiceId) || null;

  // Desktop Keyboard Shortcuts (Requirement 15: Enter, Esc, Ctrl+P, Ctrl+F)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 1. Esc: Close active modal or drawer
      if (e.key === 'Escape') {
        if (printModalInvoice) {
          setPrintModalInvoice(null);
          return;
        }
        if (paymentModalInvoice) {
          setPaymentModalInvoice(null);
          return;
        }
        if (deleteModalInvoice) {
          setDeleteModalInvoice(null);
          return;
        }
        if (isSidebarOpen) {
          setIsSidebarOpen(false);
          return;
        }
        if (isLangModalOpen) {
          setIsLangModalOpen(false);
          return;
        }
        if (isVisualGuideOpen) {
          setIsVisualGuideOpen(false);
          return;
        }
        if (isInstallModalOpen) {
          setIsInstallModalOpen(false);
          return;
        }
      }

      // 2. Ctrl/Cmd + P: Print invoice directly
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'p') {
        if (printModalInvoice) {
          e.preventDefault();
          window.print();
        } else if (currentTab === 'invoice-detail' && activeInvoice) {
          e.preventDefault();
          setPrintModalInvoice(activeInvoice);
          setTimeout(() => {
            window.print();
          }, 150);
        }
      }

      // 3. Ctrl/Cmd + F: Search input focus
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'f') {
        const searchInput = document.querySelector<HTMLInputElement>(
          'input[type="text"][placeholder*="Search"], input[type="text"][placeholder*="খুঁজুন"], input[type="search"]'
        );
        if (searchInput) {
          e.preventDefault();
          searchInput.focus();
          searchInput.select();
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [
    printModalInvoice,
    paymentModalInvoice,
    deleteModalInvoice,
    isSidebarOpen,
    isLangModalOpen,
    isVisualGuideOpen,
    isInstallModalOpen,
    currentTab,
    activeInvoice,
  ]);

  // Hook for browser native Print / Ctrl+P triggered from browser menu
  useEffect(() => {
    const handleBeforePrint = () => {
      if (!printModalInvoice && currentTab === 'invoice-detail' && activeInvoice) {
        setPrintModalInvoice(activeInvoice);
      }
    };
    window.addEventListener('beforeprint', handleBeforePrint);
    return () => window.removeEventListener('beforeprint', handleBeforePrint);
  }, [printModalInvoice, currentTab, activeInvoice]);

  // Sidebar navigation menu list for desktop layout (Requirement 2)
  const desktopNavItems = [
    {
      id: 'dashboard',
      label: lang === 'BN' ? 'ড্যাশবোর্ড' : 'Dashboard',
      icon: LayoutDashboard,
    },
    {
      id: 'customers',
      label: lang === 'BN' ? 'কাস্টমার তালিকা' : 'Customers',
      icon: Users,
    },
    {
      id: 'new-order',
      label: lang === 'BN' ? 'নতুন ইনভয়েস তৈরি' : 'Create Invoice',
      icon: PlusCircle,
      highlight: true,
    },
    {
      id: 'measurements',
      label: lang === 'BN' ? 'পরিমাপের খাতা' : 'Measurement Book',
      icon: Ruler,
    },
    {
      id: 'tailor',
      label: lang === 'BN' ? 'কারিগর খাতা' : 'Tailor/Karigar Ledger',
      icon: Scissors,
    },
    {
      id: 'expense',
      label: lang === 'BN' ? 'দোকানের খরচ' : 'Shop Expenses',
      icon: Receipt,
    },
    {
      id: 'daily-accounts',
      label: lang === 'BN' ? 'ক্যাশ জমা / হিসাব' : 'Cash Deposit',
      icon: DollarSign,
    },
    {
      id: 'reports',
      label: lang === 'BN' ? 'রিপোর্ট ও অ্যানালিটিক্স' : 'Reports',
      icon: BarChart3,
    },
    {
      id: 'catalog',
      label: lang === 'BN' ? 'পোশাক ক্যাটালগ' : 'Catalog',
      icon: ShoppingBag,
    },
    {
      id: 'ai-business-manager',
      label: lang === 'BN' ? 'AI বিজনেস ম্যানেজার ✨' : 'AI Business Manager ✨',
      icon: Sparkles,
      isAi: true,
    },
    {
      id: 'settings',
      label: lang === 'BN' ? 'দোকানের সেটিংস' : 'Settings',
      icon: Settings,
    },
  ];

  const getTabTitle = (tab: string) => {
    switch (tab) {
      case 'dashboard':
        return lang === 'BN' ? 'ড্যাশবোর্ড ওভারভিউ' : 'Dashboard Overview';
      case 'customers':
        return lang === 'BN' ? 'কাস্টমার ডিরেক্টরি ও হিস্টোরি' : 'Customer Directory & History';
      case 'new-order':
        return invoiceToEdit
          ? lang === 'BN'
            ? 'ইনভয়েস এডিট করুন'
            : 'Edit Invoice'
          : lang === 'BN'
          ? 'নতুন ইনভয়েস ও মেজারমেন্ট'
          : 'New Invoice & Measurements';
      case 'invoice-detail':
        return lang === 'BN' ? 'ইনভয়েস বিস্তারিত রসিদ' : 'Invoice Details';
      case 'measurements':
        return lang === 'BN' ? 'পরিমাপের খাতা (মেজারমেন্ট বুক)' : 'Measurement Book';
      case 'tailor':
        return lang === 'BN' ? 'কারিগর ট্র্যাকিং ও লেজার খাতা' : 'Tailor & Karigar Ledger';
      case 'expense':
        return lang === 'BN' ? 'দোকানের দৈনিক খরচ' : 'Shop Expenses';
      case 'daily-accounts':
        return lang === 'BN' ? 'দৈনিক ক্যাশ হিসাব ও ব্যাংক জমা' : 'Daily Cash Accounts';
      case 'reports':
        return lang === 'BN' ? 'ব্যবসার রিপোর্ট ও বিশ্লেষণ' : 'Business Reports & Analytics';
      case 'catalog':
        return lang === 'BN' ? 'পোশাকের ক্যাটালগ ও রেট' : 'Dress Catalog & Pricing';
      case 'ai-business-manager':
        return lang === 'BN' ? 'স্মার্ট AI বিজনেস ম্যানেজার' : 'AI Business Assistant';
      case 'settings':
        return lang === 'BN' ? 'সিস্টেম ও দোকানের সেটিংস' : 'Shop & System Settings';
      default:
        return shop.name;
    }
  };

  // If PIN protection is enabled and user is not logged in, show Admin Login Screen
  if (pinProtectionEnabled && !isAdminLoggedIn) {
    return (
      <AdminLoginScreen
        shop={shop}
        lang={lang}
        adminPin={adminPin}
        onLoginSuccess={(remember) => {
          setIsAdminLoggedIn(true);
          if (remember) {
            saveStoredIsAdminLoggedIn(true);
          }
          showNotification(lang === 'EN' ? 'Welcome to Admin Panel!' : 'এডমিন প্যানেলে স্বাগতম!', 'success');
        }}
        onResetAdminPin={() => {
          setAdminPin('1234');
          saveStoredAdminPin('1234');
          showNotification(lang === 'EN' ? 'Admin PIN reset successfully!' : 'এডমিন পিন সফলভাবে রিস্টোর হয়েছে!', 'info');
        }}
        onToggleLang={() => setLang(lang === 'BN' ? 'EN' : 'BN')}
        onChangeLang={(l) => setLang(l)}
      />
    );
  }

  return (
    <div
      className={`min-h-screen bg-slate-100 text-slate-900 font-sans antialiased selection:bg-emerald-200 flex flex-col lg:flex-row ${
        printModalInvoice ? 'has-active-print-modal' : ''
      }`}
    >
      {/* ==================================================
          1. PERMANENT DESKTOP LEFT SIDEBAR (>= 1024px)
          Requirement 2: Stays visible on desktop, print:hidden
         ================================================== */}
      <aside className="hidden lg:flex flex-col w-64 xl:w-72 bg-white border-r border-slate-200 shrink-0 sticky top-0 h-screen z-30 shadow-xs print:hidden">
        {/* Sidebar Header: Logo & Shop Branding */}
        <div
          onClick={() => setCurrentTab('dashboard')}
          className="p-5 border-b border-slate-100 flex items-center gap-3 cursor-pointer hover:bg-slate-50 transition"
        >
          <Logo size="md" />
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-1.5">
              <span
                style={getHeaderTitleStyle(shop.headerStyle)}
                className="text-base font-black tracking-tight truncate max-w-[140px] xl:max-w-[170px]"
                title={shop.name}
              >
                {shop.name}
              </span>
              <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9.5px] font-black text-emerald-800 shrink-0">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-slate-500 font-semibold truncate mt-0.5">
              {shop.tagline || t.appSubTitle}
            </p>
          </div>
        </div>

        {/* Navigation Menu (Scrollable) */}
        <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-1 scrollbar-thin scrollbar-thumb-slate-200">
          {desktopNavItems.map((item) => {
            const Icon = item.icon;
            const isActive = currentTab === item.id;

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (item.id === 'new-order') {
                    setInvoiceToEdit(null);
                    setOrderInitialInvoice(null);
                    setOrderInitialCatalogItem(null);
                  }
                  setCurrentTab(item.id);
                }}
                className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold transition ${
                  isActive
                    ? 'bg-emerald-900 text-white shadow-xs'
                    : item.highlight
                    ? 'bg-amber-50 text-amber-950 border border-amber-300 hover:bg-amber-100 font-extrabold'
                    : item.isAi
                    ? 'bg-emerald-50/70 text-emerald-950 border border-emerald-200/80 hover:bg-emerald-100 font-extrabold'
                    : 'text-slate-700 hover:bg-slate-100 hover:text-slate-950'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <Icon
                    className={`h-4 w-4 shrink-0 ${
                      isActive
                        ? 'text-emerald-300'
                        : item.highlight
                        ? 'text-amber-600'
                        : item.isAi
                        ? 'text-emerald-700 animate-pulse'
                        : 'text-slate-500'
                    }`}
                  />
                  <span className="truncate">{item.label}</span>
                </div>
                {item.highlight && !isActive && (
                  <span className="text-[10px] bg-amber-200 text-amber-950 font-black px-1.5 py-0.5 rounded-md">
                    +
                  </span>
                )}
                {item.isAi && !isActive && (
                  <span className="text-[10px] bg-emerald-200 text-emerald-950 font-black px-1.5 py-0.5 rounded-md">
                    AI
                  </span>
                )}
              </button>
            );
          })}
        </nav>

        {/* Sidebar Footer: Quick Controls & Status */}
        <div className="p-3 border-t border-slate-100 bg-slate-50/60 space-y-2 text-xs">
          <div className="flex items-center justify-between gap-1">
            <button
              onClick={() => setIsLangModalOpen(true)}
              className="flex-1 flex items-center justify-center gap-1.5 rounded-lg border border-slate-300 bg-white py-1.5 text-[11px] font-bold text-slate-800 hover:bg-slate-100 transition shadow-2xs"
              title="Change Language"
            >
              <Globe className="h-3.5 w-3.5 text-emerald-700" />
              <span>{lang === 'BN' ? 'বাংলা' : lang === 'HI' ? 'हिन्दी' : lang === 'AR' ? 'العربية' : 'ENG'}</span>
            </button>
            <button
              onClick={() => {
                setIsAdminLoggedIn(false);
                saveStoredIsAdminLoggedIn(false);
                showNotification(lang === 'EN' ? 'Admin panel locked!' : 'এডমিন প্যানেল লক করা হয়েছে!', 'info');
              }}
              className="flex items-center justify-center gap-1 rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-[11px] font-bold text-rose-700 hover:bg-rose-50 transition shadow-2xs"
              title={lang === 'BN' ? 'অ্যাপ লক করুন' : 'Lock Application'}
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{lang === 'BN' ? 'লক' : 'Lock'}</span>
            </button>
          </div>

          <div className="flex items-center justify-between text-[11px] text-slate-500 font-medium px-1">
            <span>{lang === 'EN' ? 'Currency:' : 'কারেন্সি:'} <strong className="text-slate-800">{shop.currency}</strong></span>
            <span className="text-[10px] bg-slate-200 px-1.5 py-0.2 rounded font-mono">v3.5 PRO</span>
          </div>
        </div>
      </aside>

      {/* ==================================================
          2. RIGHT MAIN CONTENT AREA (Responsive)
          Requirement 2: Uses remaining screen width, no overflow
         ================================================== */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen bg-slate-100">
        {/* Mobile/Tablet Header (< 1024px) */}
        <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur-md shadow-xs lg:hidden print:hidden">
          <div className="flex items-center justify-between px-3 py-2.5 sm:px-6">
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Hamburger Button for Mobile Drawer */}
              <button
                onClick={() => setIsSidebarOpen(true)}
                className="flex items-center justify-center rounded-2xl p-2 text-slate-800 hover:bg-emerald-50 hover:text-emerald-900 border border-slate-200 transition active:scale-95 shadow-2xs"
                title="Open Navigation Menu"
                aria-label="Open navigation menu"
              >
                <Menu className="h-5 w-5 text-emerald-950" />
              </button>

              <div
                onClick={() => setCurrentTab('dashboard')}
                className="flex cursor-pointer items-center gap-2 sm:gap-2.5"
              >
                <Logo size="sm" />
                <div>
                  <div className="flex items-center gap-1.5">
                    <span
                      style={getHeaderTitleStyle(shop.headerStyle)}
                      className="text-sm sm:text-base font-black tracking-tight truncate max-w-[150px] sm:max-w-none"
                    >
                      {shop.name}
                    </span>
                    <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[9px] font-bold text-emerald-800">
                      ADMIN
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Mobile Header: Minimal Action Buttons (Clean & Clutter-Free) */}
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  setIsAdminLoggedIn(false);
                  saveStoredIsAdminLoggedIn(false);
                  showNotification(lang === 'EN' ? 'Admin panel locked!' : 'এডমিন প্যানেল লক করা হয়েছে!', 'info');
                }}
                className="flex items-center gap-1 rounded-xl border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-rose-50 hover:text-rose-700 transition shadow-2xs"
                title={lang === 'BN' ? 'লক করুন' : 'Lock'}
              >
                <Lock className="h-3.5 w-3.5 text-amber-600" />
                <span className="text-[11px] font-bold">{lang === 'BN' ? 'লক' : 'Lock'}</span>
              </button>
            </div>
          </div>
        </header>

        {/* Desktop Top Bar (>= 1024px) */}
        <header className="hidden lg:flex items-center justify-between px-6 py-3.5 bg-white border-b border-slate-200 sticky top-0 z-20 print:hidden">
          <div className="flex items-center gap-3">
            <h1 className="text-base font-black text-slate-900 tracking-tight flex items-center gap-2">
              <span className="text-slate-400 font-semibold">{shop.name} /</span>
              <span>{getTabTitle(currentTab)}</span>
            </h1>
            <span className="text-[11px] text-slate-400 hidden xl:inline font-medium">
              (Esc: Close | Ctrl+P: Print)
            </span>
          </div>

          <div className="flex items-center gap-2.5">
            {currentTab !== 'new-order' && (
              <button
                onClick={() => {
                  setInvoiceToEdit(null);
                  setOrderInitialInvoice(null);
                  setOrderInitialCatalogItem(null);
                  setCurrentTab('new-order');
                }}
                className="flex items-center gap-1.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3.5 py-1.5 text-xs transition shadow-xs active:scale-95"
              >
                <PlusCircle className="h-4 w-4 text-slate-950" />
                <span>{t.newOrder}</span>
              </button>
            )}

            {currentTab !== 'ai-business-manager' && (
              <button
                onClick={() => setCurrentTab('ai-business-manager')}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-950 font-black px-3 py-1.5 text-xs transition shadow-xs active:scale-95"
              >
                <Sparkles className="h-3.5 w-3.5 text-emerald-600 animate-pulse" />
                <span>AI Manager ✨</span>
              </button>
            )}

            <button
              onClick={() => setIsLangModalOpen(true)}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-slate-800 hover:bg-slate-100 transition shadow-2xs"
            >
              <Globe className="h-3.5 w-3.5 text-emerald-700" />
              <span className="font-extrabold">{lang === 'BN' ? 'বাংলা' : 'English'}</span>
            </button>

            <button
              onClick={() => {
                setIsAdminLoggedIn(false);
                saveStoredIsAdminLoggedIn(false);
                showNotification(lang === 'EN' ? 'Admin panel locked!' : 'এডমিন প্যানেল লক করা হয়েছে!', 'info');
              }}
              className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50 transition shadow-2xs"
              title="Lock Admin Panel"
            >
              <Lock className="h-3.5 w-3.5" />
              <span>{lang === 'BN' ? 'লক' : 'Lock'}</span>
            </button>
          </div>
        </header>

        {/* Toast Notification Banner */}
        {notification && (
          <div className="fixed top-16 right-4 z-50 animate-bounce print:hidden">
            <div
              className={`rounded-2xl px-4 py-3 text-xs font-bold shadow-xl border flex items-center gap-2 ${
                notification.type === 'error'
                  ? 'bg-rose-900 text-white border-rose-700'
                  : notification.type === 'info'
                  ? 'bg-slate-900 text-white border-slate-700'
                  : 'bg-emerald-900 text-white border-emerald-700'
              }`}
            >
              <Bell className="h-4 w-4 text-amber-300" />
              {notification.message}
            </div>
          </div>
        )}

        {/* Main Screen Container */}
        <main className={`flex-1 w-full px-3 py-4 sm:px-6 sm:py-6 lg:px-8 max-w-[1600px] mx-auto min-w-0 pb-24 lg:pb-8 ${printModalInvoice ? 'print:hidden' : ''}`}>
        {currentTab === 'dashboard' && (
          <DashboardScreen
            shop={shop}
            invoices={invoices}
            catalogItems={catalogItems}
            tailorRecords={tailorRecords}
            expenses={expenses}
            lang={lang}
            onNavigateToAiManager={() => setCurrentTab('ai-business-manager')}
            onNavigateToNewOrder={() => {
              setInvoiceToEdit(null);
              setOrderInitialCatalogItem(null);
              setCurrentTab('new-order');
            }}
            onNavigateToSettings={() => setCurrentTab('settings')}
            onNavigateToInvoiceDetail={(id) => {
              setSelectedInvoiceId(id);
              setCurrentTab('invoice-detail');
            }}
            onNavigateToEditInvoice={(inv) => {
              setInvoiceToEdit(inv);
              setCurrentTab('new-order');
            }}
            onEditInvoice={(inv) => {
              setInvoiceToEdit(inv);
              setCurrentTab('new-order');
            }}
            onOpenPaymentModal={(inv) => setPaymentModalInvoice(inv)}
            onOpenPrintModal={(inv) => setPrintModalInvoice(inv)}
            onDeleteInvoice={handleDeleteInvoice}
            onOpenVisualGuide={() => setIsVisualGuideOpen(true)}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
            onUpdateStatus={handleUpdateStatus}
            onSaveInvoice={handleSaveInvoice}
            onNavigateToNewOrderWithDraft={(draftInvoice) => {
              setInvoiceToEdit(null);
              setOrderInitialCatalogItem(null);
              setOrderInitialInvoice(draftInvoice);
              setCurrentTab('new-order');
            }}
            onShowNotification={showNotification}
          />
        )}

        {currentTab === 'ai-business-manager' && (
          <ErrorBoundary
            fallbackTitle={lang === 'BN' ? 'AI বিজনেস ম্যানেজার লোড হতে সমস্যা হয়েছে' : 'Failed to load AI Business Manager'}
            onReset={() => setCurrentTab('dashboard')}
          >
            <AiBusinessManagerScreen
              shop={shop}
              invoices={invoices}
              expenses={expenses}
              tailorRecords={tailorRecords}
              lang={lang}
              onNavigateToInvoiceDetail={(id) => {
                setSelectedInvoiceId(id);
                setCurrentTab('invoice-detail');
              }}
              onNavigateToNewOrderWithCustomer={(name, phone, address) => {
                const today = new Date().toISOString().split('T')[0];
                const delivery = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
                const newTemplate: Invoice = {
                  id: `JT-${Math.floor(1000 + Math.random() * 9000)}`,
                  shopId: shop.id,
                  customerName: name,
                  customerPhone: phone,
                  customerAddress: address || '',
                  orderDate: today,
                  deliveryDate: delivery,
                  dressType: 'Abaya',
                  orderStatus: 'Pending',
                  subtotal: 0,
                  discount: 0,
                  netTotal: 0,
                  advanceDeposit: 0,
                  remainingDue: 0,
                  paymentMethod: 'Cash',
                  items: [],
                  payments: [],
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                };
                setInvoiceToEdit(null);
                setOrderInitialCatalogItem(null);
                setOrderInitialInvoice(newTemplate);
                setCurrentTab('new-order');
              }}
              onNavigateToNewOrderWithInvoiceDraft={(draftInvoice) => {
                setInvoiceToEdit(null);
                setOrderInitialCatalogItem(null);
                setOrderInitialInvoice(draftInvoice);
                setCurrentTab('new-order');
              }}
              onNavigateToCustomers={() => setCurrentTab('customers')}
              onNavigateToMeasurements={() => setCurrentTab('measurements')}
              onNavigateToTailor={() => setCurrentTab('tailor')}
              onNavigateToExpenses={() => setCurrentTab('expense')}
            />
          </ErrorBoundary>
        )}

        {currentTab === 'new-order' && (
          <OrderFormScreen
            shop={shop}
            lang={lang}
            editingInvoice={invoiceToEdit}
            initialInvoice={orderInitialInvoice}
            initialCatalogItem={orderInitialCatalogItem}
            onSaveInvoice={handleSaveInvoice}
            onCancel={() => {
              setInvoiceToEdit(null);
              setOrderInitialInvoice(null);
              setOrderInitialCatalogItem(null);
              setCurrentTab('dashboard');
            }}
          />
        )}

        {currentTab === 'invoice-detail' && (
          <InvoiceDetailScreen
            invoice={activeInvoice}
            shop={shop}
            lang={lang}
            onBack={() => setCurrentTab('dashboard')}
            onEdit={(inv) => {
              setInvoiceToEdit(inv);
              setOrderInitialInvoice(null);
              setOrderInitialCatalogItem(null);
              setCurrentTab('new-order');
            }}
            onDelete={handleDeleteInvoice}
            onOpenPaymentModal={(inv) => setPaymentModalInvoice(inv)}
            onOpenPrintModal={(inv) => setPrintModalInvoice(inv)}
            onUpdateStatus={handleUpdateStatus}
            onUpdateInvoice={(inv) => {
              setInvoices(invoices.map((i) => (i.id === inv.id ? inv : i)));
              showNotification(lang === 'EN' ? 'Photo saved successfully!' : 'ছবি সংরক্ষিত হয়েছে!');
            }}
          />
        )}

        {currentTab === 'catalog' && (
          <CatalogScreen
            shop={shop}
            catalogItems={catalogItems}
            lang={lang}
            onAddOrderFromCatalog={handleAddOrderFromCatalog}
            onSaveCatalogItem={handleSaveCatalogItem}
            onDeleteCatalogItem={handleDeleteCatalogItem}
          />
        )}

        {currentTab === 'customers' && (
          <CustomersScreen
            shop={shop}
            invoices={invoices}
            lang={lang}
            onNavigateToNewOrderWithCustomer={(name, phone, address) => {
              const today = new Date().toISOString().split('T')[0];
              const delivery = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
              const newTemplate: Invoice = {
                id: `JT-${Math.floor(1000 + Math.random() * 9000)}`,
                shopId: shop.id,
                customerName: name,
                customerPhone: phone,
                customerAddress: address || '',
                orderDate: today,
                deliveryDate: delivery,
                dressType: 'Abaya',
                orderStatus: 'Pending',
                subtotal: 0,
                discount: 0,
                netTotal: 0,
                advanceDeposit: 0,
                remainingDue: 0,
                paymentMethod: 'Cash',
                items: [],
                payments: [],
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              setInvoiceToEdit(null);
              setOrderInitialCatalogItem(null);
              setOrderInitialInvoice(newTemplate);
              setCurrentTab('new-order');
            }}
            onNavigateToInvoiceDetail={(invoiceId) => {
              setSelectedInvoiceId(invoiceId);
              setCurrentTab('invoice-detail');
            }}
          />
        )}

        {currentTab === 'measurements' && (
          <MeasurementsScreen
            shop={shop}
            invoices={invoices}
            lang={lang}
            onNavigateToNewOrderWithMeasurement={(measurement, customerName, customerPhone, customerAddress, dressType) => {
              const today = new Date().toISOString().split('T')[0];
              const delivery = new Date(Date.now() + 5 * 86400000).toISOString().split('T')[0];
              const newTemplate: Invoice = {
                id: `JT-${Math.floor(1000 + Math.random() * 9000)}`,
                shopId: shop.id,
                customerName: customerName,
                customerPhone: customerPhone,
                customerAddress: customerAddress || '',
                orderDate: today,
                deliveryDate: delivery,
                dressType: dressType || measurement.dressType || 'Abaya',
                orderStatus: 'Pending',
                subtotal: 0,
                discount: 0,
                netTotal: 0,
                advanceDeposit: 0,
                remainingDue: 0,
                paymentMethod: 'Cash',
                items: [
                  {
                    id: `item-${Date.now()}`,
                    invoiceId: '',
                    description: `Custom Tailoring (${dressType || measurement.dressType || 'Abaya'})`,
                    quantity: 1,
                    unitPrice: 0,
                    totalPrice: 0,
                  },
                ],
                payments: [],
                measurement: measurement,
                createdAt: Date.now(),
                updatedAt: Date.now(),
              };
              setInvoiceToEdit(null);
              setOrderInitialCatalogItem(null);
              setOrderInitialInvoice(newTemplate);
              setCurrentTab('new-order');
              showNotification(
                lang === 'EN'
                  ? `Creating order with measurement of ${customerName}!`
                  : `${customerName}-এর মাপ দিয়ে নতুন অর্ডার তৈরি হচ্ছে!`,
                'success'
              );
            }}
            onOpenVisualGuide={() => setIsVisualGuideOpen(true)}
            onNavigateToInvoiceDetail={(invoiceId) => {
              setSelectedInvoiceId(invoiceId);
              setCurrentTab('invoice-detail');
            }}
            onUpdateInvoiceMeasurement={(invoiceId, updatedMeasurement) => {
              setInvoices((prev) =>
                prev.map((inv) =>
                  inv.id === invoiceId
                    ? {
                        ...inv,
                        measurement: updatedMeasurement,
                        dressType: updatedMeasurement.dressType || inv.dressType,
                        updatedAt: Date.now(),
                      }
                    : inv
                )
              );
              showNotification(lang === 'EN' ? 'Measurement updated successfully!' : 'মেজারমেন্ট সফলভাবে আপডেট হয়েছে!', 'success');
            }}
            onSaveStandaloneMeasurement={(meas) => {
              showNotification(lang === 'EN' ? 'Measurement saved!' : 'মেজারমেন্ট সংরক্ষিত হয়েছে!', 'success');
            }}
            onDeleteStandaloneMeasurement={(id) => {
              showNotification(lang === 'EN' ? 'Measurement record deleted!' : 'মেজারমেন্ট রেকর্ড মুছে ফেলা হয়েছে!', 'info');
            }}
          />
        )}

        {currentTab === 'daily-accounts' && (
          <DailyAccountsScreen
            shop={shop}
            invoices={invoices}
            expenses={expenses}
            tailorRecords={tailorRecords}
            lang={lang}
          />
        )}

        {currentTab === 'tailor' && (
          <TailorTrackingScreen
            shop={shop}
            tailorRecords={tailorRecords}
            lang={lang}
            onSaveRecord={handleSaveTailorRecord}
            onDeleteRecord={handleDeleteTailorRecord}
          />
        )}

        {currentTab === 'expense' && (
          <ExpenseScreen
            shop={shop}
            expenses={expenses}
            lang={lang}
            onSaveExpense={handleSaveExpense}
            onDeleteExpense={handleDeleteExpense}
          />
        )}

        {currentTab === 'reports' && (
          <ReportsScreen
            shop={shop}
            invoices={invoices}
            expenses={expenses}
            tailorRecords={tailorRecords}
            lang={lang}
          />
        )}

        {currentTab === 'settings' && (
          <SettingsScreen
            shop={shop}
            lang={lang}
            onChangeLang={(l) => setLang(l)}
            onUpdateShop={(newShop) => setShop(newShop)}
            onToggleLang={() => setLang(lang === 'BN' ? 'EN' : 'BN')}
            adminPin={adminPin}
            onUpdateAdminPin={(newPin) => {
              setAdminPin(newPin);
              saveStoredAdminPin(newPin);
              showNotification(lang === 'EN' ? 'Admin PIN updated successfully!' : 'এডমিন পিন সফলভাবে আপডেট হয়েছে!');
            }}
            pinProtectionEnabled={pinProtectionEnabled}
            onTogglePinProtection={(enabled) => {
              setPinProtectionEnabled(enabled);
              saveStoredPinProtectionEnabled(enabled);
              showNotification(
                enabled
                  ? (lang === 'EN' ? 'Password protection enabled!' : 'পাসওয়ার্ড সুরক্ষা চালু করা হয়েছে!')
                  : (lang === 'EN' ? 'Password protection disabled!' : 'পাসওয়ার্ড সুরক্ষা বন্ধ করা হয়েছে!'),
                'info'
              );
            }}
            onLockApp={() => {
              setIsAdminLoggedIn(false);
              saveStoredIsAdminLoggedIn(false);
              showNotification(lang === 'EN' ? 'App locked successfully!' : 'অ্যাপটি সফলভাবে লক করা হয়েছে!', 'info');
            }}
            onNavigateTab={(tab) => setCurrentTab(tab)}
            invoicesCount={invoices.length}
            catalogCount={catalogItems.length}
            tailorCount={tailorRecords.length}
            expensesCount={expenses.length}
            onExportBackup={handleExportBackup}
            onImportBackup={handleImportBackup}
          />
        )}
      </main>

      {/* Mobile Bottom Floating Navigation Bar (< 1024px only) */}
      <div className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-300 bg-white/98 px-2 py-1.5 backdrop-blur-md lg:hidden shadow-2xl print:hidden">
        <div className="grid grid-cols-6 gap-1 text-center">
          <button
            onClick={() => setCurrentTab('dashboard')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 text-[10.5px] font-bold rounded-xl transition ${
              currentTab === 'dashboard'
                ? 'text-emerald-950 font-black bg-emerald-100/90 shadow-2xs'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <LayoutDashboard className={`h-4.5 w-4.5 mb-0.5 ${currentTab === 'dashboard' ? 'text-emerald-800' : 'text-slate-600'}`} />
            <span className="truncate w-full">{t.navDashboard}</span>
          </button>

          <button
            onClick={() => {
              setInvoiceToEdit(null);
              setOrderInitialCatalogItem(null);
              setCurrentTab('new-order');
            }}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 text-[10.5px] font-bold rounded-xl transition ${
              currentTab === 'new-order'
                ? 'text-emerald-950 font-black bg-emerald-100/90 shadow-2xs'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <PlusCircle className="h-4.5 w-4.5 mb-0.5 text-amber-500" />
            <span className="truncate w-full">{t.navNewOrder}</span>
          </button>

          <button
            onClick={() => setCurrentTab('measurements')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 text-[10.5px] font-bold rounded-xl transition ${
              currentTab === 'measurements'
                ? 'text-emerald-950 font-black bg-emerald-100/90 shadow-2xs'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <Ruler className={`h-4.5 w-4.5 mb-0.5 ${currentTab === 'measurements' ? 'text-emerald-800' : 'text-slate-600'}`} />
            <span className="truncate w-full">{lang === 'BN' ? 'মেজারমেন্ট' : 'Measure'}</span>
          </button>

          <button
            onClick={() => setCurrentTab('daily-accounts')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 text-[10.5px] font-bold rounded-xl transition ${
              currentTab === 'daily-accounts'
                ? 'text-emerald-950 font-black bg-emerald-100/90 shadow-2xs'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <DollarSign className={`h-4.5 w-4.5 mb-0.5 ${currentTab === 'daily-accounts' ? 'text-emerald-800' : 'text-slate-600'}`} />
            <span className="truncate w-full">{lang === 'BN' ? 'দৈনিক হিসাব' : 'Accounts'}</span>
          </button>

          <button
            onClick={() => setCurrentTab('reports')}
            className={`flex flex-col items-center justify-center py-1.5 px-0.5 text-[10.5px] font-bold rounded-xl transition ${
              currentTab === 'reports'
                ? 'text-emerald-950 font-black bg-emerald-100/90 shadow-2xs'
                : 'text-slate-700 hover:text-slate-950'
            }`}
          >
            <BarChart3 className={`h-4.5 w-4.5 mb-0.5 ${currentTab === 'reports' ? 'text-emerald-800' : 'text-slate-600'}`} />
            <span className="truncate w-full">{lang === 'BN' ? 'রিপোর্ট' : 'Reports'}</span>
          </button>

          <button
            onClick={() => setIsSidebarOpen(true)}
            className="flex flex-col items-center justify-center py-1.5 px-0.5 text-[10.5px] font-bold rounded-xl text-slate-700 hover:text-slate-950 transition hover:bg-slate-100"
          >
            <Menu className="h-4.5 w-4.5 mb-0.5 text-emerald-800" />
            <span className="truncate w-full">{lang === 'BN' ? 'মেনু' : 'Menu'}</span>
          </button>
        </div>
      </div>

      {/* Floating AI Business Manager Button on Mobile (< 1024px only) */}
      {currentTab !== 'ai-business-manager' && (
        <button
          onClick={() => setCurrentTab('ai-business-manager')}
          className="fixed bottom-16 right-3.5 z-40 flex items-center gap-1.5 rounded-full bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 text-white font-black px-3.5 py-2 shadow-2xl hover:scale-105 active:scale-95 transition border border-emerald-400/40 lg:hidden ring-2 ring-emerald-500/20 print:hidden"
          title={lang === 'BN' ? 'AI বিজনেস ম্যানেজার' : 'AI Business Manager'}
        >
          <Sparkles className="h-4 w-4 text-amber-300 animate-pulse" />
          <span className="text-[11.5px] font-bold tracking-tight text-white">{lang === 'BN' ? 'AI সাহায্য' : 'Ask AI'}</span>
        </button>
      )}
      </div>

      {/* Sidebar Drawer Navigation */}
      <SidebarDrawer
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        currentTab={currentTab}
        onSelectTab={(tab) => {
          if (tab === 'new-order') {
            setInvoiceToEdit(null);
            setOrderInitialInvoice(null);
            setOrderInitialCatalogItem(null);
          }
          setCurrentTab(tab);
        }}
        shop={shop}
        lang={lang}
        onChangeLang={(l) => setLang(l)}
        onLockAdmin={() => {
          setIsAdminLoggedIn(false);
          saveStoredIsAdminLoggedIn(false);
          showNotification(lang === 'EN' ? 'Admin panel locked!' : 'এডমিন প্যানেল লক করা হয়েছে!', 'info');
        }}
      />

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        currentLang={lang}
        onSelectLang={(selectedLang) => setLang(selectedLang)}
      />

      {/* Global Modals */}
      <PrintInvoiceModal
        isOpen={!!printModalInvoice}
        invoice={printModalInvoice}
        shop={shop}
        lang={lang}
        onClose={() => setPrintModalInvoice(null)}
      />

      <AddPaymentModal
        isOpen={!!paymentModalInvoice}
        invoice={paymentModalInvoice}
        shop={shop}
        lang={lang}
        onClose={() => setPaymentModalInvoice(null)}
        onSubmit={handleAddPayment}
      />

      <ConfirmDeleteModal
        isOpen={!!deleteModalInvoice}
        invoice={deleteModalInvoice}
        lang={lang}
        onClose={() => setDeleteModalInvoice(null)}
        onConfirm={confirmDeleteInvoice}
      />

      <VisualGuideModal
        isOpen={isVisualGuideOpen}
        lang={lang}
        onClose={() => setIsVisualGuideOpen(false)}
      />

      <InstallGuideModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        lang={lang}
      />
    </div>
  );
}

export default App;
