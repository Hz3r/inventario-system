// src/services/inventarioService.ts
import { api } from './api';
import type {
    AjusteStockRequest, Categoria, Escaneo, Movimiento, Presentacion,
    PresentacionRequest, Producto, ProductoRequest,
} from '../types/inventario';

const BASE = '/api/inventory';

export const inventarioService = {
    // ---- Productos ----
    listarProductos: (buscar?: string) =>
        api.get<Producto[]>(`${BASE}/productos${buscar ? `?buscar=${encodeURIComponent(buscar)}` : ''}`),

    stockBajo: () => api.get<Producto[]>(`${BASE}/productos/stock-bajo`),

    obtenerProducto: (id: number) => api.get<Producto>(`${BASE}/productos/${id}`),

    escanear: (codigo: string) =>
        api.get<Escaneo>(`${BASE}/productos/escanear?codigo=${encodeURIComponent(codigo)}`),

    crearProducto: (data: ProductoRequest) => api.post<Producto>(`${BASE}/productos`, data),

    actualizarProducto: (id: number, data: ProductoRequest) =>
        api.put<Producto>(`${BASE}/productos/${id}`, data),

    desactivarProducto: (id: number) => api.delete(`${BASE}/productos/${id}`),

    ajustarStock: (id: number, data: AjusteStockRequest) =>
        api.post<Movimiento>(`${BASE}/productos/${id}/ajustes`, data),

    // ---- Presentaciones ----
    agregarPresentacion: (productoId: number, data: PresentacionRequest) =>
        api.post<Presentacion>(`${BASE}/productos/${productoId}/presentaciones`, data),

    actualizarPresentacion: (id: number, data: PresentacionRequest) =>
        api.put<Presentacion>(`${BASE}/presentaciones/${id}`, data),

    desactivarPresentacion: (id: number) => api.delete(`${BASE}/presentaciones/${id}`),

    // ---- Kardex ----
    kardexProducto: (productoId: number) =>
        api.get<Movimiento[]>(`${BASE}/kardex/producto/${productoId}`),

    kardex: (desde?: string, hasta?: string) => {
        const params = new URLSearchParams();
        if (desde) params.set('desde', desde);
        if (hasta) params.set('hasta', hasta);
        const qs = params.toString();
        return api.get<Movimiento[]>(`${BASE}/kardex${qs ? `?${qs}` : ''}`);
    },

    // ---- Categorías ----
    listarCategorias: () => api.get<Categoria[]>('/api/categorias'),
};