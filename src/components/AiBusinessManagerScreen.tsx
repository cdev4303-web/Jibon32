import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Invoice, Expense, TailorRecord, Shop, Language, Measurement } from '../types';
import {
  calculateBusinessOverview,
  generateBusinessInsights,
  processAiBusinessQuestion,
  generateAiBusinessReport,
  formatBengaliNumber,
  AiQueryResult,
  BusinessInsightItem,
} from '../utils/aiBusinessEngine';
import {
  getStoredAiSettings,
  saveStoredAiSettings,
  getStoredAiChatHistory,
  saveStoredAiChatHistory,
  clearStoredAiChatHistory,
  StoredAiChatMessage,
  StoredAiSettings,
} from '../utils/storage';
import { openWhatsAppUrl } from '../utils/whatsapp';
import {
  Sparkles,
  Send,
  Mic,
  MicOff,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Users,
  Clock,
  DollarSign,
  Scissors,
  Receipt,
  RotateCcw,
  Printer,
  Copy,
  Share2,
  MessageCircle,
  ExternalLink,
  ChevronRight,
  HelpCircle,
  BarChart3,
  Calendar,
  Settings,
  ShieldCheck,
  Wifi,
  Sparkle,
  ArrowUpRight,
  Eye,
  Info,
  FileDown,
  Loader2,
} from 'lucide-react';
import { printHtmlElement, exportElementToPdf } from '../utils/print';
import { parseInvoiceWithAi, AiInvoiceDraft } from '../utils/aiInvoiceParser';

interface AiBusinessManagerScreenProps {
  shop: Shop;
  invoices: Invoice[];
  expenses: Expense[];
  tailorRecords: TailorRecord[];
  lang?: Language;
  onNavigateToInvoiceDetail: (invoiceId: string) => void;
  onNavigateToNewOrderWithCustomer: (customerName: string, customerPhone: string, customerAddress?: string) => void;
  onNavigateToNewOrderWithInvoiceDraft?: (draftInvoice: Invoice) => void;
  onNavigateToCustomers: () => void;
  onNavigateToMeasurements: () => void;
  onNavigateToTailor: () => void;
  onNavigateToExpenses: () => void;
}

