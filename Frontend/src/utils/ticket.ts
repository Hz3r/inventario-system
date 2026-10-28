// src/utils/ticket.ts
// Arma la NOTA DE VENTA (80 o 58 mm, según Configuraciones) con el formato de una boleta:
// emisor, cliente, detalle, base + IGV, forma de pago y cajero.
//
// Es un documento INTERNO: no se envía a SUNAT, por eso no dice "Boleta electrónica".
// Cuando se conecte la facturación electrónica, este mismo formato llevará la serie,
// el código QR y el hash que devuelva SUNAT.
import { METODO_LABEL, type Venta } from '../types/pos';
import { tienda } from '../config/tienda';
import type { PerfilTienda } from '../types/configuracion';
import { formatCantidad } from './formato';

/** Evita que un nombre con < o & rompa el HTML */
export const esc = (s: string) =>
    s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c] as string));

const s2 = (n: number) => n.toFixed(2);

/** Fila de dos columnas: texto a la izquierda, monto a la derecha */
const fila = (izq: string, der: string, clase = '') =>
    `<div class="fila ${clase}"><span>${izq}</span><span>${der}</span></div>`;

const fecha = (iso: string) => {
    const d = new Date(iso);
    const p = (n: number) => String(n).padStart(2, '0');
    return {
        dia: `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`,
        hora: `${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`,
    };
};

/**
 * @param t datos de la bodega. Por defecto los guardados; Configuraciones pasa
 *          el borrador para mostrar la vista previa mientras se escribe.
 */
