package com.hzer.inventario_system.entities;

/** De qué trata una notificación */
public enum TipoNotificacion {
    STOCK_AGOTADO,     // stock en 0 o negativo
    STOCK_BAJO,        // llegó al stock mínimo
    PRODUCTO_VENCIDO,  // ya pasó su fecha de vencimiento
    POR_VENCER,        // vence en los próximos días
    FIADO_ATRASADO,    // un cliente debe desde hace mucho
    PEDIDO_PENDIENTE,  // un pedido al proveedor no llega
    CAJA_SIN_CERRAR    // la caja quedó abierta desde un día anterior
}
