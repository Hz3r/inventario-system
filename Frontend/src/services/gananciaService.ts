// src/services/gananciaService.ts
import { api } from './api';
import type { Ganancia, Gasto, GastoRequest } from '../types/ganancia';

export const gananciaService = {
    calcular: (desde: string, hasta: string) =>
        api.get<Ganancia>(`/api/ganancia?desde=${desde}&hasta=${hasta}`),

    gastos: (desde: string, hasta: string) =>
        api.get<Gasto[]>(`/api/gastos?desde=${desde}&hasta=${hasta}`),

    registrarGasto: (data: GastoRequest) => api.post<Gasto>('/api/gastos', data),

    eliminarGasto: (id: number) => api.delete(`/api/gastos/${id}`),
};