export function htmlTicket(v: Venta, t: PerfilTienda = tienda()): string {
    const angosto = t.anchoTicket === 58;
    const desglosa = t.desglosaIgv !== false;
    const hayExonerados = v.items.some((it) => it.afectoIgv === false);
    const { dia, hora } = fecha(v.fecha);

    // Unidades enteras se cuentan una por una; lo que se pesa cuenta como 1 artículo
    const articulos = v.items.reduce((s, it) => s + (Number.isInteger(it.cantidad) ? it.cantidad : 1), 0);

    const lineas = v.items.map((it) => `
        <div class="item">
            <div>${esc(it.descripcion)}${desglosa && it.afectoIgv === false ? ' (E)' : ''}</div>
            <div class="det">
                <span>${formatCantidad(it.cantidad)} x ${s2(it.precioUnitario)}</span>
                <span>${it.descuento > 0 ? `-${s2(it.descuento)}` : ''}</span>
                <span>${s2(it.subtotal)}</span>
            </div>
        </div>`).join('');

    const pagos = v.pagos.map((p) =>
        fila(`${METODO_LABEL[p.metodo]}${p.referencia ? ` (${esc(p.referencia)})` : ''}`, `S/ ${s2(p.monto)}`)).join('');

    const fiado = v.pagos.find((p) => p.metodo === 'FIADO');
    const emisor = t.razonSocial?.trim() || t.nombre;

    return `<!doctype html>
<html><head><meta charset="utf-8"><title>Nota de venta ${v.numero}</title>
<style>
    @page { size: ${t.anchoTicket}mm auto; margin: 0; }
    * { box-sizing: border-box; }
    body { width: ${angosto ? 48 : 72}mm; margin: 0 auto; padding: 3mm 0 6mm; color: #000;
           font-family: 'Courier New', monospace; font-size: ${angosto ? 10.5 : 12}px; line-height: 1.3; }
    .logo { display: block; margin: 0 auto 4px; max-width: 60%; max-height: 25mm; filter: grayscale(1); }
    .centro { text-align: center; }
    .grande { font-size: ${angosto ? 13 : 15}px; font-weight: bold; }
    .negrita { font-weight: bold; }
    .fila { display: flex; justify-content: space-between; gap: 4px; }
    .fila span:first-child { overflow-wrap: anywhere; }
    .fila span:last-child { white-space: nowrap; }
    .det, .cab { display: grid; grid-template-columns: 1fr auto ${angosto ? '14mm' : '17mm'}; gap: 4px; }
    .det span:nth-child(2), .det span:nth-child(3), .cab span:nth-child(2), .cab span:nth-child(3) { text-align: right; }
    .cab { font-weight: bold; border-bottom: 1px solid #000; padding-bottom: 2px; margin-bottom: 3px; }
    .item { margin-bottom: 3px; }
    .total { font-size: ${angosto ? 13 : 15}px; font-weight: bold; }
    .pequeno { font-size: ${angosto ? 9 : 10}px; }
    hr { border: 0; border-top: 1px dashed #000; margin: 5px 0; }
    .anulada { border: 2px solid #000; padding: 4px; margin: 6px 0; font-size: 15px; font-weight: bold; text-align: center; }
</style></head>
<body>
    <div class="centro">
        ${t.logo ? `<img class="logo" src="${t.logo}" alt="">` : ''}
        <div class="grande">${esc(emisor)}</div>
        ${t.razonSocial?.trim() && t.nombre && t.nombre !== t.razonSocial ? `<div>${esc(t.nombre)}</div>` : ''}
        ${t.ruc ? `<div>R.U.C. ${esc(t.ruc)}</div>` : ''}
        ${t.direccion ? `<div>${esc(t.direccion)}</div>` : ''}
        ${t.telefono ? `<div>Tel: ${esc(t.telefono)}</div>` : ''}
    </div>
    <hr>
    <div class="centro negrita">NOTA DE VENTA</div>
    <div class="centro negrita">N° ${String(v.numero).padStart(8, '0')}</div>
    <hr>
    ${fila(`FECHA: ${dia}`, `HORA: ${hora}`)}
    <div>CLIENTE: ${v.clienteNombre ? esc(v.clienteNombre) : 'CONSUMIDOR FINAL'}</div>
    ${v.clienteDocumento ? `<div>DNI: ${esc(v.clienteDocumento)}</div>` : ''}
    ${v.estado === 'ANULADA' ? `<div class="anulada">*** VENTA ANULADA ***</div>` : ''}
    <hr>
    <div class="cab"><span>Cant x P.Unit</span><span>Dcto</span><span>Total</span></div>
    ${lineas}
    <hr>
    ${v.descuento > 0 ? fila('SUBTOTAL', `S/ ${s2(v.subtotal)}`) + fila('DESCUENTO', `-S/ ${s2(v.descuento)}`) : ''}
    ${desglosa ? fila('OP. GRAVADA', `S/ ${s2(v.opGravada)}`) : ''}
    ${desglosa && v.opExonerada > 0 ? fila('OP. EXONERADA', `S/ ${s2(v.opExonerada)}`) : ''}
    ${desglosa ? fila('IGV (18%)', `S/ ${s2(v.igv)}`) : ''}
    ${fila('TOTAL', `S/ ${s2(v.total)}`, 'total')}
    <hr>
    ${fila('Cantidad de artículos:', String(articulos))}
    ${v.cajero ? `<div>Cajero(a): ${esc(v.cajero)}</div>` : ''}
    <hr>
    ${fila('<b>Forma de pago</b>', '<b>Importe</b>')}
    ${pagos}
    ${v.efectivoRecibido !== null ? fila('Recibido', `S/ ${s2(v.efectivoRecibido)}`) : ''}
    ${v.vuelto !== null ? fila('VUELTO', `S/ ${s2(v.vuelto)}`, 'negrita') : ''}
    ${fiado && v.clienteNombre ? `<hr><div>Queda a cuenta de ${esc(v.clienteNombre)}: S/ ${s2(fiado.monto)}</div>` : ''}
    <hr>
    ${t.mensajeTicket ? `<div class="centro">${esc(t.mensajeTicket)}</div>` : ''}
    ${desglosa && hayExonerados ? `<div class="centro pequeno">(E) Producto exonerado / inafecto al IGV</div>` : ''}
    <div class="centro pequeno" style="margin-top:4px">Documento interno sin valor tributario.<br>Solicite su comprobante de pago.</div>
</body></html>`;
}

/**
 * Imprime una página HTML usando un iframe invisible: así no hereda los estilos del sistema
 * y la pantalla no cambia. Lo usan el ticket y el kardex.
 */
export function imprimirHtml(html: string): void {
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
    iframe.srcdoc = html;
    document.body.appendChild(iframe);
}

export function imprimirTicket(v: Venta, t: PerfilTienda = tienda()): void {
    imprimirHtml(htmlTicket(v, t));
}
