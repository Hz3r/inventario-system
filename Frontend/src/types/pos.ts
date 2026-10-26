// src/types/pos.ts
// Espejo de los DTOs del POS en el backend (CajaResponse, VentaRequest, VentaResponse, ClienteResponse)
import type { Presentacion, UnidadMedida } from './inventario';

export type MetodoPago = 'EFECTIVO' | 'YAPE' | 'PLIN' | 'TARJETA' | 'TRANSFERENCIA' | 'FIADO';
export type EstadoCaja = 'ABIERTA' | 'CERRADA';
export type EstadoVenta = 'COMPLETADA' | 'ANULADA';

export const METODO_LABEL: Record<MetodoPago, string> = {
    EFECTIVO: 'Efectivo',
    YAPE: 'Yape',
    PLIN: 'Plin',
    TARJETA: 'Tarjeta',
    TRANSFERENCIA: 'Transferencia',
    FIADO: 'Fiado',
};

export interface Caja {
    id: number;
    estado: EstadoCaja;
    abiertaEn: string;
    cerradaEn: string | null;
    montoInicial: number;
    cantidadVentas: number;
    totalVendido: number;
    porMetodo: Partial<Record<MetodoPago, number>>;   // { EFECTIVO: 80, YAPE: 28 }
    abonosEfectivo: number;                           // abonos de fiados cobrados en efectivo
    gastosEfectivo: number;                           // gastos pagados con plata del cajón
    efectivoEsperado: number;
    montoContado: number | null;
    diferencia: number | null;
    nota: string | null;
}

export interface Cliente {
    id: number;
    nombre: string;
    dni: string | null;
    telefono: string | null;
    direccion: string | null;
    limiteCredito: number | null;
    deudaActual: number;
    nota: string | null;
}

export interface ClienteRequest {
    nombre: string;
    dni: string | null;
    telefono: string | null;
    direccion: string | null;
    limiteCredito: number | null;
    nota: string | null;
}

// ---- Lo que el POS envía al cobrar (sin precios: los pone el backend) ----
export interface VentaItemRequest {
    productoId: number;
    presentacionId: number | null;
    cantidad: number;
    descuento: number | null;
}

export interface VentaPagoRequest {
    metodo: MetodoPago;
    monto: number;
    referencia: string | null;
}

export interface VentaRequest {
    items: VentaItemRequest[];
    pagos: VentaPagoRequest[];
    descuento: number | null;
    clienteId: number | null;
    efectivoRecibido: number | null;
    nota: string | null;
}

// ---- Lo que responde el backend (sirve para el ticket) ----
export interface VentaItem {
    productoId: number;
    presentacionId: number | null;
    descripcion: string;
    cantidad: number;
    factor: number;
    cantidadBase: number;
    precioUnitario: number;
    descuento: number;
    subtotal: number;
}

export interface VentaPago {
    metodo: MetodoPago;
    monto: number;
    referencia: string | null;
}

export interface Venta {
    id: number;
    numero: number;
    fecha: string;
    cajaId: number;
    clienteId: number | null;
    clienteNombre: string | null;
    subtotal: number;
    descuento: number;
    total: number;
    efectivoRecibido: number | null;
    vuelto: number | null;
    estado: EstadoVenta;
    motivoAnulacion: string | null;
    nota: string | null;
    items: VentaItem[];
    pagos: VentaPago[];
}

// ---- Solo del frontend: una línea del carrito mientras se arma la venta ----
export interface LineaCarrito {
    key: string;
    productoId: number;
    productoNombre: string;
    unidadMedida: UnidadMedida;
    stockActual: number;
    precioBase: number;                 // precio por unidad base (botella / kg)
    presentaciones: Presentacion[];
    presentacionId: number | null;      // null = unidad base
    presentacionNombre: string | null;
    factor: number;
    precioUnitario: number;             // precio de lo que se vende (botella o caja)
    cantidad: string;                   // texto, para poder escribir "0.75"
    descuento: string;
}
