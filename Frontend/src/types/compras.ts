// src/types/compras.ts
// Espejo de ProveedorRequest/Response, CompraRequest/Response y RecibirCompraRequest
import type { UnidadMedida } from './inventario';

export type EstadoCompra = 'PEDIDO' | 'RECIBIDO' | 'CANCELADO';
export type MetodoPagoCompra = 'EFECTIVO' | 'YAPE' | 'PLIN' | 'TARJETA' | 'TRANSFERENCIA' | 'CREDITO';

export const ESTADO_COMPRA_LABEL: Record<EstadoCompra, string> = {
    PEDIDO: 'Pedido (por llegar)',
    RECIBIDO: 'Recibido',
    CANCELADO: 'Cancelado',
};

export const METODO_COMPRA_LABEL: Record<MetodoPagoCompra, string> = {
    EFECTIVO: 'Efectivo',
    YAPE: 'Yape',
    PLIN: 'Plin',
    TARJETA: 'Tarjeta',
    TRANSFERENCIA: 'Transferencia',
    CREDITO: 'A crédito',
};

export interface Proveedor {
    id: number;
    nombre: string;
    ruc: string | null;
    contacto: string | null;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
    activo: boolean;
}

export interface ProveedorRequest {
    nombre: string;
    ruc: string | null;
    contacto: string | null;
    telefono: string | null;
    email: string | null;
    direccion: string | null;
}

export interface CompraItemRequest {
    productoId: number;
    presentacionId: number | null;
    cantidad: number;
    costoUnitario: number;   // costo de UNA presentación (la caja, la botella, el kilo)
}

export interface CompraRequest {
    proveedorId: number;
    items: CompraItemRequest[];
    nota: string | null;
}

export interface RecibirCompraRequest {
    items: CompraItemRequest[] | null;   // null = llegó exactamente lo pedido
    metodoPago: MetodoPagoCompra;
    deCaja: boolean;
    actualizarCostos: boolean;
    nota: string | null;
}

export interface CompraItem {
    productoId: number;
    productoNombre: string;
    unidadMedida: UnidadMedida;
    presentacionId: number | null;
    presentacionNombre: string | null;
    cantidad: number;
    factor: number;
    cantidadBase: number;
    costoUnitario: number;
    subtotal: number;
}

export interface Compra {
    id: number;
    proveedorId: number;
    proveedorNombre: string;
    fechaPedido: string;
    fechaRecepcion: string | null;
    estado: EstadoCompra;
    total: number;
    metodoPago: MetodoPagoCompra | null;
    deCaja: boolean;
    nota: string | null;
    items: CompraItem[];
}
