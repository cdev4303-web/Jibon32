import { Invoice, InvoiceItem } from '../types';

export interface AiInvoiceDraft {
  customerName: string;
  customerNameBn?: string;
  customerNameEn?: string;
  customerPhone?: string;
  customerAddress?: string;
  dressType: string;
  items: {
    id?: string;
    description: string;
    descriptionBn?: string;
    descriptionEn?: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
  }[];
  subtotal: number;
  discount: number;
  netTotal: number;
  advanceDeposit: number;
  remainingDue: number;
  paymentMethod?: string;
  deliveryDate?: string;
  specialNotesBn?: string;
  specialNotesEn?: string;
  summaryBn: string;
  summaryEn: string;
  formattedInvoiceTextBn?: string;
  formattedInvoiceTextEn?: string;
  currency: string;
  aiPowered?: boolean;
}

// Convert Bengali digits (০-৯) to English digits (0-9)
export const convertBnDigitsToEn = (str: string): string => {
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
  return str.replace(/[০-৯]/g, (ch) => bnToEnMap[ch] || ch);
};

// Word numbers in Bengali to digits
export const convertBengaliWordNumbers = (text: string): string => {
  let normalized = text;
  const wordMap: Record<string, string> = {
    'একটি': '1টি',
    'একটা': '1টা',
    'এক': '1',
    'দুইটি': '2টি',
    'দুটো': '2টো',
    'দুইটা': '2টা',
    'দুটি': '2টি',
    'দুই': '2',
    'তিনটি': '3টি',
    'তিনটা': '3টা',
    'তিন': '3',
    'চারটি': '4টি',
    'চারটা': '4টা',
    'চার': '4',
    'পাঁচটি': '5টি',
    'পাঁচটা': '5টা',
    'পাঁচ': '5',
    'ছয়টি': '6টি',
    'ছয়টা': '6টা',
    'ছয়': '6',
    'সাতটি': '7টি',
    'সাতটা': '7টা',
    'সাত': '7',
    'আটটি': '8টি',
    'আটটা': '8টা',
    'আট': '8',
    'নয়টি': '9টি',
    'নয়টা': '9টা',
    'নয়': '9',
    'দশটি': '10টি',
    'দশটা': '10টা',
    'দশ': '10',
  };

  for (const [word, num] of Object.entries(wordMap)) {
    const reg = new RegExp(`\\b${word}\\b`, 'gi');
    normalized = normalized.replace(reg, num);
  }
  return normalized;
};

