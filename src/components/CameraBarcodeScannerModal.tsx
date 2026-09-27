import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Article } from '../types';

interface CameraBarcodeScannerModalProps {
  articles: Article[];
  onScanSuccess: (barcodeText: string) => void;
  onClose: () => void;
  title?: string;
}

// Validation algorithmique des sommes de contrôle EAN/UPC pour éliminer les erreurs de lecture
function validateEANChecksum(code: string): boolean {
  const clean = code.trim();
  if (/^\d{13}$/.test(clean)) {
    // EAN-13 Checksum
    let sum = 0;
    for (let i = 0; i < 12; i++) {
      const digit = parseInt(clean[i], 10);
      sum += i % 2 === 0 ? digit : digit * 3;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(clean[12], 10);
  }
  if (/^\d{8}$/.test(clean)) {
    // EAN-8 Checksum
    let sum = 0;
    for (let i = 0; i < 7; i++) {
      const digit = parseInt(clean[i], 10);
      sum += i % 2 === 0 ? digit * 3 : digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(clean[7], 10);
  }
  if (/^\d{12}$/.test(clean)) {
    // UPC-A Checksum
    let sum = 0;
    for (let i = 0; i < 11; i++) {
      const digit = parseInt(clean[i], 10);
      sum += i % 2 === 0 ? digit * 3 : digit;
    }
    const checkDigit = (10 - (sum % 10)) % 10;
    return checkDigit === parseInt(clean[11], 10);
  }
  // Pour Code 128, Code 39, QR Code, formats alphanumériques
  return clean.length >= 3;
}

export function CameraBarcodeScannerModal({
  articles,
  onScanSuccess,
  onClose,
  title = "Scanner Caméra Smartphone Haute Précision"
}: CameraBarcodeScannerModalProps) {
  // Camera & Stream states
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([]);
  const [selectedCameraId, setSelectedCameraId] = useState<string>('');
  
  // Hardware Zoom & Torch
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [maxZoom, setMaxZoom] = useState<number>(1);
  const [minZoom, setMinZoom] = useState<number>(1);
  const [hasZoom, setHasZoom] = useState<boolean>(false);

  // Settings & Modes
  const [scanMode, setScanMode] = useState<'continuous' | 'single'>('continuous');
  const [precisionMode, setPrecisionMode] = useState<'ultra_precision' | 'express'>('ultra_precision');
  const [targetType, setTargetType] = useState<'1d' | 'qr' | 'all'>('1d');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [hapticEnabled, setHapticEnabled] = useState(true);

  // Live Results & History
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lastScannedArticle, setLastScannedArticle] = useState<Article | null>(null);
  const [scannedQuantity, setScannedQuantity] = useState<number>(1);
  const [scannedCount, setScannedCount] = useState<number>(0);
  const [scannedFlash, setScannedFlash] = useState<boolean>(false);
  const [scanHistory, setScanHistory] = useState<{ code: string; name: string; time: string; quantity: number; article?: Article }[]>([]);

  // Manual & File entry
  const [manualCode, setManualCode] = useState('');
  const [showSettings, setShowSettings] = useState(false);
  const [isProcessingFile, setIsProcessingFile] = useState(false);

  // Refs
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const barcodeDetectorRef = useRef<any>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  
  // Debounce & Confirmation tracking
  const lastScanTimestampRef = useRef<number>(0);
  const lastScanCodeRef = useRef<string>('');
  const pendingConfirmationCodeRef = useRef<{ code: string; timestamp: number } | null>(null);

  // Multi-Sensory Audio Chime Feedback
  const triggerAudioBeep = useCallback((success: boolean) => {
    if (!soundEnabled) return;
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      
      if (success) {
        // Double tone crisp POS Beep (1800Hz -> 2400Hz)
        const osc1 = ctx.createOscillator();
        const gain1 = ctx.createGain();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(1760, ctx.currentTime);
        gain1.gain.setValueAtTime(0.2, ctx.currentTime);
        gain1.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
        osc1.connect(gain1);
        gain1.connect(ctx.destination);
        osc1.start(ctx.currentTime);
        osc1.stop(ctx.currentTime + 0.08);

        const osc2 = ctx.createOscillator();
        const gain2 = ctx.createGain();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(2600, ctx.currentTime + 0.06);
        gain2.gain.setValueAtTime(0.25, ctx.currentTime + 0.06);
        gain2.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.16);
        osc2.connect(gain2);
        gain2.connect(ctx.destination);
        osc2.start(ctx.currentTime + 0.06);
        osc2.stop(ctx.currentTime + 0.16);
      } else {
        // Warning low tone for unknown code
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(440, ctx.currentTime);
        gain.gain.setValueAtTime(0.25, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.2);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
      }
    } catch (e) {
      // Audio context disabled
    }
  }, [soundEnabled]);

  // Haptic Feedback
  const triggerHaptic = useCallback(() => {
    if (!hapticEnabled) return;
    try {
      if ('vibrate' in navigator) {
        navigator.vibrate([40, 20, 60]);
      }
    } catch (e) {}
  }, [hapticEnabled]);

  // Scan Processing Engine with Anti-Error Filter & Double Confirmation
  const processScannedBarcode = useCallback((rawCode: string) => {
    const code = rawCode.trim();
    if (!code) return;

    // Checksum & length sanity check
    if (!validateEANChecksum(code)) {
      console.warn("Rejet de code corrompu / incomplet :", code);
      return;
    }

    const now = Date.now();

    // Mode Ultra-Précision : Double lecture consécutive pour éliminer 100% des faux reflets
    if (precisionMode === 'ultra_precision') {
      if (pendingConfirmationCodeRef.current?.code === code && now - pendingConfirmationCodeRef.current.timestamp < 600) {
        // Code confirmé sur 2 trames ! On valide le scan
        pendingConfirmationCodeRef.current = null;
      } else {
        // Première détection, mise en mémoire tampon pour confirmation immédiate à la trame suivante
        pendingConfirmationCodeRef.current = { code, timestamp: now };
        return;
      }
    }

    // Debounce identique pour éviter le mitraillage accidentel
    if (code === lastScanCodeRef.current && now - lastScanTimestampRef.current < 900) {
      return;
    }

    lastScanTimestampRef.current = now;
    lastScanCodeRef.current = code;

    // Correspondance article dans le catalogue
    const matchedArticle = articles.find(a => 
      a.code === code || 
      (a.codeBarres && a.codeBarres.includes(code)) || 
      a.id === code ||
      (a.referenceInterne && a.referenceInterne.toLowerCase() === code.toLowerCase())
    );

    const itemName = matchedArticle ? matchedArticle.designation : `Code: ${code}`;
    
    setLastScannedCode(code);
    setLastScannedArticle(matchedArticle || null);
    setScannedQuantity(1);
    setScannedCount(prev => prev + 1);

    const timeStr = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setScanHistory(prev => [{ code, name: itemName, time: timeStr, quantity: 1, article: matchedArticle }, ...prev.slice(0, 9)]);

    // Feedback
    triggerAudioBeep(!!matchedArticle);
    triggerHaptic();
    setScannedFlash(true);
    setTimeout(() => setScannedFlash(false), 300);

    onScanSuccess(code);

    if (scanMode === 'single') {
      setTimeout(() => {
        onClose();
      }, 350);
    }
  }, [articles, precisionMode, scanMode, onScanSuccess, onClose, triggerAudioBeep, triggerHaptic]);

  // Handle camera enumeration & setup
  const initCameraDevices = async () => {
    try {
      if (navigator.mediaDevices && navigator.mediaDevices.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(d => d.kind === 'videoinput');
        setAvailableCameras(videoDevices);
        if (videoDevices.length > 0 && !selectedCameraId) {
          // Prefer environment back camera
          const backCam = videoDevices.find(d => 
            d.label.toLowerCase().includes('back') || 
            d.label.toLowerCase().includes('rear') || 
            d.label.toLowerCase().includes('arrière') ||
            d.label.toLowerCase().includes('environment')
          );
          setSelectedCameraId(backCam ? backCam.deviceId : videoDevices[0].deviceId);
        }
      }
    } catch (e) {
      console.warn("Enumerating cameras error:", e);
    }
  };

  // Start Camera Stream
  useEffect(() => {
    initCameraDevices();
  }, []);

  useEffect(() => {
    let html5Qrcode: Html5Qrcode | null = null;
    let isNativeRunning = false;

    const startCameraStream = async () => {
      setCameraError(null);
      setIsCameraActive(false);

      // Clean previous stream
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }

      // Format selection
      const formatsToSupport = targetType === '1d' ? [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E
      ] : targetType === 'qr' ? [
        Html5QrcodeSupportedFormats.QR_CODE
      ] : [
        Html5QrcodeSupportedFormats.EAN_13,
        Html5QrcodeSupportedFormats.EAN_8,
        Html5QrcodeSupportedFormats.CODE_128,
        Html5QrcodeSupportedFormats.CODE_39,
        Html5QrcodeSupportedFormats.UPC_A,
        Html5QrcodeSupportedFormats.UPC_E,
        Html5QrcodeSupportedFormats.QR_CODE
      ];

      // 1. Essai du détecteur matériel BarcodeDetector natif (Ultra-rapide, 60fps sur Android Chrome)
      if ('BarcodeDetector' in window) {
        try {
          // @ts-ignore
          const supported = await BarcodeDetector.getSupportedFormats();
          if (supported && supported.length > 0) {
            // @ts-ignore
            barcodeDetectorRef.current = new BarcodeDetector({
              formats: targetType === '1d' 
                ? ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e']
                : targetType === 'qr' 
                ? ['qr_code']
                : ['ean_13', 'ean_8', 'code_128', 'code_39', 'upc_a', 'upc_e', 'qr_code']
            });

            const constraints: MediaStreamConstraints = {
              video: selectedCameraId ? {
                deviceId: { exact: selectedCameraId },
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
                // @ts-ignore
                focusMode: 'continuous',
                // @ts-ignore
                exposureMode: 'continuous',
                // @ts-ignore
                whiteBalanceMode: 'continuous'
              } : {
                facingMode: { ideal: 'environment' },
                width: { ideal: 1920, min: 1280 },
                height: { ideal: 1080, min: 720 },
                // @ts-ignore
                focusMode: 'continuous'
              }
            };

            const stream = await navigator.mediaDevices.getUserMedia(constraints);
            mediaStreamRef.current = stream;

            const videoElem = document.createElement('video');
            videoElem.srcObject = stream;
            videoElem.setAttribute('playsinline', 'true');
            videoElem.style.width = '100%';
            videoElem.style.height = '100%';
            videoElem.style.objectFit = 'cover';
            await videoElem.play();

            const container = document.getElementById('camera-scanner-viewport');
            if (container) {
              container.innerHTML = '';
              container.appendChild(videoElem);
            }
            videoRef.current = videoElem;
            setIsCameraActive(true);
            isNativeRunning = true;

            // Analyse des capacités du capteur (Zoom, Torche)
            const track = stream.getVideoTracks()[0];
            if (track) {
              const capabilities: any = track.getCapabilities ? track.getCapabilities() : {};
              if (capabilities.torch) {
                setHasTorch(true);
              }
              if (capabilities.zoom) {
                setHasZoom(true);
                setMinZoom(capabilities.zoom.min || 1);
                setMaxZoom(capabilities.zoom.max || 5);
                setZoomLevel(capabilities.zoom.min || 1);
              }
            }

            // Boucle de détection ultra-performante par requestAnimationFrame
            const detectLoop = async () => {
              if (videoElem && videoElem.readyState >= 2 && barcodeDetectorRef.current) {
                try {
                  const barcodes = await barcodeDetectorRef.current.detect(videoElem);
                  if (barcodes && barcodes.length > 0) {
                    for (const barcode of barcodes) {
                      if (barcode.rawValue) {
                        processScannedBarcode(barcode.rawValue);
                      }
                    }
                  }
                } catch (err) {}
              }
              animFrameIdRef.current = requestAnimationFrame(detectLoop);
            };

            detectLoop();
            return;
          }
        } catch (nativeErr) {
          console.warn("Fallback vers Html5Qrcode :", nativeErr);
        }
      }

      // 2. Moteur de secours robuste Html5Qrcode
      try {
        html5Qrcode = new Html5Qrcode("camera-scanner-viewport", {
          formatsToSupport,
          verbose: false
        });
        html5QrcodeRef.current = html5Qrcode;

        const config = {
          fps: 30,
          qrbox: (viewfinderWidth: number, viewfinderHeight: number) => {
            const minEdge = Math.min(viewfinderWidth, viewfinderHeight);
            if (targetType === '1d') {
              return {
                width: Math.min(Math.floor(minEdge * 0.95), 360),
                height: Math.min(Math.floor(minEdge * 0.5), 180)
              };
            }
            return {
              width: Math.min(Math.floor(minEdge * 0.8), 280),
              height: Math.min(Math.floor(minEdge * 0.8), 280)
            };
          },
          aspectRatio: 1.777778,
          videoConstraints: selectedCameraId ? {
            deviceId: { exact: selectedCameraId },
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 }
          } : {
            facingMode: 'environment',
            width: { ideal: 1920, min: 1280 },
            height: { ideal: 1080, min: 720 }
          }
        };

        const cameraChoice = selectedCameraId ? { deviceId: { exact: selectedCameraId } } : { facingMode: "environment" };

        await html5Qrcode.start(
          cameraChoice,
          config,
          (decodedText) => {
            if (decodedText) {
              processScannedBarcode(decodedText);
            }
          },
          () => {}
        );

        setIsCameraActive(true);
        setCameraError(null);

        try {
          // @ts-ignore
          const capabilities: any = html5Qrcode.getRunningTrackCapabilities?.();
          if (capabilities && capabilities.torch) {
            setHasTorch(true);
          }
          if (capabilities && capabilities.zoom) {
            setHasZoom(true);
            setMinZoom(capabilities.zoom.min || 1);
            setMaxZoom(capabilities.zoom.max || 5);
            setZoomLevel(capabilities.zoom.min || 1);
          }
        } catch (e) {}
      } catch (err: any) {
        console.warn("Erreur démarrage caméra :", err);
        setIsCameraActive(false);
        setCameraError(
          "Impossible d'accéder à la caméra du smartphone. Vérifiez les autorisations de votre navigateur (HTTPS requis)."
        );
      }
    };

    startCameraStream();

    return () => {
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
      }
      if (mediaStreamRef.current) {
        mediaStreamRef.current.getTracks().forEach(t => t.stop());
        mediaStreamRef.current = null;
      }
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop().catch(() => {}).finally(() => {
          html5QrcodeRef.current?.clear();
        });
      }
    };
  }, [selectedCameraId, targetType, processScannedBarcode]);

  // Apply Zoom
  const handleZoomChange = async (newZoom: number) => {
    setZoomLevel(newZoom);
    if (mediaStreamRef.current) {
      const track = mediaStreamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          // @ts-ignore
          await track.applyConstraints({ advanced: [{ zoom: newZoom }] });
        } catch (e) {}
      }
    }
    if (html5QrcodeRef.current) {
      try {
        // @ts-ignore
        await html5QrcodeRef.current.applyVideoConstraints({
          advanced: [{ zoom: newZoom }]
        });
      } catch (e) {}
    }
  };

  // Toggle Torch
  const toggleTorch = async () => {
    const nextTorch = !torchOn;
    if (mediaStreamRef.current) {
      const track = mediaStreamRef.current.getVideoTracks()[0];
      if (track) {
        try {
          // @ts-ignore
          await track.applyConstraints({ advanced: [{ torch: nextTorch }] });
          setTorchOn(nextTorch);
          return;
        } catch (e) {}
      }
    }
    if (html5QrcodeRef.current && hasTorch) {
      try {
        // @ts-ignore
        await html5QrcodeRef.current.applyVideoConstraints({
          advanced: [{ torch: nextTorch }]
        });
        setTorchOn(nextTorch);
      } catch (e) {}
    }
  };

  // Scan from photo / image file
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsProcessingFile(true);
    try {
      const scanner = new Html5Qrcode("file-scanner-temp");
      const decoded = await scanner.scanFile(file, true);
      if (decoded) {
        processScannedBarcode(decoded);
      }
      scanner.clear();
    } catch (err) {
      console.warn("Échec décodage image :", err);
      alert("Aucun code-barres net détecté dans cette image. Prenez une photo plus nette et bien éclairée.");
    } finally {
      setIsProcessingFile(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  // Saisie manuelle de code-barres
  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    processScannedBarcode(manualCode.trim());
    setManualCode('');
  };

  // Quantité rapide pour l'article courant scanné
  const handleAddQuantity = () => {
    if (!lastScannedCode) return;
    setScannedQuantity(prev => prev + 1);
    setScannedCount(prev => prev + 1);
    onScanSuccess(lastScannedCode);
    triggerAudioBeep(true);
    triggerHaptic();
  };

  const catalogSamples = articles.filter(a => 
    (a.codeBarres && a.codeBarres.length > 0) || a.code || a.referenceInterne
  ).slice(0, 4);

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-2 sm:p-4 bg-slate-950/95 backdrop-blur-md animate-in fade-in duration-200">
      <div id="file-scanner-temp" className="hidden"></div>
      <input 
        type="file" 
        ref={fileInputRef} 
        onChange={handleFileUpload} 
        accept="image/*" 
        className="hidden" 
      />

      <div className="bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl max-w-lg w-full overflow-hidden text-white flex flex-col max-h-[96vh] relative">
        
        {/* Header Bar */}
        <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-gradient-to-r from-slate-950 via-slate-900 to-indigo-950 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-indigo-500/20 text-indigo-400 border border-indigo-400/30 flex items-center justify-center shadow-inner">
              <span className="material-symbols-outlined text-[24px]">qr_code_scanner</span>
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-sm sm:text-base text-white">
                  {title}
                </h3>
                <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[9.5px] font-black rounded-full uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                  HD Pro
                </span>
              </div>
              <p className="text-[11px] text-slate-400 font-medium">
                Pointez l'objectif vers le code-barres 1D / EAN / QR
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setShowSettings(!showSettings)}
              className={`w-9 h-9 flex items-center justify-center rounded-xl border transition-all cursor-pointer ${
                showSettings 
                  ? 'bg-indigo-600 text-white border-indigo-400' 
                  : 'bg-slate-800/80 text-slate-300 border-slate-700 hover:text-white'
              }`}
              title="Paramètres de précision & Caméra"
            >
              <span className="material-symbols-outlined text-[19px]">tune</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="w-9 h-9 flex items-center justify-center text-slate-400 hover:text-white rounded-xl bg-slate-800/80 hover:bg-slate-800 transition-colors cursor-pointer border border-slate-700"
            >
              <span className="material-symbols-outlined text-[20px]">close</span>
            </button>
          </div>
        </div>

        {/* Collapsible Precision & Camera Settings Panel */}
        {showSettings && (
          <div className="p-4 bg-slate-950 border-b border-slate-800 space-y-3 animate-in slide-in-from-top-2 text-xs">
            <div className="flex items-center justify-between font-bold text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="material-symbols-outlined text-[16px] text-indigo-400">verified_user</span>
                Niveau d'anti-erreur & Précision
              </span>
              <div className="flex bg-slate-900 p-1 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => setPrecisionMode('ultra_precision')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    precisionMode === 'ultra_precision' ? 'bg-emerald-600 text-white shadow-sm' : 'text-slate-400'
                  }`}
                >
                  Haute Précision (Zéro Erreur)
                </button>
                <button
                  type="button"
                  onClick={() => setPrecisionMode('express')}
                  className={`px-2.5 py-1 rounded-lg font-bold text-[11px] transition-all cursor-pointer ${
                    precisionMode === 'express' ? 'bg-indigo-600 text-white shadow-sm' : 'text-slate-400'
                  }`}
                >
                  Express Rafale
                </button>
              </div>
            </div>

            {/* Target Code Format Switcher */}
            <div className="flex items-center justify-between text-xs">
              <span className="text-slate-400 font-bold">Ciblage formats :</span>
              <div className="flex gap-1">
                {(['1d', 'qr', 'all'] as const).map(fmt => (
                  <button
                    key={fmt}
                    type="button"
                    onClick={() => setTargetType(fmt)}
                    className={`px-2.5 py-1 rounded-lg font-bold uppercase text-[10px] transition-all cursor-pointer ${
                      targetType === fmt ? 'bg-indigo-600 text-white' : 'bg-slate-900 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {fmt === '1d' ? 'Code-barres 1D / EAN' : fmt === 'qr' ? 'QR Code 2D' : 'Tous formats'}
                  </button>
                ))}
              </div>
            </div>

            {/* Camera device switcher if multiple cameras */}
            {availableCameras.length > 1 && (
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400 font-bold">Objectif :</span>
                <select
                  value={selectedCameraId}
                  onChange={(e) => setSelectedCameraId(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 px-2.5 py-1 rounded-lg text-xs font-medium focus:outline-none focus:border-indigo-500"
                >
                  {availableCameras.map(c => (
                    <option key={c.deviceId} value={c.deviceId}>
                      {c.label || `Caméra ${c.deviceId.slice(0, 5)}`}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Audio & Haptic Switches */}
            <div className="flex items-center justify-between pt-1 border-t border-slate-900">
              <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={soundEnabled}
                  onChange={(e) => setSoundEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span className="material-symbols-outlined text-[15px] text-amber-400">volume_up</span>
                Bip sonore POS
              </label>

              <label className="flex items-center gap-2 text-slate-300 font-semibold cursor-pointer">
                <input
                  type="checkbox"
                  checked={hapticEnabled}
                  onChange={(e) => setHapticEnabled(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-0"
                />
                <span className="material-symbols-outlined text-[15px] text-purple-400">vibration</span>
                Vibration smartphone
              </label>
            </div>
          </div>
        )}

        {/* Main Body */}
        <div className="p-4 space-y-4 overflow-y-auto flex-1">
          
          {/* Continuous vs Single Mode Selector */}
          <div className="flex items-center justify-between bg-slate-950 p-1.5 rounded-2xl border border-slate-800 text-xs">
            <button
              type="button"
              onClick={() => setScanMode('continuous')}
              className={`flex-1 py-1.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                scanMode === 'continuous'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">autorenew</span>
              Mode Rafale Continu
            </button>
            <button
              type="button"
              onClick={() => setScanMode('single')}
              className={`flex-1 py-1.5 rounded-xl font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                scanMode === 'single'
                  ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <span className="material-symbols-outlined text-[16px]">check_circle</span>
              Scan Unique
            </button>
          </div>

          {/* Camera Viewport with Advanced Laser HUD and Reticle */}
          <div className={`relative bg-slate-950 rounded-2xl border-2 transition-all duration-200 overflow-hidden min-h-[260px] sm:min-h-[300px] flex items-center justify-center shadow-2xl ${
            scannedFlash ? 'border-emerald-400 shadow-[0_0_40px_rgba(16,185,129,0.8)] scale-[1.01]' : 'border-indigo-500/50'
          }`}>
            {/* Camera Video Target */}
            <div id="camera-scanner-viewport" className="w-full h-full text-center text-xs overflow-hidden"></div>

            {/* Target Laser Overlay */}
            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center p-4">
                <div className={`transition-all duration-200 relative overflow-hidden flex items-center justify-center rounded-2xl border-2 ${
                  targetType === '1d' ? 'w-72 sm:w-84 h-36 sm:h-40' : 'w-56 h-56'
                } ${
                  scannedFlash
                    ? 'border-emerald-400 bg-emerald-500/20 shadow-[0_0_35px_#10b981]'
                    : 'border-indigo-400/80 shadow-[0_0_30px_rgba(99,102,241,0.4)]'
                }`}>
                  {/* Dynamic Aiming Laser */}
                  <div className={`w-full h-0.5 absolute ${
                    scannedFlash 
                      ? 'bg-emerald-400 shadow-[0_0_20px_#10b981]' 
                      : 'bg-rose-500 shadow-[0_0_18px_#f43f5e] animate-pulse'
                  }`}></div>

                  {/* Corner Targets */}
                  <div className="absolute top-2 left-2 w-4 h-4 border-t-2 border-l-2 border-indigo-300"></div>
                  <div className="absolute top-2 right-2 w-4 h-4 border-t-2 border-r-2 border-indigo-300"></div>
                  <div className="absolute bottom-2 left-2 w-4 h-4 border-b-2 border-l-2 border-indigo-300"></div>
                  <div className="absolute bottom-2 right-2 w-4 h-4 border-b-2 border-r-2 border-indigo-300"></div>
                  
                  <span className="absolute bottom-2 text-[9.5px] font-black tracking-wider text-indigo-200 bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-md border border-indigo-500/30 uppercase">
                    {targetType === '1d' ? 'Alignez le code 1D / EAN' : 'Centrez le QR Code'}
                  </span>
                </div>
              </div>
            )}

            {/* Floating Top Control Pills (Flash Torch & Image Gallery Upload) */}
            {isCameraActive && (
              <div className="absolute top-3 left-3 right-3 flex items-center justify-between pointer-events-auto">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={isProcessingFile}
                  className="px-3 py-1.5 rounded-xl text-xs font-bold bg-slate-900/80 backdrop-blur-md text-white border border-slate-700 hover:bg-slate-800 transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95"
                  title="Scanner depuis une image ou photo de la galerie"
                >
                  <span className="material-symbols-outlined text-[16px] text-indigo-400">photo_library</span>
                  <span>{isProcessingFile ? 'Analyse...' : 'Galerie'}</span>
                </button>

                {hasTorch && (
                  <button
                    type="button"
                    onClick={toggleTorch}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 ${
                      torchOn 
                        ? 'bg-amber-400 text-slate-950 shadow-amber-400/50 font-black' 
                        : 'bg-slate-900/80 backdrop-blur-md text-white border border-slate-700 hover:bg-slate-800'
                    }`}
                  >
                    <span className="material-symbols-outlined text-[16px]">{torchOn ? 'flashlight_on' : 'flashlight_off'}</span>
                    <span>{torchOn ? 'Lampe ON' : 'Flash'}</span>
                  </button>
                )}
              </div>
            )}

            {/* Hardware Zoom Slider / Quick Stepper Pills (Bottom of viewfinder) */}
            {isCameraActive && (
              <div className="absolute bottom-3 left-3 right-3 flex items-center justify-center gap-1.5 pointer-events-auto">
                <div className="bg-slate-950/80 backdrop-blur-md border border-slate-800 px-2.5 py-1 rounded-full flex items-center gap-1.5 shadow-xl">
                  <span className="text-[10px] font-black text-indigo-400 uppercase tracking-wider">Zoom :</span>
                  {[1, 1.5, 2, 2.5].map((level) => (
                    <button
                      key={level}
                      type="button"
                      onClick={() => handleZoomChange(level)}
                      className={`px-2 py-0.5 rounded-full text-[10.5px] font-black transition-all cursor-pointer ${
                        Math.abs(zoomLevel - level) < 0.1
                          ? 'bg-indigo-600 text-white shadow-sm'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {level}x
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Loading Indicator */}
            {!isCameraActive && !cameraError && (
              <div className="p-6 text-center space-y-2">
                <span className="material-symbols-outlined text-indigo-400 text-[48px] animate-spin">
                  sync
                </span>
                <p className="text-xs font-bold text-slate-300">Initialisation de la caméra haute définition...</p>
              </div>
            )}

            {/* Error Message */}
            {cameraError && (
              <div className="p-6 text-center space-y-2 max-w-xs">
                <span className="material-symbols-outlined text-amber-400 text-[40px]">
                  videocam_off
                </span>
                <p className="text-xs font-bold text-amber-300">{cameraError}</p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white font-bold text-xs rounded-xl transition-all cursor-pointer"
                >
                  Scanner depuis une photo
                </button>
              </div>
            )}
          </div>

          {/* Real-time In-Camera Product Feedback Card with On-Screen Quantity Stepper */}
          {lastScannedCode && (
            <div className="p-3.5 bg-gradient-to-r from-slate-900 via-slate-950 to-indigo-950 border-2 border-indigo-500/60 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-xl animate-in slide-in-from-top-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-11 h-11 rounded-2xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0 shadow-inner">
                  <span className="material-symbols-outlined text-[24px]">verified</span>
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-black uppercase text-emerald-400 tracking-wider">
                      Article détecté & ajouté
                    </span>
                    <span className="text-[10px] font-mono text-indigo-300 bg-indigo-950/80 px-1.5 py-0.2 rounded border border-indigo-800">
                      {lastScannedCode}
                    </span>
                  </div>
                  <h4 className="font-extrabold text-white text-xs sm:text-sm truncate">
                    {lastScannedArticle ? lastScannedArticle.designation : `Code inconnu : ${lastScannedCode}`}
                  </h4>
                  {lastScannedArticle && (
                    <div className="flex items-center gap-3 text-[11px] font-mono text-slate-300 mt-0.5">
                      <span className="font-bold text-emerald-400">
                        Prix : {(lastScannedArticle.prixVenteTTC || lastScannedArticle.prixVenteHT * 1.19).toFixed(3)} DT
                      </span>
                      <span>• Stock : {lastScannedArticle.stock ?? 0}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Quick Stepper Button directly in scanner */}
              <div className="flex items-center justify-end gap-2 shrink-0 pt-2 sm:pt-0 border-t sm:border-t-0 border-slate-800">
                <span className="text-[11px] font-bold text-slate-400 mr-1">Quantité :</span>
                <button
                  type="button"
                  onClick={handleAddQuantity}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white font-black text-xs rounded-xl shadow-md transition-all flex items-center gap-1 cursor-pointer active:scale-95"
                  title="Ajouter une unité supplémentaire"
                >
                  <span className="material-symbols-outlined text-[16px]">add</span>
                  <span>+1 ({scannedQuantity})</span>
                </button>
              </div>
            </div>
          )}

          {/* Session Scan History List */}
          {scanHistory.length > 0 && (
            <div className="bg-slate-950/70 border border-slate-800 rounded-2xl p-3 space-y-2">
              <div className="flex justify-between items-center text-[10.5px] font-black uppercase tracking-wider text-slate-400">
                <span className="flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-[14px] text-emerald-400">receipt_long</span>
                  Historique session ({scannedCount} scan(s))
                </span>
                <span className="text-emerald-400 animate-pulse">Prêt pour le suivant ⚡</span>
              </div>
              <div className="space-y-1.5 max-h-28 overflow-y-auto pr-1">
                {scanHistory.map((item, idx) => (
                  <div key={idx} className="flex items-center justify-between text-xs p-2 bg-slate-900/90 rounded-xl border border-slate-800">
                    <div className="min-w-0 pr-2">
                      <span className="font-bold text-slate-200 block truncate">{item.name}</span>
                      <span className="text-[10px] font-mono text-indigo-400">{item.code}</span>
                    </div>
                    <span className="text-slate-500 font-mono text-[10px] shrink-0">{item.time}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Fallback Manual Code Entry Form */}
          <form onSubmit={handleManualSubmit} className="space-y-1.5">
            <label className="block text-[10.5px] font-black text-slate-400 uppercase tracking-wider">
              Saisie Manuelle de Code ou Douchette USB
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Entrez le code numérique (ex: 6191234567890)..."
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-indigo-500 transition-all placeholder:text-slate-600"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-extrabold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1.5 active:scale-95"
              >
                <span className="material-symbols-outlined text-[16px]">add_shopping_cart</span>
                <span>Valider</span>
              </button>
            </div>
          </form>

          {/* Catalog Quick Samples for Immediate Testing */}
          {catalogSamples.length > 0 && (
            <div className="space-y-1.5 pt-1">
              <span className="text-[10px] font-black text-slate-400 uppercase tracking-wider block">
                Articles du catalogue pour test rapide :
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                {catalogSamples.map((art) => {
                  const codeToUse = (art.codeBarres && art.codeBarres.length > 0)
                    ? art.codeBarres[0]
                    : art.code || art.id;

                  return (
                    <button
                      key={art.id}
                      type="button"
                      onClick={() => processScannedBarcode(codeToUse)}
                      className="p-2 bg-slate-950/80 hover:bg-indigo-950/60 border border-slate-800 hover:border-indigo-500/50 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group"
                    >
                      <div className="min-w-0 pr-2">
                        <span className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 block truncate">
                          {art.designation}
                        </span>
                        <span className="text-[9.5px] font-mono text-indigo-400">
                          {codeToUse}
                        </span>
                      </div>
                      <span className="material-symbols-outlined text-slate-500 group-hover:text-indigo-400 text-[18px]">
                        add_circle
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Footer Bar */}
        <div className="p-4 bg-slate-950/90 border-t border-slate-800 flex items-center justify-between shrink-0">
          <span className="text-xs font-bold text-slate-400 flex items-center gap-1.5">
            <span className="material-symbols-outlined text-emerald-400 text-[18px]">verified</span>
            {scannedCount} article(s) scanné(s)
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2.5 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-extrabold text-xs rounded-xl shadow-lg shadow-indigo-500/25 transition-all cursor-pointer active:scale-95"
          >
            Terminer ({scannedCount})
          </button>
        </div>
      </div>
    </div>
  );
}
