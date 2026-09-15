import React, { useState, useEffect } from 'react';
import { Smartphone, PlusSquare, Share, MoreVertical, CheckCircle2, Download, ExternalLink, X } from 'lucide-react';
import { Language } from '../types';

interface InstallGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang?: Language;
}

export const InstallGuideModal: React.FC<InstallGuideModalProps> = ({
  isOpen,
  onClose,
  lang = 'BN',
}) => {
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null);
  const [isStandalone, setIsStandalone] = useState(false);
  const isEn = lang === 'EN';

  useEffect(() => {
    // Check if running as installed PWA standalone
    if (window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone) {
      setIsStandalone(true);
    }

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      deferredPrompt.prompt();
      const { outcome } = await deferredPrompt.userChoice;
      if (outcome === 'accepted') {
        setDeferredPrompt(null);
        onClose();
      }
    }
  };

  const currentUrl = window.location.href;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 sm:p-4 backdrop-blur-sm animate-fadeIn">
      <div className="relative w-full max-w-lg overflow-hidden rounded-3xl bg-white shadow-2xl border border-slate-200 flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between bg-gradient-to-r from-emerald-950 via-teal-900 to-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-amber-400 p-2 text-slate-950 font-black shadow-sm">
              <Smartphone className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-black tracking-tight text-white">
                {isEn ? 'Install App & Add to Home Screen' : 'মোবাইলে অ্যাপ ইনস্টল ও শর্টকাট গাইড'}
              </h3>
              <p className="text-[11px] text-emerald-300">
                {isEn ? 'One-click launch like an official Android/iOS App' : 'প্লে-স্টোরের অ্যাপের মতো এক ক্লিকে সরাসরি ওপেন করুন'}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-300 hover:bg-white/10 hover:text-white transition"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto space-y-4 text-xs">
          {isStandalone ? (
            <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-4 text-emerald-900 flex items-center gap-3">
              <CheckCircle2 className="h-6 w-6 text-emerald-600 shrink-0" />
              <div>
                <p className="font-bold text-sm">{isEn ? 'App is Already Installed!' : 'অ্যাপটি ইতিমধ্যে সফলভাবে ইনস্টল করা আছে!'}</p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  {isEn
                    ? 'You are running in standalone native screen mode.'
                    : 'আপনি সরাসরি ফুল-স্ক্রিন অ্যাপ মোডে আছেন।'}
                </p>
              </div>
            </div>
          ) : null}

          {/* Quick Install Button if browser supports beforeinstallprompt */}
          {deferredPrompt && (
            <div className="rounded-2xl bg-gradient-to-r from-emerald-800 to-teal-800 p-4 text-white shadow-md flex items-center justify-between gap-3">
              <div>
                <p className="font-bold text-sm">{isEn ? 'Instant Install Ready' : '১ ক্লিকে ইনস্টল করুন'}</p>
                <p className="text-[11px] text-emerald-100">{isEn ? 'Click to install to home screen' : 'হোম স্ক্রিনে শর্টকাট যুক্ত করুন'}</p>
              </div>
              <button
                onClick={handleInstallClick}
                className="flex items-center gap-1.5 rounded-xl bg-amber-400 hover:bg-amber-300 text-slate-950 px-4 py-2 text-xs font-black shadow-md transition active:scale-95 whitespace-nowrap"
              >
                <Download className="h-4 w-4" />
                <span>{isEn ? 'Install Now' : 'ইনস্টল করুন'}</span>
              </button>
            </div>
          )}

          {/* Step-by-Step Chrome Instructions */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-emerald-600"></span>
              {isEn ? 'Chrome Browser (Android / PC):' : 'ক্রোম ব্রাউজারে যেভাবে শর্টকাট বা ইনস্টল করবেন:'}
            </h4>

            <ol className="space-y-2.5 text-slate-700 font-medium">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                  ১
                </span>
                <span>
                  ক্রোম ব্রাউজারের উপরে ডানদিকের <strong>তিনটি ডট মেনু (<MoreVertical className="inline h-3.5 w-3.5 text-slate-800" />)</strong> তে চাপ দিন।
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                  ২
                </span>
                <span>
                  মেনু থেকে <strong>"Install app"</strong> অথবা <strong>"Add to Home screen" (হোম স্ক্রিনে যুক্ত করুন)</strong> অপশনে চাপ দিন।
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-emerald-100 text-emerald-900 font-bold text-[11px]">
                  ৩
                </span>
                <span>
                  <strong>"Add / Install"</strong> কনফার্ম করুন। সাথে সাথে আপনার ফোনের হোম স্ক্রিনে টেইলার্স লোগো সহ অ্যাপের আইকন চলে আসবে!
                </span>
              </li>
            </ol>
          </div>

          {/* iPhone / Safari Instructions */}
          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 space-y-3">
            <h4 className="font-black text-slate-900 text-sm flex items-center gap-2">
              <span className="h-2 w-2 rounded-full bg-blue-600"></span>
              {isEn ? 'iPhone / Safari Users:' : 'আইফোন (Safari) ব্যবহারকারীদের জন্য:'}
            </h4>

            <ol className="space-y-2.5 text-slate-700 font-medium">
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-900 font-bold text-[11px]">
                  ১
                </span>
                <span>
                  Safari ব্রাউজারের নিচের <strong>Share বাটনে (<Share className="inline h-3.5 w-3.5 text-blue-600" />)</strong> চাপ দিন।
                </span>
              </li>
              <li className="flex items-start gap-2">
                <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-900 font-bold text-[11px]">
                  ২
                </span>
                <span>
                  নিচে স্ক্রল করে <strong>"Add to Home Screen" (<PlusSquare className="inline h-3.5 w-3.5 text-slate-800" />)</strong> নির্বাচন করুন।
                </span>
              </li>
            </ol>
          </div>

          {/* APK & Source Code Box */}
          <div className="rounded-2xl bg-emerald-50 border border-emerald-300 p-4 space-y-2.5 text-emerald-950">
            <h4 className="font-black text-sm flex items-center gap-2 text-emerald-900">
              <Download className="h-4 w-4 text-emerald-700" />
              <span>{isEn ? 'GitHub Actions & Android APK Package' : 'গিটহাব দিয়ে APK তৈরি (GitHub Actions ও /jibon ফোল্ডার):'}</span>
            </h4>
            <p className="text-xs text-emerald-800 leading-relaxed">
              {isEn
                ? 'Automated GitHub Actions workflow (.github/workflows/build-apk.yml) is configured! When pushed to GitHub, it automatically compiles the APK and provides a downloadable file in the "Actions" tab.'
                : 'আপনার প্রোজেক্টে স্বয়ংক্রিয় GitHub Actions ওয়ার্কফ্লো (.github/workflows/build-apk.yml) যুক্ত করা হয়েছে! গিটহাবে পুশ করলে বা "Actions" ট্যাব থেকে "Run workflow" চাপলেই গিটহাব ক্লাউডে এপিকে বিল্ড করে ডাউনলোডের জন্য প্রস্তুত করে দেয়।'}
            </p>
            <div className="pt-1 flex flex-wrap gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-xl bg-slate-900 text-white px-3 py-1.5 font-bold text-xs">
                ⚡ GitHub Actions Workflow Ready
              </span>
              <a
                href="https://www.pwabuilder.com/"
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white px-3.5 py-1.5 font-black text-xs transition shadow-2xs"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                <span>{isEn ? '1-Click Free APK (PWABuilder)' : 'PWABuilder দিয়ে ১ ক্লিকে APK'}</span>
              </a>
            </div>
          </div>

          {/* Active Live Link Box */}
          <div className="rounded-2xl bg-amber-50 border border-amber-200 p-3.5 text-amber-950">
            <p className="font-bold text-xs mb-1">
              {isEn ? '🔗 Live Application Direct Link:' : '🔗 লাইভ অ্যাপ্লিকেশনের সরাসরি লিঙ্ক:'}
            </p>
            <div className="flex items-center gap-2 bg-white p-2 rounded-xl border border-amber-300 font-mono text-[11px] text-slate-800 break-all select-all">
              <span>{currentUrl}</span>
            </div>
            <p className="text-[10px] text-amber-800 mt-1.5">
              {isEn
                ? 'Tip: If previewing inside an iframe, open the link in a fresh browser tab to enable direct installation.'
                : 'টিপস: ব্রাউজারের নতুন ট্যাবে লিঙ্কটি ওপেন করলে ক্রোম সরাসরি "Install App" এর পপআপ দেখাবে।'}
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50 p-4 flex justify-end">
          <button
            onClick={onClose}
            className="rounded-xl bg-slate-900 hover:bg-slate-800 text-white px-5 py-2 text-xs font-bold transition shadow-sm"
          >
            {isEn ? 'Got it / Close' : 'বুঝেছি / বন্ধ করুন'}
          </button>
        </div>
      </div>
    </div>
  );
};
