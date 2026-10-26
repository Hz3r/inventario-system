// src/utils/formato.ts

/** 7 -> "S/ 7.00"   |   null -> "—" */
export const formatSoles = (n: number | null | undefined): string =>
    n === null || n === undefined ? '—' : `S/ ${n.toFixed(2)}`;

/** 24 -> "24"   |   0.75 -> "0.75"   |   1.5 -> "1.5" */
export const formatCantidad = (n: number): string =>
    Number.isInteger(n) ? String(n) : n.toFixed(3).replace(/0+$/, '').replace(/\.$/, '');

/** "2026-10-25T20:15:03" -> "25/10/2026 20:15" */
export const formatFechaHora = (iso: string): string => {
    const d = new Date(iso);
    return d.toLocaleString('es-PE', {
        day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: false,
    });
};
/** Fecha local "2026-10-26" (toISOString usaría UTC: después de las 7 p.m. daría el día siguiente) */
export const fechaISO = (d: Date): string =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
