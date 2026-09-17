import React from 'react';
import { AlertTriangle, RefreshCw, Sparkles, Database } from 'lucide-react';

interface Props {
  children: React.ReactNode;
  fallbackTitle?: string;
  onReset?: () => void;
}

interface State {
  hasError: boolean;
  error?: Error;
}

export class ErrorBoundary extends React.Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false };
    this.handleReload = this.handleReload.bind(this);
    this.handleRecoverStorage = this.handleRecoverStorage.bind(this);
  }

  public static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Uncaught error caught by ErrorBoundary:', error, errorInfo);
  }

  public handleReload() {
    this.setState({ hasError: false, error: undefined });
    if (this.props.onReset) {
      this.props.onReset();
    }
  }

  public handleRecoverStorage() {
    try {
      // Clean oversized data from localStorage without deleting real invoices
      const rawInvoices = localStorage.getItem('jibon_tailor_invoices');
      if (rawInvoices) {
        try {
          const parsed = JSON.parse(rawInvoices);
          if (Array.isArray(parsed)) {
            const stripped = parsed.map((inv) => ({
              ...inv,
              clothPhotoUri: inv.clothPhotoUri && inv.clothPhotoUri.length > 50000 ? undefined : inv.clothPhotoUri,
              dressDesignPhotoUri: inv.dressDesignPhotoUri && inv.dressDesignPhotoUri.length > 50000 ? undefined : inv.dressDesignPhotoUri,
              customerDesignPhotoUri: inv.customerDesignPhotoUri && inv.customerDesignPhotoUri.length > 50000 ? undefined : inv.customerDesignPhotoUri,
              extraPhotoUri: inv.extraPhotoUri && inv.extraPhotoUri.length > 50000 ? undefined : inv.extraPhotoUri,
            }));
            localStorage.setItem('jibon_tailor_invoices', JSON.stringify(stripped));
          }
        } catch {}
      }
    } catch (e) {
      console.warn('Storage recovery err:', e);
    }
    this.setState({ hasError: false, error: undefined });
    window.location.reload();
  }

  public render() {
    if (this.state.hasError) {
      const isQuotaError =
        this.state.error?.message?.toLowerCase().includes('quota') ||
        this.state.error?.message?.toLowerCase().includes('setitem');

      return (
        <div className="rounded-3xl border-2 border-rose-300 bg-white p-6 sm:p-8 text-center max-w-lg mx-auto my-8 shadow-xl space-y-4">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shadow-inner">
            <AlertTriangle className="h-8 w-8 text-rose-600" />
          </div>
          <div>
            <h3 className="text-lg font-black text-slate-900">
              {this.props.fallbackTitle || 'স্ক্রিন লোড হতে সমস্যা হয়েছে'}
            </h3>
            <p className="text-xs sm:text-sm text-slate-500 mt-1">
              {isQuotaError
                ? 'ব্রাউজার মেমোরিতে ক্যামেরার বড় ছবি সংরক্ষণে সীমাবদ্ধতা হয়েছিল। রিকভারি বাটনে ক্লিক করলে ডাটা অক্ষুণ্ণ রেখে চালু হবে।'
                : 'কিছু একটি অপ্রত্যাশিত ত্রুটি ঘটেছে। নিচের বাটনে চাপ দিয়ে আবার চেষ্টা করুন।'}
            </p>
            {this.state.error && (
              <p className="text-[11px] text-rose-700 bg-rose-50 p-2 rounded-xl mt-2 font-mono break-all text-left">
                {this.state.error.message}
              </p>
            )}
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-3 pt-2">
            {isQuotaError ? (
              <button
                onClick={this.handleRecoverStorage}
                className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95"
              >
                <Database className="h-4 w-4" />
                <span>মেমোরি অপটিমাইজ করে রিকভার করুন</span>
              </button>
            ) : (
              <button
                onClick={this.handleReload}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white font-bold text-xs sm:text-sm shadow-md transition active:scale-95"
              >
                <RefreshCw className="h-4 w-4" />
                <span>আবার লোড করুন / Retry</span>
              </button>
            )}
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
