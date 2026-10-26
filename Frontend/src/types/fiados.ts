// src/types/fiados.ts
// Espejo de DeudaClienteResponse, FiadoResponse, AbonoResponse y CuentaClienteResponse
import type { Cliente, MetodoPago, VentaItem } from './pos';

export type EstadoFiado = 'PENDIENTE' | 'PARCIAL' | 'PAGADO' | 'ANULADO';

export const ESTADO_FIADO_LABEL: Record<EstadoFiado, string> = {
    PENDIENTE: 'Pendiente',
    PARCIAL: 'Abonado en parte',
    PAGADO: 'Pagado',
    ANULADO: 'Anulado',
};

/** Una fila de la lista: quién debe y cuánto */
export interface DeudaCliente {
    clienteId: number;
    nombre: string;
    telefono: string | null;
    limiteCredito: number | null;
    totalFiado: number;
    abonado: number;
    deuda: number;
    fiadosPendientes: number;
    deudaDesde: string;
}

export interface FiadoDetalle {
    id: number;
    fecha: string;
    ventaId: number | null;
    ventaNumero: number | null;
    montoTotal: number;
    saldo: number;
    estado: EstadoFiado;
    nota: string | null;
    items: VentaItem[];
}

export interface AbonoDetalle {
    id: number;
    fecha: string;
    monto: number;
    metodo: MetodoPago;
    referencia: string | null;
    fiadoId: number;
    ventaNumero: number | null;
}

export interface CuentaCliente {
    cliente: Cliente;
    fiados: FiadoDetalle[];
    abonos: AbonoDetalle[];
}
