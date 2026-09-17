import React, { useState, useRef, useEffect } from 'react';
import { Camera, RefreshCw, Check, X, AlertCircle, Upload, Smartphone, Loader2 } from 'lucide-react';
import { compressDataUri, compressImageFile } from '../utils/imageCompressor';

interface CameraCaptureModalProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  onCapture: (imageDataUri: string) => void;
}

export const CameraCaptureModal: React.FC<CameraCaptureModalProps> = ({
  title,
  isOpen,
  onClose,
  onCapture,
}) => {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const nativeCameraInputRef = useRef<HTMLInputElement | null>(null);
  const galleryInputRef = useRef<HTMLInputElement | null>(null);

  const [stream, setStream] = useState<MediaStream | null>(null);
  const [capturedUri, setCapturedUri] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isStartingCamera, setIsStartingCamera] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      stopCamera();
      setCapturedUri(null);
      setCameraError(null);
      return;
    }
    startCamera(facingMode);
    return () => {
      stopCamera();
    };
  }, [isOpen, facingMode]);

  const startCamera = async (mode: 'environment' | 'user') => {
    stopCamera();
    setCameraError(null);
    setIsStartingCamera(true);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Web camera is not directly accessible in this browser mode.');
      }
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: mode },
          width: { ideal: 1920, min: 640 },
          height: { ideal: 1080, min: 480 },
        },
        audio: false,
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.play().catch(() => {});
      }
    } catch (err: any) {
      console.warn('Camera stream warning:', err);
      setCameraError('ক্যামেরা সরাসরি লোড করা যায়নি। নিচে ফোন ক্যামেরা বা গ্যালারি বাটন ব্যবহার করুন।');
    } finally {
      setIsStartingCamera(false);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop());
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
  };

  const switchCamera = () => {
    setFacingMode((prev) => (prev === 'environment' ? 'user' : 'environment'));
  };

  const takeSnapshot = async () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    const w = video.videoWidth || 1280;
    const h = video.videoHeight || 960;
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.drawImage(video, 0, 0, w, h);
      const rawUri = canvas.toDataURL('image/jpeg', 0.85);
      setIsCompressing(true);
      try {
        const compressed = await compressDataUri(rawUri, { maxWidth: 1080, maxHeight: 1080, quality: 0.72 });
        setCapturedUri(compressed);
      } catch (err) {
        setCapturedUri(rawUri);
      } finally {
        setIsCompressing(false);
      }
      stopCamera();
    }
  };

  const retake = () => {
    setCapturedUri(null);
    startCamera(facingMode);
  };

  const confirmPhoto = () => {
    if (capturedUri) {
      onCapture(capturedUri);
      onClose();
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      setIsCompressing(true);
      try {
        const compressed = await compressImageFile(file, { maxWidth: 1080, maxHeight: 1080, quality: 0.72 });
        onCapture(compressed);
        onClose();
      } catch (err) {
        console.warn('Compression error on file upload:', err);
      } finally {
        setIsCompressing(false);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="relative flex w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-slate-900 text-white shadow-2xl border border-slate-700">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div className="flex items-center gap-2">
            <Camera className="h-5 w-5 text-emerald-400" />
            <h3 className="font-semibold text-white text-sm">{title || 'ক্যামেরা ছবি গ্রহণ (Photo Capture)'}</h3>
          </div>
          <button
            onClick={onClose}
            className="rounded-full p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Viewport Area */}
        <div className="relative flex min-h-[300px] flex-col items-center justify-center bg-black">
          {isCompressing && (
            <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-black/80 backdrop-blur-xs text-white">
              <Loader2 className="h-8 w-8 animate-spin text-emerald-400 mb-2" />
              <p className="text-sm font-bold text-white">ছবি প্রস্তুত ও অপটিমাইজ করা হচ্ছে...</p>
              <p className="text-xs text-slate-300 mt-1">দয়া করে এক মুহূর্ত অপেক্ষা করুন</p>
            </div>
          )}

          {capturedUri ? (
            <div className="relative w-full flex items-center justify-center p-2">
              <img
                src={capturedUri}
                alt="Snapshot"
                className="h-auto max-h-[380px] w-full rounded-lg object-contain"
              />
              <div className="absolute top-4 right-4 rounded-full bg-emerald-600 px-3 py-1 text-xs font-bold text-white shadow">
                ✓ ছবি গৃহীত হয়েছে
              </div>
            </div>
          ) : cameraError ? (
            <div className="flex flex-col items-center justify-center p-6 text-center">
              <AlertCircle className="mb-3 h-10 w-10 text-amber-400" />
              <p className="mb-2 text-sm font-semibold text-slate-200">{cameraError}</p>
              <p className="mb-4 text-xs text-slate-400">
                মোবাইল ক্যামেরা বা গ্যালারি থেকে ছবি নির্বাচন করুন:
              </p>
              <div className="flex flex-col sm:flex-row gap-2 w-full max-w-xs">
                <button
                  type="button"
                  onClick={() => nativeCameraInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white transition hover:bg-emerald-500 shadow"
                >
                  <Smartphone className="h-4 w-4" />
                  ফোন ক্যামেরা
                </button>
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex-1 flex items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-white transition hover:bg-slate-700 border border-slate-700"
                >
                  <Upload className="h-4 w-4" />
                  গ্যালারি থেকে নিন
                </button>
              </div>
            </div>
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className="h-auto max-h-[380px] w-full object-cover"
              />
              <div className="pointer-events-none absolute inset-0 border-2 border-dashed border-emerald-500/40 m-4 rounded-xl flex items-center justify-center">
                <span className="bg-black/50 text-emerald-300 text-[11px] px-3 py-1 rounded-full backdrop-blur-sm">
                  {isStartingCamera ? 'ক্যামেরা চালু হচ্ছে...' : 'পোশাক / ডিজাইন ফ্রেমে রাখুন'}
                </span>
              </div>
            </>
          )}

          <canvas ref={canvasRef} className="hidden" />

          {/* Native Mobile Camera Input */}
          <input
            type="file"
            ref={nativeCameraInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            capture="environment"
            className="hidden"
          />

          {/* Regular File Gallery Input */}
          <input
            type="file"
            ref={galleryInputRef}
            onChange={handleFileUpload}
            accept="image/*"
            className="hidden"
          />
        </div>

        {/* Action Controls */}
        <div className="flex items-center justify-between border-t border-slate-800 bg-slate-900/95 px-5 py-4">
          {capturedUri ? (
            <div className="flex w-full items-center justify-between gap-3">
              <button
                type="button"
                onClick={retake}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-200 hover:bg-slate-700"
              >
                <RefreshCw className="h-4 w-4" />
                আবার তুলুন (Retake)
              </button>
              <button
                type="button"
                onClick={confirmPhoto}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-500 shadow-lg"
              >
                <Check className="h-4 w-4" />
                ছবি ব্যবহার করুন (Use Photo)
              </button>
            </div>
          ) : (
            <div className="flex w-full items-center justify-between gap-2">
              <button
                type="button"
                onClick={() => nativeCameraInputRef.current?.click()}
                className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
                title="Open Phone Camera App"
              >
                <Smartphone className="h-3.5 w-3.5 text-emerald-400" />
                Phone Cam
              </button>
              {!cameraError && (
                <button
                  type="button"
                  onClick={takeSnapshot}
                  className="flex h-14 w-14 items-center justify-center rounded-full border-4 border-emerald-400 bg-white shadow-xl transition active:scale-95"
                  title="Capture Photo"
                >
                  <div className="h-10 w-10 rounded-full bg-emerald-600" />
                </button>
              )}
              {!cameraError ? (
                <button
                  type="button"
                  onClick={switchCamera}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
                  title="Switch Front/Back Camera"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  Flip
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => galleryInputRef.current?.click()}
                  className="flex items-center gap-1.5 rounded-lg bg-slate-800 px-3 py-2 text-xs font-medium text-slate-200 hover:bg-slate-700"
                >
                  <Upload className="h-3.5 w-3.5" />
                  গ্যালারি
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
