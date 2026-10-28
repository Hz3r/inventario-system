// src/utils/igv.ts
// IGV del Perú: 18 %. Los precios de la bodega YA incluyen el IGV;
// aquí se separa solo la base y el impuesto (igual que en el backend, util/Igv.java).
//   11.80 con IGV  →  base 10.00  +  IGV 1.80
import { centavos } from './dinero';

export const TASA_IGV = 0.18;

export interface Desglose {
    base: number;   // sin IGV
    igv: number;
}

export function desglosarIgv(conIgv: number, afecto = true): Desglose {
    const totalCent = centavos(conIgv);
    if (!afecto) return { base: totalCent / 100, igv: 0 };
    const baseCent = Math.round(totalCent / (1 + TASA_IGV));
    return { base: baseCent / 100, igv: (totalCent - baseCent) / 100 };
}
