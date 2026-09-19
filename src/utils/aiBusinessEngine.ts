import { Invoice, Expense, TailorRecord, Shop, CustomerSummary, Measurement } from '../types';
import { fallbackLocalInvoiceParser, AiInvoiceDraft } from './aiInvoiceParser';

export interface BusinessOverviewMetrics {
  todaySales: number;
  todayAdvance: number;
  todayDueCollected: number;
  todayExpenses: number;
  todayDeposits: number;
  todayProfit: number;
  totalCustomersCount: number;
  pendingOrdersCount: number;
  inProgressOrdersCount: number;
  readyOrdersCount: number;
  deliveredOrdersCount: number;
  totalCustomerDue: number;
  totalKarigarDue: number;
  cashBalance: number;
  monthlySales: number;
  monthlyExpenses: number;
  monthlyProfit: number;
  monthlyOrdersCount: number;
  lastMonthSales: number;
  lastMonthExpenses: number;
  salesGrowthPercent: number | null;
}

export interface BusinessInsightItem {
  id: string;
  type: 'sales' | 'due' | 'delivery' | 'customer' | 'item' | 'expense' | 'karigar' | 'cash';
  titleBn: string;
  titleEn: string;
  descriptionBn: string;
  descriptionEn: string;
  severity: 'info' | 'warning' | 'success' | 'alert';
  metricValue?: string;
  metricValueEn?: string;
  actionType?: 'due' | 'pending-orders' | 'ready-orders' | 'customer' | 'karigar' | 'expense';
}

export interface AiQueryResult {
  answerBn: string;
  answerEn: string;
  invoiceDraft?: AiInvoiceDraft;
  actionSuggestion?: {
    type: 'create-order' | 'change-status' | 'view-customer' | 'view-invoice' | 'view-measurement' | 'send-whatsapp' | 'add-expense';
    customerName?: string;
    customerPhone?: string;
    invoiceId?: string;
    targetStatus?: string;
    dressType?: string;
    descriptionBn: string;
    descriptionEn: string;
  };
  customerData?: {
    name: string;
    phone: string;
    address: string;
    totalOrders: number;
    totalAmount: number;
    paidAmount: number;
    dueAmount: number;
    lastOrderDate: string;
    lastOrderStatus: string;
    lastInvoiceId?: string;
    measurementSummary?: {
      dressType: string;
      length?: number;
      chest?: number;
      waist?: number;
      hip?: number;
      sleeve?: number;
      unit?: string;
      notes?: string;
    };
  };
  ordersList?: {
    id: string;
    customerName: string;
    customerPhone: string;
    orderDate: string;
    deliveryDate: string;
    dressType: string;
    orderStatus: string;
    netTotal: number;
    remainingDue: number;
  }[];
  duesList?: {
    customerName: string;
    customerPhone: string;
    invoiceId: string;
    dueAmount: number;
    orderDate: string;
    deliveryDate: string;
  }[];
  karigarData?: {
    tailorName: string;
    totalWage: number;
    paidAmount: number;
    balanceDue: number;
    totalPieces: number;
    phone?: string;
  }[];
}

// Convert Bengali digits (০-৯) to standard English numbers (0-9)
export const normalizeBengaliDigits = (text: string): string => {
  const bnToEnMap: Record<string, string> = {
    '০': '0',
    '১': '1',
    '২': '2',
    '৩': '3',
    '৪': '4',
    '৫': '5',
    '৬': '6',
    '৭': '7',
    '৮': '8',
    '৯': '9',
  };
  return text.replace(/[০-৯]/g, (digit) => bnToEnMap[digit] || digit);
};

// Format number into Bengali digits
export const formatBengaliNumber = (num: number): string => {
  const enDigits = Math.round(num).toLocaleString('en-US');
  const enToBnMap: Record<string, string> = {
    '0': '০',
    '1': '১',
    '2': '২',
    '3': '৩',
    '4': '৪',
    '5': '৫',
    '6': '৬',
    '7': '৭',
    '8': '৮',
    '9': '৯',
    ',': ',',
  };
  return enDigits.replace(/[0-9,]/g, (char) => enToBnMap[char] || char);
};

// Smart money formatter that prevents English currency letters (like OMR, USD, AED)
// from ever colliding directly with Bengali numbers (e.g. OMR 30 instead of OMR৩০)
export const formatEngineMoney = (amount: number, currency: string, forceEnglish = false): string => {
  const cleanCurr = (currency || '').trim();
  const isEnglishCurrency = /^[A-Za-z$€£¥]+$/.test(cleanCurr);
  if (forceEnglish || isEnglishCurrency) {
    return `${cleanCurr} ${Math.round(amount).toLocaleString('en-US')}`;
  }
  return `${cleanCurr} ${formatBengaliNumber(amount)}`;
};

export const formatEngineCount = (count: number, forceEnglish = false, currency?: string): string => {
  const isEnglishCurrency = Boolean(currency && /^[A-Za-z$€£¥]+$/.test(currency.trim()));
  if (forceEnglish || isEnglishCurrency) {
    return Math.round(count).toLocaleString('en-US');
  }
  return formatBengaliNumber(count);
};

// Calculate all business overview metrics directly from actual application data
export const calculateBusinessOverview = (
  invoices: Invoice[],
  expenses: Expense[],
  tailorRecords: TailorRecord[]
): BusinessOverviewMetrics => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
  
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const lastMonthStr = `${lastMonthDate.getFullYear()}-${String(lastMonthDate.getMonth() + 1).padStart(2, '0')}`;

  // Today's orders
  const todayInvoices = invoices.filter((inv) => inv.orderDate === todayStr);
  const todaySales = todayInvoices.reduce((sum, i) => sum + (i.netTotal || 0), 0);
  const todayAdvance = todayInvoices.reduce((sum, i) => sum + (i.advanceDeposit || 0), 0);

  // Today's due payments collected across all invoices
  let todayDueCollected = 0;
  invoices.forEach((inv) => {
    if (inv.payments && inv.payments.length > 0) {
      inv.payments.forEach((p) => {
        if (p.paymentDate === todayStr) {
          todayDueCollected += p.amount || 0;
        }
      });
    }
  });

  // Today's expenses and deposits
  const todayExpenses = expenses
    .filter((e) => e.date === todayStr && (e.type === 'Expense' || !e.type))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const todayDeposits = expenses
    .filter((e) => e.date === todayStr && e.type === 'Deposit')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  // Today's operational profit: Total money in (Sales or Cash Received) - Expenses
  const todayProfit = todaySales - todayExpenses;

  // Aggregate unique customers
  const customerMap = new Map<string, boolean>();
  invoices.forEach((inv) => {
    const key = (inv.customerPhone || '').trim() || (inv.customerName || '').trim();
    if (key) customerMap.set(key, true);
  });
  const totalCustomersCount = customerMap.size;

  // Order status counts
  const pendingOrdersCount = invoices.filter((i) => i.orderStatus === 'Pending').length;
  const inProgressOrdersCount = invoices.filter((i) => i.orderStatus === 'In Progress').length;
  const readyOrdersCount = invoices.filter((i) => i.orderStatus === 'Ready for Pickup').length;
  const deliveredOrdersCount = invoices.filter((i) => i.orderStatus === 'Delivered').length;

  // Total customer due
  const totalCustomerDue = invoices.reduce((sum, i) => sum + (i.remainingDue || 0), 0);

  // Total karigar due
  const totalKarigarDue = tailorRecords.reduce((sum, t) => {
    if (t.balanceDue !== undefined) return sum + (t.balanceDue || 0);
    return sum + Math.max(0, (t.totalWage || 0) - (t.paidAmount || 0));
  }, 0);

  // Cumulative Cash Balance (All advances + All payment receipts + All deposits - All expenses)
  const allAdvances = invoices.reduce((sum, i) => sum + (i.advanceDeposit || 0), 0);
  let allDuePayments = 0;
  invoices.forEach((inv) => {
    if (inv.payments && inv.payments.length > 0) {
      inv.payments.forEach((p) => {
        allDuePayments += p.amount || 0;
      });
    }
  });
  const allDeposits = expenses
    .filter((e) => e.type === 'Deposit')
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const allExpenses = expenses
    .filter((e) => e.type === 'Expense' || !e.type)
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const cashBalance = allAdvances + allDuePayments + allDeposits - allExpenses;

  // Monthly Metrics
  const monthlyInvoices = invoices.filter((i) => i.orderDate && i.orderDate.startsWith(currentMonthStr));
  const monthlySales = monthlyInvoices.reduce((sum, i) => sum + (i.netTotal || 0), 0);
  const monthlyOrdersCount = monthlyInvoices.length;

  const monthlyExpenses = expenses
    .filter((e) => e.date && e.date.startsWith(currentMonthStr) && (e.type === 'Expense' || !e.type))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  const monthlyProfit = monthlySales - monthlyExpenses;

  // Last Month Metrics
  const lastMonthInvoices = invoices.filter((i) => i.orderDate && i.orderDate.startsWith(lastMonthStr));
  const lastMonthSales = lastMonthInvoices.reduce((sum, i) => sum + (i.netTotal || 0), 0);

  const lastMonthExpenses = expenses
    .filter((e) => e.date && e.date.startsWith(lastMonthStr) && (e.type === 'Expense' || !e.type))
    .reduce((sum, e) => sum + (e.amount || 0), 0);

  let salesGrowthPercent: number | null = null;
  if (lastMonthSales > 0) {
    salesGrowthPercent = Math.round(((monthlySales - lastMonthSales) / lastMonthSales) * 100);
  }

  return {
    todaySales,
    todayAdvance,
    todayDueCollected,
    todayExpenses,
    todayDeposits,
    todayProfit,
    totalCustomersCount,
    pendingOrdersCount,
    inProgressOrdersCount,
    readyOrdersCount,
    deliveredOrdersCount,
    totalCustomerDue,
    totalKarigarDue,
    cashBalance,
    monthlySales,
    monthlyExpenses,
    monthlyProfit,
    monthlyOrdersCount,
    lastMonthSales,
    lastMonthExpenses,
    salesGrowthPercent,
  };
};

