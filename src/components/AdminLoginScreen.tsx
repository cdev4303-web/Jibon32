import React, { useState, useEffect } from 'react';
import { Shop, Language } from '../types';
import { Logo } from './Logo';
import { LanguageSelectorModal } from './LanguageSelectorModal';
import {
  Lock,
  Unlock,
  KeyRound,
  ShieldCheck,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  RotateCcw,
  CheckCircle2,
  X,
  Globe,
} from 'lucide-react';

interface AdminLoginScreenProps {
  shop: Shop;
  lang: Language;
  adminPin: string;
  onLoginSuccess: (remember: boolean) => void;
  onToggleLang?: () => void;
  onChangeLang?: (lang: Language) => void;
  onResetAdminPin?: () => void;
}

export const AdminLoginScreen: React.FC<AdminLoginScreenProps> = ({
  shop,
  lang,
  adminPin,
  onLoginSuccess,
  onToggleLang,
  onChangeLang,
  onResetAdminPin,
}) => {
  const isEn = lang === 'EN';
  const [isLangModalOpen, setIsLangModalOpen] = useState(false);
  const [pinInput, setPinInput] = useState('');
  const [showPin, setShowPin] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [shake, setShake] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [showResetModal, setShowResetModal] = useState(false);

  const handleKeyClick = (num: string) => {
    setErrorMsg('');
    setSuccessMsg('');
    if (pinInput.length < 24) {
      setPinInput((prev) => prev + num);
    }
  };

  const handleBackspace = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setPinInput((prev) => prev.slice(0, -1));
  };

  const handleClear = () => {
    setErrorMsg('');
    setSuccessMsg('');
    setPinInput('');
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const entered = pinInput.trim();
    const validPin = (adminPin || '').trim();

    if (!entered) {
      setErrorMsg(isEn ? 'Please enter your Admin PIN/Password.' : 'দয়া করে এডমিন পিন বা পাসওয়ার্ড লিখুন।');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      return;
    }

    // STRICT CHECK: Only allow the currently configured admin password/PIN.
    // Default or backdoor passwords (like 1234 or admin123) are NOT accepted once changed.
    if (entered === validPin) {
      setErrorMsg('');
      onLoginSuccess(rememberMe);
    } else {
      setErrorMsg(isEn ? 'Incorrect PIN! Please check and try again.' : 'ভুল পাসওয়ার্ড! অনুগ্রহ করে সঠিক পিন দিয়ে চেষ্টা করুন।');
      setShake(true);
      setTimeout(() => setShake(false), 500);
      setPinInput('');
    }
  };

  const handleConfirmReset = () => {
    if (onResetAdminPin) {
      onResetAdminPin();
    }
    setShowResetModal(false);
    setErrorMsg('');
    setSuccessMsg(
      isEn
        ? 'Admin password restored to original default PIN. You can now login.'
        : 'এডমিন পাসওয়ার্ড সফলভাবে মূল ডিফল্ট পিনে রিস্টোর করা হয়েছে। এখন পিন দিয়ে প্রবেশ করুন।'
    );
    setPinInput('');
  };

  // Keyboard support for Enter key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter') {
        handleSubmit();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [pinInput, adminPin, rememberMe]);

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-between text-slate-100 font-sans relative overflow-hidden selection:bg-emerald-500 selection:text-white">
      {/* Subtle Background Pattern */}
      <div className="absolute inset-0 opacity-10 pointer-events-none bg-[radial-gradient(#10b981_1px,transparent_1px)] [background-size:20px_20px]"></div>

      {/* Top Header */}
      <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/60 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <Logo size="md" />
          <div>
            <div className="flex items-center gap-2">
              <span className="font-black text-white text-base tracking-tight">{shop.name}</span>
              <span className="rounded-md bg-emerald-900/80 border border-emerald-600 px-1.5 py-0.5 text-[10px] font-extrabold text-emerald-300">
                ADMIN SECURE
              </span>
            </div>
            <p className="text-[11px] text-slate-400 font-medium">
              {isEn ? 'Tailoring Management ERP' : 'টেইলারিং ও ইনভয়েস ম্যানেজমেন্ট সিস্টেম'}
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsLangModalOpen(true)}
          className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:bg-slate-700 transition"
        >
          <Globe className="h-3.5 w-3.5 text-emerald-400" />
          <span>{lang === 'BN' ? 'বাংলা' : lang === 'HI' ? 'हिन्दी' : lang === 'AR' ? 'العربية' : 'English'}</span>
        </button>
      </header>

      {/* Language Selector Modal */}
      <LanguageSelectorModal
        isOpen={isLangModalOpen}
        onClose={() => setIsLangModalOpen(false)}
        currentLang={lang}
        onSelectLang={(selectedLang) => {
          if (onChangeLang) {
            onChangeLang(selectedLang);
          }
        }}
      />

      {/* Center Auth Card */}
      <main className="relative z-10 flex-1 flex items-center justify-center p-4">
        <div
          className={`w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 sm:p-8 shadow-2xl transition-transform ${
            shake ? 'animate-[shake_0.4s_ease-in-out]' : ''
          }`}
        >
          {/* Header Icon */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-emerald-950 border border-emerald-500/30 text-emerald-400 mb-3 shadow-inner">
              <Lock className="w-8 h-8" />
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
              {isEn ? 'Admin Panel Access' : 'এডমিন প্যানেল প্রবেশ'}
            </h1>
            <p className="text-xs text-slate-400 mt-1">
              {isEn
                ? 'Enter your shop admin PIN or password to unlock'
                : 'দোকানের হিসাব, অর্ডার ও সেটিংস আনলক করতে পাসওয়ার্ড বা পিন দিন'}
            </p>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="relative">
              <div className="flex items-center rounded-2xl bg-slate-950 border-2 border-slate-700 focus-within:border-emerald-500 px-4 py-3 transition shadow-inner">
                <KeyRound className="w-5 h-5 text-emerald-400 mr-2 shrink-0" />
                <input
                  type={showPin ? 'text' : 'password'}
                  inputMode="text"
                  autoFocus
                  value={pinInput}
                  onChange={(e) => {
                    setErrorMsg('');
                    setSuccessMsg('');
                    setPinInput(e.target.value);
                  }}
                  placeholder={isEn ? 'Enter Admin PIN / Password' : 'এডমিন পিন বা পাসওয়ার্ড দিন'}
                  className="w-full bg-transparent text-center text-xl sm:text-2xl font-black tracking-widest text-white outline-none placeholder:text-slate-600 placeholder:text-sm placeholder:font-normal placeholder:tracking-normal"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="text-slate-400 hover:text-slate-200 p-1 transition"
                  title={showPin ? 'Hide' : 'Show'}
                >
                  {showPin ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {errorMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs font-bold animate-fadeIn">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{errorMsg}</span>
              </div>
            )}

            {/* Success Message */}
            {successMsg && (
              <div className="flex items-center gap-2 p-3 rounded-xl bg-emerald-950/80 border border-emerald-700 text-emerald-300 text-xs font-bold animate-fadeIn">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span>{successMsg}</span>
              </div>
            )}

            {/* On-Screen Keypad for quick Touch / Mobile / POS */}
            <div className="grid grid-cols-3 gap-2.5 pt-2">
              {['1', '2', '3', '4', '5', '6', '7', '8', '9'].map((digit) => (
                <button
                  key={digit}
                  type="button"
                  onClick={() => handleKeyClick(digit)}
                  className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-emerald-800 text-white font-black text-lg border border-slate-700 transition shadow-sm"
                >
                  {digit}
                </button>
              ))}
              <button
                type="button"
                onClick={handleClear}
                className="h-12 rounded-xl bg-slate-800/60 hover:bg-rose-950/50 hover:text-rose-300 text-slate-400 font-bold text-xs border border-slate-700 transition"
              >
                {isEn ? 'Clear' : 'মুছুন'}
              </button>
              <button
                type="button"
                onClick={() => handleKeyClick('0')}
                className="h-12 rounded-xl bg-slate-800 hover:bg-slate-700 active:bg-emerald-800 text-white font-black text-lg border border-slate-700 transition shadow-sm"
              >
                0
              </button>
              <button
                type="button"
                onClick={handleBackspace}
                className="h-12 rounded-xl bg-slate-800/60 hover:bg-slate-700 text-slate-300 font-bold text-sm border border-slate-700 transition"
              >
                ⌫
              </button>
            </div>

            {/* Remember Me & Forgot Password / Reset */}
            <div className="flex items-center justify-between pt-2 text-xs">
              <label className="flex items-center gap-2 cursor-pointer text-slate-300 select-none">
                <input
                  type="checkbox"
                  checked={rememberMe}
                  onChange={(e) => setRememberMe(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-700 text-emerald-600 focus:ring-0 bg-slate-800"
                />
                <span>{isEn ? 'Stay logged in' : 'লগইন মনে রাখুন'}</span>
              </label>

              <button
                type="button"
                onClick={() => setShowResetModal(true)}
                className="text-slate-400 hover:text-emerald-400 font-bold text-xs flex items-center gap-1 transition"
                title={isEn ? 'Forgot Password? Restore default PIN' : 'পাসওয়ার্ড মনে নেই? ডিফল্ট পিনে রিস্টোর করুন'}
              >
                <RotateCcw className="w-3.5 h-3.5 text-emerald-400" />
                <span>{isEn ? 'Forgot PIN / Restore' : 'পাসওয়ার্ড ভুলে গেছেন?'}</span>
              </button>
            </div>

            {/* Unlock Button */}
            <button
              type="submit"
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 active:scale-[0.99] text-white font-black text-sm flex items-center justify-center gap-2 shadow-lg shadow-emerald-950/50 transition cursor-pointer"
            >
              <Unlock className="w-4 h-4" />
              <span>{isEn ? 'Unlock Admin Panel' : 'এডমিন প্যানেল খুলুন'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          {/* Footer Security Notice */}
          <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-center gap-2 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
            <span>
              {isEn
                ? 'Protected by Local Pin Authentication'
                : 'লোকাল এডমিন পিন সিকিউরিটি দ্বারা সুরক্ষিত'}
            </span>
          </div>
        </div>
      </main>

      {/* Forgot Password / Reset Confirmation Modal */}
      {showResetModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-sm rounded-3xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2 text-amber-400">
                <RotateCcw className="h-5 w-5" />
                <h3 className="font-bold text-sm text-white">
                  {isEn ? 'Restore Admin Password' : 'এডমিন পাসওয়ার্ড রিস্টোর'}
                </h3>
              </div>
              <button
                onClick={() => setShowResetModal(false)}
                className="rounded-full p-1 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="py-4 text-xs text-slate-300 space-y-2">
              <p>
                {isEn
                  ? 'If you forgot your password, you can restore the admin panel PIN back to the default original PIN.'
                  : 'আপনি যদি পাসওয়ার্ড ভুলে গিয়ে থাকেন, তবে এডমিন প্যানেলের পাসওয়ার্ডটি আগের মতো ডিফল্ট পিনে ফিরিয়ে নিতে পারেন।'}
              </p>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-200">
                <span className="font-bold text-emerald-400">
                  {isEn ? 'Status: ' : 'অবস্থা: '}
                </span>
                <span className="text-slate-300 text-xs">
                  {isEn ? 'Ready to restore default PIN' : 'ডিফল্ট পিনে রিস্টোর করতে প্রস্তুত'}
                </span>
              </div>
            </div>

            <div className="flex gap-2 pt-3 border-t border-slate-800">
              <button
                type="button"
                onClick={() => setShowResetModal(false)}
                className="flex-1 rounded-xl bg-slate-800 hover:bg-slate-700 py-2.5 text-xs font-bold text-slate-300 transition"
              >
                {isEn ? 'Cancel' : 'বাতিল'}
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 rounded-xl bg-emerald-600 hover:bg-emerald-500 py-2.5 text-xs font-bold text-white shadow-md transition"
              >
                {isEn ? 'Confirm Restore' : 'রিস্টোর নিশ্চিত করুন'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Bottom Footer */}
      <footer className="relative z-10 py-3 text-center text-[11px] text-slate-500 border-t border-slate-900 bg-slate-950">
        © {new Date().getFullYear()} {shop.name} • {shop.crNumber || 'Tailor Management System'}
      </footer>
    </div>
  );
};
