export interface HeaderColorConfig {
  colorMode: 'preset' | 'solid' | 'custom-gradient';
  presetId: string;
  solidColor?: string;
  gradientFrom?: string;
  gradientTo?: string;
  gradientAngle?: string;
  effect?: 'none' | 'soft-shadow' | 'glow' | '3d-emboss' | 'neon' | 'shimmer';
  fontSize?: 'normal' | 'large' | 'xlarge';
  letterSpacing?: 'normal' | 'wide' | 'wider';
}

export interface Shop {
  id: string;
  name: string;
  address: string;
  phone: string;
  crNumber: string;
  currency: string;
  isDefault?: boolean;
  taxRatePercent?: number;
  footerNote?: string;
  headerStyle?: HeaderColorConfig;
  profileTextColor?: string;
  tagline?: string;
  createdAt: number;
}

export interface InvoiceItem {
  id: string;
  invoiceId: string;
  description: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  catalogCode?: string;
}

export interface CustomMeasurementField {
  id: string;
  name: string;
  value: string;
}

export interface Measurement {
  id: string;
  invoiceId?: string;
  customerPhone: string;
  customerName: string;
  customerAddress?: string;
  profileName?: string; // e.g. "Panjabi Regular", "Panjabi Slim", "White Shirt"
  dressType: string; // e.g. "Panjabi", "Shirt", "Pant", "Pajama", "Abaya", "Suit", etc.
  isDefault?: boolean; // Default / favorite profile for this customer
  length: number;
  bodyChest: number;
  waist: number;
  hip: number;
  shoulder: number;
  sleeve: number;
  neck: number;
  flareBottom: number;
  // Garment-specific fields
  cuff?: number; // কাফ / মোহরী (Panjabi, Shirt, Kurta)
  thigh?: number; // রান / থাই (Pant, Pajama)
  bottom?: number; // মোহরী / বটম (Pant, Pajama, Salwar)
  inseam?: number; // ইনসিম / হাই (Pant)
  collar?: string; // কলার ধরণ (Panjabi, Shirt)
  customFields?: CustomMeasurementField[]; // User-defined custom fields
  unit: string; // 'inches' or 'cm'
  designNotes: string;
  specialInstructions: string;
  createdAt?: number;
  updatedAt: number;
}

export interface Payment {
  id: string;
  invoiceId: string;
  customerPhone: string;
  amount: number;
  paymentMethod: 'Cash' | 'Bank';
  bankReference?: string;
  paymentDate: string;
  notes?: string;
  createdAt: number;
}

export interface Invoice {
  id: string; // e.g. "JT-1001"
  shopId: string;
  customerName: string;
  customerPhone: string;
  customerAddress: string;
  orderDate: string;
  deliveryDate: string;
  dressType: string;
  orderStatus: 'Pending' | 'In Progress' | 'Ready for Pickup' | 'Delivered' | 'Cancelled';
  subtotal: number;
  discount: number;
  netTotal: number;
  advanceDeposit: number;
  remainingDue: number;
  paymentMethod: 'Cash' | 'Bank';
  bankReference?: string;
  clothPhotoUri?: string;
  dressDesignPhotoUri?: string;
  customerDesignPhotoUri?: string;
  extraPhotoUri?: string;
  notes?: string;
  createdAt: number;
  updatedAt: number;
  items: InvoiceItem[];
  payments: Payment[];
  measurement?: Measurement;
}

export interface TailorRecord {
  id: string;
  shopId: string;
  tailorName: string;
  tailorPhone?: string;
  workType?: 'Cutting' | 'Sewing' | 'Cutting & Sewing' | 'Other' | string;
  cuttingPieces?: number;
  sewingPieces?: number;
  dressType: string;
  invoiceId?: string;
  customerName?: string;
  pieces: number;
  ratePerPiece: number;
  totalWage: number;
  assignedDate: string;
  dueDate?: string;
  status: 'Assigned' | 'In Progress' | 'Completed';
  paidAmount?: number;
  balanceDue?: number;
  notes?: string;
  createdAt?: number;
}

export interface KarigarSummary {
  tailorName: string;
  tailorPhone: string;
  totalCuttingPieces: number;
  totalSewingPieces: number;
  totalPieces: number;
  totalWage: number;
  totalPaid: number;
  totalDue: number;
  recordCount: number;
  lastActiveDate: string;
  records: TailorRecord[];
}

export interface Expense {
  id: string;
  shopId: string;
  type?: 'Expense' | 'Deposit'; // 'Expense' (খরচ) or 'Deposit' (ক্যাশ জমা)
  date: string;
  category:
    | 'Fabric'
    | 'Thread & Buttons'
    | 'Lace & Accessories'
    | 'Tailor Wages'
    | 'Shop Rent'
    | 'Electricity & Utility'
    | 'Tea & Refreshment'
    | 'Maintenance'
    | 'Cash Deposit'
    | 'Owner Capital'
    | 'Direct Sales'
    | 'Customer Advance'
    | 'Other'
    | string;
  description: string;
  person?: string;
  paymentMethod?: string;
  receiptPhotoUri?: string;
  notes?: string;
  amount: number;
  createdAt: number;
}

export interface CatalogItem {
  id: string;
  shopId: string;
  name: string;
  catalogCode: string;
  category: string;
  price: number;
  modelSize: string;
  description: string;
  imageUri?: string;
  createdAt: number;
}

export interface CustomerSummary {
  customerName: string;
  customerPhone: string;
  customerAddress?: string;
  orderCount: number;
  totalSales: number;
  totalPaid: number;
  totalDue: number;
  lastOrderDate: string;
}

export type Language = 'BN' | 'EN' | 'HI' | 'AR';

export interface AppData {
  shops: Shop[];
  activeShopId: string;
  invoices: Invoice[];
  tailorRecords: TailorRecord[];
  expenses: Expense[];
  catalog: CatalogItem[];
  measurements: Measurement[];
  language: Language;
}

export interface BackupData {
  version: number;
  exportedAt: number;
  app: string;
  shops: Shop[];
  invoices: Invoice[];
  tailorRecords: TailorRecord[];
  expenses: Expense[];
  catalogItems: CatalogItem[];
  measurements: Measurement[];
}
