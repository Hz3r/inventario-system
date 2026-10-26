// src/services/posService.ts
import { api } from './api';
import type { Caja, Cliente, ClienteRequest, Venta, VentaRequest } from '../types/pos';

export const posService = {
    // ---- Caja ----
    /** null si no hay caja abierta (el backend responde 204) */
    cajaActual: async (): Promise<Caja | null> =>
        (await api.get<Caja | undefined>('/api/pos/caja/actual')) ?? null,

    abrirCaja: (montoInicial: number, nota: string | null) =>
        api.post<Caja>('/api/pos/caja/abrir', { montoInicial, nota }),

    cerrarCaja: (montoContado: number, nota: string | null) =>
        api.post<Caja>('/api/pos/caja/cerrar', { montoContado, nota }),

    historialCajas: () => api.get<Caja[]>('/api/pos/caja/historial'),

    // ---- Ventas ----
    registrarVenta: (data: VentaRequest) => api.post<Venta>('/api/pos/ventas', data),

    obtenerVenta: (id: number) => api.get<Venta>(`/api/pos/ventas/${id}`),

    ventasDeCaja: (cajaId: number) => api.get<Venta[]>(`/api/pos/ventas/caja/${cajaId}`),

    anularVenta: (id: number, motivo: string) =>
        api.post<Venta>(`/api/pos/ventas/${id}/anular`, { motivo }),

    // ---- Clientes ----
    listarClientes: (buscar?: string) =>
        api.get<Cliente[]>(`/api/clientes${buscar ? `?buscar=${encodeURIComponent(buscar)}` : ''}`),

    crearCliente: (data: ClienteRequest) => api.post<Cliente>('/api/clientes', data),
};