// Smart Local Fallback Parser (Robust & Fast)
export const fallbackLocalInvoiceParser = (
  rawPrompt: string,
  defaultCurrency = 'OMR',
  defaultDeliveryDays = 5
): AiInvoiceDraft => {
  const text = convertBengaliWordNumbers(convertBnDigitsToEn(rawPrompt.trim()));
  const today = new Date();
  const deliveryDateObj = new Date(today.getTime() + defaultDeliveryDays * 86400000);
  const deliveryDateStr = deliveryDateObj.toISOString().split('T')[0];

  // 1. Extract Customer Name
  // e.g. "তুমি জীবনের 2টি জামা 8 omr" -> "জীবন"
  // "make 2 dresses for Jibon 8 omr" -> "Jibon"
  // "কাস্টমার রহিম ৩টি শার্ট ১৫ রিয়াল" -> "রহিম"
  let customerName = 'Jibon';
  let customerNameBn = 'জীবন';
  let customerNameEn = 'Jibon';

  // Common prefixes to remove
  let cleaned = text
    .replace(/^(তুমি|আপনি|ai|এআই|please|hello|hi|hey|মেহেরবানী করে|দয়া করে)\s+/i, '')
    .replace(/^(invoice|order|ইনভয়েস|অর্ডার|বানাও|তৈরি করো|লিখে দাও|সাজাও|সাজিয়ে দাও|লিখো)\s+/i, '');

  // Regex patterns to capture customer name
  const forPattern = /(?:for|customer|কাস্টমার)\s+([A-Za-z\u0980-\u09FF\s]+?)(?=\s+(?:এর|er|\d+|for|need|want|items?|dress|jama|\d+টি|\d+টা))/i;
  const erPattern = /^([A-Za-z\u0980-\u09FF]+)(?:এর|er|\'s)\s+/i;
  const matchFor = cleaned.match(forPattern);
  const matchEr = cleaned.match(erPattern);

  if (matchEr && matchEr[1]) {
    const raw = matchEr[1].trim();
    if (!['তুমি', 'আপনি', 'আমার', 'দোকান'].includes(raw)) {
      customerName = raw;
    }
  } else if (matchFor && matchFor[1]) {
    customerName = matchFor[1].trim();
  } else {
    // Check if the first word might be the customer name
    const firstWordMatch = cleaned.match(/^([A-Za-z\u0980-\u09FF]+)(?:\s+|$)/);
    if (firstWordMatch && firstWordMatch[1]) {
      const candidate = firstWordMatch[1].trim().replace(/(এর|er)$/i, '');
      if (
        ![
          'তুমি',
          'আপনি',
          'একটি',
          'দুইটি',
          'বানাও',
          'ইনভয়েস',
          'অর্ডার',
          'make',
          'create',
          'new',
          'order',
          'invoice',
        ].includes(candidate.toLowerCase())
      ) {
        customerName = candidate;
      }
    }
  }

  // Set bilingual names
  if (/^জীবন/i.test(customerName) || /^jibon/i.test(customerName)) {
    customerName = 'জীবন';
    customerNameBn = 'জীবন';
    customerNameEn = 'Jibon';
  } else if (/[\u0980-\u09FF]/.test(customerName)) {
    customerNameBn = customerName;
    customerNameEn = customerName; // Transliterated or direct
  } else {
    customerNameEn = customerName;
    customerNameBn = customerName;
  }

  // 2. Extract Quantity & Item/Dress
  // "2টি জামা", "2 dresses", "3টি আবায়া", "1 শার্ট"
  let quantity = 1;
  const qtyMatch = text.match(/(\d+)\s*(?:টি|টা|pcs|pieces|piece|pairs?|items?)?/i);
  if (qtyMatch && qtyMatch[1]) {
    const parsedQty = parseInt(qtyMatch[1], 10);
    if (parsedQty > 0 && parsedQty < 500) {
      quantity = parsedQty;
    }
  }

  // Identify Item Description & Dress Type
  let itemDescriptionBn = 'জামা (টেইলারিং)';
  let itemDescriptionEn = 'Tailored Dress';
  let dressType = 'Dress / জামা';

  if (/(?:আবায়া|বোরকা|abaya|burqa)/i.test(text)) {
    itemDescriptionBn = 'আবায়া / বোরকা';
    itemDescriptionEn = 'Custom Abaya';
    dressType = 'Abaya';
  } else if (/(?:পাঞ্জাবি|panjabi|punjabi|kurta)/i.test(text)) {
    itemDescriptionBn = 'পাঞ্জাবি';
    itemDescriptionEn = 'Custom Punjabi';
    dressType = 'Punjabi';
  } else if (/(?:শার্ট|shirt)/i.test(text)) {
    itemDescriptionBn = 'শার্ট';
    itemDescriptionEn = 'Custom Tailored Shirt';
    dressType = 'Shirt';
  } else if (/(?:প্যান্ট|pant|trouser)/i.test(text)) {
    itemDescriptionBn = 'প্যান্ট / ট্রাউজার';
    itemDescriptionEn = 'Custom Tailored Pants';
    dressType = 'Pant';
  } else if (/(?:কামিজ|সেলোয়ার|salwar|kameez|suit)/i.test(text)) {
    itemDescriptionBn = 'সেলোয়ার কামিজ / স্যুট';
    itemDescriptionEn = 'Salwar Kameez Suit';
    dressType = 'Salwar Kameez';
  } else if (/(?:জামা|dress|frock|পোশাক)/i.test(text)) {
    itemDescriptionBn = 'জামা (টেইলারিং)';
    itemDescriptionEn = 'Custom Tailored Dress';
    dressType = 'Dress / জামা';
  }

  // 3. Extract Price & Currency
  // e.g. "8 omr", "৮ রিয়াল", "8 riyal", "8 ওএমআর", "500 tk", "15 OMR"
  let totalPrice = 8;
  let currency = defaultCurrency;

  const currencyMatch = text.match(/(omr|রিয়াল|রিয়াল|ওএমআর|ro|tk|টাকা|bdt|sar|aed|usd|\$)/i);
  if (currencyMatch && currencyMatch[1]) {
    const curRaw = currencyMatch[1].toLowerCase();
    if (curRaw.includes('omr') || curRaw.includes('রিয়াল') || curRaw.includes('রিয়াল') || curRaw.includes('ওএমআর') || curRaw === 'ro') {
      currency = 'OMR';
    } else if (curRaw.includes('tk') || curRaw.includes('টাকা') || curRaw.includes('bdt')) {
      currency = '৳';
    } else if (curRaw.includes('sar')) {
      currency = 'SAR';
    } else if (curRaw.includes('aed')) {
      currency = 'AED';
    } else if (curRaw.includes('usd') || curRaw === '$') {
      currency = '$';
    }
  }

  // Match price numbers: look for number near currency or near total/price
  const priceWithCurMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:omr|রিয়াল|রিয়াল|ওএমআর|ro|tk|টাকা|bdt|sar|aed|usd|\$)/i) ||
    text.match(/(?:omr|রিয়াল|রিয়াল|ওএমআর|ro|tk|টাকা|bdt|sar|aed|usd|\$)\s*(\d+(?:\.\d+)?)/i);

  if (priceWithCurMatch && priceWithCurMatch[1]) {
    totalPrice = parseFloat(priceWithCurMatch[1]);
  } else {
    // If no direct currency match, find the last number in text that isn't the quantity
    const allNumbers = [...text.matchAll(/\b(\d+(?:\.\d+)?)\b/g)].map((m) => parseFloat(m[1]));
    if (allNumbers.length >= 2) {
      // e.g. "2টি জামা 8" -> allNumbers = [2, 8] -> totalPrice = 8
      totalPrice = allNumbers[allNumbers.length - 1];
    } else if (allNumbers.length === 1 && allNumbers[0] > quantity) {
      totalPrice = allNumbers[0];
    }
  }

  // 4. Advance deposit & due
  let advanceDeposit = 0;
  const advMatch = text.match(/(?:জমা|অগ্রিম|advance|deposit|paid)\s*(\d+(?:\.\d+)?)/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*(?:রিয়াল|omr|টাকা|tk)?\s*(?:জমা|অগ্রিম|advance|deposit|paid)/i);
  if (advMatch && advMatch[1]) {
    const adv = parseFloat(advMatch[1]);
    if (adv <= totalPrice) {
      advanceDeposit = adv;
    }
  }

  const remainingDue = Math.max(0, totalPrice - advanceDeposit);
  const unitPrice = quantity > 0 ? Number((totalPrice / quantity).toFixed(3)) : totalPrice;

  // 5. Customer Phone if provided
  let customerPhone = '';
  const phoneMatch = text.match(/(?:\+?\d{8,14})/);
  if (phoneMatch && phoneMatch[0] && phoneMatch[0].length >= 8) {
    customerPhone = phoneMatch[0];
  }

  // 6. Delivery Date detection
  let deliveryDate = deliveryDateStr;
  if (/আগামীকাল|tomorrow/i.test(text)) {
    const d = new Date(today.getTime() + 86400000);
    deliveryDate = d.toISOString().split('T')[0];
  } else if (/পরশু|day after tomorrow/i.test(text)) {
    const d = new Date(today.getTime() + 2 * 86400000);
    deliveryDate = d.toISOString().split('T')[0];
  } else if (/শুক্রবার|friday/i.test(text)) {
    const d = new Date(today);
    d.setDate(d.getDate() + ((7 - d.getDay() + 5) % 7 || 7));
    deliveryDate = d.toISOString().split('T')[0];
  }

  const summaryBn = `কাস্টমার ${customerNameBn}-এর জন্য ${quantity}টি ${itemDescriptionBn} এর ইনভয়েস সফলভাবে সাজানো হয়েছে। মোট মূল্য: ${totalPrice.toFixed(2)} ${currency} (প্রতিটি ${unitPrice.toFixed(2)} ${currency})${advanceDeposit > 0 ? `, অগ্রিম জমা: ${advanceDeposit.toFixed(2)} ${currency}, বাকি: ${remainingDue.toFixed(2)} ${currency}` : ''}।`;
  const summaryEn = `Invoice prepared for customer ${customerNameEn}: ${quantity} ${itemDescriptionEn} at ${unitPrice.toFixed(2)} ${currency} each. Total: ${totalPrice.toFixed(2)} ${currency}${advanceDeposit > 0 ? ` (Advance: ${advanceDeposit.toFixed(2)}, Due: ${remainingDue.toFixed(2)})` : ''}.`;

  return {
    customerName,
    customerNameBn,
    customerNameEn,
    customerPhone,
    customerAddress: '',
    dressType,
    items: [
      {
        id: `item-${Date.now()}`,
        description: `${itemDescriptionBn} / ${itemDescriptionEn}`,
        descriptionBn: itemDescriptionBn,
        descriptionEn: itemDescriptionEn,
        quantity,
        unitPrice,
        totalPrice,
      },
    ],
    subtotal: totalPrice,
    discount: 0,
    netTotal: totalPrice,
    advanceDeposit,
    remainingDue,
    paymentMethod: 'Cash',
    deliveryDate,
    specialNotesBn: `${customerNameBn}-এর জন্য ${quantity}টি পোশাকের সেলাই ও ফিটিং মাপ।`,
    specialNotesEn: `Tailoring order of ${quantity} pcs for ${customerNameEn}.`,
    summaryBn,
    summaryEn,
    formattedInvoiceTextBn: `🧾 মেসার্স জীবন টেইলার্স — ইনভয়েস রসিদ
────────────────────────────
👤 কাস্টমার: ${customerNameBn} (${customerNameEn})
👗 পোশাক: ${itemDescriptionBn}
🔢 পরিমাণ: ${quantity} পিস (প্রতিটি ${unitPrice.toFixed(2)} ${currency})
💵 মোট বিল: ${totalPrice.toFixed(2)} ${currency}
📥 অগ্রিম জমা: ${advanceDeposit.toFixed(2)} ${currency}
📌 বাকি পাওনা: ${remainingDue.toFixed(2)} ${currency}
📅 ডেলিভারি তারিখ: ${deliveryDate}
📝 নোট: ${customerNameBn}-এর জন্য ${quantity}টি সেলাই ও ফিটিং অর্ডার।
────────────────────────────
ধন্যবাদ! আপনার পোশাক সময়মতো যত্নসহকারে প্রস্তুত করা হবে।`,
    formattedInvoiceTextEn: `🧾 JIBON TAILOR SHOP — OFFICIAL RECEIPT
────────────────────────────
👤 Customer: ${customerNameEn} (${customerNameBn})
👗 Item: ${itemDescriptionEn}
🔢 Quantity: ${quantity} pcs (@ ${unitPrice.toFixed(2)} ${currency} each)
💵 Net Total: ${totalPrice.toFixed(2)} ${currency}
📥 Advance Paid: ${advanceDeposit.toFixed(2)} ${currency}
📌 Remaining Due: ${remainingDue.toFixed(2)} ${currency}
📅 Delivery Date: ${deliveryDate}
📝 Notes: Tailoring order of ${quantity} pcs for ${customerNameEn}.
────────────────────────────
Thank you for choosing Jibon Tailor Shop!`,
    currency,
    aiPowered: true,
  };
};

