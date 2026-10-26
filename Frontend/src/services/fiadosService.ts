// src/services/fiadosService.ts
import { api } from './api';
import type { MetodoPago } from '../types/pos';
import type { CuentaCliente, DeudaCliente } from '../types/fiados';

export const fiadosService = {
    resumen: () => api.get<DeudaCliente[]>('/api/fiados'),

    cuenta: (clienteId: number) => api.get<CuentaCliente>(`/api/fiados/clientes/${clienteId}`),

    abonar: (clienteId: number, monto: number, metodo: MetodoPago, referencia: string | null) =>
        api.post<CuentaCliente>(`/api/fiados/clientes/${clienteId}/abonos`, { monto, metodo, referencia }),

    deudaManual: (clienteId: number, monto: number, nota: string | null) =>
        api.post<CuentaCliente>(`/api/fiados/clientes/${clienteId}/deudas`, { monto, nota }),
};
