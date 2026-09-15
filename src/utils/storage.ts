import { Shop, Invoice, TailorRecord, Expense, CatalogItem, Measurement, BackupData, AppData, Language } from '../types';
import { initialShops, initialCatalogItems, initialInvoices, initialTailorRecords, initialExpenses } from '../data/initialData';
import { isAndroidNativeApp, nativeSaveBackup } from './nativeBridge';

const STORAGE_KEYS = {
  SHOPS: 'jibon_tailor_shops',
  ACTIVE_SHOP_ID: 'jibon_tailor_active_shop_id',
  INVOICES: 'jibon_tailor_invoices',
  TAILORS: 'jibon_tailor_records',
  EXPENSES: 'jibon_tailor_expenses',
  CATALOG: 'jibon_tailor_catalog',
  STANDALONE_MEASUREMENTS: 'jibon_tailor_standalone_measurements',
  LANGUAGE: 'jibon_tailor_lang',
  ADMIN_PIN: 'jibon_tailor_admin_pin',
  PIN_PROTECTION_ENABLED: 'jibon_tailor_pin_enabled',
  IS_LOGGED_IN: 'jibon_tailor_admin_logged_in',
  CUSTOM_DRESS_TYPES: 'jibon_tailor_custom_dress_types',
  CUSTOM_EXPENSE_CATEGORIES: 'jibon_tailor_custom_expense_categories',
  AI_SETTINGS: 'jibon_tailor_ai_settings',
  AI_CHAT_HISTORY: 'jibon_tailor_ai_chat_history',
};

export const getStoredData = (): AppData => {
  return {
    shops: getStoredShops(),
    activeShopId: getStoredActiveShopId(),
    invoices: getStoredInvoices(),
    tailorRecords: getStoredTailorRecords(),
    expenses: getStoredExpenses(),
    catalog: getStoredCatalog(),
    measurements: getStoredMeasurements(),
    language: getStoredLanguage(),
  };
};

export const saveStoredData = (data: AppData) => {
  saveStoredShops(data.shops);
  saveStoredActiveShopId(data.activeShopId);
  saveStoredInvoices(data.invoices);
  saveStoredTailorRecords(data.tailorRecords);
  saveStoredExpenses(data.expenses);
  saveStoredCatalog(data.catalog);
  saveStoredMeasurements(data.measurements);
  saveStoredLanguage(data.language);
};

export interface BackupExportResult {
  success: boolean;
  filename: string;
  isNative: boolean;
  message?: string;
}

export const exportDataToJson = async (data: AppData): Promise<BackupExportResult> => {
  const backup: BackupData = {
    version: 1,
    exportedAt: Date.now(),
    app: 'JIBON_TAILOR_MANAGEMENT',
    shops: data.shops,
    invoices: data.invoices,
    tailorRecords: data.tailorRecords,
    expenses: data.expenses,
    catalogItems: data.catalog,
    measurements: data.measurements,
  };
  const jsonStr = JSON.stringify(backup, null, 2);
  const dateStr = new Date().toISOString().split('T')[0];
  const filename = `jibon_tailor_backup_${dateStr}.json`;

  // 1. Android APK Native Bridge
  if (isAndroidNativeApp()) {
    const saved = nativeSaveBackup(jsonStr, filename);
    if (saved) {
      return {
        success: true,
        filename,
        isNative: true,
        message: `ব্যাকআপ ফাইল "${filename}" সফলভাবে ডাউনলোড ও সেভ করা হয়েছে`,
      };
    }
  }

  // 2. Browser Environment Fallback
  try {
    const blob = new Blob([jsonStr], { type: 'application/json' });

    // Web Share API support check on modern mobile browsers
    if (typeof navigator !== 'undefined' && navigator.share && navigator.canShare) {
      try {
        const file = new File([blob], filename, { type: 'application/json' });
        if (navigator.canShare({ files: [file] })) {
          await navigator.share({
            files: [file],
            title: 'Jibon Tailor Backup',
            text: `জীবন টেইলার ব্যাকআপ ডাটা (${dateStr})`,
          });
          return {
            success: true,
            filename,
            isNative: false,
            message: `ব্যাকআপ ফাইল "${filename}" শেয়ার ও সেভ করা হয়েছে`,
          };
        }
      } catch (shareErr: any) {
        if (shareErr.name === 'AbortError') {
          return {
            success: true,
            filename,
            isNative: false,
            message: `ব্যাকআপ ফাইল প্রস্তুত হয়েছে`,
          };
        }
      }
    }

    // Standard HTML5 Download anchor
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);

    return {
      success: true,
      filename,
      isNative: false,
      message: `ব্যাকআপ ফাইল "${filename}" সফলভাবে ডাউনলোড হয়েছে`,
    };
  } catch (err: any) {
    console.error('Failed to export backup:', err);
    throw new Error(err?.message || 'Failed to export backup');
  }
};

