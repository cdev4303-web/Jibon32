import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { GoogleGenAI, Type } from '@google/genai';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// Lazy initialization of Gemini Client
let geminiClient: GoogleGenAI | null = null;
function getGemini(): GoogleGenAI | null {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      geminiClient = new GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });
    }
  }
  return geminiClient;
}

// Health check endpoint
app.get('/api/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    app: 'Jibon Tailor Shop System',
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    time: new Date().toISOString(),
  });
});

// Helper: Local fallback parser in case Gemini API is offline or key not supplied
function localFallbackParser(rawPrompt: string, defaultCurrency = 'OMR', defaultDeliveryDays = 5) {
  const text = rawPrompt.trim();
  const today = new Date();
  const deliveryDateObj = new Date(today.getTime() + defaultDeliveryDays * 86400000);
  const deliveryDateStr = deliveryDateObj.toISOString().split('T')[0];

  let customerName = 'Jibon';
  let customerNameBn = 'জীবন';
  let customerNameEn = 'Jibon';

  // Customer name extraction
  const cleaned = text
    .replace(/^(তুমি|আপনি|ai|এআই|please|hello|hi|hey|মেহেরবানী করে|দয়া করে)\s+/i, '')
    .replace(/^(invoice|order|ইনভয়েস|অর্ডার|বানাও|তৈরি করো|লিখে দাও|সাজাও|সাজিয়ে দাও|লিখো)\s+/i, '');

  const matchFor = cleaned.match(/(?:for|customer|কাস্টমার)\s+([A-Za-z\u0980-\u09FF\s]+?)(?=\s+(?:এর|er|\d+|for|need|want|items?|dress|jama|\d+টি|\d+টা))/i);
  const matchEr = cleaned.match(/^([A-Za-z\u0980-\u09FF]+)(?:এর|er|\'s)\s+/i);

  if (matchEr && matchEr[1]) {
    const raw = matchEr[1].trim();
    if (!['তুমি', 'আপনি', 'আমার', 'দোকান'].includes(raw)) customerName = raw;
  } else if (matchFor && matchFor[1]) {
    customerName = matchFor[1].trim();
  } else {
    const firstWordMatch = cleaned.match(/^([A-Za-z\u0980-\u09FF]+)(?:\s+|$)/);
    if (firstWordMatch && firstWordMatch[1]) {
      const candidate = firstWordMatch[1].trim().replace(/(এর|er)$/i, '');
      if (!['তুমি', 'আপনি', 'একটি', 'দুইটি', 'বানাও', 'ইনভয়েস', 'অর্ডার', 'make', 'create', 'new', 'order', 'invoice'].includes(candidate.toLowerCase())) {
        customerName = candidate;
      }
    }
  }

  if (/^জীবন/i.test(customerName) || /^jibon/i.test(customerName)) {
    customerName = 'জীবন';
    customerNameBn = 'জীবন';
    customerNameEn = 'Jibon';
  } else {
    customerNameBn = customerName;
    customerNameEn = customerName;
  }

  // Quantity extraction
  let quantity = 1;
  const qtyMatch = text.match(/(\d+)\s*(?:টি|টা|pcs|pieces|piece|pairs?|items?)?/i);
  if (qtyMatch && qtyMatch[1]) {
    const parsedQty = parseInt(qtyMatch[1], 10);
    if (parsedQty > 0 && parsedQty < 500) quantity = parsedQty;
  }

  // Dress Type & Description
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
  }

  // Price & Currency
  let totalPrice = 8;
  let currency = defaultCurrency;
  if (/omr|রিয়াল|রিয়াল|ওএমআর|ro/i.test(text)) currency = 'OMR';
  else if (/tk|টাকা|bdt/i.test(text)) currency = '৳';
  else if (/sar/i.test(text)) currency = 'SAR';
  else if (/aed/i.test(text)) currency = 'AED';
  else if (/usd|\$/i.test(text)) currency = '$';

  const priceWithCurMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:omr|রিয়াল|রিয়াল|ওএমআর|ro|tk|টাকা|bdt|sar|aed|usd|\$)/i) ||
    text.match(/(?:omr|রিয়াল|রিয়াল|ওএমআর|ro|tk|টাকা|bdt|sar|aed|usd|\$)\s*(\d+(?:\.\d+)?)/i);

  if (priceWithCurMatch && priceWithCurMatch[1]) {
    totalPrice = parseFloat(priceWithCurMatch[1]);
  } else {
    const allNumbers = [...text.matchAll(/\b(\d+(?:\.\d+)?)\b/g)].map((m) => parseFloat(m[1]));
    if (allNumbers.length >= 2) totalPrice = allNumbers[allNumbers.length - 1];
    else if (allNumbers.length === 1 && allNumbers[0] > quantity) totalPrice = allNumbers[0];
  }

  // Advance deposit
  let advanceDeposit = 0;
  const advMatch = text.match(/(?:জমা|অগ্রিম|advance|deposit|paid)\s*(\d+(?:\.\d+)?)/i) ||
    text.match(/(\d+(?:\.\d+)?)\s*(?:রিয়াল|omr|টাকা|tk)?\s*(?:জমা|অগ্রিম|advance|deposit|paid)/i);
  if (advMatch && advMatch[1]) {
    const adv = parseFloat(advMatch[1]);
    if (adv <= totalPrice) advanceDeposit = adv;
  }

  const remainingDue = Math.max(0, totalPrice - advanceDeposit);
  const unitPrice = quantity > 0 ? Number((totalPrice / quantity).toFixed(3)) : totalPrice;

  let deliveryDate = deliveryDateStr;
  if (/আগামীকাল|tomorrow/i.test(text)) {
    deliveryDate = new Date(today.getTime() + 86400000).toISOString().split('T')[0];
  } else if (/পরশু|day after tomorrow/i.test(text)) {
    deliveryDate = new Date(today.getTime() + 2 * 86400000).toISOString().split('T')[0];
  }

  return {
    customerName,
    customerNameBn,
    customerNameEn,
    customerPhone: '',
    customerAddress: '',
    dressType,
    items: [
      {
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
    deliveryDate,
    specialNotesBn: `${customerNameBn}-এর জন্য ${quantity}টি সেলাই ও ফিটিং অর্ডার।`,
    specialNotesEn: `Tailoring order of ${quantity} pcs for ${customerNameEn}.`,
    summaryBn: `কাস্টমার ${customerNameBn}-এর জন্য ${quantity}টি ${itemDescriptionBn} এর ইনভয়েস সফলভাবে সাজানো হয়েছে। মোট মূল্য: ${totalPrice.toFixed(2)} ${currency} (প্রতিটি ${unitPrice.toFixed(2)} ${currency})${advanceDeposit > 0 ? `, অগ্রিম জমা: ${advanceDeposit.toFixed(2)} ${currency}, বাকি: ${remainingDue.toFixed(2)} ${currency}` : ''}।`,
    summaryEn: `Invoice prepared for customer ${customerNameEn}: ${quantity} ${itemDescriptionEn} at ${unitPrice.toFixed(2)} ${currency} each. Total: ${totalPrice.toFixed(2)} ${currency}${advanceDeposit > 0 ? ` (Advance: ${advanceDeposit.toFixed(2)}, Due: ${remainingDue.toFixed(2)})` : ''}.`,
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
  };
}

// POST /api/ai/parse-invoice
// Parses natural language tailoring commands (e.g. "তুমি জীবনের 2টি জামা 8 omr")
app.post('/api/ai/parse-invoice', async (req: Request, res: Response) => {
  try {
    const { prompt, currency = 'OMR', defaultDeliveryDays = 5 } = req.body;
    if (!prompt || typeof prompt !== 'string') {
      return res.status(400).json({ error: 'Prompt is required' });
    }

    const ai = getGemini();
    if (!ai) {
      // Return local fallback if API key is not yet set
      const fallback = localFallbackParser(prompt, currency, defaultDeliveryDays);
      return res.json({ success: true, invoice: fallback, source: 'local-engine' });
    }

    const todayStr = new Date().toISOString().split('T')[0];
    const defaultDelivery = new Date(Date.now() + defaultDeliveryDays * 86400000).toISOString().split('T')[0];

    const systemPrompt = `You are an expert AI Tailor Invoice Assistant for "Jibon Tailor Shop" (a professional tailoring shop in Oman / Middle East & Bangladesh).
Your task is to parse conversational voice or text tailoring orders in Bengali, English, Banglish, Arabic, or Hindi into a beautifully formatted, bilingual invoice.
Example user prompts:
- "তুমি জীবনের 2টি জামা 8 omr" -> Customer is "জীবন" (Jibon), 2 dresses, total price 8 OMR (unit price 4 OMR each).
- "make 2 dresses for Jibon for 8 OMR" -> Customer Jibon, 2 dresses, 8 OMR.
- "জীবনের ২টি জামা ৮ রিয়াল ২ রিয়াল জমা ডেলিভারি আগামী শুক্রবার" -> Customer Jibon, 2 dresses, total 8 OMR, advance 2 OMR, due 6 OMR, delivery next Friday.
- "Fatima 3 Abayas 24 OMR advance 10 OMR phone 91234567"

Rules:
1. Customer Name: Cleanly extract the person's name (strip conversational prefixes like "তুমি", "আপনি", "make", "create", "এর", "er"). Provide customerNameBn and customerNameEn.
2. Items: Array of line items. If total price is given for multiple items (e.g. 2 dresses for 8 OMR), quantity = 2, totalPrice = 8, unitPrice = 4.
3. Dress Type: Categorize appropriately (e.g. "Dress / জামা", "Abaya", "Punjabi", "Shirt", "Pant", "Salwar Kameez").
4. Financials: subtotal, discount (0 if none), netTotal = subtotal - discount, advanceDeposit, remainingDue = netTotal - advanceDeposit.
5. Currency: default to "${currency}" if not specified, or parse from user input (OMR, ৳, SAR, AED, USD, etc.).
6. Delivery Date: Format YYYY-MM-DD. Today is ${todayStr}. Default delivery is ${defaultDelivery}.
7. Summaries: Provide a clear, professional summary in both Bengali (summaryBn) and English (summaryEn).
8. Formatted Invoices: Provide complete formatted receipt text in Bengali (formattedInvoiceTextBn) and in English (formattedInvoiceTextEn).`;

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: `Parse this tailoring order into a clean invoice: "${prompt}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            customerName: { type: Type.STRING },
            customerNameBn: { type: Type.STRING },
            customerNameEn: { type: Type.STRING },
            customerPhone: { type: Type.STRING },
            customerAddress: { type: Type.STRING },
            dressType: { type: Type.STRING },
            items: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  description: { type: Type.STRING },
                  descriptionBn: { type: Type.STRING },
                  descriptionEn: { type: Type.STRING },
                  quantity: { type: Type.NUMBER },
                  unitPrice: { type: Type.NUMBER },
                  totalPrice: { type: Type.NUMBER },
                },
                required: ['description', 'quantity', 'unitPrice', 'totalPrice'],
              },
            },
            subtotal: { type: Type.NUMBER },
            discount: { type: Type.NUMBER },
            netTotal: { type: Type.NUMBER },
            advanceDeposit: { type: Type.NUMBER },
            remainingDue: { type: Type.NUMBER },
            deliveryDate: { type: Type.STRING },
            specialNotesBn: { type: Type.STRING },
            specialNotesEn: { type: Type.STRING },
            summaryBn: { type: Type.STRING },
            summaryEn: { type: Type.STRING },
            formattedInvoiceTextBn: { type: Type.STRING },
            formattedInvoiceTextEn: { type: Type.STRING },
            currency: { type: Type.STRING },
          },
          required: [
            'customerName',
            'dressType',
            'items',
            'subtotal',
            'netTotal',
            'advanceDeposit',
            'remainingDue',
            'summaryBn',
            'summaryEn',
          ],
        },
      },
    });

    const textOutput = response.text;
    if (!textOutput) {
      throw new Error('Empty response from Gemini');
    }

    const parsedInvoice = JSON.parse(textOutput);
    return res.json({
      success: true,
      invoice: parsedInvoice,
      source: 'gemini-3.8-flash',
    });
  } catch (error: any) {
    console.error('Gemini invoice parse failed, using fallback parser:', error?.message || error);
    const fallback = localFallbackParser(req.body?.prompt || '', req.body?.currency || 'OMR', req.body?.defaultDeliveryDays || 5);
    return res.json({
      success: true,
      invoice: fallback,
      source: 'local-fallback',
      warning: error?.message,
    });
  }
});

// POST /api/ai/chat
// Natural chat with Gemini AI about tailoring shop operations and inquiries
app.post('/api/ai/chat', async (req: Request, res: Response) => {
  try {
    const { message, shopName = 'Jibon Tailor', context } = req.body;
    if (!message || typeof message !== 'string') {
      return res.status(400).json({ error: 'Message is required' });
    }

    const ai = getGemini();
    if (!ai) {
      return res.json({
        replyBn: `আমি "${shopName}" এর সহকারী। জেমিনি এআই এপিআই কি লোড হয়েছে। আপনার প্রশ্ন করার জন্য ধন্যবাদ!`,
        replyEn: `I am your assistant for ${shopName}. Thank you for your message!`,
        source: 'local-echo',
      });
    }

    const response = await ai.models.generateContent({
      model: 'gemini-3.8-flash',
      contents: message,
      config: {
        systemInstruction: `You are a warm, highly professional AI Business Manager and Tailoring Expert for "${shopName}".
You help tailor shop owners manage orders, calculate prices, create invoices, check customer dues, track karigar wages, and answer stitching & tailoring queries.
Always provide a concise, respectful, bilingual response (or primary Bengali with clean English summary).
Current business context summary: ${context ? JSON.stringify(context) : 'Standard tailoring operations in Oman & BD.'}`,
      },
    });

    return res.json({
      reply: response.text,
      source: 'gemini-3.8-flash',
    });
  } catch (err: any) {
    console.error('Gemini chat error:', err);
    return res.status(500).json({
      error: 'Failed to process AI chat query',
      details: err?.message,
    });
  }
});

// Vite middleware in dev; static file serving in production
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`🚀 Jibon Tailor Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
