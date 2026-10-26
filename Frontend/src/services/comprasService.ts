// src/services/comprasService.ts
import { api } from './api';
import type { Compra, CompraRequest, Proveedor, ProveedorRequest, RecibirCompraRequest } from '../types/compras';

export const comprasService = {
    // ---- Proveedores ----
    listarProveedores: () => api.get<Proveedor[]>('/api/proveedores'),
    crearProveedor: (data: ProveedorRequest) => api.post<Proveedor>('/api/proveedores', data),
    actualizarProveedor: (id: number, data: ProveedorRequest) => api.put<Proveedor>(`/api/proveedores/${id}`, data),
    desactivarProveedor: (id: number) => api.delete(`/api/proveedores/${id}`),

    // ---- Compras ----
    listarCompras: () => api.get<Compra[]>('/api/compras'),
    obtenerCompra: (id: number) => api.get<Compra>(`/api/compras/${id}`),
    crearCompra: (data: CompraRequest) => api.post<Compra>('/api/compras', data),
    recibirCompra: (id: number, data: RecibirCompraRequest) => api.post<Compra>(`/api/compras/${id}/recibir`, data),
    cancelarCompra: (id: number) => api.post<Compra>(`/api/compras/${id}/cancelar`),
};