export const importDataFromJson = (file: File): Promise<AppData> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);
        if (parsed && parsed.shops && parsed.invoices) {
          const appData: AppData = {
            shops: parsed.shops || initialShops,
            activeShopId: parsed.shops?.[0]?.id || '1',
            invoices: parsed.invoices || [],
            tailorRecords: parsed.tailorRecords || [],
            expenses: parsed.expenses || [],
            catalog: parsed.catalogItems || [],
            measurements: parsed.measurements || [],
            language: 'BN',
          };
          saveStoredData(appData);
          resolve(appData);
        } else {
          reject(new Error('Invalid backup schema'));
        }
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = () => reject(new Error('Failed to read file'));
    reader.readAsText(file);
  });
};

export const getStoredShops = (): Shop[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.SHOPS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(initialShops));
      return initialShops;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error(e);
    return initialShops;
  }
};

export const saveStoredShops = (shops: Shop[]) => {
  localStorage.setItem(STORAGE_KEYS.SHOPS, JSON.stringify(shops));
};

export const getStoredActiveShopId = (): string => {
  return localStorage.getItem(STORAGE_KEYS.ACTIVE_SHOP_ID) || '1';
};

export const saveStoredActiveShopId = (id: string) => {
  localStorage.setItem(STORAGE_KEYS.ACTIVE_SHOP_ID, id);
};

export const getStoredInvoices = (): Invoice[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.INVOICES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(initialInvoices));
      return initialInvoices;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error(e);
    return initialInvoices;
  }
};

export const saveStoredInvoices = (invoices: Invoice[]) => {
  localStorage.setItem(STORAGE_KEYS.INVOICES, JSON.stringify(invoices));
};

export const getStoredTailorRecords = (): TailorRecord[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.TAILORS);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.TAILORS, JSON.stringify(initialTailorRecords));
      return initialTailorRecords;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error(e);
    return initialTailorRecords;
  }
};

export const saveStoredTailorRecords = (records: TailorRecord[]) => {
  localStorage.setItem(STORAGE_KEYS.TAILORS, JSON.stringify(records));
};

export const getStoredExpenses = (): Expense[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.EXPENSES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(initialExpenses));
      return initialExpenses;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error(e);
    return initialExpenses;
  }
};

export const saveStoredExpenses = (expenses: Expense[]) => {
  localStorage.setItem(STORAGE_KEYS.EXPENSES, JSON.stringify(expenses));
};

export const getStoredCatalog = (): CatalogItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CATALOG);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(initialCatalogItems));
      return initialCatalogItems;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error(e);
    return initialCatalogItems;
  }
};

export const saveStoredCatalog = (items: CatalogItem[]) => {
  localStorage.setItem(STORAGE_KEYS.CATALOG, JSON.stringify(items));
};

export const getStoredMeasurements = (): Measurement[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.STANDALONE_MEASUREMENTS);
    let list: Measurement[] = [];
    if (!raw) {
      const initMeas = initialInvoices.map((i) => i.measurement).filter(Boolean) as Measurement[];
      list = initMeas;
      localStorage.setItem(STORAGE_KEYS.STANDALONE_MEASUREMENTS, JSON.stringify(initMeas));
    } else {
      list = JSON.parse(raw);
    }
    // Backward-compatibility normalization: ensure profileName exists
    return list.map((m) => ({
      ...m,
      profileName: m.profileName || `${m.dressType || 'Tailoring'} Profile`,
      isDefault: !!m.isDefault,
      createdAt: m.createdAt || m.updatedAt || Date.now(),
    }));
  } catch (e) {
    console.error(e);
    return [];
  }
};

export const saveStoredMeasurements = (measurements: Measurement[]) => {
  localStorage.setItem(STORAGE_KEYS.STANDALONE_MEASUREMENTS, JSON.stringify(measurements));
};

export const saveSingleMeasurementProfile = (profile: Measurement): Measurement[] => {
  const current = getStoredMeasurements();
  const existingIdx = current.findIndex((p) => p.id === profile.id);
  let updated: Measurement[];
  if (existingIdx >= 0) {
    updated = current.map((p) => (p.id === profile.id ? { ...profile, updatedAt: Date.now() } : p));
  } else {
    updated = [{ ...profile, createdAt: profile.createdAt || Date.now(), updatedAt: Date.now() }, ...current];
  }

  // If marked as default, unset other defaults for the same customer
  if (profile.isDefault && profile.customerPhone) {
    const normPhone = profile.customerPhone.replace(/\D/g, '');
    updated = updated.map((p) => {
      if (p.id !== profile.id && p.customerPhone && p.customerPhone.replace(/\D/g, '') === normPhone) {
        return { ...p, isDefault: false };
      }
      return p;
    });
  }

  saveStoredMeasurements(updated);
  return updated;
};

