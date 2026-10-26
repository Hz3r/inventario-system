// src/types/notificaciones.ts
// Espejo de NotificacionResponse / NotificacionesResponse

export type TipoNotificacion =
    | 'STOCK_AGOTADO'
    | 'STOCK_BAJO'
    | 'PRODUCTO_VENCIDO'
    | 'POR_VENCER'
    | 'FIADO_ATRASADO'
    | 'PEDIDO_PENDIENTE'
    | 'CAJA_SIN_CERRAR';

export type NivelNotificacion = 'CRITICA' | 'ADVERTENCIA' | 'INFO';

export interface Notificacion {
    clave: string;
    tipo: TipoNotificacion;
    nivel: NivelNotificacion;
    titulo: string;
    mensaje: string;
    enlace: string;
    fecha: string;
    leida: boolean;
}

export interface NotificacionesData {
    noLeidas: number;
    criticas: number;
    notificaciones: Notificacion[];
}

export const TIPO_NOTIFICACION_LABEL: Record<TipoNotificacion, string> = {
    STOCK_AGOTADO: 'Agotados',
    STOCK_BAJO: 'Stock bajo',
    PRODUCTO_VENCIDO: 'Vencidos',
    POR_VENCER: 'Por vencer',
    FIADO_ATRASADO: 'Fiados',
    PEDIDO_PENDIENTE: 'Pedidos',
    CAJA_SIN_CERRAR: 'Caja',
};
