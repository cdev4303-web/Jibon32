var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// server.ts
var import_config = require("dotenv/config");
var import_express = __toESM(require("express"), 1);
var import_path = __toESM(require("path"), 1);
var import_vite = require("vite");
var import_genai = require("@google/genai");
var app = (0, import_express.default)();
var PORT = 3e3;
app.use(import_express.default.json({ limit: "10mb" }));
var geminiClient = null;
function getGemini() {
  if (!geminiClient) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      geminiClient = new import_genai.GoogleGenAI({
        apiKey,
        httpOptions: {
          headers: {
            "User-Agent": "aistudio-build"
          }
        }
      });
    }
  }
  return geminiClient;
}
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    app: "Jibon Tailor Shop System",
    geminiConfigured: !!process.env.GEMINI_API_KEY,
    time: (/* @__PURE__ */ new Date()).toISOString()
  });
});
function localFallbackParser(rawPrompt, defaultCurrency = "OMR", defaultDeliveryDays = 5) {
  const text = rawPrompt.trim();
  const today = /* @__PURE__ */ new Date();
  const deliveryDateObj = new Date(today.getTime() + defaultDeliveryDays * 864e5);
  const deliveryDateStr = deliveryDateObj.toISOString().split("T")[0];
  let customerName = "Jibon";
  let customerNameBn = "\u099C\u09C0\u09AC\u09A8";
  let customerNameEn = "Jibon";
  const cleaned = text.replace(/^(তুমি|আপনি|ai|এআই|please|hello|hi|hey|মেহেরবানী করে|দয়া করে)\s+/i, "").replace(/^(invoice|order|ইনভয়েস|অর্ডার|বানাও|তৈরি করো|লিখে দাও|সাজাও|সাজিয়ে দাও|লিখো)\s+/i, "");
  const matchFor = cleaned.match(/(?:for|customer|কাস্টমার)\s+([A-Za-z\u0980-\u09FF\s]+?)(?=\s+(?:এর|er|\d+|for|need|want|items?|dress|jama|\d+টি|\d+টা))/i);
  const matchEr = cleaned.match(/^([A-Za-z\u0980-\u09FF]+)(?:এর|er|\'s)\s+/i);
  if (matchEr && matchEr[1]) {
    const raw = matchEr[1].trim();
    if (!["\u09A4\u09C1\u09AE\u09BF", "\u0986\u09AA\u09A8\u09BF", "\u0986\u09AE\u09BE\u09B0", "\u09A6\u09CB\u0995\u09BE\u09A8"].includes(raw)) customerName = raw;
  } else if (matchFor && matchFor[1]) {
    customerName = matchFor[1].trim();
  } else {
    const firstWordMatch = cleaned.match(/^([A-Za-z\u0980-\u09FF]+)(?:\s+|$)/);
    if (firstWordMatch && firstWordMatch[1]) {
      const candidate = firstWordMatch[1].trim().replace(/(এর|er)$/i, "");
      if (!["\u09A4\u09C1\u09AE\u09BF", "\u0986\u09AA\u09A8\u09BF", "\u098F\u0995\u099F\u09BF", "\u09A6\u09C1\u0987\u099F\u09BF", "\u09AC\u09BE\u09A8\u09BE\u0993", "\u0987\u09A8\u09AD\u09DF\u09C7\u09B8", "\u0985\u09B0\u09CD\u09A1\u09BE\u09B0", "make", "create", "new", "order", "invoice"].includes(candidate.toLowerCase())) {
        customerName = candidate;
      }
    }
  }
  if (/^জীবন/i.test(customerName) || /^jibon/i.test(customerName)) {
    customerName = "\u099C\u09C0\u09AC\u09A8";
    customerNameBn = "\u099C\u09C0\u09AC\u09A8";
    customerNameEn = "Jibon";
  } else {
    customerNameBn = customerName;
    customerNameEn = customerName;
  }
  let quantity = 1;
  const qtyMatch = text.match(/(\d+)\s*(?:টি|টা|pcs|pieces|piece|pairs?|items?)?/i);
  if (qtyMatch && qtyMatch[1]) {
    const parsedQty = parseInt(qtyMatch[1], 10);
    if (parsedQty > 0 && parsedQty < 500) quantity = parsedQty;
  }
  let itemDescriptionBn = "\u099C\u09BE\u09AE\u09BE (\u099F\u09C7\u0987\u09B2\u09BE\u09B0\u09BF\u0982)";
  let itemDescriptionEn = "Tailored Dress";
  let dressType = "Dress / \u099C\u09BE\u09AE\u09BE";
  if (/(?:আবায়া|বোরকা|abaya|burqa)/i.test(text)) {
    itemDescriptionBn = "\u0986\u09AC\u09BE\u09DF\u09BE / \u09AC\u09CB\u09B0\u0995\u09BE";
    itemDescriptionEn = "Custom Abaya";
    dressType = "Abaya";
  } else if (/(?:পাঞ্জাবি|panjabi|punjabi|kurta)/i.test(text)) {
    itemDescriptionBn = "\u09AA\u09BE\u099E\u09CD\u099C\u09BE\u09AC\u09BF";
    itemDescriptionEn = "Custom Punjabi";
    dressType = "Punjabi";
  } else if (/(?:শার্ট|shirt)/i.test(text)) {
    itemDescriptionBn = "\u09B6\u09BE\u09B0\u09CD\u099F";
    itemDescriptionEn = "Custom Tailored Shirt";
    dressType = "Shirt";
  } else if (/(?:প্যান্ট|pant|trouser)/i.test(text)) {
    itemDescriptionBn = "\u09AA\u09CD\u09AF\u09BE\u09A8\u09CD\u099F / \u099F\u09CD\u09B0\u09BE\u0989\u099C\u09BE\u09B0";
    itemDescriptionEn = "Custom Tailored Pants";
    dressType = "Pant";
  } else if (/(?:কামিজ|সেলোয়ার|salwar|kameez|suit)/i.test(text)) {
    itemDescriptionBn = "\u09B8\u09C7\u09B2\u09CB\u09DF\u09BE\u09B0 \u0995\u09BE\u09AE\u09BF\u099C / \u09B8\u09CD\u09AF\u09C1\u099F";
    itemDescriptionEn = "Salwar Kameez Suit";
    dressType = "Salwar Kameez";
  }
  let totalPrice = 8;
  let currency = defaultCurrency;
  if (/omr|রিয়াল|রিয়াল|ওএমআর|ro/i.test(text)) currency = "OMR";
  else if (/tk|টাকা|bdt/i.test(text)) currency = "\u09F3";
  else if (/sar/i.test(text)) currency = "SAR";
  else if (/aed/i.test(text)) currency = "AED";
  else if (/usd|\$/i.test(text)) currency = "$";
  const priceWithCurMatch = text.match(/(\d+(?:\.\d+)?)\s*(?:omr|রিয়াল|রিয়াল|ওএমআর|ro|tk|টাকা|bdt|sar|aed|usd|\$)/i) || text.match(/(?:omr|রিয়াল|রিয়াল|ওএমআর|ro|tk|টাকা|bdt|sar|aed|usd|\$)\s*(\d+(?:\.\d+)?)/i);
  if (priceWithCurMatch && priceWithCurMatch[1]) {
    totalPrice = parseFloat(priceWithCurMatch[1]);
  } else {
    const allNumbers = [...text.matchAll(/\b(\d+(?:\.\d+)?)\b/g)].map((m) => parseFloat(m[1]));
    if (allNumbers.length >= 2) totalPrice = allNumbers[allNumbers.length - 1];
    else if (allNumbers.length === 1 && allNumbers[0] > quantity) totalPrice = allNumbers[0];
  }
  let advanceDeposit = 0;
  const advMatch = text.match(/(?:জমা|অগ্রিম|advance|deposit|paid)\s*(\d+(?:\.\d+)?)/i) || text.match(/(\d+(?:\.\d+)?)\s*(?:রিয়াল|omr|টাকা|tk)?\s*(?:জমা|অগ্রিম|advance|deposit|paid)/i);
  if (advMatch && advMatch[1]) {
    const adv = parseFloat(advMatch[1]);
    if (adv <= totalPrice) advanceDeposit = adv;
  }
  const remainingDue = Math.max(0, totalPrice - advanceDeposit);
  const unitPrice = quantity > 0 ? Number((totalPrice / quantity).toFixed(3)) : totalPrice;
  let deliveryDate = deliveryDateStr;
  if (/আগামীকাল|tomorrow/i.test(text)) {
    deliveryDate = new Date(today.getTime() + 864e5).toISOString().split("T")[0];
  } else if (/পরশু|day after tomorrow/i.test(text)) {
    deliveryDate = new Date(today.getTime() + 2 * 864e5).toISOString().split("T")[0];
  }
  return {
    customerName,
    customerNameBn,
    customerNameEn,
    customerPhone: "",
    customerAddress: "",
    dressType,
    items: [
      {
        description: `${itemDescriptionBn} / ${itemDescriptionEn}`,
        descriptionBn: itemDescriptionBn,
        descriptionEn: itemDescriptionEn,
        quantity,
        unitPrice,
        totalPrice
      }
    ],
    subtotal: totalPrice,
    discount: 0,
    netTotal: totalPrice,
    advanceDeposit,
    remainingDue,
    deliveryDate,
    specialNotesBn: `${customerNameBn}-\u098F\u09B0 \u099C\u09A8\u09CD\u09AF ${quantity}\u099F\u09BF \u09B8\u09C7\u09B2\u09BE\u0987 \u0993 \u09AB\u09BF\u099F\u09BF\u0982 \u0985\u09B0\u09CD\u09A1\u09BE\u09B0\u0964`,
    specialNotesEn: `Tailoring order of ${quantity} pcs for ${customerNameEn}.`,
    summaryBn: `\u0995\u09BE\u09B8\u09CD\u099F\u09AE\u09BE\u09B0 ${customerNameBn}-\u098F\u09B0 \u099C\u09A8\u09CD\u09AF ${quantity}\u099F\u09BF ${itemDescriptionBn} \u098F\u09B0 \u0987\u09A8\u09AD\u09DF\u09C7\u09B8 \u09B8\u09AB\u09B2\u09AD\u09BE\u09AC\u09C7 \u09B8\u09BE\u099C\u09BE\u09A8\u09CB \u09B9\u09DF\u09C7\u099B\u09C7\u0964 \u09AE\u09CB\u099F \u09AE\u09C2\u09B2\u09CD\u09AF: ${totalPrice.toFixed(2)} ${currency} (\u09AA\u09CD\u09B0\u09A4\u09BF\u099F\u09BF ${unitPrice.toFixed(2)} ${currency})${advanceDeposit > 0 ? `, \u0985\u0997\u09CD\u09B0\u09BF\u09AE \u099C\u09AE\u09BE: ${advanceDeposit.toFixed(2)} ${currency}, \u09AC\u09BE\u0995\u09BF: ${remainingDue.toFixed(2)} ${currency}` : ""}\u0964`,
    summaryEn: `Invoice prepared for customer ${customerNameEn}: ${quantity} ${itemDescriptionEn} at ${unitPrice.toFixed(2)} ${currency} each. Total: ${totalPrice.toFixed(2)} ${currency}${advanceDeposit > 0 ? ` (Advance: ${advanceDeposit.toFixed(2)}, Due: ${remainingDue.toFixed(2)})` : ""}.`,
    formattedInvoiceTextBn: `\u{1F9FE} \u09AE\u09C7\u09B8\u09BE\u09B0\u09CD\u09B8 \u099C\u09C0\u09AC\u09A8 \u099F\u09C7\u0987\u09B2\u09BE\u09B0\u09CD\u09B8 \u2014 \u0987\u09A8\u09AD\u09AF\u09BC\u09C7\u09B8 \u09B0\u09B8\u09BF\u09A6
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
\u{1F464} \u0995\u09BE\u09B8\u09CD\u099F\u09AE\u09BE\u09B0: ${customerNameBn} (${customerNameEn})
\u{1F457} \u09AA\u09CB\u09B6\u09BE\u0995: ${itemDescriptionBn}
\u{1F522} \u09AA\u09B0\u09BF\u09AE\u09BE\u09A3: ${quantity} \u09AA\u09BF\u09B8 (\u09AA\u09CD\u09B0\u09A4\u09BF\u099F\u09BF ${unitPrice.toFixed(2)} ${currency})
\u{1F4B5} \u09AE\u09CB\u099F \u09AC\u09BF\u09B2: ${totalPrice.toFixed(2)} ${currency}
\u{1F4E5} \u0985\u0997\u09CD\u09B0\u09BF\u09AE \u099C\u09AE\u09BE: ${advanceDeposit.toFixed(2)} ${currency}
\u{1F4CC} \u09AC\u09BE\u0995\u09BF \u09AA\u09BE\u0993\u09A8\u09BE: ${remainingDue.toFixed(2)} ${currency}
\u{1F4C5} \u09A1\u09C7\u09B2\u09BF\u09AD\u09BE\u09B0\u09BF \u09A4\u09BE\u09B0\u09BF\u0996: ${deliveryDate}
\u{1F4DD} \u09A8\u09CB\u099F: ${customerNameBn}-\u098F\u09B0 \u099C\u09A8\u09CD\u09AF ${quantity}\u099F\u09BF \u09B8\u09C7\u09B2\u09BE\u0987 \u0993 \u09AB\u09BF\u099F\u09BF\u0982 \u0985\u09B0\u09CD\u09A1\u09BE\u09B0\u0964
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
\u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6! \u0986\u09AA\u09A8\u09BE\u09B0 \u09AA\u09CB\u09B6\u09BE\u0995 \u09B8\u09AE\u09AF\u09BC\u09AE\u09A4\u09CB \u09AF\u09A4\u09CD\u09A8\u09B8\u09B9\u0995\u09BE\u09B0\u09C7 \u09AA\u09CD\u09B0\u09B8\u09CD\u09A4\u09C1\u09A4 \u0995\u09B0\u09BE \u09B9\u09AC\u09C7\u0964`,
    formattedInvoiceTextEn: `\u{1F9FE} JIBON TAILOR SHOP \u2014 OFFICIAL RECEIPT
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
\u{1F464} Customer: ${customerNameEn} (${customerNameBn})
\u{1F457} Item: ${itemDescriptionEn}
\u{1F522} Quantity: ${quantity} pcs (@ ${unitPrice.toFixed(2)} ${currency} each)
\u{1F4B5} Net Total: ${totalPrice.toFixed(2)} ${currency}
\u{1F4E5} Advance Paid: ${advanceDeposit.toFixed(2)} ${currency}
\u{1F4CC} Remaining Due: ${remainingDue.toFixed(2)} ${currency}
\u{1F4C5} Delivery Date: ${deliveryDate}
\u{1F4DD} Notes: Tailoring order of ${quantity} pcs for ${customerNameEn}.
\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500\u2500
Thank you for choosing Jibon Tailor Shop!`,
    currency
  };
}
app.post("/api/ai/parse-invoice", async (req, res) => {
  try {
    const { prompt, currency = "OMR", defaultDeliveryDays = 5 } = req.body;
    if (!prompt || typeof prompt !== "string") {
      return res.status(400).json({ error: "Prompt is required" });
    }
    const ai = getGemini();
    if (!ai) {
      const fallback = localFallbackParser(prompt, currency, defaultDeliveryDays);
      return res.json({ success: true, invoice: fallback, source: "local-engine" });
    }
    const todayStr = (/* @__PURE__ */ new Date()).toISOString().split("T")[0];
    const defaultDelivery = new Date(Date.now() + defaultDeliveryDays * 864e5).toISOString().split("T")[0];
    const systemPrompt = `You are an expert AI Tailor Invoice Assistant for "Jibon Tailor Shop" (a professional tailoring shop in Oman / Middle East & Bangladesh).
Your task is to parse conversational voice or text tailoring orders in Bengali, English, Banglish, Arabic, or Hindi into a beautifully formatted, bilingual invoice.
Example user prompts:
- "\u09A4\u09C1\u09AE\u09BF \u099C\u09C0\u09AC\u09A8\u09C7\u09B0 2\u099F\u09BF \u099C\u09BE\u09AE\u09BE 8 omr" -> Customer is "\u099C\u09C0\u09AC\u09A8" (Jibon), 2 dresses, total price 8 OMR (unit price 4 OMR each).
- "make 2 dresses for Jibon for 8 OMR" -> Customer Jibon, 2 dresses, 8 OMR.
- "\u099C\u09C0\u09AC\u09A8\u09C7\u09B0 \u09E8\u099F\u09BF \u099C\u09BE\u09AE\u09BE \u09EE \u09B0\u09BF\u09DF\u09BE\u09B2 \u09E8 \u09B0\u09BF\u09DF\u09BE\u09B2 \u099C\u09AE\u09BE \u09A1\u09C7\u09B2\u09BF\u09AD\u09BE\u09B0\u09BF \u0986\u0997\u09BE\u09AE\u09C0 \u09B6\u09C1\u0995\u09CD\u09B0\u09AC\u09BE\u09B0" -> Customer Jibon, 2 dresses, total 8 OMR, advance 2 OMR, due 6 OMR, delivery next Friday.
- "Fatima 3 Abayas 24 OMR advance 10 OMR phone 91234567"

Rules:
1. Customer Name: Cleanly extract the person's name (strip conversational prefixes like "\u09A4\u09C1\u09AE\u09BF", "\u0986\u09AA\u09A8\u09BF", "make", "create", "\u098F\u09B0", "er"). Provide customerNameBn and customerNameEn.
2. Items: Array of line items. If total price is given for multiple items (e.g. 2 dresses for 8 OMR), quantity = 2, totalPrice = 8, unitPrice = 4.
3. Dress Type: Categorize appropriately (e.g. "Dress / \u099C\u09BE\u09AE\u09BE", "Abaya", "Punjabi", "Shirt", "Pant", "Salwar Kameez").
4. Financials: subtotal, discount (0 if none), netTotal = subtotal - discount, advanceDeposit, remainingDue = netTotal - advanceDeposit.
5. Currency: default to "${currency}" if not specified, or parse from user input (OMR, \u09F3, SAR, AED, USD, etc.).
6. Delivery Date: Format YYYY-MM-DD. Today is ${todayStr}. Default delivery is ${defaultDelivery}.
7. Summaries: Provide a clear, professional summary in both Bengali (summaryBn) and English (summaryEn).
8. Formatted Invoices: Provide complete formatted receipt text in Bengali (formattedInvoiceTextBn) and in English (formattedInvoiceTextEn).`;
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: `Parse this tailoring order into a clean invoice: "${prompt}"`,
      config: {
        systemInstruction: systemPrompt,
        responseMimeType: "application/json",
        responseSchema: {
          type: import_genai.Type.OBJECT,
          properties: {
            customerName: { type: import_genai.Type.STRING },
            customerNameBn: { type: import_genai.Type.STRING },
            customerNameEn: { type: import_genai.Type.STRING },
            customerPhone: { type: import_genai.Type.STRING },
            customerAddress: { type: import_genai.Type.STRING },
            dressType: { type: import_genai.Type.STRING },
            items: {
              type: import_genai.Type.ARRAY,
              items: {
                type: import_genai.Type.OBJECT,
                properties: {
                  description: { type: import_genai.Type.STRING },
                  descriptionBn: { type: import_genai.Type.STRING },
                  descriptionEn: { type: import_genai.Type.STRING },
                  quantity: { type: import_genai.Type.NUMBER },
                  unitPrice: { type: import_genai.Type.NUMBER },
                  totalPrice: { type: import_genai.Type.NUMBER }
                },
                required: ["description", "quantity", "unitPrice", "totalPrice"]
              }
            },
            subtotal: { type: import_genai.Type.NUMBER },
            discount: { type: import_genai.Type.NUMBER },
            netTotal: { type: import_genai.Type.NUMBER },
            advanceDeposit: { type: import_genai.Type.NUMBER },
            remainingDue: { type: import_genai.Type.NUMBER },
            deliveryDate: { type: import_genai.Type.STRING },
            specialNotesBn: { type: import_genai.Type.STRING },
            specialNotesEn: { type: import_genai.Type.STRING },
            summaryBn: { type: import_genai.Type.STRING },
            summaryEn: { type: import_genai.Type.STRING },
            formattedInvoiceTextBn: { type: import_genai.Type.STRING },
            formattedInvoiceTextEn: { type: import_genai.Type.STRING },
            currency: { type: import_genai.Type.STRING }
          },
          required: [
            "customerName",
            "dressType",
            "items",
            "subtotal",
            "netTotal",
            "advanceDeposit",
            "remainingDue",
            "summaryBn",
            "summaryEn"
          ]
        }
      }
    });
    const textOutput = response.text;
    if (!textOutput) {
      throw new Error("Empty response from Gemini");
    }
    const parsedInvoice = JSON.parse(textOutput);
    return res.json({
      success: true,
      invoice: parsedInvoice,
      source: "gemini-3.8-flash"
    });
  } catch (error) {
    console.error("Gemini invoice parse failed, using fallback parser:", error?.message || error);
    const fallback = localFallbackParser(req.body?.prompt || "", req.body?.currency || "OMR", req.body?.defaultDeliveryDays || 5);
    return res.json({
      success: true,
      invoice: fallback,
      source: "local-fallback",
      warning: error?.message
    });
  }
});
app.post("/api/ai/chat", async (req, res) => {
  try {
    const { message, shopName = "Jibon Tailor", context } = req.body;
    if (!message || typeof message !== "string") {
      return res.status(400).json({ error: "Message is required" });
    }
    const ai = getGemini();
    if (!ai) {
      return res.json({
        replyBn: `\u0986\u09AE\u09BF "${shopName}" \u098F\u09B0 \u09B8\u09B9\u0995\u09BE\u09B0\u09C0\u0964 \u099C\u09C7\u09AE\u09BF\u09A8\u09BF \u098F\u0986\u0987 \u098F\u09AA\u09BF\u0986\u0987 \u0995\u09BF \u09B2\u09CB\u09A1 \u09B9\u09DF\u09C7\u099B\u09C7\u0964 \u0986\u09AA\u09A8\u09BE\u09B0 \u09AA\u09CD\u09B0\u09B6\u09CD\u09A8 \u0995\u09B0\u09BE\u09B0 \u099C\u09A8\u09CD\u09AF \u09A7\u09A8\u09CD\u09AF\u09AC\u09BE\u09A6!`,
        replyEn: `I am your assistant for ${shopName}. Thank you for your message!`,
        source: "local-echo"
      });
    }
    const response = await ai.models.generateContent({
      model: "gemini-3.8-flash",
      contents: message,
      config: {
        systemInstruction: `You are a warm, highly professional AI Business Manager and Tailoring Expert for "${shopName}".
You help tailor shop owners manage orders, calculate prices, create invoices, check customer dues, track karigar wages, and answer stitching & tailoring queries.
Always provide a concise, respectful, bilingual response (or primary Bengali with clean English summary).
Current business context summary: ${context ? JSON.stringify(context) : "Standard tailoring operations in Oman & BD."}`
      }
    });
    return res.json({
      reply: response.text,
      source: "gemini-3.8-flash"
    });
  } catch (err) {
    console.error("Gemini chat error:", err);
    return res.status(500).json({
      error: "Failed to process AI chat query",
      details: err?.message
    });
  }
});
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await (0, import_vite.createServer)({
      server: { middlewareMode: true },
      appType: "spa"
    });
    app.use(vite.middlewares);
  } else {
    const distPath = import_path.default.join(process.cwd(), "dist");
    app.use(import_express.default.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(import_path.default.join(distPath, "index.html"));
    });
  }
  app.listen(PORT, "0.0.0.0", () => {
    console.log(`\u{1F680} Jibon Tailor Server running at http://0.0.0.0:${PORT}`);
  });
}
startServer();
//# sourceMappingURL=server.cjs.map