export const deleteStoredMeasurementProfile = (profileId: string): Measurement[] => {
  const current = getStoredMeasurements();
  const updated = current.filter((p) => p.id !== profileId);
  saveStoredMeasurements(updated);
  return updated;
};

export const setStoredDefaultMeasurementProfile = (profileId: string, customerPhone: string): Measurement[] => {
  const current = getStoredMeasurements();
  const normPhone = customerPhone.replace(/\D/g, '');
  const updated = current.map((p) => {
    const pNorm = (p.customerPhone || '').replace(/\D/g, '');
    if (pNorm === normPhone) {
      return { ...p, isDefault: p.id === profileId };
    }
    return p;
  });
  saveStoredMeasurements(updated);
  return updated;
};

export const getStoredLanguage = (): Language => {
  const lang = localStorage.getItem(STORAGE_KEYS.LANGUAGE) as Language;
  if (lang && ['BN', 'EN', 'HI', 'AR'].includes(lang)) {
    return lang;
  }
  return 'BN';
};

export const saveStoredLanguage = (lang: Language) => {
  localStorage.setItem(STORAGE_KEYS.LANGUAGE, lang);
};

export const loadShop = (): Shop => {
  const shops = getStoredShops();
  const activeId = getStoredActiveShopId();
  return shops.find((s) => s.id === activeId) || shops[0] || initialShops[0];
};

export const saveShop = (shop: Shop) => {
  const shops = getStoredShops();
  const idx = shops.findIndex((s) => s.id === shop.id);
  let updatedShops: Shop[];
  if (idx >= 0) {
    updatedShops = shops.map((s) => (s.id === shop.id ? shop : s));
  } else {
    updatedShops = [...shops, shop];
  }
  saveStoredShops(updatedShops);
  saveStoredActiveShopId(shop.id);
};

export const loadInvoices = (): Invoice[] => getStoredInvoices();
export const saveInvoices = (invoices: Invoice[]) => saveStoredInvoices(invoices);

export const loadCatalogItems = (): CatalogItem[] => getStoredCatalog();
export const saveCatalogItems = (items: CatalogItem[]) => saveStoredCatalog(items);

export const loadTailorRecords = (): TailorRecord[] => getStoredTailorRecords();
export const saveTailorRecords = (records: TailorRecord[]) => saveStoredTailorRecords(records);

export const loadExpenses = (): Expense[] => getStoredExpenses();
export const saveExpenses = (expenses: Expense[]) => saveStoredExpenses(expenses);

export const exportFullBackupJson = async (): Promise<BackupExportResult> => {
  const data = getStoredData();
  return await exportDataToJson(data);
};

export const getStoredAdminPin = (): string => {
  return localStorage.getItem(STORAGE_KEYS.ADMIN_PIN) || '1234';
};

export const saveStoredAdminPin = (pin: string) => {
  localStorage.setItem(STORAGE_KEYS.ADMIN_PIN, pin);
};

export const getStoredPinProtectionEnabled = (): boolean => {
  const val = localStorage.getItem(STORAGE_KEYS.PIN_PROTECTION_ENABLED);
  return val === null ? true : val === 'true';
};

export const saveStoredPinProtectionEnabled = (enabled: boolean) => {
  localStorage.setItem(STORAGE_KEYS.PIN_PROTECTION_ENABLED, String(enabled));
};

export const getStoredIsAdminLoggedIn = (): boolean => {
  return sessionStorage.getItem(STORAGE_KEYS.IS_LOGGED_IN) === 'true';
};

export const saveStoredIsAdminLoggedIn = (isLoggedIn: boolean) => {
  if (isLoggedIn) {
    sessionStorage.setItem(STORAGE_KEYS.IS_LOGGED_IN, 'true');
  } else {
    sessionStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
  }
  // Clear any old permanent localStorage bypass so PIN lock works on app start
  localStorage.removeItem(STORAGE_KEYS.IS_LOGGED_IN);
};