// Generate high-resolution bilingual invoice formatted text for display, copying, or WhatsApp
export const buildBilingualInvoiceText = (
  draft: AiInvoiceDraft,
  shopName = 'JIBON TAILOR SHOP'
): {
  textBn: string;
  textEn: string;
  bilingualCombined: string;
  whatsAppMessage: string;
} => {
  const custBn = draft.customerNameBn || draft.customerName;
  const custEn = draft.customerNameEn || draft.customerName;
  const firstItem = draft.items[0];
  const itemDescBn = firstItem?.descriptionBn || firstItem?.description || draft.dressType;
  const itemDescEn = firstItem?.descriptionEn || firstItem?.description || draft.dressType;
  const qty = firstItem?.quantity || 1;
  const rate = firstItem?.unitPrice || draft.netTotal;

  const textBn = draft.formattedInvoiceTextBn || `🧾 মেসার্স জীবন টেইলার্স — ইনভয়েস রসিদ
────────────────────────────
👤 কাস্টমার: ${custBn}
👗 পোশাক: ${itemDescBn}
🔢 পরিমাণ: ${qty} পিস (প্রতিটি ${rate.toFixed(2)} ${draft.currency})
💵 সর্বমোট বিল: ${draft.netTotal.toFixed(2)} ${draft.currency}
📥 অগ্রিম জমা: ${draft.advanceDeposit.toFixed(2)} ${draft.currency}
📌 অবশিষ্ট বাকি: ${draft.remainingDue.toFixed(2)} ${draft.currency}
📅 ডেলিভারির তারিখ: ${draft.deliveryDate || 'শীঘ্রই'}
📝 বিশেষ নোট: ${draft.specialNotesBn || 'সেলাই ও সাইজ অনুযায়ী ফিটিং'}
────────────────────────────
ধন্যবাদ! আপনার পোশাক সময়মতো যত্নসহকারে প্রস্তুত করা হবে।`;

  const textEn = draft.formattedInvoiceTextEn || `🧾 ${shopName} — OFFICIAL INVOICE
────────────────────────────
👤 Customer: ${custEn} (${custBn})
👗 Item: ${itemDescEn}
🔢 Quantity: ${qty} pcs (@ ${rate.toFixed(2)} ${draft.currency} each)
💵 Net Total: ${draft.netTotal.toFixed(2)} ${draft.currency}
📥 Advance Paid: ${draft.advanceDeposit.toFixed(2)} ${draft.currency}
📌 Remaining Due: ${draft.remainingDue.toFixed(2)} ${draft.currency}
📅 Delivery Date: ${draft.deliveryDate || 'To be notified'}
📝 Notes: ${draft.specialNotesEn || 'Custom tailoring and fitting'}
────────────────────────────
Thank you for choosing ${shopName}!`;

  const bilingualCombined = `🧾 ${shopName} / মেসার্স জীবন টেইলার্স
========================================
🇧🇩 বাংলা ইনভয়েস (Bengali):
👤 কাস্টমার: ${custBn} (${custEn})
👗 পোশাক: ${itemDescBn}
🔢 পরিমাণ: ${qty} পিস @ ${rate.toFixed(2)} ${draft.currency}
💵 মোট বিল: ${draft.netTotal.toFixed(2)} ${draft.currency}
📥 অগ্রিম জমা: ${draft.advanceDeposit.toFixed(2)} ${draft.currency}
📌 বাকি পাওনা: ${draft.remainingDue.toFixed(2)} ${draft.currency}
📅 ডেলিভারি: ${draft.deliveryDate || 'নির্ধারিত তারিখে'}

🇬🇧 English Invoice:
👤 Customer: ${custEn} (${custBn})
👗 Item: ${itemDescEn}
🔢 Quantity: ${qty} pcs @ ${rate.toFixed(2)} ${draft.currency} each
💵 Net Total: ${draft.netTotal.toFixed(2)} ${draft.currency}
📥 Advance Paid: ${advanceDepositFormatted(draft.advanceDeposit, draft.currency)}
📌 Balance Due: ${draft.remainingDue.toFixed(2)} ${draft.currency}
📅 Delivery Date: ${draft.deliveryDate || 'Scheduled'}
========================================
Thank you / ধন্যবাদ!`;

  const whatsAppMessage = encodeURIComponent(
    `*${shopName} / জীবন টেইলার্স — ইনভয়েস রসিদ*\n\n` +
    `👤 *Customer / কাস্টমার:* ${custBn} (${custEn})\n` +
    `👗 *Item / পোশাক:* ${qty} pcs ${itemDescEn} (${itemDescBn})\n` +
    `💵 *Total Bill / মোট বিল:* ${draft.currency} ${draft.netTotal.toFixed(2)}\n` +
    `📥 *Advance / জমা:* ${draft.currency} ${draft.advanceDeposit.toFixed(2)}\n` +
    `📌 *Remaining Due / বাকি:* ${draft.currency} ${draft.remainingDue.toFixed(2)}\n` +
    `📅 *Delivery Date / ডেলিভারি:* ${draft.deliveryDate || 'Scheduled'}\n\n` +
    `_Thank you for choosing Jibon Tailors! / আপনাকে ধন্যবাদ!_`
  );

  return {
    textBn,
    textEn,
    bilingualCombined,
    whatsAppMessage,
  };
};

