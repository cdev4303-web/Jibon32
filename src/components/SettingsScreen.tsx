import React, { useState, useRef, useEffect } from 'react';
import { Shop, Invoice, CatalogItem, TailorRecord, Expense, HeaderColorConfig, Language } from '../types';
import { strings, LANGUAGES } from '../utils/strings';
import { Logo } from './Logo';
import {
  HEADER_COLOR_PRESETS,
  DEFAULT_HEADER_CONFIG,
  getHeaderTitleStyle,
  ColorPreset,
} from '../utils/headerStyle';
import {
  getStoredDressCategories,
  saveStoredDressCategories,
  getStoredExpenseCategories,
  saveStoredExpenseCategories,
  DEFAULT_DRESS_CATEGORIES,
  DEFAULT_EXPENSE_CATEGORIES,
} from '../utils/storage';
import {
  FolderTree,
  Store,
  Save,
  Check,
  Globe,
  Phone,
  MapPin,
  FileBadge,
  DollarSign,
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  LayoutDashboard,
  ShoppingBag,
  Users,
  Receipt,
  Download,
  Upload,
  Plus,
  Trash2,
  Tag,
  Scissors,
  CreditCard,
  Layers,
  ArrowRight,
  RefreshCw,
  Sparkles,
  Database,
  FileText,
  RotateCcw,
  Palette,
  Eye,
  Sliders,
  SunMedium,
  Menu,
  Loader2,
  CheckCircle2,
} from 'lucide-react';

interface SettingsScreenProps {
  shop: Shop;
  lang: Language;
  onUpdateShop: (shop: Shop) => void;
  onToggleLang?: () => void;
  onChangeLang?: (lang: Language) => void;
  adminPin: string;
  onUpdateAdminPin: (newPin: string) => void;
  pinProtectionEnabled: boolean;
  onTogglePinProtection: (enabled: boolean) => void;
  onLockApp: () => void;
  onNavigateTab: (tab: string) => void;
  invoicesCount?: number;
  catalogCount?: number;
  tailorCount?: number;
  expensesCount?: number;
  onExportBackup?: () => void;
  onImportBackup?: (file: File) => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({
  shop,
  lang,
  onUpdateShop,
  onToggleLang,
  onChangeLang,
  adminPin,
  onUpdateAdminPin,
  pinProtectionEnabled,
  onTogglePinProtection,
  onLockApp,
  onNavigateTab,
  invoicesCount = 0,
  catalogCount = 0,
  tailorCount = 0,
  expensesCount = 0,
  onExportBackup,
  onImportBackup,
}) => {
  const isEn = lang === 'EN';
  const t = strings[lang] || strings.BN;

  // Active Category Setting Sub-Tab
  const [activeSubTab, setActiveSubTab] = useState<
    'root' | 'header-style' | 'language' | 'shop-profile' | 'dress-categories' | 'expense-categories' | 'admin-security' | 'backup'
  >('root');

  // Shop Profile State
  const [formData, setFormData] = useState<Shop>({ ...shop });
  const [savedSuccess, setSavedSuccess] = useState(false);

  // Header Color / Multi-color Config State
  const [headerConfig, setHeaderConfig] = useState<HeaderColorConfig>(
    shop.headerStyle || DEFAULT_HEADER_CONFIG
  );

  useEffect(() => {
    setFormData({ ...shop });
    if (shop.headerStyle) {
      setHeaderConfig(shop.headerStyle);
    }
  }, [shop]);

  // Admin PIN management state
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');
  const [pinChangeMsg, setPinChangeMsg] = useState<{ text: string; isError: boolean } | null>(null);

  // Dress Categories State
  const [dressCategories, setDressCategories] = useState<string[]>(getStoredDressCategories);
  const [newDressCategory, setNewDressCategory] = useState('');

  // Expense Categories State
  const [expenseCategories, setExpenseCategories] = useState<string[]>(getStoredExpenseCategories);
  const [newExpenseCategory, setNewExpenseCategory] = useState('');

  const [isExportingBackup, setIsExportingBackup] = useState(false);
  const restoreFileRef = useRef<HTMLInputElement | null>(null);

  const handleExportBackupClick = async () => {
    setIsExportingBackup(true);
    try {
      if (onExportBackup) {
        await onExportBackup();
      }
    } finally {
      setIsExportingBackup(false);
    }
  };

  // Handlers
  const handleShopSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const updated = {
      ...formData,
      headerStyle: headerConfig,
    };
    onUpdateShop(updated);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleApplyHeaderPreset = (presetId: string) => {
    const preset = HEADER_COLOR_PRESETS.find((p) => p.id === presetId);
    const updatedConfig: HeaderColorConfig = {
      ...headerConfig,
      colorMode: 'preset',
      presetId,
      effect: preset?.effectRecommended || headerConfig.effect || 'none',
    };
    setHeaderConfig(updatedConfig);
    const updatedShop: Shop = {
      ...formData,
      headerStyle: updatedConfig,
    };
    setFormData(updatedShop);
    onUpdateShop(updatedShop);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 2500);
  };

