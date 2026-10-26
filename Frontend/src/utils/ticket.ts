// src/utils/ticket.ts
// Arma el ticket (80 o 58 mm, según Configuraciones) como una página HTML y la manda a imprimir.
// Funciona con cualquier térmica instalada en Windows (o con "Microsoft Print to PDF" para probar).
import { METODO_LABEL, type Venta } from '../types/pos';
import { tienda } from '../config/tienda';
import type { PerfilTienda } from '../types/configuracion';
import { formatCantidad, formatFechaHora } from './formato';

/** Evita que un nombre con < o & rompa el HTML */
const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const s2 = (n: number) => n.toFixed(2);

/** Fila de dos columnas: texto a la izquierda, monto a la derecha */
const fila = (izq: string, der: string, clase = '') =>
    `<div class="fila ${clase}"><span>${izq}</span><span>${der}</span></div>`;

/**
 * @param t datos de la bodega. Por defecto los guardados; Configuraciones pasa
 *          el borrador para mostrar la vista previa mientras se escribe.
 */
export function htmlTicket(v: Venta, t: PerfilTienda = tienda()): string {
    const angosto = t.anchoTicket === 58;

    const lineas = v.items.map((it) => `
        <div class="item">
            <div>${esc(it.descripcion)}</div>
            ${fila(`&nbsp;&nbsp;${formatCantidad(it.cantidad)} x ${s2(it.precioUnitario)}`, s2(it.subtotal + it.descuento))}
            ${it.descuento > 0 ? fila('&nbsp;&nbsp;Descuento', `-${s2(it.descuento)}`) : ''}
        </div>`).join('');

    const pagos = v.pagos.map((p) =>
        fila(`${METODO_LABEL[p.metodo]}${p.referencia ? ` (${esc(p.referencia)})` : ''}`, s2(p.monto))).join('');

    const fiado = v.pagos.find((p) => p.metodo === 'FIADO');

    return `<!doctype html>
<html><head><meta charset="utf-8"><title>Ticket ${v.numero}</title>
<style>
    @page { size: ${t.anchoTicket}mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body { width: ${angosto ? 48 : 72}mm; margin: 0 auto; padding: 3mm 0 6mm; color: #000;
           font-family: 'Courier New', monospace; font-size: ${angosto ? 11 : 12}px; line-height: 1.35; }
    .logo { display: block; margin: 0 auto 4px; max-width: 60%; max-height: 25mm; filter: grayscale(1); }
    .centro { text-align: center; }
    .grande { font-size: 16px; font-weight: bold; }
    .negrita { font-weight: bold; }
    .fila { display: flex; justify-content: space-between; gap: 4px; }
    .fila span:first-child { overflow-wrap: anywhere; }
    .fila span:last-child { white-space: nowrap; }
    .total { font-size: 15px; font-weight: bold; }
    .item { margin-bottom: 2px; }
    hr { border: 0; border-top: 1px dashed #000; margin: 6px 0; }
    .anulada { border: 2px solid #000; padding: 4px; margin: 6px 0; font-size: 16px; font-weight: bold; text-align: center; }
</style></head>
<body>
    <div class="centro">
        ${t.logo ? `<img class="logo" src="${t.logo}" alt="">` : ''}
        <div class="grande">${esc(t.nombre)}</div>
        ${t.ruc ? `<div>RUC: ${esc(t.ruc)}</div>` : ''}
        ${t.direccion ? `<div>${esc(t.direccion)}</div>` : ''}
        ${t.telefono ? `<div>Tel: ${esc(t.telefono)}</div>` : ''}
    </div>
    <hr>
    <div class="negrita">TICKET N° ${String(v.numero).padStart(6, '0')}</div>
    <div>Fecha: ${formatFechaHora(v.fecha)}</div>
    ${v.clienteNombre ? `<div>Cliente: ${esc(v.clienteNombre)}</div>` : ''}
    ${v.estado === 'ANULADA' ? `<div class="anulada">*** VENTA ANULADA ***</div>` : ''}
    <hr>
    ${lineas}
    <hr>
    ${v.descuento > 0 ? fila('SUBTOTAL', s2(v.subtotal)) + fila('DESCUENTO', `-${s2(v.descuento)}`) : ''}
    ${fila('TOTAL S/', s2(v.total), 'total')}
    <hr>
    ${pagos}
    ${v.efectivoRecibido !== null ? fila('Recibido', s2(v.efectivoRecibido)) : ''}
    ${v.vuelto !== null && v.vuelto > 0 ? fila('Vuelto', s2(v.vuelto), 'negrita') : ''}
    ${fiado && v.clienteNombre ? `<hr><div>Queda a cuenta de ${esc(v.clienteNombre)}: S/ ${s2(fiado.monto)}</div>` : ''}
    <hr>
    ${t.mensajeTicket ? `<div class="centro">${esc(t.mensajeTicket)}</div>` : ''}
    <div class="centro" style="font-size:10px;margin-top:4px">Ticket sin valor tributario</div>
</body></html>`;
}

/**
 * Imprime usando un iframe invisible: así el ticket no hereda los estilos del sistema
 * y la pantalla del POS no cambia.
 */
export function imprimirTicket(v: Venta, t: PerfilTienda = tienda()): void {
    const iframe = document.createElement('iframe');
    Object.assign(iframe.style, { position: 'fixed', right: '0', bottom: '0', width: '0', height: '0', border: '0' });
    iframe.onload = () => {
        const win = iframe.contentWindow;
        if (!win) return;
        win.focus();
        win.print();
        // se quita un rato después, cuando el diálogo de impresión ya tomó el documento
        setTimeout(() => iframe.remove(), 60_000);
    };
    iframe.srcdoc = htmlTicket(v, t);
    document.body.appendChild(iframe);
}
