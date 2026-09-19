import React, { useState, useRef, useEffect } from 'react';
import { Shop, Invoice, Language } from '../types';
import {
  parseInvoiceWithAi,
  AiInvoiceDraft,
  buildBilingualInvoiceText,
  convertDraftToInvoice,
} from '../utils/aiInvoiceParser';
import { startVoiceCapture, ActiveVoiceSession } from '../utils/nativeVoiceRecognizer';
import {
  Sparkles,
  Mic,
  MicOff,
  Send,
  Save,
  FileText,
  Printer,
  Copy,
  Check,
  Share2,
  X,
  Loader2,
  CheckCircle2,
  Calendar,
  User,
  DollarSign,
  Layers,
} from 'lucide-react';

interface AiSmartInvoiceAssistantProps {
  shop: Shop;
  lang: Language;
  onSaveInvoice?: (invoice: Invoice) => void;
  onNavigateToNewOrderWithDraft?: (draftInvoice: Invoice) => void;
  onOpenPrintModal?: (invoice: Invoice) => void;
  onShowNotification?: (message: string, type?: 'success' | 'info' | 'error') => void;
}

export const AiSmartInvoiceAssistant: React.FC<AiSmartInvoiceAssistantProps> = ({
  shop,
  lang,
  onSaveInvoice,
  onNavigateToNewOrderWithDraft,
  onOpenPrintModal,
  onShowNotification,
}) => {
  const isEn = lang === 'EN';
  const [prompt, setPrompt] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [draft, setDraft] = useState<AiInvoiceDraft | null>(null);
  const [activeTab, setActiveTab] = useState<'both' | 'bn' | 'en'>('both');
  const [copiedState, setCopiedState] = useState(false);
  const [savedSuccessInvoice, setSavedSuccessInvoice] = useState<Invoice | null>(null);

  // Quick suggestion prompts
  const samplePrompts = [
    {
      label: '✨ তুমি জীবনের 2টি জামা 8 omr',
      text: 'তুমি জীবনের 2টি জামা 8 omr',
    },
    {
      label: '✨ জীবনের ২টি জামা ৮ রিয়াল ২ জমা',
      text: 'জীবনের ২টি জামা ৮ রিয়াল ২ রিয়াল জমা ডেলিভারি আগামী শুক্রবার',
    },
    {
      label: '✨ রহিমের ৩টি শার্ট ১৫ OMR',
      text: 'রহিমের ৩টি শার্ট ১৫ OMR ডেলিভারি ৩ দিন পর',
    },
    {
      label: '✨ ফাতেমার ২ আবায়া ১৬ ওএমআর',
      text: 'ফাতেমার ২ আবায়া ১৬ ওএমআর অগ্রিম ৫ ওএমআর মোবাইল ৯১২৩৪৫৬৭',
    },
  ];

  const activeVoiceSessionRef = useRef<ActiveVoiceSession | null>(null);

  useEffect(() => {
    return () => {
      if (activeVoiceSessionRef.current) {
        activeVoiceSessionRef.current.stop();
      }
    };
  }, []);

  // Speech Recognition (Native APK & Web)
  const handleToggleVoice = () => {
    if (isListening) {
      if (activeVoiceSessionRef.current) {
        activeVoiceSessionRef.current.stop();
        activeVoiceSessionRef.current = null;
      }
      setIsListening(false);
      return;
    }

    setErrorMsg(null);
    activeVoiceSessionRef.current = startVoiceCapture({
      language: isEn ? 'en-US' : 'bn-BD',
      contextTag: 'ai_smart_invoice',
      onStart: () => {
        setIsListening(true);
      },
      onResult: (transcript) => {
        setIsListening(false);
        if (transcript && transcript.trim()) {
          setPrompt(transcript);
          handleGenerateInvoice(transcript);
        }
      },
      onError: (errText) => {
        setIsListening(false);
        setErrorMsg(errText);
        setTimeout(() => setErrorMsg(null), 4000);
      },
      onEnd: () => {
        setIsListening(false);
      },
    });
  };

  // Submit AI Prompt
  const handleGenerateInvoice = async (customText?: string) => {
    const textToUse = (customText !== undefined ? customText : prompt).trim();
    if (!textToUse || isProcessing) return;

    setIsProcessing(true);
    setErrorMsg(null);
    setSavedSuccessInvoice(null);

    try {
      const generatedDraft = await parseInvoiceWithAi(textToUse, shop.currency || 'OMR');
      setDraft(generatedDraft);
    } catch (err: any) {
      setErrorMsg(
        err?.message ||
          (isEn ? 'Failed to generate invoice with AI.' : 'AI ইনভয়েস তৈরি করতে সমস্যা হয়েছে।')
      );
    } finally {
      setIsProcessing(false);
    }
  };

  // Direct Save Invoice
  const handleSaveDirectly = () => {
    if (!draft) return;
    const newInvoice = convertDraftToInvoice(draft, shop.id);
    if (onSaveInvoice) {
      onSaveInvoice(newInvoice);
      setSavedSuccessInvoice(newInvoice);
      if (onShowNotification) {
        onShowNotification(
          isEn
            ? `Invoice #${newInvoice.id} for ${newInvoice.customerName} saved successfully!`
            : `কাস্টমার ${newInvoice.customerName}-এর ইনভয়েস #${newInvoice.id} সফলভাবে সেভ হয়েছে!`,
          'success'
        );
      }
    }
  };

  // Edit in full Order Form
  const handleOpenInOrderForm = () => {
    if (!draft) return;
    const newInvoice = convertDraftToInvoice(draft, shop.id);
    if (onNavigateToNewOrderWithDraft) {
      onNavigateToNewOrderWithDraft(newInvoice);
    }
  };

  // Print Modal trigger
  const handleOpenPrint = () => {
    if (!draft) return;
    const targetInvoice = savedSuccessInvoice || convertDraftToInvoice(draft, shop.id);
    if (onOpenPrintModal) {
      onOpenPrintModal(targetInvoice);
    }
  };

  // Copy Formatted Text
  const handleCopyText = () => {
    if (!draft) return;
    const bData = buildBilingualInvoiceText(draft, shop.name);
    let copyContent = bData.bilingualCombined;
    if (activeTab === 'bn') copyContent = bData.textBn;
    if (activeTab === 'en') copyContent = bData.textEn;

    navigator.clipboard.writeText(copyContent);
    setCopiedState(true);
    setTimeout(() => setCopiedState(false), 2500);
    if (onShowNotification) {
      onShowNotification(
        isEn ? 'Bilingual invoice copied to clipboard!' : 'ইনভয়েস টেক্সট ক্লিপবোর্ডে কপি হয়েছে!',
        'success'
      );
    }
  };

  // WhatsApp Share
  const handleShareWhatsApp = () => {
    if (!draft) return;
    const bData = buildBilingualInvoiceText(draft, shop.name);
    const phoneClean = (draft.customerPhone || '').replace(/[^0-9]/g, '');
    const url = phoneClean
      ? `https://wa.me/${phoneClean}?text=${bData.whatsAppMessage}`
      : `https://wa.me/?text=${bData.whatsAppMessage}`;
    window.open(url, '_blank');
  };

  const bilingualData = draft ? buildBilingualInvoiceText(draft, shop.name) : null;

  return (
    <div className="rounded-3xl border-2 border-emerald-300 bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/70 p-4 sm:p-6 shadow-md transition-all">
      {/* Header with Title & Badge */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2.5 pb-3.5 border-b border-emerald-100">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-600 to-teal-700 text-white shadow-sm ring-4 ring-emerald-100">
            <Sparkles className="h-6 w-6 animate-pulse text-amber-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base sm:text-lg font-black text-slate-900 tracking-tight">
                {isEn ? 'Powerful AI Invoice Assistant' : 'শক্তিশালী AI ইনভয়েস সহকারী'}
              </h2>
              <span className="rounded-full bg-emerald-600 px-2.5 py-0.5 text-[11px] font-black text-white shadow-2xs">
                Gemini AI
              </span>
            </div>
            <p className="text-xs sm:text-sm font-semibold text-emerald-900 mt-0.5">
              {isEn
                ? 'Speak or type e.g. "তুমি জীবনের 2টি জামা 8 omr" — formats bilingual invoice instantly!'
                : 'মুখে বলুন বা লিখুন: "তুমি জীবনের 2টি জামা 8 omr" — সাথে সাথে সুন্দর ইংলিশ ও বাংলায় ইনভয়েস সাজিয়ে দেবে!'}
            </p>
          </div>
        </div>

        {draft && (
          <button
            onClick={() => {
              setDraft(null);
              setSavedSuccessInvoice(null);
            }}
            className="self-end sm:self-auto flex items-center gap-1 text-xs font-bold text-slate-500 hover:text-slate-800 bg-white px-2.5 py-1 rounded-xl border border-slate-200 shadow-2xs"
          >
            <X className="h-3.5 w-3.5" />
            <span>{isEn ? 'Clear' : 'মুছে ফেলুন'}</span>
          </button>
        )}
      </div>

      {/* Input & Voice Controls */}
      <div className="mt-4 space-y-2.5">
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGenerateInvoice();
                }
              }}
              placeholder={
                isEn
                  ? 'Type or say: "তুমি জীবনের 2টি জামা 8 omr" or "Fatima 3 abayas 24 omr"...'
                  : 'বলুন বা লিখুন: "তুমি জীবনের 2টি জামা 8 omr" বা "রহিমের ৩টি শার্ট ১৫ ওএমআর"...'
              }
              className="w-full rounded-2xl border-2 border-emerald-300 bg-white px-4 py-3 text-sm sm:text-base font-bold text-slate-900 placeholder:text-slate-400 placeholder:font-normal focus:border-emerald-600 focus:outline-hidden focus:ring-3 focus:ring-emerald-200 shadow-inner"
            />
            {prompt && (
              <button
                type="button"
                onClick={() => setPrompt('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Voice Input Mic Button */}
          <button
            type="button"
            onClick={handleToggleVoice}
            className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl border-2 transition-all shadow-sm active:scale-95 ${
              isListening
                ? 'bg-rose-600 border-rose-700 text-white animate-pulse ring-4 ring-rose-200'
                : 'bg-white border-emerald-300 text-emerald-800 hover:bg-emerald-50 hover:border-emerald-500'
            }`}
            title={isListening ? 'Listening... click to stop' : 'Voice Input (ভয়েসে বলুন)'}
          >
            {isListening ? <MicOff className="h-5 w-5" /> : <Mic className="h-5 w-5" />}
          </button>

          {/* Generate Button */}
          <button
            type="button"
            onClick={() => handleGenerateInvoice()}
            disabled={!prompt.trim() || isProcessing}
            className="flex h-12 shrink-0 items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-700 px-4 sm:px-6 text-sm sm:text-base font-black text-white shadow-md hover:from-emerald-700 hover:to-teal-800 transition active:scale-95 disabled:opacity-50 disabled:pointer-events-none"
          >
            {isProcessing ? (
              <>
                <Loader2 className="h-5 w-5 animate-spin" />
                <span className="hidden sm:inline">{isEn ? 'Processing...' : 'সাজানো হচ্ছে...'}</span>
              </>
            ) : (
              <>
                <Sparkles className="h-5 w-5 text-amber-300" />
                <span>{isEn ? 'Generate Invoice ✨' : 'ইনভয়েস সাজাও ✨'}</span>
              </>
            )}
          </button>
        </div>

        {/* Error message */}
        {errorMsg && (
          <div className="rounded-xl bg-rose-50 border border-rose-300 p-2.5 text-xs sm:text-sm font-bold text-rose-800">
            ⚠️ {errorMsg}
          </div>
        )}

        {/* Suggestion Chips */}
        <div className="flex flex-wrap items-center gap-1.5 pt-1">
          <span className="text-xs font-black text-emerald-950 uppercase tracking-wide mr-1">
            {isEn ? 'Quick Examples:' : 'দ্রুত পরীক্ষা করুন:'}
          </span>
          {samplePrompts.map((p, idx) => (
            <button
              key={idx}
              type="button"
              onClick={() => {
                setPrompt(p.text);
                handleGenerateInvoice(p.text);
              }}
              className="rounded-xl border border-emerald-200 bg-white/90 px-3 py-1.5 text-xs font-black text-emerald-950 hover:bg-emerald-100 hover:border-emerald-400 hover:text-emerald-900 transition shadow-2xs active:scale-95"
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {/* RESULT SECTION: Beautiful Bilingual Formatted Invoice */}
      {draft && bilingualData && (
        <div className="mt-5 rounded-2xl border-2 border-emerald-400 bg-white p-4 sm:p-5 shadow-lg space-y-4">
          {/* Top banner of the draft invoice */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-gradient-to-r from-emerald-900 via-emerald-800 to-teal-900 p-4 rounded-xl text-white shadow-sm">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-amber-300 uppercase tracking-wider">
                  {isEn ? 'AI Smart Invoice Draft' : 'AI স্মার্ট ইনভয়েস রসিদ'}
                </span>
                <span className="rounded-md bg-amber-400/20 px-2 py-0.5 text-[10px] font-black text-amber-300 border border-amber-400/40">
                  {draft.currency} {draft.netTotal.toFixed(2)}
                </span>
              </div>
              <h3 className="text-lg sm:text-xl font-black text-white mt-1">
                {draft.customerNameBn || draft.customerName} ({draft.customerNameEn || draft.customerName})
              </h3>
            </div>

            {/* Language view toggles */}
            <div className="flex items-center gap-1 bg-emerald-950/70 p-1 rounded-xl border border-emerald-700/50">
              <button
                type="button"
                onClick={() => setActiveTab('both')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                  activeTab === 'both'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                🌐 উভয় ভাষা
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('bn')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                  activeTab === 'bn'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                🇧🇩 বাংলা
              </button>
              <button
                type="button"
                onClick={() => setActiveTab('en')}
                className={`px-3 py-1 rounded-lg text-xs font-black transition ${
                  activeTab === 'en'
                    ? 'bg-amber-400 text-slate-950 shadow-xs'
                    : 'text-emerald-200 hover:text-white'
                }`}
              >
                🇬🇧 English
              </button>
            </div>
          </div>

          {/* Quick Metrics Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase">{isEn ? 'Item' : 'পোশাক'}</span>
              <p className="text-sm font-black text-slate-900 mt-0.5">
                {draft.items[0]?.quantity || 1} {isEn ? 'item(s)' : 'টি'} {draft.dressType}
              </p>
            </div>
            <div className="rounded-xl border border-slate-200 bg-slate-50 p-2.5 text-center">
              <span className="text-[11px] font-bold text-slate-500 uppercase">{isEn ? 'Unit Rate' : 'দর (প্রতিটি)'}</span>
              <p className="text-sm font-black text-emerald-800 mt-0.5">
                {draft.currency} {(draft.items[0]?.unitPrice || 0).toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/80 p-2.5 text-center">
              <span className="text-[11px] font-bold text-emerald-700 uppercase">{isEn ? 'Total Bill' : 'মোট বিল'}</span>
              <p className="text-base font-black text-emerald-950 mt-0.5">
                {draft.currency} {draft.netTotal.toFixed(2)}
              </p>
            </div>
            <div className="rounded-xl border border-rose-200 bg-rose-50/80 p-2.5 text-center">
              <span className="text-[11px] font-bold text-rose-700 uppercase">{isEn ? 'Remaining Due' : 'বকেয়া বাকি'}</span>
              <p className="text-base font-black text-rose-900 mt-0.5">
                {draft.currency} {draft.remainingDue.toFixed(2)}
              </p>
            </div>
          </div>

          {/* Formatted Invoice Display Box */}
          <div className="rounded-xl border-2 border-slate-200 bg-slate-950 text-slate-100 p-4 font-mono text-xs sm:text-sm leading-relaxed overflow-x-auto select-all shadow-inner">
            {activeTab === 'both' && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 divide-y md:divide-y-0 md:divide-x divide-slate-800">
                <div className="space-y-2 pr-0 md:pr-4">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span className="text-emerald-400 font-bold">🇧🇩 বাংলা ইনভয়েস বিবরণ</span>
                    <span className="text-[10px] text-slate-400">Bengali Format</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-emerald-100">
                    {bilingualData.textBn}
                  </pre>
                </div>

                <div className="space-y-2 pt-3 md:pt-0 md:pl-4">
                  <div className="flex items-center justify-between pb-1 border-b border-slate-800">
                    <span className="text-amber-400 font-bold">🇬🇧 English Invoice Format</span>
                    <span className="text-[10px] text-slate-400">English Format</span>
                  </div>
                  <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-amber-100">
                    {bilingualData.textEn}
                  </pre>
                </div>
              </div>
            )}

            {activeTab === 'bn' && (
              <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-emerald-100">
                {bilingualData.textBn}
              </pre>
            )}

            {activeTab === 'en' && (
              <pre className="whitespace-pre-wrap font-sans text-xs sm:text-sm text-amber-100">
                {bilingualData.textEn}
              </pre>
            )}
          </div>

          {/* Action Buttons Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-2.5 pt-2">
            <div className="flex flex-wrap items-center gap-2">
              {/* Instant Save Order */}
              <button
                type="button"
                onClick={handleSaveDirectly}
                className="flex items-center gap-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 text-xs sm:text-sm shadow-sm active:scale-95 transition"
              >
                <Save className="h-4 w-4 text-emerald-200" />
                <span>
                  {savedSuccessInvoice
                    ? isEn
                      ? `Saved #${savedSuccessInvoice.id} ✅`
                      : `সেভ হয়েছে #${savedSuccessInvoice.id} ✅`
                    : isEn
                    ? 'Save Order Directly ✨'
                    : 'সরাসরি অর্ডার সেভ করুন ✨'}
                </span>
              </button>

              {/* Open in Order Form for Measurements/Edit */}
              <button
                type="button"
                onClick={handleOpenInOrderForm}
                className="flex items-center gap-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-black px-3.5 py-2.5 text-xs sm:text-sm shadow-sm active:scale-95 transition"
              >
                <FileText className="h-4 w-4" />
                <span>{isEn ? 'Edit in Order Form' : 'অর্ডার ফর্মে এডিট'}</span>
              </button>

              {/* Print Preview */}
              <button
                type="button"
                onClick={handleOpenPrint}
                className="flex items-center gap-2 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold px-3.5 py-2.5 text-xs sm:text-sm shadow-2xs active:scale-95 transition"
              >
                <Printer className="h-4 w-4 text-emerald-700" />
                <span>{isEn ? 'Print / Preview' : 'প্রিন্ট প্রিভিউ / রশীদ'}</span>
              </button>
            </div>

            <div className="flex items-center gap-2">
              {/* Copy Text Button */}
              <button
                type="button"
                onClick={handleCopyText}
                className="flex items-center gap-1.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-100 text-slate-800 font-bold px-3 py-2 text-xs transition active:scale-95 shadow-2xs"
                title="Copy formatted invoice text"
              >
                {copiedState ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600" />
                    <span className="text-emerald-700 font-black">{isEn ? 'Copied!' : 'কপি হয়েছে!'}</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-600" />
                    <span>{isEn ? 'Copy Text' : 'টেক্সট কপি'}</span>
                  </>
                )}
              </button>

              {/* Share WhatsApp Button */}
              <button
                type="button"
                onClick={handleShareWhatsApp}
                className="flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold px-3 py-2 text-xs transition active:scale-95 shadow-2xs"
                title="Share via WhatsApp"
              >
                <Share2 className="h-3.5 w-3.5" />
                <span>WhatsApp</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
