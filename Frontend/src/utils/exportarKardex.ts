// src/utils/exportarKardex.ts
// Kardex para imprimir (A4 horizontal, o "Guardar como PDF") y para Excel (CSV).
import { MOTIVO_LABEL, UNIDAD_CORTA, type Movimiento } from '../types/inventario';
import { tienda } from '../config/tienda';
import { formatCantidad, formatFechaHora } from './formato';
import { esc, imprimirHtml } from './ticket';

export interface InfoKardex {
    titulo: string;        // "Del 01/10/2026 al 27/10/2026" o "Producto: Agua San Luis"
    archivo: string;       // nombre del archivo sin extensión
}

const n2 = (n: number | null) => (n === null ? '' : n.toFixed(2));

/** Descarga un CSV que se abre directo en Excel (con ; y BOM para que respete tildes y decimales) */
export function exportarKardexCsv(movs: Movimiento[], info: InfoKardex): void {
    const filas: (string | number)[][] = [
        ['KARDEX DE INVENTARIO', info.titulo],
        [],
        ['Fecha', 'Producto', 'Motivo', 'Unidad', 'Entrada', 'Salida', 'Stock anterior', 'Stock final', 'Costo unit.', 'Costo total', 'Nota'],
        ...movs.map((m) => [
            formatFechaHora(m.fecha),
            m.productoNombre,
            MOTIVO_LABEL[m.motivo],
            UNIDAD_CORTA[m.unidadMedida],
            m.cantidad > 0 ? m.cantidad : '',
            m.cantidad < 0 ? -m.cantidad : '',
            m.stockAnterior,
            m.stockResultante,
            m.costoUnitario ?? '',
            m.costoUnitario !== null ? Math.round(Math.abs(m.cantidad) * m.costoUnitario * 100) / 100 : '',
            m.nota ?? '',
        ]),
    ];
    // Excel en español usa coma decimal
    const celda = (c: string | number) => `"${String(typeof c === 'number' ? String(c).replace('.', ',') : c).replace(/"/g, '""')}"`;
    const csv = '﻿' + filas.map((f) => f.map(celda).join(';')).join('\r\n');
    const url = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
    const a = document.createElement('a');
    a.href = url;
    a.download = `${info.archivo}.csv`;
    a.click();
    URL.revokeObjectURL(url);
}

/** Abre el cuadro de impresión con el kardex en una hoja A4 horizontal */
export function imprimirKardex(movs: Movimiento[], info: InfoKardex): void {
    const t = tienda();
    const entradas = movs.filter((m) => m.cantidad > 0).length;
    const filas = movs.map((m) => `
        <tr>
            <td>${formatFechaHora(m.fecha)}</td>
            <td>${esc(m.productoNombre)}</td>
            <td>${MOTIVO_LABEL[m.motivo]}</td>
            <td class="num">${m.cantidad > 0 ? formatCantidad(m.cantidad) : ''}</td>
            <td class="num">${m.cantidad < 0 ? formatCantidad(-m.cantidad) : ''}</td>
            <td class="num">${formatCantidad(m.stockAnterior)}</td>
            <td class="num"><b>${formatCantidad(m.stockResultante)}</b> ${UNIDAD_CORTA[m.unidadMedida]}</td>
            <td class="num">${n2(m.costoUnitario)}</td>
            <td>${m.nota ? esc(m.nota) : ''}</td>
        </tr>`).join('');

    imprimirHtml(`<!doctype html>
<html><head><meta charset="utf-8"><title>${esc(info.archivo)}</title>
<style>
    @page { size: A4 landscape; margin: 12mm; }
    body { font-family: Arial, sans-serif; font-size: 10.5px; color: #000; margin: 0; }
    .cab { display: flex; justify-content: space-between; align-items: flex-end; border-bottom: 2px solid #000; padding-bottom: 6px; margin-bottom: 8px; }
    h1 { font-size: 16px; margin: 0; }
    table { width: 100%; border-collapse: collapse; }
    th { background: #eee; text-align: left; border: 1px solid #999; padding: 4px; font-size: 10px; }
    td { border: 1px solid #ccc; padding: 3px 4px; vertical-align: top; }
    .num { text-align: right; white-space: nowrap; }
    tr { page-break-inside: avoid; }
    thead { display: table-header-group; }   /* repite el encabezado en cada hoja */
    .pie { margin-top: 8px; display: flex; justify-content: space-between; font-size: 10px; color: #444; }
</style></head>
<body>
    <div class="cab">
        <div>
            <h1>KARDEX DE INVENTARIO</h1>
            <div>${esc(info.titulo)}</div>
        </div>
        <div style="text-align:right">
            <b>${esc(t.razonSocial?.trim() || t.nombre)}</b>
            ${t.ruc ? `<div>RUC ${esc(t.ruc)}</div>` : ''}
            ${t.direccion ? `<div>${esc(t.direccion)}</div>` : ''}
        </div>
    </div>
    <table>
        <thead><tr>
            <th>Fecha y hora</th><th>Producto</th><th>Motivo</th>
            <th class="num">Entrada</th><th class="num">Salida</th>
            <th class="num">Stock ant.</th><th class="num">Stock final</th>
            <th class="num">Costo unit.</th><th>Nota</th>
        </tr></thead>
        <tbody>${filas || '<tr><td colspan="9" style="text-align:center;padding:20px">Sin movimientos</td></tr>'}</tbody>
    </table>
    <div class="pie">
        <span>${movs.length} movimientos · ${entradas} entradas · ${movs.length - entradas} salidas</span>
        <span>Impreso el ${formatFechaHora(new Date().toISOString())}</span>
    </div>
</body></html>`);
}
