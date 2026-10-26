// src/services/configuracionService.ts
import { api } from './api';
import type { PerfilTienda } from '../types/configuracion';

export const configuracionService = {
    obtenerTienda: () => api.get<PerfilTienda>('/api/configuracion/tienda'),
    guardarTienda: (datos: PerfilTienda) => api.put<PerfilTienda>('/api/configuracion/tienda', datos),
};