// Generate Intelligent Business Insights directly from actual data
export const generateBusinessInsights = (
  invoices: Invoice[],
  expenses: Expense[],
  tailorRecords: TailorRecord[],
  currency: string = '৳'
): BusinessInsightItem[] => {
  const insights: BusinessInsightItem[] = [];
  const overview = calculateBusinessOverview(invoices, expenses, tailorRecords);
  const todayStr = new Date().toISOString().split('T')[0];

  // 1. Sales Trend Insight
  if (overview.salesGrowthPercent !== null) {
    if (overview.salesGrowthPercent >= 0) {
      insights.push({
        id: 'sales-growth',
        type: 'sales',
        severity: 'success',
        titleBn: 'বিক্রি বৃদ্ধি',
        titleEn: 'Sales Growth',
        descriptionBn: `এই মাসে আপনার বিক্রি গত মাসের তুলনায় ${formatBengaliNumber(overview.salesGrowthPercent)}% বেশি। (গত মাস: ${currency}${formatBengaliNumber(overview.lastMonthSales)}, এই মাস: ${currency}${formatBengaliNumber(overview.monthlySales)})`,
        descriptionEn: `This month your sales grew by ${overview.salesGrowthPercent}% compared to last month. (Last month: ${currency}${overview.lastMonthSales.toLocaleString()}, This month: ${currency}${overview.monthlySales.toLocaleString()})`,
        metricValue: `+${formatBengaliNumber(overview.salesGrowthPercent)}%`,
        metricValueEn: `+${overview.salesGrowthPercent}%`,
      });
    } else {
      insights.push({
        id: 'sales-decline',
        type: 'sales',
        severity: 'warning',
        titleBn: 'বিক্রির গতিধারা',
        titleEn: 'Sales Trend',
        descriptionBn: `এই মাসে আপনার বিক্রি গত মাসের চেয়ে ${formatBengaliNumber(Math.abs(overview.salesGrowthPercent))}% কম। বেশি অর্ডার পেতে কাস্টমারদের সাথে যোগাযোগ করুন।`,
        descriptionEn: `This month sales are ${Math.abs(overview.salesGrowthPercent)}% lower than last month. Consider following up with regular customers.`,
        metricValue: `${formatBengaliNumber(overview.salesGrowthPercent)}%`,
        metricValueEn: `${overview.salesGrowthPercent}%`,
      });
    }
  } else if (overview.monthlySales > 0) {
    insights.push({
      id: 'sales-current',
      type: 'sales',
      severity: 'info',
      titleBn: 'চলতি মাসের বিক্রি',
      titleEn: 'Current Month Sales',
      descriptionBn: `এই মাসে এখন পর্যন্ত মোট ${formatBengaliNumber(overview.monthlyOrdersCount)}টি অর্ডারে ${currency}${formatBengaliNumber(overview.monthlySales)} বিক্রি হয়েছে।`,
      descriptionEn: `Total sales of ${currency}${overview.monthlySales.toLocaleString()} recorded across ${overview.monthlyOrdersCount} orders this month.`,
      metricValue: `${currency} ${formatBengaliNumber(overview.monthlySales)}`,
      metricValueEn: `${currency} ${overview.monthlySales.toLocaleString()}`,
    });
  }

  // 2. Outstanding Customer Due Alert
  const dueInvoices = invoices.filter((i) => (i.remainingDue || 0) > 0);
  if (dueInvoices.length > 0) {
    const dueCustomersSet = new Set(dueInvoices.map((i) => i.customerPhone || i.customerName));
    insights.push({
      id: 'customer-due-alert',
      type: 'due',
      severity: 'alert',
      titleBn: 'কাস্টমার বকেয়া পাওনা',
      titleEn: 'Customer Outstanding Due',
      descriptionBn: `${formatBengaliNumber(dueCustomersSet.size)} জন কাস্টমারের কাছে মোট ${currency}${formatBengaliNumber(overview.totalCustomerDue)} টাকা বাকি আছে। সময়মতো আদায়ের জন্য WhatsApp এ তাগাদা পাঠান।`,
      descriptionEn: `${dueCustomersSet.size} customers have total outstanding due of ${currency}${overview.totalCustomerDue.toLocaleString()}. Use WhatsApp reminders for collection.`,
      metricValue: `${currency} ${formatBengaliNumber(overview.totalCustomerDue)}`,
      metricValueEn: `${currency} ${overview.totalCustomerDue.toLocaleString()}`,
      actionType: 'due',
    });
  }

  // 3. Overdue / Slow-moving Orders (Delivery date passed but not delivered)
  const overdueOrders = invoices.filter(
    (i) => i.orderStatus !== 'Delivered' && i.orderStatus !== 'Cancelled' && i.deliveryDate && i.deliveryDate < todayStr
  );
  if (overdueOrders.length > 0) {
    insights.push({
      id: 'overdue-delivery',
      type: 'delivery',
      severity: 'alert',
      titleBn: 'ডেলিভারি তারিখ অতিক্রান্ত',
      titleEn: 'Overdue Delivery Alert',
      descriptionBn: `${formatBengaliNumber(overdueOrders.length)}টি অর্ডারের Delivery Date পার হয়ে গেছে কিন্তু এখনো ডেলিভারি সম্পন্ন হয়নি। দ্রুত কাজ শেষ করে কাস্টমারকে জানান।`,
      descriptionEn: `${overdueOrders.length} orders have passed their delivery date. Prioritize completing and delivering them.`,
      metricValue: `${formatBengaliNumber(overdueOrders.length)}টি`,
      metricValueEn: `${overdueOrders.length} orders`,
      actionType: 'pending-orders',
    });
  }

  // 4. Ready Orders Waiting for Pickup
  const readyOrders = invoices.filter((i) => i.orderStatus === 'Ready for Pickup');
  if (readyOrders.length > 0) {
    insights.push({
      id: 'ready-orders-pickup',
      type: 'delivery',
      severity: 'success',
      titleBn: 'রেডি অর্ডার ডেলিভারি অপেক্ষায়',
      titleEn: 'Ready Orders for Pickup',
      descriptionBn: `${formatBengaliNumber(readyOrders.length)}টি পোশাক সম্পূর্ণ সেলাই সম্পন্ন ও দোকানে রেডি রয়েছে। কাস্টমারদের "কাপড় রেডি" WhatsApp মেসেজ পাঠান।`,
      descriptionEn: `${readyOrders.length} orders are ready for pickup in the shop. Send ready notifications to customers.`,
      metricValue: `${formatBengaliNumber(readyOrders.length)}টি`,
      metricValueEn: `${readyOrders.length} orders`,
      actionType: 'ready-orders',
    });
  }

  // 5. Frequently Returning Customers (Top Loyal Customers)
  const customerOrderCount: Record<string, { name: string; phone: string; count: number; totalSpent: number }> = {};
  invoices.forEach((inv) => {
    const key = (inv.customerPhone || '').trim() || (inv.customerName || '').trim();
    if (!key) return;
    if (!customerOrderCount[key]) {
      customerOrderCount[key] = {
        name: inv.customerName,
        phone: inv.customerPhone,
        count: 0,
        totalSpent: 0,
      };
    }
    customerOrderCount[key].count += 1;
    customerOrderCount[key].totalSpent += inv.netTotal || 0;
  });

  const loyalCustomers = Object.values(customerOrderCount)
    .filter((c) => c.count >= 2)
    .sort((a, b) => b.count - a.count);

  if (loyalCustomers.length > 0) {
    const topCustomer = loyalCustomers[0];
    insights.push({
      id: 'loyal-customer',
      type: 'customer',
      severity: 'info',
      titleBn: 'নিয়মিত ও বিশ্বস্ত কাস্টমার',
      titleEn: 'Top Returning Customer',
      descriptionBn: `কাস্টমার "${topCustomer.name}" এ পর্যন্ত সর্বোচ্চ ${formatBengaliNumber(topCustomer.count)}টি অর্ডার করেছেন (মোট কেনাকাটা ${currency}${formatBengaliNumber(topCustomer.totalSpent)})। এই কাস্টমারদের বিশেষ যত্ন দিন।`,
      descriptionEn: `Customer "${topCustomer.name}" has placed ${topCustomer.count} orders (${currency}${topCustomer.totalSpent.toLocaleString()} total). Reward loyal customers.`,
      metricValue: `${formatBengaliNumber(topCustomer.count)}টি অর্ডার`,
      metricValueEn: `${topCustomer.count} orders`,
      actionType: 'customer',
    });
  }

  // 6. Best-Selling Dress Item
  const dressCounts: Record<string, number> = {};
  invoices.forEach((inv) => {
    const type = inv.dressType || 'Other';
    dressCounts[type] = (dressCounts[type] || 0) + 1;
  });

  const sortedDresses = Object.entries(dressCounts).sort((a, b) => b[1] - a[1]);
  if (sortedDresses.length > 0 && sortedDresses[0][1] > 0) {
    const [topDress, count] = sortedDresses[0];
    insights.push({
      id: 'top-item',
      type: 'item',
      severity: 'info',
      titleBn: 'জনপ্রিয় পোশাক খাত',
      titleEn: 'Best-Selling Dress Type',
      descriptionBn: `আপনার দোকানে সবচেয়ে বেশি বিক্রিত আইটেম হলো "${topDress}", মোট ${formatBengaliNumber(count)}টি অর্ডারে এই পোশাক সেলাই হয়েছে।`,
      descriptionEn: `Your most requested dress type is "${topDress}" with ${count} orders.`,
      metricValue: `${formatBengaliNumber(count)}টি`,
      metricValueEn: `${count} items`,
    });
  }

  // 7. High Expenses & Expense Trend
  const expenseByCategory: Record<string, number> = {};
  expenses
    .filter((e) => e.type === 'Expense' || !e.type)
    .forEach((e) => {
      expenseByCategory[e.category] = (expenseByCategory[e.category] || 0) + (e.amount || 0);
    });

  const sortedExpenses = Object.entries(expenseByCategory).sort((a, b) => b[1] - a[1]);
  if (sortedExpenses.length > 0 && sortedExpenses[0][1] > 0) {
    const [topCategory, amount] = sortedExpenses[0];
    insights.push({
      id: 'high-expense-category',
      type: 'expense',
      severity: 'warning',
      titleBn: 'সর্বোচ্চ খরচের খাত',
      titleEn: 'Highest Expense Category',
      descriptionBn: `দোকানের ব্যয়ের মধ্যে সবচেয়ে বেশি খরচ হয়েছে "${topCategory}" খাতে (${currency}${formatBengaliNumber(amount)})। খরচের বাজেট নিয়ন্ত্রণে রাখুন।`,
      descriptionEn: `Largest expense is in "${topCategory}" category (${currency}${amount.toLocaleString()}). Monitor cost efficiency.`,
      metricValue: `${currency} ${formatBengaliNumber(amount)}`,
      metricValueEn: `${currency} ${amount.toLocaleString()}`,
      actionType: 'expense',
    });
  }

  // 8. Karigar Wage Due Trend
  if (overview.totalKarigarDue > 0) {
    insights.push({
      id: 'karigar-due',
      type: 'karigar',
      severity: 'info',
      titleBn: 'কারিগরদের বকেয়া মজুরি',
      titleEn: 'Karigar Outstanding Wages',
      descriptionBn: `কারিগরদের মোট পাওনা মজুরি ${currency}${formatBengaliNumber(overview.totalKarigarDue)}। যথাসময়ে কারিগরদের মজুরি পরিশোধ কাজের গতি বজায় রাখতে সাহায্য করে।`,
      descriptionEn: `Total karigar payable wage balance is ${currency}${overview.totalKarigarDue.toLocaleString()}. Ensure timely settlements.`,
      metricValue: `${currency} ${formatBengaliNumber(overview.totalKarigarDue)}`,
      metricValueEn: `${currency} ${overview.totalKarigarDue.toLocaleString()}`,
      actionType: 'karigar',
    });
  }

  return insights;
};

