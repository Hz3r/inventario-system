// src/types/ganancia.ts
// Espejo de GastoRequest, GastoResponse y GananciaResponse
import type { MetodoPago } from './pos';

export type CategoriaGasto = 'SERVICIOS' | 'ALQUILER' | 'TRANSPORTE' | 'SUELDOS' | 'IMPUESTOS' | 'MANTENIMIENTO' | 'OTROS';

export const CATEGORIA_GASTO_LABEL: Record<CategoriaGasto, string> = {
    SERVICIOS: 'Servicios (luz, agua, internet)',
    ALQUILER: 'Alquiler',
    TRANSPORTE: 'Transporte y fletes',
    SUELDOS: 'Personal (sueldos, adelantos)',
    IMPUESTOS: 'Impuestos y trámites',
    MANTENIMIENTO: 'Mantenimiento, limpieza e insumos',
    OTROS: 'Otros gastos',
};

export interface GastoRequest {
    categoria: CategoriaGasto;
    descripcion: string | null;
    monto: number;
    metodoPago: MetodoPago;
    fecha: string | null;   // "2026-10-20"; null = hoy
    deCaja: boolean;
}

export interface Gasto {
    id: number;
    fecha: string;
    categoria: CategoriaGasto;
    descripcion: string | null;
    monto: number;
    metodoPago: MetodoPago;
    deCaja: boolean;
}

export interface GananciaDia {
    fecha: string;
    ventas: number;
    costo: number;
    gastos: number;
    ganancia: number;
}

export interface ProductoRentable {
    productoId: number;
    nombre: string;
    cantidad: number;
    ventas: number;
    costo: number;
    ganancia: number;
}

export interface ProductoQuieto {
    productoId: number;
    nombre: string;
    stock: number;
    valorEnStock: number;
}

export interface Ganancia {
    desde: string;
    hasta: string;
    cantidadVentas: number;
    ventas: number;
    costoVendido: number;
    gananciaBruta: number;
    margen: number;
    gastos: number;
    gananciaNeta: number;
    gastosPorCategoria: Partial<Record<CategoriaGasto, number>>;
    porDia: GananciaDia[];
    topProductos: ProductoRentable[];
    sinMovimiento: ProductoQuieto[];
    productosSinCosto: number;
}
