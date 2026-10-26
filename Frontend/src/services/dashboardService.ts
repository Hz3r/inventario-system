// src/services/dashboardService.ts
// Antes leía los productos de localStorage; ahora todo viene del backend en una sola llamada.
import { api } from './api';
import type { DashboardData } from '../types/dashboard';

export const dashboardService = {
    obtener: () => api.get<DashboardData>('/api/dashboard'),
};