// Process natural language questions in Bengali or English
export const processAiBusinessQuestion = (
  queryText: string,
  invoices: Invoice[],
  expenses: Expense[],
  tailorRecords: TailorRecord[],
  currency: string = '৳',
  standaloneMeasurements: Measurement[] = []
): AiQueryResult => {
  const rawQuery = queryText.trim();
  const normalizedQuery = normalizeBengaliDigits(rawQuery).toLowerCase();
  const overview = calculateBusinessOverview(invoices, expenses, tailorRecords);
  const todayStr = new Date().toISOString().split('T')[0];
  const now = new Date();
  const currentMonthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;

  // 0. AI SMART INVOICE GENERATION (e.g. "তুমি জীবনের 2টি জামা 8 omr", "জীবনের ২ টা জামা ৮ omr লিখে দাও", "Jibon 2 dresses 8 omr")
  const isInvoiceRequest =
    /(?:ইনভয়েস|অর্ডার|বিল|invoice|order|bill).*(?:বানাও|সাজাও|করো|দাও|make|create|write|লিখে)/i.test(normalizedQuery) ||
    /(?:জামা|আবায়া|পাঞ্জাবি|শার্ট|প্যান্ট|কামিজ|dress|abaya|shirt|pant).*(?:\d+|টি|টা).*(?:omr|রিয়াল|রিয়াল|ওএমআর|টাকা|tk|ro|\$)/i.test(normalizedQuery) ||
    /(?:\d+).*(?:জামা|আবায়া|পাঞ্জাবি|শার্ট|প্যান্ট|কামিজ|dress|abaya|shirt|pant).*(?:omr|রিয়াল|রিয়াল|ওএমআর|টাকা|tk|ro|\$)/i.test(normalizedQuery) ||
    /জীবন.*(?:\d+|টি|টা|জামা|dress).*(?:omr|রিয়াল|রিয়াল|ওএমআর|টাকা|tk)/i.test(normalizedQuery);

  if (isInvoiceRequest) {
    const draft = fallbackLocalInvoiceParser(rawQuery, currency);
    return {
      answerBn: `✅ ${draft.summaryBn}\n\n📋 **স্মার্ট ইনভয়েস বিবরণ:**\n• কাস্টমার: ${draft.customerNameBn || draft.customerName}\n• পোশাকের ধরণ: ${draft.dressType}\n• পরিমাণ ও রেট: ${draft.items[0]?.quantity || 1}টি × ${draft.currency} ${(draft.items[0]?.unitPrice || 0).toFixed(2)} = ${draft.currency} ${draft.netTotal.toFixed(2)}\n• ডেলিভারির তারিখ: ${draft.deliveryDate}\n• নোট: ${draft.specialNotesBn}\n\nনিচের "এই ইনভয়েসটি তৈরি করুন" বোতামে চাপ দিয়ে সরাসরি অর্ডার ফর্ম খুলুন।`,
      answerEn: `✅ ${draft.summaryEn}\n\n📋 **Smart Invoice Summary:**\n• Customer: ${draft.customerNameEn || draft.customerName}\n• Dress Category: ${draft.dressType}\n• Quantity & Price: ${draft.items[0]?.quantity || 1} pcs × ${draft.currency} ${(draft.items[0]?.unitPrice || 0).toFixed(2)} = ${draft.currency} ${draft.netTotal.toFixed(2)}\n• Delivery Date: ${draft.deliveryDate}\n• Notes: ${draft.specialNotesEn}\n\nClick "Create This Invoice" below to open the order form prefilled.`,
      invoiceDraft: draft,
      actionSuggestion: {
        type: 'create-order',
        customerName: draft.customerName,
        customerPhone: draft.customerPhone,
        dressType: draft.dressType,
        descriptionBn: `${draft.customerNameBn || draft.customerName}-এর জন্য ইনভয়েস তৈরি করুন`,
        descriptionEn: `Create invoice for ${draft.customerNameEn || draft.customerName}`,
      },
    };
  }

  // 1. TODAY'S SALES (আজ কত বিক্রি / আজকের সেল / আজ মোট কত টাকা বিক্রি)
  if (
    /আজ.*(বিক্রি|সেল|বেচাকেনা|টাকা হলো|টাকা পেয়েছি|সেলস)/.test(normalizedQuery) ||
    /today.*(sale|sell|revenue|income)/.test(normalizedQuery)
  ) {
    const todayInvoices = invoices.filter((i) => i.orderDate === todayStr);
    const count = todayInvoices.length;
    return {
      answerBn: `আজকের মোট বিক্রি ${formatEngineMoney(overview.todaySales, currency)} (মোট ${formatEngineCount(count, false, currency)}টি নতুন অর্ডার)।\nআজ সরাসরি অগ্রিম জমা হয়েছে ${formatEngineMoney(overview.todayAdvance, currency)} এবং পুরাতন বকেয়া আদায় হয়েছে ${formatEngineMoney(overview.todayDueCollected, currency)}।`,
      answerEn: `Today's total sales: ${formatEngineMoney(overview.todaySales, currency, true)} (${count} new orders).\nAdvance collected: ${formatEngineMoney(overview.todayAdvance, currency, true)}, Due collected: ${formatEngineMoney(overview.todayDueCollected, currency, true)}.`,
      ordersList: todayInvoices.map((inv) => ({
        id: inv.id,
        customerName: inv.customerName,
        customerPhone: inv.customerPhone,
        orderDate: inv.orderDate,
        deliveryDate: inv.deliveryDate,
        dressType: inv.dressType,
        orderStatus: inv.orderStatus,
        netTotal: inv.netTotal,
        remainingDue: inv.remainingDue,
      })),
    };
  }

  // 2. TODAY'S EXPENSES (আজ কত খরচ / আজকের খরচ / আজকের ব্যয়)
  if (
    /আজ.*(খরচ|ব্যয়|ব্যয়|খরচা)/.test(normalizedQuery) ||
    /today.*(expense|spend|cost)/.test(normalizedQuery)
  ) {
    const todayExpensesList = expenses.filter((e) => e.date === todayStr && (e.type === 'Expense' || !e.type));
    if (overview.todayExpenses === 0) {
      return {
        answerBn: `আজ এখনো পর্যন্ত কোনো দোকান খরচ এন্ট্রি করা হয়নি (মোট খরচ: ${formatEngineMoney(0, currency)})।`,
        answerEn: `No expenses recorded for today so far (Total: ${formatEngineMoney(0, currency, true)}).`,
      };
    }
    const breakdownBn = todayExpensesList.map((e) => `${e.category}: ${formatEngineMoney(e.amount, currency)} (${e.description || 'বিবরণ নেই'})`).join('\n• ');
    const breakdownEn = todayExpensesList.map((e) => `${e.category}: ${formatEngineMoney(e.amount, currency, true)} (${e.description || 'No description'})`).join('\n• ');
    return {
      answerBn: `আজকের মোট খরচ ${formatEngineMoney(overview.todayExpenses, currency)}।\n\nখরচের বিবরণ:\n• ${breakdownBn}`,
      answerEn: `Today's total expense is ${formatEngineMoney(overview.todayExpenses, currency, true)}.\n\nDetails:\n• ${breakdownEn}`,
    };
  }

  // 3. TODAY'S PROFIT (আজকের লাভ / আজকের লাভ কত)
  if (
    /আজ.*(লাভ|প্রফিট|মুনাফা)/.test(normalizedQuery) ||
    /today.*(profit|gain)/.test(normalizedQuery)
  ) {
    const isProfitable = overview.todayProfit >= 0;
    return {
      answerBn: `আজকের আনুমানিক হিসাব:\n• মোট নতুন বিক্রি: ${formatEngineMoney(overview.todaySales, currency)}\n• মোট দোকান খরচ: ${formatEngineMoney(overview.todayExpenses, currency)}\n• আজকের নিট লাভ: ${formatEngineMoney(overview.todayProfit, currency)} ${isProfitable ? '✅' : '⚠️'}`,
      answerEn: `Today's estimated summary:\n• Total Sales: ${formatEngineMoney(overview.todaySales, currency, true)}\n• Total Expense: ${formatEngineMoney(overview.todayExpenses, currency, true)}\n• Net Profit: ${formatEngineMoney(overview.todayProfit, currency, true)}`,
    };
  }

  // 4. DUE & OUTSTANDING (কার কাছে টাকা বাকি / সব বকেয়া / কার কার কাছে বাকি / সবচেয়ে বেশি টাকা কার কাছে বাকি)
  if (
    /(বকেয়া|বকেয়া|বাকি|পাওনা|টাকা বাকি|কার কাছে|কারা.*টাকা দেয়)/.test(normalizedQuery) ||
    /(due|outstanding|unpaid|owes|debt)/.test(normalizedQuery)
  ) {
    const dueInvoices = invoices
      .filter((i) => (i.remainingDue || 0) > 0)
      .sort((a, b) => (b.remainingDue || 0) - (a.remainingDue || 0));

    if (dueInvoices.length === 0) {
      return {
        answerBn: `মাশাআল্লাহ! কোনো কাস্টমারের কাছে কোনো টাকা বকেয়া নেই। সকল অর্ডারের মূল্য সম্পূর্ণ পরিশোধিত।`,
        answerEn: `Excellent! There are no outstanding customer dues. All orders are fully paid.`,
      };
    }

    const topCustomer = dueInvoices[0];
    return {
      answerBn: `মোট ${formatEngineCount(dueInvoices.length, false, currency)}টি অর্ডারে সর্বমোট ${formatEngineMoney(overview.totalCustomerDue, currency)} টাকা বাকি রয়েছে।\nসবচেয়ে বেশি বাকি রয়েছে ${topCustomer.customerName}-এর কাছে (${formatEngineMoney(topCustomer.remainingDue, currency)})।`,
      answerEn: `Total ${formatEngineMoney(overview.totalCustomerDue, currency, true)} due across ${dueInvoices.length} orders.\nHighest due is from ${topCustomer.customerName} (${formatEngineMoney(topCustomer.remainingDue, currency, true)}).`,
      duesList: dueInvoices.map((i) => ({
        customerName: i.customerName,
        customerPhone: i.customerPhone,
        invoiceId: i.id,
        dueAmount: i.remainingDue,
        orderDate: i.orderDate,
        deliveryDate: i.deliveryDate,
      })),
    };
  }

  // 5. SPECIFIC CUSTOMER MEASUREMENT (রহিমের শেষ মাপ / করিমের মাপ দেখাও)
  if (
    /(মাপ|মেজারমেন্ট|সাইজ|measurement).*(দেখা|বলো|কি|কী|হিসাব)?/.test(normalizedQuery) ||
    /measurement/.test(normalizedQuery)
  ) {
    // Try to extract customer name from query
    let targetCustomerName = '';
    invoices.forEach((inv) => {
      const name = inv.customerName.trim().toLowerCase();
      if (name && normalizedQuery.includes(name)) {
        targetCustomerName = inv.customerName;
      }
    });

    if (targetCustomerName) {
      const customerInvoices = invoices.filter(
        (i) => i.customerName.toLowerCase() === targetCustomerName.toLowerCase()
      );
      // Find latest invoice with measurement
      const invWithMeas = customerInvoices
        .filter((i) => i.measurement)
        .sort((a, b) => b.createdAt - a.createdAt)[0];

      if (invWithMeas && invWithMeas.measurement) {
        const m = invWithMeas.measurement;
        const detailsBn = `পোশাক: ${m.dressType || invWithMeas.dressType} (${m.unit || 'ইঞ্চি'})\n• লম্বা: ${m.length || 0}\n• বডি/বুক: ${m.bodyChest || 0}\n• কোমর: ${m.waist || 0}\n• হিপ: ${m.hip || 0}\n• শোল্ডার: ${m.shoulder || 0}\n• হাতা: ${m.sleeve || 0}\n• গলা: ${m.neck || 0}\n• ঘের: ${m.flareBottom || 0}\n${m.designNotes ? `• ডিজাইন নোট: ${m.designNotes}` : ''}`;
        const detailsEn = `Dress: ${m.dressType || invWithMeas.dressType} (${m.unit || 'inch'})\n• Length: ${m.length || 0}\n• Chest: ${m.bodyChest || 0}\n• Waist: ${m.waist || 0}\n• Hip: ${m.hip || 0}\n• Shoulder: ${m.shoulder || 0}\n• Sleeve: ${m.sleeve || 0}\n• Neck: ${m.neck || 0}\n• Flare: ${m.flareBottom || 0}\n${m.designNotes ? `• Design Notes: ${m.designNotes}` : ''}`;
        return {
          answerBn: `কাস্টমার "${targetCustomerName}"-এর সর্বশেষ সেভ করা মাপ:\n\n${detailsBn}`,
          answerEn: `Latest measurement for "${targetCustomerName}":\n\n${detailsEn}`,
          customerData: {
            name: targetCustomerName,
            phone: invWithMeas.customerPhone,
            address: invWithMeas.customerAddress,
            totalOrders: customerInvoices.length,
            totalAmount: customerInvoices.reduce((s, i) => s + (i.netTotal || 0), 0),
            paidAmount: customerInvoices.reduce((s, i) => s + (i.advanceDeposit || 0), 0),
            dueAmount: customerInvoices.reduce((s, i) => s + (i.remainingDue || 0), 0),
            lastOrderDate: invWithMeas.orderDate,
            lastOrderStatus: invWithMeas.orderStatus,
            lastInvoiceId: invWithMeas.id,
            measurementSummary: {
              dressType: m.dressType || invWithMeas.dressType,
              length: m.length,
              chest: m.bodyChest,
              waist: m.waist,
              hip: m.hip,
              sleeve: m.sleeve,
              unit: m.unit,
              notes: m.designNotes,
            },
          },
        };
      }
    }
  }

  // 6. SPECIFIC CUSTOMER ORDERS / DETAILS (রহিমের শেষ অর্ডার / করিমের হিসাব / সাকিবের তথ্য)
  let matchedCustomerName = '';
  invoices.forEach((inv) => {
    const name = inv.customerName.trim().toLowerCase();
    if (name.length >= 2 && normalizedQuery.includes(name)) {
      matchedCustomerName = inv.customerName;
    }
  });

  if (matchedCustomerName) {
    const custInvoices = invoices
      .filter((i) => i.customerName.toLowerCase() === matchedCustomerName.toLowerCase())
      .sort((a, b) => b.createdAt - a.createdAt);

    if (custInvoices.length > 0) {
      const lastInv = custInvoices[0];
      const totalAmount = custInvoices.reduce((s, i) => s + (i.netTotal || 0), 0);
      const totalPaid = custInvoices.reduce((s, i) => s + (i.advanceDeposit || 0), 0);
      const totalDue = custInvoices.reduce((s, i) => s + (i.remainingDue || 0), 0);
      const m = lastInv.measurement;

      return {
        answerBn: `কাস্টমার "${matchedCustomerName}"-এর বিস্তারিত তথ্য:\n• মোট অর্ডার: ${formatEngineCount(custInvoices.length, false, currency)}টি\n• মোট বিল: ${formatEngineMoney(totalAmount, currency)}\n• জমা পরিশোধ: ${formatEngineMoney(totalPaid, currency)}\n• বর্তমান বাকি: ${formatEngineMoney(totalDue, currency)}\n\nসর্বশেষ অর্ডার (${lastInv.id}):\n• পোশাক: ${lastInv.dressType}\n• স্ট্যাটাস: ${lastInv.orderStatus}\n• ডেলিভারি তারিখ: ${lastInv.deliveryDate}`,
        answerEn: `Customer details for "${matchedCustomerName}":\n• Total Orders: ${custInvoices.length}\n• Total Billed: ${formatEngineMoney(totalAmount, currency, true)}\n• Paid: ${formatEngineMoney(totalPaid, currency, true)}\n• Current Due: ${formatEngineMoney(totalDue, currency, true)}\n\nLatest Order (${lastInv.id}):\n• Dress: ${lastInv.dressType}\n• Status: ${lastInv.orderStatus}\n• Delivery: ${lastInv.deliveryDate}`,
        customerData: {
          name: matchedCustomerName,
          phone: lastInv.customerPhone,
          address: lastInv.customerAddress,
          totalOrders: custInvoices.length,
          totalAmount,
          paidAmount: totalPaid,
          dueAmount: totalDue,
          lastOrderDate: lastInv.orderDate,
          lastOrderStatus: lastInv.orderStatus,
          lastInvoiceId: lastInv.id,
          measurementSummary: m
            ? {
                dressType: m.dressType || lastInv.dressType,
                length: m.length,
                chest: m.bodyChest,
                waist: m.waist,
                hip: m.hip,
                sleeve: m.sleeve,
                unit: m.unit,
                notes: m.designNotes,
              }
            : undefined,
        },
        ordersList: custInvoices.map((inv) => ({
          id: inv.id,
          customerName: inv.customerName,
          customerPhone: inv.customerPhone,
          orderDate: inv.orderDate,
          deliveryDate: inv.deliveryDate,
          dressType: inv.dressType,
          orderStatus: inv.orderStatus,
          netTotal: inv.netTotal,
          remainingDue: inv.remainingDue,
        })),
      };
    }
  }

  // 7. ORDER ACTIONS (রহিমের জন্য নতুন অর্ডার তৈরি করো / JT-1001 রেডি করো)
  if (
    /(নতুন অর্ডার|অর্ডার তৈরি|অর্ডার বানাও|create.*order|new.*order)/.test(normalizedQuery)
  ) {
    // Find customer name if specified
    let custName = '';
    invoices.forEach((inv) => {
      const name = inv.customerName.trim().toLowerCase();
      if (name && normalizedQuery.includes(name)) {
        custName = inv.customerName;
      }
    });

    const targetCustomer = custName || 'নতুন কাস্টমার';
    return {
      answerBn: `আপনি কি "${targetCustomer}"-এর জন্য একটি নতুন অর্ডার তৈরি করতে চান? নিচে কনফার্ম করুন।`,
      answerEn: `Would you like to create a new order for "${targetCustomer}"? Please confirm below.`,
      actionSuggestion: {
        type: 'create-order',
        customerName: custName,
        descriptionBn: `কাস্টমার "${targetCustomer}"-এর জন্য নতুন অর্ডার ফর্ম খুলুন`,
        descriptionEn: `Open new order form for "${targetCustomer}"`,
      },
    };
  }

  // 8. ORDER STATUS QUERIES (আজ কোন কোন অর্ডার Ready / রেডি অর্ডার / Pending অর্ডার / কোনগুলো এখনো রেডি হয়নি)
  if (
    /(রেডি|ready|তৈরি হয়েছে|হয়ে গেছে)/.test(normalizedQuery) &&
    /(অর্ডার|কাপড়|কাপর|ডেলিভারি|আজ)/.test(normalizedQuery)
  ) {
    const readyOrders = invoices.filter((i) => i.orderStatus === 'Ready for Pickup');
    if (readyOrders.length === 0) {
      return {
        answerBn: `বর্তমানে কোনো অর্ডার "Ready for Pickup" স্ট্যাটাসে নেই।`,
        answerEn: `Currently no orders are marked as Ready for Pickup.`,
      };
    }
    return {
      answerBn: `বর্তমানে মোট ${formatEngineCount(readyOrders.length, false, currency)}টি অর্ডার সম্পূর্ণ রেডি রয়েছে এবং কাস্টমারের ডেলিভারি নেওয়ার জন্য প্রস্তুত।`,
      answerEn: `Total ${readyOrders.length} orders are currently ready for pickup.`,
      ordersList: readyOrders.map((inv) => ({
        id: inv.id,
        customerName: inv.customerName,
        customerPhone: inv.customerPhone,
        orderDate: inv.orderDate,
        deliveryDate: inv.deliveryDate,
        dressType: inv.dressType,
        orderStatus: inv.orderStatus,
        netTotal: inv.netTotal,
        remainingDue: inv.remainingDue,
      })),
    };
  }

  if (
    /(পেন্ডিং|pending|চলমান|রেডি হয়নি|বাকি আছে.*অর্ডার)/.test(normalizedQuery)
  ) {
    const pendingOrders = invoices.filter((i) => i.orderStatus === 'Pending' || i.orderStatus === 'In Progress');
    return {
      answerBn: `বর্তমানে মোট ${formatEngineCount(pendingOrders.length, false, currency)}টি অর্ডার পেন্ডিং/চলমান রয়েছে (পেন্ডিং: ${formatEngineCount(overview.pendingOrdersCount, false, currency)}, ইন-প্রগ্রেস: ${formatEngineCount(overview.inProgressOrdersCount, false, currency)})।`,
      answerEn: `Currently ${pendingOrders.length} orders are pending/in progress (Pending: ${overview.pendingOrdersCount}, In Progress: ${overview.inProgressOrdersCount}).`,
      ordersList: pendingOrders.slice(0, 10).map((inv) => ({
        id: inv.id,
        customerName: inv.customerName,
        customerPhone: inv.customerPhone,
        orderDate: inv.orderDate,
        deliveryDate: inv.deliveryDate,
        dressType: inv.dressType,
        orderStatus: inv.orderStatus,
        netTotal: inv.netTotal,
        remainingDue: inv.remainingDue,
      })),
    };
  }

  // 9. TOMORROW / UPCOMING DELIVERY (আগামীকাল কোন অর্ডারের Delivery / আজকের ডেলিভারি)
  if (
    /(আগামীকাল|কালকে|কাল|tomorrow|আজকে|আজকের).*ডেলিভারি/.test(normalizedQuery) ||
    /delivery.*(today|tomorrow)/.test(normalizedQuery)
  ) {
    const isTomorrow = /(আগামীকাল|কালকে|কাল|tomorrow)/.test(normalizedQuery);
    const targetDate = new Date();
    if (isTomorrow) targetDate.setDate(targetDate.getDate() + 1);
    const targetDateStr = targetDate.toISOString().split('T')[0];

    const matchDeliveries = invoices.filter((i) => i.deliveryDate === targetDateStr);
    const dateLabelBn = isTomorrow ? 'আগামীকাল' : 'আজ';
    const dateLabelEn = isTomorrow ? 'tomorrow' : 'today';

    if (matchDeliveries.length === 0) {
      return {
        answerBn: `${dateLabelBn} (${targetDateStr}) কোনো অর্ডারের নির্ধারিত ডেলিভারি তারিখ নেই।`,
        answerEn: `No scheduled deliveries for ${dateLabelEn} (${targetDateStr}).`,
      };
    }

    return {
      answerBn: `${dateLabelBn} (${targetDateStr}) মোট ${formatEngineCount(matchDeliveries.length, false, currency)}টি অর্ডারের ডেলিভারি রয়েছে।`,
      answerEn: `${matchDeliveries.length} orders scheduled for delivery ${dateLabelEn} (${targetDateStr}).`,
      ordersList: matchDeliveries.map((inv) => ({
        id: inv.id,
        customerName: inv.customerName,
        customerPhone: inv.customerPhone,
        orderDate: inv.orderDate,
        deliveryDate: inv.deliveryDate,
        dressType: inv.dressType,
        orderStatus: inv.orderStatus,
        netTotal: inv.netTotal,
        remainingDue: inv.remainingDue,
      })),
    };
  }

  // 10. THIS MONTH'S ORDERS / SUMMARY (এই মাসে কতগুলো অর্ডার হয়েছে / এই মাসের বিক্রি)
  if (
    /(এই মাস|চলতি মাস|বর্তমান মাস|this month).*(অর্ডার|বিক্রি|হিসাব|কতগুলো)/.test(normalizedQuery)
  ) {
    return {
      answerBn: `এই মাসে (${currentMonthStr}):\n• মোট অর্ডার সংখ্যা: ${formatEngineCount(overview.monthlyOrdersCount, false, currency)}টি\n• মোট বিক্রি: ${formatEngineMoney(overview.monthlySales, currency)}\n• মোট খরচ: ${formatEngineMoney(overview.monthlyExpenses, currency)}\n• আনুমানিক নিট লাভ: ${formatEngineMoney(overview.monthlyProfit, currency)}`,
      answerEn: `This month (${currentMonthStr}):\n• Total Orders: ${overview.monthlyOrdersCount}\n• Total Sales: ${formatEngineMoney(overview.monthlySales, currency, true)}\n• Total Expenses: ${formatEngineMoney(overview.monthlyExpenses, currency, true)}\n• Net Profit: ${formatEngineMoney(overview.monthlyProfit, currency, true)}`,
    };
  }

  // 11. TOP CUSTOMER (কোন কাস্টমারের সবচেয়ে বেশি অর্ডার / সেরা কাস্টমার কে)
  if (
    /(সবচেয়ে বেশি.*অর্ডার|সেরা কাস্টমার|টপ কাস্টমার|কে বেশি অর্ডার|top customer)/.test(normalizedQuery)
  ) {
    const custMap: Record<string, { name: string; phone: string; count: number; total: number }> = {};
    invoices.forEach((inv) => {
      const key = (inv.customerPhone || '').trim() || (inv.customerName || '').trim();
      if (!key) return;
      if (!custMap[key]) {
        custMap[key] = { name: inv.customerName, phone: inv.customerPhone, count: 0, total: 0 };
      }
      custMap[key].count += 1;
      custMap[key].total += inv.netTotal || 0;
    });

    const sortedCusts = Object.values(custMap).sort((a, b) => b.count - a.count);
    if (sortedCusts.length === 0) {
      return {
        answerBn: `এই তথ্য দেওয়ার মতো পর্যাপ্ত ডাটা পাওয়া যায়নি।`,
        answerEn: `Not enough customer data found to determine top customer.`,
      };
    }

    const top = sortedCusts[0];
    return {
      answerBn: `আপনার দোকানের শীর্ষ কাস্টমার হলেন "${top.name}" (${top.phone || 'ফোন নেই'})।\nতিনি সর্বোচ্চ ${formatEngineCount(top.count, false, currency)}টি অর্ডার করেছেন এবং মোট ${formatEngineMoney(top.total, currency)} টাকার কেনাকাটা করেছেন।`,
      answerEn: `Your top customer is "${top.name}" (${top.phone || 'No phone'}).\nPlaced ${top.count} orders with total spent of ${formatEngineMoney(top.total, currency, true)}.`,
      customerData: {
        name: top.name,
        phone: top.phone,
        address: '',
        totalOrders: top.count,
        totalAmount: top.total,
        paidAmount: 0,
        dueAmount: 0,
        lastOrderDate: '',
        lastOrderStatus: '',
      },
    };
  }

  // 12. KARIGAR QUESTIONS (কোন কারিগরের কত টাকা পাওনা / কারিগর হিসাব / কারিগরদের কত টাকা দিয়েছি)
  if (
    /(কারিগর|টেইলার|দরজি|দরজী|tailor|karigar)/.test(normalizedQuery)
  ) {
    // Check if specific tailor name is mentioned
    let specificTailor = '';
    tailorRecords.forEach((t) => {
      const name = t.tailorName.toLowerCase();
      if (name && normalizedQuery.includes(name)) {
        specificTailor = t.tailorName;
      }
    });

    if (specificTailor) {
      const records = tailorRecords.filter((t) => t.tailorName.toLowerCase() === specificTailor.toLowerCase());
      const totalWage = records.reduce((s, t) => s + (t.totalWage || 0), 0);
      const totalPaid = records.reduce((s, t) => s + (t.paidAmount || 0), 0);
      const totalDue = Math.max(0, totalWage - totalPaid);
      const totalPieces = records.reduce((s, t) => s + (t.pieces || 0), 0);

      return {
        answerBn: `কারিগর "${specificTailor}"-এর হিসাব বিবরণী:\n• মোট কাজ: ${formatEngineCount(totalPieces, false, currency)} পিস পোশাক\n• মোট অর্জিত মজুরি: ${formatEngineMoney(totalWage, currency)}\n• পরিশোধ করা হয়েছে: ${formatEngineMoney(totalPaid, currency)}\n• বর্তমান বকেয়া পাওনা: ${formatEngineMoney(totalDue, currency)}`,
        answerEn: `Karigar summary for "${specificTailor}":\n• Pieces sewn: ${totalPieces}\n• Total Wage: ${formatEngineMoney(totalWage, currency, true)}\n• Paid: ${formatEngineMoney(totalPaid, currency, true)}\n• Due Balance: ${formatEngineMoney(totalDue, currency, true)}`,
        karigarData: [
          {
            tailorName: specificTailor,
            totalWage,
            paidAmount: totalPaid,
            balanceDue: totalDue,
            totalPieces,
            phone: records[0]?.tailorPhone,
          },
        ],
      };
    }

    // General karigar query
    const totalWageAll = tailorRecords.reduce((s, t) => s + (t.totalWage || 0), 0);
    const totalPaidAll = tailorRecords.reduce((s, t) => s + (t.paidAmount || 0), 0);

    return {
      answerBn: `কারিগর খাতার সার্বিক অবস্থা:\n• মোট কারিগর এন্ট্রি: ${formatEngineCount(tailorRecords.length, false, currency)}টি\n• মোট নির্ধারিত মজুরি: ${formatEngineMoney(totalWageAll, currency)}\n• পরিশোধিত মজুরি: ${formatEngineMoney(totalPaidAll, currency)}\n• বর্তমান মোট বকেয়া মজুরি: ${formatEngineMoney(overview.totalKarigarDue, currency)}`,
      answerEn: `Karigar overall ledger:\n• Total Entries: ${tailorRecords.length}\n• Total Wages: ${formatEngineMoney(totalWageAll, currency, true)}\n• Total Paid: ${formatEngineMoney(totalPaidAll, currency, true)}\n• Outstanding Wages: ${formatEngineMoney(overview.totalKarigarDue, currency, true)}`,
    };
  }

  // 13. COMPARISON (গত মাসের তুলনায় এই মাসের বিক্রি কেমন / গত মাসের সাথে তুলনা)
  if (
    /(গত মাস.*তুলনা|গত মাসের চেয়ে|তুলনায় কেমন|compare.*last month)/.test(normalizedQuery)
  ) {
    if (overview.lastMonthSales === 0 && overview.monthlySales === 0) {
      return {
        answerBn: `এই তথ্য দেওয়ার মতো পর্যাপ্ত ডাটা পাওয়া যায়নি (তুলনা করার জন্য গত মাসের বিক্রির রেকর্ড নেই)।`,
        answerEn: `Not enough data found from last month to make a comparison.`,
      };
    }

    const growth = overview.salesGrowthPercent ?? 0;
    const isHigher = growth >= 0;
    return {
      answerBn: `তুলনামূলক বিশ্লেষণ:\n• এই মাসের বিক্রি: ${formatEngineMoney(overview.monthlySales, currency)}\n• গত মাসের বিক্রি: ${formatEngineMoney(overview.lastMonthSales, currency)}\n\n${isHigher ? `এই মাসে আপনার বিক্রি গত মাসের তুলনায় ${formatEngineCount(growth, false, currency)}% বৃদ্ধি পেয়েছে! 📈` : `এই মাসে আপনার বিক্রি গত মাসের তুলনায় ${formatEngineCount(Math.abs(growth), false, currency)}% কম রয়েছে। 📉`}`,
      answerEn: `Comparison analysis:\n• This month: ${formatEngineMoney(overview.monthlySales, currency, true)}\n• Last month: ${formatEngineMoney(overview.lastMonthSales, currency, true)}\n\nSales are ${isHigher ? `up by ${growth}%` : `down by ${Math.abs(growth)}%`} compared to last month.`,
    };
  }

  // 14. CASH IN HAND / BALANCE (ক্যাশ ব্যালেন্স / হাতে কত টাকা আছে)
  if (
    /(ক্যাশ|ব্যালেন্স|নগদ|হাতে কত টাকা|cash balance)/.test(normalizedQuery)
  ) {
    return {
      answerBn: `দোকানের হিসাব অনুযায়ী বর্তমান নিট ক্যাশ ব্যালেন্স: ${formatEngineMoney(overview.cashBalance, currency)}।\n(আজকের মোট ক্যাশ জমা: ${formatEngineMoney(overview.todayAdvance + overview.todayDueCollected + overview.todayDeposits, currency)}, আজকের খরচ: ${formatEngineMoney(overview.todayExpenses, currency)})`,
      answerEn: `Current net cash balance in register: ${formatEngineMoney(overview.cashBalance, currency, true)}.\n(Today's cash-in: ${formatEngineMoney(overview.todayAdvance + overview.todayDueCollected + overview.todayDeposits, currency, true)}, Today's cash-out: ${formatEngineMoney(overview.todayExpenses, currency, true)})`,
    };
  }

  // Fallback: Not enough data or unmapped query
  return {
    answerBn: `এই তথ্য দেওয়ার মতো পর্যাপ্ত ডাটা পাওয়া যায়নি। অনুগ্রহ করে সুনির্দিষ্ট প্রশ্ন করুন (যেমন: "আজকের হিসাব", "সব বকেয়া", "রহিমের শেষ মাপ", বা "কারিগর পাওনা")।`,
    answerEn: `Not enough data found to answer this query. Please ask a specific question (e.g. "Today's sales", "All dues", "Latest measurement for Rahim", or "Karigar dues").`,
  };
};