export const AiBusinessManagerScreen: React.FC<AiBusinessManagerScreenProps> = ({
  shop,
  invoices,
  expenses,
  tailorRecords,
  lang = 'BN',
  onNavigateToInvoiceDetail,
  onNavigateToNewOrderWithCustomer,
  onNavigateToNewOrderWithInvoiceDraft,
  onNavigateToCustomers,
  onNavigateToMeasurements,
  onNavigateToTailor,
  onNavigateToExpenses,
}) => {
  const isEn = lang === 'EN';
  const currency = shop.currency || '৳';

  // Sub-navigation: 'chat' | 'overview' | 'insights' | 'report' | 'settings'
  const [activeSubTab, setActiveSubTab] = useState<'chat' | 'overview' | 'insights' | 'report' | 'settings'>('chat');

  // AI Settings State
  const [aiSettings, setAiSettings] = useState<StoredAiSettings>(getStoredAiSettings);

  // Chat State
  const [chatMessages, setChatMessages] = useState<StoredAiChatMessage[]>(() => {
    const saved = getStoredAiChatHistory();
    if (saved && saved.length > 0) return saved;
    return [
      {
        id: 'welcome-msg',
        sender: 'ai',
        text: isEn
          ? `Hello! I am your AI Business Manager for ${shop.name}. Ask me anything about your sales, expenses, profits, customer dues, orders, or karigar records in natural Bengali or English.`
          : `আসসালামু আলাইকুম! আমি "${shop.name}"-এর স্মার্ট AI বিজনেস ম্যানেজার।\nআপনার দোকানের আজকের বিক্রি, খরচ, লাভ, বকেয়া পাওনা, কাস্টমার বা কারিগরের হিসাব সংক্রান্ত যেকোনো প্রশ্ন বাংলায় জিজ্ঞাসা করুন।`,
        timestamp: Date.now(),
      },
    ];
  });

  const [inputQuery, setInputQuery] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  // Action confirmation state
  const [pendingAction, setPendingAction] = useState<AiQueryResult['actionSuggestion'] | null>(null);

  // Report Period State
  const [reportPeriod, setReportPeriod] = useState<'today' | 'thisWeek' | 'thisMonth' | 'thisYear' | 'custom'>('thisMonth');
  const todayStr = new Date().toISOString().split('T')[0];
  const [customStart, setCustomStart] = useState(todayStr);
  const [customEnd, setCustomEnd] = useState(todayStr);
  const [copyFeedback, setCopyFeedback] = useState(false);

  // Auto-scroll chat to bottom
  const chatBottomRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (activeSubTab === 'chat') {
      chatBottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [chatMessages, activeSubTab, isProcessing]);

  // Persist chat messages
  useEffect(() => {
    saveStoredAiChatHistory(chatMessages);
  }, [chatMessages]);

  // Persist settings
  useEffect(() => {
    saveStoredAiSettings(aiSettings);
  }, [aiSettings]);

  // Calculate live business overview
  const overview = useMemo(() => {
    return calculateBusinessOverview(invoices, expenses, tailorRecords);
  }, [invoices, expenses, tailorRecords]);

  // Calculate live business insights
  const insights = useMemo(() => {
    return generateBusinessInsights(invoices, expenses, tailorRecords, currency);
  }, [invoices, expenses, tailorRecords, currency]);

  // Calculate current AI report
  const currentReport = useMemo(() => {
    return generateAiBusinessReport(reportPeriod, customStart, customEnd, invoices, expenses, tailorRecords, currency);
  }, [reportPeriod, customStart, customEnd, invoices, expenses, tailorRecords, currency]);

  // Web Speech Recognition for Voice Input (Bengali)
  const handleToggleVoice = () => {
    if (isListening) {
      setIsListening(false);
      return;
    }

    const SpeechRecognition =
      (window as unknown as { SpeechRecognition?: any }).SpeechRecognition ||
      (window as unknown as { webkitSpeechRecognition?: any }).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setVoiceError(
        isEn
          ? 'Voice recognition is not supported in this browser. Please type your query.'
          : 'আপনার ব্রাউজারে ভয়েস রিকগনিশন সাপোর্ট করে না। অনুগ্রহ করে লিখে প্রশ্ন করুন।'
      );
      setTimeout(() => setVoiceError(null), 4000);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.lang = isEn ? 'en-US' : 'bn-BD';
      recognition.continuous = false;
      recognition.interimResults = false;

      recognition.onstart = () => {
        setIsListening(true);
        setVoiceError(null);
      };

      recognition.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInputQuery(transcript);
          handleSendQuery(transcript);
        }
        setIsListening(false);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error:', event.error);
        setIsListening(false);
        if (event.error !== 'no-speech') {
          setVoiceError(
            isEn
              ? 'Could not capture voice. Please check microphone permissions.'
              : 'ভয়েস শুনতে পাওয়া যায়নি। মাইক্রোফোনের পারমিশন চেক করুন অথবা লিখে প্রশ্ন করুন।'
          );
          setTimeout(() => setVoiceError(null), 4000);
        }
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognition.start();
    } catch (err) {
      console.error(err);
      setIsListening(false);
      setVoiceError(
        isEn
          ? 'Microphone initialization failed. Please use text input.'
          : 'মাইক্রোফোন চালু করা যায়নি। অনুগ্রহ করে লিখে প্রশ্ন করুন।'
      );
      setTimeout(() => setVoiceError(null), 4000);
    }
  };

  // Process user query
  const handleSendQuery = async (textToSend?: string) => {
    const query = (textToSend !== undefined ? textToSend : inputQuery).trim();
    if (!query || isProcessing) return;

    // Add user message
    const userMsg: StoredAiChatMessage = {
      id: `user-${Date.now()}`,
      sender: 'user',
      text: query,
      timestamp: Date.now(),
    };

    setChatMessages((prev) => [...prev, userMsg]);
    setInputQuery('');
    setIsProcessing(true);

    const isInvoiceRequest =
      /(?:ইনভয়েস|অর্ডার|বিল|invoice|order|bill).*(?:বানাও|সাজাও|করো|দাও|make|create|write|লিখে)/i.test(query) ||
      /(?:জামা|আবায়া|পাঞ্জাবি|শার্ট|প্যান্ট|কামিজ|dress|abaya|shirt|pant).*(?:\d+|টি|টা).*(?:omr|রিয়াল|রিয়াল|ওএমআর|টাকা|tk|ro|\$)/i.test(query) ||
      /(?:\d+).*(?:জামা|আবায়া|পাঞ্জাবি|শার্ট|প্যান্ট|কামিজ|dress|abaya|shirt|pant).*(?:omr|রিয়াল|রিয়াল|ওএমআর|টাকা|tk|ro|\$)/i.test(query) ||
      /জীবন.*(?:\d+|টি|টা|জামা|dress).*(?:omr|রিয়াল|রিয়াল|ওএমআর|টাকা|tk)/i.test(query);

    if (isInvoiceRequest) {
      try {
        const draft = await parseInvoiceWithAi(query, currency);
        const result: AiQueryResult = {
          answerBn: `✅ ${draft.summaryBn}\n\n📋 **স্মার্ট ইনভয়েস বিবরণ:**\n• কাস্টমার: ${draft.customerNameBn || draft.customerName}\n• পোশাকের ধরণ: ${draft.dressType}\n• পরিমাণ ও রেট: ${draft.items[0]?.quantity || 1}টি × ${draft.currency} ${(draft.items[0]?.unitPrice || 0).toFixed(2)} = ${draft.currency} ${draft.netTotal.toFixed(2)}\n• ডেলিভারির তারিখ: ${draft.deliveryDate}\n• নোট: ${draft.specialNotesBn}\n\nনিচের "এই ইনভয়েসটি তৈরি করুন" বোতামে চাপ দিয়ে সরাসরি ইনভয়েসটি খুলুন ও সেভ করুন।`,
          answerEn: `✅ ${draft.summaryEn}\n\n📋 **Smart Invoice Summary:**\n• Customer: ${draft.customerNameEn || draft.customerName}\n• Category: ${draft.dressType}\n• Quantity & Rate: ${draft.items[0]?.quantity || 1} pcs × ${draft.currency} ${(draft.items[0]?.unitPrice || 0).toFixed(2)} = ${draft.currency} ${draft.netTotal.toFixed(2)}\n• Delivery: ${draft.deliveryDate}\n• Notes: ${draft.specialNotesEn}\n\nClick "Create This Invoice" below to review and finalize.`,
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

        const aiMsg: StoredAiChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: isEn ? result.answerEn : result.answerBn,
          timestamp: Date.now(),
          dataPayload: result,
        };

        if (result.actionSuggestion) {
          setPendingAction(result.actionSuggestion);
        }

        setChatMessages((prev) => [...prev, aiMsg]);
      } catch (err) {
        const fallback = processAiBusinessQuestion(query, invoices, expenses, tailorRecords, currency);
        const aiMsg: StoredAiChatMessage = {
          id: `ai-${Date.now()}`,
          sender: 'ai',
          text: isEn ? fallback.answerEn : fallback.answerBn,
          timestamp: Date.now(),
          dataPayload: fallback,
        };
        setChatMessages((prev) => [...prev, aiMsg]);
      } finally {
        setIsProcessing(false);
      }
      return;
    }

    // Standard business record query
    setTimeout(() => {
      const result = processAiBusinessQuestion(query, invoices, expenses, tailorRecords, currency);

      const aiText = isEn ? result.answerEn : result.answerBn;

      const aiMsg: StoredAiChatMessage = {
        id: `ai-${Date.now()}`,
        sender: 'ai',
        text: aiText,
        timestamp: Date.now(),
        dataPayload: result,
      };

      if (result.actionSuggestion) {
        setPendingAction(result.actionSuggestion);
      }

      setChatMessages((prev) => [...prev, aiMsg]);
      setIsProcessing(false);
    }, 450);
  };

  // Quick prompt buttons
  const quickPrompts = [
    { labelBn: '✨ জীবনের ২টি জামা ৮ OMR', labelEn: '✨ Jibon 2 Dresses 8 OMR', query: 'তুমি জীবনের 2টি জামা 8 omr' },
    { labelBn: 'আজকের হিসাব', labelEn: "Today's Accounts", query: 'আজকের হিসাব দেখাও' },
    { labelBn: 'বকেয়া পাওনা', labelEn: 'Customer Due', query: 'কার কার কাছে টাকা বাকি আছে?' },
    { labelBn: 'আজকের অর্ডার', labelEn: "Today's Orders", query: 'আজ কোন কোন অর্ডার Ready?' },
    { labelBn: 'এই মাসের রিপোর্ট', labelEn: 'This Month', query: 'এই মাসে কতগুলো অর্ডার হয়েছে?' },
    { labelBn: 'কারিগর হিসাব', labelEn: 'Karigar Ledger', query: 'কারিগরদের কত টাকা পাওনা?' },
    { labelBn: 'লাভ-ক্ষতি', labelEn: 'Profit/Loss', query: 'আজকের লাভ কত?' },
    { labelBn: 'টপ কাস্টমার', labelEn: 'Top Customer', query: 'কোন কাস্টমারের সবচেয়ে বেশি অর্ডার?' },
    { labelBn: 'পেন্ডিং অর্ডার', labelEn: 'Pending Orders', query: 'কোন অর্ডারগুলো এখনো Ready হয়নি?' },
  ];

  // Action confirmation handler
  const handleConfirmAction = (action: NonNullable<AiQueryResult['actionSuggestion']>) => {
    if (action.type === 'create-order') {
      onNavigateToNewOrderWithCustomer(action.customerName || '', action.customerPhone || '');
    } else if (action.type === 'view-customer') {
      onNavigateToCustomers();
    } else if (action.type === 'view-invoice' && action.invoiceId) {
      onNavigateToInvoiceDetail(action.invoiceId);
    }
    setPendingAction(null);
  };

  // Copy report to clipboard
  const handleCopyReport = () => {
    navigator.clipboard.writeText(currentReport.reportTextBn);
    setCopyFeedback(true);
    setTimeout(() => setCopyFeedback(false), 2500);
  };

  // Share report on WhatsApp
  const handleShareReportWhatsApp = () => {
    openWhatsAppUrl(shop.phone, currentReport.reportTextBn);
  };

  const [isDownloadingReportPdf, setIsDownloadingReportPdf] = useState(false);
  const [isPrintingReport, setIsPrintingReport] = useState(false);

  const reportPdfFilename = `AI_Business_Report_${shop.name.replace(/\s+/g, '_')}_${reportPeriod}.pdf`;

  const handlePrintReport = async () => {
    try {
      setIsPrintingReport(true);
      await printHtmlElement(
        'printable-report-area',
        `${shop.name} - AI Business Report (${reportPeriod})`
      );
    } catch (err) {
      console.error(err);
    } finally {
      setIsPrintingReport(false);
    }
  };

  const handleDownloadReportPdf = async () => {
    try {
      setIsDownloadingReportPdf(true);
      await exportElementToPdf('printable-report-area', {
        filename: reportPdfFilename,
        title: `${shop.name} - AI Business Report (${reportPeriod})`,
      });
    } catch (err) {
      console.error(err);
    } finally {
      setIsDownloadingReportPdf(false);
    }
  };

  // Clear chat history
  const handleClearHistory = () => {
    clearStoredAiChatHistory();
    setChatMessages([
      {
        id: 'welcome-cleared',
        sender: 'ai',
        text: isEn ? 'Chat conversation cleared. How can I help you?' : 'চ্যাট হিস্টোরি মুছে ফেলা হয়েছে। আপনার ব্যবসা সম্পর্কিত কী জানতে চান?',
        timestamp: Date.now(),
      },
    ]);
  };

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-24">
      {/* Top AI Manager Header Banner */}
      <div className="rounded-3xl bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-950 p-5 sm:p-7 text-white shadow-xl border border-emerald-800/40 relative overflow-hidden">
        {/* Subtle background glow */}
        <div className="absolute top-0 right-0 -mt-8 -mr-8 h-48 w-48 rounded-full bg-emerald-500/10 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-1/3 -mb-10 h-36 w-36 rounded-full bg-teal-400/10 blur-xl pointer-events-none" />

        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start sm:items-center gap-3.5">
            <div className="rounded-2xl bg-gradient-to-br from-amber-400 to-emerald-400 p-3 text-slate-950 shadow-lg shrink-0">
              <Sparkles className="h-7 w-7 text-slate-950 animate-pulse" />
            </div>
            <div>
              <div className="flex items-center gap-2 flex-wrap">
                <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-1.5">
                  <span>{isEn ? 'AI Business Manager' : 'AI বিজনেস ম্যানেজার'}</span>
                </h2>
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-2.5 py-0.5 text-[11px] font-extrabold text-emerald-300 border border-emerald-400/30">
                  <Wifi className="h-3 w-3" />
                  {isEn ? 'Offline-Ready' : 'অফলাইন ও নিরাপদ'}
                </span>
              </div>
              <p className="text-xs sm:text-sm text-emerald-200/90 mt-1">
                {isEn
                  ? `Smart AI Assistant & Business Intelligence for ${shop.name}`
                  : `${shop.name}-এর বাস্তব তথ্যের উপর ভিত্তি করে বুদ্ধিমত্তা ও স্বয়ংক্রিয় ব্যবসায়িক সহায়ক`}
              </p>
            </div>
          </div>

          {/* Quick Metrics Badge in Header */}
          <div className="flex items-center gap-2 bg-white/10 backdrop-blur-md rounded-2xl p-2.5 border border-white/10 shrink-0">
            <div className="px-2.5 py-1 text-center border-r border-white/10">
              <p className="text-[10px] text-emerald-200 font-bold">{isEn ? "Today's Sales" : 'আজকের বিক্রি'}</p>
              <p className="text-sm font-black text-amber-300">
                {currency}
                {formatBengaliNumber(overview.todaySales)}
              </p>
            </div>
            <div className="px-2.5 py-1 text-center border-r border-white/10">
              <p className="text-[10px] text-emerald-200 font-bold">{isEn ? 'Pending' : 'পেন্ডিং'}</p>
              <p className="text-sm font-black text-white">{formatBengaliNumber(overview.pendingOrdersCount)}</p>
            </div>
            <div className="px-2.5 py-1 text-center">
              <p className="text-[10px] text-emerald-200 font-bold">{isEn ? 'Customer Due' : 'বকেয়া পাওনা'}</p>
              <p className="text-sm font-black text-rose-300">
                {currency}
                {formatBengaliNumber(overview.totalCustomerDue)}
              </p>
            </div>
          </div>
        </div>

        {/* Sub-Tabs Navigation */}
        <div className="mt-5 pt-4 border-t border-white/10 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          <button
            onClick={() => setActiveSubTab('chat')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              activeSubTab === 'chat'
                ? 'bg-white text-emerald-950 shadow-md'
                : 'text-emerald-100 hover:bg-white/15'
            }`}
          >
            <MessageCircle className="h-4 w-4" />
            <span>{isEn ? 'Ask AI Chat' : 'AI চ্যাট ও জিজ্ঞাসা'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('overview')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              activeSubTab === 'overview'
                ? 'bg-white text-emerald-950 shadow-md'
                : 'text-emerald-100 hover:bg-white/15'
            }`}
          >
            <BarChart3 className="h-4 w-4" />
            <span>{isEn ? 'Overview Dashboard' : 'বিজনেস ওভারভিউ'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('insights')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap relative ${
              activeSubTab === 'insights'
                ? 'bg-white text-emerald-950 shadow-md'
                : 'text-emerald-100 hover:bg-white/15'
            }`}
          >
            <Sparkle className="h-4 w-4" />
            <span>{isEn ? 'Smart Insights' : 'স্মার্ট ইনসাইটস'}</span>
            {insights.length > 0 && (
              <span className="h-2 w-2 rounded-full bg-amber-400 shrink-0" />
            )}
          </button>

          <button
            onClick={() => setActiveSubTab('report')}
            className={`flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              activeSubTab === 'report'
                ? 'bg-white text-emerald-950 shadow-md'
                : 'text-emerald-100 hover:bg-white/15'
            }`}
          >
            <Calendar className="h-4 w-4" />
            <span>{isEn ? 'AI Business Report' : 'ব্যবসায়িক রিপোর্ট'}</span>
          </button>

          <button
            onClick={() => setActiveSubTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs sm:text-sm font-bold transition whitespace-nowrap ${
              activeSubTab === 'settings'
                ? 'bg-white text-emerald-950 shadow-md'
                : 'text-emerald-100 hover:bg-white/15'
            }`}
          >
            <Settings className="h-4 w-4" />
            <span>{isEn ? 'Settings' : 'সেটিংস'}</span>
          </button>
        </div>
      </div>

      {/* Voice Recognition Error Alert Banner */}
      {voiceError && (
        <div className="rounded-2xl bg-amber-50 border border-amber-300 p-3 text-amber-900 text-xs sm:text-sm flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
            <span>{voiceError}</span>
          </div>
          <button onClick={() => setVoiceError(null)} className="text-xs font-bold text-amber-800 underline">
            {isEn ? 'Dismiss' : 'ঠিক আছে'}
          </button>
        </div>
      )}

      {/* ============================================================ */}
      {/* 1. CHAT INTERFACE TAB */}
      {/* ============================================================ */}
      {activeSubTab === 'chat' && (
        <div className="space-y-4">
          {/* Quick Questions Horizontal Scroll */}
          <div className="space-y-1.5">
            <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider px-1">
              {isEn ? 'Quick Questions (Tap to Ask):' : 'ঝটপট প্রশ্ন (ট্যাপ করলেই উত্তর পাবেন):'}
            </p>
            <div className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
              {quickPrompts.map((item, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setInputQuery(item.query);
                    handleSendQuery(item.query);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-emerald-200 bg-emerald-50/70 hover:bg-emerald-100 text-emerald-950 text-xs font-bold whitespace-nowrap transition active:scale-95 shadow-2xs shrink-0 flex items-center gap-1"
                >
                  <Sparkles className="h-3 w-3 text-emerald-600" />
                  <span>{isEn ? item.labelEn : item.labelBn}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Chat Messages Container */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm min-h-[420px] max-h-[560px] flex flex-col justify-between overflow-hidden">
            <div className="overflow-y-auto space-y-4 pr-1 flex-1">
              {chatMessages.map((msg) => {
                const isUser = msg.sender === 'user';
                const payload = msg.dataPayload as AiQueryResult | undefined;

                return (
                  <div key={msg.id} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[90%] sm:max-w-[80%] space-y-2`}>
                      {/* Message Bubble */}
                      <div
                        className={`rounded-2xl p-3.5 sm:p-4 text-xs sm:text-sm leading-relaxed whitespace-pre-line shadow-xs ${
                          isUser
                            ? 'bg-emerald-800 text-white rounded-br-xs font-medium'
                            : 'bg-slate-100 text-slate-900 rounded-bl-xs border border-slate-200/80 font-normal'
                        }`}
                      >
                        {!isUser && (
                          <div className="flex items-center gap-1.5 text-[11px] font-bold text-emerald-700 mb-1">
                            <Sparkles className="h-3 w-3" />
                            <span>{isEn ? 'AI Business Manager' : 'AI বিজনেস ম্যানেজার'}</span>
                          </div>
                        )}
                        {msg.text}
                      </div>

                      {/* Rich Customer Data Card in Chat */}
                      {payload?.customerData && (
                        <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-xs space-y-2.5 shadow-2xs">
                          <div className="flex items-center justify-between border-b border-emerald-200/60 pb-2">
                            <div className="flex items-center gap-2">
                              <div className="rounded-xl bg-emerald-600 p-1.5 text-white">
                                <Users className="h-4 w-4" />
                              </div>
                              <div>
                                <p className="font-bold text-emerald-950 text-sm">{payload.customerData.name}</p>
                                <p className="text-[11px] text-emerald-700">{payload.customerData.phone || 'ফোন নেই'}</p>
                              </div>
                            </div>
                            <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-emerald-200/80 text-emerald-900">
                              {payload.customerData.totalOrders} {isEn ? 'Orders' : 'অর্ডার'}
                            </span>
                          </div>

                          <div className="grid grid-cols-2 gap-2 text-[11.5px]">
                            <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                              <span className="text-slate-500 block">{isEn ? 'Total Billed' : 'মোট বিল'}</span>
                              <span className="font-black text-slate-900">
                                {currency}
                                {formatBengaliNumber(payload.customerData.totalAmount)}
                              </span>
                            </div>
                            <div className="bg-white/80 p-2 rounded-xl border border-emerald-100">
                              <span className="text-slate-500 block">{isEn ? 'Current Due' : 'বকেয়া বাকি'}</span>
                              <span className={`font-black ${payload.customerData.dueAmount > 0 ? 'text-rose-600' : 'text-emerald-700'}`}>
                                {currency}
                                {formatBengaliNumber(payload.customerData.dueAmount)}
                              </span>
                            </div>
                          </div>

                          {/* Measurement preview */}
                          {payload.customerData.measurementSummary && (
                            <div className="bg-white p-2.5 rounded-xl border border-emerald-200/60 text-[11px] space-y-1">
                              <p className="font-bold text-slate-800 flex items-center gap-1">
                                <Scissors className="h-3 w-3 text-emerald-600" />
                                <span>{isEn ? 'Saved Measurement:' : 'সংরক্ষিত মাপ:'} {payload.customerData.measurementSummary.dressType}</span>
                              </p>
                              <p className="text-slate-600 font-mono text-[10.5px]">
                                লম্বা: {payload.customerData.measurementSummary.length || '-'} | বুক: {payload.customerData.measurementSummary.chest || '-'} | কোমর: {payload.customerData.measurementSummary.waist || '-'} | হাতা: {payload.customerData.measurementSummary.sleeve || '-'} ({payload.customerData.measurementSummary.unit || 'ইঞ্চি'})
                              </p>
                            </div>
                          )}

                          {/* Quick Interactive Actions */}
                          <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                            {payload.customerData.lastInvoiceId && (
                              <button
                                onClick={() => onNavigateToInvoiceDetail(payload.customerData!.lastInvoiceId!)}
                                className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-[11px] font-bold hover:bg-slate-50 transition flex items-center gap-1 shadow-2xs"
                              >
                                <Eye className="h-3 w-3 text-emerald-600" />
                                <span>{isEn ? 'View Invoice' : 'ইনভয়েস দেখুন'}</span>
                              </button>
                            )}

                            <button
                              onClick={() => onNavigateToCustomers()}
                              className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-[11px] font-bold hover:bg-slate-50 transition flex items-center gap-1 shadow-2xs"
                            >
                              <Users className="h-3 w-3 text-emerald-600" />
                              <span>{isEn ? 'Customer Profile' : 'কাস্টমার প্রোফাইল'}</span>
                            </button>

                            {payload.customerData.measurementSummary && (
                              <button
                                onClick={() => onNavigateToMeasurements()}
                                className="px-2.5 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-800 text-[11px] font-bold hover:bg-slate-50 transition flex items-center gap-1 shadow-2xs"
                              >
                                <Scissors className="h-3 w-3 text-emerald-600" />
                                <span>{isEn ? 'Measurements' : 'মাপের খাতা'}</span>
                              </button>
                            )}

                            {payload.customerData.phone && (
                              <button
                                onClick={() => {
                                  const text = isEn
                                    ? `Hello ${payload.customerData!.name}, greetings from ${shop.name}! Regarding your tailoring order.`
                                    : `আসসালামু আলাইকুম ${payload.customerData!.name}, ${shop.name} থেকে যোগাযোগ করা হচ্ছে।`;
                                  openWhatsAppUrl(payload.customerData!.phone, text);
                                }}
                                className="px-2.5 py-1.5 rounded-xl bg-emerald-700 text-white text-[11px] font-bold hover:bg-emerald-800 transition flex items-center gap-1 shadow-2xs ml-auto"
                              >
                                <MessageCircle className="h-3 w-3" />
                                <span>WhatsApp</span>
                              </button>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Orders List in Chat */}
                      {payload?.ordersList && payload.ordersList.length > 0 && (
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3 space-y-2 text-xs">
                          <p className="font-bold text-slate-800 flex items-center gap-1">
                            <Clock className="h-3.5 w-3.5 text-emerald-700" />
                            <span>{isEn ? 'Matching Orders:' : 'সম্পর্কিত অর্ডার তালিকা:'}</span>
                          </p>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {payload.ordersList.map((ord) => (
                              <div
                                key={ord.id}
                                className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/70 hover:border-emerald-300 transition"
                              >
                                <div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="font-black text-slate-900">{ord.id}</span>
                                    <span className="text-[10px] px-2 py-0.2 rounded-md bg-slate-100 text-slate-700 font-bold">
                                      {ord.orderStatus}
                                    </span>
                                  </div>
                                  <p className="text-[11px] text-slate-600">
                                    {ord.customerName} • {ord.dressType} • ডেলিভারি: {ord.deliveryDate}
                                  </p>
                                </div>
                                <button
                                  onClick={() => onNavigateToInvoiceDetail(ord.id)}
                                  className="px-2 py-1 rounded-lg bg-emerald-50 text-emerald-800 text-[11px] font-bold hover:bg-emerald-100 transition shrink-0"
                                >
                                  {isEn ? 'View' : 'দেখুন'}
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Dues List in Chat */}
                      {payload?.duesList && payload.duesList.length > 0 && (
                        <div className="rounded-2xl border border-rose-200 bg-rose-50/50 p-3 space-y-2 text-xs">
                          <p className="font-bold text-rose-950 flex items-center gap-1">
                            <DollarSign className="h-3.5 w-3.5 text-rose-700" />
                            <span>{isEn ? 'Outstanding Dues List:' : 'বকেয়া তালিকা:'}</span>
                          </p>
                          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
                            {payload.duesList.slice(0, 6).map((due, idx) => (
                              <div
                                key={idx}
                                className="flex items-center justify-between p-2 rounded-xl bg-white border border-rose-100"
                              >
                                <div>
                                  <p className="font-bold text-slate-900">{due.customerName}</p>
                                  <p className="text-[10px] text-slate-500">
                                    {due.invoiceId} • {due.customerPhone || 'ফোন নেই'}
                                  </p>
                                </div>
                                <div className="text-right flex items-center gap-2">
                                  <span className="font-black text-rose-600 text-xs">
                                    {currency}
                                    {formatBengaliNumber(due.dueAmount)}
                                  </span>
                                  {due.customerPhone && (
                                    <button
                                      onClick={() => {
                                        const reminder = isEn
                                          ? `Dear ${due.customerName}, gentle reminder regarding outstanding due of ${currency}${due.dueAmount} for invoice #${due.invoiceId} at ${shop.name}.`
                                          : `আসসালামু আলাইকুম ${due.customerName}, ${shop.name} থেকে জানানো হচ্ছে যে ইনভয়েস #${due.invoiceId}-এর ${currency}${due.dueAmount} বকেয়া রয়েছে। অনুগ্রহ করে সুবিধামতো পরিশোধের অনুরোধ রইল।`;
                                        openWhatsAppUrl(due.customerPhone, reminder);
                                      }}
                                      className="p-1 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition"
                                      title="WhatsApp Reminder"
                                    >
                                      <MessageCircle className="h-3.5 w-3.5" />
                                    </button>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* AI SMART INVOICE DRAFT CARD */}
                      {payload?.invoiceDraft && (
                        <div className="mt-3.5 rounded-2xl border-2 border-emerald-500 bg-white p-4 shadow-md text-slate-800 space-y-3">
                          <div className="flex items-center justify-between border-b border-emerald-100 pb-2.5">
                            <div className="flex items-center gap-2">
                              <span className="flex h-8 w-8 items-center justify-center rounded-xl bg-emerald-600 text-white shadow-xs">
                                <Sparkles className="h-4 w-4" />
                              </span>
                              <div>
                                <h4 className="text-xs font-black text-emerald-950 uppercase tracking-wider">
                                  {isEn ? 'AI Smart Invoice Draft' : 'AI স্মার্ট ইনভয়েস ড্রাফট'}
                                </h4>
                                <span className="text-[10px] text-emerald-700 font-semibold">
                                  {isEn ? 'Bilingual Format (English & বাংলা)' : 'দ্বিভাষিক ফরম্যাট (বাংলা ও ইংরেজি)'}
                                </span>
                              </div>
                            </div>
                            <span className="inline-flex items-center rounded-full bg-emerald-100 px-2.5 py-0.5 text-[11px] font-bold text-emerald-800">
                              {payload.invoiceDraft.dressType}
                            </span>
                          </div>

                          {/* Customer & Delivery row */}
                          <div className="grid grid-cols-2 gap-2 text-xs bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                            <div>
                              <span className="text-[10px] text-slate-500 font-bold uppercase block">
                                {isEn ? 'Customer' : 'কাস্টমার'}
                              </span>
                              <span className="font-black text-slate-900 text-sm">
                                {payload.invoiceDraft.customerNameBn || payload.invoiceDraft.customerName}
                              </span>
                              {payload.invoiceDraft.customerNameEn && payload.invoiceDraft.customerNameEn !== payload.invoiceDraft.customerNameBn && (
                                <span className="text-[11px] text-slate-600 block">({payload.invoiceDraft.customerNameEn})</span>
                              )}
                            </div>
                            <div className="text-right">
                              <span className="text-[10px] text-slate-500 font-bold uppercase block">
                                {isEn ? 'Est. Delivery' : 'ডেলিভারির তারিখ'}
                              </span>
                              <span className="font-bold text-slate-800">{payload.invoiceDraft.deliveryDate || 'N/A'}</span>
                            </div>
                          </div>

                          {/* Items Table */}
                          <div className="rounded-xl border border-slate-200 overflow-hidden text-xs">
                            <div className="bg-slate-100 px-3 py-1.5 font-bold text-slate-700 flex justify-between">
                              <span>{isEn ? 'Item Description' : 'আইটেম বিবরণ'}</span>
                              <span>{isEn ? 'Total' : 'মোট দর'}</span>
                            </div>
                            <div className="divide-y divide-slate-100 bg-white">
                              {(payload.invoiceDraft.items || []).map((item, idx) => (
                                <div key={idx} className="p-2.5 flex items-center justify-between">
                                  <div>
                                    <p className="font-bold text-slate-900">{item.descriptionBn || item.description}</p>
                                    {item.descriptionEn && item.descriptionEn !== item.descriptionBn && (
                                      <p className="text-[11px] text-slate-500">{item.descriptionEn}</p>
                                    )}
                                    <span className="inline-block mt-0.5 text-[11px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded font-medium">
                                      {item.quantity}টি × {payload.invoiceDraft!.currency} {item.unitPrice.toFixed(2)}
                                    </span>
                                  </div>
                                  <div className="text-right font-black text-slate-900 text-sm">
                                    {payload.invoiceDraft!.currency} {item.totalPrice.toFixed(2)}
                                  </div>
                                </div>
                              ))}
                            </div>
                            <div className="bg-emerald-50 px-3 py-2 border-t border-emerald-200 flex items-center justify-between font-black text-emerald-950">
                              <span>{isEn ? 'Net Total Amount' : 'সর্বমোট বিল'}</span>
                              <span className="text-base text-emerald-700">{payload.invoiceDraft.currency} {payload.invoiceDraft.netTotal.toFixed(2)}</span>
                            </div>
                          </div>

                          {/* Notes */}
                          {(payload.invoiceDraft.specialNotesBn || payload.invoiceDraft.specialNotesEn) && (
                            <div className="text-[11px] text-slate-600 bg-amber-50/70 p-2 rounded-xl border border-amber-200">
                              <p className="font-semibold text-amber-900">{isEn ? 'Special Notes:' : 'বিশেষ নোট:'}</p>
                              <p>{payload.invoiceDraft.specialNotesBn}</p>
                              {payload.invoiceDraft.specialNotesEn && (
                                <p className="text-slate-500 italic mt-0.5">{payload.invoiceDraft.specialNotesEn}</p>
                              )}
                            </div>
                          )}

                          {/* Primary Action Button to Create Invoice */}
                          <button
                            type="button"
                            onClick={() => {
                              const today = new Date().toISOString().split('T')[0];
                              const draft = payload.invoiceDraft!;
                              const newInvoice: Invoice = {
                                id: `JT-${Math.floor(1000 + Math.random() * 9000)}`,
                                shopId: shop.id,
                                customerName: draft.customerNameBn || draft.customerName,
                                customerPhone: draft.customerPhone || '',
                                customerAddress: draft.customerAddress || '',
                                orderDate: today,
                                deliveryDate: draft.deliveryDate || today,
                                dressType: draft.dressType || 'Abaya',
                                orderStatus: 'Pending',
                                subtotal: draft.subtotal,
                                discount: draft.discount || 0,
                                netTotal: draft.netTotal,
                                advanceDeposit: draft.advanceDeposit || 0,
                                remainingDue: draft.remainingDue,
                                paymentMethod: 'Cash',
                                items: draft.items.map((it, idx) => ({
                                  id: `item-${Date.now()}-${idx}`,
                                  invoiceId: '',
                                  description: it.descriptionBn ? `${it.descriptionBn} (${it.descriptionEn || it.description})` : it.description,
                                  quantity: it.quantity,
                                  unitPrice: it.unitPrice,
                                  totalPrice: it.totalPrice,
                                })),
                                payments: draft.advanceDeposit > 0 ? [{
                                  id: `P-${Date.now()}`,
                                  invoiceId: '',
                                  customerPhone: draft.customerPhone || '',
                                  amount: draft.advanceDeposit,
                                  paymentDate: today,
                                  paymentMethod: 'Cash',
                                  notes: 'Advance at order booking (AI Generated)',
                                  createdAt: Date.now(),
                                }] : [],
                                notes: `${draft.specialNotesBn || ''}\n${draft.specialNotesEn || ''}`.trim(),
                                createdAt: Date.now(),
                                updatedAt: Date.now(),
                              };

                              if (onNavigateToNewOrderWithInvoiceDraft) {
                                onNavigateToNewOrderWithInvoiceDraft(newInvoice);
                              } else {
                                onNavigateToNewOrderWithCustomer(
                                  newInvoice.customerName,
                                  newInvoice.customerPhone,
                                  newInvoice.customerAddress
                                );
                              }
                            }}
                            className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-700 text-white font-black text-xs hover:from-emerald-700 hover:to-teal-800 transition active:scale-[0.98] shadow-md flex items-center justify-center gap-2 cursor-pointer"
                          >
                            <Sparkles className="h-4 w-4 text-emerald-200 animate-pulse" />
                            <span>{isEn ? '✨ Create Order with this AI Draft' : '✨ এই ইনভয়েসটি তৈরি করুন (Create Order)'}</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {/* Processing Loader */}
              {isProcessing && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-slate-100 border border-slate-200 p-3.5 text-xs text-slate-600 flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-emerald-600 animate-spin" />
                    <span>{isEn ? 'AI is analyzing your business records...' : 'AI আপনার দোকানের রেকর্ড যাচাই করছে...'}</span>
                  </div>
                </div>
              )}

              <div ref={chatBottomRef} />
            </div>

            {/* Action Confirmation Modal Card inside Chat */}
            {pendingAction && (
              <div className="mt-3 rounded-2xl border-2 border-amber-300 bg-amber-50/95 p-3.5 shadow-md animate-fadeIn">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                  <div className="flex-1 text-xs">
                    <p className="font-bold text-amber-950 text-sm">
                      {isEn ? 'Confirm Action' : 'অ্যাকশন নিশ্চিত করুন'}
                    </p>
                    <p className="text-amber-800 mt-0.5">
                      {isEn ? pendingAction.descriptionEn : pendingAction.descriptionBn}
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <button
                        onClick={() => handleConfirmAction(pendingAction)}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-700 text-white font-bold text-xs hover:bg-emerald-800 transition active:scale-95 shadow-xs"
                      >
                        {isEn ? 'Confirm' : 'হ্যাঁ, নিশ্চিত করুন'}
                      </button>
                      <button
                        onClick={() => setPendingAction(null)}
                        className="px-3 py-1.5 rounded-xl bg-white border border-slate-300 text-slate-700 font-bold text-xs hover:bg-slate-100 transition"
                      >
                        {isEn ? 'Cancel' : 'বাতিল'}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Input Bar with Voice & Text */}
            <div className="mt-3 pt-3 border-t border-slate-200">
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  handleSendQuery();
                }}
                className="flex items-center gap-2"
              >
                {/* Bengali Voice Input Button */}
                <button
                  type="button"
                  onClick={handleToggleVoice}
                  className={`h-11 w-11 rounded-2xl flex items-center justify-center transition active:scale-95 shrink-0 ${
                    isListening
                      ? 'bg-rose-600 text-white animate-pulse ring-4 ring-rose-300'
                      : 'bg-emerald-50 text-emerald-800 border border-emerald-300 hover:bg-emerald-100'
                  }`}
                  title={isEn ? 'Speak in Bengali or English' : 'বাংলায় বলুন (মাইক্রোফোন)'}
                >
                  {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
                </button>

                {/* Text Input */}
                <input
                  type="text"
                  value={inputQuery}
                  onChange={(e) => setInputQuery(e.target.value)}
                  placeholder={
                    isListening
                      ? (isEn ? 'Listening... speak now' : 'শুনছি... এখন কথা বলুন')
                      : (isEn ? 'Ask in Bengali (e.g. আজকের হিসাব দেখাও)' : 'বাংলায় লিখুন (যেমন: আজ কত বিক্রি? বা রহিমের মাপ দেখাও)')
                  }
                  className="flex-1 rounded-2xl border border-slate-300 bg-slate-50/80 px-4 py-2.5 text-xs sm:text-sm text-slate-900 focus:bg-white focus:border-emerald-600 focus:outline-none focus:ring-2 focus:ring-emerald-500/20"
                />

                {/* Send Button */}
                <button
                  type="submit"
                  disabled={!inputQuery.trim() || isProcessing}
                  className="h-11 px-4 rounded-2xl bg-emerald-800 text-white font-bold text-xs sm:text-sm hover:bg-emerald-900 disabled:opacity-40 transition flex items-center gap-1.5 active:scale-95 shrink-0 shadow-xs"
                >
                  <Send className="h-4 w-4" />
                  <span className="hidden sm:inline">{isEn ? 'Send' : 'জিজ্ঞাসা'}</span>
                </button>
              </form>

              {/* Chat Controls */}
              <div className="flex items-center justify-between text-[11px] text-slate-400 mt-2 px-1">
                <span>{isEn ? 'AI answers from real saved records only.' : 'AI শুধুমাত্র আপনার সংরক্ষিত বাস্তব ডাটা থেকে উত্তর দেয়।'}</span>
                <button
                  onClick={handleClearHistory}
                  className="text-slate-500 hover:text-rose-600 underline transition"
                >
                  {isEn ? 'Clear Chat' : 'চ্যাট মুছুন'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 2. OVERVIEW DASHBOARD TAB */}
      {/* ============================================================ */}
      {activeSubTab === 'overview' && (
        <div className="space-y-6 animate-fadeIn">
          {/* Section 1: Today's Financial Pulse */}
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-emerald-700" />
              <span>{isEn ? "Today's Business Performance" : 'আজকের ব্যবসায়িক সারসংক্ষেপ'}</span>
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              {/* Today Sales */}
              <div className="rounded-2xl border border-emerald-200 bg-gradient-to-br from-emerald-50 to-white p-4 shadow-xs">
                <span className="text-xs font-bold text-emerald-800 block">{isEn ? "Today's Sales" : 'আজকের বিক্রি'}</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">
                  {currency}
                  {formatBengaliNumber(overview.todaySales)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isEn ? 'New orders placed today' : 'আজ গৃহীত নতুন অর্ডার'}
                </p>
              </div>

              {/* Today Expenses */}
              <div className="rounded-2xl border border-rose-200 bg-gradient-to-br from-rose-50 to-white p-4 shadow-xs">
                <span className="text-xs font-bold text-rose-800 block">{isEn ? "Today's Expenses" : 'আজকের খরচ'}</span>
                <p className="text-xl sm:text-2xl font-black text-rose-950 mt-1">
                  {currency}
                  {formatBengaliNumber(overview.todayExpenses)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isEn ? 'Shop operational expenses' : 'দোকানের বিবিধ খরচ'}
                </p>
              </div>

              {/* Today Profit */}
              <div className="rounded-2xl border border-teal-200 bg-gradient-to-br from-teal-50 to-white p-4 shadow-xs">
                <span className="text-xs font-bold text-teal-800 block">{isEn ? "Today's Profit" : 'আজকের লাভ'}</span>
                <p className="text-xl sm:text-2xl font-black text-teal-950 mt-1">
                  {currency}
                  {formatBengaliNumber(overview.todayProfit)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isEn ? 'Sales minus expenses' : 'বিক্রি থেকে খরচ বাদ'}
                </p>
              </div>

              {/* Cash Balance */}
              <div className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 to-white p-4 shadow-xs">
                <span className="text-xs font-bold text-amber-800 block">{isEn ? 'Cash Balance' : 'ক্যাশ ব্যালেন্স'}</span>
                <p className="text-xl sm:text-2xl font-black text-amber-950 mt-1">
                  {currency}
                  {formatBengaliNumber(overview.cashBalance)}
                </p>
                <p className="text-[11px] text-slate-500 mt-1">
                  {isEn ? 'Estimated register balance' : 'হাতে থাকা নিট ক্যাশ'}
                </p>
              </div>
            </div>
          </div>

          {/* Section 2: Order Status Metrics */}
          <div>
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-3 flex items-center gap-1.5">
              <Scissors className="h-4 w-4 text-emerald-700" />
              <span>{isEn ? 'Order Status Tracking' : 'অর্ডার অবস্থা ও কাস্টমার ট্র্যাকিং'}</span>
            </h3>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
              <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-xs">
                <span className="text-xs font-bold text-slate-600 block">{isEn ? 'Total Customers' : 'মোট কাস্টমার'}</span>
                <p className="text-xl sm:text-2xl font-black text-slate-900 mt-1">
                  {formatBengaliNumber(overview.totalCustomersCount)} {isEn ? 'persons' : 'জন'}
                </p>
                <p className="text-[11px] text-slate-400 mt-1">{isEn ? 'Unique recorded clients' : 'অনন্য নিবন্ধিত গ্রাহক'}</p>
              </div>

              <div className="rounded-2xl border border-amber-200 bg-amber-50/50 p-4 shadow-xs">
                <span className="text-xs font-bold text-amber-800 block">{isEn ? 'Pending Orders' : 'পেন্ডিং অর্ডার'}</span>
                <p className="text-xl sm:text-2xl font-black text-amber-950 mt-1">
                  {formatBengaliNumber(overview.pendingOrdersCount)} {isEn ? 'orders' : 'টি'}
                </p>
                <p className="text-[11px] text-amber-700/80 mt-1">{isEn ? 'Awaiting start or fabric' : 'কাজ শুরু করার অপেক্ষায়'}</p>
              </div>

              <div className="rounded-2xl border border-blue-200 bg-blue-50/50 p-4 shadow-xs">
                <span className="text-xs font-bold text-blue-800 block">{isEn ? 'Ready for Pickup' : 'রেডি অর্ডার'}</span>
                <p className="text-xl sm:text-2xl font-black text-blue-950 mt-1">
                  {formatBengaliNumber(overview.readyOrdersCount)} {isEn ? 'orders' : 'টি'}
                </p>
                <p className="text-[11px] text-blue-700/80 mt-1">{isEn ? 'Tailored & waiting' : 'সেলাই সম্পন্ন, ডেলিভারি রেডি'}</p>
              </div>

              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/50 p-4 shadow-xs">
                <span className="text-xs font-bold text-emerald-800 block">{isEn ? 'Delivered Orders' : 'ডেলিভার্ড অর্ডার'}</span>
                <p className="text-xl sm:text-2xl font-black text-emerald-950 mt-1">
                  {formatBengaliNumber(overview.deliveredOrdersCount)} {isEn ? 'orders' : 'টি'}
                </p>
                <p className="text-[11px] text-emerald-700/80 mt-1">{isEn ? 'Completed deliveries' : 'সফলভাবে বুঝিয়ে দেওয়া'}</p>
              </div>
            </div>
          </div>

          {/* Section 3: Due & Ledger Outstanding */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="rounded-3xl border border-rose-200 bg-gradient-to-br from-rose-50/90 to-white p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-rose-800 block uppercase tracking-wider">
                  {isEn ? 'Total Customer Due' : 'মোট কাস্টমার বাকি (বকেয়া)'}
                </span>
                <p className="text-2xl sm:text-3xl font-black text-rose-600 mt-1">
                  {currency}
                  {formatBengaliNumber(overview.totalCustomerDue)}
                </p>
                <p className="text-xs text-rose-800/80 mt-1">
                  {isEn ? 'Uncollected money across invoices' : 'কাস্টমারদের কাছে মোট পাওনা টাকা'}
                </p>
              </div>
              <div className="rounded-2xl bg-rose-100 p-3 text-rose-700">
                <DollarSign className="h-6 w-6" />
              </div>
            </div>

            <div className="rounded-3xl border border-amber-200 bg-gradient-to-br from-amber-50/90 to-white p-5 shadow-xs flex items-center justify-between">
              <div>
                <span className="text-xs font-bold text-amber-800 block uppercase tracking-wider">
                  {isEn ? 'Karigar Due Balance' : 'কারিগরদের বকেয়া মজুরি'}
                </span>
                <p className="text-2xl sm:text-3xl font-black text-amber-600 mt-1">
                  {currency}
                  {formatBengaliNumber(overview.totalKarigarDue)}
                </p>
                <p className="text-xs text-amber-800/80 mt-1">
                  {isEn ? 'Outstanding wage payments to tailors' : 'কারিগরদের পরিশোধযোগ্য মজুরি বাকি'}
                </p>
              </div>
              <div className="rounded-2xl bg-amber-100 p-3 text-amber-700">
                <Scissors className="h-6 w-6" />
              </div>
            </div>
          </div>

          {/* Section 4: Monthly Overview */}
          <div className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm space-y-4">
            <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-emerald-700" />
              <span>{isEn ? 'Current Month Aggregates' : 'চলতি মাসের সার্বিক ফলাফল'}</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold block">{isEn ? 'Monthly Sales' : 'চলতি মাসের বিক্রি'}</span>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {currency}
                  {formatBengaliNumber(overview.monthlySales)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{formatBengaliNumber(overview.monthlyOrdersCount)} {isEn ? 'orders' : 'টি অর্ডার'}</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold block">{isEn ? 'Monthly Expenses' : 'চলতি মাসের খরচ'}</span>
                <p className="text-xl font-black text-slate-900 mt-1">
                  {currency}
                  {formatBengaliNumber(overview.monthlyExpenses)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{isEn ? 'Shop & tailoring costs' : 'দোকানের মাসিক মোট ব্যয়'}</p>
              </div>

              <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200">
                <span className="text-xs text-slate-500 font-bold block">{isEn ? 'Monthly Profit' : 'চলতি মাসের লাভ'}</span>
                <p className="text-xl font-black text-emerald-700 mt-1">
                  {currency}
                  {formatBengaliNumber(overview.monthlyProfit)}
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">{isEn ? 'Net profit before taxes' : 'আনুমানিক নিট প্রফিট'}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 3. BUSINESS INSIGHTS TAB */}
      {/* ============================================================ */}
      {activeSubTab === 'insights' && (
        <div className="space-y-4 animate-fadeIn">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                <Sparkles className="h-4 w-4 text-emerald-700" />
                <span>{isEn ? 'AI Business Insights' : 'AI ব্যবসায়িক ইনসাইটস ও পর্যবেক্ষণ'}</span>
              </h3>
              <p className="text-xs text-slate-500">
                {isEn
                  ? 'Intelligent patterns, trends, and action alerts derived from your shop database.'
                  : 'আপনার দোকানের তথ্য বিশ্লেষণ করে স্বয়ংক্রিয়ভাবে প্রস্তুতকৃত ট্রেন্ড ও গুরুত্বপূর্ণ পরামর্শ।'}
              </p>
            </div>
          </div>

          {insights.length === 0 ? (
            <div className="rounded-3xl border border-slate-200 bg-white p-8 text-center space-y-2">
              <Info className="h-8 w-8 text-slate-400 mx-auto" />
              <p className="text-sm font-bold text-slate-700">
                {isEn ? 'No significant trends detected yet.' : 'ইনসাইট তৈরির জন্য এখনো পর্যাপ্ত ডাটা পাওয়া যায়নি।'}
              </p>
              <p className="text-xs text-slate-400">
                {isEn ? 'Add more orders and expenses to see AI recommendations.' : 'দোকানের অর্ডার ও খরচ যুক্ত করলে এখানে বিশ্লেষণ দেখতে পাবেন।'}
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
              {insights.map((item) => {
                let borderClass = 'border-slate-200 bg-white';
                let icon = <Info className="h-5 w-5 text-slate-600" />;

                if (item.severity === 'alert') {
                  borderClass = 'border-rose-200 bg-rose-50/40 text-rose-950';
                  icon = <AlertTriangle className="h-5 w-5 text-rose-600" />;
                } else if (item.severity === 'warning') {
                  borderClass = 'border-amber-200 bg-amber-50/40 text-amber-950';
                  icon = <AlertTriangle className="h-5 w-5 text-amber-600" />;
                } else if (item.severity === 'success') {
                  borderClass = 'border-emerald-200 bg-emerald-50/40 text-emerald-950';
                  icon = <CheckCircle2 className="h-5 w-5 text-emerald-600" />;
                }

                return (
                  <div
                    key={item.id}
                    className={`rounded-2xl border p-4 shadow-xs space-y-2.5 flex flex-col justify-between ${borderClass}`}
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {icon}
                          <h4 className="font-bold text-sm">{isEn ? item.titleEn : item.titleBn}</h4>
                        </div>
                        {item.metricValue && (
                          <span className="text-xs font-black px-2 py-0.5 rounded-md bg-white border border-slate-200 shadow-2xs">
                            {item.metricValue}
                          </span>
                        )}
                      </div>
                      <p className="text-xs text-slate-700 leading-relaxed">
                        {isEn ? item.descriptionEn : item.descriptionBn}
                      </p>
                    </div>

                    {/* Quick navigation if relevant */}
                    {item.actionType && (
                      <div className="pt-2 border-t border-slate-200/60 flex items-center justify-end">
                        {item.actionType === 'due' && (
                          <button
                            onClick={() => {
                              setInputQuery('সব বকেয়া দেখাও');
                              setActiveSubTab('chat');
                              handleSendQuery('সব বকেয়া দেখাও');
                            }}
                            className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                          >
                            <span>{isEn ? 'View All Dues' : 'সব বকেয়া দেখুন'}</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {item.actionType === 'customer' && (
                          <button
                            onClick={onNavigateToCustomers}
                            className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                          >
                            <span>{isEn ? 'View Customers' : 'কাস্টমার তালিকা দেখুন'}</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {item.actionType === 'karigar' && (
                          <button
                            onClick={onNavigateToTailor}
                            className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                          >
                            <span>{isEn ? 'View Karigar Ledger' : 'কারিগর খাতা দেখুন'}</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                        {item.actionType === 'expense' && (
                          <button
                            onClick={onNavigateToExpenses}
                            className="text-xs font-bold text-emerald-800 hover:underline flex items-center gap-1"
                          >
                            <span>{isEn ? 'Manage Expenses' : 'খরচ পরিচালনা'}</span>
                            <ChevronRight className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* ============================================================ */}
      {/* 4. AI BUSINESS REPORT TAB */}
      {/* ============================================================ */}
      {activeSubTab === 'report' && (
        <div className="space-y-5 animate-fadeIn">
          {/* Period Selection Controls */}
          <div className="rounded-3xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm space-y-3 print:hidden">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
                  <Calendar className="h-4 w-4 text-emerald-700" />
                  <span>{isEn ? 'Generate AI Business Report' : 'AI ব্যবসায়িক রিপোর্ট জেনারেটর'}</span>
                </h3>
                <p className="text-xs text-slate-500">
                  {isEn ? 'Select date period to compile official business report' : 'নির্দিষ্ট সময়সীমা নির্বাচন করে স্বয়ংক্রিয় বাংলা রিপোর্ট তৈরি করুন'}
                </p>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={handleCopyReport}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                >
                  <Copy className="h-3.5 w-3.5 text-slate-600" />
                  <span>{copyFeedback ? (isEn ? 'Copied!' : 'কপি হয়েছে!') : (isEn ? 'Copy' : 'কপি')}</span>
                </button>

                <button
                  onClick={handleShareReportWhatsApp}
                  className="px-3 py-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1 transition shadow-2xs"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>WhatsApp</span>
                </button>

                {/* Direct A4 PDF Download */}
                <button
                  onClick={handleDownloadReportPdf}
                  disabled={isDownloadingReportPdf}
                  className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-black flex items-center gap-1 transition shadow-2xs disabled:opacity-50"
                  title={isEn ? 'Download A4 PDF Report' : 'A4 PDF রিপোর্ট ডাউনলোড'}
                >
                  {isDownloadingReportPdf ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <FileDown className="h-3.5 w-3.5" />
                  )}
                  <span>{isDownloadingReportPdf ? (isEn ? 'Saving...' : 'সেভ হচ্ছে...') : (isEn ? 'PDF Download' : 'PDF ডাউনলোড')}</span>
                </button>

                {/* Print Button */}
                <button
                  onClick={handlePrintReport}
                  disabled={isPrintingReport}
                  className="px-3 py-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold flex items-center gap-1 transition shadow-2xs disabled:opacity-60 cursor-pointer"
                  title={isEn ? 'Print Report via Browser Dialog' : 'সরাসরি প্রিন্ট বা ডায়ালগ'}
                >
                  {isPrintingReport ? (
                    <Loader2 className="h-3.5 w-3.5 animate-spin text-slate-600" />
                  ) : (
                    <Printer className="h-3.5 w-3.5 text-slate-600" />
                  )}
                  <span>{isPrintingReport ? (isEn ? 'Printing...' : 'প্রিন্ট হচ্ছে...') : (isEn ? 'Print' : 'প্রিন্ট')}</span>
                </button>
              </div>
            </div>

            {/* Filter Buttons */}
            <div className="flex items-center gap-1.5 overflow-x-auto pt-2 no-scrollbar">
              {[
                { id: 'today', labelBn: 'আজ', labelEn: 'Today' },
                { id: 'thisWeek', labelBn: 'এই সপ্তাহ', labelEn: 'This Week' },
                { id: 'thisMonth', labelBn: 'এই মাস', labelEn: 'This Month' },
                { id: 'thisYear', labelBn: 'এই বছর', labelEn: 'This Year' },
                { id: 'custom', labelBn: 'কাস্টম তারিখ', labelEn: 'Custom Date' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setReportPeriod(p.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition ${
                    reportPeriod === p.id
                      ? 'bg-emerald-800 text-white shadow-xs'
                      : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                  }`}
                >
                  {isEn ? p.labelEn : p.labelBn}
                </button>
              ))}
            </div>

            {/* Custom Date Pickers */}
            {reportPeriod === 'custom' && (
              <div className="grid grid-cols-2 gap-3 pt-2 border-t border-slate-100 animate-fadeIn">
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    {isEn ? 'Start Date' : 'শুরুর তারিখ'}
                  </label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium"
                  />
                </div>
                <div>
                  <label className="text-[11px] font-bold text-slate-600 block mb-1">
                    {isEn ? 'End Date' : 'শেষের তারিখ'}
                  </label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full rounded-xl border border-slate-300 px-3 py-1.5 text-xs font-medium"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Generated Report Sheet */}
          <div
            id="printable-report-area"
            className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm space-y-5 print-invoice print-avoid-break print:rounded-none print:border-none print:p-0"
          >
            {/* Header of Report */}
            <div className="border-b border-slate-200 pb-4 text-center space-y-1 print-section-header print-avoid-break">
              <span className="text-xl">👚 👗</span>
              <h2 className="text-lg sm:text-xl font-black text-slate-900 tracking-tight">
                {shop.name}
              </h2>
              <p className="text-xs font-bold text-emerald-800 uppercase tracking-wider">
                {isEn ? 'AI Business & Financial Report' : 'AI ব্যবসায়িক ও আর্থিক বিবরণী'}
              </p>
              <p className="text-[11px] text-slate-500">
                {isEn ? 'Period:' : 'সময়কাল:'} {isEn ? currentReport.periodLabelEn : currentReport.periodLabelBn}
              </p>
            </div>

            {/* Financial Summary Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-center">
              <div className="bg-emerald-50/80 p-3 rounded-2xl border border-emerald-200">
                <span className="text-[11px] font-bold text-emerald-800">{isEn ? 'Total Sales' : 'মোট বিক্রি'}</span>
                <p className="text-lg sm:text-xl font-black text-emerald-950 mt-0.5">
                  {currency}
                  {formatBengaliNumber(currentReport.totalSales)}
                </p>
              </div>

              <div className="bg-rose-50/80 p-3 rounded-2xl border border-rose-200">
                <span className="text-[11px] font-bold text-rose-800">{isEn ? 'Total Expenses' : 'মোট খরচ'}</span>
                <p className="text-lg sm:text-xl font-black text-rose-950 mt-0.5">
                  {currency}
                  {formatBengaliNumber(currentReport.totalExpenseAmount)}
                </p>
              </div>

              <div className="bg-teal-50/80 p-3 rounded-2xl border border-teal-200 col-span-2 sm:col-span-1">
                <span className="text-[11px] font-bold text-teal-800">{isEn ? 'Estimated Net Profit' : 'আনুমানিক নিট লাভ'}</span>
                <p className="text-lg sm:text-xl font-black text-teal-950 mt-0.5">
                  {currency}
                  {formatBengaliNumber(currentReport.estimatedNetProfit)}
                </p>
              </div>
            </div>

            {/* Detailed Key Tables */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
              {/* Order Breakdown */}
              <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
                <h4 className="font-black text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <Scissors className="h-4 w-4 text-emerald-700" />
                  <span>{isEn ? 'Order Flow Analysis' : 'অর্ডার ও ডেলিভারি বিশ্লেষণ'}</span>
                </h4>
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>{isEn ? 'Total Orders Placed:' : 'মোট নতুন অর্ডার:'}</span>
                    <span className="font-bold">{formatBengaliNumber(currentReport.totalOrdersCount)} {isEn ? 'orders' : 'টি'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isEn ? 'Unique Customers:' : 'অর্ডারিং কাস্টমার:'}</span>
                    <span className="font-bold">{formatBengaliNumber(currentReport.uniqueCustomersCount)} {isEn ? 'persons' : 'জন'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isEn ? 'Delivered Orders:' : 'ডেলিভারি সম্পন্ন:'}</span>
                    <span className="font-bold text-emerald-700">{formatBengaliNumber(currentReport.deliveredOrders)} {isEn ? 'orders' : 'টি'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isEn ? 'Ready for Pickup:' : 'রেডি (দোকানে প্রস্তুত):'}</span>
                    <span className="font-bold text-blue-700">{formatBengaliNumber(currentReport.readyOrders)} {isEn ? 'orders' : 'টি'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isEn ? 'Pending / In Progress:' : 'পেন্ডিং / চলমান:'}</span>
                    <span className="font-bold text-amber-700">
                      {formatBengaliNumber(currentReport.pendingOrders + currentReport.inProgressOrders)} {isEn ? 'orders' : 'টি'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dues & Karigar */}
              <div className="rounded-2xl border border-slate-200 p-4 space-y-2">
                <h4 className="font-black text-slate-800 border-b border-slate-100 pb-1.5 flex items-center gap-1.5">
                  <DollarSign className="h-4 w-4 text-emerald-700" />
                  <span>{isEn ? 'Due & Karigar Summary' : 'বকেয়া ও কারিগর মজুরি সারসংক্ষেপ'}</span>
                </h4>
                <div className="space-y-1.5 text-slate-700">
                  <div className="flex justify-between">
                    <span>{isEn ? 'Period Customer Due:' : 'কাস্টমার বকেয়া পাওনা:'}</span>
                    <span className="font-bold text-rose-600">
                      {currency}
                      {formatBengaliNumber(currentReport.totalDue)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isEn ? 'Advance Collected:' : 'অগ্রিম আদায়:'}</span>
                    <span className="font-bold">
                      {currency}
                      {formatBengaliNumber(currentReport.totalAdvance)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isEn ? 'Karigar Wages Earned:' : 'কারিগরদের কাজের মজুরি:'}</span>
                    <span className="font-bold">
                      {currency}
                      {formatBengaliNumber(currentReport.totalKarigarWages)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isEn ? 'Karigar Wages Paid:' : 'পরিশোধিত মজুরি:'}</span>
                    <span className="font-bold text-emerald-700">
                      {currency}
                      {formatBengaliNumber(currentReport.totalKarigarPaid)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>{isEn ? 'Karigar Payable Balance:' : 'কারিগরদের বকেয়া মজুরি:'}</span>
                    <span className="font-bold text-amber-600">
                      {currency}
                      {formatBengaliNumber(currentReport.totalKarigarDue)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Observations List */}
            {currentReport.observationsBn.length > 0 && (
              <div className="rounded-2xl bg-slate-50 p-4 border border-slate-200 space-y-2 text-xs">
                <h4 className="font-black text-slate-900 flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-emerald-700" />
                  <span>{isEn ? 'Key AI Observations' : 'AI ব্যবসায়িক পর্যবেক্ষণ ও বিশ্লেষণ:'}</span>
                </h4>
                <ul className="space-y-1.5 list-disc pl-4 text-slate-700">
                  {((isEn ? currentReport.observationsEn : currentReport.observationsBn) || []).map((obs, idx) => (
                    <li key={idx}>{obs}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================ */}
      {/* 5. AI SETTINGS TAB */}
      {/* ============================================================ */}
      {activeSubTab === 'settings' && (
        <div className="rounded-3xl border border-slate-200 bg-white p-5 sm:p-7 shadow-sm space-y-6 animate-fadeIn">
          <div>
            <h3 className="text-base font-black text-slate-900 flex items-center gap-1.5">
              <Settings className="h-4 w-4 text-emerald-700" />
              <span>{isEn ? 'AI Business Manager Settings' : 'AI বিজনেস ম্যানেজার সেটিংস'}</span>
            </h3>
            <p className="text-xs text-slate-500">
              {isEn ? 'Configure AI behavior, language preferences, and safety.' : 'AI অ্যাসিস্ট্যান্টের আচরণ, ভাষা ও গোপনীয়তা নিয়ন্ত্রণ করুন।'}
            </p>
          </div>

          <div className="space-y-4 text-xs sm:text-sm">
            {/* Enable/Disable Toggle */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <p className="font-bold text-slate-900">{isEn ? 'Enable AI Assistant' : 'AI অ্যাসিস্ট্যান্ট চালু রাখুন'}</p>
                <p className="text-slate-500 text-[11px]">
                  {isEn ? 'Allow intelligent query responses & business analysis' : 'স্মার্ট প্রশ্ন-উত্তর ও বিশ্লেষণ সুবিধা সক্রিয় রাখুন'}
                </p>
              </div>
              <input
                type="checkbox"
                checked={aiSettings.enabled}
                onChange={(e) => setAiSettings({ ...aiSettings, enabled: e.target.checked })}
                className="h-5 w-5 rounded text-emerald-600 focus:ring-emerald-500"
              />
            </div>

            {/* Language Selection */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="font-bold text-slate-900">{isEn ? 'AI Language' : 'AI ভাষা'}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAiSettings({ ...aiSettings, language: 'BN' })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    aiSettings.language === 'BN' ? 'bg-emerald-800 text-white' : 'bg-white border border-slate-300 text-slate-700'
                  }`}
                >
                  🇧🇩 বাংলা (Bengali)
                </button>
                <button
                  type="button"
                  onClick={() => setAiSettings({ ...aiSettings, language: 'EN' })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    aiSettings.language === 'EN' ? 'bg-emerald-800 text-white' : 'bg-white border border-slate-300 text-slate-700'
                  }`}
                >
                  🇬🇧 English (ইংরেজি)
                </button>
              </div>
            </div>

            {/* Response Style */}
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 space-y-2">
              <p className="font-bold text-slate-900">{isEn ? 'Response Style' : 'উত্তরের ধরন'}</p>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setAiSettings({ ...aiSettings, responseStyle: 'detailed' })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    aiSettings.responseStyle === 'detailed' ? 'bg-emerald-800 text-white' : 'bg-white border border-slate-300 text-slate-700'
                  }`}
                >
                  {isEn ? 'Detailed Analysis' : 'বিস্তারিত বিশ্লেষণ'}
                </button>
                <button
                  type="button"
                  onClick={() => setAiSettings({ ...aiSettings, responseStyle: 'concise' })}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition ${
                    aiSettings.responseStyle === 'concise' ? 'bg-emerald-800 text-white' : 'bg-white border border-slate-300 text-slate-700'
                  }`}
                >
                  {isEn ? 'Concise & Direct' : 'সংক্ষিপ্ত ও সুনির্দিষ্ট'}
                </button>
              </div>
            </div>

            {/* Clear Conversation History */}
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-50 border border-slate-200">
              <div>
                <p className="font-bold text-slate-900">{isEn ? 'Clear Conversation History' : 'চ্যাট কথোপকথন মুছুন'}</p>
                <p className="text-slate-500 text-[11px]">
                  {isEn ? 'Reset previous chat messages stored on this phone' : 'এই ফোনে সংরক্ষিত পূর্বের সকল বার্তা মুছে ফেলুন'}
                </p>
              </div>
              <button
                onClick={handleClearHistory}
                className="px-3 py-1.5 rounded-xl border border-rose-300 bg-white text-rose-700 font-bold text-xs hover:bg-rose-50 transition"
              >
                {isEn ? 'Clear History' : 'হিস্টোরি মুছুন'}
              </button>
            </div>

            {/* Privacy Guarantee Box */}
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50/60 p-4 space-y-2 text-xs">
              <div className="flex items-center gap-2 text-emerald-950 font-bold">
                <ShieldCheck className="h-4 w-4 text-emerald-700" />
                <span>{isEn ? 'Privacy & Data Protection' : 'গোপনীয়তা ও নিরাপত্তা নিশ্চয়তা'}</span>
              </div>
              <p className="text-slate-600 leading-relaxed text-[11.5px]">
                {isEn
                  ? 'AI operates 100% locally and safely inside your browser. Your Admin PIN, passwords, and sensitive system settings are strictly isolated and never accessed.'
                  : 'AI বিজনেস ম্যানেজার আপনার ব্রাউজারে সম্পূর্ণ স্থানীয়ভাবে কাজ করে। আপনার এডমিন পিন, পাসওয়ার্ড বা কোনো সংবেদনশীল তথ্য বাইরে প্রেরণ বা ব্যবহার করা হয় না।'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