  const handleSaveHeaderStyle = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const updatedShop: Shop = {
      ...formData,
      headerStyle: headerConfig,
    };
    setFormData(updatedShop);
    onUpdateShop(updatedShop);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleResetHeaderStyle = () => {
    setHeaderConfig(DEFAULT_HEADER_CONFIG);
    const updatedShop: Shop = {
      ...formData,
      headerStyle: DEFAULT_HEADER_CONFIG,
    };
    setFormData(updatedShop);
    onUpdateShop(updatedShop);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handleAddDressCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDressCategory.trim()) return;
    const cat = newDressCategory.trim();
    if (dressCategories.includes(cat)) {
      alert(isEn ? 'Category already exists!' : 'ক্যাটাগরিটি ইতিমধ্যে তালিকায় রয়েছে!');
      return;
    }
    const updated = [...dressCategories, cat];
    setDressCategories(updated);
    saveStoredDressCategories(updated);
    setNewDressCategory('');
  };

  const handleDeleteDressCategory = (cat: string) => {
    if (confirm(isEn ? `Delete category "${cat}"?` : `"${cat}" ক্যাটাগরি মুছে ফেলতে চান?`)) {
      const updated = dressCategories.filter((c) => c !== cat);
      setDressCategories(updated);
      saveStoredDressCategories(updated);
    }
  };

  const handleResetDressCategories = () => {
    if (confirm(isEn ? 'Reset to default dress categories?' : 'ডিফল্ট পোশাক ক্যাটাগরিগুলোতে রিসেট করবেন?')) {
      setDressCategories(DEFAULT_DRESS_CATEGORIES);
      saveStoredDressCategories(DEFAULT_DRESS_CATEGORIES);
    }
  };

  const handleAddExpenseCategory = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpenseCategory.trim()) return;
    const cat = newExpenseCategory.trim();
    if (expenseCategories.includes(cat)) {
      alert(isEn ? 'Category already exists!' : 'ক্যাটাগরিটি ইতিমধ্যে রয়েছে!');
      return;
    }
    const updated = [...expenseCategories, cat];
    setExpenseCategories(updated);
    saveStoredExpenseCategories(updated);
    setNewExpenseCategory('');
  };

  const handleDeleteExpenseCategory = (cat: string) => {
    if (confirm(isEn ? `Delete category "${cat}"?` : `"${cat}" খরচ ক্যাটাগরি মুছে ফেলতে চান?`)) {
      const updated = expenseCategories.filter((c) => c !== cat);
      setExpenseCategories(updated);
      saveStoredExpenseCategories(updated);
    }
  };

  const handleResetExpenseCategories = () => {
    if (confirm(isEn ? 'Reset to default expense categories?' : 'ডিফল্ট খরচ ক্যাটাগরিগুলোতে রিসেট করবেন?')) {
      setExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
      saveStoredExpenseCategories(DEFAULT_EXPENSE_CATEGORIES);
    }
  };

  const handleChangePin = (e: React.FormEvent) => {
    e.preventDefault();
    const enteredCurrent = currentPinInput.trim();
    const activeCurrentPin = (adminPin || '1234').trim();

    if (enteredCurrent !== activeCurrentPin) {
      setPinChangeMsg({ text: isEn ? 'Current PIN/Password is incorrect!' : 'বর্তমান পিন বা পাসওয়ার্ড ভুল হয়েছে!', isError: true });
      return;
    }
    if (newPinInput.trim().length < 4) {
      setPinChangeMsg({ text: isEn ? 'New PIN/Password must be at least 4 characters.' : 'নতুন পিন কমপক্ষে ৪ ডিজিট বা অক্ষর হতে হবে।', isError: true });
      return;
    }
    if (newPinInput.trim() !== confirmPinInput.trim()) {
      setPinChangeMsg({ text: isEn ? 'New PIN and Confirm PIN do not match!' : 'নতুন পিন ও কনফার্ম পিন মিলছে না!', isError: true });
      return;
    }

    onUpdateAdminPin(newPinInput.trim());
    setCurrentPinInput('');
    setNewPinInput('');
    setConfirmPinInput('');
    setPinChangeMsg({ text: isEn ? 'Admin password changed successfully!' : 'এডমিন পাসওয়ার্ড সফলভাবে পরিবর্তন হয়েছে!', isError: false });
    setTimeout(() => setPinChangeMsg(null), 4000);
  };

  const handleRestoreDefaultPin = () => {
    if (
      confirm(
        isEn
          ? 'Restore admin password to default PIN (1234)?'
          : 'আপনি কি এডমিন পাসওয়ার্ড ডিফল্ট পিন (1234)-এ রিস্টোর করতে চান?'
      )
    ) {
      onUpdateAdminPin('1234');
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setPinChangeMsg({
        text: isEn
          ? 'Admin password restored to default PIN (1234) successfully!'
          : 'এডমিন পাসওয়ার্ড সফলভাবে ডিফল্ট পিন (1234)-এ রিস্টোর হয়েছে!',
        isError: false,
      });
      setTimeout(() => setPinChangeMsg(null), 4000);
    }
  };

  return (
    <div className="space-y-6 pb-24 max-w-5xl mx-auto">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-800 text-white shadow-sm">
              <FolderTree className="h-5 w-5" />
            </div>
            <div>
              <h1 className="text-xl sm:text-2xl font-black tracking-tight text-slate-900">
                {isEn ? 'Root Directory & Settings Hub' : 'রুট ডিরেক্টরি ও কন্ট্রোল সেটিংস'}
              </h1>
              <p className="text-xs text-slate-500">
                {isEn
                  ? 'All shop categories, root directories, admin security & shop configuration'
                  : 'সকল ক্যাটাগরি রুট ডিরেক্টরি, এডমিন পাসওয়ার্ড ও দোকানের সার্বিক কনফিগারেশন'}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onLockApp}
            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
            title={isEn ? 'Lock Admin Panel Now' : 'এডমিন প্যানেল এখনই লক করুন'}
          >
            <Lock className="h-3.5 w-3.5 text-amber-400" />
            <span>{isEn ? 'Lock Panel' : 'লক করুন'}</span>
          </button>

          <button
            onClick={onToggleLang}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 text-xs font-bold transition shadow-2xs"
          >
            <Globe className="h-3.5 w-3.5 text-emerald-700" />
            <span>{lang === 'BN' ? 'ENG' : 'বাং (BN)'}</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="rounded-2xl bg-emerald-100 border border-emerald-300 p-4 text-emerald-900 flex items-center gap-2 font-bold text-xs animate-fadeIn">
          <Check className="h-4 w-4 text-emerald-700 shrink-0" />
          <span>{isEn ? 'Settings updated and saved successfully!' : 'সেটিংস সফলভাবে সংরক্ষিত হয়েছে!'}</span>
        </div>
      )}

      {/* Sub Navigation Tabs for Category Sections */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-200 text-xs font-bold no-scrollbar">
        <button
          onClick={() => setActiveSubTab('root')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition whitespace-nowrap btn-shadow ${
            activeSubTab === 'root'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <FolderTree className="h-4 w-4" />
          <span>{isEn ? 'Root Directory Hub' : 'রুট ডিরেক্টরি হাব'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('header-style')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition whitespace-nowrap btn-shadow ${
            activeSubTab === 'header-style'
              ? 'bg-emerald-800 text-white shadow-sm ring-2 ring-emerald-500/30'
              : 'bg-gradient-to-r from-amber-50 to-emerald-50 text-emerald-950 hover:bg-emerald-100 border border-emerald-300 font-bold'
          }`}
        >
          <Palette className="h-4 w-4 text-amber-500" />
          <span>{isEn ? 'Header Color & Styling' : 'হেডার মাল্টিকালার স্টাইলিং'}</span>
          <span className="px-1.5 py-0.5 rounded-full bg-amber-400 text-[10px] font-black text-amber-950">
            NEW
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('language')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition whitespace-nowrap btn-shadow ${
            activeSubTab === 'language'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200 font-bold'
          }`}
        >
          <Globe className="h-4 w-4 text-emerald-600" />
          <span>{isEn ? 'Language (বাং/EN/हि/عر)' : 'অ্যাপের ভাষা (Language)'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('shop-profile')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition whitespace-nowrap btn-shadow ${
            activeSubTab === 'shop-profile'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Store className="h-4 w-4" />
          <span>{isEn ? 'Shop Profile & CR' : 'দোকানের প্রোফাইল ও CR'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('dress-categories')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition whitespace-nowrap btn-shadow ${
            activeSubTab === 'dress-categories'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Scissors className="h-4 w-4" />
          <span>{isEn ? 'Dress Categories' : 'পোশাক ক্যাটাগরি'}</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-950 text-[10px] text-emerald-200">
            {dressCategories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('expense-categories')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition whitespace-nowrap btn-shadow ${
            activeSubTab === 'expense-categories'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Receipt className="h-4 w-4" />
          <span>{isEn ? 'Expense & Deposit Categories' : 'খরচ ও জমা ক্যাটাগরি'}</span>
          <span className="ml-1 px-1.5 py-0.2 rounded-full bg-emerald-950 text-[10px] text-emerald-200">
            {expenseCategories.length}
          </span>
        </button>

        <button
          onClick={() => setActiveSubTab('admin-security')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition whitespace-nowrap btn-shadow ${
            activeSubTab === 'admin-security'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <ShieldCheck className="h-4 w-4" />
          <span>{isEn ? 'Admin Password' : 'এডমিন পাসওয়ার্ড'}</span>
        </button>

        <button
          onClick={() => setActiveSubTab('backup')}
          className={`flex items-center gap-1.5 px-4 py-2.5 rounded-xl transition whitespace-nowrap btn-shadow ${
            activeSubTab === 'backup'
              ? 'bg-emerald-800 text-white shadow-sm'
              : 'bg-white text-slate-700 hover:bg-slate-100 border border-slate-200'
          }`}
        >
          <Database className="h-4 w-4" />
          <span>{isEn ? 'Backup & Data' : 'ডাটা ব্যাকআপ'}</span>
        </button>
      </div>

      {/* TAB 1: ROOT DIRECTORY HUB */}
      {activeSubTab === 'root' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <FolderTree className="h-5 w-5 text-emerald-700" />
                  <span>{isEn ? 'Master Root Directory Structure' : 'মাস্টার রুট ডিরেক্টরি সূচি'}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {isEn
                    ? 'Direct access to all tailoring management sub-systems, categories & ledgers'
                    : 'টেইলারিং সিস্টেমের সকল সাব-সিস্টেম, খাতা ও ক্যাটাগরিতে এক ক্লিকে প্রবেশ করুন'}
                </p>
              </div>
            </div>

            {/* Root Directory Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {/* Header Multi-color Styling */}
              <div
                onClick={() => setActiveSubTab('header-style')}
                className="group p-5 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50/70 to-emerald-50/50 hover:border-amber-400 transition cursor-pointer btn-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-amber-500 text-white group-hover:bg-amber-600 transition shadow-sm">
                      <Palette className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-200 text-amber-950">
                      {isEn ? 'Multi-Color' : 'মাল্টিকালার'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-950 transition">
                    /root/header-multi-color-styling
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {isEn
                      ? 'Customize header shop name colors, gradients, glow & 3D shadow effects'
                      : 'হেডারে দোকানের নামের মাল্টি কালার, গ্রেডিয়েন্ট, গ্লো ও থ্রিডি স্যাডো পরিবর্তন করুন'}
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-bold text-amber-700 group-hover:translate-x-1 transition">
                  <span>{isEn ? 'Customize Header Color' : 'কালার পরিবর্তন করুন'}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </div>

              {/* Language Settings Directory */}
              <div
                onClick={() => setActiveSubTab('language')}
                className="group p-5 rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50/70 to-teal-50/50 hover:border-emerald-400 transition cursor-pointer btn-shadow flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-emerald-600 text-white group-hover:bg-emerald-700 transition shadow-sm">
                      <Globe className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950">
                      4 Languages
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-950 transition">
                    /root/system-language-settings
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {isEn
                      ? 'Switch between Bengali, English, Hindi, and Arabic languages'
                      : 'বাংলা, ইংরেজি, হিন্দি ও আরবি ভাষায় অ্যাপ পরিচালনা করুন'}
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition">
                  <span>{isEn ? 'Change Language' : 'ভাষা পরিবর্তন করুন'}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </div>

              {/* Invoices Directory */}
              <div
                onClick={() => onNavigateTab('dashboard')}
                className="group p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/50 hover:border-emerald-300 transition cursor-pointer shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-emerald-100 text-emerald-800 group-hover:bg-emerald-800 group-hover:text-white transition">
                      <LayoutDashboard className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-900">
                      {invoicesCount} {isEn ? 'Orders' : 'অর্ডার'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-900 transition">
                    /root/invoices-and-orders
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {isEn ? 'Customer Invoices, Due Balance & Order Progress' : 'কাস্টমার ইনভয়েস, বাকি হিসাব ও ডেলিভারি স্ট্যাটাস'}
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-bold text-emerald-700 group-hover:translate-x-1 transition">
                  <span>{isEn ? 'Open Directory' : 'ইনভয়েস খুলুন'}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </div>

              {/* Catalog Directory */}
              <div
                onClick={() => onNavigateTab('catalog')}
                className="group p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/50 hover:border-emerald-300 transition cursor-pointer shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-teal-100 text-teal-800 group-hover:bg-teal-800 group-hover:text-white transition">
                      <ShoppingBag className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-teal-100 text-teal-900">
                      {catalogCount} {isEn ? 'Designs' : 'ডিজাইন'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-teal-900 transition">
                    /root/design-catalog
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {isEn ? 'Dress Catalog Cards, Pricing & Photo Showcases' : 'ডিজাইন ক্যাটালগ কার্ড, ছবি ও শেয়ারিং কার্ড'}
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-bold text-teal-700 group-hover:translate-x-1 transition">
                  <span>{isEn ? 'Open Catalog' : 'ক্যাটালগ খুলুন'}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </div>

              {/* Karigar Directory */}
              <div
                onClick={() => onNavigateTab('tailor')}
                className="group p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/50 hover:border-emerald-300 transition cursor-pointer shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-indigo-100 text-indigo-800 group-hover:bg-indigo-800 group-hover:text-white transition">
                      <Users className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-900">
                      {tailorCount} {isEn ? 'Entries' : 'কাজ'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-indigo-900 transition">
                    /root/karigar-wage-ledger
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {isEn ? 'Karigar Cutting/Sewing Wage Statement & Ledger' : 'কারিগর কাটিং ও সুইং কাজের খাতা ও মজুরি ট্র্যাকিং'}
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-bold text-indigo-700 group-hover:translate-x-1 transition">
                  <span>{isEn ? 'Open Karigar Ledger' : 'কারিগর খাতা খুলুন'}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </div>

              {/* Expense & Deposit Directory */}
              <div
                onClick={() => onNavigateTab('expense')}
                className="group p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/50 hover:border-emerald-300 transition cursor-pointer shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-amber-100 text-amber-800 group-hover:bg-amber-800 group-hover:text-white transition">
                      <Receipt className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-amber-100 text-amber-900">
                      {expensesCount} {isEn ? 'Entries' : 'লেনদেন'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-amber-900 transition">
                    /root/expense-and-deposit-ledger
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {isEn ? 'Daily Expenses, Fabric, Rent & Cash Deposits' : 'দৈনিক দোকান খরচ, কাপড় ক্রয় ও ক্যাশ মূলধন জমা'}
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-bold text-amber-700 group-hover:translate-x-1 transition">
                  <span>{isEn ? 'Open Expense Ledger' : 'খরচের খাতা খুলুন'}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </div>

              {/* Dress Categories Directory */}
              <div
                onClick={() => setActiveSubTab('dress-categories')}
                className="group p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/50 hover:border-emerald-300 transition cursor-pointer shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-purple-100 text-purple-800 group-hover:bg-purple-800 group-hover:text-white transition">
                      <Scissors className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-purple-100 text-purple-900">
                      {dressCategories.length} {isEn ? 'Types' : 'পোশাক'}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-purple-900 transition">
                    /root/categories/dress-types
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {isEn ? 'Manage Tailoring Dress Types & Measurement Formats' : 'জুব্বা, পাঞ্জাবি, শার্ট, প্যান্ট, বোরকা ও কাস্টম পোশাক'}
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-bold text-purple-700 group-hover:translate-x-1 transition">
                  <span>{isEn ? 'Manage Categories' : 'ক্যাটাগরি ম্যানেজ করুন'}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </div>

              {/* Admin Security */}
              <div
                onClick={() => setActiveSubTab('admin-security')}
                className="group p-5 rounded-2xl border border-slate-200 bg-slate-50/50 hover:bg-emerald-50/50 hover:border-emerald-300 transition cursor-pointer shadow-2xs flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center justify-between mb-3">
                    <div className="p-2.5 rounded-xl bg-rose-100 text-rose-800 group-hover:bg-rose-800 group-hover:text-white transition">
                      <Lock className="h-5 w-5" />
                    </div>
                    <span className="text-xs font-black px-2 py-0.5 rounded-full bg-rose-100 text-rose-900">
                      {pinProtectionEnabled ? (isEn ? 'Locked' : 'লক চালু') : (isEn ? 'Unlocked' : 'লক বন্ধ')}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-slate-900 group-hover:text-rose-900 transition">
                    /root/admin-security-and-pin
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {isEn ? 'Admin PIN Password, Lock Screen & Access Gate' : 'এডমিন পাসওয়ার্ড পরিবর্তন ও লক স্ক্রিন সেটিংস'}
                  </p>
                </div>
                <div className="pt-4 flex items-center text-xs font-bold text-rose-700 group-hover:translate-x-1 transition">
                  <span>{isEn ? 'Security Settings' : 'সিকিউরিটি সেটিংস'}</span>
                  <ArrowRight className="h-3.5 w-3.5 ml-1" />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: HEADER COLOR & MULTI-COLOR STYLING (NEW USER FEATURE) */}
      {activeSubTab === 'header-style' && (
        <div className="space-y-6">
          {/* Header Color Studio Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between pb-4 border-b border-slate-100 gap-3">
              <div>
                <h2 className="text-base sm:text-lg font-black text-slate-900 flex items-center gap-2">
                  <Palette className="h-5 w-5 text-amber-500" />
                  <span>{isEn ? 'Header Shop Name Color & Multi-Color Styling' : 'হেডারে দোকানের নাম মাল্টিকালার ও কালার কাস্টমাইজেশন'}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {isEn
                    ? 'Change shop branding colors, select gradient multi-color presets, custom blends and 3D shadow effects'
                    : 'হেডারে ব্র্যান্ডের নাম বিভিন্ন কালার, মাল্টিকালার গ্রেডিয়েন্ট, গ্লো ও ড্রপ স্যাডো দিয়ে আকর্ষণীয় করুন'}
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleResetHeaderStyle}
                  className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl border border-slate-300 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold transition btn-shadow"
                >
                  <RotateCcw className="h-3.5 w-3.5 text-slate-600" />
                  <span>{isEn ? 'Reset Default' : 'ডিফল্ট রিসেট'}</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveHeaderStyle()}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition btn-shadow-emerald"
                >
                  <Save className="h-3.5 w-3.5" />
                  <span>{isEn ? 'Save Colors' : 'কালার সেভ করুন'}</span>
                </button>
              </div>
            </div>

            {/* LIVE HEADER PREVIEW BOX */}
            <div className="rounded-2xl border border-slate-300 bg-slate-900/5 p-4 sm:p-5">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5">
                  <Eye className="h-3.5 w-3.5 text-emerald-700" />
                  {isEn ? 'Live Header Preview Simulation' : 'লাইভ হেডার প্রিভিউ (অ্যাপে দেখতে যেমন লাগবে)'}
                </span>
                <span className="text-[11px] font-semibold text-slate-500">
                  {headerConfig.colorMode === 'preset'
                    ? (HEADER_COLOR_PRESETS.find((p) => p.id === headerConfig.presetId)?.nameBn || 'Preset')
                    : headerConfig.colorMode === 'solid'
                    ? 'Solid Color'
                    : 'Custom Multi-Color Gradient'}
                </span>
              </div>

              {/* Simulated Header Bar */}
              <div className="rounded-2xl border border-slate-200/90 bg-white/95 px-4 py-3.5 shadow-md flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-2xs">
                    <Menu className="h-4 w-4" />
                  </div>
                  <Logo size="md" />
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span
                        style={getHeaderTitleStyle(headerConfig)}
                        className="text-base sm:text-xl font-black tracking-tight"
                      >
                        {formData.name || 'JIBON LADIES TAILOR'}
                      </span>
                      <span className="rounded-md bg-emerald-100 px-1.5 py-0.5 text-[10px] font-bold text-emerald-800">
                        ADMIN
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-medium">
                      Smart Tailoring Operating System
                    </p>
                  </div>
                </div>

                <div className="flex items-center gap-1.5">
                  <div className="hidden sm:flex items-center gap-1 rounded-xl bg-slate-100 px-2.5 py-1 text-[11px] font-bold text-slate-700">
                    <Lock className="h-3 w-3 text-amber-500" />
                    <span>{isEn ? 'Lock' : 'লক'}</span>
                  </div>
                  <div className="rounded-xl border border-slate-200 px-2 py-1 text-[11px] font-black text-slate-800">
                    বাং
                  </div>
                </div>
              </div>
            </div>

            {/* COLOR MODE SELECTOR */}
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={() => setHeaderConfig({ ...headerConfig, colorMode: 'preset' })}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition btn-shadow ${
                    headerConfig.colorMode === 'preset'
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Sparkles className="h-4 w-4 text-amber-400" />
                  <span>{isEn ? 'Multi-Color & Gradient Presets' : 'মাল্টিকালার ও কালার প্রিসেট (১২ টি)'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHeaderConfig({ ...headerConfig, colorMode: 'solid' })}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition btn-shadow ${
                    headerConfig.colorMode === 'solid'
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Sliders className="h-4 w-4" />
                  <span>{isEn ? 'Single Solid Color' : 'একক সলিড কালার'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setHeaderConfig({ ...headerConfig, colorMode: 'custom-gradient' })}
                  className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold transition btn-shadow ${
                    headerConfig.colorMode === 'custom-gradient'
                      ? 'bg-emerald-800 text-white shadow-sm'
                      : 'bg-white text-slate-700 border border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  <Palette className="h-4 w-4 text-emerald-600" />
                  <span>{isEn ? 'Create Custom Gradient' : 'কাস্টম মাল্টিকালার গ্রেডিয়েন্ট তৈরি'}</span>
                </button>
              </div>

              {/* MODE 1: PRESETS GRID */}
              {headerConfig.colorMode === 'preset' && (
                <div className="space-y-3 pt-2">
                  <label className="block text-xs font-bold text-slate-700">
                    {isEn
                      ? 'Select from Popular Multi-Color & Brand Styles (Click to apply immediately):'
                      : 'পছন্দের মাল্টিকালার বা ব্রান্ড স্টাইল সিলেক্ট করুন (ক্লিক করলেই লাইভ পরিবর্তন হবে):'}
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {HEADER_COLOR_PRESETS.map((preset) => {
                      const isSelected = headerConfig.presetId === preset.id;
                      return (
                        <div
                          key={preset.id}
                          onClick={() => handleApplyHeaderPreset(preset.id)}
                          className={`p-3.5 rounded-2xl border transition cursor-pointer btn-shadow flex flex-col justify-between gap-2.5 ${
                            isSelected
                              ? 'border-emerald-600 bg-emerald-50/50 ring-2 ring-emerald-500/30'
                              : 'border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span
                                className="w-5 h-5 rounded-full border border-black/10 shadow-xs shrink-0"
                                style={{ background: preset.previewBg }}
                              />
                              <span className="text-xs font-bold text-slate-900">
                                {isEn ? preset.nameEn : preset.nameBn}
                              </span>
                            </div>
                            {isSelected && (
                              <span className="p-1 rounded-full bg-emerald-600 text-white">
                                <Check className="h-3 w-3" />
                              </span>
                            )}
                          </div>

                          {/* Preview sample text in preset style */}
                          <div className="p-2 rounded-xl bg-slate-50 border border-slate-100 flex items-center justify-center">
                            <span
                              style={getHeaderTitleStyle({
                                colorMode: 'preset',
                                presetId: preset.id,
                                effect: preset.effectRecommended || 'none',
                              })}
                              className="text-sm font-black"
                            >
                              {formData.name || 'JIBON TAILOR'}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* MODE 2: SINGLE SOLID COLOR */}
              {headerConfig.colorMode === 'solid' && (
                <div className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Sliders className="h-4 w-4 text-emerald-700" />
                    <span>{isEn ? 'Choose Solid Color' : 'সলিড একক কালার নির্বাচন করুন'}</span>
                  </h4>

                  <div className="flex flex-wrap items-center gap-3">
                    <div className="flex items-center gap-2">
                      <input
                        type="color"
                        value={headerConfig.solidColor || '#064e3b'}
                        onChange={(e) =>
                          setHeaderConfig({ ...headerConfig, solidColor: e.target.value })
                        }
                        className="w-12 h-10 p-0 rounded-xl border border-slate-300 cursor-pointer"
                      />
                      <input
                        type="text"
                        value={headerConfig.solidColor || '#064e3b'}
                        onChange={(e) =>
                          setHeaderConfig({ ...headerConfig, solidColor: e.target.value })
                        }
                        placeholder="#064e3b"
                        className="w-28 rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold uppercase text-slate-900 outline-none focus:border-emerald-600"
                      />
                    </div>

                    {/* Quick Palette Swatches */}
                    <div className="flex flex-wrap items-center gap-2">
                      {[
                        '#064e3b',
                        '#047857',
                        '#0284c7',
                        '#1e3a8a',
                        '#6d28d9',
                        '#be123c',
                        '#e11d48',
                        '#d97706',
                        '#0f766e',
                        '#090d16',
                      ].map((colorHex) => (
                        <button
                          key={colorHex}
                          type="button"
                          onClick={() =>
                            setHeaderConfig({ ...headerConfig, solidColor: colorHex })
                          }
                          className="w-8 h-8 rounded-xl border border-black/20 shadow-xs transition hover:scale-110 active:scale-95"
                          style={{ backgroundColor: colorHex }}
                          title={colorHex}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* MODE 3: CUSTOM MULTI-COLOR GRADIENT BUILDER */}
              {headerConfig.colorMode === 'custom-gradient' && (
                <div className="space-y-4 p-5 rounded-2xl bg-slate-50 border border-slate-200">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <Palette className="h-4 w-4 text-emerald-700" />
                    <span>{isEn ? 'Custom Gradient Color Mixer' : 'কাস্টম মাল্টিকালার গ্রেডিয়েন্ট মিক্সার'}</span>
                  </h4>

                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                    {/* Start Color */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isEn ? 'Gradient Start (From Color)' : 'গ্রেডিয়েন্ট শুরুর কালার'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={headerConfig.gradientFrom || '#047857'}
                          onChange={(e) =>
                            setHeaderConfig({ ...headerConfig, gradientFrom: e.target.value })
                          }
                          className="w-10 h-9 p-0 rounded-xl border border-slate-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={headerConfig.gradientFrom || '#047857'}
                          onChange={(e) =>
                            setHeaderConfig({ ...headerConfig, gradientFrom: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold uppercase text-slate-900"
                        />
                      </div>
                    </div>

                    {/* End Color */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isEn ? 'Gradient End (To Color)' : 'গ্রেডিয়েন্ট শেষের কালার'}
                      </label>
                      <div className="flex items-center gap-2">
                        <input
                          type="color"
                          value={headerConfig.gradientTo || '#d97706'}
                          onChange={(e) =>
                            setHeaderConfig({ ...headerConfig, gradientTo: e.target.value })
                          }
                          className="w-10 h-9 p-0 rounded-xl border border-slate-300 cursor-pointer"
                        />
                        <input
                          type="text"
                          value={headerConfig.gradientTo || '#d97706'}
                          onChange={(e) =>
                            setHeaderConfig({ ...headerConfig, gradientTo: e.target.value })
                          }
                          className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-bold uppercase text-slate-900"
                        />
                      </div>
                    </div>

                    {/* Angle Selector */}
                    <div>
                      <label className="block text-xs font-bold text-slate-700 mb-1">
                        {isEn ? 'Gradient Angle' : 'গ্রেডিয়েন্ট অ্যাঙ্গেল'}
                      </label>
                      <select
                        value={headerConfig.gradientAngle || '135deg'}
                        onChange={(e) =>
                          setHeaderConfig({ ...headerConfig, gradientAngle: e.target.value })
                        }
                        className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-bold text-slate-800 outline-none"
                      >
                        <option value="90deg">{isEn ? '90° Left to Right' : '৯০° বাম থেকে ডান'}</option>
                        <option value="135deg">{isEn ? '135° Diagonal (Recommended)' : '১৩৫° কোণাকুণি (উত্তম)'}</option>
                        <option value="180deg">{isEn ? '180° Top to Bottom' : '১৮০° উপর থেকে নিচে'}</option>
                        <option value="45deg">{isEn ? '45° Up Diagonal' : '৪৫° আপ ডায়াগনাল'}</option>
                      </select>
                    </div>
                  </div>
                </div>
              )}

              {/* TEXT EFFECTS & SHADOW CUSTOMIZATION */}
              <div className="p-5 rounded-2xl bg-white border border-slate-200 space-y-4 shadow-sm">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <SunMedium className="h-4 w-4 text-amber-500" />
                  <span>{isEn ? 'Text Shadow & 3D Lighting Effects' : 'টেক্সট স্যাডো ও থ্রিডি লাইটিং ইফেক্টস'}</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2.5">
                  {[
                    { id: 'none', labelBn: 'ক্লিন (নো স্যাডো)', labelEn: 'Clean Standard' },
                    { id: 'soft-shadow', labelBn: 'সফট ৩ডি স্যাডো', labelEn: 'Soft 3D Shadow' },
                    { id: 'glow', labelBn: 'লাক্সারি গ্লো', labelEn: 'Luxury Glow' },
                    { id: '3d-emboss', labelBn: 'থ্রিডি খোদাই (Emboss)', labelEn: '3D Emboss' },
                    { id: 'neon', labelBn: 'সাইবার নিয়ন লাইট', labelEn: 'Neon Light' },
                  ].map((eff) => {
                    const isSelected = (headerConfig.effect || 'none') === eff.id;
                    return (
                      <button
                        key={eff.id}
                        type="button"
                        onClick={() =>
                          setHeaderConfig({
                            ...headerConfig,
                            effect: eff.id as HeaderColorConfig['effect'],
                          })
                        }
                        className={`p-3 rounded-xl border text-xs font-bold transition btn-shadow text-center ${
                          isSelected
                            ? 'bg-emerald-800 text-white border-emerald-800 shadow-sm'
                            : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                        }`}
                      >
                        {isEn ? eff.labelEn : eff.labelBn}
                      </button>
                    );
                  })}
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-slate-100">
                  {/* Letter Spacing */}
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isEn ? 'Letter Spacing' : 'অক্ষরের ব্যবধান (Letter Spacing)'}
                    </label>
                    <select
                      value={headerConfig.letterSpacing || 'normal'}
                      onChange={(e) =>
                        setHeaderConfig({
                          ...headerConfig,
                          letterSpacing: e.target.value as HeaderColorConfig['letterSpacing'],
                        })
                      }
                      className="w-full rounded-xl border border-slate-300 px-3 py-2 text-xs font-semibold text-slate-800 outline-none"
                    >
                      <option value="normal">{isEn ? 'Normal Spacing' : 'সাধারণ স্বাভাবিক'}</option>
                      <option value="wide">{isEn ? 'Wide Spacing' : 'প্রশস্ত (Wide)'}</option>
                      <option value="wider">{isEn ? 'Extra Wide Spacing' : 'অতিরিক্ত প্রশস্ত (Wider)'}</option>
                    </select>
                  </div>

                  {/* Quick Action Button */}
                  <div className="flex items-end">
                    <button
                      type="button"
                      onClick={() => handleSaveHeaderStyle()}
                      className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white text-xs font-bold transition btn-shadow-emerald"
                    >
                      <Save className="h-4 w-4" />
                      <span>{isEn ? 'Apply & Save Header Style' : 'হেডার স্টাইল সেভ করুন'}</span>
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SYSTEM LANGUAGE SETTINGS */}
      {activeSubTab === 'language' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <Globe className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {isEn ? 'System Language & Localization' : 'অ্যাপের ভাষা ও আন্তর্জাতিকীকরণ (Languages)'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isEn
                      ? 'Select your preferred language. All menus, invoices, and buttons will adapt instantly.'
                      : 'আপনার পছন্দের ভাষা নির্বাচন করুন। অ্যাপের সকল মেনু, হিসাব ও বোতাম তাৎক্ষণিক পরিবর্তিত হবে।'}
                  </p>
                </div>
              </div>
            </div>

            {/* Language Cards Grid */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {LANGUAGES.map((langItem) => {
                const isSelected = lang === langItem.code;
                return (
                  <div
                    key={langItem.code}
                    onClick={() => {
                      if (onChangeLang) {
                        onChangeLang(langItem.code);
                      }
                    }}
                    className={`relative p-5 rounded-2xl border-2 transition cursor-pointer flex flex-col justify-between ${
                      isSelected
                        ? 'border-emerald-700 bg-emerald-50/80 shadow-md ring-2 ring-emerald-600/20'
                        : 'border-slate-200 bg-slate-50/60 hover:bg-slate-100 hover:border-slate-300'
                    }`}
                  >
                    <div>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-3xl">{langItem.flag}</span>
                        {isSelected && (
                          <span className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-700 text-white text-xs font-black">
                            <Check className="h-3.5 w-3.5" />
                            {isEn ? 'Active' : 'চালু আছে'}
                          </span>
                        )}
                      </div>
                      <h3 className="text-base font-black text-slate-900">
                        {langItem.nativeName}
                      </h3>
                      <p className="text-xs font-semibold text-slate-500 mt-0.5">
                        {langItem.label} ({langItem.code})
                      </p>
                    </div>

                    <div className="pt-4 border-t border-slate-200/60 mt-4 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-600">
                        {langItem.code === 'BN' && 'বাংলা ভাষা (Bangladesh / West Bengal)'}
                        {langItem.code === 'EN' && 'English (International)'}
                        {langItem.code === 'HI' && 'हिन्दी भाषा (India)'}
                        {langItem.code === 'AR' && 'اللغة العربية (Middle East / Gulf)'}
                      </span>
                      <button
                        type="button"
                        className={`px-3 py-1.5 rounded-xl text-xs font-black transition ${
                          isSelected
                            ? 'bg-emerald-800 text-white'
                            : 'bg-white border border-slate-300 text-slate-700 hover:bg-emerald-50 hover:text-emerald-800'
                        }`}
                      >
                        {isSelected
                          ? isEn
                            ? 'Selected'
                            : 'নির্বাচিত'
                          : isEn
                          ? 'Select'
                          : 'বাছাই করুন'}
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: DRESS CATEGORIES */}
      {activeSubTab === 'dress-categories' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Scissors className="h-5 w-5 text-emerald-700" />
                  <span>{isEn ? 'Dress Categories & Tailoring Types' : 'পোশাকের ক্যাটাগরি ও মাপের তালিকা'}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {isEn
                    ? 'These dress types appear in New Order, Measurements, and Karigar tracking'
                    : 'এই ক্যাটাগরিগুলো নতুন অর্ডার, মাপ গ্রহণ ও কারিগর ট্র্যাকিংয়ে স্বয়ংক্রিয়ভাবে থাকবে'}
                </p>
              </div>

              <button
                onClick={handleResetDressCategories}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-slate-200 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{isEn ? 'Reset to Defaults' : 'ডিফল্ট রিসেট'}</span>
              </button>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleAddDressCategory} className="flex gap-2 mb-6">
              <input
                type="text"
                value={newDressCategory}
                onChange={(e) => setNewDressCategory(e.target.value)}
                placeholder={isEn ? 'Add new dress category (e.g. Sherwani, Suit, Blazer)...' : 'নতুন পোশাকের ক্যাটাগরি লিখুন (যেমন: শেরওয়ানি বা ব্লেজার)...'}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 shadow-2xs"
              />
              <button
                type="submit"
                className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-sm transition"
              >
                <Plus className="h-4 w-4" />
                <span>{isEn ? 'Add Category' : 'যোগ করুন'}</span>
              </button>
            </form>

            {/* Current Categories List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {dressCategories.map((cat, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-emerald-50/30 transition shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-emerald-100 text-emerald-800 font-black text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800">{cat}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteDressCategory(cat)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title={isEn ? 'Delete Category' : 'ক্যাটাগরি মুছুন'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: EXPENSE & DEPOSIT CATEGORIES */}
      {activeSubTab === 'expense-categories' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-4 border-b border-slate-100 mb-6">
              <div>
                <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
                  <Receipt className="h-5 w-5 text-emerald-700" />
                  <span>{isEn ? 'Expense & Cash Deposit Categories' : 'দৈনিক খরচ ও ক্যাশ জমার ক্যাটাগরি'}</span>
                </h2>
                <p className="text-xs text-slate-500">
                  {isEn
                    ? 'Categories for shop running costs, material purchases, rent, and capital cash deposits'
                    : 'দোকান ভাড়া, কাপড় ক্রয়, সুতা, মেশিনের পার্টস ও ক্যাশ মূলধন জমার ক্যাটাগরি তালিকা'}
                </p>
              </div>

              <button
                onClick={handleResetExpenseCategories}
                className="flex items-center gap-1 text-xs font-bold text-slate-600 hover:text-emerald-800 bg-slate-100 hover:bg-emerald-50 px-3 py-1.5 rounded-xl border border-slate-200 transition"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>{isEn ? 'Reset to Defaults' : 'ডিফল্ট রিসেট'}</span>
              </button>
            </div>

            {/* Add Category Form */}
            <form onSubmit={handleAddExpenseCategory} className="flex gap-2 mb-6">
              <input
                type="text"
                value={newExpenseCategory}
                onChange={(e) => setNewExpenseCategory(e.target.value)}
                placeholder={isEn ? 'Add new expense category (e.g. Internet Bill, Machine Repair)...' : 'নতুন খরচ বা জমার ক্যাটাগরি লিখুন...'}
                className="flex-1 rounded-xl border border-slate-300 px-4 py-2.5 text-xs sm:text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600 shadow-2xs"
              />
              <button
                type="submit"
                className="flex items-center gap-1 px-5 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs shadow-sm transition"
              >
                <Plus className="h-4 w-4" />
                <span>{isEn ? 'Add Category' : 'যোগ করুন'}</span>
              </button>
            </form>

            {/* Current Categories List */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {expenseCategories.map((cat, idx) => (
                <div
                  key={idx}
                  className="flex items-center justify-between p-3.5 rounded-xl border border-slate-200 bg-slate-50/70 hover:bg-amber-50/30 transition shadow-2xs"
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-6 h-6 rounded-lg bg-amber-100 text-amber-900 font-black text-xs flex items-center justify-center">
                      {idx + 1}
                    </span>
                    <span className="text-xs sm:text-sm font-bold text-slate-800">{cat}</span>
                  </div>
                  <button
                    onClick={() => handleDeleteExpenseCategory(cat)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                    title={isEn ? 'Delete Category' : 'ক্যাটাগরি মুছুন'}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: SHOP PROFILE & CR */}
      {activeSubTab === 'shop-profile' && (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
            <Logo size="md" />
            <div>
              <h2 className="text-base font-bold text-slate-900">{t.shopProfile}</h2>
              <p className="text-xs text-slate-500">
                {isEn
                  ? 'This information will be displayed on invoices, receipts and catalog cards.'
                  : 'এই তথ্যগুলো ইনভয়েস ও ক্যাটালগ কার্ডে প্রদর্শিত হবে'}
              </p>
            </div>
          </div>

          <form onSubmit={handleShopSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <Store className="h-3.5 w-3.5 text-emerald-700" />
                {isEn ? 'Shop / Business Name *' : 'দোকান বা ব্র্যান্ডের নাম *'}
              </label>
              <input
                type="text"
                required
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <Phone className="h-3.5 w-3.5 text-emerald-700" />
                  {isEn ? 'Shop Mobile (WhatsApp) *' : 'দোকানের মোবাইল নাম্বার (WhatsApp) *'}
                </label>
                <input
                  type="tel"
                  required
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-semibold text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <FileBadge className="h-3.5 w-3.5 text-emerald-700" />
                  {isEn ? 'Trade License / CR / Tax No' : 'ট্রেড লাইসেন্স / CR / ভ্যাট নং'}
                </label>
                <input
                  type="text"
                  value={formData.crNumber}
                  onChange={(e) => setFormData({ ...formData, crNumber: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                <MapPin className="h-3.5 w-3.5 text-emerald-700" />
                {isEn ? 'Full Shop Address' : 'দোকানের সম্পূর্ণ ঠিকানা'}
              </label>
              <input
                type="text"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1 flex items-center gap-1.5">
                  <DollarSign className="h-3.5 w-3.5 text-emerald-700" />
                  {isEn ? 'Currency Symbol (e.g. $, OMR, SAR, BDT)' : 'কারেন্সি সিম্বল (যেমন: ৳ বা SAR বা $)'}
                </label>
                <input
                  type="text"
                  value={formData.currency}
                  onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-black text-emerald-800 outline-none focus:border-emerald-600"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  {isEn ? 'Default VAT / Tax (%)' : 'ডিফল্ট ভ্যাট / ট্যাক্স (%)'}
                </label>
                <input
                  type="number"
                  step="any"
                  value={formData.taxRatePercent}
                  onChange={(e) =>
                    setFormData({ ...formData, taxRatePercent: parseFloat(e.target.value) || 0 })
                  }
                  className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm text-slate-900 outline-none focus:border-emerald-600"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                {isEn ? 'Invoice Footer Terms & Note' : 'ইনভয়েস ফুটার নোট / শর্তাবলী'}
              </label>
              <textarea
                rows={2}
                value={formData.footerNote}
                onChange={(e) => setFormData({ ...formData, footerNote: e.target.value })}
                className="w-full rounded-xl border border-slate-300 px-3.5 py-2 text-xs text-slate-800 outline-none focus:border-emerald-600"
              />
            </div>

            {/* Shop Profile Text Color Selector */}
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
              <label className="block text-xs font-bold text-slate-900 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Palette className="h-4 w-4 text-emerald-700" />
                  {isEn ? 'Shop Profile Title & Text Color' : 'দোকানের প্রোফাইল ব্যানার লেখার কালার'}
                </span>
                <span className="text-[11px] font-mono text-slate-500">{formData.profileTextColor || '#ffffff'}</span>
              </label>
              <p className="text-[11px] text-slate-500">
                {isEn 
                  ? 'Customize the color of the shop name in the dashboard profile banner.'
                  : 'ড্যাশবোর্ডের দোকানের প্রোফাইল ব্যানারে নামের লেখার কালার পছন্দ করুন।'}
              </p>

              {/* Color Presets */}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                {[
                  { name: isEn ? 'Default White' : 'সাদা (ডিফল্ট)', color: '#ffffff' },
                  { name: isEn ? 'Golden Luxury' : 'গোল্ডেন লাক্সারি', color: '#fbbf24' },
                  { name: isEn ? 'Amber Yellow' : 'অ্যাম্বার হলুদ', color: '#f59e0b' },
                  { name: isEn ? 'Sky Blue / Cyan' : 'আকাশি সায়ান', color: '#38bdf8' },
                  { name: isEn ? 'Emerald Mint' : 'মিন্ট গ্রিন', color: '#34d399' },
                  { name: isEn ? 'Rose Pink' : 'গোলাপি রোজ', color: '#fb7185' },
                  { name: isEn ? 'Royal Purple' : 'রয়্যাল পার্পল', color: '#c084fc' },
                  { name: isEn ? 'Neon Lime' : 'নিয়ন লাইম', color: '#a3e635' },
                ].map((item) => {
                  const isSelected = (formData.profileTextColor || '#ffffff').toLowerCase() === item.color.toLowerCase();
                  return (
                    <button
                      key={item.color}
                      type="button"
                      onClick={() => setFormData({ ...formData, profileTextColor: item.color })}
                      className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold transition border ${
                        isSelected
                          ? 'border-emerald-600 bg-emerald-50 text-emerald-950 ring-2 ring-emerald-500/30 font-black'
                          : 'border-slate-200 bg-white text-slate-700 hover:bg-slate-100'
                      }`}
                    >
                      <span
                        className="w-3.5 h-3.5 rounded-full border border-black/20 shrink-0"
                        style={{ backgroundColor: item.color }}
                      />
                      <span>{item.name}</span>
                    </button>
                  );
                })}
              </div>

              {/* Custom Color Input */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-200">
                <span className="text-xs font-bold text-slate-700">{isEn ? 'Custom Color Picker:' : 'কাস্টম কালার পিকার:'}</span>
                <input
                  type="color"
                  value={formData.profileTextColor || '#ffffff'}
                  onChange={(e) => setFormData({ ...formData, profileTextColor: e.target.value })}
                  className="w-10 h-8 p-0 rounded-lg border border-slate-300 cursor-pointer"
                />
                <input
                  type="text"
                  value={formData.profileTextColor || '#ffffff'}
                  onChange={(e) => setFormData({ ...formData, profileTextColor: e.target.value })}
                  placeholder="#ffffff"
                  className="w-24 rounded-lg border border-slate-300 px-2.5 py-1 text-xs font-mono font-bold text-slate-900"
                />
              </div>

              {/* Live Preview of Banner Text */}
              <div className="rounded-xl bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 p-3.5 mt-2 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-300 block">{isEn ? 'Banner Preview' : 'ব্যানার প্রিভিউ'}:</span>
                  <span
                    className="text-lg font-black tracking-tight"
                    style={{ color: formData.profileTextColor || '#ffffff' }}
                  >
                    {formData.name || 'JIBON TAILOR'}
                  </span>
                </div>
                <span
                  className="px-2.5 py-1 rounded-lg text-xs font-bold border"
                  style={{
                    color: formData.profileTextColor || '#ffffff',
                    borderColor: formData.profileTextColor || '#ffffff',
                  }}
                >
                  {isEn ? 'Sample' : 'নমুনা'}
                </span>
              </div>
            </div>

            <div className="pt-4 border-t border-slate-100 flex justify-end">
              <button
                type="submit"
                className="flex items-center gap-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 px-6 py-2.5 text-xs font-bold text-white shadow-md transition"
              >
                <Save className="h-4 w-4" />
                {isEn ? 'Save Changes' : 'সংরক্ষণ করুন'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* TAB 5: ADMIN SECURITY & PASSWORD */}
      {activeSubTab === 'admin-security' && (
        <div className="space-y-6">
          {/* Security Status Card */}
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-6">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-2xl bg-emerald-50 text-emerald-800 border border-emerald-200">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">
                    {isEn ? 'Admin Panel Password & Security' : 'এডমিন প্যানেল পাসওয়ার্ড ও নিরাপত্তা'}
                  </h2>
                  <p className="text-xs text-slate-500">
                    {isEn
                      ? 'Secure your tailoring business records with admin passcode protection'
                      : 'দোকানের ইনভয়েস, কালেকশন ও হিসাব সুরক্ষিত রাখতে পাসওয়ার্ড চালু রাখুন'}
                  </p>
                </div>
              </div>

              <button
                onClick={onLockApp}
                className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition shadow-sm"
              >
                <Lock className="h-3.5 w-3.5 text-amber-400" />
                <span>{isEn ? 'Lock App Now' : 'এখনই লক করুন'}</span>
              </button>
            </div>

            {/* PIN Protection Toggle */}
            <div className="flex items-center justify-between p-4 rounded-xl bg-slate-50 border border-slate-200 mb-6">
              <div>
                <h4 className="text-sm font-bold text-slate-900">
                  {isEn ? 'Require Password on Startup' : 'অ্যাপ ওপেন করার সময় পাসওয়ার্ড আবশ্যক'}
                </h4>
                <p className="text-xs text-slate-500">
                  {isEn
                    ? 'When enabled, users must enter admin PIN when launching the application'
                    : 'চালু থাকলে অ্যাপ ওপেন করার সাথে সাথে এডমিন পাসওয়ার্ড চাইবে'}
                </p>
              </div>

              <label className="relative inline-flex items-center cursor-pointer">
                <input
                  type="checkbox"
                  checked={pinProtectionEnabled}
                  onChange={(e) => onTogglePinProtection(e.target.checked)}
                  className="sr-only peer"
                />
                <div className="w-11 h-6 bg-slate-300 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-emerald-700"></div>
              </label>
            </div>

            {/* Change PIN Form */}
            <div className="pt-2">
              <h3 className="text-sm font-bold text-slate-900 mb-3 flex items-center gap-2">
                <KeyRound className="h-4 w-4 text-emerald-700" />
                <span>{isEn ? 'Change Admin PIN / Password' : 'এডমিন পাসওয়ার্ড পরিবর্তন করুন'}</span>
              </h3>

              {pinChangeMsg && (
                <div
                  className={`p-3 rounded-xl text-xs font-bold mb-4 flex items-center gap-2 ${
                    pinChangeMsg.isError
                      ? 'bg-rose-100 text-rose-900 border border-rose-300'
                      : 'bg-emerald-100 text-emerald-900 border border-emerald-300'
                  }`}
                >
                  <Check className="h-4 w-4 shrink-0" />
                  <span>{pinChangeMsg.text}</span>
                </div>
              )}

              <form onSubmit={handleChangePin} className="space-y-4 max-w-md">
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1">
                    {isEn ? 'Current PIN / Password *' : 'বর্তমান পাসওয়ার্ড / পিন *'}
                  </label>
                  <input
                    type="password"
                    required
                    value={currentPinInput}
                    onChange={(e) => setCurrentPinInput(e.target.value)}
                    placeholder={isEn ? 'Enter current PIN' : 'বর্তমান পিন দিন'}
                    className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-600"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isEn ? 'New PIN (4-8 digits) *' : 'নতুন পিন (৪-৮ ডিজিট) *'}
                    </label>
                    <input
                      type="password"
                      required
                      value={newPinInput}
                      onChange={(e) => setNewPinInput(e.target.value)}
                      placeholder={isEn ? 'e.g. 5678' : 'যেমন: 5678'}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">
                      {isEn ? 'Confirm New PIN *' : 'নতুন পিন পুনরায় লিখুন *'}
                    </label>
                    <input
                      type="password"
                      required
                      value={confirmPinInput}
                      onChange={(e) => setConfirmPinInput(e.target.value)}
                      placeholder={isEn ? 'Confirm PIN' : 'কনফার্ম পিন'}
                      className="w-full rounded-xl border border-slate-300 px-3.5 py-2.5 text-sm font-bold text-slate-900 outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-3 pt-2">
                  <button
                    type="submit"
                    className="flex items-center gap-2 rounded-xl bg-emerald-800 hover:bg-emerald-900 px-5 py-2.5 text-xs font-bold text-white shadow-sm transition"
                  >
                    <Save className="h-4 w-4" />
                    <span>{isEn ? 'Update Admin PIN' : 'পাসওয়ার্ড আপডেট করুন'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={handleRestoreDefaultPin}
                    className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-slate-100 hover:bg-slate-200 px-4 py-2.5 text-xs font-bold text-slate-700 transition"
                  >
                    <RotateCcw className="h-3.5 w-3.5 text-slate-600" />
                    <span>{isEn ? 'Restore Default PIN' : 'ডিফল্ট পিন রিস্টোর করুন'}</span>
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* TAB 6: BACKUP & DATA */}
      {activeSubTab === 'backup' && (
        <div className="space-y-6">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center gap-3 pb-4 border-b border-slate-100 mb-6">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-800">
                <Database className="h-5 w-5" />
              </div>
              <div>
                <h2 className="text-base font-bold text-slate-900">
                  {isEn ? 'System Backup & Data Export' : 'ডাটাবেজ ব্যাকআপ ও রিস্টোর'}
                </h2>
                <p className="text-xs text-slate-500">
                  {isEn
                    ? 'Safely export all shop records, invoices, tailor wage ledgers and expenses to JSON file.'
                    : 'দোকানের সকল হিসাব, ইনভয়েস ও কারিগর রেকর্ড অফলাইন ফাইল হিসেবে সংরক্ষণ বা রিস্টোর করুন।'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Download Backup */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Download className="h-4 w-4 text-emerald-700" />
                    <span>{isEn ? 'Export Full Backup JSON' : 'সম্পূর্ণ ব্যাকআপ ডাউনলোড'}</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {isEn
                      ? 'Download all current data (Invoices, Customers, Karigar Ledger, Expenses, Catalog) in one file.'
                      : 'সকল ডাটা (অর্ডার, কাস্টমার, কারিগর ও খরচ হিসাব) নিরাপদ ফাইলে ডাউনলোড করে রাখুন।'}
                  </p>
                </div>
                <div className="pt-4">
                  <button
                    onClick={handleExportBackupClick}
                    disabled={isExportingBackup}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-emerald-800 hover:bg-emerald-900 disabled:bg-emerald-700 text-white text-xs font-bold shadow-sm transition"
                  >
                    {isExportingBackup ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span>{isEn ? 'Generating Backup...' : 'ব্যাকআপ তৈরি ও ডাউনলোড হচ্ছে...'}</span>
                      </>
                    ) : (
                      <>
                        <Download className="h-4 w-4" />
                        <span>{isEn ? 'Download Backup File' : 'ব্যাকআপ ফাইল ডাউনলোড করুন'}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Restore Backup */}
              <div className="p-5 rounded-2xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <Upload className="h-4 w-4 text-indigo-700" />
                    <span>{isEn ? 'Restore Backup File' : 'ব্যাকআপ ফাইল থেকে রিস্টোর'}</span>
                  </h3>
                  <p className="text-xs text-slate-600 mt-1">
                    {isEn
                      ? 'Restore previous data from a previously downloaded .json backup file.'
                      : 'পূর্বের ডাউনলোড করা .json ব্যাকআপ ফাইল সিলেক্ট করে পূর্বের অবস্থায় ফিরে যান।'}
                  </p>
                </div>
                <div className="pt-4">
                  <input
                    type="file"
                    ref={restoreFileRef}
                    accept=".json,application/json,text/plain"
                    className="hidden"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file && onImportBackup) {
                        onImportBackup(file);
                        e.target.value = '';
                      }
                    }}
                  />
                  <button
                    onClick={() => restoreFileRef.current?.click()}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold shadow-sm transition"
                  >
                    <Upload className="h-4 w-4" />
                    <span>{isEn ? 'Select & Restore File' : 'ফাইল নির্বাচন ও রিস্টোর করুন'}</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Notice & Instructions Banner */}
            <div className="mt-6 p-4 rounded-xl bg-emerald-50/90 border border-emerald-200 text-emerald-950 text-xs leading-relaxed space-y-2">
              <div className="font-bold flex items-center gap-2 text-emerald-900 text-sm">
                <CheckCircle2 className="h-4 w-4 text-emerald-700 shrink-0" />
                <span>{isEn ? 'Important Notice for Backup & Restore' : 'জরুরি ব্যাকআপ ও রিস্টোর নোটিশ'}</span>
              </div>
              <p className="text-slate-700">
                {isEn
                  ? '• Data Backup: Tapping "Download Backup File" automatically saves a safe .json copy of all your orders, invoices, tailor wage ledgers, and expenses into your device Downloads folder. On Android, a share sheet also opens so you can immediately save to Google Drive or send to WhatsApp.'
                  : '• ডাটা ব্যাকআপ: "ব্যাকআপ ফাইল ডাউনলোড করুন" বাটনে ট্যাপ করলে স্বয়ংক্রিয়ভাবে একটি .json ফাইল আপনার ডিভাইসের Downloads ফোল্ডারে সংরক্ষিত হবে। অ্যান্ড্রয়েড অ্যাপে সাথে সাথে নোটিশ আসবে এবং Google Drive বা WhatsApp এও সেভ করে রাখার অপশন পাবেন।'}
              </p>
              <p className="text-slate-700">
                {isEn
                  ? '• Data Restore: Tapping "Select & Restore File" opens your phone file manager. Select your previously downloaded .json backup file to instantly restore all shop records.'
                  : '• ডাটা রিস্টোর: "ফাইল নির্বাচন ও রিস্টোর করুন" বাটনে ট্যাপ করলে আপনার ফোনের ফাইল ম্যানেজার বা ডাউনলোড ফোল্ডার ওপেন হবে। সেখান থেকে আপনার পূর্বের সংরক্ষিত .json ব্যাকআপ ফাইলটি সিলেক্ট করলেই সাথে সাথে সকল হিসাব রিস্টোর হয়ে যাবে।'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