// Generate Full AI Business Report for a selected period
export const generateAiBusinessReport = (
  period: 'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'custom',
  customStartDate: string,
  customEndDate: string,
  invoices: Invoice[],
  expenses: Expense[],
  tailorRecords: TailorRecord[],
  currency: string = '৳'
) => {
  const now = new Date();
  const todayStr = now.toISOString().split('T')[0];

  let periodLabelBn = 'আজকের';
  let periodLabelEn = "Today's";
  let filterFn: (dateStr: string) => boolean;

  if (period === 'today') {
    filterFn = (d) => d === todayStr;
    periodLabelBn = `আজকের (${todayStr})`;
    periodLabelEn = `Today (${todayStr})`;
  } else if (period === 'thisWeek') {
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(oneWeekAgo.getDate() - 7);
    const weekAgoStr = oneWeekAgo.toISOString().split('T')[0];
    filterFn = (d) => d >= weekAgoStr && d <= todayStr;
    periodLabelBn = `এই সপ্তাহের (${weekAgoStr} থেকে ${todayStr})`;
    periodLabelEn = `This Week (${weekAgoStr} to ${todayStr})`;
  } else if (period === 'thisMonth') {
    const monthStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}`;
    filterFn = (d) => d.startsWith(monthStr);
    periodLabelBn = `এই মাসের (${monthStr})`;
    periodLabelEn = `This Month (${monthStr})`;
  } else if (period === 'thisYear') {
    const yearStr = `${now.getFullYear()}`;
    filterFn = (d) => d.startsWith(yearStr);
    periodLabelBn = `এই বছরের (${yearStr})`;
    periodLabelEn = `This Year (${yearStr})`;
  } else {
    filterFn = (d) => d >= customStartDate && d <= customEndDate;
    periodLabelBn = `${customStartDate} থেকে ${customEndDate}`;
    periodLabelEn = `${customStartDate} to ${customEndDate}`;
  }

  // Filter datasets
  const filteredInvoices = invoices.filter((i) => i.orderDate && filterFn(i.orderDate));
  const filteredExpenses = expenses.filter((e) => e.date && filterFn(e.date) && (e.type === 'Expense' || !e.type));
  const filteredDeposits = expenses.filter((e) => e.date && filterFn(e.date) && e.type === 'Deposit');
  const filteredTailors = tailorRecords.filter((t) => t.assignedDate && filterFn(t.assignedDate));

  // Calculations
  const totalSales = filteredInvoices.reduce((s, i) => s + (i.netTotal || 0), 0);
  const totalAdvance = filteredInvoices.reduce((s, i) => s + (i.advanceDeposit || 0), 0);
  const totalDue = filteredInvoices.reduce((s, i) => s + (i.remainingDue || 0), 0);
  const totalOrdersCount = filteredInvoices.length;

  const pendingOrders = filteredInvoices.filter((i) => i.orderStatus === 'Pending').length;
  const inProgressOrders = filteredInvoices.filter((i) => i.orderStatus === 'In Progress').length;
  const readyOrders = filteredInvoices.filter((i) => i.orderStatus === 'Ready for Pickup').length;
  const deliveredOrders = filteredInvoices.filter((i) => i.orderStatus === 'Delivered').length;

  const totalExpenseAmount = filteredExpenses.reduce((s, e) => s + (e.amount || 0), 0);
  const totalDepositsAmount = filteredDeposits.reduce((s, e) => s + (e.amount || 0), 0);
  const estimatedNetProfit = totalSales - totalExpenseAmount;

  const totalKarigarWages = filteredTailors.reduce((s, t) => s + (t.totalWage || 0), 0);
  const totalKarigarPaid = filteredTailors.reduce((s, t) => s + (t.paidAmount || 0), 0);
  const totalKarigarDue = Math.max(0, totalKarigarWages - totalKarigarPaid);

  const customerSet = new Set(filteredInvoices.map((i) => i.customerPhone || i.customerName));
  const uniqueCustomersCount = customerSet.size;

  // Key observations
  const observationsBn: string[] = [];
  const observationsEn: string[] = [];

  if (totalSales > 0) {
    const avgOrder = Math.round(totalSales / (totalOrdersCount || 1));
    observationsBn.push(`অর্ডার প্রতি গড় মূল্য ছিল ${formatEngineMoney(avgOrder, currency)} টাকা।`);
    observationsEn.push(`Average order value was ${formatEngineMoney(avgOrder, currency, true)}.`);
  }

  if (readyOrders > 0) {
    observationsBn.push(`${formatEngineCount(readyOrders, false, currency)}টি অর্ডার রেডি রয়েছে, কাস্টমারদের দ্রুত ডেলিভারি নিতে তাগাদা পাঠান।`);
    observationsEn.push(`${readyOrders} orders are ready for pickup, follow up with customers.`);
  }

  if (totalDue > 0) {
    observationsBn.push(`এই সময়ের অর্ডারে মোট ${formatEngineMoney(totalDue, currency)} বকেয়া রয়েছে যা আদায়ের জন্য ফলো-আপ প্রয়োজন।`);
    observationsEn.push(`Total ${formatEngineMoney(totalDue, currency, true)} customer due remains to be collected.`);
  }

  if (estimatedNetProfit > 0) {
    observationsBn.push(`মোট লাভজনক অনুপাত সন্তোষজনক (নিট লাভ: ${formatEngineMoney(estimatedNetProfit, currency)})।`);
    observationsEn.push(`Profit margin is healthy (Net Profit: ${formatEngineMoney(estimatedNetProfit, currency, true)}).`);
  }

  const reportTextBn = `====================================
📊 জীবন টেইলার্স - AI বিজনেস রিপোর্ট
সময়কাল: ${periodLabelBn}
তৈরির তারিখ: ${new Date().toLocaleDateString('bn-BD')}
====================================

💰 আর্থিক সারসংক্ষেপ:
• মোট বিক্রি: ${formatEngineMoney(totalSales, currency)}
• অগ্রিম আদায়: ${formatEngineMoney(totalAdvance, currency)}
• কাস্টমার বকেয়া: ${formatEngineMoney(totalDue, currency)}
• মোট দোকান খরচ: ${formatEngineMoney(totalExpenseAmount, currency)}
• অন্যান্য ক্যাশ জমা: ${formatEngineMoney(totalDepositsAmount, currency)}
• আনুমানিক নিট লাভ: ${formatEngineMoney(estimatedNetProfit, currency)}

📦 অর্ডারের পরিসংখ্যান:
• মোট নতুন অর্ডার: ${formatEngineCount(totalOrdersCount, false, currency)}টি
• সক্রিয় কাস্টমার: ${formatEngineCount(uniqueCustomersCount, false, currency)} জন
• ডেলিভারি সম্পন্ন: ${formatEngineCount(deliveredOrders, false, currency)}টি
• রেডি (ডেলিভারি অপেক্ষায়): ${formatEngineCount(readyOrders, false, currency)}টি
• কাজ চলমান (In Progress): ${formatEngineCount(inProgressOrders, false, currency)}টি
• পেন্ডিং অর্ডার: ${formatEngineCount(pendingOrders, false, currency)}টি

✂️ কারিগর ও মজুরি হিসাব:
• কারিগরদের মোট কাজের মজুরি: ${formatEngineMoney(totalKarigarWages, currency)}
• পরিশোধিত মজুরি: ${formatEngineMoney(totalKarigarPaid, currency)}
• বকেয়া মজুরি পাওনা: ${formatEngineMoney(totalKarigarDue, currency)}

💡 গুরুত্বপূর্ণ ব্যবসায়িক পর্যবেক্ষণ:
${observationsBn.map((o, idx) => `${idx + 1}. ${o}`).join('\n')}
====================================`;

  const reportTextEn = `====================================
📊 Business AI Report
Period: ${periodLabelEn}
Generated: ${new Date().toLocaleDateString('en-US')}
====================================

💰 Financial Summary:
• Total Sales: ${formatEngineMoney(totalSales, currency, true)}
• Advance Collected: ${formatEngineMoney(totalAdvance, currency, true)}
• Customer Dues: ${formatEngineMoney(totalDue, currency, true)}
• Shop Expenses: ${formatEngineMoney(totalExpenseAmount, currency, true)}
• Other Deposits: ${formatEngineMoney(totalDepositsAmount, currency, true)}
• Estimated Net Profit: ${formatEngineMoney(estimatedNetProfit, currency, true)}

📦 Order Statistics:
• New Orders: ${totalOrdersCount} orders
• Active Customers: ${uniqueCustomersCount} clients
• Delivered: ${deliveredOrders} orders
• Ready for Pickup: ${readyOrders} orders
• In Progress: ${inProgressOrders} orders
• Pending: ${pendingOrders} orders

✂️ Karigar & Tailor Wages:
• Total Wages Earned: ${formatEngineMoney(totalKarigarWages, currency, true)}
• Wages Paid: ${formatEngineMoney(totalKarigarPaid, currency, true)}
• Outstanding Due to Tailors: ${formatEngineMoney(totalKarigarDue, currency, true)}

💡 Key Business Insights:
${observationsEn.map((o, idx) => `${idx + 1}. ${o}`).join('\n')}
====================================`;

  return {
    periodLabelBn,
    periodLabelEn,
    totalSales,
    totalAdvance,
    totalDue,
    totalOrdersCount,
    uniqueCustomersCount,
    pendingOrders,
    inProgressOrders,
    readyOrders,
    deliveredOrders,
    totalExpenseAmount,
    totalDepositsAmount,
    estimatedNetProfit,
    totalKarigarWages,
    totalKarigarPaid,
    totalKarigarDue,
    observationsBn,
    observationsEn,
    reportTextBn,
    reportTextEn,
  };
};
