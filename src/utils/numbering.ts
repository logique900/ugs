/**
 * Commercial Document Reference Numbering Utility
 * Formats:
 * - Factures: FAC-YYYY-00001
 * - Devis: DEV-YYYY-00001
 * - Bons de Livraison: BL-YYYY-00001
 * - Bons de Sortie: BS-YYYY-00001
 * - Transferts: TR-YYYY-00001
 * - Bons d'Achat: BA-YYYY-00001
 * - Achats / Factures Fournisseur: ACH-YYYY-00001
 * - Règlements Encaissements: ENC-YYYY-00001
 * - Règlements Décaissements: DEC-YYYY-00001
 *
 * Sequence resets to 00001 for each new calendar year.
 */

export function generateNextDocNumber(
  prefix: string,
  existingDocNumbers: string[],
  docDate?: string | Date
): string {
  const dateObj = docDate ? new Date(docDate) : new Date();
  const year = isNaN(dateObj.getFullYear()) ? new Date().getFullYear() : dateObj.getFullYear();
  const yearStr = year.toString();

  const yearPrefix = `${prefix}-${yearStr}-`;

  let maxSeq = 0;

  for (const num of existingDocNumbers) {
    if (!num || typeof num !== 'string') continue;
    
    // Direct match prefix-YYYY-XXXXX
    if (num.startsWith(yearPrefix)) {
      const seqStr = num.slice(yearPrefix.length);
      const seq = parseInt(seqStr, 10);
      if (!isNaN(seq) && seq > maxSeq) {
        maxSeq = seq;
      }
    } else if (num.includes(yearStr)) {
      // Handles formats like FAC-HIST-2026-001 or FAC-2026-001
      const parts = num.split('-');
      for (let i = 0; i < parts.length - 1; i++) {
        if (parts[i] === yearStr) {
          const possibleSeq = parseInt(parts[i + 1], 10);
          if (!isNaN(possibleSeq) && possibleSeq > maxSeq) {
            maxSeq = possibleSeq;
          }
        }
      }
    }
  }

  const nextSeq = maxSeq + 1;
  const paddedSeq = nextSeq.toString().padStart(5, '0');
  return `${prefix}-${yearStr}-${paddedSeq}`;
}

/**
 * Format string if raw integer sequence is passed
 */
export function formatDocNumber(prefix: string, year: number | string, seq: number): string {
  const y = typeof year === 'number' ? year : parseInt(year, 10) || new Date().getFullYear();
  return `${prefix}-${y}-${seq.toString().padStart(5, '0')}`;
}