export const DEFAULT_DRESS_CATEGORIES = [
  'জুব্বা / Thobe / Dishdasha',
  'পাঞ্জাবি / Panjabi',
  'পায়জামা / Pajama',
  'শার্ট / Formal & Casual Shirt',
  'প্যান্ট / Trouser & Pant',
  'কাবলি সেট / Kabli Suit',
  'স্যুট ও ব্লেজার / Suit & Blazer',
  'শেরওয়ানি / Sherwani',
  'থ্রি-পিস / Three-Piece',
  'বোরকা ও আবায়া / Abaya & Burqa',
  'কুর্তি ও ফ্রক / Kurti & Frock',
  'সালোয়ার কামিজ / Salwar Kameez',
  'ব্লাউজ ও পেটিকোট / Blouse & Petticoat',
  'অন্যান্য / Custom Tailoring',
];

export const getStoredDressCategories = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_DRESS_TYPES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_DRESS_TYPES, JSON.stringify(DEFAULT_DRESS_CATEGORIES));
      return DEFAULT_DRESS_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error(e);
    return DEFAULT_DRESS_CATEGORIES;
  }
};

export const saveStoredDressCategories = (cats: string[]) => {
  localStorage.setItem(STORAGE_KEYS.CUSTOM_DRESS_TYPES, JSON.stringify(cats));
};

export const DEFAULT_EXPENSE_CATEGORIES = [
  'Fabric (কাপড় ক্রয়)',
  'Thread & Buttons (সুতা ও বোতাম)',
  'Lace & Accessories (লেস ও এক্সেসরিজ)',
  'Tailor Wages (কারিগর মজুরি)',
  'Shop Rent (দোকান ভাড়া)',
  'Electricity & Utility (বিদ্যুৎ ও বিল)',
  'Tea & Refreshment (চা ও নাস্তা)',
  'Maintenance (মেশিন মেরামত ও রক্ষণাবেক্ষণ)',
  'Cash Deposit (ক্যাশ ক্যাপিটাল জমা)',
  'Owner Capital (মালিকের মূলধন)',
  'Direct Sales (সরাসরি কাপড়ের বিক্রি)',
  'Customer Advance (অগ্রিম জমা)',
  'Other (অন্যান্য)',
];

export const getStoredExpenseCategories = (): string[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.CUSTOM_EXPENSE_CATEGORIES);
    if (!raw) {
      localStorage.setItem(STORAGE_KEYS.CUSTOM_EXPENSE_CATEGORIES, JSON.stringify(DEFAULT_EXPENSE_CATEGORIES));
      return DEFAULT_EXPENSE_CATEGORIES;
    }
    return JSON.parse(raw);
  } catch (e) {
    console.error(e);
    return DEFAULT_EXPENSE_CATEGORIES;
  }
};

export const saveStoredExpenseCategories = (cats: string[]) => {
  localStorage.setItem(STORAGE_KEYS.CUSTOM_EXPENSE_CATEGORIES, JSON.stringify(cats));
};

export interface StoredAiSettings {
  enabled: boolean;
  language: 'BN' | 'EN';
  responseStyle: 'concise' | 'detailed';
}

export interface StoredAiChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: number;
  dataPayload?: any;
}

export const getStoredAiSettings = (): StoredAiSettings => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AI_SETTINGS);
    if (!raw) {
      return { enabled: true, language: 'BN', responseStyle: 'detailed' };
    }
    return JSON.parse(raw);
  } catch (e) {
    return { enabled: true, language: 'BN', responseStyle: 'detailed' };
  }
};

export const saveStoredAiSettings = (settings: StoredAiSettings) => {
  localStorage.setItem(STORAGE_KEYS.AI_SETTINGS, JSON.stringify(settings));
};

export const getStoredAiChatHistory = (): StoredAiChatMessage[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.AI_CHAT_HISTORY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    return [];
  }
};

export const saveStoredAiChatHistory = (history: StoredAiChatMessage[]) => {
  try {
    // Keep last 40 messages to prevent excessive localStorage usage
    const trimmed = history.slice(-40);
    localStorage.setItem(STORAGE_KEYS.AI_CHAT_HISTORY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Error saving AI chat history', e);
  }
};

export const clearStoredAiChatHistory = () => {
  localStorage.removeItem(STORAGE_KEYS.AI_CHAT_HISTORY);
};


export const importFullBackupJson = (
  file: File,
  onSuccess: (data: Partial<AppData> & { shop?: Shop; catalogItems?: CatalogItem[] }) => void,
  onError: (err: string) => void
) => {
  importDataFromJson(file)
    .then((data) => {
      onSuccess({
        shop: data.shops[0],
        shops: data.shops,
        invoices: data.invoices,
        catalog: data.catalog,
        catalogItems: data.catalog,
        tailorRecords: data.tailorRecords,
        expenses: data.expenses,
      });
    })
    .catch((err) => {
      onError(err?.message || 'Error parsing file');
    });
};




