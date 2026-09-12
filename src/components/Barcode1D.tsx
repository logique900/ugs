import React, { useEffect, useRef, useState } from 'react';
import JsBarcode from 'jsbarcode';
import { Article } from '../types';

interface Barcode1DProps {
  value: string;
  format?: 'CODE128' | 'EAN13' | 'AUTO';
  width?: number;
  height?: number;
  fontSize?: number;
  displayValue?: boolean;
  className?: string;
}

/**
 * Calculates valid EAN-13 string with correct checksum digit
 */
export function generateEAN13(): string {
  const prefix = '200';
  const randomBody = Math.floor(Math.random() * 1000000000).toString().padStart(9, '0');
  const code12 = prefix + randomBody;
  
  let sum = 0;
  for (let i = 0; i < 12; i++) {
    const digit = parseInt(code12[i], 10);
    sum += (i % 2 === 0) ? digit : digit * 3;
  }
  const checksum = (10 - (sum % 10)) % 10;
  return code12 + checksum;
}

/**
 * Generates an alphanumeric Code 128 identifier
 */
export function generateCode128(): string {
  const num = Math.floor(Math.random() * 900000 + 100000);
  return `PRD${num}`;
}

export function Barcode1D({
  value,
  format = 'AUTO',
  width = 2,
  height = 50,
  fontSize = 14,
  displayValue = true,
  className = ''
}: Barcode1DProps) {
  const svgRef = useRef<SVGSVGElement | null>(null);

  useEffect(() => {
    if (!svgRef.current || !value) return;

    const val = value.trim();
    let chosenFormat = format;
    if (chosenFormat === 'AUTO') {
      if (/^\d{12,13}$/.test(val)) {
        chosenFormat = 'EAN13';
      } else {
        chosenFormat = 'CODE128';
      }
    }

    try {
      JsBarcode(svgRef.current, val, {
        format: chosenFormat === 'EAN13' ? 'EAN13' : 'CODE128',
        width,
        height,
        fontSize,
        displayValue,
        textPosition: 'bottom',
        margin: 6,
        background: '#ffffff',
        lineColor: '#000000',
        valid: (valid) => {
          if (!valid && svgRef.current) {
            try {
              JsBarcode(svgRef.current, val, {
                format: 'CODE128',
                width,
                height,
                fontSize,
                displayValue,
                margin: 6,
                background: '#ffffff',
                lineColor: '#000000'
              });
            } catch (e) {
              console.error('JsBarcode CODE128 fallback error:', e);
            }
          }
        }
      });
    } catch (err) {
      try {
        if (svgRef.current) {
          JsBarcode(svgRef.current, val, {
            format: 'CODE128',
            width,
            height,
            fontSize,
            displayValue,
            margin: 6,
            background: '#ffffff',
            lineColor: '#000000'
          });
        }
      } catch (e) {
        console.error('JsBarcode error:', e);
      }
    }
  }, [value, format, width, height, fontSize, displayValue]);

  return <svg ref={svgRef} className={`max-w-full ${className}`} />;
}

interface PrintLabelModalProps {
  article: Article;
  onClose: () => void;
}

export function PrintLabelModal({ article, onClose }: PrintLabelModalProps) {
  const barcodeValue = (article.codeBarres && article.codeBarres.length > 0)
    ? article.codeBarres[0]
    : article.code || article.referenceInterne || `200000${Math.floor(Date.now() / 1000).toString().slice(-7)}`;

  const [quantity, setQuantity] = useState(1);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/70 backdrop-blur-xs print:p-0 print:bg-white print:static">
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xl w-full max-w-lg overflow-hidden print:shadow-none print:border-none print:w-auto">
        {/* Header */}
        <div className="p-4 bg-slate-900 text-white flex items-center justify-between print:hidden">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-purple-400">barcode</span>
            <h3 className="font-bold text-sm">Impression Étiquette Code-Barres</h3>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-white cursor-pointer">
            <span className="material-symbols-outlined text-[20px]">close</span>
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6">
          {/* Label Preview Box */}
          <div className="border-2 border-dashed border-slate-300 rounded-xl p-4 bg-slate-50 flex flex-col items-center justify-center text-center space-y-2 print:border-solid print:border-slate-900 print:bg-white">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
              ÉTIQUETTE PRODUIT 1D
            </span>
            <h4 className="text-sm font-bold text-slate-900 max-w-xs truncate">
              {article.designation}
            </h4>
            <div className="flex items-center justify-center gap-3 text-xs font-bold text-slate-600">
              <span>Réf: {article.code}</span>
              <span>•</span>
              <span className="text-purple-700 font-bold">{article.prixVenteHT.toFixed(3)} DT HT</span>
            </div>

            {/* Rendered 1D Barcode Image */}
            <div className="bg-white p-3 rounded-lg border border-slate-200 inline-block my-2">
              <Barcode1D
                value={barcodeValue}
                width={2}
                height={60}
                fontSize={14}
              />
            </div>
            
            <p className="text-[10px] text-slate-500 font-semibold">
              Format Code 128 / EAN-13 imprimable avec valeur textuelle sous les barres
            </p>
          </div>

          <div className="grid grid-cols-2 gap-4 print:hidden">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Nombre d'exemplaires :
              </label>
              <input
                type="number"
                min="1"
                max="100"
                value={quantity}
                onChange={(e) => setQuantity(Math.max(1, parseInt(e.target.value) || 1))}
                className="w-full px-3 py-2 border border-slate-200 rounded-xl text-sm font-bold"
              />
            </div>
            <div className="flex flex-col justify-end">
              <span className="text-[11px] text-slate-500 font-medium">
                S'imprime directement sur étiquettes thermiques ou papier A4 standard.
              </span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 bg-slate-50 border-t border-slate-100 flex items-center justify-between print:hidden">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-200 rounded-xl transition-colors cursor-pointer"
          >
            Fermer
          </button>
          <button
            onClick={handlePrint}
            className="px-5 py-2 bg-purple-600 hover:bg-purple-700 text-white font-bold text-xs rounded-xl shadow-md flex items-center gap-2 cursor-pointer transition-all"
          >
            <span className="material-symbols-outlined text-[18px]">print</span>
            Imprimer l'étiquette ({quantity})
          </button>
        </div>
      </div>
    </div>
  );
}
