// src/types/inventario.ts
// Espejo de los DTOs del backend (ProductoResponse, ProductRequest, etc.)

export type UnidadMedida = 'UND' | 'KG' | 'LT';
export type EstadoStock = 'EN_STOCK' | 'BAJO_STOCK' | 'SIN_STOCK';
export type MotivoMovimiento =
    | 'INICIAL' | 'VENTA' | 'ANULACION_VENTA' | 'COMPRA'
    | 'AJUSTE_ENTRADA' | 'AJUSTE_SALIDA' | 'MERMA' | 'DEVOLUCION';
export type MotivoAjuste = 'AJUSTE_ENTRADA' | 'AJUSTE_SALIDA' | 'MERMA';

export interface Categoria {
    id: number;
    nombre: string;
}

export interface Presentacion {
    id: number;
    nombre: string;
    factor: number;
    precioVenta: number;
    codigoBarras: string | null;
}

export interface Producto {
    id: number;
    nombre: string;
    codigoBarras: string | null;
    categoriaId: number | null;
    categoriaNombre: string | null;
    proveedorId: number | null;
    proveedorNombre: string | null;
    precioCosto: number | null;
    precioVenta: number;
    stockActual: number;
    stockMinimo: number | null;
    unidadMedida: UnidadMedida;
    estadoStock: EstadoStock;
    vencimiento: string | null;   // "2027-01-31"
    imagenURL: string | null;
    igv: boolean | null;
    activo: boolean;
    presentaciones: Presentacion[];
}

export interface ProductoRequest {
    nombre: string;
    codigoBarras: string | null;
    precioCosto: number | null;
    precioVenta: number;
    stockInicial: number | null;  // solo se usa al crear
    unidadMedida: UnidadMedida;
    igv: boolean;
    stockMinimo: number | null;
    vencimiento: string | null;
    imagenURL: string | null;
    categoriaId: number | null;
    proveedorId: number | null;
}

export interface PresentacionRequest {
    nombre: string;
    factor: number;
    precioVenta: number;
    codigoBarras: string | null;
}

export interface AjusteStockRequest {
    motivo: MotivoAjuste;
    cantidad: number;
    nota: string | null;
}

export interface Movimiento {
    id: number;
    fecha: string;                // "2026-10-25T20:15:03"
    productoId: number;
    productoNombre: string;
    unidadMedida: UnidadMedida;
    motivo: MotivoMovimiento;
    cantidad: number;             // con signo: +24, -2
    stockAnterior: number;
    stockResultante: number;
    costoUnitario: number | null;
    ventaId: number | null;
    compraId: number | null;
    nota: string | null;
}

export interface Escaneo {
    productoId: number;
    productoNombre: string;
    presentacionId: number | null;
    presentacionNombre: string;
    factor: number;
    precioVenta: number;
    unidadMedida: UnidadMedida;
    stockActual: number;
}

// ---- Textos para mostrar en pantalla ----

export const UNIDAD_LABEL: Record<UnidadMedida, string> = {
    UND: 'Unidad',
    KG: 'Kilogramo',
    LT: 'Litro',
};

export const UNIDAD_CORTA: Record<UnidadMedida, string> = {
    UND: 'und',
    KG: 'kg',
    LT: 'lt',
};

export const ESTADO_LABEL: Record<EstadoStock, string> = {
    EN_STOCK: 'En Stock',
    BAJO_STOCK: 'Bajo Stock',
    SIN_STOCK: 'Sin Stock',
};

export const MOTIVO_LABEL: Record<MotivoMovimiento, string> = {
    INICIAL: 'Stock inicial',
    VENTA: 'Venta',
    ANULACION_VENTA: 'Venta anulada',
    COMPRA: 'Compra',
    AJUSTE_ENTRADA: 'Ajuste (+)',
    AJUSTE_SALIDA: 'Ajuste (−)',
    MERMA: 'Merma',
    DEVOLUCION: 'Devolución',
};