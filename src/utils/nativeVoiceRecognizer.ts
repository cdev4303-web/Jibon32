/**
 * Unified Voice Recognition Engine for Jibon Tailor
 * Supports:
 * 1. Native Android APK Speech Recognizer (Google Speech Services via JavaScriptInterface)
 * 2. Standard Web Browser SpeechRecognition / webkitSpeechRecognition
 */

export interface VoiceRecognitionOptions {
  language?: string; // 'bn-BD' (default) or 'en-US'
  contextTag?: string;
  onStart?: () => void;
  onResult: (text: string) => void;
  onError?: (errorMessage: string) => void;
  onEnd?: () => void;
}

export const isNativeAndroidApp = (): boolean => {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  return Boolean(win.AndroidNativeApp || win.AndroidBridge);
};

export const isVoiceRecognitionSupported = (): boolean => {
  if (typeof window === 'undefined') return false;
  const win = window as any;
  const bridge = win.AndroidNativeApp || win.AndroidBridge;
  if (bridge && typeof bridge.startVoiceRecognition === 'function') {
    return true;
  }
  return Boolean(win.SpeechRecognition || win.webkitSpeechRecognition);
};

export interface ActiveVoiceSession {
  stop: () => void;
}

export const startVoiceCapture = (options: VoiceRecognitionOptions): ActiveVoiceSession => {
  const win = window as any;
  const bridge = win.AndroidNativeApp || win.AndroidBridge;
  const language = options.language || 'bn-BD';
  const contextTag = options.contextTag || `voice_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`;

  // 1. Android APK Native Bridge
  if (bridge && typeof bridge.startVoiceRecognition === 'function') {
    let finished = false;

    const cleanup = () => {
      window.removeEventListener('nativeVoiceResult', handleResult);
      window.removeEventListener('nativeVoiceError', handleError);
    };

    const handleResult = (event: any) => {
      const detail = event.detail;
      if (!detail || detail.context !== contextTag) return;
      if (finished) return;
      finished = true;
      cleanup();
      options.onResult(detail.text || '');
      options.onEnd?.();
    };

    const handleError = (event: any) => {
      const detail = event.detail;
      if (!detail || detail.context !== contextTag) return;
      if (finished) return;
      finished = true;
      cleanup();
      options.onError?.(detail.error || 'ভয়েস গ্রহণ করা যায়নি');
      options.onEnd?.();
    };

    window.addEventListener('nativeVoiceResult', handleResult);
    window.addEventListener('nativeVoiceError', handleError);

    try {
      options.onStart?.();
      bridge.startVoiceRecognition(language, contextTag);
    } catch (err: any) {
      cleanup();
      options.onError?.(err?.message || 'ভয়েস সার্ভিস শুরু করা সম্ভব হয়নি');
      options.onEnd?.();
    }

    return {
      stop: () => {
        cleanup();
        options.onEnd?.();
      },
    };
  }

  // 2. Web Browser SpeechRecognition API fallback
  const SpeechRecognition = win.SpeechRecognition || win.webkitSpeechRecognition;
  if (!SpeechRecognition) {
    const errorMsg =
      language === 'en-US'
        ? 'Voice recognition is not supported in this browser. Please type your prompt.'
        : 'এই ব্রাউজারে বা অ্যাপে ভয়েস সাপোর্ট নেই। অনুগ্রহ করে লিখে দিন।';
    options.onError?.(errorMsg);
    options.onEnd?.();
    return { stop: () => {} };
  }

  try {
    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      options.onStart?.();
    };

    recognition.onresult = (event: any) => {
      let transcript = '';
      if (event.results && event.results.length > 0 && event.results[0].length > 0) {
        transcript = event.results[0][0].transcript || '';
      }
      if (transcript) {
        options.onResult(transcript);
      }
      options.onEnd?.();
    };

    recognition.onerror = (event: any) => {
      const err = event.error;
      let msg = language === 'en-US' ? 'Could not capture voice.' : 'ভয়েস পরিষ্কার শোনা যায়নি।';
      if (err === 'not-allowed') {
        msg = language === 'en-US' ? 'Microphone permission denied.' : 'মাইক্রোফোনের পারমিশন দেওয়া হয়নি।';
      }
      options.onError?.(msg);
      options.onEnd?.();
    };

    recognition.onend = () => {
      options.onEnd?.();
    };

    recognition.start();

    return {
      stop: () => {
        try {
          recognition.abort();
        } catch {
          // ignore
        }
      },
    };
  } catch (err: any) {
    options.onError?.(language === 'en-US' ? 'Microphone access failed.' : 'মাইক্রোফোন চালু করা যায়নি।');
    options.onEnd?.();
    return { stop: () => {} };
  }
};