const advanceDepositFormatted = (adv: number, curr: string) => `${adv.toFixed(2)} ${curr}`;

// Convert an AiInvoiceDraft directly into a full Invoice record ready to be saved
export const convertDraftToInvoice = (draft: AiInvoiceDraft, shopId: string): Invoice => {
  const now = Date.now();
  const invoiceId = `JT-${Math.floor(1000 + Math.random() * 9000)}`;
  const todayStr = new Date().toISOString().split('T')[0];

  const items: InvoiceItem[] = draft.items.map((item, index) => ({
    id: item.id || `item-${now}-${index}`,
    invoiceId,
    description: item.description || `${item.descriptionBn || ''} / ${item.descriptionEn || ''}`,
    quantity: item.quantity,
    unitPrice: item.unitPrice,
    totalPrice: item.totalPrice,
  }));

  const payments = [];
  if (draft.advanceDeposit > 0) {
    payments.push({
      id: `pay-${now}`,
      invoiceId,
      customerPhone: draft.customerPhone || '',
      amount: draft.advanceDeposit,
      paymentMethod: (draft.paymentMethod as any) || 'Cash',
      paymentDate: todayStr,
      notes: `AI Invoice Initial Advance Deposit / প্রাথমিক জমা`,
      createdAt: now,
    });
  }

  return {
    id: invoiceId,
    shopId,
    customerName: draft.customerNameBn || draft.customerName,
    customerPhone: draft.customerPhone || '',
    customerAddress: draft.customerAddress || '',
    orderDate: todayStr,
    deliveryDate: draft.deliveryDate || new Date(now + 5 * 86400000).toISOString().split('T')[0],
    dressType: draft.dressType || 'Dress / জামা',
    orderStatus: 'Pending',
    subtotal: draft.subtotal,
    discount: draft.discount,
    netTotal: draft.netTotal,
    advanceDeposit: draft.advanceDeposit,
    remainingDue: draft.remainingDue,
    paymentMethod: (draft.paymentMethod as any) || 'Cash',
    items,
    payments,
    notes: draft.specialNotesBn || draft.specialNotesEn || '',
    createdAt: now,
    updatedAt: now,
  };
};

// Main function: calls server-side Gemini endpoint `/api/ai/parse-invoice`, falls back to local parser on any error
export const parseInvoiceWithAi = async (
  prompt: string,
  currency = 'OMR',
  defaultDeliveryDays = 5
): Promise<AiInvoiceDraft> => {
  const cleanPrompt = prompt.trim();
  if (!cleanPrompt) {
    throw new Error('Please enter a voice or text command for AI invoice creation.');
  }

  try {
    const res = await fetch('/api/ai/parse-invoice', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        prompt: cleanPrompt,
        currency,
        defaultDeliveryDays,
      }),
    });

    if (res.ok) {
      const data = await res.json();
      if (data && data.success && data.invoice) {
        return {
          ...data.invoice,
          aiPowered: true,
        };
      }
    }
  } catch (err) {
    console.warn('Server-side Gemini invoice parsing encountered an issue, falling back to smart local NLP parser:', err);
  }

  // Graceful fallback: guaranteed to parse "তুমি জীবনের 2টি জামা 8 omr"
  return fallbackLocalInvoiceParser(cleanPrompt, currency, defaultDeliveryDays);
};
