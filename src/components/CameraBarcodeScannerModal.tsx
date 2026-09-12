import React, { useEffect, useRef, useState } from 'react';
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode';
import { Article } from '../types';

interface CameraBarcodeScannerModalProps {
  articles: Article[];
  onScanSuccess: (barcodeText: string) => void;
  onClose: () => void;
  title?: string;
}

export function CameraBarcodeScannerModal({
  articles,
  onScanSuccess,
  onClose,
  title = "Scanner Code-Barres Caissier (Appareil Photo)"
}: CameraBarcodeScannerModalProps) {
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const html5QrcodeRef = useRef<Html5Qrcode | null>(null);

  // Sound generator function for scan confirmation
  const playBeepSound = (success = true) => {
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;
      const ctx = new AudioCtx();
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = success ? 'sine' : 'sawtooth';
      osc.frequency.setValueAtTime(success ? 1046.5 : 220, ctx.currentTime);
      gain.gain.setValueAtTime(0.2, ctx.currentTime);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + (success ? 0.15 : 0.3));
    } catch {
      // Audio context policy
    }
  };

  useEffect(() => {
    let html5Qrcode: Html5Qrcode | null = null;

    const startCamera = async () => {
      try {
        const formatsToSupport = [
          Html5QrcodeSupportedFormats.CODE_128,
          Html5QrcodeSupportedFormats.EAN_13,
          Html5QrcodeSupportedFormats.EAN_8,
          Html5QrcodeSupportedFormats.CODE_39,
          Html5QrcodeSupportedFormats.UPC_A,
          Html5QrcodeSupportedFormats.UPC_E,
          Html5QrcodeSupportedFormats.QR_CODE
        ];

        html5Qrcode = new Html5Qrcode("interactive-camera-reader", {
          formatsToSupport,
          verbose: false
        });
        html5QrcodeRef.current = html5Qrcode;

        const config = {
          fps: 10,
          qrbox: { width: 280, height: 160 },
          aspectRatio: 1.777778
        };

        await html5Qrcode.start(
          { facingMode: "environment" },
          config,
          (decodedText) => {
            if (decodedText) {
              setLastScannedCode(decodedText);
              playBeepSound(true);
              onScanSuccess(decodedText);
            }
          },
          () => {
            // Frame scan failure - silent
          }
        );
        setIsCameraActive(true);
        setCameraError(null);
      } catch (err: any) {
        console.warn("Camera start failed, falling back to manual/simulation mode:", err);
        setIsCameraActive(false);
        setCameraError(
          "Accès à la caméra restreint ou indisponible. Vous pouvez saisir ou simuler un code-barres 1D ci-dessous."
        );
      }
    };

    startCamera();

    return () => {
      if (html5QrcodeRef.current) {
        html5QrcodeRef.current.stop().catch(() => {}).finally(() => {
          html5QrcodeRef.current?.clear();
        });
      }
    };
  }, []);

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!manualCode.trim()) return;
    const code = manualCode.trim();
    setLastScannedCode(code);
    playBeepSound(true);
    onScanSuccess(code);
    setManualCode('');
  };

  const handleSimulateSelect = (code: string) => {
    setLastScannedCode(code);
    playBeepSound(true);
    onScanSuccess(code);
  };

  // Extract catalog articles that have codes for simulation
  const catalogSamples = articles.filter(a => 
    (a.codeBarres && a.codeBarres.length > 0) || a.code || a.referenceInterne
  ).slice(0, 4);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-xl shadow-2xl max-w-lg w-full overflow-hidden text-white flex flex-col max-h-[90vh]">
        {/* Modal Header */}
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950/50">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 border border-purple-500/30 flex items-center justify-center">
              <span className="material-symbols-outlined text-[22px]">photo_camera</span>
            </div>
            <div>
              <h3 className="font-extrabold text-sm text-white">{title}</h3>
              <p className="text-[11px] text-slate-400">
                Détection 1D Code 128 / EAN-13 en temps réel par caméra
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Live Camera Feed Container */}
          <div className="relative bg-slate-950 rounded-xl border-2 border-dashed border-purple-500/50 overflow-hidden min-h-[220px] flex items-center justify-center">
            {/* HTML5QRCode Video Target Div */}
            <div id="interactive-camera-reader" className="w-full h-full text-center text-xs"></div>

            {/* Scanning Overlay Laser Animation */}
            {isCameraActive && (
              <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-center">
                <div className="w-64 h-32 border-2 border-purple-400 rounded-xl shadow-[0_0_20px_rgba(168,85,247,0.4)] relative overflow-hidden flex items-center justify-center">
                  <div className="w-full h-0.5 bg-rose-500 shadow-[0_0_12px_#f43f5e] animate-pulse"></div>
                  <span className="absolute bottom-2 text-[9px] font-mono text-purple-300 bg-slate-950/80 px-2 py-0.5 rounded">
                    CENTREZ LE CODE-BARRES 1D
                  </span>
                </div>
              </div>
            )}

            {!isCameraActive && !cameraError && (
              <div className="p-6 text-center space-y-2">
                <span className="material-symbols-outlined text-purple-400 text-[48px] animate-pulse">
                  sync
                </span>
                <p className="text-xs font-bold text-slate-300">Initialisation de la caméra...</p>
              </div>
            )}

            {cameraError && (
              <div className="p-6 text-center space-y-2">
                <span className="material-symbols-outlined text-amber-400 text-[40px]">
                  videocam_off
                </span>
                <p className="text-xs font-bold text-amber-300">{cameraError}</p>
              </div>
            )}
          </div>

          {/* Last Scanned Code Notification */}
          {lastScannedCode && (
            <div className="p-3 bg-emerald-900/50 border border-emerald-500/50 rounded-xl flex items-center gap-3">
              <span className="material-symbols-outlined text-emerald-400 text-[20px]">check_circle</span>
              <div className="text-xs">
                <span className="text-slate-400 font-semibold block">Dernier code scanné :</span>
                <span className="font-mono font-bold text-emerald-300 text-sm">{lastScannedCode}</span>
              </div>
            </div>
          )}

          {/* Manual Input Form */}
          <form onSubmit={handleManualSubmit} className="space-y-2">
            <label className="block text-[11px] font-bold text-slate-400 uppercase tracking-wider">
              Saisie Manuelle ou Douchette Laser
            </label>
            <div className="flex gap-2">
              <input
                type="text"
                value={manualCode}
                onChange={(e) => setManualCode(e.target.value)}
                placeholder="Ex: 2000000001234 ou PRD89234"
                className="flex-1 px-3.5 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs font-mono font-bold text-white focus:outline-none focus:border-purple-500"
              />
              <button
                type="submit"
                className="px-4 py-2.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-xl transition-all shadow-md cursor-pointer flex items-center gap-1"
              >
                <span className="material-symbols-outlined text-[16px]">send</span>
                Valider
              </button>
            </div>
          </form>

          {/* Preset Barcode Suggestions */}
          <div className="pt-2 space-y-2 border-t border-slate-800">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block">
              Codes-Barres du Catalogue :
            </span>

            <div className="grid grid-cols-1 gap-1.5">
              {catalogSamples.map((art) => {
                const codeToUse = (art.codeBarres && art.codeBarres.length > 0)
                  ? art.codeBarres[0]
                  : art.code || art.id;

                return (
                  <button
                    key={art.id}
                    type="button"
                    onClick={() => handleSimulateSelect(codeToUse)}
                    className="p-2.5 bg-slate-800/80 hover:bg-purple-950/60 border border-slate-700/80 hover:border-purple-500/50 rounded-xl text-left transition-all cursor-pointer flex items-center justify-between group"
                  >
                    <div className="min-w-0 pr-2">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-white group-hover:text-purple-300 truncate">
                          {art.designation}
                        </span>
                        <span className="text-[10px] font-mono text-purple-400 bg-purple-950/80 px-1.5 py-0.5 rounded border border-purple-800/50">
                          {codeToUse}
                        </span>
                      </div>
                      <span className="text-[10px] text-slate-400">
                        Prix: {art.prixVenteHT} DT | Stock: {art.stock}
                      </span>
                    </div>
                    <span className="material-symbols-outlined text-slate-400 group-hover:text-purple-400 text-[18px]">
                      add_shopping_cart
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 bg-slate-950/50 border-t border-slate-800 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs rounded-xl transition-colors cursor-pointer"
          >
            Fermer le Scanner
          </button>
        </div>
      </div>
    </div>
  );
}
