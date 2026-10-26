// src/services/notificacionesService.ts
import { api } from './api';
import type { NotificacionesData } from '../types/notificaciones';

const BASE = '/api/notificaciones';

export const notificacionesService = {
    listar: () => api.get<NotificacionesData>(BASE),

    marcarLeidas: (claves: string[]) => api.post<void>(`${BASE}/leidas`, { claves }),

    marcarTodasLeidas: () => api.post<void>(`${BASE}/leidas/todas`),
};
